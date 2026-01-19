import React, { useState, useEffect } from "react";
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
    id: "import-roster",
    title: "Import Your Roster",
    description: "Add your players quickly—type names manually or import from a spreadsheet. Each player gets their own profile to track progress.",
    icon: <Users className="w-6 h-6" />,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    id: "sync-calendar",
    title: "Sync Your Calendar",
    description: "Connect your team's schedule from TeamSnap, SportsEngine, or any iCal link. Games and practices appear automatically—no double entry.",
    icon: <CalendarSync className="w-6 h-6" />,
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    id: "add-workout",
    title: "Add a Single Workout",
    description: "Need something quick for today or a specific date? This creates one workout that players can check off. Great for game days or one-off drills.",
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
    id: "monitor-activity",
    title: "Monitor Player Activity",
    description: "See who's training and who needs a nudge. Track completion rates, shot counts, and streaks—all in real time as players check off tasks.",
    icon: <BarChart3 className="w-6 h-6" />,
    gradient: "from-rose-500 to-red-500",
  },
  {
    id: "share-families",
    title: "Share with Families",
    description: "Invite parents and guardians so they can see their child's progress and help with check-offs. Everyone stays in the loop, no extra apps needed.",
    icon: <Share2 className="w-6 h-6" />,
    gradient: "from-violet-500 to-purple-500",
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
  
  // Check localStorage synchronously on initial render
  const [hasSeenWalkthrough] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  });
  
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [isReady, setIsReady] = useState(hasSeenWalkthrough);

  useEffect(() => {
    // Only show walkthrough if user hasn't seen it before
    if (!hasSeenWalkthrough && teamId) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setShowWalkthrough(true);
        setIsReady(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [hasSeenWalkthrough, teamId]);

  const completeWalkthrough = () => {
    try {
      localStorage.setItem(storageKey, "true");
    } catch (e) {
      console.warn("Could not save walkthrough state to localStorage");
    }
    setShowWalkthrough(false);
  };

  const skipWalkthrough = () => {
    try {
      localStorage.setItem(storageKey, "true");
    } catch (e) {
      console.warn("Could not save walkthrough state to localStorage");
    }
    setShowWalkthrough(false);
  };

  const resetWalkthrough = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.warn("Could not reset walkthrough state in localStorage");
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
