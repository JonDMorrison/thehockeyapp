import { supabase } from "@/integrations/supabase/client";

export interface ShootingChallenge {
  id: string;
  team_id: string;
  name: string;
  start_date: string;
  end_date: string;
  timezone: string;
  daily_cap?: number;
  review_threshold?: number;
  status: "Scheduled" | "Live" | "Finished";
}
export interface ShootingPlayer {
  player_id: string;
  first_name: string;
  last_initial: string | null;
  eligible_from: string;
  total: number;
  raw_total?: number;
  bonus_total?: number;
  bonus_boss?: boolean;
  rank: number | null;
  is_mine: boolean;
  active_member: boolean;
}
export interface ShootingDay {
  player_id: string;
  shot_date: string;
  shots: number;
  version: number;
}
export interface ShootingSnapshot {
  challenge: ShootingChallenge;
  team_name: string;
  today: string;
  server_now: string;
  starts_at: string;
  ends_at: string;
  status: ShootingChallenge["status"];
  is_staff: boolean;
  players: ShootingPlayer[];
  days: ShootingDay[];
  corrected: boolean;
  cap_locked?: boolean;
  review_entries?: {
    player_id: string;
    shot_date: string;
    shots: number;
    version: number;
    reviewed: boolean;
    note: string | null;
    reviewed_at: string | null;
  }[];
  audit: {
    player_id: string;
    shot_date: string;
    previous_shots: number;
    shots: number;
    reason: string | null;
    created_at: string;
  }[];
}
export interface ShotSave {
  shots: number;
  version: number;
  conflict?: boolean;
  replayed?: boolean;
}

export async function shootingSnapshot(id: string): Promise<ShootingSnapshot> {
  const { data, error } = await supabase.rpc("get_shooting_challenge", {
    p_id: id,
  });
  if (error) throw error;
  return data as unknown as ShootingSnapshot;
}
export async function shootingList(
  teamId?: string,
  playerId?: string,
): Promise<ShootingChallenge[]> {
  const { data, error } = await supabase.rpc("list_shooting_challenges", {
    p_team: teamId,
    p_player: playerId,
  });
  if (error) throw error;
  return data as unknown as ShootingChallenge[];
}
export function dateInZone(zone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function addCalendarDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function displayShotDate(date: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
export function challengeReturn(
  teamId: string,
  playerId: string,
): string | null {
  try {
    const pending = JSON.parse(
      sessionStorage.getItem("shootingInvite") || "null",
    );
    if (
      pending?.teamId === teamId &&
      /^[0-9a-f-]{36}$/i.test(pending.challengeId)
    ) {
      sessionStorage.removeItem("shootingInvite");
      return `/shooting/${pending.challengeId}?player=${encodeURIComponent(playerId)}`;
    }
  } catch {
    /* Invalid or unavailable session context is safely ignored. */
  }
  return null;
}
