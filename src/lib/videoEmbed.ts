export type VideoProvider = "youtube" | "vimeo";

export interface ParsedVideoUrl {
  provider: VideoProvider;
  id: string;
}

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/** Parse supported YouTube and Vimeo links without accepting lookalike domains. */
export function parseVideoUrl(url: string): ParsedVideoUrl | null {
  if (!url) return null;

  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase();

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id && YOUTUBE_ID_PATTERN.test(id) ? { provider: "youtube", id } : null;
    }

    if (YOUTUBE_HOSTS.has(host)) {
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      const id = parsed.pathname === "/watch"
        ? parsed.searchParams.get("v")
        : ["shorts", "embed", "live"].includes(pathParts[0])
          ? pathParts[1]
          : null;

      return id && YOUTUBE_ID_PATTERN.test(id) ? { provider: "youtube", id } : null;
    }

    if (host === "vimeo.com" || host === "www.vimeo.com" || host === "player.vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));
      return id ? { provider: "vimeo", id } : null;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Convert a YouTube or Vimeo URL into an embeddable iframe source.
 * YouTube uses its privacy-enhanced domain and neither provider autoplays.
 */
export function getVideoEmbedUrl(url: string): string | null {
  const video = parseVideoUrl(url);
  if (!video) return null;

  if (video.provider === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${video.id}?rel=0&playsinline=1`;
  }

  return `https://player.vimeo.com/video/${video.id}?dnt=1`;
}

/**
 * Returns true if the URL is a recognized YouTube/Vimeo video link.
 */
export function isValidVideoUrl(url: string): boolean {
  return parseVideoUrl(url) !== null;
}
