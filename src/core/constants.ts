/**
 * App-wide constants and magic values.
 */

// ── Beta mode ─────────────────────────────────────
// Flip to `false` to re-enable pricing & paywalls
export const BETA_MODE = true;

// ── Storage keys ──────────────────────────────────
export const STORAGE_KEYS = {
  ACTIVE_VIEW: "hockey-app-active-view",
  ACTIVE_TEAM: "hockey-app-active-team",
  ACTIVE_PLAYER: "hockey-app-active-player",
  TEAM_PALETTE: "hockey-team-palette",
  CUSTOM_COLORS: "hockey-custom-colors",
} as const;

// ── Tier system ───────────────────────────────────
export const TIER_IDS = ["rec", "rep", "elite"] as const;
export type TierId = (typeof TIER_IDS)[number];

export const TIER_LABELS: Record<string, string> = {
  rec: "Rec",
  rep: "Rep",
  elite: "Elite",
};

export const TIER_MULTIPLIERS: Record<string, number> = {
  rec: 0.7,
  rep: 1.0,
  elite: 1.3,
};

// ── Task types ────────────────────────────────────
export const TASK_TYPES = [
  "shooting",
  "conditioning",
  "mobility",
  "recovery",
  "prep",
  "other",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_TYPE_LABELS: Record<string, string> = {
  shooting: "Shooting",
  conditioning: "Conditioning",
  mobility: "Mobility",
  recovery: "Recovery",
  prep: "Prep",
  other: "Other",
};

// ── Limits ────────────────────────────────────────
export const MAX_PLAYERS_PER_TEAM = 30;
export const MAX_TASKS_PER_CARD = 15;
export const MAX_PROGRAMS_PER_TEAM = 10;
export const MAX_WEEK_PLANS_PER_PROGRAM = 12;

// ── Defaults ──────────────────────────────────────
export const DEFAULT_PALETTE_ID = "toronto";
export const DEFAULT_TIER: TierId = "rep";
export const DEFAULT_TIME_BUDGET = 25;
export const DEFAULT_DAYS_PER_WEEK = 5;
