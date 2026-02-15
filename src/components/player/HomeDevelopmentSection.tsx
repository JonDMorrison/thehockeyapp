import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppCard, AppCardTitle } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Flame,
  Target,
  Dumbbell,
  Lock,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { ParentTotalsPanel } from "./ParentTotalsPanel";
import { ParentWeeklySummary } from "./ParentWeeklySummary";

interface HomeDevelopmentSectionProps {
  playerId: string;
  teamId: string;
  onBuildPlan: () => void;
}

interface ParentProgramStats {
  totalCards: number;
  completedCards: number;
  totalShots: number;
  totalConditioningReps: number;
  currentStreak: number;
}

export const HomeDevelopmentSection: React.FC<HomeDevelopmentSectionProps> = ({
  playerId,
  teamId,
  onBuildPlan,
}) => {
  const { user } = useAuth();

  // Query parent program stats — only program_source='parent'
  const { data: stats, isLoading } = useQuery({
    queryKey: ["parent-program-stats", playerId, teamId],
    queryFn: async (): Promise<ParentProgramStats> => {
      // Get parent practice cards for this team
      const { data: cards, error: cardsError } = await supabase
        .from("practice_cards")
        .select("id, date")
        .eq("team_id", teamId)
        .eq("program_source", "parent")
        .not("published_at", "is", null)
        .order("date", { ascending: false });

      if (cardsError) throw cardsError;
      if (!cards || cards.length === 0) {
        return {
          totalCards: 0,
          completedCards: 0,
          totalShots: 0,
          totalConditioningReps: 0,
          currentStreak: 0,
        };
      }

      const cardIds = cards.map((c) => c.id);

      // Get session completions for these parent cards
      const { data: completions } = await supabase
        .from("session_completions")
        .select("practice_card_id, status, completed_at")
        .eq("player_id", playerId)
        .eq("program_source", "parent")
        .in("practice_card_id", cardIds);

      const completedCards =
        completions?.filter((c) => c.status === "complete").length ?? 0;

      // Get task completions for shots & conditioning
      const { data: tasks } = await supabase
        .from("practice_tasks")
        .select("id, task_type, shots_expected, target_value")
        .eq("program_source", "parent")
        .in("practice_card_id", cardIds);

      const taskIds = tasks?.map((t) => t.id) ?? [];

      let totalShots = 0;
      let totalConditioningReps = 0;

      if (taskIds.length > 0) {
        const { data: taskCompletions } = await supabase
          .from("task_completions")
          .select("practice_task_id, completed, shots_logged")
          .eq("player_id", playerId)
          .eq("completed", true)
          .in("practice_task_id", taskIds);

        if (taskCompletions && tasks) {
          for (const tc of taskCompletions) {
            const task = tasks.find((t) => t.id === tc.practice_task_id);
            if (!task) continue;
            totalShots += tc.shots_logged ?? task.shots_expected ?? 0;
            if (
              task.task_type === "conditioning" ||
              task.task_type === "fitness"
            ) {
              totalConditioningReps += task.target_value ?? 0;
            }
          }
        }
      }

      // Calculate parent-only streak
      const completedDates = [
        ...new Set(
          (completions ?? [])
            .filter((c) => c.completed_at && c.status === "complete")
            .map((c) => format(parseISO(c.completed_at!), "yyyy-MM-dd"))
        ),
      ].sort();

      let currentStreak = 0;
      if (completedDates.length > 0) {
        const now = new Date();
        const today = format(now, "yyyy-MM-dd");
        const yesterday = format(subDays(now, 1), "yyyy-MM-dd");
        const reversed = [...completedDates].reverse();

        let startOffset = 0;
        if (reversed.includes(today)) startOffset = 0;
        else if (reversed.includes(yesterday)) startOffset = 1;
        else return { totalCards: cards.length, completedCards, totalShots, totalConditioningReps, currentStreak: 0 };

        for (let i = startOffset; i < 365; i++) {
          const d = format(subDays(now, i), "yyyy-MM-dd");
          if (reversed.includes(d)) currentStreak++;
          else break;
        }
      }

      return {
        totalCards: cards.length,
        completedCards,
        totalShots,
        totalConditioningReps,
        currentStreak,
      };
    },
    enabled: !!user && !!playerId && !!teamId,
  });

  const hasParentPlan = (stats?.totalCards ?? 0) > 0;
  const progressPct =
    hasParentPlan && stats!.totalCards > 0
      ? Math.round((stats!.completedCards / stats!.totalCards) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Target className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-base">Your Home Plan</h3>
          <p className="text-xs text-muted-foreground">This is your family's development system.</p>
        </div>
      </div>

      {hasParentPlan ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Program Progress */}
            <AppCard className="text-center py-4">
              <div className="relative w-16 h-16 mx-auto mb-2">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="4"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="4"
                    strokeDasharray={`${(progressPct / 100) * 175.9} 175.9`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                  {progressPct}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                Program Progress
              </p>
            </AppCard>

            {/* Parent Streak */}
            <AppCard className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-orange-500/10 to-red-500/10 flex items-center justify-center">
                <Flame className="w-7 h-7 text-orange-500" />
              </div>
              <p className="text-lg font-bold">{stats?.currentStreak ?? 0}</p>
              <p className="text-xs text-muted-foreground font-medium">
                Home Streak
              </p>
            </AppCard>

            {/* Total Shots */}
            <AppCard className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="w-7 h-7 text-primary" />
              </div>
              <p className="text-lg font-bold">
                {(stats?.totalShots ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                Total Shots
              </p>
            </AppCard>

            {/* Conditioning Reps */}
            <AppCard className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                <Dumbbell className="w-7 h-7 text-primary" />
              </div>
              <p className="text-lg font-bold">
                {(stats?.totalConditioningReps ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                Conditioning Reps
              </p>
            </AppCard>
          </div>

          {/* Parent Weekly Summary */}
          <ParentWeeklySummary playerId={playerId} />

          {/* Parent Totals Panel */}
          <ParentTotalsPanel playerId={playerId} teamId={teamId} />

          {/* Build another plan CTA */}
          <Button
            variant="outline"
            className="w-full"
            onClick={onBuildPlan}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Update Development Plan
          </Button>
        </>
      ) : (
        /* No plan CTA */
        <AppCard className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-base">Build Your Development Plan</h4>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                Create a private, AI-powered training plan tailored to your player's goals.
              </p>
            </div>
            <Button onClick={onBuildPlan}>
              <Sparkles className="w-4 h-4 mr-2" />
              Get Started
            </Button>
          </div>
          {/* Privacy Microcopy */}
          <div className="flex items-center gap-2 px-3 py-2 mt-2 rounded-lg bg-background/50">
            <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Your home plan is private. Coaches only see team assignments.
            </p>
          </div>
        </AppCard>
      )}
    </div>
  );
};
