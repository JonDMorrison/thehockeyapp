import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ChevronDown, Film, Play, Trash2 } from "lucide-react";
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
import { COACHING_VIDEOS, getCoachingVideo } from "@/lib/coachingVideos";
import { getVideoEmbedUrl, isValidVideoUrl } from "@/lib/videoEmbed";
import { cn } from "@/lib/utils";

interface VideoAttachmentEditorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  defaultOpen?: boolean;
}

const CUSTOM_VIDEO_VALUE = "custom";

export function VideoAttachmentEditor({
  value,
  onChange,
  disabled = false,
  defaultOpen = false,
}: VideoAttachmentEditorProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const [isOpen, setIsOpen] = useState(defaultOpen && !value);
  const [showPreview, setShowPreview] = useState(false);
  const selectedVideo = value ? getCoachingVideo(value) : null;
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
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:border-team-primary/50 hover:bg-team-primary/5 hover:text-team-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Film className="h-4 w-4" />
        {t("practice.addSkillVideo")}
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
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-team-primary/10 text-team-primary">
              <Film className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {selectedVideo?.title || (value ? t("practice.customSkillVideo") : t("practice.skillVideo"))}
              </span>
              <span className="block truncate text-xs text-text-muted">
                {selectedVideo
                  ? `${selectedVideo.source} · ${selectedVideo.duration}`
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
                const video = COACHING_VIDEOS.find((item) => item.id === videoId);
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
                {COACHING_VIDEOS.map((video) => (
                  <SelectItem key={video.id} value={video.id}>
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
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-team-primary hover:underline"
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
