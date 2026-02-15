import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppCard } from "@/components/app/AppCard";
import { ProgressBar } from "@/components/app/ProgressBar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Target,
  Dumbbell,
  Timer,
  CheckCircle2,
  Lock,
  TrendingUp,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface ParentTotalsPanelProps {
  playerId: string;
  teamId: string;
}

interface ParentTotals {
  totalShots: number;
  totalPushups: number;
  totalConditioningMinutes: number;
  totalWorkoutsCompleted: number;
  monthlyShots: number;
  monthlyPushups: number;
  monthlyConditioningMinutes: number;
  monthlyWorkoutsCompleted: number;
  // For monthly progress bars — previous month as baseline
  prevMonthShots: number;
  prevMonthPushups: number;
  prevMonthConditioningMinutes: number;
  prevMonthWorkoutsCompleted: number;
}

export const ParentTotalsPanel: React.FC<ParentTotalsPanelProps> = ({
  playerId,
  teamId,
}) => {
  const { user } = useAuth();
  const [showLifetime, setShowLifetime] = useState(false);

  const { data: totals, isLoading } = useQuery({
    queryKey: ["parent-totals-panel", playerId, teamId],
    queryFn: async (): Promise<ParentTotals> => {
      // Get all parent practice cards
      const { data: cards } = await supabase
        .from("practice_cards")
        .select("id, date")
        .eq("team_id", teamId)
        .eq("program_source", "parent")
        .not("published_at", "is", null);

      if (!cards || cards.length === 0) {
        return {
          totalShots: 0, totalPushups: 0, totalConditioningMinutes: 0, totalWorkoutsCompleted: 0,
          monthlyShots: 0, monthlyPushups: 0, monthlyConditioningMinutes: 0, monthlyWorkoutsCompleted: 0,
          prevMonthShots: 0, prevMonthPushups: 0, prevMonthConditioningMinutes: 0, prevMonthWorkoutsCompleted: 0,
        };
      }

      const cardIds = cards.map((c) => c.id);
      const now = new Date();
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
      const prevStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
      const prevEnd = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");

      // Date lookup for cards
      const cardDateMap = new Map(cards.map((c) => [c.id, c.date]));

      // Session completions (parent only)
      const { data: completions } = await supabase
        .from("session_completions")
        .select("practice_card_id, status, completed_at")
        .eq("player_id", playerId)
        .eq("program_source", "parent")
        .in("practice_card_id", cardIds)
        .eq("status", "complete");

      const totalWorkoutsCompleted = completions?.length ?? 0;

      // Monthly/prev workouts
      const monthlyWorkoutsCompleted = (completions ?? []).filter((c) => {
        const d = cardDateMap.get(c.practice_card_id);
        return d && d >= monthStart && d <= monthEnd;
      }).length;

      const prevMonthWorkoutsCompleted = (completions ?? []).filter((c) => {
        const d = cardDateMap.get(c.practice_card_id);
        return d && d >= prevStart && d <= prevEnd;
      }).length;

      // Get tasks
      const { data: tasks } = await supabase
        .from("practice_tasks")
        .select("id, practice_card_id, task_type, shots_expected, target_value, target_type")
        .eq("program_source", "parent")
        .in("practice_card_id", cardIds);

      const taskIds = tasks?.map((t) => t.id) ?? [];

      let totalShots = 0, totalPushups = 0, totalConditioningMinutes = 0;
      let monthlyShots = 0, monthlyPushups = 0, monthlyConditioningMinutes = 0;
      let prevMonthShots = 0, prevMonthPushups = 0, prevMonthConditioningMinutes = 0;

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

            const cardDate = cardDateMap.get(task.practice_card_id) ?? "";
            const isThisMonth = cardDate >= monthStart && cardDate <= monthEnd;
            const isPrevMonth = cardDate >= prevStart && cardDate <= prevEnd;

            const shots = tc.shots_logged ?? task.shots_expected ?? 0;
            totalShots += shots;
            if (isThisMonth) monthlyShots += shots;
            if (isPrevMonth) prevMonthShots += shots;

            if (task.task_type === "pushups" || task.task_type === "strength") {
              const val = task.target_value ?? 0;
              totalPushups += val;
              if (isThisMonth) monthlyPushups += val;
              if (isPrevMonth) prevMonthPushups += val;
            }

            if (task.task_type === "conditioning" || task.task_type === "fitness") {
              const mins = task.target_type === "minutes" ? (task.target_value ?? 0) : Math.round((task.target_value ?? 0) / 10);
              totalConditioningMinutes += mins;
              if (isThisMonth) monthlyConditioningMinutes += mins;
              if (isPrevMonth) prevMonthConditioningMinutes += mins;
            }
          }
        }
      }

      return {
        totalShots, totalPushups, totalConditioningMinutes, totalWorkoutsCompleted,
        monthlyShots, monthlyPushups, monthlyConditioningMinutes, monthlyWorkoutsCompleted,
        prevMonthShots, prevMonthPushups, prevMonthConditioningMinutes, prevMonthWorkoutsCompleted,
      };
    },
    enabled: !!user && !!playerId && !!teamId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <AppCard className="animate-pulse">
        <div className="h-48 bg-muted rounded-lg" />
      </AppCard>
    );
  }

  if (!totals || totals.totalWorkoutsCompleted === 0) {
    return null; // Don't show panel if no parent data
  }

  const metrics = [
    {
      label: "Total Shots",
      icon: Target,
      lifetime: totals.totalShots,
      monthly: totals.monthlyShots,
      prevMonthly: totals.prevMonthShots,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Total Pushups",
      icon: Dumbbell,
      lifetime: totals.totalPushups,
      monthly: totals.monthlyPushups,
      prevMonthly: totals.prevMonthPushups,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      label: "Conditioning Minutes",
      icon: Timer,
      lifetime: totals.totalConditioningMinutes,
      monthly: totals.monthlyConditioningMinutes,
      prevMonthly: totals.prevMonthConditioningMinutes,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Workouts Completed",
      icon: CheckCircle2,
      lifetime: totals.totalWorkoutsCompleted,
      monthly: totals.monthlyWorkoutsCompleted,
      prevMonthly: totals.prevMonthWorkoutsCompleted,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
  ];

  const currentMonthLabel = format(new Date(), "MMMM");

  return (
    <div className="space-y-3">
      {/* Header with lifetime toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">
            {showLifetime ? "Lifetime Totals" : `${currentMonthLabel} Totals`}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="lifetime-toggle" className="text-xs text-muted-foreground cursor-pointer">
            Lifetime
          </Label>
          <Switch
            id="lifetime-toggle"
            checked={showLifetime}
            onCheckedChange={setShowLifetime}
            className="scale-75"
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => {
          const value = showLifetime ? m.lifetime : m.monthly;
          // Monthly progress: compare to previous month (use prev as "target" for relative bar)
          const progressTarget = showLifetime
            ? m.lifetime // Full bar for lifetime
            : Math.max(m.prevMonthly, m.monthly, 1); // Compare to prev month

          return (
            <AppCard key={m.label} className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${m.bgColor} flex items-center justify-center`}>
                  <m.icon className={`w-4 h-4 ${m.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold tabular-nums tracking-tight">
                {value.toLocaleString()}
              </p>
              <p className="text-[11px] text-muted-foreground font-medium leading-tight">
                {m.label}
              </p>
              {!showLifetime && (
                <div className="pt-1">
                  <ProgressBar
                    value={m.monthly}
                    max={progressTarget}
                    size="sm"
                  />
                  {m.prevMonthly > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      vs {m.prevMonthly.toLocaleString()} last month
                    </p>
                  )}
                </div>
              )}
            </AppCard>
          );
        })}
      </div>

      {/* Privacy footer */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
        <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
        <p className="text-[11px] text-muted-foreground">
          Private stats — coaches only see team assignments.
        </p>
      </div>
    </div>
  );
};
