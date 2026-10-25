import { supabase } from "@/integrations/supabase/client";
import {
  getPendingPhotos,
  updatePhotoStatus,
  type QueuedPhoto,
} from "./offlineStorage";
const active = new Set<string>();
export async function syncSessionPhotos(
  userId: string,
  signal: AbortSignal,
  stillOwnsJob: () => boolean,
) {
  if (active.has(userId)) return { synced: 0, failed: 0 };
  active.add(userId);
  let synced = 0,
    failed = 0;
  try {
    for (const photo of await getPendingPhotos()) {
      if (!stillOwnsJob() || photo.userId !== userId) break;
      await updatePhotoStatus(photo.localPhotoId, "uploading");
      if (
        !(await getPendingPhotos()).some(
          (p) => p.localPhotoId === photo.localPhotoId && p.userId === userId,
        )
      )
        continue;
      window.dispatchEvent(
        new CustomEvent("session-photo-sync", {
          detail: {
            playerId: photo.playerId,
            practiceCardId: photo.practiceCardId,
          },
        }),
      );
      const path = `sessions/${photo.practiceCardId}/${photo.playerId}/${photo.localPhotoId}.jpg`;
      try {
        if (!photo.localUri.startsWith("data:image/jpeg;base64,"))
          throw new Error(
            "Choose this photo again to save it in a supported format.",
          );
        const binary = atob(
          photo.localUri.slice("data:image/jpeg;base64,".length),
        );
        const bytes = new Blob(
          [Uint8Array.from(binary, (c) => c.charCodeAt(0))],
          { type: "image/jpeg" },
        );
        const { error: uploadError } = await supabase.storage
          .from("session-photos")
          .upload(path, bytes, { contentType: "image/jpeg" });
        if (
          uploadError &&
          !/already exists|duplicate/i.test(uploadError.message)
        )
          throw uploadError;
        if (!stillOwnsJob()) {
          await updatePhotoStatus(photo.localPhotoId, "pending");
          break;
        }
        const { error } = await supabase
          .from("session_photos")
          .insert({
            id: photo.localPhotoId,
            practice_card_id: photo.practiceCardId,
            player_id: photo.playerId,
            uploaded_by_user_id: userId,
            storage_path: path,
            caption: photo.caption || null,
            visibility: photo.visibility,
          })
          .abortSignal(signal);
        if (error) {
          if (error.code !== "23505") throw error;
          const existing = await supabase
            .from("session_photos")
            .select("id,storage_path,uploaded_by_user_id")
            .eq("id", photo.localPhotoId)
            .single();
          if (
            existing.error ||
            existing.data.storage_path !== path ||
            existing.data.uploaded_by_user_id !== userId
          )
            throw error;
        }
        if (!stillOwnsJob()) {
          await updatePhotoStatus(photo.localPhotoId, "pending");
          break;
        }
        await updatePhotoStatus(photo.localPhotoId, "succeeded");
        synced++;
        window.dispatchEvent(
          new CustomEvent("session-photo-sync", {
            detail: {
              playerId: photo.playerId,
              practiceCardId: photo.practiceCardId,
            },
          }),
        );
      } catch (error) {
        failed++;
        await updatePhotoStatus(
          photo.localPhotoId,
          "failed",
          (error as { message?: string }).message ||
            "Could not save photo. Retry.",
        );
        window.dispatchEvent(
          new CustomEvent("session-photo-sync", {
            detail: {
              playerId: photo.playerId,
              practiceCardId: photo.practiceCardId,
            },
          }),
        );
      }
    }
  } finally {
    active.delete(userId);
  }
  return { synced, failed };
}
export function photoDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(
        new Error("This device could not keep the photo. Retry while online."),
      );
    reader.readAsDataURL(blob);
  });
}
export async function pendingPhotosFor(
  playerId: string,
  practiceCardId: string,
): Promise<QueuedPhoto[]> {
  return (await getPendingPhotos()).filter(
    (p) => p.playerId === playerId && p.practiceCardId === practiceCardId,
  );
}
