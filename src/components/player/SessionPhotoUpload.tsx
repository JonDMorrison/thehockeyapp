import { queuePhoto, discardQueuedPhoto } from "@/lib/offlineStorage";
import { photoDataUrl, pendingPhotosFor } from "@/lib/sessionPhotoSync";
import { syncPendingEvents } from "@/lib/syncEngine";
import { preparePhoto } from "@/lib/playerPhoto";
import { validateImageUpload } from "@/lib/media";
import { DataLoadError } from "@/components/app/DataLoadError";
import { usePlayerPhotoConsent } from "@/hooks/usePlayerPhotoConsent";
import { PlayerSettingsSheet } from "@/components/player/PlayerSettingsSheet";
import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "@/components/app/Toast";
import { Camera, Trash2, Loader2, X, Share2 } from "lucide-react";

interface SessionPhoto {
  id: string;
  storage_path: string;
  visibility: string;
  caption: string | null;
  created_at: string;
  signed_url: string | null;
}

interface SessionPhotoUploadProps {
  practiceCardId: string;
  playerId: string;
  playerName: string;
  disabled?: boolean;
}

interface QueuedPhoto {
  id: string;
  localUri: string;
  lastError?: string;
  caption: string;
  visibility: "parent_only" | "team_adults";
  status: "pending" | "uploading" | "succeeded" | "failed";
}

