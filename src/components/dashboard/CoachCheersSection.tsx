import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppCard, AppCardTitle } from "@/components/app/AppCard";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/components/app/Toast";
import { Heart, Send, Sparkles, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CoachCheersSectionProps {
  teamId: string;
}

const QUICK_EMOJIS = ["🔥", "💪", "⭐", "🏒", "👏", "🎯", "💯", "🚀"];

export const CoachCheersSection: React.FC<CoachCheersSectionProps> = ({
  teamId,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Fetch roster for sending cheers
  const { data: roster } = useQuery({
    queryKey: ["team-roster-for-cheers", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select(`
          player_id,
          players (
            id,
            first_name,
            last_initial,
            profile_photo_url
          )
        `)
        .eq("team_id", teamId)
        .eq("status", "active");

      if (error) throw error;
      return data?.map((m) => ({
        playerId: m.player_id,
        firstName: m.players?.first_name || "Unknown",
        lastInitial: m.players?.last_initial || "",
        photoUrl: m.players?.profile_photo_url,
      })) || [];
    },
    enabled: !!teamId,
  });

  // Fetch recent cheers for display
  const { data: recentCheers } = useQuery({
    queryKey: ["team-cheers-coach", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_cheers")
        .select(`
          id,
          cheer_type,
          content,
          created_at,
          from_player:from_player_id(id, first_name, last_initial, profile_photo_url),
          to_player:to_player_id(id, first_name, last_initial)
        `)
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  // Get coach's own players to send cheers from
  const { data: coachPlayers } = useQuery({
    queryKey: ["coach-players-for-cheers", user?.id, teamId],
    queryFn: async () => {
      if (!user) return [];
      
      // Get players owned by this user that are on this team
      const { data, error } = await supabase
        .from("players")
        .select(`
          id,
          first_name,
          last_initial,
          team_memberships!inner(team_id, status)
        `)
        .eq("owner_user_id", user.id)
        .eq("team_memberships.team_id", teamId)
        .eq("team_memberships.status", "active");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!teamId,
  });

  const sendCheer = useMutation({
    mutationFn: async ({
      fromPlayerId,
      toPlayerId,
      content,
      type,
    }: {
      fromPlayerId: string;
      toPlayerId: string;
      content: string;
      type: "emoji" | "message";
    }) => {
      const { error } = await supabase.from("team_cheers").insert({
        team_id: teamId,
        from_player_id: fromPlayerId,
        to_player_id: toPlayerId,
        cheer_type: type,
        content,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cheer sent! 🎉");
      setIsOpen(false);
      setCustomMessage("");
      setSelectedPlayer(null);
      queryClient.invalidateQueries({ queryKey: ["team-cheers-coach"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to send", error.message);
    },
  });

  const handleSendCheer = (toPlayerId: string, content: string, type: "emoji" | "message") => {
    // Use the first coach player as the sender, or show an error
    const fromPlayer = coachPlayers?.[0];
    if (!fromPlayer) {
      toast.error("No player linked", "Add a player to your account to send cheers");
      return;
    }
    sendCheer.mutate({
      fromPlayerId: fromPlayer.id,
      toPlayerId,
      content,
      type,
    });
  };

  const selectedPlayerData = roster?.find((p) => p.playerId === selectedPlayer);

  return (
    <AppCard>
      <div className="flex items-center justify-between mb-3">
        <AppCardTitle className="flex items-center gap-2 text-sm">
          <Heart className="w-4 h-4 text-pink-500" />
          Team Cheers
        </AppCardTitle>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Send Cheer
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="end">
            {!selectedPlayer ? (
              <div className="space-y-2">
                <p className="text-sm font-medium mb-2">Send a cheer to:</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {roster?.map((player) => (
                    <Button
                      key={player.playerId}
                      variant="ghost"
                      className="w-full justify-start h-auto py-2"
                      onClick={() => setSelectedPlayer(player.playerId)}
                    >
                      <Avatar
                        src={player.photoUrl}
                        fallback={player.firstName}
                        size="sm"
                      />
                      <span className="ml-2 text-sm">
                        {player.firstName} {player.lastInitial}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPlayer(null)}
                    className="h-6 px-2 text-xs"
                  >
                    ← Back
                  </Button>
                  <span className="text-sm font-medium">
                    To: {selectedPlayerData?.firstName}
                  </span>
                </div>

                {/* Quick emoji buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_EMOJIS.map((emoji) => (
                    <Button
                      key={emoji}
                      variant="outline"
                      size="sm"
                      className="text-lg h-10 hover:scale-110 transition-transform"
                      onClick={() => handleSendCheer(selectedPlayer, emoji, "emoji")}
                      disabled={sendCheer.isPending}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>

                {/* Custom message */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Or type a message..."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value.slice(0, 100))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customMessage.trim()) {
                        handleSendCheer(selectedPlayer, customMessage.trim(), "message");
                      }
                    }}
                    className="text-sm"
                    maxLength={100}
                  />
                  <Button
                    size="icon-sm"
                    onClick={() => {
                      if (customMessage.trim()) {
                        handleSendCheer(selectedPlayer, customMessage.trim(), "message");
                      }
                    }}
                    disabled={!customMessage.trim() || sendCheer.isPending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Recent cheers feed */}
      {recentCheers && recentCheers.length > 0 ? (
        <div className="space-y-2">
          {recentCheers.map((cheer) => (
            <div
              key={cheer.id}
              className="flex items-start gap-2 p-2 rounded-lg bg-muted/30"
            >
              <Avatar
                src={(cheer.from_player as any)?.profile_photo_url}
                fallback={(cheer.from_player as any)?.first_name || "?"}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1 flex-wrap text-xs">
                  <span className="font-medium">
                    {(cheer.from_player as any)?.first_name}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">
                    {(cheer.to_player as any)?.first_name}
                  </span>
                </div>
                <div className="mt-0.5">
                  {cheer.cheer_type === "emoji" ? (
                    <span className="text-xl">{cheer.content}</span>
                  ) : (
                    <p className="text-xs text-muted-foreground italic truncate">
                      "{cheer.content}"
                    </p>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(cheer.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <MessageCircle className="w-8 h-8 text-text-muted mb-2" />
          <p className="text-text-muted text-sm">No cheers yet</p>
          <p className="text-text-muted text-xs mt-1">
            Send the first one to motivate your team!
          </p>
        </div>
      )}
    </AppCard>
  );
};
