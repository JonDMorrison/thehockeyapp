import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppCard, AppCardTitle } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/app/ProgressBar";
import {
  ChevronRight,
  Dumbbell,
  Calendar,
  Trophy,
  Users,
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isThisWeek } from "date-fns";

interface AssignedWorkoutsSectionProps {
  teamId: string;
}

interface AssignedWorkout {
  id: string;
  title: string | null;
  date: string;
  mode: string | null;
  tier: string | null;
  task_count: number;
  roster_count: number;
  completed_count: number;
}

export const AssignedWorkoutsSection: React.FC<AssignedWorkoutsSectionProps> = ({
  teamId,
}) => {
  const navigate = useNavigate();

  const { data: workouts, isLoading } = useQuery({
    queryKey: ["assigned-workouts", teamId],
    queryFn: async () => {
      // Get upcoming practice cards for this team
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: cards, error: cardsError } = await supabase
        .from("practice_cards")
        .select(`
          id,
          title,
          date,
          mode,
          tier
        `)
        .eq("team_id", teamId)
        .gte("date", today)
        .not("published_at", "is", null)
        .order("date", { ascending: true })
        .limit(10);

      if (cardsError) throw cardsError;
      if (!cards || cards.length === 0) return [];

      // Get roster count
      const { count: rosterCount, error: rosterError } = await supabase
        .from("team_memberships")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("status", "active");

      if (rosterError) throw rosterError;

      // Get task counts for each card
      const cardIds = cards.map((c) => c.id);
      const { data: tasks } = await supabase
        .from("practice_tasks")
        .select("practice_card_id")
        .in("practice_card_id", cardIds);

      // Get session completions for all cards
      const { data: completions } = await supabase
        .from("session_completions")
        .select("practice_card_id, status")
        .in("practice_card_id", cardIds)
        .eq("status", "complete");

      // Build the workout list with completion stats
      const workoutList: AssignedWorkout[] = cards.map((card) => {
        const taskCount = tasks?.filter(
          (t) => t.practice_card_id === card.id
        ).length ?? 0;
        const completedCount = completions?.filter(
          (c) => c.practice_card_id === card.id
        ).length ?? 0;

        return {
          id: card.id,
          title: card.title,
          date: card.date,
          mode: card.mode,
          tier: card.tier,
          task_count: taskCount,
          roster_count: rosterCount ?? 0,
          completed_count: completedCount,
        };
      });

      return workoutList;
    },
    enabled: !!teamId,
  });

  const formatWorkoutDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isThisWeek(date)) return format(date, "EEEE");
    return format(date, "MMM d");
  };

  const getModeIcon = (mode: string | null) => {
    if (mode === "challenge") return Trophy;
    return Dumbbell;
  };

  if (isLoading) {
    return (
      <AppCard>
        <AppCardTitle>Assigned Workouts</AppCardTitle>
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-surface-muted rounded-lg animate-pulse"
            />
          ))}
        </div>
      </AppCard>
    );
  }

  if (!workouts || workouts.length === 0) {
    return (
      <AppCard>
        <AppCardTitle>Assigned Workouts</AppCardTitle>
        <div className="mt-4 flex flex-col items-center justify-center py-6 text-center">
          <Calendar className="w-10 h-10 text-text-muted mb-2" />
          <p className="text-text-muted text-sm">No workouts assigned yet</p>
          <p className="text-text-muted text-xs mt-1">
            Schedule a workout to get started
          </p>
        </div>
      </AppCard>
    );
  }

  // Group workouts by date
  const groupedWorkouts = workouts.reduce((acc, workout) => {
    const dateKey = workout.date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(workout);
    return acc;
  }, {} as Record<string, AssignedWorkout[]>);

  return (
    <AppCard>
      <div className="flex items-center justify-between">
        <AppCardTitle>Assigned Workouts</AppCardTitle>
        {workouts.length > 0 && (
          <Tag variant="neutral">{workouts.length} scheduled</Tag>
        )}
      </div>
      <div className="mt-4 space-y-4">
        {Object.entries(groupedWorkouts).map(([date, dayWorkouts]) => (
          <div key={date}>
            <p className="text-xs font-medium text-text-muted uppercase mb-2">
              {formatWorkoutDate(date)}
            </p>
            <div className="space-y-2">
              {dayWorkouts.map((workout) => {
                const Icon = getModeIcon(workout.mode);
                const completionPct = workout.roster_count > 0
                  ? Math.round((workout.completed_count / workout.roster_count) * 100)
                  : 0;
                const allComplete = workout.roster_count > 0 && workout.completed_count >= workout.roster_count;

                return (
                  <Button
                    key={workout.id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3 hover:bg-surface-muted"
                    onClick={() => navigate(`/teams/${teamId}/practice?date=${workout.date}`)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          allComplete
                            ? "bg-success/10"
                            : "bg-team-primary/10"
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${allComplete ? "text-success" : "text-team-primary"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate text-left">
                            {workout.title || (workout.mode === "challenge" ? "Challenge Workout" : "Daily Workout")}
                          </p>
                          <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0 ml-2" />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Users className="w-3 h-3 text-text-muted" />
                          <span className="text-xs text-text-muted">
                            {workout.completed_count}/{workout.roster_count} done
                          </span>
                          {workout.task_count > 0 && (
                            <>
                              <span className="text-text-muted">•</span>
                              <span className="text-xs text-text-muted">
                                {workout.task_count} tasks
                              </span>
                            </>
                          )}
                          {workout.mode === "challenge" && (
                            <Tag variant="tier" className="text-[10px] py-0 px-1.5 ml-1">
                              Challenge
                            </Tag>
                          )}
                        </div>
                        <div className="mt-2">
                          <ProgressBar 
                            value={completionPct} 
                            max={100}
                            size="sm"
                            className={allComplete ? "[&_div:last-child]:bg-success" : ""}
                          />
                        </div>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </AppCard>
  );
};
