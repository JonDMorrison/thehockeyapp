import { supabase } from "@/integrations/supabase/client";
import type { ShotSave } from "./shooting";
export interface ShootingDraft {
  value: string;
  version: number;
  request: string;
  reason: string;
  userId: string;
  challengeId: string;
  playerId: string;
  date: string;
  correction: boolean;
  queued?: boolean;
  problem?: string;
  conflict?: ShotSave;
}
export function readShotDraft(key: string): ShootingDraft | null {
  try {
    const d = JSON.parse(localStorage.getItem(key) || "null");
    return d &&
      typeof d.value === "string" &&
      /^\d+$/.test(d.value) &&
      Number(d.value) <= 10000 &&
      Number.isInteger(d.version) &&
      d.version >= 0 &&
      /^[0-9a-f-]{36}$/i.test(d.request) &&
      typeof d.reason === "string" &&
      typeof d.userId === "string" &&
      typeof d.challengeId === "string" &&
      typeof d.playerId === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(d.date)
      ? d
      : null;
  } catch {
    return null;
  }
}
export function storeShotDraft(key: string, draft: ShootingDraft) {
  localStorage.setItem(key, JSON.stringify(draft));
}
export function shotDraftKeys(userId: string) {
  try {
    return Object.keys(localStorage).filter((k) =>
      k.startsWith(`shot-draft:${userId}:`),
    );
  } catch {
    return [];
  }
}
export function queuedShotCount(userId: string) {
  return shotDraftKeys(userId).filter((k) => readShotDraft(k)?.queued).length;
}
export async function syncShotDrafts(
  userId: string,
  signal: AbortSignal,
  stillOwnsJob: () => boolean,
) {
  let synced = 0,
    failed = 0;
  for (const key of shotDraftKeys(userId)) {
    if (!stillOwnsJob()) break;
    const draft = readShotDraft(key);
    if (!draft?.queued || draft.userId !== userId) continue;
    const { data, error } = await supabase
      .rpc("save_shooting_challenge_day", {
        p_id: draft.challengeId,
        p_player: draft.playerId,
        p_date: draft.date,
        p_shots: Number(draft.value),
        p_version: draft.version,
        p_request: draft.request,
        p_reason: draft.correction ? draft.reason : undefined,
      })
      .abortSignal(signal);
    if (!stillOwnsJob()) break;
    // A newer edit supersedes this queued request. Never remove or overwrite that draft.
    if (
      readShotDraft(key)?.request !== draft.request ||
      !readShotDraft(key)?.queued
    )
      continue;
    const result = data as unknown as ShotSave | null;
    if (!error && result && !result.conflict) {
      localStorage.removeItem(key);
      synced++;
      window.dispatchEvent(
        new CustomEvent("shooting-draft-result", {
          detail: { key, request: draft.request, result },
        }),
      );
    } else {
      failed++;
      // Network/auth failures remain retryable. Rule rejections and conflicts require review.
      const permanent =
        !!result?.conflict || ["22023", "42501"].includes(error?.code || "");
      const problem = result?.conflict
        ? "Another device changed this total. Review before replacing it."
        : error?.message || "Reconnect to save this total.";
      storeShotDraft(key, {
        ...draft,
        queued: !permanent,
        problem,
        conflict: result?.conflict ? result : undefined,
      });
      window.dispatchEvent(
        new CustomEvent("shooting-draft-result", {
          detail: {
            key,
            request: draft.request,
            problem,
            conflict: result?.conflict ? result : undefined,
          },
        }),
      );
    }
  }
  return { synced, failed };
}
