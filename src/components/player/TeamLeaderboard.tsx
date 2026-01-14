import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppCard, AppCardTitle } from "@/components/app/AppCard";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/button";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { Trophy, Target, Medal, Crown, Flame } from "lucide-react";

interface TeamLeaderboardProps {
  teamId: string;
  currentPlayerId: string;
}

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  photoUrl: string | null;
  sessionsCompleted: number;
  totalShots: number;
  rank: number;
  isCurrentPlayer: boolean;
}

type LeaderboardType = "sessions" | "shots";

export const TeamLeaderboard: React.FC<TeamLeaderboardProps> = ({
  teamId,
  currentPlayerId,
}) => {
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>("sessions");

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["team-leaderboard", teamId, weekStart, leaderboardType],
    queryFn: async () => {
      // Get this week's practice cards
      const { data: cards } = await supabase
        .from("practice_cards")
        .select("id")
        .eq("team_id", teamId)
        .gte("date", weekStart)
        .lte("date", weekEnd)
        .not("published_at", "is", null);

      const cardIds = cards?.map((c) => c.id) || [];
      if (cardIds.length === 0) return [];

      // Get session completions for this week
      const { data: completions, error: compError } = await supabase
        .from("session_completions")
        .select(`
          player_id,
          players (
            id,
            first_name,
            last_initial,
            profile_photo_url
          )
        `)
        .in("practice_card_id", cardIds)
        .eq("status", "complete");

      if (compError) throw compError;

      // Get task completions for shots
      const { data: taskCompletions, error: taskError } = await supabase
        .from("task_completions")
        .select(`
          player_id,
          shots_logged,
          practice_tasks!inner (
            practice_card_id
          )
        `)
        .eq("completed", true);

      if (taskError) throw taskError;

      // Filter task completions to only include this week's cards
      const weekTaskCompletions = taskCompletions?.filter((tc) =>
        cardIds.includes(tc.practice_tasks?.practice_card_id)
      );

      // Aggregate by player
      const playerStats = new Map<string, {
        playerName: string;
        photoUrl: string | null;
        sessions: number;
        shots: number;
      }>();

      completions?.forEach((c) => {
        const existing = playerStats.get(c.player_id) || {
          playerName: `${c.players?.first_name || "Unknown"} ${c.players?.last_initial || ""}`.trim(),
          photoUrl: c.players?.profile_photo_url || null,
          sessions: 0,
          shots: 0,
        };
        existing.sessions += 1;
        playerStats.set(c.player_id, existing);
      });

      weekTaskCompletions?.forEach((tc) => {
        const existing = playerStats.get(tc.player_id);
        if (existing) {
          existing.shots += tc.shots_logged || 0;
        }
      });

      // Convert to array and sort
      const entries = Array.from(playerStats.entries()).map(([playerId, stats]) => ({
        playerId,
        playerName: stats.playerName,
        photoUrl: stats.photoUrl,
        sessionsCompleted: stats.sessions,
        totalShots: stats.shots,
        rank: 0,
        isCurrentPlayer: playerId === currentPlayerId,
      }));

      // Sort based on leaderboard type
      if (leaderboardType === "sessions") {
        entries.sort((a, b) => b.sessionsCompleted - a.sessionsCompleted);
      } else {
        entries.sort((a, b) => b.totalShots - a.totalShots);
      }

      // Assign ranks
      entries.forEach((entry, idx) => {
        entry.rank = idx + 1;
      });

      return entries as LeaderboardEntry[];
    },
    enabled: !!teamId,
    staleTime: 60000,
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-4 h-4 text-amber-500" />;
      case 2:
        return <Medal className="w-4 h-4 text-gray-400" />;
      case 3:
        return <Medal className="w-4 h-4 text-amber-700" />;
      default:
        return <span className="text-xs font-bold text-muted-foreground">{rank}</span>;
    }
  };

  if (isLoading) {
    return (
      <AppCard>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="space-y-2">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </div>
      </AppCard>
    );
  }

  const hasData = leaderboard && leaderboard.length > 0;
  const currentPlayerEntry = leaderboard?.find((e) => e.isCurrentPlayer);
  const topEntries = leaderboard?.slice(0, 5) || [];

  return (
    <AppCard>
      <div className="flex items-center justify-between mb-3">
        <AppCardTitle className="flex items-center gap-2 text-sm">
          <Trophy className="w-4 h-4 text-amber-500" />
          Weekly Leaderboard
        </AppCardTitle>
        <div className="flex gap-1">
          <Button
            variant={leaderboardType === "sessions" ? "default" : "ghost"}
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => setLeaderboardType("sessions")}
          >
            Sessions
          </Button>
          <Button
            variant={leaderboardType === "shots" ? "default" : "ghost"}
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => setLeaderboardType("shots")}
          >
            Shots
          </Button>
        </div>
      </div>

      {!hasData ? (
        <div className="text-center py-4">
          <Target className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No activity this week yet. Be the first!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {topEntries.map((entry) => (
            <div
              key={entry.playerId}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                entry.isCurrentPlayer
                  ? "bg-team-primary/10 ring-1 ring-team-primary/30"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                {getRankIcon(entry.rank)}
              </div>
              <Avatar
                src={entry.photoUrl}
                fallback={entry.playerName}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${entry.isCurrentPlayer ? "font-semibold" : ""}`}>
                  {entry.isCurrentPlayer ? "You" : entry.playerName}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">
                  {leaderboardType === "sessions"
                    ? entry.sessionsCompleted
                    : entry.totalShots.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {leaderboardType === "sessions" ? "sessions" : "shots"}
                </p>
              </div>
            </div>
          ))}

          {/* Show current player if not in top 5 */}
          {currentPlayerEntry && currentPlayerEntry.rank > 5 && (
            <>
              <div className="text-center text-xs text-muted-foreground py-1">
                • • •
              </div>
              <div
                className="flex items-center gap-3 p-2 rounded-lg bg-team-primary/10 ring-1 ring-team-primary/30"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <span className="text-xs font-bold text-muted-foreground">
                    {currentPlayerEntry.rank}
                  </span>
                </div>
                <Avatar
                  src={currentPlayerEntry.photoUrl}
                  fallback={currentPlayerEntry.playerName}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">You</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">
                    {leaderboardType === "sessions"
                      ? currentPlayerEntry.sessionsCompleted
                      : currentPlayerEntry.totalShots.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {leaderboardType === "sessions" ? "sessions" : "shots"}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Motivation message */}
          {currentPlayerEntry && currentPlayerEntry.rank > 1 && (
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">
                {currentPlayerEntry.rank === 2
                  ? "So close to #1! Keep pushing!"
                  : `${currentPlayerEntry.rank - 1} more ${leaderboardType === "sessions" ? "session" : "shots"} to move up!`}
              </span>
            </div>
          )}
        </div>
      )}
    </AppCard>
  );
};
