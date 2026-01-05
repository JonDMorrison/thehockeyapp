import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
import { TodayHeader } from "@/components/dashboard/TodayHeader";
import { TodayStatus } from "@/components/dashboard/TodayStatus";
import { TodaySnapshot } from "@/components/dashboard/TodaySnapshot";
import { CoachDock } from "@/components/dashboard/CoachDock";
import { ContextualNudge } from "@/components/dashboard/ContextualNudge";
import { InviteParentsModal } from "@/components/team/InviteParentsModal";
import { GameDayModal } from "@/components/team/GameDayModal";

const CoachDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showGameDayModal, setShowGameDayModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: dashboard, isLoading, refetch } = useTeamDashboard(id);

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

        {/* Layer 2: Primary Action - State-aware CTA */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <TodayStatus
            teamId={id!}
            mode={dashboard.today.mode}
            practiceCard={dashboard.today.practice_card}
            onPublish={handlePublishCard}
            onToggleGameDay={() => setShowGameDayModal(true)}
          />
        </div>

        {/* Layer 3: Status Feedback - Today Snapshot */}
        <TodaySnapshot
          playersActive={dashboard.pulse.active_today_count}
          sessionsComplete={dashboard.pulse.sessions_complete_today}
          shotsLogged={dashboard.pulse.total_shots_today}
        />

        {/* Layer 4: Navigation - Coach Dock */}
        <CoachDock
          playersCount={dashboard.pulse.players_count}
          weekPlanStatus={undefined} // Could be derived from week plan data
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
    </AppShell>
  );
};

export default CoachDashboard;
