import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  cropBounds,
  decodePhoto,
  defaultFrame,
  clamp,
  existingPhoto,
  preparePhoto,
  removePlayerPhoto,
  savePlayerPhoto,
  type PhotoFrame,
} from "@/lib/playerPhoto";
import { useQueryClient } from "@tanstack/react-query";
interface Props {
  player: {
    id: string;
    profile_photo_url?: string | null;
    profile_photo_original_url?: string | null;
    profile_photo_frame?: unknown;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export function PlayerPhotoEditor({ player, open, onOpenChange }: Props) {
  const [original, setOriginal] = useState<Blob | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [frame, setFrame] = useState<PhotoFrame>(defaultFrame);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [retained, setRetained] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const drag = useRef<{ x: number; y: number; frame: PhotoFrame } | null>(null);
  const queryClient = useQueryClient();
  const refresh = async () => {
    await queryClient.invalidateQueries({
      predicate: (q) =>
        [
          "player",
          "players",
          "players-with-teams",
          "team-roster",
          "roster-player",
          "shooting-player-identities",
          "teammates-with-badges",
        ].includes(String(q.queryKey[0])),
    });
  };
  useEffect(() => {
    let active = true;
    if (!open) {
      setOriginal(null);
      setImage(null);
      return;
    }
    setMessage("");
    setOriginal(null);
    setImage(null);
    setFrame(defaultFrame);
    setRetained(null);
    const reference =
      player.profile_photo_original_url || player.profile_photo_url;
    if (reference) {
      setBusy(true);
      void existingPhoto(reference)
        .then(async (blob) => {
          const decoded = await decodePhoto(blob);
          if (!active) return;
          setOriginal(blob);
          setImage(decoded);
          setRetained(player.profile_photo_original_url || null);
          const saved = player.profile_photo_frame as PhotoFrame | null;
          if (
            saved &&
            Number.isFinite(saved.x) &&
            Number.isFinite(saved.y) &&
            Number.isFinite(saved.zoom)
          )
            setFrame(saved);
        })
        .catch((e) => {
          if (active) setMessage(e.message);
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }
    return () => {
      active = false;
    };
  }, [
    open,
    player.id,
    player.profile_photo_url,
    player.profile_photo_original_url,
    player.profile_photo_frame,
  ]);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context || !image) return;
    const b = cropBounds(image.naturalWidth, image.naturalHeight, frame);
    context.clearRect(0, 0, 256, 256);
    context.drawImage(image, b.x, b.y, b.size, b.size, 0, 0, 256, 256);
  }, [image, frame, open]);
  const select = async (selected?: File) => {
    if (!selected || lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const blob = await preparePhoto(selected);
      const decoded = await decodePhoto(blob);
      setOriginal(blob);
      setImage(decoded);
      setFrame(defaultFrame);
      setRetained(null);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const save = async (remove = false) => {
    if (lock.current || (!remove && !original)) return;
    if (
      remove &&
      !window.confirm(
        "Remove this player photo? You can add another photo later.",
      )
    )
      return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const previous = [
        player.profile_photo_url,
        player.profile_photo_original_url,
      ].filter((s): s is string => !!s);
      if (remove) await removePlayerPhoto(player.id, previous);
      else
        await savePlayerPhoto(player.id, original!, frame, previous, retained);
      onOpenChange(false);
      await refresh();
    } catch (e) {
      setMessage((e as Error).message || "Photo not saved. Please retry.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {player.profile_photo_url
              ? "Adjust player photo"
              : "Add player photo"}
          </DialogTitle>
          <DialogDescription>
            Move and zoom to frame the face. Photo changes save separately from
            player details.
          </DialogDescription>
        </DialogHeader>
        <input
          ref={file}
          aria-label="Player photo file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="sr-only"
          onChange={(e) => {
            void select(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {image && (
          <>
            <canvas
              ref={canvas}
              width={256}
              height={256}
              aria-label="Circular player photo preview"
              className="mx-auto h-56 w-56 rounded-full border-4 border-border touch-none cursor-move"
              onPointerDown={(e) => {
                if (busy) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = { x: e.clientX, y: e.clientY, frame };
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
              onPointerMove={(e) => {
                if (!drag.current || busy) return;
                const b = cropBounds(
                  image.naturalWidth,
                  image.naturalHeight,
                  drag.current.frame,
                );
                const width = e.currentTarget.getBoundingClientRect().width;
                setFrame({
                  ...drag.current.frame,
                  x:
                    image.naturalWidth > b.size
                      ? clamp(
                          drag.current.frame.x -
                            (((e.clientX - drag.current.x) / width) * b.size) /
                              (image.naturalWidth - b.size),
                        )
                      : 0.5,
                  y:
                    image.naturalHeight > b.size
                      ? clamp(
                          drag.current.frame.y -
                            (((e.clientY - drag.current.y) / width) * b.size) /
                              (image.naturalHeight - b.size),
                        )
                      : 0.5,
                });
              }}
            />
            {(
              [
                ["zoom", "Zoom", 1, 3],
                ["x", "Horizontal position", 0, 1],
                ["y", "Vertical position", 0, 1],
              ] as const
            ).map(([key, label, min, max]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`photo-${key}`}>{label}</Label>
                <input
                  id={`photo-${key}`}
                  aria-label={label}
                  className="w-full accent-primary min-h-11"
                  type="range"
                  min={min}
                  max={max}
                  step={0.01}
                  value={frame[key]}
                  disabled={busy}
                  onChange={(e) =>
                    setFrame((f) => ({ ...f, [key]: Number(e.target.value) }))
                  }
                />
              </div>
            ))}
          </>
        )}
        <p className="text-sm text-muted-foreground">
          JPG, PNG, WebP, HEIC or HEIF · Up to 5 MB. If your browser cannot open
          HEIC, choose a JPG or PNG copy. Photos remain private to authorized
          viewers.
        </p>
        <p role="alert" className="text-sm">
          {message}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => file.current?.click()}
          >
            {image ? "Replace photo" : "Choose photo"}
          </Button>
          {player.profile_photo_url && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void save(true)}
            >
              Remove photo
            </Button>
          )}
          <Button
            variant="outline"
            disabled={busy || !image}
            onClick={() => setFrame(defaultFrame)}
          >
            Reset framing
          </Button>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={busy || !image || !original}
            onClick={() => void save()}
          >
            {busy ? "Preparing…" : "Save photo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
