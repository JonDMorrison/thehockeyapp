import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTeamOnboarding(teamId: string | undefined) {
  return useQuery({
    queryKey: ["team-onboarding", teamId],
    queryFn: async () => {
      if (!teamId) return null;

      const { data, error } = await supabase
        .from("team_onboarding_state")
        .select("*")
        .eq("team_id", teamId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });
}

export function useTeamPreferences(teamId: string | undefined) {
  return useQuery({
    queryKey: ["team-preferences", teamId],
    queryFn: async () => {
      if (!teamId) return null;

      const { data, error } = await supabase
        .from("team_training_preferences")
        .select("*")
        .eq("team_id", teamId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });
}
