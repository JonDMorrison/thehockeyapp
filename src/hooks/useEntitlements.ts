import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  type Entitlements,
  type EntitlementKey,
  type Plan,
  FREE_ENTITLEMENTS,
  hasEntitlement as checkEntitlement,
} from "@/core/entitlements";
import { useAuth } from "./useAuth";
import { BETA_MODE } from "@/core/constants";

interface TeamCoverage {
  team_id: string;
  team_name: string;
  current_period_end: string;
  is_purchaser: boolean;
}

interface IndividualSub {
  status: string;
  current_period_end: string | null;
  plan: string;
  source: string;
}

interface CompInfo {
  expires_at: string | null;
}

interface AccessStatus {
  has_full_access: boolean;
  access_source: "paid" | "team" | "comp" | "none";
  team_coverage: TeamCoverage | null;
  individual: IndividualSub | null;
  comp: CompInfo | null;
  is_team_purchaser: boolean;
}

export function useEntitlements() {
  const { user } = useAuth();

  // Primary: server-side access status (source of truth)
  const { data: access, isLoading: accessLoading } = useQuery({
    queryKey: ["access-status", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_access_status");
      if (error) throw error;
      return data as unknown as AccessStatus;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Entitlements table (for individual flag checks on free tier)
  const { data: entitlements, isLoading: entitlementsLoading } = useQuery({
    queryKey: ["entitlements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entitlements")
        .select("can_view_full_history, can_access_programs, can_view_snapshot, can_receive_ai_summary, can_export_reports")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Entitlements) ?? FREE_ENTITLEMENTS;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const can = (key: EntitlementKey): boolean => {
    // Beta mode: grant all features
    if (BETA_MODE) return true;
    // If server says full access, always true
    if (access?.has_full_access) return true;
    return checkEntitlement(entitlements, key);
  };

  const isPro = BETA_MODE ? true : (access?.has_full_access ?? false);
  const isComped = access?.access_source === "comp";
  const isTeamCovered = access?.access_source === "team" || (!!access?.team_coverage && access?.access_source !== "paid");
  const isTeamPurchaser = access?.is_team_purchaser ?? false;

  // Derive plan label
  let plan: Plan = "free";
  if (access?.access_source === "paid") plan = "pro";
  else if (access?.access_source === "team") plan = "team";
  else if (access?.access_source === "comp") plan = "pro";

  // Collision: user has individual paid sub AND team coverage
  const hasCollision = access?.access_source === "paid" && !!access?.team_coverage;

  return {
    entitlements: entitlements ?? FREE_ENTITLEMENTS,
    access,
    isPro,
    isComped,
    isTeamCovered,
    isTeamPurchaser,
    hasCollision,
    plan,
    can,
    loading: accessLoading || entitlementsLoading,
    // Back-compat: expose subscription-like shape from access
    subscription: access?.individual ?? null,
  };
}
