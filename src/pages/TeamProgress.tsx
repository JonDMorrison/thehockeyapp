import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Avatar } from "@/components/app/Avatar";
import { Tag } from "@/components/app/Tag";
import { ProgressBar } from "@/components/app/ProgressBar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeeklyHeatmap } from "@/components/dashboard/WeeklyHeatmap";
import {
  ChevronLeft,
  ChevronRight,
  Trophy,
  Users,
  Target,
  TrendingUp,
  Award,
  Calendar,
  Flame,
  CheckCircle,
  Medal,
  Star,
  Zap,
  BarChart3,
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";

interface PlayerStats {
  playerId: string;
  firstName: string;
  lastInitial: string | null;
  jerseyNumber: string | null;
  profilePhotoUrl: string | null;
  totalSessions: number;
  totalBadges: number;
  thisWeekSessions: number;
  streak: number;
  lastActive: string | null;
  badges: Array<{ name: string; icon: string; awardedAt: string }>;
}

interface CompletionData {
  player_id: string;
  completed_at: string;
  practice_card_id: string;
}

const getBadgeIcon = (iconName: string) => {
  const icons: Record<string, React.ElementType> = {
    target: Target,
    flame: Flame,
    trophy: Trophy,
    medal: Medal,
    "check-circle": CheckCircle,
    calendar: Calendar,
    star: Star,
    award: Award,
    zap: Zap,
    shield: Target,
  };
  return icons[iconName] || Award;
};

const TeamProgress: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);
  const [activeTab, setActiveTab] = useState("leaderboard");

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

  // Fetch team memberships with player data
  const { data: memberships } = useQuery({
    queryKey: ["team-memberships-full", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select(`
          player_id,
          players (
            id,
            first_name,
            last_initial,
            jersey_number,
            profile_photo_url
          )
        `)
        .eq("team_id", id)
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  const playerIds = memberships?.map((m) => m.player_id) || [];

  // Fetch all session completions for team
  const { data: completions } = useQuery({
    queryKey: ["team-completions", id],
    queryFn: async () => {
      const { data: cards } = await supabase
        .from("practice_cards")
        .select("id")
        .eq("team_id", id!);

      if (!cards || cards.length === 0) return [];

      const cardIds = cards.map((c) => c.id);

      const { data, error } = await supabase
        .from("session_completions")
        .select("player_id, completed_at, practice_card_id")
        .in("practice_card_id", cardIds)
        .eq("status", "complete");

      if (error) throw error;
      return data as CompletionData[];
    },
    enabled: !!user && !!id,
  });

  // Fetch badges for all team players
  const { data: allBadges } = useQuery({
    queryKey: ["team-all-badges", id, playerIds],
    queryFn: async () => {
      if (playerIds.length === 0) return [];

      const { data, error } = await supabase
        .from("player_badges")
        .select(`
          player_id,
          awarded_at,
          challenges (
            name,
            badge_icon
          )
        `)
        .in("player_id", playerIds);

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id && playerIds.length > 0,
  });

  // Calculate player stats
  const playerStats: PlayerStats[] = React.useMemo(() => {
    if (!memberships || !completions) return [];

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    return memberships.map((m) => {
      const player = m.players as any;
      if (!player) return null;

      const playerCompletions = completions.filter((c) => c.player_id === m.player_id);
      const playerBadges = allBadges?.filter((b) => b.player_id === m.player_id) || [];

      // This week sessions
      const thisWeekSessions = playerCompletions.filter((c) => {
        if (!c.completed_at) return false;
        const date = parseISO(c.completed_at);
        return isWithinInterval(date, { start: weekStart, end: weekEnd });
      }).length;

      // Calculate streak (consecutive days with completions, looking back)
      let streak = 0;
      const sortedDates = [...new Set(
        playerCompletions
          .filter((c) => c.completed_at)
          .map((c) => format(parseISO(c.completed_at!), "yyyy-MM-dd"))
      )].sort().reverse();

      if (sortedDates.length > 0) {
        let checkDate = format(now, "yyyy-MM-dd");
        // If no completion today, start from yesterday
        if (!sortedDates.includes(checkDate)) {
          checkDate = format(subDays(now, 1), "yyyy-MM-dd");
        }
        
        for (let i = 0; i < 30; i++) {
          const dateToCheck = format(subDays(now, i), "yyyy-MM-dd");
          if (sortedDates.includes(dateToCheck)) {
            streak++;
          } else if (i > 0) {
            break;
          }
        }
      }

      // Last active
      const lastActive = sortedDates[0] || null;

      return {
        playerId: player.id,
        firstName: player.first_name,
        lastInitial: player.last_initial,
        jerseyNumber: player.jersey_number,
        profilePhotoUrl: player.profile_photo_url,
        totalSessions: playerCompletions.length,
        totalBadges: playerBadges.length,
        thisWeekSessions,
        streak,
        lastActive,
        badges: playerBadges.map((b: any) => ({
          name: b.challenges?.name || "Badge",
          icon: b.challenges?.badge_icon || "award",
          awardedAt: b.awarded_at,
        })),
      } as PlayerStats;
    }).filter(Boolean) as PlayerStats[];
  }, [memberships, completions, allBadges]);

  // Sort by different metrics
  const leaderboardBySession = [...playerStats].sort((a, b) => b.totalSessions - a.totalSessions);
  const leaderboardByBadges = [...playerStats].sort((a, b) => b.totalBadges - a.totalBadges);
  const leaderboardByStreak = [...playerStats].sort((a, b) => b.streak - a.streak);
  const leaderboardThisWeek = [...playerStats].sort((a, b) => b.thisWeekSessions - a.thisWeekSessions);

  // Aggregate stats
  const totalBadges = playerStats.reduce((sum, p) => sum + p.totalBadges, 0);
  const totalSessions = playerStats.reduce((sum, p) => sum + p.totalSessions, 0);
  const activeThisWeek = playerStats.filter((p) => p.thisWeekSessions > 0).length;
  const avgSessionsPerPlayer = playerStats.length > 0 ? (totalSessions / playerStats.length).toFixed(1) : "0";

  if (teamLoading || authLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <SkeletonCard />
          <SkeletonCard />
        </PageContainer>
      </AppShell>
    );
  }

  const renderPlayerRow = (player: PlayerStats, rank: number, metric: "sessions" | "badges" | "streak" | "week") => {
    const value = metric === "sessions" ? player.totalSessions
      : metric === "badges" ? player.totalBadges
      : metric === "streak" ? player.streak
      : player.thisWeekSessions;
    
    const maxValue = metric === "sessions" ? Math.max(...playerStats.map(p => p.totalSessions), 1)
      : metric === "badges" ? Math.max(...playerStats.map(p => p.totalBadges), 1)
      : metric === "streak" ? Math.max(...playerStats.map(p => p.streak), 1)
      : Math.max(...playerStats.map(p => p.thisWeekSessions), 1);

    return (
      <div
        key={player.playerId}
        className="flex items-center gap-3 p-3 rounded-xl bg-surface-card hover:bg-surface-muted/50 cursor-pointer transition-colors"
        onClick={() => setSelectedPlayer(player)}
      >
        <div className="w-6 text-center">
          {rank <= 3 ? (
            <span className={`text-lg ${rank === 1 ? "text-yellow-500" : rank === 2 ? "text-gray-400" : "text-amber-600"}`}>
              {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
            </span>
          ) : (
            <span className="text-sm text-text-muted font-medium">{rank}</span>
          )}
        </div>
        <Avatar
          src={player.profilePhotoUrl}
          fallback={`${player.firstName} ${player.lastInitial || ""}`}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {player.firstName} {player.lastInitial && `${player.lastInitial}.`}
          </p>
          <div className="mt-1">
            <ProgressBar value={value} max={maxValue} size="sm" />
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">{value}</p>
          <p className="text-xs text-text-muted">
            {metric === "sessions" ? "sessions" : metric === "badges" ? "badges" : metric === "streak" ? "day streak" : "this week"}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </div>
    );
  };

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
        {/* Summary Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <AppCard className="text-center">
            <div className="w-12 h-12 rounded-full bg-team-primary/10 flex items-center justify-center mx-auto mb-2">
              <Trophy className="w-6 h-6 text-team-primary" />
            </div>
            <p className="text-2xl font-bold">{totalBadges}</p>
            <p className="text-xs text-text-muted">Total Badges</p>
          </AppCard>

          <AppCard className="text-center">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-6 h-6 text-accent" />
            </div>
            <p className="text-2xl font-bold">{totalSessions}</p>
            <p className="text-xs text-text-muted">Sessions Done</p>
          </AppCard>

          <AppCard className="text-center">
            <div className="w-12 h-12 rounded-full bg-team-secondary/10 flex items-center justify-center mx-auto mb-2">
              <Flame className="w-6 h-6 text-team-secondary" />
            </div>
            <p className="text-2xl font-bold">{activeThisWeek}</p>
            <p className="text-xs text-text-muted">Active This Week</p>
          </AppCard>

          <AppCard className="text-center">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-6 h-6 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{avgSessionsPerPlayer}</p>
            <p className="text-xs text-text-muted">Avg per Player</p>
          </AppCard>
        </div>

        {/* Weekly Activity Heatmap */}
        <AppCard>
          <AppCardTitle className="text-base flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-team-primary" />
            Weekly Training Pattern
          </AppCardTitle>
          <AppCardDescription className="mb-4">
            See which days your team trains most
          </AppCardDescription>
          <WeeklyHeatmap completions={completions || []} />
        </AppCard>

        {/* Leaderboards */}
        <AppCard>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="leaderboard" className="text-xs px-2">All Time</TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-2">This Week</TabsTrigger>
              <TabsTrigger value="badges" className="text-xs px-2">Badges</TabsTrigger>
              <TabsTrigger value="streaks" className="text-xs px-2">Streaks</TabsTrigger>
            </TabsList>

            <TabsContent value="leaderboard" className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-team-primary" />
                <span className="font-medium text-sm">Most Sessions Completed</span>
              </div>
              {leaderboardBySession.slice(0, 10).map((player, idx) =>
                renderPlayerRow(player, idx + 1, "sessions")
              )}
              {leaderboardBySession.length === 0 && (
                <p className="text-center text-text-muted py-4">No activity yet</p>
              )}
            </TabsContent>

            <TabsContent value="week" className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-team-primary" />
                <span className="font-medium text-sm">This Week's Leaders</span>
              </div>
              {leaderboardThisWeek.filter(p => p.thisWeekSessions > 0).slice(0, 10).map((player, idx) =>
                renderPlayerRow(player, idx + 1, "week")
              )}
              {leaderboardThisWeek.filter(p => p.thisWeekSessions > 0).length === 0 && (
                <p className="text-center text-text-muted py-4">No completions this week yet</p>
              )}
            </TabsContent>

            <TabsContent value="badges" className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-team-primary" />
                <span className="font-medium text-sm">Most Badges Earned</span>
              </div>
              {leaderboardByBadges.filter(p => p.totalBadges > 0).slice(0, 10).map((player, idx) =>
                renderPlayerRow(player, idx + 1, "badges")
              )}
              {leaderboardByBadges.filter(p => p.totalBadges > 0).length === 0 && (
                <p className="text-center text-text-muted py-4">No badges earned yet</p>
              )}
            </TabsContent>

            <TabsContent value="streaks" className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-4 h-4 text-team-primary" />
                <span className="font-medium text-sm">Longest Streaks</span>
              </div>
              {leaderboardByStreak.filter(p => p.streak > 0).slice(0, 10).map((player, idx) =>
                renderPlayerRow(player, idx + 1, "streak")
              )}
              {leaderboardByStreak.filter(p => p.streak > 0).length === 0 && (
                <p className="text-center text-text-muted py-4">No active streaks</p>
              )}
            </TabsContent>
          </Tabs>
        </AppCard>

        {/* All Players Quick View */}
        <AppCard>
          <AppCardTitle className="text-base flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-team-primary" />
            All Players ({playerStats.length})
          </AppCardTitle>
          <AppCardDescription className="mb-4">
            Tap any player to see detailed stats
          </AppCardDescription>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {playerStats.map((player) => (
              <div
                key={player.playerId}
                className="text-center cursor-pointer group"
                onClick={() => setSelectedPlayer(player)}
              >
                <div className="relative">
                  <Avatar
                    src={player.profilePhotoUrl}
                    fallback={`${player.firstName} ${player.lastInitial || ""}`}
                    size="lg"
                    className="mx-auto group-hover:ring-2 ring-team-primary transition-all"
                  />
                  {player.streak >= 3 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                      <Flame className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-xs mt-1 font-medium truncate">{player.firstName}</p>
                <p className="text-xs text-text-muted">{player.totalSessions} done</p>
              </div>
            ))}
          </div>
        </AppCard>
      </PageContainer>

      {/* Player Detail Sheet */}
      <Sheet open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          {selectedPlayer && (
            <>
              <SheetHeader className="text-center pb-4">
                <Avatar
                  src={selectedPlayer.profilePhotoUrl}
                  fallback={`${selectedPlayer.firstName} ${selectedPlayer.lastInitial || ""}`}
                  size="xl"
                  className="mx-auto mb-2"
                />
                <SheetTitle>
                  {selectedPlayer.firstName} {selectedPlayer.lastInitial && `${selectedPlayer.lastInitial}.`}
                  {selectedPlayer.jerseyNumber && (
                    <span className="text-text-muted font-normal ml-2">#{selectedPlayer.jerseyNumber}</span>
                  )}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-4 overflow-y-auto pb-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-surface-muted rounded-xl">
                    <CheckCircle className="w-5 h-5 text-accent mx-auto mb-1" />
                    <p className="text-xl font-bold">{selectedPlayer.totalSessions}</p>
                    <p className="text-xs text-text-muted">Sessions</p>
                  </div>
                  <div className="text-center p-3 bg-surface-muted rounded-xl">
                    <Trophy className="w-5 h-5 text-team-primary mx-auto mb-1" />
                    <p className="text-xl font-bold">{selectedPlayer.totalBadges}</p>
                    <p className="text-xs text-text-muted">Badges</p>
                  </div>
                  <div className="text-center p-3 bg-surface-muted rounded-xl">
                    <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                    <p className="text-xl font-bold">{selectedPlayer.streak}</p>
                    <p className="text-xs text-text-muted">Day Streak</p>
                  </div>
                </div>

                {/* This Week */}
                <div className="p-4 bg-surface-muted rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-team-primary" />
                      This Week
                    </span>
                    <span className="font-bold">{selectedPlayer.thisWeekSessions} sessions</span>
                  </div>
                  <ProgressBar value={selectedPlayer.thisWeekSessions} max={7} />
                </div>

                {/* Last Active */}
                {selectedPlayer.lastActive && (
                  <div className="flex items-center justify-between p-3 bg-surface-muted rounded-xl">
                    <span className="text-sm text-text-muted">Last active</span>
                    <span className="font-medium">{format(parseISO(selectedPlayer.lastActive), "MMM d, yyyy")}</span>
                  </div>
                )}

                {/* Badges Earned */}
                {selectedPlayer.badges.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-team-primary" />
                      Badges Earned
                    </h4>
                    <div className="space-y-2">
                      {selectedPlayer.badges.map((badge, idx) => {
                        const IconComponent = getBadgeIcon(badge.icon);
                        return (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-surface-muted rounded-xl">
                            <div className="w-10 h-10 rounded-full bg-team-primary/10 flex items-center justify-center">
                              <IconComponent className="w-5 h-5 text-team-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{badge.name}</p>
                              <p className="text-xs text-text-muted">
                                Earned {format(parseISO(badge.awardedAt), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* View Full Profile */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedPlayer(null);
                    navigate(`/teams/${id}/roster/${selectedPlayer.playerId}`);
                  }}
                >
                  View Full Profile
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
};

export default TeamProgress;
