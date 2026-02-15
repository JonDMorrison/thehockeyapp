export { logger } from "./logger";
export { ErrorBoundary } from "./ErrorBoundary";
export { assertDefined, isDefined, requireUser, requireActivePlayer, requireActiveTeam } from "./nullSafety";
export { hasEntitlement, getPlanLabel, FREE_ENTITLEMENTS, FEATURE_LABELS } from "./entitlements";
export {
  canEditTeam,
  canManagePlayers,
  canPublishCard,
  canDeleteTeam,
  canInviteAdults,
  canManagePrograms,
  isCoachRole,
  isAdultRole,
} from "./permissions";
export {
  STORAGE_KEYS,
  TIER_IDS,
  TIER_LABELS,
  TIER_MULTIPLIERS,
  TASK_TYPES,
  TASK_TYPE_LABELS,
  MAX_PLAYERS_PER_TEAM,
  MAX_TASKS_PER_CARD,
  DEFAULT_PALETTE_ID,
  DEFAULT_TIER,
  DEFAULT_TIME_BUDGET,
  DEFAULT_DAYS_PER_WEEK,
} from "./constants";
export type {
  ProgramSource,
  Player,
  Team,
  PracticeCard,
  PracticeTask,
  SessionCompletion,
  PersonalPracticeCard,
  TrainingProgram,
  TeamGoal,
  Subscription,
  Entitlement,
  AIGeneratedTask,
  AIGeneratedDay,
  AIGeneratedDraft,
  BadgeWithChallenge,
  Challenge,
  TeamSearchResult,
} from "./types";
export type { Plan, EntitlementKey, Entitlements } from "./entitlements";
export type { TierId, TaskType } from "./constants";
