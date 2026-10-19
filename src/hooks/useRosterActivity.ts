import { useQuery } from "@tanstack/react-query";
import { addDays, startOfWeek } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function useRosterActivity(
  teamId: string | undefined,
  enabled: boolean,
) {
  const { user } = useAuth();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);
  const query = useQuery({
    queryKey: [
      "roster-week-activity",
      teamId,
      user?.id,
      weekStart.toISOString(),
    ],
    queryFn: async () => {
      const rows: Array<{
        id: string;
        player_id: string;
        completed_at: string | null;
      }> = [];
      // Page the bounded week, rather than silently truncating busy teams.
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase
          .from("session_completions")
          .select(
            "id, player_id, completed_at, practice_cards!inner(team_id, program_source)",
          )
          .eq("practice_cards.team_id", teamId!)
          .eq("practice_cards.program_source", "team")
          .eq("program_source", "team")
          .eq("status", "complete")
          .gte("completed_at", weekStart.toISOString())
          .lt("completed_at", weekEnd.toISOString())
          .lte("completed_at", new Date().toISOString())
          .order("id")
          .range(offset, offset + 499);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 500) return rows;
      }
    },
    enabled: Boolean(user && teamId && enabled),
    refetchInterval: 60000,
  });
  return { ...query, weekStart };
}