export const SessionPhotoUpload: React.FC<SessionPhotoUploadProps> = ({
  practiceCardId,
  playerId,
  playerName,
  disabled = false,
}) => {
  const { user } = useAuth();
  const photoConsent = usePlayerPhotoConsent(playerId);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [shareWithCoaches, setShareWithCoaches] = useState(false);
  const [localQueuedPhotos, setLocalQueuedPhotos] = useState<QueuedPhoto[]>([]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  useEffect(() => {
    let active = true;
    const reload = () => {
      void pendingPhotosFor(playerId, practiceCardId).then((rows) => {
        if (active)
          setLocalQueuedPhotos(
            rows.map((p) => ({
              id: p.localPhotoId,
              localUri: p.localUri,
              caption: p.caption,
              visibility: p.visibility,
              status: p.status,
              lastError: p.lastError,
            })),
          );
      });
      void queryClient.invalidateQueries({
        queryKey: ["session-photos", practiceCardId, playerId],
      });
    };
    reload();
    window.addEventListener("session-photo-sync", reload);
    return () => {
      active = false;
      window.removeEventListener("session-photo-sync", reload);
    };
  }, [playerId, practiceCardId, queryClient]);

  // Fetch existing photos
  const {
    data: photos,
    isError: photosError,
    isFetching: photosFetching,
    refetch: refetchPhotos,
  } = useQuery({
    queryKey: ["session-photos", practiceCardId, playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_photos")
        .select("*")
        .eq("practice_card_id", practiceCardId)
        .eq("player_id", playerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const photosWithUrls = await Promise.all(
        data.map(async (photo) => {
          const { data: signed, error: signedError } = await supabase.storage
            .from("session-photos")
            .createSignedUrl(photo.storage_path, 3600);
          if (
            signedError &&
            !/not found|does not exist/i.test(signedError.message)
          )
            throw signedError;
          return { ...photo, signed_url: signed?.signedUrl ?? null };
        }),
      );

      return photosWithUrls as SessionPhoto[];
    },
    enabled: !!practiceCardId && !!playerId,
  });

  // Upload photo mutation
  const uploadPhoto = useMutation({
    networkMode: "always",
    mutationFn: async ({
      file,
      caption,
      visibility,
    }: {
      file: File;
      caption: string;
      visibility: "parent_only" | "team_adults";
    }) => {
      if (!user) throw new Error("Sign in to save a photo.");
      const blob = await preparePhoto(file);
      const localPhotoId = crypto.randomUUID();
      await queuePhoto(
        {
          localPhotoId,
          playerId,
          practiceCardId,
          localUri: await photoDataUrl(blob),
          visibility,
          caption,
          status: "pending",
          createdAt: new Date().toISOString(),
        },
        user.id,
      );
      // Queue first, then sync. A failed network request never discards the chosen photo.
      if (navigator.onLine) await syncPendingEvents();
      const pending = await pendingPhotosFor(playerId, practiceCardId);
      setLocalQueuedPhotos(
        pending.map((p) => ({
          id: p.localPhotoId,
          localUri: p.localUri,
          caption: p.caption,
          visibility: p.visibility,
          status: p.status,
          lastError: p.lastError,
        })),
      );
      return pending.some((p) => p.localPhotoId === localPhotoId);
    },
    onSuccess: (pending) => {
      queryClient.invalidateQueries({
        queryKey: ["session-photos", practiceCardId, playerId],
      });
      if (pending)
        toast.info(
          "Photo waiting to sync",
          "Kept on this device. Reconnect or retry to finish saving.",
        );
      else toast.success("Photo saved", "Your training moment is saved.");
      resetUploadState();
    },
    onError: (error: Error) => {
      toast.error("Upload failed", error.message);
      // The selected file remains available for another attempt.
    },
  });

  // Delete photo mutation
  const deletePhoto = useMutation({
    mutationFn: async (photo: SessionPhoto) => {
      if (!window.confirm("Delete this training photo? This cannot be undone."))
        return false;
      // Unlink first: a failed storage cleanup must not leave a broken visible record.
      const { error } = await supabase
        .from("session_photos")
        .delete()
        .eq("id", photo.id)
        .select("id")
        .single();
      if (error) throw error;
      await supabase.storage
        .from("session-photos")
        .remove([photo.storage_path]);
      return true;
    },
    onSuccess: (deleted) => {
      if (!deleted) return;
      queryClient.invalidateQueries({
        queryKey: ["session-photos", practiceCardId, playerId],
      });
      toast.success("Photo deleted");
    },
    onError: (error: Error) => {
      toast.error("Delete failed", error.message);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) {
      const validation = validateImageUpload(file);
      if (validation) {
        toast.error("Choose a supported photo", validation);
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setShowUploadSheet(true);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleUpload = () => {
    if (!selectedFile || uploadPhoto.isPending) return;

    uploadPhoto.mutate({
      file: selectedFile,
      caption,
      visibility:
        shareWithCoaches && photoConsent.data?.photo_sharing_allowed
          ? "team_adults"
          : "parent_only",
    });
  };

  const resetUploadState = () => {
    setShowUploadSheet(false);
    setPreviewUrl(null);
    setSelectedFile(null);
    setCaption("");
    setShareWithCoaches(false);
  };

  const photoCount = (photos?.length || 0) + localQueuedPhotos.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-text-muted">
          Training photos (optional)
        </Label>
        <span className="text-xs text-text-muted">{photoCount}/3</span>
      </div>

      {photosError && (
        <DataLoadError
          title="Couldn’t load training photos"
          onRetry={() => refetchPhotos()}
          retrying={photosFetching}
        />
      )}
      {/* Photo thumbnails */}
      <div className="flex items-center gap-2 flex-wrap">
        {photos?.slice(0, 3).map((photo) => (
          <div
            key={photo.id}
            className="relative w-16 h-16 rounded-lg overflow-hidden bg-surface-muted group"
          >
            {photo.signed_url ? (
              <img
                src={photo.signed_url}
                alt="Session proof"
                className="w-full h-full object-cover"
              />
            ) : (
              <span
                role="img"
                aria-label="Photo unavailable"
                className="flex h-full items-center justify-center text-[10px] text-muted-foreground"
              >
                Photo unavailable
              </span>
            )}
            {photo.visibility === "team_adults" && (
              <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                <Share2 className="w-2.5 h-2.5 text-white" />
              </div>
            )}
            <button
              aria-label="Delete training photo"
              onClick={() => deletePhoto.mutate(photo)}
              disabled={deletePhoto.isPending}
              className="absolute inset-0 bg-black/50 opacity-100 transition-opacity flex items-center justify-center"
            >
              {deletePhoto.isPending ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        ))}

        {localQueuedPhotos.map(
          (queued) =>
            queued.status !== "uploading" && (
              <Button
                key={`discard-${queued.id}`}
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (
                    !window.confirm(
                      "Discard this unsent photo from this device?",
                    )
                  )
                    return;
                  await discardQueuedPhoto(queued.id);
                  setLocalQueuedPhotos((rows) =>
                    rows.filter((row) => row.id !== queued.id),
                  );
                }}
              >
                Discard pending photo
              </Button>
            ),
        )}
        {/* Queued photos */}
        {localQueuedPhotos.map((queued) => (
          <div
            key={queued.id}
            className="relative w-16 h-16 rounded-lg overflow-hidden bg-surface-muted"
          >
            <img
              src={queued.localUri}
              alt="Pending upload"
              className="w-full h-full object-cover opacity-50"
            />
            {queued.status !== "succeeded" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
            )}
          </div>
        ))}

        {localQueuedPhotos.length > 0 && (
          <div className="w-full text-sm">
            <p role="status">
              {localQueuedPhotos.length} photo(s) kept on this device, waiting
              to save.
            </p>
            {localQueuedPhotos
              .filter((p) => p.lastError)
              .map((p) => (
                <p role="alert" key={p.id}>
                  {p.lastError}
                </p>
              ))}
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => void syncPendingEvents()}
            >
              Retry photo uploads
            </Button>
          </div>
        )}
        {/* Add photo button */}
        {photoCount < 3 && !disabled && !photosError && photos && (
          <button
            aria-label="Choose a photo"
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:bg-surface-muted transition-colors"
          >
            <Camera className="w-5 h-5 text-text-muted" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Upload Sheet */}
      <Sheet open={showUploadSheet} onOpenChange={setShowUploadSheet}>
        <SheetContent
          side="bottom"
          className="h-auto max-h-[90dvh] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>Add Photo</SheetTitle>
            <SheetDescription>
              Save a training moment for {playerName}
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-4">
            {/* Preview */}
            {previewUrl && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-surface-muted">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
                <button
                  aria-label="Remove selected photo"
                  onClick={resetUploadState}
                  className="absolute top-2 right-2 p-1 bg-black/50 rounded-full"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            {/* Caption */}
            <div className="space-y-2">
              <Label htmlFor="caption">Caption (optional)</Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a note..."
                maxLength={200}
              />
            </div>

            {/* Visibility toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-surface-muted">
              <div className="space-y-0.5">
                <Label htmlFor="share">Share with coaches</Label>
                <p className="text-xs text-text-muted">
                  {shareWithCoaches
                    ? "Coaches and managers can view this photo"
                    : "Only your family can view this photo"}
                </p>
              </div>
              <Switch
                id="share"
                checked={
                  shareWithCoaches &&
                  Boolean(photoConsent.data?.photo_sharing_allowed)
                }
                disabled={
                  !photoConsent.data?.photo_sharing_allowed ||
                  photoConsent.isLoading ||
                  photoConsent.isError
                }
                onCheckedChange={setShareWithCoaches}
              />
            </div>

            {!photoConsent.data?.photo_sharing_allowed && (
              <div className="rounded-xl border border-border p-3 text-sm">
                <p className="text-muted-foreground">
                  Coach photo sharing is off. Your photo will stay with your
                  family.
                </p>
                <Button
                  variant="link"
                  className="mt-1 px-0"
                  onClick={() => setShowPrivacySettings(true)}
                >
                  Review photo permissions
                </Button>
              </div>
            )}
            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={resetUploadState}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpload}
                disabled={!selectedFile || uploadPhoto.isPending}
              >
                {uploadPhoto.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                Save Photo
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <PlayerSettingsSheet
        layer={90}
        open={showPrivacySettings}
        onOpenChange={setShowPrivacySettings}
        playerId={playerId}
        playerName={playerName}
      />
    </div>
  );
};
