/**
 * Client-side permission helpers for UI gating.
 * Maps to RLS helper functions: is_team_adult, is_team_head_coach, etc.
 * Pure functions — no Supabase calls.
 */

const ADULT_ROLES = ["head_coach", "assistant_coach", "manager", "trainer"];
const COACH_ROLES = ["head_coach", "assistant_coach"];

export function canEditTeam(role: string): boolean {
  return ADULT_ROLES.includes(role);
}

export function canManagePlayers(role: string): boolean {
  return ADULT_ROLES.includes(role);
}

export function canPublishCard(role: string): boolean {
  return ADULT_ROLES.includes(role);
}

export function canDeleteTeam(role: string): boolean {
  return role === "head_coach";
}

export function canInviteAdults(role: string): boolean {
  return ADULT_ROLES.includes(role);
}

export function canManagePrograms(role: string): boolean {
  return ADULT_ROLES.includes(role);
}

export function isCoachRole(role: string): boolean {
  return COACH_ROLES.includes(role);
}

export function isAdultRole(role: string): boolean {
  return ADULT_ROLES.includes(role);
}
