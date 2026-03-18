import { useState } from "react";
import { logger } from "@/core";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TrainingModeStep } from "./steps/TrainingModeStep";
import { TaskTypesStep } from "./steps/TaskTypesStep";
import { TeamLevelStep } from "./steps/TeamLevelStep";
import { ScheduleConnectStep } from "./steps/ScheduleConnectStep";
import { WorkoutMethodStep } from "./steps/WorkoutMethodStep";
import { OnboardingComplete } from "./steps/OnboardingComplete";

interface CoachOnboardingWizardProps {
  teamId: string;
  teamName: string;
  onComplete: () => void;
  onSkip: () => void;
}

export type TrainingMode = "shooting_only" | "balanced" | "performance";
export type TaskType = "shooting" | "mobility" | "conditioning" | "recovery" | "prep";
export type TeamTier = "rec" | "rep" | "elite";

const TASK_TYPE_DEFAULTS: Record<TrainingMode, TaskType[]> = {
  shooting_only: ["shooting"],
  balanced: ["shooting", "mobility", "prep"],
  performance: ["shooting", "conditioning", "mobility", "recovery", "prep"],
};

export function CoachOnboardingWizard({
  teamId,
  teamName,
  onComplete,
  onSkip,
}: CoachOnboardingWizardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);

  // Form state
  const [trainingMode, setTrainingMode] = useState<TrainingMode>("balanced");
  const [taskTypes, setTaskTypes] = useState<TaskType[]>(TASK_TYPE_DEFAULTS.balanced);
  const [teamTier, setTeamTier] = useState<TeamTier>("rep");
  const [scheduleConnected, setScheduleConnected] = useState(false);
  const [useAiAssist, setUseAiAssist] = useState(true);

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  const stepTitles = [
    t("welcome.onboarding.step1Title"),
    t("welcome.onboarding.step2Title"),
    t("welcome.onboarding.step3Title"),
    t("welcome.onboarding.step4Title"),
    t("welcome.onboarding.step5Title"),
  ];

  // Update task types when training mode changes
  const handleTrainingModeChange = (mode: TrainingMode) => {
    setTrainingMode(mode);
    setTaskTypes(TASK_TYPE_DEFAULTS[mode]);
  };

  const savePreferencesMutation = useMutation({
    mutationFn: async () => {
      // Save training preferences
      const { error: prefError } = await supabase
        .from("team_training_preferences")
        .upsert({
          team_id: teamId,
          training_mode: trainingMode,
          allowed_task_types: taskTypes,
          default_tier: teamTier,
          use_ai_assist: useAiAssist,
          updated_at: new Date().toISOString(),
        });

      if (prefError) throw prefError;

      // Mark onboarding as complete
      const { error: stateError } = await supabase
        .from("team_onboarding_state")
        .upsert({
          team_id: teamId,
          completed: true,
          completed_at: new Date().toISOString(),
          last_step_completed: "complete",
        });

      if (stateError) throw stateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-onboarding", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-preferences", teamId] });
      setIsCompleted(true);
    },
    onError: (error) => {
      logger.error("Error saving preferences", { error });
      toast.error(t("welcome.onboarding.failedToSavePreferences"));
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: async (step: string) => {
      const { error } = await supabase
        .from("team_onboarding_state")
        .upsert({
          team_id: teamId,
          last_step_completed: step,
        });
      if (error) throw error;
    },
  });

  const handleNext = () => {
    updateStepMutation.mutate(`step_${currentStep}`);
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      savePreferencesMutation.mutate();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleQuickAction = (action: string) => {
    onComplete();
    switch (action) {
      case "create_week":
        navigate(`/teams/${teamId}/builder`);
        break;
      case "create_today":
        navigate(`/teams/${teamId}/practice`);
        break;
      case "invite_parents":
        navigate(`/teams/${teamId}/roster`);
        break;
      default:
        navigate(`/teams/${teamId}`);
    }
  };

  if (isCompleted) {
    return (
      <OnboardingComplete
        teamName={teamName}
        onAction={handleQuickAction}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-sm text-muted-foreground">
              {t("welcome.onboarding.stepCounter", { current: currentStep, total: totalSteps })}
            </span>
            <p className="text-base font-semibold leading-tight">
              {stepTitles[currentStep - 1]}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={() => setShowSkipDialog(true)}
          className="text-muted-foreground"
        >
          {t("welcome.onboarding.skipForNow")}
          <X className="ml-1 h-4 w-4" />
        </Button>
      </div>

      {/* Progress bar */}
      <Progress value={progress} className="h-1 rounded-none" />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-8">
          {currentStep === 1 && (
            <TrainingModeStep
              value={trainingMode}
              onChange={handleTrainingModeChange}
            />
          )}
          {currentStep === 2 && (
            <TaskTypesStep
              value={taskTypes}
              onChange={setTaskTypes}
            />
          )}
          {currentStep === 3 && (
            <TeamLevelStep
              value={teamTier}
              onChange={setTeamTier}
            />
          )}
          {currentStep === 4 && (
            <ScheduleConnectStep
              teamId={teamId}
              isConnected={scheduleConnected}
              onConnected={() => setScheduleConnected(true)}
            />
          )}
          {currentStep === 5 && (
            <WorkoutMethodStep
              value={useAiAssist}
              onChange={setUseAiAssist}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-background">
        {savePreferencesMutation.isError && (
          <p className="text-sm text-destructive text-center mb-2">
            {t("welcome.onboarding.failedToSavePreferences")}
          </p>
        )}
        <div className="max-w-lg mx-auto flex gap-3">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t("common.back")}
            </Button>
          )}
          <Button
            onClick={handleNext}
            className="flex-1"
            disabled={savePreferencesMutation.isPending}
          >
            {currentStep === totalSteps ? (
              savePreferencesMutation.isPending ? t("common.saving") : t("welcome.onboarding.finishSetup")
            ) : (
              <>
                {t("common.continue")}
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Skip confirmation */}
      <AlertDialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("welcome.onboarding.skipConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("welcome.onboarding.skipConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onSkip}>
              {t("welcome.onboarding.skipForNow")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
