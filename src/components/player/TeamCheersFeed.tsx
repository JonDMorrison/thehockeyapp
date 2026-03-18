import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppCard, AppCardTitle } from "@/components/app/AppCard";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Heart, Sparkles, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TeamCheersFeedProps {
  teamId: string;
  currentPlayerId: string;
  onSendCheer?: () => void;
}

interface Cheer {
  id: string;
  fromPlayerId: string;
  fromPlayerName: string;
  fromPlayerPhoto: string | null;
  toPlayerId: string;
  toPlayerName: string;
  cheerType: "emoji" | "message";
  content: string;
  createdAt: string;
  isForCurrentPlayer: boolean;
  isFromCurrentPlayer: boolean;
}

export const TeamCheersFeed: React.FC<TeamCheersFeedProps> = ({
  teamId,
  currentPlayerId,
  onSendCheer,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: cheers, isLoading } = useQuery({
    queryKey: ["team-cheers", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_cheers")
        .select(`
          id,
          from_player_id,
          to_player_id,
          cheer_type,
          content,
          created_at,
          from_player:players!team_cheers_from_player_id_fkey (
            id,
            first_name,
            last_initial,
            profile_photo_url
          ),
          to_player:players!team_cheers_to_player_id_fkey (
            id,
            first_name,
            last_initial
          )
        `)
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      return (data || []).map((c) => ({
        id: c.id,
        fromPlayerId: c.from_player_id,
        fromPlayerName: `${c.from_player?.first_name || "Someone"} ${c.from_player?.last_initial || ""}`.trim(),
        fromPlayerPhoto: c.from_player?.profile_photo_url || null,
        toPlayerId: c.to_player_id,
        toPlayerName: `${c.to_player?.first_name || "Someone"} ${c.to_player?.last_initial || ""}`.trim(),
        cheerType: c.cheer_type as "emoji" | "message",
        content: c.content,
        createdAt: c.created_at,
        isForCurrentPlayer: c.to_player_id === currentPlayerId,
        isFromCurrentPlayer: c.from_player_id === currentPlayerId,
      })) as Cheer[];
    },
    enabled: !!teamId,
    staleTime: 30000,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`team-cheers-${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_cheers",
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["team-cheers", teamId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, queryClient]);

  if (isLoading) {
    return (
      <AppCard>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="space-y-2">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </div>
      </AppCard>
    );
  }

  if (!cheers || cheers.length === 0) {
    return (
      <AppCard>
        <AppCardTitle className="flex items-center gap-2 text-sm mb-3">
          <Heart className="w-4 h-4 text-pink-500" />
          {t("players.teamCheersFeed.title")}
        </AppCardTitle>
        <div className="text-center py-6">
          <Sparkles className="w-8 h-8 text-pink-500/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-4">
            {t("players.teamCheersFeed.noCheerYet")}
          </p>
          {onSendCheer && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSendCheer}
              className="text-pink-500 border-pink-500/30 hover:bg-pink-500/10"
            >
              <Users className="w-4 h-4 mr-2" />
              {t("players.teamCheersFeed.sendACheer")}
            </Button>
          )}
        </div>
      </AppCard>
    );
  }

  return (
    <AppCard>
      <AppCardTitle className="flex items-center gap-2 text-sm mb-3">
        <Heart className="w-4 h-4 text-pink-500" />
        {t("players.teamCheersFeed.title")}
      </AppCardTitle>

      <div className="space-y-3">
        {cheers.map((cheer) => (
          <div
            key={cheer.id}
            className={`flex items-start gap-3 p-2 rounded-lg ${
              cheer.isForCurrentPlayer
                ? "bg-pink-500/10 border border-pink-500/20"
                : "bg-muted/30"
            }`}
          >
            <Avatar
              src={cheer.fromPlayerPhoto}
              fallback={cheer.fromPlayerName}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="font-medium text-sm">
                  {cheer.isFromCurrentPlayer ? t("common.you") : cheer.fromPlayerName}
                </span>
                <span className="text-xs text-muted-foreground">→</span>
                <span className="font-medium text-sm">
                  {cheer.isForCurrentPlayer ? t("common.you") : cheer.toPlayerName}
                </span>
              </div>
              <div className="mt-1">
                {cheer.cheerType === "emoji" ? (
                  <span className="text-2xl">{cheer.content}</span>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    "{cheer.content}"
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(cheer.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </AppCard>
  );
};
