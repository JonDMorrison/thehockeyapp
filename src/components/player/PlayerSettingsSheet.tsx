import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/app/Toast";
import { Trophy, Info } from "lucide-react";

interface PlayerSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: string;
  playerName: string;
}

export const PlayerSettingsSheet: React.FC<PlayerSettingsSheetProps> = ({
  open,
  onOpenChange,
  playerId,
  playerName,
}) => {
  const queryClient = useQueryClient();
  const [challengesOptIn, setChallengesOptIn] = useState(false);

  // Fetch privacy settings
  const { data: privacySettings } = useQuery({
    queryKey: ["player-privacy-settings", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_privacy_settings")
        .select("*")
        .eq("player_id", playerId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!playerId && open,
  });

  // Fetch active team settings to check if challenges are enabled
  const { data: teamSettings } = useQuery({
    queryKey: ["player-team-settings", playerId],
    queryFn: async () => {
      // Get active team first
      const { data: pref } = await supabase
        .from("player_team_preferences")
        .select("active_team_id")
        .eq("player_id", playerId)
        .maybeSingle();

      if (!pref?.active_team_id) return null;

      const { data, error } = await supabase
        .from("team_settings")
        .select("*")
        .eq("team_id", pref.active_team_id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!playerId && open,
  });

  useEffect(() => {
    if (privacySettings) {
      setChallengesOptIn(privacySettings.national_challenges_opt_in || false);
    }
  }, [privacySettings]);

  const updateSettings = useMutation({
    mutationFn: async (optIn: boolean) => {
      const { error } = await supabase
        .from("player_privacy_settings")
        .upsert({
          player_id: playerId,
          national_challenges_opt_in: optIn,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: (_, optIn) => {
      queryClient.invalidateQueries({ queryKey: ["player-privacy-settings", playerId] });
      toast.success(
        optIn ? "Opted in to challenges" : "Opted out of challenges",
        optIn ? "You can now participate in national challenges." : "Challenge participation disabled."
      );
    },
    onError: (error: Error) => {
      toast.error("Failed to update", error.message);
      // Revert local state
      setChallengesOptIn(!challengesOptIn);
    },
  });

  const handleToggle = (value: boolean) => {
    setChallengesOptIn(value);
    updateSettings.mutate(value);
  };

  const teamHasChallenges = teamSettings?.challenges_enabled ?? false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader>
          <SheetTitle>Player Settings</SheetTitle>
          <SheetDescription>
            Privacy and challenge settings for {playerName}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* National Challenges */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-team-primary" />
              <Label className="text-base font-semibold">National Challenges</Label>
            </div>

            <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-surface-muted">
              <div className="space-y-1 flex-1">
                <Label htmlFor="challenges" className="font-medium">
                  Opt in to challenges
                </Label>
                <p className="text-sm text-text-muted">
                  Participate in standards-based challenges. No public profiles, no rankings.
                </p>
              </div>
              <Switch
                id="challenges"
                checked={challengesOptIn}
                onCheckedChange={handleToggle}
                disabled={updateSettings.isPending}
              />
            </div>

            {!teamHasChallenges && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning-muted/50 border border-warning/20">
                <Info className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                <p className="text-xs text-text-muted">
                  Your team hasn't enabled challenges yet. You can still opt in for future teams.
                </p>
              </div>
            )}

            <div className="space-y-2 text-sm text-text-muted">
              <p className="font-medium">What this means:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Earn badges by meeting standards (not rankings)</li>
                <li>No public profile or leaderboard visibility</li>
                <li>Your data stays private to you and your team</li>
                <li>You can opt out at any time</li>
              </ul>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
