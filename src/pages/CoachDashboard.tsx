import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { useTeamDashboard } from "@/hooks/useTeamDashboard";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { AppCard } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/app/Toast";
import { ChevronLeft, Settings, RefreshCw, Users } from "lucide-react";
import { RoleSwitcher } from "@/components/app/RoleSwitcher";
import { TodayHeader } from "@/components/dashboard/TodayHeader";
import { TodaySnapshot } from "@/components/dashboard/TodaySnapshot";
import { CoachDock } from "@/components/dashboard/CoachDock";
import { ContextualNudge } from "@/components/dashboard/ContextualNudge";
import { OnboardingProgress } from "@/components/dashboard/OnboardingProgress";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { InviteParentsModal } from "@/components/team/InviteParentsModal";
import { GameDayModal } from "@/components/team/GameDayModal";
import { TeamGoalCard, GoalCreatorSheet, GoalFloatingAction, GoalTrophyCase } from "@/components/goals";
import { PlanningHubCards, DatePickerSheet, ProgramBuilderWizard } from "@/components/planning";
import { PlanningWalkthrough, usePlanningWalkthrough } from "@/components/onboarding/PlanningWalkthrough";
import { TeamProgressWidget } from "@/components/dashboard/TeamProgressWidget";

const CoachDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showGameDayModal, setShowGameDayModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showProgramWizard, setShowProgramWizard] = useState(false);
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

  // Apply team theme
  useEffect(() => {
    if (dashboard?.team?.palette_id) {
      setTeamTheme(dashboard.team.palette_id);
    }
  }, [dashboard?.team?.palette_id, setTeamTheme]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handlePublishCard = async () => {
    if (!dashboard?.today?.practice_card?.card_id) return;

    try {
      const { error } = await supabase
        .from("practice_cards")
        .update({ published_at: new Date().toISOString() })
        .eq("id", dashboard.today.practice_card.card_id);

      if (error) throw error;

      toast.success("Workout published!");
      queryClient.invalidateQueries({ queryKey: ["team-dashboard", id] });
    } catch {
      toast.error("Failed to publish");
    }
  };

  const handleOnboardingAction = (itemId: string) => {
    switch (itemId) {
      case "add_players":
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

  const handleNudgeAction = (itemId: string) => {
    switch (itemId) {
      case "set_preferences":
        navigate(`/teams/${id}/settings`);
        break;
      case "connect_schedule":
        navigate(`/teams/${id}/settings`);
        break;
      case "invite_parents":
      case "add_players":
        setShowInviteModal(true);
        break;
    }
  };

  const scheduleConnected = dashboard?.upcoming && dashboard.upcoming.length > 0 || 
    dashboard?.onboarding?.checklist?.find(i => i.id === 'connect_schedule')?.done;

  if (isLoading || authLoading) {
    return (
      <AppShell hideNav>
        <PageContainer className="space-y-4">
          <SkeletonCard className="h-20" />
          <SkeletonCard className="h-32" />
          <SkeletonCard className="h-24" />
        </PageContainer>
      </AppShell>
    );
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

  return (
    <AppShell
      hideNav
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
            <Avatar
              src={dashboard.team.logo_url || dashboard.team.photo_url}
              fallback={dashboard.team.name}
              size="sm"
            />
          </div>
          <div className="flex items-center gap-1">
            <RoleSwitcher teamId={id} />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate(`/teams/${id}/settings`)}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      }
    >
      <PageContainer className="space-y-6">
        {/* Layer 1: Context - Date, Team, Day Type */}
        <TodayHeader
          teamName={dashboard.team.name}
          seasonLabel={dashboard.team.season_label}
          date={dashboard.today.date}
          mode={dashboard.today.mode}
          gameDay={dashboard.today.game_day}
        />

        {/* Layer 2: Planning Hub - 3 Creative Cards */}
        <PlanningHubCards
          teamId={id!}
          onAddWorkout={() => setShowDatePicker(true)}
          onPlanWeek={() => navigate(`/teams/${id}/builder/new`)}
          onCreateProgram={() => setShowProgramWizard(true)}
        />

        {/* Team Goal Section */}
        <TeamGoalCard
          teamId={id!}
          rosterCount={dashboard.pulse.players_count}
        />

        {/* Goal Trophy Case - shows past achievements */}
        <GoalTrophyCase teamId={id!} compact />

        {/* Onboarding Progress Checklist */}
        <OnboardingProgress
          checklist={dashboard.onboarding.checklist}
          playersCount={dashboard.pulse.players_count}
          hasWorkouts={dashboard.today.practice_card.exists}
          onAction={handleOnboardingAction}
        />

        {/* Team Progress Widget */}
        <TeamProgressWidget
          playersCount={dashboard.pulse.players_count}
          activeToday={dashboard.pulse.active_today_count}
          sessionsComplete={dashboard.pulse.sessions_complete_today}
          shotsLogged={dashboard.pulse.total_shots_today}
        />

        {/* Upcoming Events with Sync */}
        {scheduleConnected && dashboard.upcoming && dashboard.upcoming.length > 0 && (
          <UpcomingEvents
            events={dashboard.upcoming}
            scheduleConnected={!!scheduleConnected}
            lastSyncedAt={scheduleSource?.last_synced_at}
            isSyncing={syncScheduleMutation.isPending}
            onSyncSchedule={() => syncScheduleMutation.mutate()}
          />
        )}

        {/* Layer 4: Navigation - Coach Dock */}
        <CoachDock
          playersCount={dashboard.pulse.players_count}
          weekPlanStatus={undefined}
          activeToday={dashboard.pulse.active_today_count}
          hasPlayers={dashboard.pulse.players_count > 0}
          onRoster={() => navigate(`/teams/${id}/roster`)}
          onWeekPlan={() => navigate(`/teams/${id}/builder`)}
          onProgress={() => navigate(`/teams/${id}/progress`)}
          onInvite={() => setShowInviteModal(true)}
        />

        {/* Contextual Nudge - One suggestion at a time */}
        <ContextualNudge
          checklist={dashboard.onboarding.checklist}
          playersCount={dashboard.pulse.players_count}
          scheduleConnected={!!scheduleConnected}
          onAction={handleNudgeAction}
        />
      </PageContainer>

      {/* Modals */}
      <InviteParentsModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        teamId={id!}
        teamName={dashboard.team.name}
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
