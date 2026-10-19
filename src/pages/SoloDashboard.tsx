import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Challenge } from "@/core";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfWeek, addDays } from "date-fns";
import { Link } from "react-router-dom";
import { ChallengeLinks } from "@/components/shooting/ChallengeLinks";
import { FamilyTodayCard } from "@/components/player/FamilyTodayCard";
import { usePersonalToday } from "@/hooks/usePersonalToday";
import {
  Flame,
  CheckCircle2,
  ChevronRight,
  Lock,
  Target,
  Dumbbell,
  Zap,
  Calendar,
  Star,
  Award,
  Trophy,
  Medal,
  Shield,
  Crown,
  CheckCircle,
  Brain,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app/AppShell";
import {
  SkeletonDashboardHeader,
  SkeletonQuickStats,
  SkeletonHeroCard,
} from "@/components/app/Skeleton";
import { cn } from "@/lib/utils";
import { InviteFriendModal } from "@/components/player/InviteFriendModal";
import { SoloUpcomingEvents } from "@/components/player/SoloUpcomingEvents";
import { SoloJoinTeamSection } from "@/components/player/SoloJoinTeamSection";
import { UserMenu } from "@/components/app/UserMenu";
import { ContextSwitcher } from "@/components/app/ContextSwitcher";

// Map database icon names to Lucide components
const BADGE_ICONS: Record<string, React.ElementType> = {
  target: Target,
  flame: Flame,
  trophy: Trophy,
  medal: Medal,
  star: Star,
  award: Award,
  shield: Shield,
  crown: Crown,
  zap: Zap,
  brain: Brain,
  "check-circle": CheckCircle,
  calendar: Calendar,
};

// Badge categories for grouping
const BADGE_CATEGORIES = [
  {
    id: "consistency",
    label: "Consistency",
    metricTypes: ["sessions_completed"],
    description: "Keep showing up",
  },
  {
    id: "shooting",
    label: "Shooting",
    metricTypes: ["total_shots"],
    description: "Put in the reps",
  },
  {
    id: "gameday",
    label: "Game Ready",
    metricTypes: ["game_day_completed", "prep_tasks_completed"],
    description: "Be prepared",
  },
];

interface DashboardData {
  success: boolean;
  error?: string;
  player: {
    id: string;
    first_name: string;
    last_initial: string | null;
    photo_url: string | null;
  };
  plan: {
    id: string;
    name: string;
    tier: string;
    focus: string[];
    days_per_week: number;
  } | null;
  today: {
    date: string;
    status: "no_workout" | "not_started" | "in_progress" | "complete";
    card_id: string | null;
    title: string | null;
    task_count: number;
    completed_count: number;
  };
  streak: {
    current_streak: number;
    best_streak: number;
  };
  recent_workouts: Array<{
    id: string;
    title: string;
    date: string;
    tier: string;
    task_count: number;
  }>;
  week_activity: Array<{
    date: string;
    has_workout: boolean;
    completed: boolean;
  }>;
  stats: {
    total_workouts: number;
    total_shots: number;
    badges_earned: number;
    badges_total: number;
  };
}

export default function SoloDashboard() {
  const { t } = useTranslation();
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const personalToday = usePersonalToday(playerId);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showScheduleConnect, setShowScheduleConnect] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["solo-dashboard", playerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_solo_dashboard", {
        p_player_id: playerId,
      });
      if (error) throw error;
      return data as unknown as DashboardData;
    },
    enabled: !!playerId,
  });

  const {
    data: badges,
    isError: badgesError,
    isLoading: badgesLoading,
    refetch: retryBadges,
  } = useQuery({
    queryKey: ["player-badges-showcase", playerId],
    queryFn: async () => {
      const [earnedResult, allChallengesResult] = await Promise.all([
        supabase
          .from("player_badges")
          .select("*, challenges(*)")
          .eq("player_id", playerId!),
        supabase.from("challenges").select("*").eq("is_active", true),
      ]);

      if (earnedResult.error) throw earnedResult.error;
      if (allChallengesResult.error) throw allChallengesResult.error;

      return {
        earned: earnedResult.data || [],
        all: allChallengesResult.data || [],
      };
    },
    enabled: !!playerId,
  });

  if (isLoading || authLoading) {
    return (
      <AppShell>
        <div className="p-4 space-y-6">
          <SkeletonDashboardHeader />
          <SkeletonQuickStats />
          <SkeletonHeroCard />
        </div>
      </AppShell>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!dashboard?.success) {
    return (
      <AppShell>
        <div className="p-4 text-center pt-20">
          <p className="text-muted-foreground">
            {t("solo.unableToLoadDashboard")}
          </p>
          <div className="flex gap-3 justify-center mt-4">
            <Button
              variant="outline"
              onClick={() =>
                queryClient.invalidateQueries({
                  queryKey: ["solo-dashboard", playerId],
                })
              }
            >
              {t("common.retry")}
            </Button>
            <Button variant="outline" onClick={() => navigate("/players")}>
              Back to players
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const { player, today, streak, recent_workouts, week_activity, stats, plan } =
    dashboard;

  // Generate week days for display
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const dateStr = format(date, "yyyy-MM-dd");
    const activity = week_activity?.find((w) => w.date === dateStr);
    return {
      date,
      dayLetter: format(date, "EEEEE"),
      isToday: format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"),
      hasWorkout: activity?.has_workout || false,
      completed: activity?.completed || false,
    };
  });

  const personal = personalToday.data;
  const featuredWorkout = personal
    ? {
        title: personal.title ?? "Home workout",
        source: "Home workout",
        href: `/solo/today/${playerId}`,
        completed: personal.completed,
        total: personal.total,
        finished: personal.finished,
      }
    : today.card_id
      ? {
          title: today.title ?? "Home workout",
          source: "Home workout",
          href: `/solo/today/${playerId}`,
          completed: today.completed_count,
          total: today.task_count,
          finished: today.task_count > 0 && today.status === "complete",
        }
      : undefined;

  return (
    <AppShell>
      <div className="mx-auto min-h-screen max-w-6xl bg-background">
        {/* Header */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <UserMenu
                avatarUrl={player.photo_url}
                initials={player.first_name[0]}
                displayName={player.first_name}
                size="lg"
                playerId={playerId}
                settingsPath={`/solo/settings/${playerId}`}
                onPhotoUploaded={() => {
                  // Refetch dashboard data to update avatar without full reload
                  queryClient.invalidateQueries({
                    queryKey: ["solo-dashboard", playerId],
                  });
                }}
              />
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {t("solo.heyName", { name: player.first_name })}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), "EEEE, MMM d")}
                </p>
              </div>
            </div>

            {/* Context Switcher & Streak */}
            <div className="flex items-center gap-2">
              <ContextSwitcher currentPlayerId={playerId} compact />
              {streak.current_streak > 0 && (
                <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-2 rounded-full">
                  <Flame className="h-4 w-4" />
                  <span className="font-bold text-sm">
                    {streak.current_streak}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 space-y-6 pb-8">
          <nav
            aria-label="Today’s shortcuts"
            className="grid grid-cols-2 gap-2 sm:flex"
          >
            <a
              href="#solo-today-workout"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm"
            >
              <Dumbbell className="h-4 w-4 text-primary" />
              Today’s workout
            </a>
            <a
              href="#solo-shooting-challenge"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm"
            >
              <Target className="h-4 w-4 text-primary" />
              Shooting challenge
            </a>
          </nav>
          <div className="grid items-stretch gap-4 xl:grid-cols-2">
            <div id="solo-today-workout" className="scroll-mt-24">
              <FamilyTodayCard
                playerId={playerId!}
                workout={featuredWorkout}
                loading={personalToday.isLoading}
                error={personalToday.isError}
                onRetry={() => void personalToday.refetch()}
              />
            </div>
            <div id="solo-shooting-challenge" className="scroll-mt-24">
              <ChallengeLinks playerId={playerId} familyOverview />
            </div>
          </div>
          <section
            aria-label="Keep the good stuff going"
            className="grid grid-cols-2 gap-3"
          >
            <Link
              to={`/solo/planning/${playerId}`}
              className="flex min-h-24 items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <Calendar className="h-6 w-6 shrink-0 text-primary" />
              <span className="min-w-0">
                <strong className="block text-sm">Plan your next win</strong>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Make training fit your week.
                </span>
              </span>
            </Link>
            <Link
              to={`/solo/badges/${playerId}`}
              className="flex min-h-24 items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <Trophy className="h-6 w-6 shrink-0 text-primary" />
              <span className="min-w-0">
                <strong className="block text-sm">Your badges</strong>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Every effort builds something.
                </span>
              </span>
            </Link>
          </section>
          <Button
            variant="ghost"
            className="min-h-11"
            onClick={() => setShowInviteModal(true)}
          >
            <Users className="mr-2 h-4 w-4" />
            Invite a training buddy
          </Button>

          {/* Week Progress */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">
                {t("solo.thisWeek")}
              </h3>
            </div>
            <div className="flex gap-2">
              {weekDays.map((day, idx) => (
                <div
                  key={format(day.date, "yyyy-MM-dd")}
                  className={cn(
                    "flex-1 aspect-square rounded-xl flex flex-col items-center justify-center transition-all",
                    day.completed
                      ? "bg-success/10"
                      : day.hasWorkout
                        ? "bg-primary/10"
                        : "bg-muted/50",
                    day.isToday &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-medium",
                      day.completed
                        ? "text-success"
                        : day.hasWorkout
                          ? "text-primary"
                          : "text-muted-foreground",
                    )}
                  >
                    {day.dayLetter}
                  </span>
                  {day.completed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5" />
                  ) : day.hasWorkout ? (
                    <Dumbbell className="h-3 w-3 text-primary mt-0.5" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Join a Team Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">
                {t("solo.teams")}
              </h3>
            </div>
            <SoloJoinTeamSection playerId={playerId!} variant="card" />
          </div>

          {/* Schedule Widget */}
          <SoloUpcomingEvents
            playerId={playerId!}
            onConnectSchedule={() => navigate(`/solo/settings/${playerId}`)}
          />
          {recent_workouts && recent_workouts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {t("solo.completedWorkouts")}
              </h3>
              <div className="space-y-2">
                {recent_workouts.slice(0, 3).map((workout) => (
                  <div
                    key={workout.id}
                    className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {workout.title || t("solo.workoutFallback")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(workout.date), "MMM d")} ·{" "}
                          {workout.task_count} {t("solo.tasks")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aspirational Badges by Category */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                {t("solo.badgesToEarn")}
              </h3>
              <button
                className="text-xs text-primary font-medium flex items-center gap-0.5"
                onClick={() => navigate(`/solo/badges/${playerId}`)}
              >
                {t("solo.viewAll")} <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            <div className="space-y-3">
              {BADGE_CATEGORIES.map((category) => {
                // Get badges for this category
                const categoryBadges =
                  badges?.all.filter((c: Challenge) =>
                    category.metricTypes.includes(c.metric_type),
                  ) || [];

                // Get earned badges in this category
                const earnedInCategory = categoryBadges.filter((c: Challenge) =>
                  badges?.earned.find(
                    (e: { challenge_id: string }) => e.challenge_id === c.id,
                  ),
                );

                // Get next badge to earn (lowest target not yet earned)
                const unearnedBadges = categoryBadges
                  .filter(
                    (c: Challenge) =>
                      !badges?.earned.find(
                        (e: { challenge_id: string }) =>
                          e.challenge_id === c.id,
                      ),
                  )
                  .sort(
                    (a: Challenge, b: Challenge) =>
                      a.target_value - b.target_value,
                  );

                const nextBadge = unearnedBadges[0];
                const IconComponent = nextBadge
                  ? BADGE_ICONS[nextBadge.badge_icon] || Star
                  : Star;

                return (
                  <div
                    key={category.id}
                    className="bg-card border border-border rounded-xl p-4"
                  >
                    <div className="flex items-center gap-3">
                      {/* Badge Icon */}
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          earnedInCategory.length > 0
                            ? "bg-primary/10"
                            : "bg-muted/50",
                        )}
                      >
                        {nextBadge ? (
                          <IconComponent
                            className={cn(
                              "h-6 w-6",
                              earnedInCategory.length > 0
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          />
                        ) : categoryBadges.length > 0 ? (
                          <CheckCircle2 className="h-6 w-6 text-primary" />
                        ) : (
                          <Star className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>

                      {/* Badge Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-foreground">
                            {category.label}
                          </p>
                          {earnedInCategory.length > 0 && (
                            <span className="text-xs text-primary font-medium">
                              {earnedInCategory.length}/{categoryBadges.length}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {nextBadge
                            ? t("solo.nextBadge", { name: nextBadge.name })
                            : categoryBadges.length > 0
                              ? t("solo.allBadgesEarned")
                              : badgesError
                                ? "Badges couldn’t load"
                                : badgesLoading
                                  ? "Loading badges…"
                                  : "New badges are on the way"}
                        </p>
                      </div>

                      {/* Lock or Check */}
                      {nextBadge ? (
                        <Lock className="h-4 w-4 text-muted-foreground/50" />
                      ) : categoryBadges.length > 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {badgesError && (
            <Button variant="outline" onClick={() => void retryBadges()}>
              Retry badges
            </Button>
          )}

          {/* Training links */}
          <Link
            to={`/players/${playerId}/home`}
            className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-sm font-semibold"
          >
            Family & team home
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Invite Friend Modal */}
      <InviteFriendModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        playerId={playerId!}
        todayCardId={today.card_id}
        activePlanId={plan?.id}
        playerName={player.first_name}
      />
    </AppShell>
  );
}
