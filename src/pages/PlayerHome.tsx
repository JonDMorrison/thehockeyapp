import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { teamPalettes } from "@/lib/themes";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/components/app/Toast";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  User,
  Check,
  Star,
  Trophy,
} from "lucide-react";
import { WeeklySummaryCard } from "@/components/summary/WeeklySummaryCard";

interface TeamMembership {
  id: string;
  team_id: string;
  status: string;
  joined_at: string;
  teams?: {
    id: string;
    name: string;
    season_label: string | null;
    team_photo_url: string | null;
    team_logo_url: string | null;
    palette_id: string;
  } | null;
}

const PlayerHome: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();

  const [showTeamSelector, setShowTeamSelector] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch player
  const { data: player, isLoading: playerLoading } = useQuery({
    queryKey: ["player", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Fetch player's team memberships
  const { data: memberships, isLoading: membershipsLoading } = useQuery({
    queryKey: ["player-memberships", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select(`
          id,
          team_id,
          status,
          joined_at,
          teams (
            id,
            name,
            season_label,
            team_photo_url,
            team_logo_url,
            palette_id
          )
        `)
        .eq("player_id", id)
        .eq("status", "active")
        .order("joined_at", { ascending: false });

      if (error) throw error;
      return data as TeamMembership[];
    },
    enabled: !!user && !!id,
  });

  // Fetch active team preference
  const { data: preferences } = useQuery({
    queryKey: ["player-preferences", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_team_preferences")
        .select("*")
        .eq("player_id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Apply active team theme
  useEffect(() => {
    if (preferences?.active_team_id && memberships) {
      const activeTeam = memberships.find(
        (m) => m.team_id === preferences.active_team_id
      )?.teams;
      if (activeTeam?.palette_id) {
        setTeamTheme(activeTeam.palette_id);
      }
    }
  }, [preferences, memberships, setTeamTheme]);

  // Update active team
  const updateActiveTeam = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase
        .from("player_team_preferences")
        .upsert({
          player_id: id,
          active_team_id: teamId,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-preferences", id] });
      toast.success("Active team updated", "Theme and workouts will reflect this team.");
      setShowTeamSelector(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to update", error.message);
    },
  });

  const activeTeam = memberships?.find(
    (m) => m.team_id === preferences?.active_team_id
  )?.teams;

  const isLoading = playerLoading || membershipsLoading || authLoading;

  if (isLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <SkeletonCard />
          <SkeletonCard />
        </PageContainer>
      </AppShell>
    );
  }

  if (!player) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <AppCard>
            <EmptyState
              icon={User}
              title="Player not found"
              description="This player doesn't exist or you don't have access."
              action={{
                label: "Go Back",
                onClick: () => navigate("/players"),
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
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate("/players")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Avatar
            src={player.profile_photo_url}
            fallback={`${player.first_name} ${player.last_initial || ""}`}
            size="sm"
          />
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">
              {player.first_name} {player.last_initial && `${player.last_initial}.`}
            </h1>
          </div>
        </div>
      }
    >
      <PageContainer>
        {/* Player Header */}
        <AppCard className="text-center">
          <Avatar
            src={player.profile_photo_url}
            fallback={`${player.first_name} ${player.last_initial || ""}`}
            size="xl"
            className="mx-auto mb-4"
          />
          <h2 className="text-xl font-bold">
            {player.first_name} {player.last_initial && `${player.last_initial}.`}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            <Tag variant="neutral">Born {player.birth_year}</Tag>
            {player.jersey_number && (
              <Tag variant="tier">#{player.jersey_number}</Tag>
            )}
          </div>
        </AppCard>

        {/* Active Team */}
        {memberships && memberships.length > 0 && (
          <AppCard
            className="cursor-pointer hover:shadow-medium transition-shadow"
            onClick={() => setShowTeamSelector(true)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-team-primary/10 flex items-center justify-center">
                  <Star className="w-5 h-5 text-team-primary" />
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase font-medium">
                    Active Team
                  </p>
                  <p className="font-semibold">
                    {activeTeam?.name || "Not set"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </div>
          </AppCard>
        )}

        {/* Weekly Summary */}
        {preferences?.active_team_id && (
          <WeeklySummaryCard 
            playerId={id!} 
            teamId={preferences.active_team_id} 
          />
        )}

        {/* Teams Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-secondary">Teams</h2>
            <Tag variant="neutral" size="sm">
              {memberships?.length || 0} team{(memberships?.length || 0) !== 1 ? "s" : ""}
            </Tag>
          </div>

          {memberships && memberships.length > 0 ? (
            <div className="space-y-3">
              {memberships.map((membership) => {
                const team = membership.teams;
                if (!team) return null;

                const palette = teamPalettes.find((p) => p.id === team.palette_id);
                const isActive = team.id === preferences?.active_team_id;

                return (
                  <AppCard
                    key={membership.id}
                    className="cursor-pointer hover:shadow-medium transition-shadow"
                    style={{
                      background: palette
                        ? `linear-gradient(135deg, hsl(${palette.primary} / 0.05), transparent)`
                        : undefined,
                    }}
                    onClick={() => navigate(`/teams/${team.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={team.team_logo_url || team.team_photo_url}
                        fallback={team.name}
                        size="lg"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{team.name}</p>
                          {isActive && (
                            <Tag variant="accent" size="sm">
                              Active
                            </Tag>
                          )}
                        </div>
                        {team.season_label && (
                          <p className="text-sm text-text-muted">
                            {team.season_label}
                          </p>
                        )}
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
                icon={Users}
                title="No teams yet"
                description="Ask your coach for an invite link to join a team."
              />
            </AppCard>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/players/${id}/badges`)}
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            <Trophy className="w-5 h-5 text-team-primary" />
            <span className="text-xs">Badges</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/players/${id}`)}
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            <User className="w-5 h-5 text-text-muted" />
            <span className="text-xs">Profile</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/players")}
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            <Users className="w-5 h-5 text-text-muted" />
            <span className="text-xs">Switch</span>
          </Button>
        </div>
      </PageContainer>

      {/* Team Selector Sheet */}
      <Sheet open={showTeamSelector} onOpenChange={setShowTeamSelector}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh]">
          <SheetHeader>
            <SheetTitle>Select Active Team</SheetTitle>
            <SheetDescription>
              Choose which team's workouts and schedule to show.
            </SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-3">
            {memberships?.map((membership) => {
              const team = membership.teams;
              if (!team) return null;

              const isActive = team.id === preferences?.active_team_id;
              const palette = teamPalettes.find((p) => p.id === team.palette_id);

              return (
                <AppCard
                  key={membership.id}
                  className={`cursor-pointer transition-all ${
                    isActive ? "ring-2 ring-team-primary ring-offset-2" : ""
                  }`}
                  onClick={() => updateActiveTeam.mutate(team.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={team.team_logo_url || team.team_photo_url}
                      fallback={team.name}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{team.name}</p>
                      {team.season_label && (
                        <p className="text-sm text-text-muted">
                          {team.season_label}
                        </p>
                      )}
                    </div>
                    {isActive && (
                      <div className="w-6 h-6 rounded-full bg-team-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </AppCard>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
};

export default PlayerHome;
