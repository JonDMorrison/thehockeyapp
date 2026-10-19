import { ChallengeLinks } from "@/components/shooting/ChallengeLinks";
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveView } from "@/contexts/ActiveViewContext";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { usePersonalToday } from "@/hooks/usePersonalToday";
import {
  FamilyTodayCard,
  type FamilyWorkout,
} from "@/components/player/FamilyTodayCard";
import { DataLoadError } from "@/components/app/DataLoadError";
import { useTodaySnapshot } from "@/hooks/useTodaySnapshot";
import { teamPalettes } from "@/lib/themes";
import { fireStreakConfetti } from "@/lib/confetti";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import {
  SkeletonDashboardHeader,
  SkeletonHeroCard,
} from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/components/app/Toast";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  User,
  Check,
  Trophy,
  Dumbbell,
  Flame,
  Target,
  CalendarDays,
  Settings,
} from "lucide-react";
import { WeeklySummaryCard } from "@/components/summary/WeeklySummaryCard";
import { NotificationBell } from "@/components/app/NotificationBell";
import { TeamActivityFeed } from "@/components/player/TeamActivityFeed";
import { TeammateRoster } from "@/components/player/TeammateRoster";
import { TeamLeaderboard } from "@/components/player/TeamLeaderboard";
import { TeamCheersFeed } from "@/components/player/TeamCheersFeed";
import { UpcomingWorkouts } from "@/components/player/UpcomingWorkouts";
import { format, subDays, parseISO } from "date-fns";
import { JoinTeamCard } from "@/components/player/JoinTeamCard";
import { ParentProgramBuilderModal } from "@/components/player/ParentProgramBuilderModal";
import { HomeDevelopmentSection } from "@/components/player/HomeDevelopmentSection";
import { PlayerSettingsSheet } from "@/components/player/PlayerSettingsSheet";
import { FirstRunOverlay } from "@/components/player/FirstRunOverlay";
import toeDragDetail from "@/assets/brand/toe-drag-detail.jpg";
// Milestone thresholds for celebrations
const STREAK_MILESTONES = [7, 14, 21, 30, 60, 90, 100, 180, 365];

interface TeamMembership {
  id: string;
  team_id: string;
  status: string;
  joined_at: string;
  teams?: {
    id: string;
    name: string;
    season_label: string | null;
    team_photo_url: string | null;
    team_logo_url: string | null;
    palette_id: string;
  } | null;
}

