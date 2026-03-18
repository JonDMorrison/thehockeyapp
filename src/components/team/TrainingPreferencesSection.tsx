import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/app/Toast";
import { Loader2, Target, Scale, Rocket, Settings2, Check, Bot, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrainingPreferencesSectionProps {
  teamId: string;
}

type TrainingMode = "shooting_only" | "balanced" | "performance";
type TaskType = "shooting" | "mobility" | "conditioning" | "recovery" | "prep";
type TeamTier = "rec" | "rep" | "elite";

interface TrainingPreferences {
  team_id: string;
  training_mode: TrainingMode;
  allowed_task_types: TaskType[];
  default_tier: TeamTier;
  use_ai_assist: boolean;
}

export const TrainingPreferencesSection: React.FC<TrainingPreferencesSectionProps> = ({
  teamId,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const MODE_OPTIONS: { mode: TrainingMode; icon: React.ReactNode; label: string }[] = [
    { mode: "shooting_only", icon: <Target className="h-4 w-4" />, label: t("teams.trainingPrefs.modeShootingOnly") },
    { mode: "balanced", icon: <Scale className="h-4 w-4" />, label: t("teams.trainingPrefs.modeBalanced") },
    { mode: "performance", icon: <Rocket className="h-4 w-4" />, label: t("teams.trainingPrefs.modePerformance") },
  ];

  const TIER_OPTIONS: { tier: TeamTier; label: string }[] = [
    { tier: "rec", label: t("teams.practice.tierRec") },
    { tier: "rep", label: t("teams.practice.tierRep") },
    { tier: "elite", label: t("teams.practice.tierElite") },
  ];

  const TASK_TYPE_LABELS: Record<TaskType, string> = {
    shooting: t("teams.trainingPrefs.taskShooting"),
    mobility: t("teams.trainingPrefs.taskMobility"),
    conditioning: t("teams.trainingPrefs.taskConditioning"),
    recovery: t("teams.trainingPrefs.taskRecovery"),
    prep: t("teams.trainingPrefs.taskGamePrep"),
  };

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["team-preferences", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_training_preferences")
        .select("*")
        .eq("team_id", teamId)
        .maybeSingle();

      if (error) throw error;
      return data as TrainingPreferences | null;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<TrainingPreferences>) => {
      const { error } = await supabase
        .from("team_training_preferences")
        .upsert({
          team_id: teamId,
          ...updates,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-preferences", teamId] });
      toast.success(t("teams.trainingPrefs.toastUpdated"));
    },
    onError: () => {
      toast.error(t("teams.trainingPrefs.toastFailed"));
    },
  });

  if (isLoading) {
    return (
      <AppCard>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppCard>
    );
  }

  // Default values if no preferences exist
  const currentMode = preferences?.training_mode || "balanced";
  const currentTier = preferences?.default_tier || "rep";
  const currentTaskTypes = preferences?.allowed_task_types || ["shooting", "mobility", "prep"];
  const useAiAssist = preferences?.use_ai_assist ?? true;

  return (
    <AppCard>
      <div className="flex items-center gap-2 mb-4">
        <Settings2 className="h-5 w-5 text-team-primary" />
        <AppCardTitle className="text-lg">{t("teams.trainingPrefs.title")}</AppCardTitle>
      </div>
      <AppCardDescription className="mb-4">
        {t("teams.trainingPrefs.description")}
      </AppCardDescription>

      <div className="space-y-6">
        {/* Training Mode */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t("teams.trainingPrefs.modeLabel")}</Label>
          <div className="grid grid-cols-3 gap-2">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.mode}
                onClick={() => updateMutation.mutate({ training_mode: option.mode })}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                  currentMode === option.mode
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className={cn(
                  "p-2 rounded-full",
                  currentMode === option.mode ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {option.icon}
                </div>
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Default Tier */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t("teams.trainingPrefs.tierLabel")}</Label>
          <div className="flex gap-2">
            {TIER_OPTIONS.map((option) => (
              <button
                key={option.tier}
                onClick={() => updateMutation.mutate({ default_tier: option.tier })}
                className={cn(
                  "flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all",
                  currentTier === option.tier
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Allowed Task Types */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">{t("teams.trainingPrefs.taskTypesLabel")}</Label>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(TASK_TYPE_LABELS) as [TaskType, string][]).map(([type, label]) => {
              const isSelected = currentTaskTypes.includes(type);
              const isRequired = type === "shooting";

              return (
                <button
                  key={type}
                  onClick={() => {
                    if (isRequired) return;
                    const newTypes = isSelected
                      ? currentTaskTypes.filter((t) => t !== type)
                      : [...currentTaskTypes, type];
                    if (newTypes.length > 0) {
                      updateMutation.mutate({ allowed_task_types: newTypes });
                    }
                  }}
                  disabled={isRequired}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                    isRequired && "cursor-not-allowed opacity-70"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* AI Assist Toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label className="font-medium flex items-center gap-2">
              {useAiAssist ? <Bot className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              {t("teams.trainingPrefs.aiLabel")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {useAiAssist
                ? t("teams.trainingPrefs.aiDescriptionEnabled")
                : t("teams.trainingPrefs.aiDescriptionDisabled")}
            </p>
          </div>
          <Switch
            checked={useAiAssist}
            onCheckedChange={(checked) => updateMutation.mutate({ use_ai_assist: checked })}
          />
        </div>
      </div>
    </AppCard>
  );
};
