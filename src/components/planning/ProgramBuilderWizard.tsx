import { useTranslation } from 'react-i18next';
import React, { useState } from "react";
import { logger } from "@/core";
import { format, addWeeks, startOfWeek, addDays } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/app/Toast";
import { fireGoalConfetti } from "@/lib/confetti";
import {
  Sparkles,
  Rocket,
  Target,
  Dumbbell,
  Heart,
  Timer,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle,
  Calendar as CalendarIcon,
  Zap,
  Brain,
} from "lucide-react";
import { ProgramPreviewCalendar } from "./ProgramPreviewCalendar";
import { GoalRewardPrompt } from "@/components/goals";

interface ProgramBuilderWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
}

interface GeneratedDay {
  date: string;
  title: string;
  notes?: string;
  estimated_minutes: number;
  tasks: Array<{
    task_type: string;
    label: string;
    target_type: string;
    target_value: number | null;
    shot_type: string;
    shots_expected: number | null;
    is_required: boolean;
  }>;
}

interface GeneratedProgram {
  name: string;
  tier: string;
  weeks: Array<{
    weekNumber: number;
    startDate: string;
    days: GeneratedDay[];
  }>;
}

type Step = "setup" | "goals" | "generating" | "preview" | "reward";

export const ProgramBuilderWizard: React.FC<ProgramBuilderWizardProps> = ({
  open,
  onOpenChange,
  teamId,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const focusOptions = [
    { id: "shooting_accuracy", label: t('practice.focusShootingAccuracy'), icon: Target },
    { id: "shot_volume", label: t('practice.focusShotVolume'), icon: Zap },
    { id: "conditioning", label: t('practice.focusConditioning'), icon: Dumbbell },
    { id: "mobility", label: t('practice.focusMobilityFlexibility'), icon: Heart },
    { id: "game_prep", label: t('practice.focusGameDayPrep'), icon: Timer },
  ];

  const generatingSteps = [
    t('practice.generatingStep1'),
    t('practice.generatingStep2'),
    t('practice.generatingStep3'),
    t('practice.generatingStep4'),
    t('practice.generatingStep5'),
  ];

  // Step 1: Setup
  const [programName, setProgramName] = useState("Pre-Season Training");
  const [startDate, setStartDate] = useState<Date | undefined>(
    startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 })
  );
  const [duration, setDuration] = useState<number>(4);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(5);

  // Step 2: Goals
  const [tier, setTier] = useState<"rec" | "rep" | "elite">("rep");
  const [timeBudget, setTimeBudget] = useState<number>(25);
  const [selectedFocus, setSelectedFocus] = useState<string[]>(["shooting_accuracy", "conditioning"]);

  // Wizard state
  const [step, setStep] = useState<Step>("setup");
  const [generatingStep, setGeneratingStep] = useState(0);
  const [generatedProgram, setGeneratedProgram] = useState<GeneratedProgram | null>(null);
  const [selectedReward, setSelectedReward] = useState<{ type: string; description?: string } | null>(null);

  const toggleFocus = (id: string) => {
    setSelectedFocus((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  // Generate program mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!startDate) throw new Error("Start date required");

      // Simulate progress steps
      for (let i = 0; i < generatingSteps.length; i++) {
        setGeneratingStep(i);
        await new Promise((r) => setTimeout(r, 800));
      }

      // Generate each week
      const weeks: GeneratedProgram["weeks"] = [];

      for (let weekNum = 0; weekNum < duration; weekNum++) {
        const weekStart = addWeeks(startDate, weekNum);

        const { data, error } = await supabase.functions.invoke("generate-workout-ai", {
          body: {
            type: "week_plan",
            team_id: teamId,
            start_date: format(weekStart, "yyyy-MM-dd"),
            tier,
            time_budget: timeBudget,
            days_per_week: daysPerWeek,
            focus_areas: selectedFocus,
            keep_simple: tier === "rec",
          },
        });

        logger.debug("Generate workout response", { data, error, weekNum });

        if (error) {
          logger.error("Edge function error", { error });
          // Extract more meaningful error message
          const errorMessage = data?.error || error.message || "Failed to generate workout plan";
          throw new Error(errorMessage);
        }
        if (data?.error) throw new Error(data.error);

        weeks.push({
          weekNumber: weekNum + 1,
          startDate: format(weekStart, "yyyy-MM-dd"),
          days: data.data.days,
        });
      }

      return {
        name: programName,
        tier,
        weeks,
      };
    },
    onSuccess: (program) => {
      setGeneratedProgram(program);
      setStep("preview");
      fireGoalConfetti();
    },
    onError: (error: Error) => {
      logger.error("Program generation error", { error });
      toast.error(t('practice.generationFailed'), error.message);
      setStep("goals");
    },
  });

  // Apply program mutation
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!generatedProgram || !user || !startDate) {
        throw new Error("Missing data");
      }

      // Create the program record
      const { data: program, error: programError } = await supabase
        .from("training_programs")
        .insert({
          team_id: teamId,
          name: generatedProgram.name,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(addWeeks(startDate, duration), "yyyy-MM-dd"),
          tier,
          days_per_week: daysPerWeek,
          focus_areas: selectedFocus,
          time_budget_minutes: timeBudget,
          status: "active",
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (programError) throw programError;

      // Create week plans for each week
      for (const week of generatedProgram.weeks) {
        const { data: weekPlan, error: planError } = await supabase
          .from("team_week_plans")
          .insert({
            team_id: teamId,
            created_by_user_id: user.id,
            name: `${programName} - Week ${week.weekNumber}`,
            start_date: week.startDate,
            tier,
            status: "draft",
            program_id: program.id,
          })
          .select()
          .single();

        if (planError) throw planError;

        // Create days and tasks
        for (const day of week.days) {
          const { data: dayData, error: dayError } = await supabase
            .from("team_week_plan_days")
            .insert({
              team_week_plan_id: weekPlan.id,
              date: day.date,
              title: day.title,
              notes: day.notes,
            })
            .select()
            .single();

          if (dayError) throw dayError;

          // Insert tasks
          if (day.tasks.length > 0) {
            const taskInserts = day.tasks.map((task, index) => ({
              team_week_plan_day_id: dayData.id,
              label: task.label,
              task_type: task.task_type,
              sort_order: index,
              shots_expected: task.shots_expected || null,
              target_value: task.target_value || null,
              target_type: task.target_type || "none",
              is_required: task.is_required,
            }));

            const { error: tasksError } = await supabase
              .from("team_week_plan_tasks")
              .insert(taskInserts);

            if (tasksError) throw tasksError;
          }
        }
      }

      return program;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-week-plans", teamId] });
      queryClient.invalidateQueries({ queryKey: ["training-programs", teamId] });
      toast.success(t('practice.programCreated'), t('practice.nWeeksOfTrainingReady', { n: duration }));
      handleClose();
    },
    onError: (error: Error) => {
      logger.error("Apply program error", { error });
      toast.error(t('practice.failedToSave'), error.message);
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after animation
    setTimeout(() => {
      setStep("setup");
      setGeneratingStep(0);
      setGeneratedProgram(null);
      setSelectedReward(null);
    }, 300);
  };

  const handleNext = () => {
    if (step === "setup") {
      setStep("goals");
    } else if (step === "goals") {
      setStep("generating");
      generateMutation.mutate();
    }
  };

  const handleBack = () => {
    if (step === "goals") {
      setStep("setup");
    } else if (step === "preview") {
      setStep("goals");
      setGeneratedProgram(null);
    }
  };

  const renderSetup = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Program Name */}
      <div>
        <Label className="text-sm font-medium">{t('practice.programName')}</Label>
        <Input
          className="mt-2"
          placeholder="e.g., Pre-Season Power"
          value={programName}
          onChange={(e) => setProgramName(e.target.value)}
        />
      </div>

      {/* Start Date */}
      <div>
        <Label className="text-sm font-medium mb-2 block">{t('practice.startDate')}</Label>
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={setStartDate}
            disabled={(date) => date < new Date()}
            className="rounded-lg border"
          />
        </div>
      </div>

      {/* Duration */}
      <div>
        <Label className="text-sm font-medium">{t('practice.duration')}</Label>
        <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">{t('practice.nWeeks', { n: 2 })}</SelectItem>
            <SelectItem value="4">{t('practice.nWeeks', { n: 4 })}</SelectItem>
            <SelectItem value="6">{t('practice.nWeeks', { n: 6 })}</SelectItem>
            <SelectItem value="8">{t('practice.nWeeks', { n: 8 })}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Days per Week */}
      <div>
        <Label className="text-sm font-medium">{t('practice.trainingDaysPerWeek')}</Label>
        <Select value={daysPerWeek.toString()} onValueChange={(v) => setDaysPerWeek(parseInt(v))}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">{t('practice.nDays', { n: 3 })}</SelectItem>
            <SelectItem value="4">{t('practice.nDays', { n: 4 })}</SelectItem>
            <SelectItem value="5">{t('practice.nDays', { n: 5 })}</SelectItem>
            <SelectItem value="6">{t('practice.nDays', { n: 6 })}</SelectItem>
            <SelectItem value="7">{t('practice.nDays', { n: 7 })}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </motion.div>
  );

  const renderGoals = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Tier Selection */}
      <div>
        <Label className="text-sm font-medium">{t('practice.trainingTier')}</Label>
        <Select value={tier} onValueChange={(v) => setTier(v as typeof tier)}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rec">{t('practice.tierRecDesc')}</SelectItem>
            <SelectItem value="rep">{t('practice.tierRepDesc')}</SelectItem>
            <SelectItem value="elite">{t('practice.tierEliteDesc')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Time Budget */}
      <div>
        <Label className="text-sm font-medium">{t('practice.timePerSession')}</Label>
        <Select value={timeBudget.toString()} onValueChange={(v) => setTimeBudget(parseInt(v))}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15">{t('practice.nMinutes', { n: 15 })}</SelectItem>
            <SelectItem value="25">{t('practice.nMinutes', { n: 25 })}</SelectItem>
            <SelectItem value="35">{t('practice.nMinutes', { n: 35 })}</SelectItem>
            <SelectItem value="45">{t('practice.nMinutes', { n: 45 })}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Focus Areas */}
      <div>
        <Label className="text-sm font-medium mb-3 block">{t('practice.focusAreas')}</Label>
        <div className="space-y-2">
          {focusOptions.map((option) => {
            const isSelected = selectedFocus.includes(option.id);
            return (
              <div
                key={option.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-border hover:bg-muted"
                }`}
                onClick={() => toggleFocus(option.id)}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleFocus(option.id)}
                />
                <option.icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">{option.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );

  const renderGenerating = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 space-y-8"
    >
      {/* Animated Icon */}
      <motion.div
        animate={{
          rotate: [0, 360],
          scale: [1, 1.1, 1],
        }}
        transition={{
          rotate: { duration: 3, repeat: Infinity, ease: "linear" },
          scale: { duration: 1.5, repeat: Infinity },
        }}
        className="relative"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Brain className="w-10 h-10 text-white" />
        </div>
        <motion.div
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute -inset-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 -z-10"
        />
      </motion.div>

      {/* Progress Steps */}
      <div className="space-y-3 w-full max-w-xs">
        {generatingSteps.map((stepText, i) => (
          <motion.div
            key={stepText}
            initial={{ opacity: 0, x: -10 }}
            animate={{
              opacity: i <= generatingStep ? 1 : 0.4,
              x: 0,
            }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3"
          >
            {i < generatingStep ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : i === generatingStep ? (
              <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-muted" />
            )}
            <span className={`text-sm ${i <= generatingStep ? "text-foreground" : "text-muted-foreground"}`}>
              {stepText}
            </span>
          </motion.div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        {t('practice.buildingNWeeksOfTraining', { n: duration })}
      </p>
    </motion.div>
  );

  const renderPreview = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {generatedProgram && (
        <>
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{generatedProgram.name}</h3>
              <p className="text-sm text-muted-foreground">
                {duration} weeks • {daysPerWeek} days/week • {generatedProgram.tier.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Calendar Preview */}
          <ProgramPreviewCalendar
            weeks={generatedProgram.weeks}
            startDate={startDate!}
          />

          {/* Apply Button */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setStep("goals");
                setGeneratedProgram(null);
              }}
            >
              {t('practice.regenerate')}
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              onClick={() => setStep("reward")}
            >
              <Rocket className="w-4 h-4 mr-2" />
              {t('common.continue')}
            </Button>
          </div>
        </>
      )}
    </motion.div>
  );

  const renderReward = () => (
    <GoalRewardPrompt
      context="program"
      onSetGoal={(rewardType, customReward) => {
        setSelectedReward({ type: rewardType, description: customReward });
        applyMutation.mutate();
      }}
      onSkip={() => {
        setSelectedReward(null);
        applyMutation.mutate();
      }}
    />
  );

  const canProceed = () => {
    if (step === "setup") {
      return programName.trim() && startDate;
    }
    if (step === "goals") {
      return selectedFocus.length > 0;
    }
    return true;
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            {t('practice.createAProgram')}
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {step === "setup" && t('practice.step1of4')}
              {step === "goals" && t('practice.step2of4')}
              {step === "generating" && t('practice.generatingEllipsis')}
              {step === "preview" && t('practice.step3of4')}
              {step === "reward" && t('practice.step4of4')}
            </span>
          </SheetTitle>
          <SheetDescription>
            {step === "setup" && t('practice.setupTrainingProgramBasics')}
            {step === "goals" && t('practice.defineTrainingGoals')}
            {step === "generating" && t('practice.aiIsBuildingProgram')}
            {step === "preview" && t('practice.reviewGeneratedProgram')}
            {step === "reward" && t('practice.motivateTeamWithGoal')}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6">
          <AnimatePresence mode="wait">
            {step === "setup" && renderSetup()}
            {step === "goals" && renderGoals()}
            {step === "generating" && renderGenerating()}
            {step === "preview" && renderPreview()}
            {step === "reward" && renderReward()}
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        {step !== "generating" && step !== "preview" && (
          <div className="flex gap-3 pt-4 border-t">
            {step !== "setup" && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back')}
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              {step === "goals" ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t('practice.generateProgram')}
                </>
              ) : (
                <>
                  {t('common.continue')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
