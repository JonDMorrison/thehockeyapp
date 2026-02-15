import React, { useState } from "react";
import { logger } from "@/core";
import { format, addDays, addWeeks, addMonths } from "date-fns";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/app/Toast";
import { fireGoalConfetti } from "@/lib/confetti";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle,
  Sparkles,
  Send,
  Target,
  Calendar,
  Brain,
  Crosshair,
  Dumbbell,
  Zap,
  Heart,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- Types ----------

interface ParentProgramBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: string;
  playerAge?: number;
  playerShoots?: string | null;
  playerTier?: string;
  teamId?: string;
}

type Step = "focus" | "frequency" | "horizon" | "goal" | "generate";

// ---------- Constants ----------

const SKILL_FOCUSES = [
  { id: "shooting_power", label: "Shooting Power", icon: Zap },
  { id: "shooting_accuracy", label: "Shooting Accuracy", icon: Crosshair },
  { id: "backhand", label: "Backhand", icon: Target },
  { id: "puck_control", label: "Puck Control", icon: Shield },
  { id: "skating_strength", label: "Skating Strength", icon: Dumbbell },
  { id: "conditioning", label: "Conditioning", icon: Heart },
  { id: "discipline_consistency", label: "Discipline & Consistency", icon: Brain },
] as const;

const FREQUENCY_OPTIONS = [
  { id: "3", label: "3× per week", days: 3, description: "Manageable pace" },
  { id: "5", label: "5× per week", days: 5, description: "Serious commitment" },
  { id: "7", label: "Daily", days: 7, description: "Maximum development" },
  { id: "custom", label: "Custom", days: 0, description: "You choose" },
] as const;

const HORIZON_OPTIONS = [
  { id: "1w", label: "1 Week Focus", weeks: 1, description: "Quick sprint" },
  { id: "1m", label: "1 Month Focus", weeks: 4, description: "Build habits" },
  { id: "3m", label: "3 Month Focus", weeks: 12, description: "Real growth" },
  { id: "season", label: "Season Focus", weeks: 24, description: "Long-term plan" },
] as const;

const SENDING_STEPS = [
  "Analyzing focus areas...",
  "Building your custom plan...",
  "Generating daily tasks...",
  "Finalizing your program...",
];

const MAX_FOCUSES = 5;

// ---------- Component ----------

