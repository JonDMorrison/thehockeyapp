import { parseVideoUrl } from "@/lib/videoEmbed";

export interface CoachingVideo {
  id: string;
  title: string;
  source: "Hockey Canada" | "IIHF" | "iTrain Hockey";
  duration: string;
  url: string;
  skills: readonly CoachingSkill[];
}

export type CoachingSkill =
  | "wrist"
  | "snap"
  | "slap"
  | "backhand"
  | "quick_release"
  | "toe_drag"
  | "stickhandling"
  | "scoring"
  | "shooting";

export interface VideoRecommendationContext {
  label?: string;
  taskType?: string;
  shotType?: string;
}

/**
 * Short, original videos from the publishers' YouTube channels. Hockey Canada
 * remains the preferred source; focused technique clips fill gaps where Hockey
 * Canada does not currently publish an exact short-form match.
 */
export const COACHING_VIDEOS: readonly CoachingVideo[] = [
  {
    id: "hc-quick-release",
    title: "Shoot the puck quickly with Marie-Philip Poulin",
    source: "Hockey Canada",
    duration: "0:49",
    url: "https://www.youtube.com/watch?v=iHHmFJ17m58",
    skills: ["quick_release", "snap", "wrist", "shooting"],
  },
  {
    id: "hc-scoring-position",
    title: "Get into scoring position with Sarah Nurse",
    source: "Hockey Canada",
    duration: "0:51",
    url: "https://www.youtube.com/watch?v=CbiFprRDINs",
    skills: ["scoring", "shooting"],
  },
  {
    id: "hc-three-shot-scoring",
    title: "Three-shot scoring drill",
    source: "Hockey Canada",
    duration: "0:50",
    url: "https://www.youtube.com/watch?v=Z6PqI_JifHI",
    skills: ["scoring", "shooting"],
  },
  {
    id: "hc-poor-body-position",
    title: "Shoot from a difficult body position with Blayre Turnbull",
    source: "Hockey Canada",
    duration: "0:42",
    url: "https://www.youtube.com/watch?v=UukG8FEUeKY",
    skills: ["scoring", "shooting"],
  },
  {
    id: "itrain-wrist-shot",
    title: "The new technique for wrist shots",
    source: "iTrain Hockey",
    duration: "1:00",
    url: "https://www.youtube.com/watch?v=sakcM2OYxdI",
    skills: ["wrist", "shooting"],
  },
  {
    id: "itrain-snap-shot",
    title: "Snap shot technique for beginners",
    source: "iTrain Hockey",
    duration: "0:56",
    url: "https://www.youtube.com/watch?v=-37asUfMFvE",
    skills: ["snap", "quick_release", "shooting"],
  },
  {
    id: "itrain-slap-shot",
    title: "Perfecting your slap shot technique",
    source: "iTrain Hockey",
    duration: "0:58",
    url: "https://www.youtube.com/watch?v=2qkhf4i3FBY",
    skills: ["slap", "shooting"],
  },
  {
    id: "itrain-backhand-shot",
    title: "Two ways to take better backhand shots",
    source: "iTrain Hockey",
    duration: "1:00",
    url: "https://www.youtube.com/watch?v=zQxNz7sLpTQ",
    skills: ["backhand", "shooting"],
  },
  {
    id: "itrain-toe-drag",
    title: "Toe-drag stickhandling drills",
    source: "iTrain Hockey",
    duration: "1:00",
    url: "https://www.youtube.com/watch?v=lBEhLyU6XlY",
    skills: ["toe_drag", "stickhandling"],
  },
  {
    id: "iihf-sweep-shot",
    title: "Stationary sweep shot (beginner)",
    source: "IIHF",
    duration: "0:11",
    url: "https://www.youtube.com/watch?v=XA3FjeSZSh4",
    skills: ["wrist", "shooting"],
  },
  {
    id: "iihf-obstacle-quick-shot",
    title: "Puck under obstacle and quick shot (beginner)",
    source: "IIHF",
    duration: "0:16",
    url: "https://www.youtube.com/watch?v=DD94uw3Chn8",
    skills: ["stickhandling", "quick_release", "shooting"],
  },
] as const;

