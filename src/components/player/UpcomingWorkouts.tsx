import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppCard, AppCardTitle } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Dumbbell,
  Calendar,
  CheckCircle,
  Trophy,
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isThisWeek } from "date-fns";
import { useTranslation } from "react-i18next";

interface UpcomingWorkoutsProps {
  playerId: string;
  compact?: boolean;
}

interface WorkoutCard {
  id: string;
  title: string | null;
  date: string;
  mode: string | null;
  tier: string | null;
  team_id: string;
  team_name: string;
  team_palette_id: string;
  task_count: number;
  is_complete: boolean;
}

export const UpcomingWorkouts: React.FC<UpcomingWorkoutsProps> = ({
  playerId,
  compact = false,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: workouts, isLoading } = useQuery({
    queryKey: ["upcoming-workouts", playerId],
    queryFn: async () => {
      // Get all teams the player is on
      const { data: memberships, error: membershipError } = await supabase
        .from("team_memberships")
        .select("team_id, teams(id, name, palette_id)")
        .eq("player_id", playerId)
        .eq("status", "active");

      if (membershipError) throw membershipError;
      if (!memberships || memberships.length === 0) return [];

      const teamIds = memberships.map((m) => m.team_id);

      // Get upcoming practice cards for all teams
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: cards, error: cardsError } = await supabase
        .from("practice_cards")
        .select(`
          id,
          title,
          date,
          mode,
          tier,
          team_id
        `)
        .in("team_id", teamIds)
        .gte("date", today)
        .not("published_at", "is", null)
        .order("date", { ascending: true })
        .limit(compact ? 5 : 10);

      if (cardsError) throw cardsError;
      if (!cards) return [];

      // Get task counts for each card
      const cardIds = cards.map((c) => c.id);
      const { data: taskCounts } = await supabase
        .from("practice_tasks")
        .select("practice_card_id")
        .in("practice_card_id", cardIds);

      // Get session completions for this player
      const { data: completions } = await supabase
        .from("session_completions")
        .select("practice_card_id, status")
        .eq("player_id", playerId)
        .in("practice_card_id", cardIds);

      // Build the workout list with enriched data
      const workoutList: WorkoutCard[] = cards.map((card) => {
        const team = memberships.find((m) => m.team_id === card.team_id)?.teams;
        const taskCount = taskCounts?.filter(
          (t) => t.practice_card_id === card.id
        ).length ?? 0;
        const completion = completions?.find(
          (c) => c.practice_card_id === card.id
        );

        return {
          id: card.id,
          title: card.title,
          date: card.date,
          mode: card.mode,
          tier: card.tier,
          team_id: card.team_id,
          team_name: team?.name || "Unknown Team",
          team_palette_id: team?.palette_id || "ice",
          task_count: taskCount,
          is_complete: completion?.status === "complete",
        };
      });

      return workoutList;
    },
    enabled: !!playerId,
  });

  const formatWorkoutDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return t("common.today");
    if (isTomorrow(date)) return t("common.tomorrow");
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
        <AppCardTitle>{t("players.upcomingWorkouts.title")}</AppCardTitle>
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-surface-muted rounded-lg animate-pulse"
            />
          ))}
        </div>
      </AppCard>
    );
  }

  if (!workouts || workouts.length === 0) {
    return (
      <AppCard>
        <AppCardTitle>{t("players.upcomingWorkouts.title")}</AppCardTitle>
        <div className="mt-4 flex flex-col items-center justify-center py-6 text-center">
          <Calendar className="w-10 h-10 text-text-muted mb-2" />
          <p className="text-text-muted text-sm">{t("players.upcomingWorkouts.noUpcoming")}</p>
          <p className="text-text-muted text-xs mt-1">
            {t("players.upcomingWorkouts.coachWillAdd")}
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
  }, {} as Record<string, WorkoutCard[]>);

  return (
    <AppCard>
      <div className="flex items-center justify-between">
        <AppCardTitle>{t("players.upcomingWorkouts.title")}</AppCardTitle>
        {!compact && workouts.length > 0 && (
          <Tag variant="neutral">{t("players.upcomingWorkouts.nUpcoming", { n: workouts.length })}</Tag>
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
                    const isWorkoutToday = isToday(parseISO(workout.date));

                    return (
                      <Button
                    key={workout.id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3 hover:bg-surface-muted"
                    onClick={isWorkoutToday ? () => navigate(`/players/${playerId}/today`) : undefined}
                    disabled={!isWorkoutToday}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          workout.is_complete
                            ? "bg-success/10"
                            : "bg-team-primary/10"
                        }`}
                      >
                        {workout.is_complete ? (
                          <CheckCircle className="w-5 h-5 text-success" />
                        ) : (
                          <Icon className="w-5 h-5 text-team-primary" />
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-sm truncate">
                          {workout.title || (workout.mode === "challenge"
                            ? t("players.upcomingWorkouts.challengeWorkout")
                            : t("players.upcomingWorkouts.dailyWorkout"))}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-text-muted">
                            {workout.team_name}
                          </span>
                          {workout.task_count > 0 && (
                            <>
                              <span className="text-text-muted">•</span>
                              <span className="text-xs text-text-muted">
                                {t("players.upcomingWorkouts.nTasks", { n: workout.task_count })}
                              </span>
                            </>
                          )}
                          {workout.mode === "challenge" && (
                            <>
                              <span className="text-text-muted">•</span>
                              <Tag variant="tier" className="text-[10px] py-0 px-1.5">
                                {t("players.upcomingWorkouts.challenge")}
                              </Tag>
                            </>
                          )}
                        </div>
                      </div>
                      {workout.is_complete ? (
                        <Tag variant="success" className="text-xs">
                          {t("common.done")}
                        </Tag>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
                      )}
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
