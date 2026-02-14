import React, { useState, useEffect } from "react";
import { logger } from "@/core";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, CalendarPlus, CalendarRange, Sparkles, Users, CalendarSync, BarChart3, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
}

const steps: WalkthroughStep[] = [
  {
    id: "welcome",
    title: "Welcome to Your Dashboard",
    description: "This is your command center. From here you'll create workouts, track your players' progress, and keep everyone motivated. Let's show you around.",
    icon: <Sparkles className="w-6 h-6" />,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    id: "add-workout",
    title: "Create Your First Workout",
    description: "Start here—add a workout for today or any date. Pick the drills, set shot counts, and your players will see it instantly. Takes just a minute.",
    icon: <CalendarPlus className="w-6 h-6" />,
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    id: "plan-week",
    title: "Plan the Whole Week",
    description: "Set up Monday through Sunday once, then reuse it. Perfect for establishing a consistent training routine your players can follow every week.",
    icon: <CalendarRange className="w-6 h-6" />,
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    id: "create-program",
    title: "Let AI Build Your Program",
    description: "Tell us your goals and timeline, and AI creates 4–8 weeks of progressive training. No planning required—just review and apply.",
    icon: <Sparkles className="w-6 h-6" />,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    id: "invite-players",
    title: "Invite Players & Families",
    description: "Share your team code with players and parents. They'll join in seconds, see assigned workouts, and start checking off tasks right away.",
    icon: <Users className="w-6 h-6" />,
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    id: "track-progress",
    title: "Track Progress",
    description: "See who's training and who needs encouragement. Connect your team calendar to auto-detect game days, and watch completion rates in real time.",
    icon: <BarChart3 className="w-6 h-6" />,
    gradient: "from-rose-500 to-red-500",
  },
];

interface PlanningWalkthroughProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const PlanningWalkthrough: React.FC<PlanningWalkthroughProps> = ({
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onSkip();
    } else if (e.key === "ArrowRight" || e.key === "Enter") {
      handleNext();
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onSkip}
      />

      {/* Content */}
      <motion.div
        key={step.id}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Skip button */}
        <button
          onClick={onSkip}
          className="absolute -top-12 right-0 text-white/60 hover:text-white flex items-center gap-1 text-sm transition-colors"
        >
          Skip tour
          <X className="w-4 h-4" />
        </button>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-2xl overflow-hidden border border-border">
          {/* Colored header */}
          <div className={cn(
            "p-6 bg-gradient-to-br text-white",
            step.gradient
          )}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                {step.icon}
              </div>
              <div>
                <p className="text-white/70 text-sm font-medium">
                  Step {currentStep + 1} of {steps.length}
                </p>
                <h3 className="text-xl font-bold">{step.title}</h3>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            <p className="text-muted-foreground text-base leading-relaxed">
              {step.description}
            </p>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    index === currentStep
                      ? "w-6 bg-primary"
                      : index < currentStep
                      ? "bg-primary/50"
                      : "bg-muted"
                  )}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onSkip}
              >
                Skip
              </Button>
              <Button
                className={cn(
                  "flex-1 gap-2 text-white",
                  `bg-gradient-to-r ${step.gradient} hover:opacity-90`
                )}
                onClick={handleNext}
              >
                {isLastStep ? "Get Started" : "Next"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Hint text */}
        <p className="text-center text-white/50 text-xs mt-4">
          Press → or Enter to continue • Esc to skip
        </p>
      </motion.div>
    </motion.div>
  );
};

// Hook to manage walkthrough state
export const usePlanningWalkthrough = (teamId: string) => {
  const storageKey = `planning-walkthrough-seen-${teamId}`;
  
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Don't do anything until we have a valid teamId
    if (!teamId) {
      setIsReady(false);
      return;
    }

    // Check localStorage with the current teamId
    const key = `planning-walkthrough-seen-${teamId}`;
    let hasSeenIt = false;
    try {
      hasSeenIt = localStorage.getItem(key) === "true";
    } catch {
      hasSeenIt = false;
    }

    if (hasSeenIt) {
      // User has already seen the walkthrough for this team
      setShowWalkthrough(false);
      setIsReady(true);
    } else {
      // First time - show walkthrough after a small delay
      const timer = setTimeout(() => {
        setShowWalkthrough(true);
        setIsReady(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [teamId]);

  const completeWalkthrough = () => {
    if (!teamId) return;
    try {
      localStorage.setItem(storageKey, "true");
    } catch (e) {
      logger.warn("Could not save walkthrough state to localStorage");
    }
    setShowWalkthrough(false);
  };

  const skipWalkthrough = () => {
    if (!teamId) return;
    try {
      localStorage.setItem(storageKey, "true");
    } catch (e) {
      logger.warn("Could not save walkthrough state to localStorage");
    }
    setShowWalkthrough(false);
  };

  const resetWalkthrough = () => {
    if (!teamId) return;
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      logger.warn("Could not reset walkthrough state in localStorage");
    }
    setShowWalkthrough(true);
  };

  return {
    showWalkthrough,
    isReady,
    completeWalkthrough,
    skipWalkthrough,
    resetWalkthrough,
  };
};
