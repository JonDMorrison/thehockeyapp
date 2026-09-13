import { parseVideoUrl } from "@/lib/videoEmbed";

export interface CoachingVideo {
  id: string;
  title: string;
  source: "Hockey Canada" | "IIHF";
  duration: string;
  url: string;
}

/**
 * Short, original videos from official governing-body YouTube channels.
 * Hockey Canada is intentionally listed first as the preferred source.
 */
export const COACHING_VIDEOS: readonly CoachingVideo[] = [
  {
    id: "hc-quick-release",
    title: "Shoot the puck quickly with Marie-Philip Poulin",
    source: "Hockey Canada",
    duration: "0:49",
    url: "https://www.youtube.com/watch?v=iHHmFJ17m58",
  },
  {
    id: "hc-scoring-position",
    title: "Get into scoring position with Sarah Nurse",
    source: "Hockey Canada",
    duration: "0:51",
    url: "https://www.youtube.com/watch?v=CbiFprRDINs",
  },
  {
    id: "hc-three-shot-scoring",
    title: "Three-shot scoring drill",
    source: "Hockey Canada",
    duration: "0:50",
    url: "https://www.youtube.com/watch?v=Z6PqI_JifHI",
  },
  {
    id: "hc-poor-body-position",
    title: "Shoot from a difficult body position with Blayre Turnbull",
    source: "Hockey Canada",
    duration: "0:42",
    url: "https://www.youtube.com/watch?v=UukG8FEUeKY",
  },
  {
    id: "iihf-sweep-shot",
    title: "Stationary sweep shot (beginner)",
    source: "IIHF",
    duration: "0:11",
    url: "https://www.youtube.com/watch?v=XA3FjeSZSh4",
  },
  {
    id: "iihf-obstacle-quick-shot",
    title: "Puck under obstacle and quick shot (beginner)",
    source: "IIHF",
    duration: "0:16",
    url: "https://www.youtube.com/watch?v=DD94uw3Chn8",
  },
] as const;

export function getCoachingVideo(url: string): CoachingVideo | null {
  const parsed = parseVideoUrl(url);
  if (!parsed) return null;

  return COACHING_VIDEOS.find((video) => {
    const candidate = parseVideoUrl(video.url);
    return candidate?.provider === parsed.provider && candidate.id === parsed.id;
  }) ?? null;
}
