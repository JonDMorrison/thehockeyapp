import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Trophy,
  Users,
  Target,
  TrendingUp,
  Award,
} from "lucide-react";

const TeamProgress: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch team
  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["team", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, palette_id")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Apply theme
  useEffect(() => {
    if (team?.palette_id) {
      setTeamTheme(team.palette_id);
    }
  }, [team?.palette_id, setTeamTheme]);

  // Fetch team memberships to get player IDs
  const { data: memberships } = useQuery({
    queryKey: ["team-memberships", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select("player_id")
        .eq("team_id", id)
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  const playerIds = memberships?.map((m) => m.player_id) || [];

  // Fetch aggregate badge count
  const { data: badgeStats, isLoading: statsLoading } = useQuery({
    queryKey: ["team-badge-stats", id, playerIds],
    queryFn: async () => {
      if (playerIds.length === 0) {
        return { totalBadges: 0, playersWithBadges: 0, uniquePlayers: 0 };
      }

      // Get all badges for team players
      const { data: badges, error } = await supabase
        .from("player_badges")
        .select("player_id, challenge_id")
        .in("player_id", playerIds);

      if (error) throw error;

      const totalBadges = badges?.length || 0;
      const uniquePlayersWithBadges = new Set(badges?.map((b) => b.player_id) || []).size;

      return {
        totalBadges,
        playersWithBadges: uniquePlayersWithBadges,
        uniquePlayers: playerIds.length,
      };
    },
    enabled: !!user && !!id && playerIds.length > 0,
  });

  // Fetch progress stats
  const { data: progressStats } = useQuery({
    queryKey: ["team-progress-stats", id, playerIds],
    queryFn: async () => {
      if (playerIds.length === 0) {
        return { activeParticipants: 0, totalProgress: 0 };
      }

      const { data: progress, error } = await supabase
        .from("player_challenge_progress")
        .select("player_id, current_value")
        .in("player_id", playerIds);

      if (error) throw error;

      const activeParticipants = new Set(progress?.map((p) => p.player_id) || []).size;
      const totalProgress = progress?.reduce((sum, p) => sum + (p.current_value || 0), 0) || 0;

      return { activeParticipants, totalProgress };
    },
    enabled: !!user && !!id && playerIds.length > 0,
  });

  if (teamLoading || authLoading || statsLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <SkeletonCard />
          <SkeletonCard />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(`/teams/${id}`)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <PageHeader
            title="Team Progress"
            subtitle={team?.name}
          />
        </div>
      }
    >
      <PageContainer>
        {/* Summary Card */}
        <AppCard className="text-center">
          <div className="w-16 h-16 rounded-full bg-team-primary/10 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-8 h-8 text-team-primary" />
          </div>
          <h2 className="text-3xl font-bold">{badgeStats?.totalBadges || 0}</h2>
          <p className="text-text-muted">
            total badges earned by the team
          </p>
        </AppCard>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <AppCard>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{badgeStats?.playersWithBadges || 0}</p>
                <p className="text-xs text-text-muted">with badges</p>
              </div>
            </div>
          </AppCard>

          <AppCard>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-team-secondary/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-team-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{progressStats?.activeParticipants || 0}</p>
                <p className="text-xs text-text-muted">participating</p>
              </div>
            </div>
          </AppCard>
        </div>

        {/* Distribution Info */}
        <AppCard>
          <AppCardTitle className="text-base flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-team-primary" />
            Progress Overview
          </AppCardTitle>
          <AppCardDescription className="mb-4">
            Aggregate team statistics (no individual data shown)
          </AppCardDescription>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-muted">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-team-primary" />
                <span className="text-sm">Average badges per player</span>
              </div>
              <span className="font-semibold">
                {playerIds.length > 0
                  ? ((badgeStats?.totalBadges || 0) / playerIds.length).toFixed(1)
                  : "0"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-muted">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-team-primary" />
                <span className="text-sm">Participation rate</span>
              </div>
              <span className="font-semibold">
                {playerIds.length > 0
                  ? Math.round(
                      ((progressStats?.activeParticipants || 0) / playerIds.length) * 100
                    )
                  : 0}
                %
              </span>
            </div>
          </div>
        </AppCard>

        {/* Privacy Note */}
        <p className="text-xs text-text-muted text-center px-4">
          Player names and individual progress are not shown here.
          This view shows only aggregate team data.
        </p>
      </PageContainer>
    </AppShell>
  );
};

export default TeamProgress;
