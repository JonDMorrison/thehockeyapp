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

interface SubscriptionInfo {
  plan: Plan;
  status: string;
  source: string;
  current_period_end: string | null;
}

export function useEntitlements() {
  const { user } = useAuth();

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
    staleTime: 5 * 60 * 1000, // cache 5 min
  });

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan, status, source, current_period_end")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as SubscriptionInfo | null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const can = (key: EntitlementKey): boolean =>
    checkEntitlement(entitlements, key);

  const isPro =
    (subscription?.plan === "pro" && subscription?.status === "active") ||
    (subscription?.plan === "pro" && subscription?.status === "comped" && subscription?.source === "comp") ||
    (subscription?.plan === "pro" && subscription?.status === "trialing");

  const isComped = subscription?.source === "comp" && subscription?.status === "comped";

  return {
    entitlements: entitlements ?? FREE_ENTITLEMENTS,
    subscription,
    isPro,
    isComped,
    plan: (subscription?.plan ?? "free") as Plan,
    can,
    loading: entitlementsLoading || subLoading,
  };
}
