import { useTranslation } from 'react-i18next';
import { useState, useMemo, useEffect } from "react";
import { logger } from "@/core";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, addWeeks, startOfWeek } from "date-fns";
import {
  ChevronLeft, ArrowRight, ArrowLeft, Target, Dumbbell, Heart,
  Timer, Zap, Brain, Loader2, CheckCircle, Sparkles, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { AppShell } from "@/components/app/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { fireGoalConfetti } from "@/lib/confetti";

type Step = "setup" | "goals" | "generating" | "preview";

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

const focusOptions = [
  { id: "shooting_accuracy", labelKey: "solo.focusShootingAccuracy", icon: Target },
  { id: "shot_volume", labelKey: "solo.focusShotVolume", icon: Zap },
  { id: "conditioning", labelKey: "solo.focusConditioning", icon: Dumbbell },
  { id: "mobility", labelKey: "solo.focusMobility", icon: Heart },
  { id: "game_prep", labelKey: "solo.focusGamePrep", icon: Timer },
];

export default function SoloProgramBuilder() {
  const { t } = useTranslation();
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const generatingSteps = [
    t('solo.generatingStep1'),
    t('solo.generatingStep2'),
    t('solo.generatingStep3'),
    t('solo.generatingStep4'),
    t('solo.generatingStep5'),
  ];

  // Step 1: Setup
  const [programName, setProgramName] = useState("My Training Program");
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

  // Fetch player
  const { data: player, isLoading } = useQuery({
    queryKey: ['player', playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, first_name, owner_user_id')
        .eq('id', playerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!playerId,
  });

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

      // Generate each week using AI
      const weeks: GeneratedProgram["weeks"] = [];

      for (let weekNum = 0; weekNum < duration; weekNum++) {
        const weekStart = addWeeks(startDate, weekNum);

        const { data, error } = await supabase.functions.invoke("generate-workout-ai", {
          body: {
            type: "week_plan",
            player_id: playerId,
            start_date: format(weekStart, "yyyy-MM-dd"),
            tier,
            time_budget: timeBudget,
            days_per_week: daysPerWeek,
            focus_areas: selectedFocus,
            keep_simple: tier === "rec",
          },
        });

        if (error) throw error;
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
      toast.error(t('solo.generationFailed') + ": " + error.message);
      setStep("goals");
    },
  });

  // Apply program mutation
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!generatedProgram || !player || !startDate) {
        throw new Error("Missing data");
      }

      // Update or create personal training plan
      const { error: planError } = await supabase
        .from("personal_training_plans")
        .upsert({
          player_id: playerId,
          name: generatedProgram.name,
          tier,
          days_per_week: daysPerWeek,
          training_focus: selectedFocus,
          is_active: true,
        }, { onConflict: 'player_id' });

      if (planError) throw planError;

      // Create practice cards for each day in each week
      for (const week of generatedProgram.weeks) {
        for (const day of week.days) {
          const { data: card, error: cardError } = await supabase
            .from("personal_practice_cards")
            .insert({
              player_id: playerId,
              date: day.date,
              title: day.title,
              notes: day.notes,
              tier,
              mode: "normal",
            })
            .select()
            .single();

          if (cardError) throw cardError;

          // Insert tasks
          if (day.tasks.length > 0) {
            const taskInserts = day.tasks.map((task, index) => ({
              personal_practice_card_id: card.id,
              label: task.label,
              task_type: task.task_type,
              sort_order: index,
              shots_expected: task.shots_expected || null,
              target_value: task.target_value || null,
              target_type: task.target_type || "none",
              is_required: task.is_required,
            }));

            const { error: tasksError } = await supabase
              .from("personal_practice_tasks")
              .insert(taskInserts);

            if (tasksError) throw tasksError;
          }
        }
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solo-dashboard", playerId] });
      toast.success(t('solo.programCreated'), { description: `${duration} ${t('solo.weeksOfTrainingReady')}` });
      navigate(`/solo/dashboard/${playerId}`);
    },
    onError: (error: Error) => {
      logger.error("Apply program error", { error });
      toast.error(t('solo.failedToSave') + ": " + error.message);
    },
  });

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

  if (isLoading || authLoading) {
    return (
      <AppShell>
        <div className="p-5 space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const renderSetup = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Program Name */}
      <div>
        <Label className="text-sm font-medium">{t('solo.programName')}</Label>
        <Input
          className="mt-2"
          placeholder="e.g., Pre-Season Training"
          value={programName}
          onChange={(e) => setProgramName(e.target.value)}
        />
      </div>

      {/* Start Date */}
      <div>
        <Label className="text-sm font-medium mb-2 block">{t('solo.startDate')}</Label>
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={setStartDate}
            disabled={(date) => date < new Date()}
            className="rounded-lg border bg-card"
          />
        </div>
      </div>

      {/* Duration */}
      <div>
        <Label className="text-sm font-medium">{t('solo.duration')}</Label>
        <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 {t('solo.weeks')}</SelectItem>
            <SelectItem value="4">4 {t('solo.weeks')}</SelectItem>
            <SelectItem value="6">6 {t('solo.weeks')}</SelectItem>
            <SelectItem value="8">8 {t('solo.weeks')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Days per Week */}
      <div>
        <Label className="text-sm font-medium">{t('solo.trainingDaysPerWeek')}</Label>
        <Select value={daysPerWeek.toString()} onValueChange={(v) => setDaysPerWeek(parseInt(v))}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 {t('solo.days')}</SelectItem>
            <SelectItem value="4">4 {t('solo.days')}</SelectItem>
            <SelectItem value="5">5 {t('solo.days')}</SelectItem>
            <SelectItem value="6">6 {t('solo.days')}</SelectItem>
            <SelectItem value="7">7 {t('solo.days')}</SelectItem>
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
        <Label className="text-sm font-medium">{t('solo.trainingIntensity')}</Label>
        <Select value={tier} onValueChange={(v) => setTier(v as typeof tier)}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rec">{t('solo.tierRec')}</SelectItem>
            <SelectItem value="rep">{t('solo.tierRep')}</SelectItem>
            <SelectItem value="elite">{t('solo.tierElite')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Time Budget */}
      <div>
        <Label className="text-sm font-medium">{t('solo.timePerSession')}</Label>
        <Select value={timeBudget.toString()} onValueChange={(v) => setTimeBudget(parseInt(v))}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15">15 {t('solo.minutes')}</SelectItem>
            <SelectItem value="25">25 {t('solo.minutes')}</SelectItem>
            <SelectItem value="35">35 {t('solo.minutes')}</SelectItem>
            <SelectItem value="45">45 {t('solo.minutes')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Focus Areas */}
      <div>
        <Label className="text-sm font-medium mb-3 block">{t('solo.whatDoYouWantToImprove')}</Label>
        <div className="space-y-2">
          {focusOptions.map((option) => {
            const isSelected = selectedFocus.includes(option.id);
            return (
              <div
                key={option.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted"
                )}
                onClick={() => toggleFocus(option.id)}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleFocus(option.id)}
                />
                <option.icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">{t(option.labelKey)}</span>
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
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Brain className="w-10 h-10 text-primary" />
        </div>
        <motion.div
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute -inset-4 rounded-full bg-primary/10 -z-10"
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
              <CheckCircle className="w-5 h-5 text-primary" />
            ) : i === generatingStep ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-muted" />
            )}
            <span className={cn(
              "text-sm",
              i <= generatingStep ? "text-foreground" : "text-muted-foreground"
            )}>
              {stepText}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderPreview = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Success Header */}
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">{t('solo.programReady')}</h2>
        <p className="text-muted-foreground mt-1">
          {duration} {t('solo.weeksOfTrainingCreated')}
        </p>
      </div>

      {/* Week Preview */}
      <div className="space-y-3">
        {generatedProgram?.weeks.map((week) => (
          <div
            key={week.weekNumber}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">{t('solo.weekNum', { num: week.weekNumber })}</h3>
              <span className="text-xs text-muted-foreground">
                {format(new Date(week.startDate), "MMM d")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {week.days.length} {t('solo.trainingDays')}
            </p>
            <div className="flex gap-1 mt-2">
              {week.days.slice(0, 5).map((day, i) => (
                <div
                  key={day.date}
                  className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-medium text-primary"
                >
                  {format(new Date(day.date), "E")[0]}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <AppShell>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => {
                if (step === "setup") {
                  navigate(`/solo/planning/${playerId}`);
                } else if (step !== "generating") {
                  handleBack();
                }
              }}
              disabled={step === "generating"}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">
                {step === "setup" && t('solo.createProgram')}
                {step === "goals" && t('solo.trainingGoals')}
                {step === "generating" && t('solo.buildingProgram')}
                {step === "preview" && t('solo.reviewProgram')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('solo.aiPoweredTrainingPlan')}
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-6">
          <AnimatePresence mode="wait">
            {step === "setup" && renderSetup()}
            {step === "goals" && renderGoals()}
            {step === "generating" && renderGenerating()}
            {step === "preview" && renderPreview()}
          </AnimatePresence>

          {/* Navigation Buttons */}
          {step !== "generating" && (
            <div className="pt-6 pb-8">
              {step === "preview" ? (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => applyMutation.mutate()}
                  disabled={applyMutation.isPending}
                >
                  {applyMutation.isPending ? t('common.saving') : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      {t('solo.startTraining')}
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleNext}
                  disabled={
                    (step === "setup" && !startDate) ||
                    (step === "goals" && selectedFocus.length === 0)
                  }
                >
                  {t('solo.continue')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
