import { supabase } from "@/integrations/supabase/client";
import {
  parsePrivateMediaReference,
  privateMediaReference,
  resolveMediaUrl,
  validateImageUpload,
} from "./media";
export interface PhotoFrame {
  x: number;
  y: number;
  zoom: number;
}
export const defaultFrame: PhotoFrame = { x: 0.5, y: 0.5, zoom: 1 };
export const clamp = (n: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, n));
export function cropBounds(width: number, height: number, frame: PhotoFrame) {
  const size = Math.min(width, height) / clamp(frame.zoom, 1, 3);
  return {
    x: clamp(frame.x) * (width - size),
    y: clamp(frame.y) * (height - size),
    size,
  };
}
export async function decodePhoto(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight)
      throw new Error("Empty image");
    return image;
  } catch {
    throw new Error(
      "This browser cannot open that photo. Export it as JPG or PNG and choose it again. Your current photo has not changed.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
export const canvasJpeg = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b
          ? resolve(b)
          : reject(
              new Error("Could not prepare the photo. Try a different image."),
            ),
      "image/jpeg",
      0.88,
    ),
  );
export async function preparePhoto(file: File): Promise<Blob> {
  const invalid = validateImageUpload(file);
  if (invalid) throw new Error(invalid);
  const image = await decodePhoto(file);
  const scale = Math.min(
    1,
    2048 / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvasJpeg(canvas);
}
export async function existingPhoto(reference: string) {
  const url = await resolveMediaUrl(reference);
  if (!url) throw new Error("Could not load the photo. Try again.");
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Could not load the photo. Try again.");
  return response.blob();
}
export async function savePlayerPhoto(
  playerId: string,
  original: Blob,
  frame: PhotoFrame,
  previous: string[],
  retainedOriginal?: string | null,
) {
  const image = await decodePhoto(original);
  const b = cropBounds(image.naturalWidth, image.naturalHeight, frame);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  canvas
    .getContext("2d")!
    .drawImage(image, b.x, b.y, b.size, b.size, 0, 0, 512, 512);
  const crop = await canvasJpeg(canvas);
  const prefix = `${playerId}/profile-${crypto.randomUUID()}`;
  const paths: string[] = [];
  const upload = async (path: string, file: Blob) => {
    const { error } = await supabase.storage
      .from("player-photos")
      .upload(path, file, { contentType: "image/jpeg" });
    if (error) throw error;
    paths.push(path);
    return privateMediaReference("player-photos", path);
  };
  let reference: string;
  let source: string;
  try {
    const sourceCanvas = document.createElement("canvas");
    const scale = Math.min(
      1,
      2048 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    sourceCanvas.width = Math.round(image.naturalWidth * scale);
    sourceCanvas.height = Math.round(image.naturalHeight * scale);
    sourceCanvas
      .getContext("2d")!
      .drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);
    source =
      retainedOriginal ||
      (await upload(`${prefix}-original.jpg`, await canvasJpeg(sourceCanvas)));
    reference = await upload(`${prefix}-avatar.jpg`, crop);
    const { error } = await supabase
      .from("players")
      .update({
        profile_photo_url: reference,
        profile_photo_original_url: source,
        profile_photo_frame: { ...frame },
      })
      .eq("id", playerId)
      .select("id")
      .single();
    if (error) throw error;
  } catch (error) {
    if (paths.length)
      await supabase.storage.from("player-photos").remove(paths);
    throw error;
  }
  // Cleanup only after the replacement has been linked. A cleanup failure cannot undo a saved photo.
  const old = previous
    .filter((ref) => ref !== source && ref !== reference)
    .map(parsePrivateMediaReference)
    .filter(
      (p) => p?.bucket === "player-photos" && p.path.startsWith(`${playerId}/`),
    )
    .map((p) => p!.path);
  if (old.length)
    await supabase.storage
      .from("player-photos")
      .remove([...new Set(old)])
      .catch((): undefined => undefined);
  return reference;
}
export async function removePlayerPhoto(playerId: string, previous: string[]) {
  const { error } = await supabase
    .from("players")
    .update({
      profile_photo_url: null,
      profile_photo_original_url: null,
      profile_photo_frame: null,
    })
    .eq("id", playerId)
    .select("id")
    .single();
  if (error) throw error;
  const paths = previous
    .map(parsePrivateMediaReference)
    .filter(
      (p) => p?.bucket === "player-photos" && p.path.startsWith(`${playerId}/`),
    )
    .map((p) => p!.path);
  if (paths.length)
    await supabase.storage
      .from("player-photos")
      .remove([...new Set(paths)])
      .catch((): undefined => undefined);
}
