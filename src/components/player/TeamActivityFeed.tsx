import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppCard, AppCardTitle } from "@/components/app/AppCard";
import { Avatar } from "@/components/app/Avatar";
import { SkeletonActivityFeed } from "@/components/app/Skeleton";
import { format } from "date-fns";
import { CheckCircle, Flame, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TeamActivityFeedProps {
  teamId: string;
  currentPlayerId: string;
}

interface ActivityItem {
  playerId: string;
  playerName: string;
  playerPhoto: string | null;
  completedAt: string;
  isCurrentPlayer: boolean;
}

export const TeamActivityFeed: React.FC<TeamActivityFeedProps> = ({
  teamId,
  currentPlayerId,
}) => {
  const { t } = useTranslation();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const { data: activities, isLoading } = useQuery({
    queryKey: ["team-activity-feed", teamId, todayStr],
    queryFn: async () => {
      // Get today's practice card
      const { data: card } = await supabase
        .from("practice_cards")
        .select("id")
        .eq("team_id", teamId)
        .eq("date", todayStr)
        .not("published_at", "is", null)
        .maybeSingle();

      if (!card) return [];

      // Get all completed sessions for today's card
      const { data: completions, error } = await supabase
        .from("session_completions")
        .select(`
          player_id,
          completed_at,
          players (
            id,
            first_name,
            last_initial,
            profile_photo_url
          )
        `)
        .eq("practice_card_id", card.id)
        .eq("status", "complete")
        .order("completed_at", { ascending: false });

      if (error) throw error;

      return (completions || []).map((c) => ({
        playerId: c.player_id,
        playerName: `${c.players?.first_name || "Unknown"} ${c.players?.last_initial || ""}`.trim(),
        playerPhoto: c.players?.profile_photo_url || null,
        completedAt: c.completed_at || "",
        isCurrentPlayer: c.player_id === currentPlayerId,
      })) as ActivityItem[];
    },
    enabled: !!teamId,
    staleTime: 30000,
  });

  // Get roster count for comparison
  const { data: rosterCount } = useQuery({
    queryKey: ["team-roster-count", teamId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("team_memberships")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("status", "active");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!teamId,
  });

  if (isLoading) {
    return <SkeletonActivityFeed />;
  }

  const completedCount = activities?.length || 0;
  const totalPlayers = rosterCount || 0;

  return (
    <AppCard>
      <div className="flex items-center justify-between mb-3">
        <AppCardTitle className="flex items-center gap-2 text-sm">
          <Activity className="w-4 h-4 text-team-primary" />
          {t("players.teamActivityFeed.title")}
        </AppCardTitle>
        {totalPlayers > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalPlayers} {t("players.teamActivityFeed.done")}
          </span>
        )}
      </div>

      {completedCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("players.teamActivityFeed.noTeammatesYet")}
        </p>
      ) : (
        <div className="space-y-3">
          {/* Completed players avatars */}
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {activities?.slice(0, 8).map((activity, i) => (
                <div
                  key={activity.playerId}
                  className={`relative ${activity.isCurrentPlayer ? "ring-2 ring-team-primary ring-offset-2 rounded-full" : ""}`}
                  style={{ zIndex: 10 - i }}
                >
                  <Avatar
                    src={activity.playerPhoto}
                    fallback={activity.playerName}
                    size="sm"
                    className="border-2 border-background"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full flex items-center justify-center border-2 border-background">
                    <CheckCircle className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
              ))}
              {completedCount > 8 && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                  +{completedCount - 8}
                </div>
              )}
            </div>
          </div>

          {/* Recent activity list */}
          <div className="space-y-2">
            {activities?.slice(0, 3).map((activity) => (
              <div
                key={activity.playerId}
                className={`flex items-center gap-2 text-sm ${
                  activity.isCurrentPlayer ? "text-team-primary font-medium" : "text-muted-foreground"
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5 text-success" />
                <span>
                  {activity.isCurrentPlayer ? t("common.you") : activity.playerName}
                </span>
                <span className="text-xs opacity-70">
                  {activity.completedAt
                    ? format(new Date(activity.completedAt), "h:mm a")
                    : ""}
                </span>
              </div>
            ))}
          </div>

          {/* Encouragement message */}
          {completedCount >= 3 && (
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">
                {t("players.teamActivityFeed.teamOnFire")}
              </span>
            </div>
          )}
        </div>
      )}
    </AppCard>
  );
};
