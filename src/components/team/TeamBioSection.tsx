import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/app/Toast";
import { FileText, Trophy, Loader2 } from "lucide-react";

interface TeamBioSectionProps {
  teamId: string;
  description: string | null;
  valuesText: string | null;
}

export const TeamBioSection: React.FC<TeamBioSectionProps> = ({
  teamId,
  description: initialDescription,
  valuesText: initialValuesText,
}) => {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState(initialDescription || "");
  const [valuesText, setValuesText] = useState(initialValuesText || "");

  useEffect(() => {
    setDescription(initialDescription || "");
    setValuesText(initialValuesText || "");
  }, [initialDescription, initialValuesText]);

  const updateBio = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("teams")
        .update({
          description: description || null,
          values_text: valuesText || null,
        })
        .eq("id", teamId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      toast.success("Saved", "Team bio updated.");
    },
    onError: (error: Error) => {
      toast.error("Failed to save", error.message);
    },
  });

  return (
    <AppCard>
      <AppCardTitle className="text-lg flex items-center gap-2 mb-1">
        <FileText className="w-4 h-4 text-team-primary" />
        Team Bio
      </AppCardTitle>
      <AppCardDescription className="mb-4">
        Tell parents about your team
      </AppCardDescription>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A few words about your team..."
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-text-muted text-right">
            {description.length}/500
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="values">Team Values</Label>
          <Textarea
            id="values"
            value={valuesText}
            onChange={(e) => setValuesText(e.target.value)}
            placeholder="Work hard, have fun, respect others..."
            rows={2}
            maxLength={200}
          />
          <p className="text-xs text-text-muted text-right">
            {valuesText.length}/200
          </p>
        </div>

        <Button
          variant="team"
          onClick={() => updateBio.mutate()}
          disabled={updateBio.isPending}
        >
          {updateBio.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Bio
        </Button>
      </div>
    </AppCard>
  );
};

interface TeamChallengesToggleProps {
  teamId: string;
}

export const TeamChallengesToggle: React.FC<TeamChallengesToggleProps> = ({
  teamId,
}) => {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(false);

  // Fetch team settings
  const { data: settings } = useQuery({
    queryKey: ["team-settings", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_settings")
        .select("*")
        .eq("team_id", teamId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  useEffect(() => {
    if (settings) {
      setEnabled(settings.challenges_enabled || false);
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: async (challengesEnabled: boolean) => {
      const { error } = await supabase
        .from("team_settings")
        .upsert({
          team_id: teamId,
          challenges_enabled: challengesEnabled,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: (_, challengesEnabled) => {
      queryClient.invalidateQueries({ queryKey: ["team-settings", teamId] });
      toast.success(
        challengesEnabled ? "Challenges enabled" : "Challenges disabled",
        challengesEnabled
          ? "Parents can now opt players into national challenges."
          : "Challenge participation is now disabled for this team."
      );
    },
    onError: (error: Error) => {
      toast.error("Failed to update", error.message);
      setEnabled(!enabled);
    },
  });

  const handleToggle = (value: boolean) => {
    setEnabled(value);
    updateSettings.mutate(value);
  };

  return (
    <AppCard>
      <AppCardTitle className="text-lg flex items-center gap-2 mb-1">
        <Trophy className="w-4 h-4 text-team-primary" />
        National Challenges
      </AppCardTitle>
      <AppCardDescription className="mb-4">
        Allow parents to opt in to challenges
      </AppCardDescription>

      <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-surface-muted">
        <div className="space-y-1 flex-1">
          <Label htmlFor="challenges-toggle" className="font-medium">
            Enable challenges
          </Label>
          <p className="text-sm text-text-muted">
            When enabled, parents can opt their players into standards-based national challenges.
            No public rankings or profiles.
          </p>
        </div>
        <Switch
          id="challenges-toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={updateSettings.isPending}
        />
      </div>
    </AppCard>
  );
};
