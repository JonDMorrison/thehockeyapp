import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useActiveView } from "@/contexts/ActiveViewContext";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { useTeamDashboard } from "@/hooks/useTeamDashboard";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import {
  SkeletonStatBar,
  SkeletonHeroCard,
  SkeletonEventsList,
  SkeletonProgramCard,
} from "@/components/app/Skeleton";
import { AppCard } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/app/Toast";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Settings,
  RefreshCw,
  Users,
  Swords,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { TodayHeader } from "@/components/dashboard/TodayHeader";
import { OnboardingProgress } from "@/components/dashboard/OnboardingProgress";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { ActiveProgramsSection } from "@/components/dashboard/ActiveProgramsSection";
import { AssignedWorkoutsSection } from "@/components/dashboard/AssignedWorkoutsSection";
import { CoachCheersSection } from "@/components/dashboard/CoachCheersSection";
import { InviteParentsModal } from "@/components/team/InviteParentsModal";
import { GameDayModal } from "@/components/team/GameDayModal";
import { TeamGoalCard } from "@/components/goals";
import {
  PlanningHubCards,
  DatePickerSheet,
  ProgramBuilderWizard,
  ThirtyDayChallengeWizard,
} from "@/components/planning";
import { ChallengeLinks } from "@/components/shooting/ChallengeLinks";
import { Helmet } from "react-helmet-async";

const CoachDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setActiveView, setActiveTeamId } = useActiveView();
  const { setTeamTheme } = useTeamTheme();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [programReadyForTeam, setProgramReadyForTeam] = useState<string | null>(
    null,
  );
  const [inviteModalTab, setInviteModalTab] = useState<"invite" | "add-child">(
    "invite",
  );
  const [showGameDayModal, setShowGameDayModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showProgramWizard, setShowProgramWizard] = useState(false);
  const [showChallengeWizard, setShowChallengeWizard] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: dashboard, isLoading, refetch } = useTeamDashboard(id);

  useEffect(() => {
    if (dashboard?.success && search.get("inviteFamilies") === "1") {
      setProgramReadyForTeam(search.get("programReady") === "1" ? id! : null);
      setInviteModalTab("invite");
      setShowInviteModal(true);
      setSearch(
        (current) => {
          const next = new URLSearchParams(current);
          next.delete("inviteFamilies");
          next.delete("programReady");
          return next;
        },
        { replace: true },
      );
    }
  }, [dashboard, search, setSearch, id]);

  // Fetch schedule source for sync functionality
  const { data: scheduleSource } = useQuery({
    queryKey: ["team-schedule-source", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_schedule_sources")
        .select("id, last_synced_at, sync_status")
        .eq("team_id", id!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Sync schedule mutation
  const syncScheduleMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-schedule", {
        body: { action: "sync", team_id: id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-schedule-source", id] });
      queryClient.invalidateQueries({ queryKey: ["team-dashboard", id] });
      toast.success("Schedule synced!");
    },
    onError: () => {
      toast.error("Failed to sync schedule");
    },
  });

  // Update team name mutation
  const updateTeamNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      const validated = z.string().trim().min(1).max(100).parse(newName);
      const { error } = await supabase
        .from("teams")
        .update({ name: validated })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-dashboard", id] });
      queryClient.invalidateQueries({ queryKey: ["team", id] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Team name updated");
    },
    onError: () => {
      toast.error("Failed to update team name");
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Apply team theme and persist context
  useEffect(() => {
    if (dashboard?.team?.palette_id) {
      setTeamTheme(dashboard.team.palette_id);
    }
    if (id) {
      setActiveView("coach");
      setActiveTeamId(id);
    }
  }, [
    dashboard?.team?.palette_id,
    setTeamTheme,
    id,
    setActiveView,
    setActiveTeamId,
  ]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleOnboardingAction = (itemId: string) => {
    switch (itemId) {
      case "add_players":
        setInviteModalTab("invite");
        setShowInviteModal(true);
        break;
      case "add_my_child":
        setInviteModalTab("add-child");
        setShowInviteModal(true);
        break;
      case "connect_schedule":
      case "set_preferences":
        navigate(`/teams/${id}/settings`);
        break;
      case "first_workout":
        setShowDatePicker(true);
        break;
    }
  };

  const checklist = dashboard?.onboarding?.checklist ?? [];
  const scheduleConnected =
    (dashboard?.upcoming && dashboard.upcoming.length > 0) ||
    checklist.find((i) => i.id === "connect_schedule")?.done;

  const hasPlayers = (dashboard?.pulse?.players_count ?? 0) > 0;
  const onboardingComplete =
    checklist.length > 0 && checklist.every((i) => i.done);

  // Show loading state while auth or data is loading
  if (isLoading || authLoading) {
    return (
      <AppShell hideNav>
        <PageContainer className="space-y-4">
          <SkeletonStatBar />
          <SkeletonHeroCard />
          <SkeletonEventsList />
          <SkeletonProgramCard />
        </PageContainer>
      </AppShell>
    );
  }

  // If not authenticated, render nothing while redirect happens
  if (!isAuthenticated) {
    return null;
  }

  if (!dashboard) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <AppCard>
            <EmptyState
              icon={Users}
              title="Dashboard not available"
              description="Unable to load the dashboard. Please try again."
              action={{
                label: "Go Back",
                onClick: () => navigate("/teams"),
              }}
            />
          </AppCard>
        </PageContainer>
      </AppShell>
    );
  }

  const todayPlan = dashboard.today?.practice_card;
  const needsPlan = !todayPlan?.exists || !todayPlan?.published;
  const attention = !hasPlayers
    ? {
        title: needsPlan
          ? "Start your team’s training"
          : "Ready to invite your team",
        description: needsPlan
          ? "Choose a program, make it yours, then invite your families."
          : "Your training is set up. Invite families to bring your roster together.",
        action: needsPlan ? "Start a program" : "Invite families",
        complete: false,
        onClick: () => {
          if (needsPlan) {
            setShowProgramWizard(true);
            return;
          }
          setInviteModalTab("invite");
          setShowInviteModal(true);
        },
      }
    : needsPlan
      ? {
          title: "Start with 50 wrist shots",
          description:
            "A simple shooting workout is ready. Review it, then publish it to your team.",
          action: "Review and assign",
          complete: false,
          onClick: () => {
            const date = format(new Date(), "yyyy-MM-dd");
            navigate(`/teams/${id}/assign?date=${date}&preset=wrist_shots`);
          },
        }
      : {
          title:
            dashboard.pulse.active_today_count > 0
              ? "Your team is getting after it"
              : "A fresh start for your team",
          description:
            dashboard.pulse.active_today_count === 0
              ? "Training is ready. Activity appears as players get started."
              : `${dashboard.pulse.active_today_count} of ${dashboard.pulse.players_count} ${dashboard.pulse.players_count === 1 ? "player is" : "players are"} active.`,
          action: "View progress",
          complete: true,
          onClick: () => navigate(`/teams/${id}/progress`),
        };

  return (
    <AppShell
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              aria-label="Go back"
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate("/teams")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <p className="font-display text-base font-black uppercase">
              Coach home
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh team dashboard"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate(`/teams/${id}/settings`)}
              aria-label="Team settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      }
    >
      <Helmet>
        <title>{`${dashboard.team?.name ?? "Dashboard"} | Hockey App`}</title>
      </Helmet>
      <PageContainer className="space-y-6">
        <TodayHeader
          teamId={id}
          teamName={dashboard.team?.name ?? "My Team"}
          seasonLabel={dashboard.team?.season_label}
          teamLogoUrl={dashboard.team?.logo_url}
          date={dashboard.today?.date ?? new Date().toISOString()}
          mode={dashboard.today?.mode}
          gameDay={
            dashboard.today?.game_day ?? {
              enabled: false,
              event_time: "",
              opponent: "",
            }
          }
          onUpdateTeamName={(newName) =>
            updateTeamNameMutation.mutateAsync(newName)
          }
          isUpdating={updateTeamNameMutation.isPending}
        />

        <div className="grid items-stretch gap-5 xl:grid-cols-[1.05fr_1fr]">
          <section
            aria-label="Team overview"
            className="flex flex-col rounded-2xl border border-border bg-card p-5 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Your team today
              </p>
              <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                {attention.complete ? "Training ready" : "Next step"}
              </span>
            </div>
            <div className="mt-5 flex items-start gap-3">
              <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {attention.complete ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
              </span>
              <div>
                <h2 className="font-display text-2xl font-bold leading-tight">
                  {attention.title}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {attention.description}
                </p>
              </div>
            </div>
            <div className="my-6 grid grid-cols-3 gap-2">
              {[
                [dashboard.pulse.players_count, "Players"],
                [dashboard.pulse.active_today_count, "Active today"],
                [dashboard.pulse.sessions_complete_today, "Completed"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-xl bg-background/60 px-2 py-4 text-center"
                >
                  <p className="font-display text-3xl font-bold tabular-nums">
                    {value}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-muted-foreground sm:text-xs">
                    {label}
                  </p>
                </div>
              ))}
            </div>
            <div className="mb-5">
              <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                <span>Today’s completions</span>
                <span>
                  {dashboard.pulse.sessions_complete_today} /{" "}
                  {dashboard.pulse.players_count} players
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Players completing today’s training"
                aria-valuemin={0}
                aria-valuemax={Math.max(1, dashboard.pulse.players_count)}
                aria-valuenow={Math.min(
                  dashboard.pulse.sessions_complete_today,
                  dashboard.pulse.players_count,
                )}
                className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.min(100, dashboard.pulse.players_count ? (dashboard.pulse.sessions_complete_today / dashboard.pulse.players_count) * 100 : 0)}%`,
                  }}
                />
              </div>
            </div>
            <Button
              className="mt-auto min-h-11 self-start"
              variant={attention.complete ? "outline" : "default"}
              onClick={attention.onClick}
            >
              {attention.action}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </section>
          <ChallengeLinks teamId={id!} coachOverview />
        </div>

        {hasPlayers && (
          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Coach toolbox
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold">
                  Plan your next move
                </h2>
              </div>
            </div>
            <PlanningHubCards
              teamId={id!}
              compact
              onAddWorkout={() => setShowDatePicker(true)}
              onPlanWeek={() => navigate(`/teams/${id}/builder/new`)}
              onCreateProgram={() => setShowProgramWizard(true)}
              onStartChallenge={() => setShowChallengeWizard(true)}
            />
          </section>
        )}

        {hasPlayers && (
          <section className="grid items-start gap-5 xl:grid-cols-2">
            <ActiveProgramsSection teamId={id!} />
            <AssignedWorkoutsSection teamId={id!} />
          </section>
        )}

        {scheduleConnected &&
          dashboard.upcoming &&
          dashboard.upcoming.length > 0 && (
            <UpcomingEvents
              events={dashboard.upcoming}
              scheduleConnected={!!scheduleConnected}
              lastSyncedAt={scheduleSource?.last_synced_at}
              isSyncing={syncScheduleMutation.isPending}
              onSyncSchedule={() => syncScheduleMutation.mutate()}
            />
          )}

        <details className="group overflow-hidden rounded-lg border border-border bg-card">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 font-semibold [&::-webkit-details-marker]:hidden">
            <span className="flex-1">More team tools</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
          </summary>
          <div className="space-y-4 border-t border-border p-4">
            {!onboardingComplete && checklist.length > 0 && (
              <OnboardingProgress
                checklist={checklist}
                playersCount={dashboard.pulse?.players_count ?? 0}
                hasWorkouts={dashboard.today?.practice_card?.exists ?? false}
                onAction={handleOnboardingAction}
              />
            )}
            <TeamGoalCard
              teamId={id!}
              rosterCount={dashboard.pulse.players_count}
            />
            <button
              type="button"
              className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-border px-4 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.04]"
              onClick={() => setShowGameDayModal(true)}
            >
              <Swords className="h-5 w-5 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Game day</span>
                <span className="block truncate text-xs text-muted-foreground">
                  Adjust the team plan for an upcoming game.
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              type="button"
              className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-border px-4 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.04]"
              onClick={() => navigate(`/teams/${id}/season-report`)}
            >
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  {t("seasonReport.entry")}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {t("seasonReport.entryDescription")}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            {hasPlayers && <CoachCheersSection teamId={id!} />}
          </div>
        </details>
      </PageContainer>

      {/* Modals */}
      <InviteParentsModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        teamId={id!}
        teamName={dashboard.team.name}
        initialTab={inviteModalTab}
        programReady={programReadyForTeam === id}
      />

      <GameDayModal
        open={showGameDayModal}
        onOpenChange={setShowGameDayModal}
        teamId={id!}
        teamName={dashboard.team.name}
      />

      <DatePickerSheet
        open={showDatePicker}
        onOpenChange={setShowDatePicker}
        onSelectDate={(date) => {
          const dateStr = format(date, "yyyy-MM-dd");
          navigate(`/teams/${id}/assign?date=${dateStr}`);
        }}
      />

      <ProgramBuilderWizard
        open={showProgramWizard}
        onOpenChange={setShowProgramWizard}
        teamId={id!}
      />

      <ThirtyDayChallengeWizard
        open={showChallengeWizard}
        onOpenChange={setShowChallengeWizard}
        teamId={id!}
      />
    </AppShell>
  );
};

export default CoachDashboard;
