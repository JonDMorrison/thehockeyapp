import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, ExternalLink, Film, Play, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getCoachingVideo } from "@/lib/coachingVideos";
import { getVideoEmbedUrl, parseVideoUrl } from "@/lib/videoEmbed";
import {
  dismissSkillVideo,
  getSkillVideoInteraction,
  markSkillVideoWatched,
} from "@/lib/skillVideoState";
import { cn } from "@/lib/utils";

interface SkillVideoProps {
  url: string;
  taskTitle: string;
}

export function SkillVideo({ url, taskTitle }: SkillVideoProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [interaction, setInteraction] = useState(() => getSkillVideoInteraction(url));
  const embedUrl = getVideoEmbedUrl(url);
  const parsedVideo = parseVideoUrl(url);
  const coachingVideo = getCoachingVideo(url);

  if (interaction.dismissed) return null;

  if (!embedUrl) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary/5"
      >
        <Film className="h-4 w-4" />
        {t("players.today.openVideo")}
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    );
  }

  const source = coachingVideo?.source
    ?? (parsedVideo?.provider === "vimeo" ? "Vimeo" : "YouTube");

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !interaction.watched) {
      markSkillVideoWatched(url);
      setInteraction((current) => ({ ...current, watched: true }));
    }
  };

  const handleDismiss = () => {
    dismissSkillVideo(url);
    setInteraction((current) => ({ ...current, dismissed: true }));
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={handleOpenChange}
      className="overflow-hidden rounded-xl border border-border bg-[linear-gradient(120deg,hsl(var(--card)),hsl(var(--muted)/0.45))] shadow-subtle"
    >
      <div className="flex items-center">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="group flex min-h-[68px] min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-primary/5"
            aria-label={isOpen ? t("players.today.hideSkillVideo") : t("players.today.watchSkillVideo")}
          >
            <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-foreground text-background shadow-sm">
              <span className="absolute inset-y-0 left-0 w-1 bg-primary" />
              <Play className="ml-0.5 h-5 w-5 fill-current" />
              {interaction.watched ? (
                <span className="absolute bottom-0.5 right-0.5 grid h-4 w-4 place-items-center rounded-full bg-success text-white ring-2 ring-foreground">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
              ) : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                {interaction.watched
                  ? t("players.today.tipWatched")
                  : t("players.today.skillTip")}
              </span>
              <span className="mt-0.5 block truncate text-sm font-bold text-foreground">
                {coachingVideo?.title || taskTitle}
              </span>
              <span className="mt-0.5 block text-xs text-text-muted">
                {source}{coachingVideo?.duration ? ` · ${coachingVideo.duration}` : ""}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-text-secondary">
              <span className="hidden sm:inline">
                {isOpen
                  ? t("players.today.hideVideo")
                  : interaction.watched
                    ? t("players.today.watchAgain")
                    : t("players.today.watchVideo")}
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </span>
          </button>
        </CollapsibleTrigger>
        <button
          type="button"
          onClick={handleDismiss}
          className="mr-1 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t("players.today.dismissVideo")}
          title={t("players.today.dismissVideo")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <CollapsibleContent>
        <div className="border-t border-border bg-black">
          <div className="aspect-video">
            <iframe
              src={embedUrl}
              className="h-full w-full"
              title={coachingVideo?.title || taskTitle}
              loading="lazy"
              allow="encrypted-media; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2 text-xs text-text-muted">
          <span>{t("players.today.videoBy", { source })}</span>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-text-secondary hover:text-primary"
            onClick={(event) => event.stopPropagation()}
          >
            {parsedVideo?.provider === "vimeo" ? t("players.today.watchOnVimeo") : t("players.today.watchOnYoutube")}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
