/**
 * Feature gating scaffold.
 * No billing integration yet — all features unlocked.
 */

export type Plan = "free" | "starter" | "pro";

export type Feature =
  | "ai_assist"
  | "advanced_analytics"
  | "unlimited_programs"
  | "custom_branding"
  | "export_data"
  | "weekly_summaries"
  | "schedule_sync"
  | "team_goals";

/**
 * Check if a plan has access to a feature.
 * Currently returns true for everything (no paywall active).
 */
export function hasEntitlement(_plan: Plan, _feature: Feature): boolean {
  // All features unlocked during pre-monetization phase
  return true;
}

/**
 * Get the plan display label.
 */
export function getPlanLabel(plan: Plan): string {
  const labels: Record<Plan, string> = {
    free: "Free",
    starter: "Starter",
    pro: "Pro",
  };
  return labels[plan];
}
