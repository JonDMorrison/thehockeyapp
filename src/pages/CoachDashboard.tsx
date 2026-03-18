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
import { ChevronLeft, Settings, RefreshCw, Users, Swords } from "lucide-react";
import { z } from "zod";
import { ContextSwitcher } from "@/components/app/ContextSwitcher";
import { TodayHeader } from "@/components/dashboard/TodayHeader";
import { CoachDock } from "@/components/dashboard/CoachDock";
import { OnboardingProgress } from "@/components/dashboard/OnboardingProgress";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { ActiveProgramsSection } from "@/components/dashboard/ActiveProgramsSection";
import { AssignedWorkoutsSection } from "@/components/dashboard/AssignedWorkoutsSection";
import { CoachCheersSection } from "@/components/dashboard/CoachCheersSection";
import { TeamPulseBar } from "@/components/dashboard/TeamPulseBar";
import { AddPlayerChoice } from "@/components/dashboard/AddPlayerChoice";
import { InviteParentsModal } from "@/components/team/InviteParentsModal";
import { GameDayModal } from "@/components/team/GameDayModal";
import { TeamGoalCard, GoalCreatorSheet } from "@/components/goals";
import { PlanningHubCards, DatePickerSheet, ProgramBuilderWizard, ThirtyDayChallengeWizard } from "@/components/planning";
import { PlanningWalkthrough, usePlanningWalkthrough } from "@/components/onboarding/PlanningWalkthrough";
import logoImage from "@/assets/hockey-app-logo.png";

const CoachDashboard: React.FC = () => {
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
            <img src={logoImage} alt="The Hockey App" className="w-8 h-8 object-contain" />
          </div>
          <div className="flex items-center gap-1">
            <ContextSwitcher currentTeamId={id} />
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
      <PageContainer className="space-y-4">
        {/* Layer 1: Context - Date, Team, Day Type + Pulse Stats */}
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

        {/* Inline Team Pulse Stats */}
        {hasPlayers && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground px-1">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {dashboard.pulse.players_count} player{dashboard.pulse.players_count !== 1 ? 's' : ''}
            </span>
            <span className="text-border">·</span>
            <span className={dashboard.pulse.active_today_count > 0 ? "text-primary font-medium" : ""}>
              {dashboard.pulse.active_today_count} active today
            </span>
            <span className="text-border">·</span>
            <span>{dashboard.pulse.sessions_complete_today} complete</span>
          </div>
        )}

        {!hasPlayers && (
          <p className="text-xs text-muted-foreground px-1">
            This is your team's accountability system.
          </p>
        )}

        {/* Onboarding Progress Checklist - only if not complete */}
        {!onboardingComplete && checklist.length > 0 && (
          <OnboardingProgress
            checklist={checklist}
            playersCount={dashboard.pulse?.players_count ?? 0}
            hasWorkouts={dashboard.today?.practice_card?.exists ?? false}
            onAction={handleOnboardingAction}
          />
        )}

        {/* Empty State: Add Players Choice - show when no players and onboarding not complete */}
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

        {/* Game Day Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full flex items-center gap-2 border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
          onClick={() => setShowGameDayModal(true)}
        >
          <Swords className="w-4 h-4" />
          Set Up Game Day
        </Button>

        {/* Planning Hub Cards - 3 Creative Cards */}
        <PlanningHubCards
          teamId={id!}
          onAddWorkout={() => setShowDatePicker(true)}
          onPlanWeek={() => navigate(`/teams/${id}/builder/new`)}
          onCreateProgram={() => setShowProgramWizard(true)}
          onStartChallenge={() => setShowChallengeWizard(true)}
        />

        {/* Active Programs Section */}
        <ActiveProgramsSection teamId={id!} />

        {/* Assigned Workouts Section */}
        <AssignedWorkoutsSection teamId={id!} />

        {/* Team Goal Section */}
        <TeamGoalCard
          teamId={id!}
          rosterCount={dashboard.pulse.players_count}
        />

        {/* Team Cheers Section */}
        {hasPlayers && <CoachCheersSection teamId={id!} />}

        {/* Team Pulse stats merged into inline badges above */}

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

        {/* Layer 4: Navigation - Coach Dock (2 items, Settings removed — already in header) */}
        <CoachDock
          playersCount={dashboard.pulse.players_count}
          activeToday={dashboard.pulse.active_today_count}
          onRoster={() => navigate(`/teams/${id}/roster`)}
          onProgress={() => navigate(`/teams/${id}/progress`)}
        />
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
