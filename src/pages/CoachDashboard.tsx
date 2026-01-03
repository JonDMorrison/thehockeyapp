import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { useTeamDashboard } from "@/hooks/useTeamDashboard";
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
import { SetupChecklist } from "@/components/dashboard/SetupChecklist";
import { TodayControlCenter } from "@/components/dashboard/TodayControlCenter";
import { TeamPulse } from "@/components/dashboard/TeamPulse";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { QuickActions } from "@/components/dashboard/QuickActions";
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

  const handleChecklistAction = (itemId: string) => {
    switch (itemId) {
      case "set_preferences":
        navigate(`/teams/${id}/settings`);
        break;
      case "connect_schedule":
        navigate(`/teams/${id}/settings`);
        break;
      case "invite_parents":
        setShowInviteModal(true);
        break;
      case "add_players":
        setShowInviteModal(true);
        break;
      case "publish_first_card":
        if (dashboard?.today?.practice_card?.card_id) {
          handlePublishCard();
        } else {
          navigate(`/teams/${id}/practice/new`);
        }
        break;
    }
  };

  const handleCreateCard = () => {
    navigate(`/teams/${id}/practice/new`);
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

  const handleViewCard = () => {
    if (dashboard?.today?.practice_card?.card_id) {
      navigate(`/teams/${id}/practice/${dashboard.today.practice_card.card_id}`);
    }
  };

  const handleAIDraft = () => {
    navigate(`/teams/${id}/practice/new?ai=true`);
  };

  const handleToggleGameDay = () => {
    setShowGameDayModal(true);
  };

  const handleConnectSchedule = () => {
    navigate(`/teams/${id}/settings`);
  };

  const handleViewProgress = () => {
    navigate(`/teams/${id}/progress`);
  };

  const palette = dashboard?.team?.palette_id
    ? teamPalettes.find((p) => p.id === dashboard.team.palette_id)
    : null;

  const scheduleConnected = dashboard?.upcoming && dashboard.upcoming.length > 0 || 
    dashboard?.onboarding?.checklist?.find(i => i.id === 'connect_schedule')?.done;

  if (isLoading || authLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
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
        {/* Team Header with Branding */}
        <AppCard
          className="relative overflow-hidden py-4"
          style={{
            background: palette
              ? `linear-gradient(135deg, hsl(${palette.primary} / 0.15), hsl(${palette.tertiary} / 0.05))`
              : undefined,
          }}
        >
          <div className="flex items-center gap-4">
            <Avatar
              src={dashboard.team.logo_url || dashboard.team.photo_url}
              fallback={dashboard.team.name}
              size="lg"
            />
            <div className="flex-1">
              <h2 className="text-lg font-bold">{dashboard.team.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Tag variant="accent" size="sm">
                  <Shield className="w-3 h-3" />
                  Coach
                </Tag>
                {dashboard.team.season_label && (
                  <span className="text-xs text-text-muted">
                    {dashboard.team.season_label}
                  </span>
                )}
              </div>
            </div>
          </div>
        </AppCard>

        {/* Setup Checklist - only show if not all complete */}
        <SetupChecklist
          items={dashboard.onboarding.checklist}
          onAction={handleChecklistAction}
        />

        {/* Today Control Center */}
        <TodayControlCenter
          date={dashboard.today.date}
          mode={dashboard.today.mode}
          gameDay={dashboard.today.game_day}
          practiceCard={dashboard.today.practice_card}
          scheduleConnected={!!scheduleConnected}
          onCreateCard={handleCreateCard}
          onPublishCard={handlePublishCard}
          onViewCard={handleViewCard}
          onAIDraft={handleAIDraft}
          onToggleGameDay={handleToggleGameDay}
        />

        {/* Quick Actions */}
        <QuickActions
          onInviteParents={() => setShowInviteModal(true)}
          onCreateWeekPlan={() => navigate(`/teams/${id}/builder`)}
          onViewRoster={() => navigate(`/teams/${id}/roster`)}
        />

        {/* Team Pulse */}
        <TeamPulse
          playersCount={dashboard.pulse.players_count}
          activeToday={dashboard.pulse.active_today_count}
          sessionsComplete={dashboard.pulse.sessions_complete_today}
          totalShots={dashboard.pulse.total_shots_today}
          onViewDetails={handleViewProgress}
        />

        {/* Upcoming Events */}
        <UpcomingEvents
          events={dashboard.upcoming}
          scheduleConnected={!!scheduleConnected}
          onConnectSchedule={handleConnectSchedule}
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
