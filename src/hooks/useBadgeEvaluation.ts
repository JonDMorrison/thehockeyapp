import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback } from "react";

interface EvaluationResult {
  success: boolean;
  badges_awarded: number;
  reason?: string;
}

interface NewBadge {
  id: string;
  name: string;
}

export function useBadgeEvaluation(playerId: string | undefined) {
  const queryClient = useQueryClient();
  const [newBadges, setNewBadges] = useState<NewBadge[]>([]);

  const evaluateMutation = useMutation({
    mutationFn: async (): Promise<EvaluationResult> => {
      if (!playerId) {
        return { success: false, badges_awarded: 0, reason: "no_player" };
      }

      // Get current badge count before evaluation
      const { data: beforeBadges } = await supabase
        .from("player_badges")
        .select("id, challenge_id")
        .eq("player_id", playerId);

      const beforeCount = beforeBadges?.length || 0;

      // Call the evaluation function
      const { data, error } = await supabase.rpc("evaluate_player_challenges", {
        p_player_id: playerId,
      });

      if (error) throw error;

      const result = (data as unknown) as EvaluationResult;

      // If badges were awarded, fetch the new ones
      if (result.badges_awarded > 0) {
        const { data: afterBadges } = await supabase
          .from("player_badges")
          .select("id, challenge_id, challenges(name)")
          .eq("player_id", playerId);

        const beforeIds = new Set(beforeBadges?.map((b) => b.id) || []);
        const newlyAwarded = afterBadges?.filter((b) => !beforeIds.has(b.id)) || [];

        const badges: NewBadge[] = newlyAwarded.map((b) => ({
          id: b.id,
          name: (b.challenges as { name: string } | null)?.name || "Badge Earned",
        }));

        setNewBadges(badges);
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate badge-related queries
      queryClient.invalidateQueries({ queryKey: ["player-badges", playerId] });
      queryClient.invalidateQueries({ queryKey: ["player-challenge-progress", playerId] });
    },
  });

  const dismissBadge = useCallback((badgeId: string) => {
    setNewBadges((prev) => prev.filter((b) => b.id !== badgeId));
  }, []);

  const dismissAllBadges = useCallback(() => {
    setNewBadges([]);
  }, []);

  return {
    evaluate: evaluateMutation.mutate,
    isEvaluating: evaluateMutation.isPending,
    newBadges,
    dismissBadge,
    dismissAllBadges,
  };
}
