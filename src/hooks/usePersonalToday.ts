import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/** The same personal cards and completion records used by the home workout screen. */
export function usePersonalToday(playerId?: string) {
  const { user } = useAuth();
  const date = format(new Date(), "yyyy-MM-dd");
  return useQuery({
    queryKey: ["family-personal-today", user?.id, playerId, date],
    enabled: Boolean(user && playerId),
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const card = await supabase
        .from("personal_practice_cards")
        .select("id,title")
        .eq("player_id", playerId!)
        .eq("date", date)
        .not("published_at", "is", null)
        .maybeSingle();
      if (card.error) throw card.error;
      if (!card.data) return null;
      const [tasks, session] = await Promise.all([
        supabase
          .from("personal_practice_tasks")
          .select("id")
          .eq("personal_practice_card_id", card.data.id),
        supabase
          .from("personal_session_completions")
          .select("status")
          .eq("player_id", playerId!)
          .eq("personal_practice_card_id", card.data.id)
          .maybeSingle(),
      ]);
      if (tasks.error) throw tasks.error;
      if (session.error) throw session.error;
      const ids = (tasks.data ?? []).map((t) => t.id);
      let completed = 0;
      if (ids.length) {
        const result = await supabase
          .from("personal_task_completions")
          .select("personal_practice_task_id")
          .eq("player_id", playerId!)
          .eq("completed", true)
          .in("personal_practice_task_id", ids);
        if (result.error) throw result.error;
        completed = result.data?.length ?? 0;
      }
      return {
        ...card.data,
        total: ids.length,
        completed,
        finished: session.data?.status === "complete",
      };
    },
  });
}
