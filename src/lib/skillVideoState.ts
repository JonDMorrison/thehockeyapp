import { parseVideoUrl } from "@/lib/videoEmbed";

interface StoredVideoInteraction {
  watchedAt?: number;
  dismissedAt?: number;
  updatedAt: number;
}

interface SkillVideoInteraction {
  watched: boolean;
  dismissed: boolean;
}

const STORAGE_KEY = "hockeyapp.skill-video-state.v1";
const DISMISSAL_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_STORED_VIDEOS = 40;

function getVideoKey(url: string): string | null {
  const parsed = parseVideoUrl(url);
  return parsed ? `${parsed.provider}:${parsed.id}` : null;
}

function readInteractions(): Record<string, StoredVideoInteraction> {
  if (typeof window === "undefined") return {};

  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return {};

    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object"
      ? parsed as Record<string, StoredVideoInteraction>
      : {};
  } catch {
    return {};
  }
}

function updateInteraction(
  url: string,
  updates: Partial<Pick<StoredVideoInteraction, "watchedAt" | "dismissedAt">>,
): void {
  if (typeof window === "undefined") return;

  const videoKey = getVideoKey(url);
  if (!videoKey) return;

  const interactions = readInteractions();
  const now = Date.now();
  interactions[videoKey] = {
    ...interactions[videoKey],
    ...updates,
    updatedAt: now,
  };

  const trimmedInteractions = Object.fromEntries(
    Object.entries(interactions)
      .sort(([, first], [, second]) => second.updatedAt - first.updatedAt)
      .slice(0, MAX_STORED_VIDEOS),
  );

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedInteractions));
  } catch {
    // The video remains usable when browser storage is unavailable.
  }
}

export function getSkillVideoInteraction(url: string): SkillVideoInteraction {
  const videoKey = getVideoKey(url);
  const interaction = videoKey ? readInteractions()[videoKey] : undefined;
  const dismissed = Boolean(
    interaction?.dismissedAt
      && interaction.dismissedAt > Date.now() - DISMISSAL_TTL_MS,
  );

  return {
    watched: Boolean(interaction?.watchedAt),
    dismissed,
  };
}

export function markSkillVideoWatched(url: string): void {
  updateInteraction(url, { watchedAt: Date.now() });
}

export function dismissSkillVideo(url: string): void {
  updateInteraction(url, { dismissedAt: Date.now() });
}
