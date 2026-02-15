/**
 * Shared domain types for The Hockey App.
 * These provide clean interfaces over raw Supabase Row types.
 */

// Re-export UserRole as the single source of truth
export type { UserRole } from "@/hooks/useUserRoles";

export interface Player {
  id: string;
  firstName: string;
  lastInitial: string | null;
  birthYear: number;
  ownerUserId: string;
  jerseyNumber: string | null;
  shoots: string | null;
  profilePhotoUrl: string | null;
  favNhlCity: string | null;
  favNhlPlayer: string | null;
  hockeyLove: string | null;
  seasonGoals: string | null;
  createdAt: string | null;
}

export interface Team {
  id: string;
  name: string;
  seasonLabel: string | null;
  paletteId: string;
  logoUrl: string | null;
  photoUrl: string | null;
  description: string | null;
  valuesText: string | null;
  customPrimary: string | null;
  customSecondary: string | null;
  customTertiary: string | null;
  createdByUserId: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export type ProgramSource = "team" | "parent";

export interface PracticeCard {
  id: string;
  teamId: string;
  date: string;
  title: string | null;
  tier: string | null;
  mode: string | null;
  notes: string | null;
  published: boolean;
  publishedAt: string | null;
  locked: boolean;
  programSource: ProgramSource;
  createdByUserId: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PracticeTask {
  id: string;
  cardId: string;
  label: string;
  taskType: string;
  sortOrder: number;
  targetType: string | null;
  targetValue: number | null;
  shotType: string | null;
  shotsExpected: number | null;
  isRequired: boolean;
  programSource: ProgramSource;
  coachNotes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SessionCompletion {
  id: string;
  playerId: string;
  cardId: string;
  status: string | null;
  completedAt: string | null;
  completedBy: string | null;
  source: string | null;
  programSource: ProgramSource;
  localEventId: string | null;
  updatedAt: string | null;
}

export interface PersonalPracticeCard {
  id: string;
  playerId: string;
  date: string;
  title: string | null;
  tier: string | null;
  mode: string | null;
  notes: string | null;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TrainingProgram {
  id: string;
  teamId: string;
  name: string;
  description: string | null;
  status: string | null;
  tier: string | null;
  startDate: string;
  endDate: string;
  daysPerWeek: number | null;
  timeBudgetMinutes: number | null;
  focusAreas: string[] | null;
  createdByUserId: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TeamGoal {
  id: string;
  teamId: string;
  name: string;
  description: string | null;
  goalType: string;
  timeframe: string;
  targetValue: number;
  currentValue: number;
  status: string;
  startDate: string;
  endDate: string;
  showLeaderboard: boolean;
  rewardType: string | null;
  rewardDescription: string | null;
  completedAt: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

/** Placeholder — no billing integration yet */
export interface Subscription {
  userId: string;
  plan: "free" | "pro" | "team";
  status: "active" | "canceled" | "past_due";
  expiresAt: string | null;
}

/** Placeholder — feature flags tied to subscription tier */
export interface Entitlement {
  feature: string;
  enabled: boolean;
}

/** Shape for AI-generated task data coming from edge functions */
export interface AIGeneratedTask {
  task_type: string;
  label: string;
  target_type: string;
  target_value: number | null;
  shot_type: string;
  shots_expected: number | null;
  is_required: boolean;
  coach_notes?: string;
}

/** Shape for AI-generated day data */
export interface AIGeneratedDay {
  date: string;
  title?: string;
  notes?: string;
  tasks?: AIGeneratedTask[];
}

/** Shape for AI-generated draft (day_card or week_plan) */
export interface AIGeneratedDraft {
  title?: string;
  name?: string;
  notes?: string;
  tier?: string;
  start_date?: string;
  tasks?: AIGeneratedTask[];
  days?: AIGeneratedDay[];
}

/** Badge with challenge info from Supabase join */
export interface BadgeWithChallenge {
  player_id: string;
  awarded_at: string | null;
  challenge_id: string;
  challenges: {
    name: string;
    badge_icon: string;
    metric_type?: string;
    target_value?: number;
  } | null;
}

/** Challenge row from the challenges table */
export interface Challenge {
  id: string;
  name: string;
  description: string;
  metric_type: string;
  target_value: number;
  badge_icon: string;
  is_active: boolean | null;
  scope: string | null;
}

/** Team search result with invite token */
export interface TeamSearchResult {
  id: string;
  name: string;
  season_label: string | null;
  team_logo_url: string | null;
  team_photo_url: string | null;
  palette_id: string;
  invite_token: string | null;
}
