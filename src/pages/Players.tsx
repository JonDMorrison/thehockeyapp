import { DataLoadError } from "@/components/app/DataLoadError";
import React, { useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { teamPalettes } from "@/lib/themes";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonTeamCard } from "@/components/app/Skeleton";
import { PullToRefresh } from "@/components/app/PullToRefresh";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ChevronRight,
  UserPlus,
  Sparkles,
  Dumbbell,
  Target,
} from "lucide-react";

interface PlayerPreferences {
  active_team_id: string | null;
}

interface ActiveTeam {
  id: string;
  name: string;
  palette_id: string;
}

const Players: React.FC = () => {
  const { t } = useTranslation();
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
    await queryClient.invalidateQueries({
      queryKey: ["players-with-teams", user?.id],
    });
  }, [queryClient, user?.id]);

  const {
    data: players,
    isLoading,
    isFetched,
    isError,
    refetch,
    isFetching,
  } = useQuery({
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
      const { data: preferencesData, error: preferencesError } = await supabase
        .from("player_team_preferences")
        .select("player_id, active_team_id")
        .in("player_id", playerIds);

      if (preferencesError) throw preferencesError;

      // Fetch active teams
      const activeTeamIds =
        preferencesData
          ?.filter((p) => p.active_team_id)
          .map((p) => p.active_team_id) || [];

      let teamsData: ActiveTeam[] = [];
      if (activeTeamIds.length > 0) {
        const { data, error: teamsError } = await supabase
          .from("teams")
          .select("id, name, palette_id")
          .in("id", activeTeamIds);
        if (teamsError) throw teamsError;
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

  useEffect(() => {
    if (!isError && isFetched && players?.length === 1) {
      navigate(`/players/${players[0].id}/home`, { replace: true });
    }
  }, [isError, isFetched, players, navigate]);

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

  return (
    <AppShell
      header={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <PageHeader
            title={t("players.list.title")}
            subtitle={t("players.list.subtitle")}
          />
          <div className="flex items-center gap-2">
            <Button
              variant="team"
              size="sm"
              onClick={() => navigate("/players/new")}
            >
              <Plus className="w-4 h-4" />
              {t("players.list.addButton")}
            </Button>
          </div>
        </div>
      }
    >
      <PullToRefresh onRefresh={handleRefresh} isRefreshing={isLoading}>
        <PageContainer>
          {isError ? (
            <DataLoadError
              title="Couldn’t load your players"
              onRetry={() => refetch()}
              retrying={isFetching}
            />
          ) : isLoading ? (
            <div className="space-y-3">
              <SkeletonTeamCard />
              <SkeletonTeamCard />
            </div>
          ) : players && players.length > 0 ? (
            <div className="space-y-5">
              <section className="rounded-2xl border border-border bg-card p-5">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Your hockey family
                </p>
                <h1 className="mt-3 font-display text-2xl font-bold">
                  Small wins, one player at a time.
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Pick a player to find today’s workout, log shots, and
                  celebrate their progress.
                </p>
              </section>
              <div className="grid gap-3 sm:grid-cols-2">
                {players.map((player) => {
                  const isOwner = player.player_guardians?.some(
                    (pg: { guardian_role: string }) =>
                      pg.guardian_role === "owner",
                  );
                  const activeTeam = player.activeTeam as ActiveTeam | null;
                  const palette = activeTeam?.palette_id
                    ? teamPalettes.find((p) => p.id === activeTeam.palette_id)
                    : null;

                  return (
                    <Link
                      key={player.id}
                      to={`/players/${player.id}/home`}
                      className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <AppCard className="h-full rounded-2xl transition-colors hover:border-primary/40">
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
                                style={{
                                  backgroundColor: `hsl(${palette.primary})`,
                                }}
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold">
                              {player.first_name}{" "}
                              {player.last_initial && `${player.last_initial}.`}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {activeTeam ? (
                                <Tag variant="accent" size="sm">
                                  {activeTeam.name}
                                </Tag>
                              ) : (
                                <Tag variant="neutral" size="sm">
                                  {t("teams.addChild.bornYear", {
                                    year: player.birth_year,
                                  })}
                                </Tag>
                              )}
                              {player.jersey_number && (
                                <Tag variant="tier" size="sm">
                                  #{player.jersey_number}
                                </Tag>
                              )}
                              {!isOwner && (
                                <Tag variant="neutral" size="sm">
                                  {t("players.list.guardianTag")}
                                </Tag>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-text-muted" />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Dumbbell className="h-3.5 w-3.5 text-primary" />
                            Today’s workout
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1.5">
                            <Target className="h-3.5 w-3.5 text-primary" />
                            Shooting challenges
                          </span>
                        </div>
                      </AppCard>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <AppCard>
              <EmptyState
                icon={UserPlus}
                title={t("players.list.emptyTitle")}
                description={t("players.list.emptyDescription")}
                action={{
                  label: t("players.list.emptyAction"),
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