const PlayerHome: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setActiveView, setActivePlayerId } = useActiveView();
  const { setTeamTheme } = useTeamTheme();
  const teammatesRef = useRef<HTMLDivElement>(null);
  const celebratedMilestoneRef = useRef<number | null>(null);

  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [showProgramBuilder, setShowProgramBuilder] = useState(false);
  const [showFirstRun, setShowFirstRun] = useState(false);
  const [showPlayerSettings, setShowPlayerSettings] = useState(false);

  const scrollToTeammates = () => {
    teammatesRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // Fetch player - ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const {
    data: player,
    isLoading: playerLoading,
    isError: playerError,
    refetch: retryPlayer,
  } = useQuery({
    queryKey: ["player", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Fetch player's team memberships
  const {
    data: memberships,
    isLoading: membershipsLoading,
    isError: membershipError,
    refetch: retryMemberships,
  } = useQuery({
    queryKey: ["player-memberships", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select(
          `
          id,
          team_id,
          status,
          joined_at,
          teams (
            id,
            name,
            season_label,
            team_photo_url,
            team_logo_url,
            palette_id
          )
        `,
        )
        .eq("player_id", id)
        .eq("status", "active")
        .order("joined_at", { ascending: false });

      if (error) throw error;
      return data as TeamMembership[];
    },
    enabled: !!user && !!id,
  });

  // Fetch active team preference
  const {
    data: preferences,
    isLoading: preferencesLoading,
    isError: preferenceError,
    refetch: retryPreferences,
  } = useQuery({
    queryKey: ["player-preferences", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_team_preferences")
        .select("*")
        .eq("player_id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  const activeTeam = memberships?.find(
    (m) => m.team_id === preferences?.active_team_id,
  )?.teams;

  // Fetch today's workout snapshot
  const {
    snapshot: todaySnapshot,
    isLoading: snapshotLoading,
    error: todayError,
    refresh: retryToday,
  } = useTodaySnapshot(activeTeam ? id! : null, activeTeam?.id);

  const personalToday = usePersonalToday(id);
  const todayHomeWorkout = personalToday.data;
  const teamSession = useQuery({
    queryKey: ["family-team-session", user?.id, id, todaySnapshot?.card_id],
    enabled: Boolean(user && id && todaySnapshot?.card_id),
    queryFn: async () => {
      const [session, card] = await Promise.all([
        supabase
          .from("session_completions")
          .select("status")
          .eq("player_id", id!)
          .eq("practice_card_id", todaySnapshot!.card_id!)
          .maybeSingle(),
        supabase
          .from("practice_cards")
          .select("title")
          .eq("id", todaySnapshot!.card_id!)
          .single(),
      ]);
      if (session.error) throw session.error;
      if (card.error) throw card.error;
      return { status: session.data?.status, title: card.data.title };
    },
  });

  // Calculate workout streak from session completions
  const { data: streakData } = useQuery({
    queryKey: ["player-streak", id, preferences?.active_team_id],
    queryFn: async () => {
      // Get session completions for this player on the active team (team-only)
      const { data: completions, error } = await supabase
        .from("session_completions")
        .select(
          `
          completed_at,
          practice_cards!inner(team_id, date)
        `,
        )
        .eq("player_id", id)
        .eq("practice_cards.team_id", preferences!.active_team_id)
        .eq("program_source", "team")
        .eq("status", "complete")
        .order("completed_at", { ascending: false });

      if (error) throw error;

      // Get unique completion dates sorted oldest to newest for best streak calc
      const completedDates = [
        ...new Set(
          (completions || [])
            .filter((c) => c.completed_at)
            .map((c) => format(parseISO(c.completed_at!), "yyyy-MM-dd")),
        ),
      ].sort();

      if (completedDates.length === 0) {
        return { currentStreak: 0, bestStreak: 0 };
      }

      // Calculate best streak by iterating through all dates
      let bestStreak = 1;
      let tempStreak = 1;

      for (let i = 1; i < completedDates.length; i++) {
        const prevDate = parseISO(completedDates[i - 1]);
        const currDate = parseISO(completedDates[i]);
        const diffDays = Math.round(
          (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (diffDays === 1) {
          tempStreak++;
          bestStreak = Math.max(bestStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
      }

      // Calculate current streak
      let currentStreak = 0;
      const now = new Date();
      const today = format(now, "yyyy-MM-dd");
      const yesterday = format(subDays(now, 1), "yyyy-MM-dd");

      // Reverse for current streak calculation (newest first)
      const reversedDates = [...completedDates].reverse();

      // Start from today or yesterday
      let startOffset = 0;
      if (reversedDates.includes(today)) {
        startOffset = 0;
      } else if (reversedDates.includes(yesterday)) {
        startOffset = 1;
      } else {
        return { currentStreak: 0, bestStreak };
      }

      // Count consecutive days
      for (let i = startOffset; i < 365; i++) {
        const dateToCheck = format(subDays(now, i), "yyyy-MM-dd");
        if (reversedDates.includes(dateToCheck)) {
          currentStreak++;
        } else {
          break;
        }
      }

      return {
        currentStreak,
        bestStreak: Math.max(bestStreak, currentStreak),
      };
    },
    enabled: !!user && !!id && !!preferences?.active_team_id,
  });

  // Update active team mutation
  const updateActiveTeam = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase.from("player_team_preferences").upsert({
        player_id: id,
        active_team_id: teamId,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-preferences", id] });
      toast.success(
        t("players.home.toastTeamUpdatedTitle"),
        t("players.home.toastTeamUpdatedDescription"),
      );
      setShowTeamSelector(false);
    },
    onError: (error: Error) => {
      toast.error(t("players.home.toastTeamUpdateFailedTitle"), error.message);
    },
  });

  // Redirect to auth if not authenticated (but only after auth has loaded)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Apply active team theme and persist context
  useEffect(() => {
    if (preferences?.active_team_id && memberships) {
      const activeTeam = memberships.find(
        (m) => m.team_id === preferences.active_team_id,
      )?.teams;
      if (activeTeam?.palette_id) {
        setTeamTheme(activeTeam.palette_id);
      }
    }
    // Persist the correct role for this profile. Adult-owned profiles are the
    // account holder's training view; managed youth profiles are the parent view.
    if (id && player) {
      const isOwnTrainingProfile =
        player.owner_user_id === user?.id &&
        player.birth_year <= new Date().getFullYear() - 18;
      setActiveView(isOwnTrainingProfile ? "player" : "parent");
      setActivePlayerId(id);
    }
  }, [
    preferences,
    memberships,
    player,
    user?.id,
    setTeamTheme,
    id,
    setActiveView,
    setActivePlayerId,
  ]);

  // Check for streak milestones and celebrate
  useEffect(() => {
    const currentStreak = streakData?.currentStreak ?? 0;

    if (currentStreak > 0) {
      // Find if current streak hits a milestone
      const hitMilestone = STREAK_MILESTONES.find((m) => currentStreak === m);

      if (hitMilestone && celebratedMilestoneRef.current !== hitMilestone) {
        // Check localStorage to see if we already celebrated this milestone for this player
        const celebratedKey = `streak_celebrated_${id}_${hitMilestone}`;
        const alreadyCelebrated = localStorage.getItem(celebratedKey);

        if (!alreadyCelebrated) {
          // Celebrate!
          celebratedMilestoneRef.current = hitMilestone;
          localStorage.setItem(celebratedKey, new Date().toISOString());

          // Fire confetti
          setTimeout(() => {
            fireStreakConfetti(hitMilestone);
          }, 500);

          // Show celebratory toast
          const messages: Record<
            number,
            { title: string; description: string }
          > = {
            7: {
              title: t("players.home.streak7Title"),
              description: t("players.home.streak7Description"),
            },
            14: {
              title: t("players.home.streak14Title"),
              description: t("players.home.streak14Description"),
            },
            21: {
              title: t("players.home.streak21Title"),
              description: t("players.home.streak21Description"),
            },
            30: {
              title: t("players.home.streak30Title"),
              description: t("players.home.streak30Description"),
            },
            60: {
              title: t("players.home.streak60Title"),
              description: t("players.home.streak60Description"),
            },
            90: {
              title: t("players.home.streak90Title"),
              description: t("players.home.streak90Description"),
            },
            100: {
              title: t("players.home.streak100Title"),
              description: t("players.home.streak100Description"),
            },
            180: {
              title: t("players.home.streak180Title"),
              description: t("players.home.streak180Description"),
            },
            365: {
              title: t("players.home.streak365Title"),
              description: t("players.home.streak365Description"),
            },
          };

          const message = messages[hitMilestone] || {
            title: t("players.home.streakDefaultTitle", { days: hitMilestone }),
            description: t("players.home.streakDefaultDescription"),
          };

          setTimeout(() => {
            toast.success(message.title, message.description);
          }, 800);
        }
      }
    }
  }, [streakData?.currentStreak, id, t]);

  // First-run detection: show welcome overlay if player has zero completed sessions
  const { data: sessionCount } = useQuery({
    queryKey: ["player-session-count", id],
    queryFn: async () => {
      const [teamResult, personalResult] = await Promise.all([
        supabase
          .from("session_completions")
          .select("id", { count: "exact", head: true })
          .eq("player_id", id!)
          .eq("status", "complete"),
        supabase
          .from("personal_session_completions")
          .select("id", { count: "exact", head: true })
          .eq("player_id", id!)
          .eq("status", "complete"),
      ]);
      if (teamResult.error) throw teamResult.error;
      if (personalResult.error) throw personalResult.error;
      return (teamResult.count ?? 0) + (personalResult.count ?? 0);
    },
    enabled: !!user && !!id,
  });

  useEffect(() => {
    if (sessionCount === 0 && !playerLoading && player) {
      const dismissed = localStorage.getItem(`first_run_dismissed_${id}`);
      if (!dismissed) {
        setShowFirstRun(true);
      }
    }
  }, [sessionCount, playerLoading, player, id]);

  const handleDismissFirstRun = () => {
    setShowFirstRun(false);
    localStorage.setItem(`first_run_dismissed_${id}`, "true");
  };

  // Combined loading state - check after all hooks are called
  const isLoading =
    authLoading ||
    playerLoading ||
    membershipsLoading ||
    preferencesLoading ||
    snapshotLoading;

  // Show loading skeleton while auth or data is loading
  if (isLoading) {
    return (
      <AppShell hideNav>
        <PageContainer className="space-y-4">
          <SkeletonDashboardHeader />
          <SkeletonHeroCard />
        </PageContainer>
      </AppShell>
    );
  }

  // If not authenticated, render nothing while redirect happens
  if (!isAuthenticated) {
    return null;
  }

  if (playerError || membershipError || preferenceError)
    return (
      <AppShell>
        <PageContainer>
          <DataLoadError
            title="Your player home couldn’t load"
            onRetry={() => {
              void retryPlayer();
              void retryMemberships();
              void retryPreferences();
            }}
          />
        </PageContainer>
      </AppShell>
    );

  if (!player) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <AppCard>
            <EmptyState
              icon={User}
              title={t("players.home.notFoundTitle")}
              description={t("players.home.notFoundDescription")}
              action={{
                label: t("players.home.goBack"),
                onClick: () => navigate("/players"),
              }}
            />
          </AppCard>
        </PageContainer>
      </AppShell>
    );
  }

  const teamWorkout =
    activeTeam && todaySnapshot?.has_card
      ? {
          title: teamSession.data?.title ?? "Team workout",
          source: "Team workout",
          href: `/players/${id}/today`,
          completed: todaySnapshot.progress?.completed ?? 0,
          total: todaySnapshot.progress?.total_required ?? 0,
          finished: teamSession.data?.status === "complete",
        }
      : undefined;
  const homeWorkout = todayHomeWorkout
    ? {
        title: todayHomeWorkout.title ?? "Home workout",
        source: "Home workout",
        href: `/solo/today/${id}`,
        completed: todayHomeWorkout.completed,
        total: todayHomeWorkout.total,
        finished: todayHomeWorkout.finished,
      }
    : undefined;
  const featuredWorkout: FamilyWorkout | undefined = teamWorkout ?? homeWorkout;
  const retryWorkouts = () => {
    if (activeTeam) void retryToday();
    void personalToday.refetch();
    if (todaySnapshot?.card_id) void teamSession.refetch();
  };

  return (
    <AppShell
      header={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Button
              aria-label="Go back"
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate("/players")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                Player home
              </p>
              <p className="truncate font-display text-base font-black uppercase">
                {player.first_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Player options"
              onClick={() => setShowPlayerSettings(true)}
            >
              <Settings className="h-5 w-5" />
            </Button>
            <NotificationBell />
          </div>
        </div>
      }
    >
      <PageContainer className="space-y-5 pb-6">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-black p-4 sm:p-6">
          <img
            src={toeDragDetail}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-[68%_center] opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/20" />
          <div className="relative flex items-center gap-4">
            <Avatar
              src={player.profile_photo_url}
              fallback={`${player.first_name} ${player.last_initial ?? ""}`}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white/65">
                Your next small win starts here
              </p>
              <h1 className="mt-1 break-words font-display text-2xl font-bold text-white sm:text-3xl">
                Let’s go, {player.first_name}.
              </h1>
              {activeTeam && (
                <button
                  className="mt-1 inline-flex min-h-11 max-w-full items-center gap-1 text-left text-xs text-white/75 hover:text-white"
                  onClick={() => setShowTeamSelector(true)}
                  aria-label="Change active team"
                >
                  <span className="truncate">{activeTeam.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                </button>
              )}
            </div>
            <Link
              to="/players"
              aria-label="Switch player"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white"
            >
              <Users className="h-4 w-4" />
            </Link>
          </div>
        </section>
        <nav
          aria-label="Today’s shortcuts"
          className="grid grid-cols-2 gap-2 sm:flex"
        >
          <a
            href="#today-workout"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium sm:text-sm"
          >
            <Dumbbell className="h-4 w-4 text-primary" />
            Today’s workout
          </a>
          <a
            href="#shooting-challenge"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium sm:text-sm"
          >
            <Target className="h-4 w-4 text-primary" />
            Shooting challenge
          </a>
        </nav>
        <div className="grid items-stretch gap-4 xl:grid-cols-2">
          <div id="today-workout" className="scroll-mt-24">
            <FamilyTodayCard
              playerId={id!}
              teamName={activeTeam?.name}
              workout={featuredWorkout}
              loading={
                personalToday.isLoading ||
                Boolean(todaySnapshot?.has_card && teamSession.isLoading)
              }
              error={Boolean(
                (activeTeam && todayError) ||
                teamSession.isError ||
                personalToday.isError,
              )}
              restDay={
                todaySnapshot?.mode === "game_day" ||
                todaySnapshot?.mode === "gameday"
              }
              onRetry={retryWorkouts}
              homeAlsoReady={Boolean(teamWorkout && homeWorkout)}
            />
          </div>
          <div id="shooting-challenge" className="scroll-mt-24">
            <ChallengeLinks playerId={id} familyOverview />
          </div>
        </div>
        <section
          aria-label="Your next wins"
          className="grid grid-cols-3 gap-2 sm:gap-3"
        >
          {[
            {
              to: `/players/${id}/week`,
              label: "This week",
              hint: "Find your rhythm",
              icon: CalendarDays,
            },
            {
              to: `/players/${id}/badges`,
              label: "Your badges",
              hint: "Celebrate the effort",
              icon: Trophy,
            },
            {
              to: `/players/${id}/goals`,
              label: "Team goals",
              hint: "Build something together",
              icon: Target,
            },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-border bg-card px-2 py-4 text-center transition-colors hover:border-primary/40"
            >
              <item.icon className="h-5 w-5 text-primary" />
              <span className="text-xs font-semibold sm:text-sm">
                {item.label}
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">
                {item.hint}
              </span>
            </Link>
          ))}
        </section>
        {(streakData?.currentStreak ?? 0) > 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Flame className="h-4 w-4 text-primary" />
            <strong className="text-foreground">
              {streakData!.currentStreak}-day team streak
            </strong>{" "}
            · One day at a time.
          </p>
        )}
        <details className="group rounded-2xl border border-border bg-card">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 font-semibold [&::-webkit-details-marker]:hidden">
            <span className="flex-1">Your home plan</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-open:rotate-90" />
          </summary>
          <div className="border-t border-border p-4">
            <HomeDevelopmentSection
              playerId={id!}
              onBuildPlan={() => setShowProgramBuilder(true)}
            />
          </div>
        </details>
        {Boolean(memberships?.length) && (
          <UpcomingWorkouts playerId={id!} compact />
        )}
        {preferences?.active_team_id && (
          <details className="group rounded-2xl border border-border bg-card">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 font-semibold [&::-webkit-details-marker]:hidden">
              <span className="flex-1">Team activity</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-open:rotate-90" />
            </summary>
            <div className="space-y-4 border-t border-border p-4">
              <WeeklySummaryCard
                playerId={id!}
                teamId={preferences.active_team_id}
              />
              <TeamActivityFeed
                teamId={preferences.active_team_id}
                currentPlayerId={id!}
              />
              <TeamLeaderboard
                teamId={preferences.active_team_id}
                currentPlayerId={id!}
              />
              <div ref={teammatesRef}>
                <TeammateRoster
                  teamId={preferences.active_team_id}
                  currentPlayerId={id!}
                />
              </div>
              <TeamCheersFeed
                teamId={preferences.active_team_id}
                currentPlayerId={id!}
                onSendCheer={scrollToTeammates}
              />
            </div>
          </details>
        )}
        <details className="group rounded-2xl border border-border bg-card">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 font-semibold [&::-webkit-details-marker]:hidden">
            <span className="flex-1">Your teams</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-open:rotate-90" />
          </summary>
          <div className="space-y-3 border-t border-border p-4">
            {memberships?.map(
              (m) =>
                m.teams && (
                  <Link
                    key={m.id}
                    to={`/teams/${m.team_id}/roster`}
                    className="flex min-h-14 items-center gap-3 rounded-xl border border-border p-3"
                  >
                    <Avatar
                      src={m.teams.team_logo_url}
                      fallback={m.teams.name}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1 break-words text-sm font-medium">
                      {m.teams.name}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ),
            )}
            <JoinTeamCard playerId={id!} />
          </div>
        </details>
      </PageContainer>

      {/* Team Selector Sheet */}
      <Sheet open={showTeamSelector} onOpenChange={setShowTeamSelector}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh]">
          <SheetHeader>
            <SheetTitle>{t("players.home.selectActiveTeamTitle")}</SheetTitle>
            <SheetDescription>
              {t("players.home.selectActiveTeamDescription")}
            </SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-3">
            {memberships?.map((membership) => {
              const team = membership.teams;
              if (!team) return null;

              const isActive = team.id === preferences?.active_team_id;
              const palette = teamPalettes.find(
                (p) => p.id === team.palette_id,
              );

              return (
                <button
                  type="button"
                  key={membership.id}
                  aria-pressed={isActive}
                  disabled={updateActiveTeam.isPending}
                  className={`w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive ? "ring-2 ring-primary ring-offset-2" : ""
                  }`}
                  onClick={() => updateActiveTeam.mutate(team.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={team.team_logo_url || team.team_photo_url}
                      fallback={team.name}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{team.name}</p>
                      {team.season_label && (
                        <p className="text-sm text-text-muted">
                          {team.season_label}
                        </p>
                      )}
                    </div>
                    {isActive && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Parent Program Builder Modal */}
      {id && (
        <ParentProgramBuilderModal
          open={showProgramBuilder}
          onOpenChange={setShowProgramBuilder}
          playerId={id}
          playerAge={
            player ? new Date().getFullYear() - player.birth_year : undefined
          }
          playerShoots={player?.shoots}
        />
      )}

      <PlayerSettingsSheet
        open={showPlayerSettings}
        onOpenChange={setShowPlayerSettings}
        playerId={id!}
        playerName={player.first_name}
      />

      {/* First-run welcome overlay */}
      {showFirstRun && player && (
        <FirstRunOverlay
          playerName={player.first_name}
          hasWorkout={Boolean(featuredWorkout)}
          onStart={() => {
            handleDismissFirstRun();
            if (todaySnapshot?.has_card && preferences?.active_team_id) {
              navigate(`/players/${id}/today`);
            } else {
              navigate(`/solo/today/${id}`);
            }
          }}
          onDismiss={handleDismissFirstRun}
        />
      )}
    </AppShell>
  );
};

export default PlayerHome;