export const ParentProgramBuilderModal: React.FC<ParentProgramBuilderModalProps> = ({
  open,
  onOpenChange,
  playerId,
  playerAge,
  playerShoots,
  playerTier = "rep",
  teamId,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Step state
  const [step, setStep] = useState<Step>("focus");
  const [sendingStep, setSendingStep] = useState(0);

  // Step 1: Skill focuses
  const [selectedFocuses, setSelectedFocuses] = useState<string[]>([]);

  // Step 2: Frequency
  const [frequency, setFrequency] = useState<string | null>(null);
  const [customDays, setCustomDays] = useState(4);

  // Step 3: Horizon
  const [horizon, setHorizon] = useState<string | null>(null);

  // Step 4: Parent goal
  const [parentGoal, setParentGoal] = useState("");

  const toggleFocus = (id: string) => {
    setSelectedFocuses((prev) => {
      if (prev.includes(id)) return prev.filter((f) => f !== id);
      if (prev.length >= MAX_FOCUSES) return prev;
      return [...prev, id];
    });
  };

  const getDaysPerWeek = (): number => {
    if (frequency === "custom") return customDays;
    return FREQUENCY_OPTIONS.find((f) => f.id === frequency)?.days ?? 5;
  };

  const getHorizonWeeks = (): number => {
    return HORIZON_OPTIONS.find((h) => h.id === horizon)?.weeks ?? 4;
  };

  const getEndDate = (): Date => {
    const weeks = getHorizonWeeks();
    return addWeeks(new Date(), weeks);
  };

  // AI generation + save
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      setSendingStep(0);

      // Call AI edge function
      const focusLabels = selectedFocuses.map(
        (id) => SKILL_FOCUSES.find((f) => f.id === id)?.label ?? id
      );
      const daysPerWeek = getDaysPerWeek();
      const horizonWeeks = getHorizonWeeks();
      const startDate = format(addDays(new Date(), 1), "yyyy-MM-dd");

      const payload = {
        type: "week_plan" as const,
        player_id: playerId,
        start_date: startDate,
        tier: playerTier as "rec" | "rep" | "elite",
        time_budget: 20,
        days_per_week: daysPerWeek,
        focus_areas: focusLabels,
        keep_simple: false,
        // Extended fields for parent context
        parent_goal: parentGoal,
        horizon_weeks: horizonWeeks,
        player_age: playerAge,
        player_shoots: playerShoots,
      };

      setSendingStep(1);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No auth token");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-workout-ai`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "AI generation failed");
      }

      const aiResult = await res.json();
      if (!aiResult.success || !aiResult.data) {
        throw new Error("AI returned invalid data");
      }

      setSendingStep(2);

      // Save practice cards with program_source='parent'
      const plan = aiResult.data;
      const days: Array<{
        date: string;
        title: string;
        notes?: string;
        tasks: Array<{
          task_type: string;
          label: string;
          target_type: string;
          target_value: number | null;
          shot_type: string;
          shots_expected: number | null;
          is_required: boolean;
        }>;
      }> = plan.days || [];

      if (days.length === 0) throw new Error("AI returned no days");

      // We need a team_id for practice_cards. If none provided, we can't save to
      // team practice_cards. For now, require a team context.
      if (!teamId) {
        throw new Error("No team context for saving cards");
      }

      // Batch insert cards
      const cardInserts = days.map((day) => ({
        team_id: teamId,
        created_by_user_id: user.id,
        date: day.date,
        title: day.title || `${plan.name || "Training"} – ${day.date}`,
        tier: plan.tier || playerTier,
        mode: "normal",
        notes: day.notes || null,
        published_at: new Date().toISOString(),
        program_source: "parent" as const,
      }));

      const { data: cards, error: cardsError } = await supabase
        .from("practice_cards")
        .insert(cardInserts)
        .select("id");

      if (cardsError) throw cardsError;

      setSendingStep(3);

      // Build tasks for all cards
      const taskInserts: Array<{
        practice_card_id: string;
        label: string;
        task_type: string;
        sort_order: number;
        target_type: string;
        target_value: number | null;
        shot_type: string;
        shots_expected: number | null;
        is_required: boolean;
        program_source: "parent";
      }> = [];

      cards.forEach((card, cardIdx) => {
        const dayTasks = days[cardIdx]?.tasks || [];
        dayTasks.forEach((task, taskIdx) => {
          taskInserts.push({
            practice_card_id: card.id,
            label: task.label,
            task_type: task.task_type,
            sort_order: taskIdx,
            target_type: task.target_type || "none",
            target_value: task.target_value ?? null,
            shot_type: task.shot_type || "none",
            shots_expected: task.shots_expected ?? null,
            is_required: task.is_required ?? true,
            program_source: "parent",
          });
        });
      });

      if (taskInserts.length > 0) {
        const { error: tasksError } = await supabase
          .from("practice_tasks")
          .insert(taskInserts);
        if (tasksError) throw tasksError;
      }

      return { cardCount: cards.length, taskCount: taskInserts.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["practice-cards"] });
      queryClient.invalidateQueries({ queryKey: ["player-home"] });
      fireGoalConfetti();
      toast.success(
        "Your custom training plan is ready! 🎉",
        `${result.cardCount} days with ${result.taskCount} tasks created.`
      );
      setTimeout(() => handleClose(), 600);
    },
    onError: (error: Error) => {
      logger.error("Parent program generation error", { error });
      toast.error("Failed to generate plan", error.message);
      setStep("goal");
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("focus");
      setSendingStep(0);
      setSelectedFocuses([]);
      setFrequency(null);
      setCustomDays(4);
      setHorizon(null);
      setParentGoal("");
    }, 300);
  };

  const handleNext = () => {
    if (step === "focus") setStep("frequency");
    else if (step === "frequency") setStep("horizon");
    else if (step === "horizon") setStep("goal");
    else if (step === "goal") {
      setStep("generate");
      generateMutation.mutate();
    }
  };

  const handleBack = () => {
    if (step === "frequency") setStep("focus");
    else if (step === "horizon") setStep("frequency");
    else if (step === "goal") setStep("horizon");
  };

  const canProceed = (): boolean => {
    if (step === "focus") return selectedFocuses.length >= 1;
    if (step === "frequency") return !!frequency;
    if (step === "horizon") return !!horizon;
    if (step === "goal") return parentGoal.trim().length > 0;
    return true;
  };

  const STEPS: Step[] = ["focus", "frequency", "horizon", "goal"];

  // ---------- Renderers ----------

  const renderFocus = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center pb-2">
        <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
          <Target className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-lg font-bold">Choose Skill Focus</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Select up to {MAX_FOCUSES} areas to develop
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {SKILL_FOCUSES.map((skill) => {
          const selected = selectedFocuses.includes(skill.id);
          const disabled = !selected && selectedFocuses.length >= MAX_FOCUSES;
          return (
            <button
              key={skill.id}
              onClick={() => toggleFocus(skill.id)}
              disabled={disabled}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                selected
                  ? "border-primary bg-primary/5"
                  : disabled
                  ? "border-border opacity-40 cursor-not-allowed"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  selected ? "bg-primary/10" : "bg-muted"
                )}
              >
                <skill.icon
                  className={cn(
                    "w-4 h-4",
                    selected ? "text-primary" : "text-muted-foreground"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  selected ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {skill.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        {selectedFocuses.length}/{MAX_FOCUSES} selected
      </p>
    </motion.div>
  );

  const renderFrequency = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center pb-2">
        <Calendar className="w-8 h-8 mx-auto text-blue-500 mb-2" />
        <h3 className="text-lg font-bold">Training Frequency</h3>
        <p className="text-sm text-muted-foreground">
          How often should they train each week?
        </p>
      </div>

      <div className="space-y-3">
        {FREQUENCY_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setFrequency(opt.id)}
            className={cn(
              "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all",
              frequency === opt.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            )}
          >
            <div className="text-left">
              <p className="font-semibold text-sm">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </div>
            {frequency === opt.id && (
              <CheckCircle className="w-5 h-5 text-primary" />
            )}
          </button>
        ))}
      </div>

      {frequency === "custom" && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCustomDays(Math.max(1, customDays - 1))}
          >
            –
          </Button>
          <span className="text-xl font-bold w-12 text-center">{customDays}</span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCustomDays(Math.min(7, customDays + 1))}
          >
            +
          </Button>
          <span className="text-sm text-muted-foreground">days/week</span>
        </div>
      )}
    </motion.div>
  );

  const renderHorizon = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center pb-2">
        <Calendar className="w-8 h-8 mx-auto text-blue-500 mb-2" />
        <h3 className="text-lg font-bold">Time Horizon</h3>
        <p className="text-sm text-muted-foreground">
          How far ahead should we plan?
        </p>
      </div>

      <div className="space-y-3">
        {HORIZON_OPTIONS.map((opt) => {
          const endDate = addWeeks(new Date(), opt.weeks);
          return (
            <button
              key={opt.id}
              onClick={() => setHorizon(opt.id)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                horizon === opt.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div className="text-left">
                <p className="font-semibold text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground">
                  {opt.description} · ends {format(endDate, "MMM d")}
                </p>
              </div>
              {horizon === opt.id && (
                <CheckCircle className="w-5 h-5 text-primary" />
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );

  const renderGoal = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center pb-2">
        <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
          <Brain className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-lg font-bold">Your Goal</h3>
        <p className="text-sm text-muted-foreground mt-1">
          What do you want to see improve in the next 30 days?
        </p>
      </div>

      <div>
        <Label className="text-sm font-medium">Parent Goal</Label>
        <Textarea
          className="mt-2 min-h-[120px]"
          placeholder="e.g., I want their wrist shot to be noticeably harder and more accurate by the end of the month. They also need to build better training discipline."
          value={parentGoal}
          onChange={(e) => setParentGoal(e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-2">
          This helps the AI tailor the plan to your priorities.
        </p>
      </div>
    </motion.div>
  );

  const renderGenerate = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 space-y-8"
    >
      <motion.div
        animate={{
          rotate: [0, 10, -10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="relative"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <motion.div
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute -inset-4 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-600/20 -z-10"
        />
      </motion.div>

      <div className="space-y-3 w-full max-w-xs">
        {SENDING_STEPS.map((stepText, i) => (
          <motion.div
            key={stepText}
            initial={{ opacity: 0, x: -10 }}
            animate={{
              opacity: i <= sendingStep ? 1 : 0.4,
              x: 0,
            }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3"
          >
            {i < sendingStep ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : i === sendingStep ? (
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-muted" />
            )}
            <span
              className={
                i <= sendingStep ? "text-foreground" : "text-muted-foreground"
              }
            >
              {stepText}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="h-[90vh] rounded-t-3xl overflow-hidden"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Build a Development Plan</SheetTitle>
          <SheetDescription>
            Create a custom AI-powered training plan for your player
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col h-full">
          {/* Progress Dots */}
          {step !== "generate" && (
            <div className="flex justify-center gap-2 py-4">
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    s === step
                      ? "bg-primary"
                      : STEPS.indexOf(step) > i
                      ? "bg-primary/50"
                      : "bg-muted"
                  )}
                />
              ))}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-1 pb-4">
            <AnimatePresence mode="wait">
              {step === "focus" && renderFocus()}
              {step === "frequency" && renderFrequency()}
              {step === "horizon" && renderHorizon()}
              {step === "goal" && renderGoal()}
              {step === "generate" && renderGenerate()}
            </AnimatePresence>
          </div>

          {/* Footer Buttons */}
          {step !== "generate" && (
            <div className="flex gap-3 pt-4 border-t">
              {step !== "focus" && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleBack}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <Button
                className="flex-1"
                onClick={handleNext}
                disabled={!canProceed() || generateMutation.isPending}
              >
                {step === "goal" ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Plan
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
