import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { useTeamDashboard } from "@/hooks/useTeamDashboard";
import { useTeamOnboarding } from "@/hooks/useTeamOnboarding";
import { teamPalettes } from "@/lib/themes";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard } from "@/components/app/AppCard";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/app/Tag";
import { toast } from "@/components/app/Toast";
import {
  ChevronLeft,
  Settings,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import { TodayHeroCard } from "@/components/dashboard/TodayHeroCard";
import { QuickActionRow } from "@/components/dashboard/QuickActionRow";
import { TeamCelebration } from "@/components/dashboard/TeamCelebration";
import { ContextualNudge } from "@/components/dashboard/ContextualNudge";
import { InviteParentsModal } from "@/components/team/InviteParentsModal";
import { GameDayModal } from "@/components/team/GameDayModal";
import { CoachOnboardingWizard } from "@/components/onboarding/CoachOnboardingWizard";

const CoachDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showGameDayModal, setShowGameDayModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: dashboard, isLoading, refetch } = useTeamDashboard(id);
  const { data: onboardingState, isLoading: onboardingLoading } = useTeamOnboarding(id);

  // Check if coming from team creation
  const isNewTeam = searchParams.get("onboarding") === "true";

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

  // Show onboarding if new team or not completed
  useEffect(() => {
    if (!onboardingLoading && !isLoading && dashboard) {
      const shouldShowOnboarding = isNewTeam || !onboardingState?.completed;
      setShowOnboarding(shouldShowOnboarding);
    }
  }, [onboardingLoading, isLoading, dashboard, onboardingState, isNewTeam]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    searchParams.delete("onboarding");
    setSearchParams(searchParams, { replace: true });
    queryClient.invalidateQueries({ queryKey: ["team-onboarding", id] });
    queryClient.invalidateQueries({ queryKey: ["team-dashboard", id] });
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    searchParams.delete("onboarding");
    setSearchParams(searchParams, { replace: true });
  };

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

      toast.success("Practice published!");
      queryClient.invalidateQueries({ queryKey: ["team-dashboard", id] });
    } catch {
      toast.error("Failed to publish");
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

  const palette = dashboard?.team?.palette_id
    ? teamPalettes.find((p) => p.id === dashboard.team.palette_id)
    : null;

  const scheduleConnected = dashboard?.upcoming && dashboard.upcoming.length > 0 || 
    dashboard?.onboarding?.checklist?.find(i => i.id === 'connect_schedule')?.done;

  // Check if there's a week plan (approximated by having practice card)
  const hasWeekPlan = dashboard?.today?.practice_card?.exists || false;

  if (isLoading || authLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-16" />
          <SkeletonCard className="h-20" />
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
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">{dashboard.team.name}</h1>
              {dashboard.team.season_label && (
                <p className="text-xs text-text-muted">
                  {dashboard.team.season_label}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
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
        {/* TODAY HERO - The One Thing */}
        <TodayHeroCard
          teamId={id!}
          date={dashboard.today.date}
          mode={dashboard.today.mode}
          gameDay={dashboard.today.game_day}
          practiceCard={dashboard.today.practice_card}
          hasWeekPlan={hasWeekPlan}
          onPublish={handlePublishCard}
          onToggleGameDay={() => setShowGameDayModal(true)}
        />

        {/* Quick Actions - 4 icons max */}
        <QuickActionRow
          onRoster={() => navigate(`/teams/${id}/roster`)}
          onWeekPlan={() => navigate(`/teams/${id}/builder`)}
          onProgress={() => navigate(`/teams/${id}/progress`)}
          onInvite={() => setShowInviteModal(true)}
        />

        {/* Celebration Stats - only shows when there's activity */}
        <TeamCelebration
          playersCount={dashboard.pulse.players_count}
          activeToday={dashboard.pulse.active_today_count}
          sessionsComplete={dashboard.pulse.sessions_complete_today}
          totalShots={dashboard.pulse.total_shots_today}
          onViewDetails={() => navigate(`/teams/${id}/progress`)}
        />

        {/* Contextual Nudge - one suggestion at a time */}
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

      {/* Onboarding Wizard */}
      {showOnboarding && dashboard && (
        <CoachOnboardingWizard
          teamId={id!}
          teamName={dashboard.team.name}
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
    </AppShell>
  );
};

export default CoachDashboard;