const RECOMMENDED_VIDEO_BY_SKILL: Readonly<Partial<Record<CoachingSkill, CoachingVideo["id"]>>> = {
  wrist: "itrain-wrist-shot",
  snap: "itrain-snap-shot",
  slap: "itrain-slap-shot",
  backhand: "itrain-backhand-shot",
  quick_release: "hc-quick-release",
  toe_drag: "itrain-toe-drag",
  stickhandling: "iihf-obstacle-quick-shot",
  scoring: "hc-scoring-position",
};

const SHOT_TYPE_SKILLS: Readonly<Record<string, CoachingSkill>> = {
  wrist: "wrist",
  snap: "snap",
  slap: "slap",
  backhand: "backhand",
};

/**
 * Infer the most specific skill from a coach's wording before falling back to
 * the structured shot type. Specific phrases such as "quick release" should
 * beat a generic wrist-shot classification.
 */
export function inferCoachingSkill({
  label = "",
  taskType = "",
  shotType = "",
}: VideoRecommendationContext): CoachingSkill | null {
  const normalizedLabel = label.toLowerCase().replace(/[-_]+/g, " ");
  const normalizedTaskType = taskType.toLowerCase();
  const supportsSkillVideo = !normalizedTaskType
    || normalizedTaskType === "shooting"
    || normalizedTaskType === "prep"
    || normalizedTaskType === "stickhandling"
    || normalizedTaskType === "video";

  if (!supportsSkillVideo) return null;

  if (/\bquick\s+releases?\b|\breleases?\s+quick/.test(normalizedLabel)) return "quick_release";
  if (/\btoe\s+drags?\b/.test(normalizedLabel)) return "toe_drag";
  if (/\bslap\s*shot/.test(normalizedLabel)) return "slap";
  if (/\bsnap\s*shot/.test(normalizedLabel)) return "snap";
  if (/\bwrist\s*shot/.test(normalizedLabel)) return "wrist";
  if (/\bbackhand/.test(normalizedLabel)) return "backhand";
  if (/\bstick\s*handl/.test(normalizedLabel)) return "stickhandling";
  if (/\bscor(?:e|ing)|\bfinish(?:ing)?/.test(normalizedLabel)) return "scoring";

  const structuredShotType = SHOT_TYPE_SKILLS[shotType.toLowerCase()];
  if (structuredShotType) return structuredShotType;

  return null;
}

export function getRecommendedCoachingVideoUrl(
  context: VideoRecommendationContext,
): string | null {
  return getRecommendedCoachingVideo(context)?.url ?? null;
}

export function getRecommendedCoachingVideo(
  context: VideoRecommendationContext,
): CoachingVideo | null {
  const skill = inferCoachingSkill(context);
  if (!skill) return null;

  const recommendedId = RECOMMENDED_VIDEO_BY_SKILL[skill];
  return COACHING_VIDEOS.find((video) => video.id === recommendedId) ?? null;
}

export function getSortedCoachingVideos(
  context: VideoRecommendationContext,
): readonly CoachingVideo[] {
  const skill = inferCoachingSkill(context);
  const recommendedVideo = getRecommendedCoachingVideo(context);

  if (!skill || !recommendedVideo) return COACHING_VIDEOS;

  return [...COACHING_VIDEOS].sort((first, second) => {
    if (first.id === recommendedVideo.id) return -1;
    if (second.id === recommendedVideo.id) return 1;

    const firstMatches = first.skills.includes(skill);
    const secondMatches = second.skills.includes(skill);
    if (firstMatches !== secondMatches) return firstMatches ? -1 : 1;

    return COACHING_VIDEOS.indexOf(first) - COACHING_VIDEOS.indexOf(second);
  });
}

export function getCoachingVideo(url: string): CoachingVideo | null {
  const parsed = parseVideoUrl(url);
  if (!parsed) return null;

  return COACHING_VIDEOS.find((video) => {
    const candidate = parseVideoUrl(video.url);
    return candidate?.provider === parsed.provider && candidate.id === parsed.id;
  }) ?? null;
}
