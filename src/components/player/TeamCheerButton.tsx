import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/app/Toast";
import { Heart, Send } from "lucide-react";

interface TeamCheerButtonProps {
  fromPlayerId: string;
  toPlayerId: string;
  toPlayerName: string;
  teamId: string;
  variant?: "icon" | "full";
}

const QUICK_EMOJIS = ["🔥", "💪", "⭐", "🏒", "👏", "🎯", "🙌", "💯"];

export const TeamCheerButton: React.FC<TeamCheerButtonProps> = ({
  fromPlayerId,
  toPlayerId,
  toPlayerName,
  teamId,
  variant = "icon",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const queryClient = useQueryClient();

  const sendCheer = useMutation({
    mutationFn: async ({ content, type }: { content: string; type: "emoji" | "message" }) => {
      const { error } = await supabase.from("team_cheers").insert({
        team_id: teamId,
        from_player_id: fromPlayerId,
        to_player_id: toPlayerId,
        cheer_type: type,
        content,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(
        "Cheer sent! 🎉",
        `${toPlayerName} will see your encouragement!`
      );
      setIsOpen(false);
      setCustomMessage("");
      queryClient.invalidateQueries({ queryKey: ["team-cheers"] });
      queryClient.invalidateQueries({ queryKey: ["received-cheers"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to send", error.message);
    },
  });

  const handleEmojiClick = (emoji: string) => {
    sendCheer.mutate({ content: emoji, type: "emoji" });
  };

  const handleSendMessage = () => {
    if (customMessage.trim()) {
      sendCheer.mutate({ content: customMessage.trim(), type: "message" });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {variant === "icon" ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-pink-500 hover:text-pink-600 hover:bg-pink-500/10"
          >
            <Heart className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="text-pink-500 border-pink-500/30 hover:bg-pink-500/10"
          >
            <Heart className="w-4 h-4 mr-1" />
            Cheer
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-3">
          <p className="text-sm font-medium text-center">
            Send a cheer to {toPlayerName}!
          </p>
          
          {/* Quick emoji buttons */}
          <div className="grid grid-cols-4 gap-2">
            {QUICK_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                variant="outline"
                size="sm"
                className="text-lg h-10 hover:scale-110 transition-transform"
                onClick={() => handleEmojiClick(emoji)}
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
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="text-sm"
              maxLength={100}
            />
            <Button
              size="icon-sm"
              onClick={handleSendMessage}
              disabled={!customMessage.trim() || sendCheer.isPending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            {100 - customMessage.length} characters left
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
