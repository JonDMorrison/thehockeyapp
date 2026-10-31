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
import { useTranslation } from "react-i18next";

interface TeamCheerButtonProps {
  fromPlayerId: string;
  toPlayerId: string;
  toPlayerName: string;
  teamId: string;
  variant?: "icon" | "full";
}

const QUICK_EMOJIS = ["👍", "💪", "⭐", "🏒", "👏", "🎯", "🙌", "💯"];

export const TeamCheerButton: React.FC<TeamCheerButtonProps> = ({
  fromPlayerId,
  toPlayerId,
  toPlayerName,
  teamId,
  variant = "icon",
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const queryClient = useQueryClient();

  const sendCheer = useMutation({
    mutationFn: async ({
      content,
      type,
    }: {
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
    onSuccess: (_, variables) => {
      toast.success(
        t("players.teamCheerButton.toast.cheerSent"),
        t("players.teamCheerButton.toast.willSeeEncouragement", {
          name: toPlayerName,
        }),
      );
      setIsOpen(false);
      setCustomMessage("");
      queryClient.invalidateQueries({ queryKey: ["team-cheers"] });
      queryClient.invalidateQueries({ queryKey: ["received-cheers"] });
    },
    onError: (error: Error) => {
      toast.error(
        t("players.teamCheerButton.toast.failedToSend"),
        error.message,
      );
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
            aria-label="Send a cheer"
            variant="ghost"
            size="icon-sm"
            className="text-primary hover:text-primary hover:bg-primary/10"
          >
            <Heart className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 rounded-xl border-primary bg-primary px-5 font-semibold text-white shadow-sm hover:bg-primary/90 hover:text-white"
          >
            <Heart className="w-4 h-4 mr-1" />
            {t("players.teamCheerButton.cheer")}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-80 max-w-[calc(100vw-2rem)] rounded-2xl border-border/80 bg-surface p-4 shadow-2xl"
        align="end"
      >
        <div className="space-y-3">
          <p className="text-sm font-semibold text-center">
            {t("players.teamCheerButton.sendCheerTo", { name: toPlayerName })}
          </p>

          {/* Quick emoji buttons */}
          <div className="grid grid-cols-4 gap-2">
            {QUICK_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                variant="outline"
                size="sm"
                className="h-12 rounded-xl border-border/70 bg-background/60 text-xl transition-colors hover:border-primary/50 hover:bg-primary/10"
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
              placeholder={t("players.teamCheerButton.orTypeMessage")}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value.slice(0, 100))}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="min-h-11 rounded-xl bg-background text-sm"
              maxLength={100}
            />
            <Button
              aria-label="Send message"
              size="icon-sm"
              onClick={handleSendMessage}
              disabled={!customMessage.trim() || sendCheer.isPending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {t("players.teamCheerButton.charactersLeft", {
              n: 100 - customMessage.length,
            })}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
