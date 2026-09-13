import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ChevronDown, Film, Play, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCoachingVideo,
  getRecommendedCoachingVideo,
  getSortedCoachingVideos,
} from "@/lib/coachingVideos";
import { getVideoEmbedUrl, isValidVideoUrl } from "@/lib/videoEmbed";
import { cn } from "@/lib/utils";

interface VideoAttachmentEditorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  defaultOpen?: boolean;
  taskLabel?: string;
  taskType?: string;
  shotType?: string;
}

const CUSTOM_VIDEO_VALUE = "custom";

export function VideoAttachmentEditor({
  value,
  onChange,
  disabled = false,
  defaultOpen = false,
  taskLabel = "",
  taskType = "",
  shotType = "",
}: VideoAttachmentEditorProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const [isOpen, setIsOpen] = useState(defaultOpen && !value);
  const [showPreview, setShowPreview] = useState(false);
  const selectedVideo = value ? getCoachingVideo(value) : null;
  const recommendationContext = { label: taskLabel, taskType, shotType };
  const recommendedVideo = getRecommendedCoachingVideo(recommendationContext);
  const sortedVideos = getSortedCoachingVideos(recommendationContext);
  const isRecommendedSelected = selectedVideo?.id === recommendedVideo?.id;
  const embedUrl = value ? getVideoEmbedUrl(value) : null;
  const isInvalid = Boolean(value && !isValidVideoUrl(value));

  const handleRemove = () => {
    onChange(null);
    setShowPreview(false);
    setIsOpen(false);
  };

  if (!value && !isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="flex w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {recommendedVideo
          ? <Sparkles className="h-4 w-4 shrink-0" />
          : <Film className="h-4 w-4 shrink-0" />}
        <span className="truncate">
          {recommendedVideo
            ? t("practice.addRecommendedVideo", { title: recommendedVideo.title })
            : t("practice.addSkillVideo")}
        </span>
      </button>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="overflow-hidden rounded-xl border border-border bg-muted/25">
      <div className="flex items-center gap-1 p-1.5">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-background/70"
            disabled={disabled}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Film className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {selectedVideo?.title || (value ? t("practice.customSkillVideo") : t("practice.skillVideo"))}
              </span>
              <span className="block truncate text-xs text-text-muted">
                {selectedVideo
                  ? `${isRecommendedSelected ? `${t("practice.recommended")} · ` : ""}${selectedVideo.source} · ${selectedVideo.duration}`
                  : t("practice.videoOptionalHint")}
              </span>
            </span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-text-muted transition-transform", isOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>

        {value && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-9 w-9 shrink-0"
            onClick={handleRemove}
            aria-label={t("practice.removeVideo")}
            title={t("practice.removeVideo")}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>

      <CollapsibleContent>
        <div className="space-y-3 border-t border-border px-3 pb-3 pt-3">
          {recommendedVideo && !isRecommendedSelected && (
            <div className="rounded-lg border border-primary/25 bg-primary/[0.06] p-3">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                    {t("practice.recommendedForDrill")}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold leading-snug text-foreground">
                    {recommendedVideo.title}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {recommendedVideo.source} · {recommendedVideo.duration}
                  </p>
                </div>
                {!disabled && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 shrink-0 px-2.5 text-xs"
                    onClick={() => {
                      onChange(recommendedVideo.url);
                      setShowPreview(false);
                    }}
                  >
                    {t("practice.useRecommended")}
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">{t("practice.officialVideoLibrary")}</Label>
            <Select
              value={selectedVideo?.id ?? CUSTOM_VIDEO_VALUE}
              onValueChange={(videoId) => {
                if (videoId === CUSTOM_VIDEO_VALUE) {
                  onChange(null);
                  setShowPreview(false);
                  return;
                }
                const video = sortedVideos.find((item) => item.id === videoId);
                onChange(video?.url ?? null);
                setShowPreview(false);
              }}
              disabled={disabled}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-2rem)]">
                <SelectItem value={CUSTOM_VIDEO_VALUE}>{t("practice.customYoutubeVimeo")}</SelectItem>
                {sortedVideos.map((video) => (
                  <SelectItem key={video.id} value={video.id}>
                    {video.id === recommendedVideo?.id ? `${t("practice.recommended")} · ` : ""}
                    {video.source} · {video.title} ({video.duration})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor={inputId}>{t("practice.videoLink")}</Label>
            <Input
              id={inputId}
              type="url"
              inputMode="url"
              value={value ?? ""}
              onChange={(event) => {
                onChange(event.target.value || null);
                setShowPreview(false);
              }}
              placeholder={t("practice.videoUrlPlaceholder")}
              className={cn("bg-background", isInvalid && "border-destructive focus-visible:ring-destructive")}
              disabled={disabled}
            />
            {isInvalid && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" />
                {t("practice.videoUrlInvalid")}
              </p>
            )}
          </div>

          {embedUrl && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowPreview((current) => !current)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <Play className="h-3.5 w-3.5" />
                {showPreview ? t("practice.hidePreview") : t("practice.previewVideo")}
              </button>
              {showPreview && (
                <div className="aspect-video overflow-hidden rounded-lg bg-black">
                  <iframe
                    src={embedUrl}
                    className="h-full w-full"
                    title={selectedVideo?.title || t("practice.videoPreview")}
                    loading="lazy"
                    allow="encrypted-media; picture-in-picture; fullscreen"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          )}

          {!disabled && !value && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs font-medium text-text-muted hover:text-destructive"
            >
              {t("common.cancel")}
            </button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
