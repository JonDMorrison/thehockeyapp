/**
 * Entitlement & subscription layer.
 *
 * Server-side: `has_entitlement(user_id, key)` RPC + gates in RPCs.
 * Client-side: this module provides typed helpers for UI gating.
 */

export type Plan = "free" | "pro" | "team";

export type EntitlementKey =
  | "can_view_full_history"
  | "can_access_programs"
  | "can_view_snapshot"
  | "can_receive_ai_summary"
  | "can_export_reports";

/** Entitlements row shape from the DB */
export interface Entitlements {
  can_view_full_history: boolean;
  can_access_programs: boolean;
  can_view_snapshot: boolean;
  can_receive_ai_summary: boolean;
  can_export_reports: boolean;
}

/** Default (free-tier) entitlements */
export const FREE_ENTITLEMENTS: Entitlements = {
  can_view_full_history: false,
  can_access_programs: false,
  can_view_snapshot: false,
  can_receive_ai_summary: false,
  can_export_reports: false,
};

/** Check a single entitlement from a loaded entitlements object */
export function hasEntitlement(
  entitlements: Entitlements | null | undefined,
  key: EntitlementKey
): boolean {
  if (!entitlements) return false;
  return entitlements[key] === true;
}

/** Get the plan display label */
export function getPlanLabel(plan: Plan): string {
  const labels: Record<Plan, string> = {
    free: "Getting Started",
    pro: "Parent Pro",
    team: "Team Plan",
  };
  return labels[plan] ?? plan;
}

/** Feature descriptions for upgrade prompts */
export const FEATURE_LABELS: Record<EntitlementKey, string> = {
  can_view_full_history: "Full Workout History",
  can_access_programs: "Structured Programs",
  can_view_snapshot: "Development Snapshot",
  can_receive_ai_summary: "AI Weekly Summaries",
  can_export_reports: "Export Reports",
};
