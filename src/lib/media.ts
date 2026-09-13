import { supabase } from "@/integrations/supabase/client";

const PRIVATE_MEDIA_BUCKETS = new Set([
  "player-photos",
  "profile-media",
  "team-private-media",
  "session-photos",
]);

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateImageUpload(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return "Choose a JPG, PNG, WebP, HEIC, or HEIF image.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Images must be 5 MB or smaller.";
  }
  return null;
}
export function privateMediaReference(bucket: string, path: string): string {
  if (!PRIVATE_MEDIA_BUCKETS.has(bucket)) {
    throw new Error("Unsupported private media bucket");
  }
  return `${bucket}:${path}`;
}

export function parsePrivateMediaReference(value?: string | null): {
  bucket: string;
  path: string;
} | null {
  if (!value || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:") || value.startsWith("blob:")) {
    return null;
  }

  const separator = value.indexOf(":");
  if (separator < 1) return null;
  const bucket = value.slice(0, separator);
  const path = value.slice(separator + 1);
  if (!PRIVATE_MEDIA_BUCKETS.has(bucket) || !path) return null;
  return { bucket, path };
}

export async function resolveMediaUrl(value?: string | null): Promise<string | null> {
  if (!value) return null;
  const media = parsePrivateMediaReference(value);
  if (!media) return value;

  const cached = signedUrlCache.get(value);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const { data, error } = await supabase.storage
    .from(media.bucket)
    .createSignedUrl(media.path, 60 * 60);

  if (error || !data?.signedUrl) return null;
  signedUrlCache.set(value, {
    url: data.signedUrl,
    expiresAt: Date.now() + 55 * 60 * 1000,
  });
  return data.signedUrl;
}
