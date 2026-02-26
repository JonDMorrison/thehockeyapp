import React, { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { teamPalettes } from "@/lib/themes";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonTeamCard } from "@/components/app/Skeleton";
import { ContextSwitcher } from "@/components/app/ContextSwitcher";
import { PullToRefresh } from "@/components/app/PullToRefresh";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, UserPlus } from "lucide-react";

interface PlayerPreferences {
  active_team_id: string | null;
}

interface ActiveTeam {
  id: string;
  name: string;
  palette_id: string;
}

const Players: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Check for pending join token after auth
  useEffect(() => {
    const pendingToken = sessionStorage.getItem("pendingJoinToken");
    if (pendingToken && isAuthenticated) {
      sessionStorage.removeItem("pendingJoinToken");
      navigate(`/join/${pendingToken}/player`);
    }
  }, [isAuthenticated, navigate]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["players-with-teams", user?.id] });
  }, [queryClient, user?.id]);

  const { data: players, isLoading, isFetched } = useQuery({
    queryKey: ["players-with-teams", user?.id],
    queryFn: async () => {
      // Fetch players
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("*, player_guardians!inner(guardian_role)")
        .order("created_at", { ascending: false });

      if (playersError) throw playersError;

      // Fetch preferences for all players
      const playerIds = playersData.map((p) => p.id);
      const { data: preferencesData } = await supabase
        .from("player_team_preferences")
        .select("player_id, active_team_id")
        .in("player_id", playerIds);

      // Fetch active teams
      const activeTeamIds = preferencesData
        ?.filter((p) => p.active_team_id)
        .map((p) => p.active_team_id) || [];
      
      let teamsData: ActiveTeam[] = [];
      if (activeTeamIds.length > 0) {
        const { data } = await supabase
          .from("teams")
          .select("id, name, palette_id")
          .in("id", activeTeamIds);
        teamsData = (data || []) as ActiveTeam[];
      }

      // Combine data
      return playersData.map((player) => {
        const pref = preferencesData?.find((p) => p.player_id === player.id);
        const activeTeam = pref?.active_team_id
          ? teamsData.find((t) => t.id === pref.active_team_id)
          : null;
        return { ...player, activeTeam };
      });
    },
    enabled: !!user,
  });

  // Show loading state while auth is checking
  if (authLoading) {
    return (
      <AppShell>
        <PageContainer>
          <SkeletonTeamCard />
          <SkeletonTeamCard />
        </PageContainer>
      </AppShell>
    );
  }

  // If not authenticated, render nothing while redirect happens
  if (!isAuthenticated) {
    return null;
  }

  // Smart redirect: if user has exactly one player, skip the list
  if (isFetched && players && players.length === 1) {
    navigate(`/players/${players[0].id}/home`, { replace: true });
    return null;
  }

  return (
    <AppShell
      header={
        <div className="flex items-center justify-between w-full">
          <PageHeader
            title="Players"
            subtitle="Manage your player profiles"
          />
          <div className="flex items-center gap-2">
            <ContextSwitcher />
            <Button
              variant="team"
              size="sm"
              onClick={() => navigate("/players/new")}
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </div>
      }
    >
      <PullToRefresh onRefresh={handleRefresh} isRefreshing={isLoading}>
        <PageContainer>
          {isLoading ? (
            <div className="space-y-3">
              <SkeletonTeamCard />
              <SkeletonTeamCard />
            </div>
          ) : players && players.length > 0 ? (
            <div className="space-y-3">
              {players.map((player) => {
                const isOwner = player.player_guardians?.some(
                  (pg: { guardian_role: string }) => pg.guardian_role === "owner"
                );
                const activeTeam = player.activeTeam as ActiveTeam | null;
                const palette = activeTeam?.palette_id
                  ? teamPalettes.find((p) => p.id === activeTeam.palette_id)
                  : null;

                return (
                  <AppCard
                    key={player.id}
                    className="cursor-pointer hover:shadow-medium transition-shadow"
                    onClick={() => navigate(`/players/${player.id}/home`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar
                          src={player.profile_photo_url}
                          fallback={`${player.first_name} ${player.last_initial || ""}`}
                          size="lg"
                        />
                        {palette && (
                          <div
                            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card"
                            style={{ backgroundColor: `hsl(${palette.primary})` }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">
                          {player.first_name} {player.last_initial && `${player.last_initial}.`}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {activeTeam ? (
                            <Tag variant="accent" size="sm">
                              {activeTeam.name}
                            </Tag>
                          ) : (
                            <Tag variant="neutral" size="sm">
                              Born {player.birth_year}
                            </Tag>
                          )}
                          {player.jersey_number && (
                            <Tag variant="tier" size="sm">
                              #{player.jersey_number}
                            </Tag>
                          )}
                          {!isOwner && (
                            <Tag variant="neutral" size="sm">
                              Guardian
                            </Tag>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-muted" />
                    </div>
                  </AppCard>
                );
              })}
            </div>
          ) : (
            <AppCard>
              <EmptyState
                icon={UserPlus}
                title="No players yet"
                description="Add your first player to start tracking their training and development."
                action={{
                  label: "Add Player",
                  onClick: () => navigate("/players/new"),
                }}
              />
            </AppCard>
          )}
        </PageContainer>
      </PullToRefresh>
    </AppShell>
  );
};

export default Players;
