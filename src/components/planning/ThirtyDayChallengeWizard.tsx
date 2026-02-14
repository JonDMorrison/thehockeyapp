import React, { useState } from "react";
import { logger } from "@/core";
import { format, addDays } from "date-fns";
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
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/components/app/Toast";
import { fireGoalConfetti } from "@/lib/confetti";
import {
  Trophy,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle,
  Flame,
  Calendar as CalendarIcon,
  Send,
  Sparkles,
} from "lucide-react";
import { ChallengeDayBuilder, exercises } from "./ChallengeDayBuilder";

interface ThirtyDayChallengeWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
}

type Step = "name" | "dates" | "exercises" | "review" | "sending";

const sendingSteps = [
  "Creating challenge...",
  "Building 30-day calendar...",
  "Assigning exercises...",
  "Sending to players...",
];

export const ThirtyDayChallengeWizard: React.FC<ThirtyDayChallengeWizardProps> = ({
  open,
  onOpenChange,
  teamId,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Step 1: Name
  const [challengeName, setChallengeName] = useState("30 Day Skills Challenge");

  // Step 2: Dates
  const [startDate, setStartDate] = useState<Date | undefined>(
    addDays(new Date(), 1) // Start tomorrow by default
  );

  // Step 3: Exercises
  const [selectedExercises, setSelectedExercises] = useState<string[]>([
    "wrist_shots",
    "basic_puck_control",
    "dynamic_stretching",
  ]);

  // Wizard state
  const [step, setStep] = useState<Step>("name");
  const [sendingStep, setSendingStep] = useState(0);

  const endDate = startDate ? addDays(startDate, 29) : undefined;

  const toggleExercise = (id: string) => {
    setSelectedExercises((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  // Create challenge mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!startDate || !user || selectedExercises.length === 0) {
        throw new Error("Missing required data");
      }

      // Step 1: Creating challenge
      setSendingStep(0);
      await new Promise((r) => setTimeout(r, 400));

      // Create the program record (30 days = ~4.3 weeks)
      const { data: program, error: programError } = await supabase
        .from("training_programs")
        .insert({
          team_id: teamId,
          name: challengeName,
          description: `30 Day Challenge with ${selectedExercises.length} exercises per day`,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(addDays(startDate, 29), "yyyy-MM-dd"),
          tier: "rep",
          days_per_week: 7,
          focus_areas: selectedExercises,
          time_budget_minutes: 20,
          status: "active",
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (programError) throw programError;

      // Step 2: Building calendar
      setSendingStep(1);
      await new Promise((r) => setTimeout(r, 400));

      // Get selected exercise details
      const selectedExerciseDetails = exercises.filter((e) =>
        selectedExercises.includes(e.id)
      );

      // Create all practice cards in one batch
      const cardInserts = [];
      for (let dayNum = 0; dayNum < 30; dayNum++) {
        const cardDate = addDays(startDate, dayNum);
        cardInserts.push({
          team_id: teamId,
          created_by_user_id: user.id,
          date: format(cardDate, "yyyy-MM-dd"),
          title: `Day ${dayNum + 1} - ${challengeName}`,
          tier: "rep",
          mode: "challenge",
          notes: `Day ${dayNum + 1} of 30`,
          published_at: new Date().toISOString(),
        });
      }

      const { data: cards, error: cardsError } = await supabase
        .from("practice_cards")
        .insert(cardInserts)
        .select("id");

      if (cardsError) {
        // Rollback: delete the program if cards fail
        await supabase.from("training_programs").delete().eq("id", program.id);
        throw cardsError;
      }

      // Step 3: Assigning exercises
      setSendingStep(2);
      await new Promise((r) => setTimeout(r, 400));

      // Create tasks for all cards at once
      const allTaskInserts: Array<{
        practice_card_id: string;
        label: string;
        task_type: string;
        sort_order: number;
        shots_expected: number | null;
        target_type: string;
        target_value: number | null;
        is_required: boolean;
      }> = [];

      cards.forEach((card) => {
        selectedExerciseDetails.forEach((exercise, index) => {
          allTaskInserts.push({
            practice_card_id: card.id,
            label: exercise.label,
            task_type: getTaskType(exercise.category),
            sort_order: index,
            shots_expected: exercise.category === "Shooting" ? 25 : null,
            target_type: exercise.category === "Shooting" ? "shots" : "time",
            target_value: exercise.category === "Shooting" ? 25 : 5,
            is_required: true,
          });
        });
      });

      const { error: tasksError } = await supabase
        .from("practice_tasks")
        .insert(allTaskInserts);

      if (tasksError) throw tasksError;

      // Step 4: Sending to players
      setSendingStep(3);
      await new Promise((r) => setTimeout(r, 400));

      return program;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practice-cards", teamId] });
      queryClient.invalidateQueries({ queryKey: ["training-programs", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-dashboard", teamId] });
      fireGoalConfetti();
      toast.success("Challenge sent! 🔥", "30 days of training is now live for your players.");
      // Close modal after short delay so user sees completion
      setTimeout(() => {
        handleClose();
      }, 500);
    },
    onError: (error: Error) => {
      logger.error("Challenge creation error", { error });
      toast.error("Failed to create challenge", error.message);
      setStep("review");
    },
  });

  const getTaskType = (category: string): string => {
    switch (category) {
      case "Shooting":
        return "shooting";
      case "Stickhandling":
        return "stickhandling";
      case "Conditioning":
        return "conditioning";
      case "Flexibility":
        return "mobility";
      case "Hockey IQ":
        return "video";
      case "Off-Ice":
        return "other";
      default:
        return "other";
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("name");
      setSendingStep(0);
      setChallengeName("30 Day Skills Challenge");
      setStartDate(addDays(new Date(), 1));
      setSelectedExercises(["wrist_shots", "basic_puck_control", "dynamic_stretching"]);
    }, 300);
  };

  const handleNext = () => {
    if (step === "name") setStep("dates");
    else if (step === "dates") setStep("exercises");
    else if (step === "exercises") setStep("review");
    else if (step === "review") {
      setStep("sending");
      createMutation.mutate();
    }
  };

  const handleBack = () => {
    if (step === "dates") setStep("name");
    else if (step === "exercises") setStep("dates");
    else if (step === "review") setStep("exercises");
  };

  const canProceed = () => {
    if (step === "name") return challengeName.trim().length > 0;
    if (step === "dates") return !!startDate;
    if (step === "exercises") return selectedExercises.length >= 1;
    return true;
  };

  const renderName = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center pb-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-4">
          <Flame className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-bold">Create a 30 Day Challenge</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Set daily exercises for your players to complete over 30 days
        </p>
      </div>

      <div>
        <Label className="text-sm font-medium">Challenge Name</Label>
        <Input
          className="mt-2"
          placeholder="e.g., Summer Skills Challenge"
          value={challengeName}
          onChange={(e) => setChallengeName(e.target.value)}
        />
      </div>
    </motion.div>
  );

  const renderDates = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center pb-2">
        <CalendarIcon className="w-8 h-8 mx-auto text-orange-500 mb-2" />
        <h3 className="text-lg font-bold">Pick a Start Date</h3>
        <p className="text-sm text-muted-foreground">
          The challenge will run for exactly 30 days
        </p>
      </div>

      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={startDate}
          onSelect={setStartDate}
          disabled={(date) => date < new Date()}
          className="rounded-lg border"
        />
      </div>

      {startDate && endDate && (
        <div className="bg-muted/50 rounded-xl p-4 text-center">
          <p className="text-sm font-medium">
            {format(startDate, "MMM d")} → {format(endDate, "MMM d, yyyy")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">30 days of training</p>
        </div>
      )}
    </motion.div>
  );

  const renderExercises = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="text-center pb-2">
        <h3 className="text-lg font-bold">Select Daily Exercises</h3>
        <p className="text-sm text-muted-foreground">
          Players will do these exercises every day
        </p>
        <p className="text-xs text-orange-500 font-medium mt-1">
          {selectedExercises.length} selected
        </p>
      </div>

      <ChallengeDayBuilder
        selectedExercises={selectedExercises}
        onToggleExercise={toggleExercise}
      />
    </motion.div>
  );

  const renderReview = () => {
    const selectedDetails = exercises.filter((e) => selectedExercises.includes(e.id));
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <div className="text-center pb-2">
          <Trophy className="w-10 h-10 mx-auto text-orange-500 mb-2" />
          <h3 className="text-lg font-bold">Review Your Challenge</h3>
        </div>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Challenge</p>
            <p className="font-semibold">{challengeName}</p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Duration</p>
            <p className="font-semibold">
              {startDate && format(startDate, "MMM d")} – {endDate && format(endDate, "MMM d, yyyy")}
            </p>
            <p className="text-sm text-muted-foreground">30 consecutive days</p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Daily Exercises ({selectedDetails.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedDetails.map((ex) => (
                <span
                  key={ex.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/10 text-orange-600 rounded-full text-xs font-medium"
                >
                  <ex.icon className="w-3 h-3" />
                  {ex.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderSending = () => (
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
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
        className="relative"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
          <Send className="w-10 h-10 text-white" />
        </div>
        <motion.div
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute -inset-4 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 -z-10"
        />
      </motion.div>

      <div className="space-y-3 w-full max-w-xs">
        {sendingSteps.map((stepText, i) => (
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
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-muted" />
            )}
            <span className={i <= sendingStep ? "text-foreground" : "text-muted-foreground"}>
              {stepText}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-hidden">
        <SheetHeader className="sr-only">
          <SheetTitle>30 Day Challenge</SheetTitle>
          <SheetDescription>Create a 30 day challenge for your team</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col h-full">
          {/* Progress Dots */}
          {step !== "sending" && (
            <div className="flex justify-center gap-2 py-4">
              {(["name", "dates", "exercises", "review"] as Step[]).map((s, i) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    s === step
                      ? "bg-orange-500"
                      : (["name", "dates", "exercises", "review"] as Step[]).indexOf(step) > i
                      ? "bg-orange-500/50"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-1 pb-4">
            <AnimatePresence mode="wait">
              {step === "name" && renderName()}
              {step === "dates" && renderDates()}
              {step === "exercises" && renderExercises()}
              {step === "review" && renderReview()}
              {step === "sending" && renderSending()}
            </AnimatePresence>
          </div>

          {/* Footer Buttons */}
          {step !== "sending" && (
            <div className="flex gap-3 pt-4 border-t">
              {step !== "name" && (
                <Button variant="outline" className="flex-1" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <Button
                variant="team"
                className="flex-1"
                onClick={handleNext}
                disabled={!canProceed() || createMutation.isPending}
              >
                {step === "review" ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Send Challenge
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
