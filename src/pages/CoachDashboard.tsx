import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useActiveView } from "@/contexts/ActiveViewContext";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { useTeamDashboard } from "@/hooks/useTeamDashboard";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonStatBar, SkeletonHeroCard, SkeletonEventsList, SkeletonProgramCard } from "@/components/app/Skeleton";
import { AppCard } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/app/Toast";
import { AlertTriangle, CheckCircle2, ChevronLeft, Settings, RefreshCw, Users, Swords, BarChart3, ChevronRight } from "lucide-react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { TodayHeader } from "@/components/dashboard/TodayHeader";
import { OnboardingProgress } from "@/components/dashboard/OnboardingProgress";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { ActiveProgramsSection } from "@/components/dashboard/ActiveProgramsSection";
import { AssignedWorkoutsSection } from "@/components/dashboard/AssignedWorkoutsSection";
import { CoachCheersSection } from "@/components/dashboard/CoachCheersSection";
import { AddPlayerChoice } from "@/components/dashboard/AddPlayerChoice";
import { InviteParentsModal } from "@/components/team/InviteParentsModal";
import { GameDayModal } from "@/components/team/GameDayModal";
import { TeamGoalCard, GoalCreatorSheet } from "@/components/goals";
import { PlanningHubCards, DatePickerSheet, ProgramBuilderWizard, ThirtyDayChallengeWizard } from "@/components/planning";
import { PlanningWalkthrough, usePlanningWalkthrough } from "@/components/onboarding/PlanningWalkthrough";
import { Helmet } from "react-helmet-async";

const CoachDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setActiveView, setActiveTeamId } = useActiveView();
  const { setTeamTheme } = useTeamTheme();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteModalTab, setInviteModalTab] = useState<"invite" | "add-child">("invite");
  const [showGameDayModal, setShowGameDayModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showProgramWizard, setShowProgramWizard] = useState(false);
  const [showChallengeWizard, setShowChallengeWizard] = useState(false);
  const [showGoalCreator, setShowGoalCreator] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: dashboard, isLoading, refetch } = useTeamDashboard(id);

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
  
  const {
    showWalkthrough,
    completeWalkthrough,
    skipWalkthrough,
  } = usePlanningWalkthrough(id || "");

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
  }, [dashboard?.team?.palette_id, setTeamTheme, id, setActiveView, setActiveTeamId]);

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
  const scheduleConnected = (dashboard?.upcoming && dashboard.upcoming.length > 0) || 
    checklist.find(i => i.id === 'connect_schedule')?.done;

  const hasPlayers = (dashboard?.pulse?.players_count ?? 0) > 0;
  const onboardingComplete = checklist.length > 0 && checklist.every(i => i.done);

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
        title: "Invite your roster",
        description: "Add players first so the team can receive its weekly plan.",
        action: "Invite families",
        complete: false,
        onClick: () => {
          setInviteModalTab("invite");
          setShowInviteModal(true);
        },
      }
    : needsPlan
      ? {
          title: "Today needs a plan",
          description: "Publish the next workout so every player knows what to do.",
          action: "Assign workout",
          complete: false,
          onClick: () => setShowDatePicker(true),
        }
      : {
          title: "Today is moving",
          description: `${dashboard.pulse.active_today_count} of ${dashboard.pulse.players_count} players are active.`,
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
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate("/teams")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Coach home</p>
              <p className="truncate font-display text-base font-black uppercase">{dashboard.team.name}</p>
            </div>
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
      <Helmet><title>{`${dashboard.team?.name ?? "Dashboard"} | Hockey App`}</title></Helmet>
      <PageContainer className="space-y-6">
        <TodayHeader
          teamName={dashboard.team?.name ?? "My Team"}
          seasonLabel={dashboard.team?.season_label}
          teamLogoUrl={dashboard.team?.logo_url}
          date={dashboard.today?.date ?? new Date().toISOString()}
          mode={dashboard.today?.mode}
          gameDay={dashboard.today?.game_day ?? { enabled: false, event_time: "", opponent: "" }}
          onUpdateTeamName={(newName) => updateTeamNameMutation.mutateAsync(newName)}
          isUpdating={updateTeamNameMutation.isPending}
        />

        <section className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-lg border border-border bg-card">
          {[
            [dashboard.pulse.players_count, "Roster"],
            [dashboard.pulse.active_today_count, "Active today"],
            [dashboard.pulse.sessions_complete_today, "Complete"],
          ].map(([value, label]) => (
            <div key={label} className="px-3 py-4 text-center sm:px-5">
              <p className="font-display text-2xl font-black tabular-nums sm:text-3xl">{value}</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-muted-foreground sm:text-[10px]">{label}</p>
            </div>
          ))}
        </section>

        <section className={`relative overflow-hidden rounded-xl border p-5 sm:p-6 ${attention.complete ? "border-emerald-500/25 bg-emerald-500/[0.06]" : "border-primary/30 bg-primary/[0.07]"}`}>
          <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${attention.complete ? "bg-emerald-500/12 text-emerald-400" : "bg-primary/12 text-primary"}`}>
                {attention.complete ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  {attention.complete ? "Team status" : "Needs attention"}
                </p>
                <h2 className="mt-1 font-display text-2xl font-black uppercase">{attention.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{attention.description}</p>
              </div>
            </div>
            <Button className="min-h-11 shrink-0 font-bold" variant={attention.complete ? "outline" : "team"} onClick={attention.onClick}>
              {attention.action} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </section>

        {!onboardingComplete && checklist.length > 0 && (
          <OnboardingProgress
            checklist={checklist}
            playersCount={dashboard.pulse?.players_count ?? 0}
            hasWorkouts={dashboard.today?.practice_card?.exists ?? false}
            onAction={handleOnboardingAction}
          />
        )}

        {!hasPlayers && !onboardingComplete && (
          <AddPlayerChoice
            onAddMyChild={() => {
              setInviteModalTab("add-child");
              setShowInviteModal(true);
            }}
            onInviteFamilies={() => {
              setInviteModalTab("invite");
              setShowInviteModal(true);
            }}
          />
        )}

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Planning</p>
              <h2 className="mt-1 font-display text-2xl font-black uppercase">Plan the week</h2>
            </div>
            <Button variant="ghost" className="min-h-11 text-amber-400 hover:text-amber-300" onClick={() => setShowGameDayModal(true)}>
              <Swords className="h-4 w-4" /> Game day
            </Button>
          </div>
          <PlanningHubCards
            teamId={id!}
            onAddWorkout={() => setShowDatePicker(true)}
            onPlanWeek={() => navigate(`/teams/${id}/builder/new`)}
            onCreateProgram={() => setShowProgramWizard(true)}
            onStartChallenge={() => setShowChallengeWizard(true)}
          />
        </section>

        <section className="grid items-start gap-5 xl:grid-cols-2">
          <ActiveProgramsSection teamId={id!} />
          <AssignedWorkoutsSection teamId={id!} />
        </section>

        {scheduleConnected && dashboard.upcoming && dashboard.upcoming.length > 0 && (
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
            <TeamGoalCard teamId={id!} rosterCount={dashboard.pulse.players_count} />
            <button
              type="button"
              className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-border px-4 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.04]"
              onClick={() => navigate(`/teams/${id}/season-report`)}
            >
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{t("seasonReport.entry")}</span>
                <span className="block truncate text-xs text-muted-foreground">{t("seasonReport.entryDescription")}</span>
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
        onOpenGoalCreator={() => setShowGoalCreator(true)}
      />

      <GoalCreatorSheet
        open={showGoalCreator}
        onOpenChange={setShowGoalCreator}
        teamId={id!}
        rosterCount={dashboard.pulse.players_count}
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

      {/* First-time user walkthrough */}
      <AnimatePresence>
        {showWalkthrough && (
          <PlanningWalkthrough
            onComplete={completeWalkthrough}
            onSkip={skipWalkthrough}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
};

export default CoachDashboard;
