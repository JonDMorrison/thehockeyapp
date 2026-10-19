import { DataLoadError } from "@/components/app/DataLoadError";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerPhotoConsent } from "@/hooks/usePlayerPhotoConsent";
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
  layer?: number;
}

export const PlayerSettingsSheet: React.FC<PlayerSettingsSheetProps> = ({
  open,
  onOpenChange,
  playerId,
  playerName,
  layer,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const photoConsent = usePlayerPhotoConsent(playerId, open);
  const canManageConsent = Boolean(photoConsent.data?.relationship_confirmed && !photoConsent.data.withdrawn_at);
  const updatePhotoConsent = useMutation({
    mutationFn: async (allowed: boolean) => {
      if (!canManageConsent || !user) throw new Error("A confirmed guardian must manage photo sharing.");
      const { error } = await supabase.from("player_consents").update({ photo_sharing_allowed: allowed }).eq("player_id", playerId).eq("guardian_user_id", user.id).select("id").single();
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["player-photo-consent", playerId] });
      void queryClient.invalidateQueries({ queryKey: ["session-photos"] });
      toast.success("Photo sharing updated");
    },
    onError: (error: Error) => toast.error("Could not update photo sharing", error.message),
  });
  const updateAiConsent = useMutation({
    mutationFn: async (allowed: boolean) => {
      if (!canManageConsent || !user) throw new Error("A confirmed guardian must manage AI personalization.");
      const { error } = await supabase.from("player_consents").update({ ai_personalization_allowed: allowed }).eq("player_id", playerId).eq("guardian_user_id", user.id).select("id").single();
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["player-photo-consent", playerId] });
      toast.success("AI personalization updated");
    },
    onError: (error: Error) => toast.error("Could not update AI personalization", error.message),
  });
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
      <SheetContent layer={layer} side="bottom" className="h-auto max-h-[90dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Player Settings</SheetTitle>
          <SheetDescription>
            Privacy and challenge settings for {playerName}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          <section className="space-y-3">
            <h3 className="font-semibold">Training photos</h3>
            {photoConsent.isError ? <DataLoadError title="Couldn’t load photo permissions" onRetry={() => photoConsent.refetch()} retrying={photoConsent.isFetching} /> : (
              <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface-muted p-4">
                <div className="space-y-1">
                  <Label htmlFor="coach-photo-consent">Allow coach photo sharing</Label>
                  <p className="text-xs leading-5 text-muted-foreground">Coaches can see photos your family marks as shared. Turning this off hides the training photos you have shared from staff. Family-only photos stay private.</p>
                  {!canManageConsent && !photoConsent.isLoading && <p className="text-xs text-muted-foreground">A confirmed guardian manages this permission.</p>}
                </div>
                <Switch id="coach-photo-consent" checked={photoConsent.data?.photo_sharing_allowed ?? false} onCheckedChange={allowed => updatePhotoConsent.mutate(allowed)} disabled={photoConsent.isLoading || updatePhotoConsent.isPending || !canManageConsent} />
              </div>
            )}
          </section>
          <section className="space-y-3">
            <h3 className="font-semibold">Optional AI personalization</h3>
            {photoConsent.isError ? <p className="text-sm text-muted-foreground">Retry permissions above to manage this setting.</p> : (
              <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface-muted p-4">
                <div className="space-y-1">
                  <Label htmlFor="ai-training-consent">Allow AI training summaries</Label>
                  <p className="text-xs leading-5 text-muted-foreground">Allow training totals and focus areas to personalize summaries. Player names are excluded. When off, you still receive a factual summary and can use the core training tools.</p>
                </div>
                <Switch id="ai-training-consent" checked={photoConsent.data?.ai_personalization_allowed ?? false} onCheckedChange={allowed => updateAiConsent.mutate(allowed)} disabled={photoConsent.isLoading || updateAiConsent.isPending || !canManageConsent} />
              </div>
            )}
          </section>
          {/* National Challenges */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
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
