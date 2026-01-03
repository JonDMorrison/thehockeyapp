import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  cta: string;
}

interface TeamDashboardSnapshot {
  success: boolean;
  error?: string;
  team: {
    id: string;
    name: string;
    palette_id: string;
    logo_url: string | null;
    photo_url: string | null;
    season_label: string | null;
  };
  onboarding: {
    completed: boolean;
    checklist: ChecklistItem[];
  };
  today: {
    date: string;
    mode: "normal" | "game_day";
    game_day: {
      enabled: boolean;
      event_time: string | null;
      opponent: string | null;
    };
    practice_card: {
      exists: boolean;
      published: boolean;
      card_id: string | null;
      title: string | null;
      tier: string | null;
      mode: string | null;
    };
  };
  pulse: {
    players_count: number;
    active_today_count: number;
    sessions_complete_today: number;
    total_shots_today: number;
  };
  upcoming: Array<{
    id: string;
    event_type: string;
    title: string | null;
    start_time: string;
    location: string | null;
  }>;
}

export function useTeamDashboard(teamId: string | undefined) {
  return useQuery({
    queryKey: ["team-dashboard", teamId],
    queryFn: async () => {
      if (!teamId) return null;

      const { data, error } = await supabase.rpc("get_team_dashboard_snapshot", {
        p_team_id: teamId,
      });

      if (error) throw error;

      const result = data as unknown as TeamDashboardSnapshot;
      if (!result.success) {
        throw new Error(result.error || "Failed to load dashboard");
      }

      return result;
    },
    enabled: !!teamId,
    refetchInterval: 60000, // Refresh every minute
  });
}

export type { TeamDashboardSnapshot, ChecklistItem };
