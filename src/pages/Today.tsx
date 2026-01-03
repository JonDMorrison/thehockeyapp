import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { useOffline } from "@/hooks/useOffline";
import { teamPalettes } from "@/lib/themes";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { OfflineIndicator } from "@/components/app/OfflineIndicator";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { format } from "date-fns";
import {
  ChevronRight,
  Calendar,
  User,
  Users,
  Check,
  ClipboardList,
  Zap,
} from "lucide-react";

interface Player {
  id: string;
  first_name: string;
  last_initial: string | null;
  profile_photo_url: string | null;
  birth_year: number;
}

interface TeamPreference {
  active_team_id: string | null;
}

interface Team {
  id: string;
  name: string;
  season_label: string | null;
  team_photo_url: string | null;
  team_logo_url: string | null;
  palette_id: string;
}

interface PracticeCard {
  id: string;
  date: string;
  tier: string;
  title: string | null;
  mode: string;
  practice_tasks: { id: string }[];
}

interface GameDay {
  enabled: boolean;
}

const tierLabels: Record<string, string> = {
  rec: "Rec",
  rep: "Rep",
  elite: "Elite",
};

const Today: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();
  const { status: offlineStatus, pendingCount } = useOffline();
  
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch all players the user is guardian of
  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ["my-players"],
    queryFn: async () => {
      const { data: guardianships, error: guardError } = await supabase
        .from("player_guardians")
        .select("player_id")
        .eq("user_id", user!.id);

      if (guardError) throw guardError;

      const playerIds = guardianships.map((g) => g.player_id);
      if (playerIds.length === 0) return [];

      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("*")
        .in("id", playerIds);

      if (playersError) throw playersError;
      return playersData as Player[];
    },
    enabled: !!user,
  });

  // Select first player by default
  useEffect(() => {
    if (players && players.length > 0 && !selectedPlayerId) {
      setSelectedPlayerId(players[0].id);
    }
  }, [players, selectedPlayerId]);

  const selectedPlayer = players?.find((p) => p.id === selectedPlayerId);

  // Fetch player's team preference and team details
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ["player-active-team", selectedPlayerId],
    queryFn: async () => {
      // Get preference
      const { data: pref, error: prefError } = await supabase
        .from("player_team_preferences")
        .select("active_team_id")
        .eq("player_id", selectedPlayerId!)
        .maybeSingle();

      if (prefError) throw prefError;
      if (!pref?.active_team_id) return null;

      // Get team
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", pref.active_team_id)
        .single();

      if (teamError) throw teamError;
      return team as Team;
    },
    enabled: !!selectedPlayerId,
  });

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Check if game day is enabled
  const { data: gameDayData, isLoading: gameDayLoading } = useQuery({
    queryKey: ["team-game-day", teamData?.id, todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_game_days")
        .select("enabled")
        .eq("team_id", teamData!.id)
        .eq("date", todayStr)
        .maybeSingle();

      if (error) throw error;
      return data as GameDay | null;
    },
    enabled: !!teamData?.id,
  });

  const isGameDay = gameDayData?.enabled === true;

  // Fetch today's practice card for the team (prioritize game_day if enabled)
  const { data: todaysCard, isLoading: cardLoading } = useQuery({
    queryKey: ["todays-card", teamData?.id, todayStr, isGameDay],
    queryFn: async () => {
      // If game day is enabled, look for game_day card first
      if (isGameDay) {
        const { data: gameDayCard, error: gameDayError } = await supabase
          .from("practice_cards")
          .select(`
            id,
            date,
            tier,
            title,
            mode,
            practice_tasks (id)
          `)
          .eq("team_id", teamData!.id)
          .eq("date", todayStr)
          .eq("mode", "game_day")
          .not("published_at", "is", null)
          .maybeSingle();

        if (gameDayError) throw gameDayError;
        if (gameDayCard) return gameDayCard as PracticeCard;
      }

      // Otherwise, fall back to normal card
      const { data, error } = await supabase
        .from("practice_cards")
        .select(`
          id,
          date,
          tier,
          title,
          mode,
          practice_tasks (id)
        `)
        .eq("team_id", teamData!.id)
        .eq("date", todayStr)
        .eq("mode", "normal")
        .not("published_at", "is", null)
        .maybeSingle();

      if (error) throw error;
      return data as PracticeCard | null;
    },
    enabled: !!teamData?.id && gameDayLoading === false,
  });

  // Apply team theme
  useEffect(() => {
    if (teamData?.palette_id) {
      setTeamTheme(teamData.palette_id);
    }
  }, [teamData?.palette_id, setTeamTheme]);

  const isLoading = playersLoading || authLoading;
  const palette = teamData ? teamPalettes.find((p) => p.id === teamData.palette_id) : null;

  if (isLoading) {
    return (
      <AppShell>
        <PageContainer>
          <SkeletonCard />
          <SkeletonCard />
        </PageContainer>
      </AppShell>
    );
  }

  if (!players || players.length === 0) {
    return (
      <AppShell>
        <PageContainer>
          <PageHeader title="Today" subtitle={format(new Date(), "EEEE, MMMM d")} />
          <AppCard>
            <EmptyState
              icon={User}
              title="No players yet"
              description="Add a player to start tracking workouts."
              action={{
                label: "Add Player",
                onClick: () => navigate("/players/new"),
              }}
            />
          </AppCard>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageContainer>
        <div className="flex items-start justify-between">
          <PageHeader 
            title="Today" 
            subtitle={format(new Date(), "EEEE, MMMM d")} 
          />
          <OfflineIndicator status={offlineStatus} pendingCount={pendingCount} />
        </div>

        {/* Player Selector (if multiple) */}
        {players.length > 1 && (
          <AppCard
            className="cursor-pointer hover:shadow-medium transition-shadow"
            onClick={() => setShowPlayerSelector(true)}
          >
          <div className="flex items-center gap-3">
            <Avatar
              src={selectedPlayer?.profile_photo_url}
              fallback={`${selectedPlayer?.first_name} ${selectedPlayer?.last_initial || ""}`}
              size="lg"
            />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-muted uppercase font-medium">
                  Viewing as
                </p>
                <p className="font-semibold truncate">
                  {selectedPlayer?.first_name} {selectedPlayer?.last_initial && `${selectedPlayer.last_initial}.`}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </div>
          </AppCard>
        )}

        {/* Active Team */}
        {teamData ? (
          <AppCard
            style={{
              background: palette
                ? `linear-gradient(135deg, hsl(${palette.primary} / 0.08), hsl(${palette.tertiary} / 0.03))`
                : undefined,
            }}
          >
            <div className="flex items-center gap-3">
              <Avatar
                src={teamData.team_logo_url || teamData.team_photo_url}
                fallback={teamData.name}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-muted uppercase font-medium">
                  Active Team
                </p>
                <p className="font-semibold truncate">{teamData.name}</p>
                {teamData.season_label && (
                  <p className="text-sm text-text-muted">{teamData.season_label}</p>
                )}
              </div>
            </div>
          </AppCard>
        ) : teamLoading ? (
          <SkeletonCard />
        ) : (
          <AppCard>
            <EmptyState
              icon={Users}
              title="No active team"
              description="Join a team to see today's practice card."
              action={{
                label: "View Player",
                onClick: () => navigate(`/players/${selectedPlayerId}/home`),
              }}
            />
          </AppCard>
        )}

        {/* Today's Practice Card */}
        {teamData && (
          <>
            {cardLoading ? (
              <SkeletonCard />
            ) : todaysCard ? (
              <AppCard
                className="cursor-pointer hover:shadow-medium transition-shadow"
                onClick={() => navigate(`/players/${selectedPlayerId}/today`)}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex flex-col items-center justify-center"
                    style={{
                      background: palette ? `hsl(${palette.primary} / 0.1)` : undefined,
                    }}
                  >
                    {todaysCard.mode === "game_day" ? (
                      <Zap
                        className="w-6 h-6"
                        style={{ color: palette ? `hsl(${palette.primary})` : undefined }}
                      />
                    ) : (
                      <ClipboardList
                        className="w-6 h-6"
                        style={{ color: palette ? `hsl(${palette.primary})` : undefined }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">
                        {todaysCard.mode === "game_day" ? "Game Day Prep" : "Today's Practice"}
                      </p>
                      {todaysCard.mode === "game_day" ? (
                        <Tag variant="accent" size="sm">Game Day</Tag>
                      ) : (
                        <Tag variant="tier" size="sm">{tierLabels[todaysCard.tier]}</Tag>
                      )}
                    </div>
                    <p className="text-sm text-text-muted">
                      {todaysCard.title || `${todaysCard.practice_tasks.length} tasks ready`}
                    </p>
                  </div>
                  <Button size="sm">
                    Start
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </AppCard>
            ) : (
              <AppCard variant="muted">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-text-muted" />
                  </div>
                  <div>
                    <p className="font-semibold">No practice today</p>
                    <p className="text-sm text-text-muted">
                      Check back later or see past workouts.
                    </p>
                  </div>
                </div>
              </AppCard>
            )}
          </>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => navigate(`/players/${selectedPlayerId}/home`)}
          >
            <User className="w-5 h-5" />
            <span className="text-xs">Player Home</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex-col gap-2"
            onClick={() => navigate(`/players/${selectedPlayerId}/history`)}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-xs">History</span>
          </Button>
        </div>
      </PageContainer>

      {/* Player Selector Sheet */}
      <Sheet open={showPlayerSelector} onOpenChange={setShowPlayerSelector}>
        <SheetContent side="bottom" className="h-auto max-h-[60vh]">
          <SheetHeader>
            <SheetTitle>Select Player</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-3">
            {players.map((player) => {
              const isSelected = player.id === selectedPlayerId;
              return (
                <AppCard
                  key={player.id}
                  className={`cursor-pointer transition-all ${
                    isSelected ? "ring-2 ring-team-primary ring-offset-2" : ""
                  }`}
                  onClick={() => {
                    setSelectedPlayerId(player.id);
                    setShowPlayerSelector(false);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={player.profile_photo_url}
                      fallback={`${player.first_name} ${player.last_initial || ""}`}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {player.first_name} {player.last_initial && `${player.last_initial}.`}
                      </p>
                      <p className="text-sm text-text-muted">
                        Born {player.birth_year}
                      </p>
                    </div>
                    {isSelected && (
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

export default Today;
