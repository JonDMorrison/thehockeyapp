import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Users, 
  CalendarSync, 
  Settings2, 
  CalendarPlus,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  cta: string;
}

interface OnboardingProgressProps {
  checklist: ChecklistItem[];
  playersCount: number;
  hasWorkouts: boolean;
  onAction: (itemId: string) => void;
}

interface ProgressStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  done: boolean;
  actionLabel: string;
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  checklist,
  playersCount,
  hasWorkouts,
  onAction,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Build the progress steps from checklist + derived state
  const steps: ProgressStep[] = [
    {
      id: "add_players",
      label: "Add your players",
      description: "Import or invite players to join your team",
      icon: Users,
      done: playersCount > 0 || checklist.find(i => i.id === "add_players")?.done || false,
      actionLabel: "Add Players",
    },
    {
      id: "connect_schedule",
      label: "Sync your calendar",
      description: "Connect TeamSnap, SportsEngine, or iCal",
      icon: CalendarSync,
      done: checklist.find(i => i.id === "connect_schedule")?.done || false,
      actionLabel: "Connect",
    },
    {
      id: "set_preferences",
      label: "Set training preferences",
      description: "Choose task types and training intensity",
      icon: Settings2,
      done: checklist.find(i => i.id === "set_preferences")?.done || false,
      actionLabel: "Set Up",
    },
    {
      id: "first_workout",
      label: "Create your first workout",
      description: "Add a workout or let AI build a program",
      icon: CalendarPlus,
      done: hasWorkouts,
      actionLabel: "Create",
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const totalCount = steps.length;
  const progressPercent = (completedCount / totalCount) * 100;
  const allComplete = completedCount === totalCount;

  // Don't show if all complete
  if (allComplete) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          {/* Mini progress ring */}
          <svg 
            className="absolute inset-0 w-10 h-10 -rotate-90"
            viewBox="0 0 40 40"
          >
            <circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-muted"
            />
            <circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${progressPercent * 1.13} 113`}
              strokeLinecap="round"
              className="text-primary transition-all duration-500"
            />
          </svg>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">
            Getting Started
          </p>
          <p className="text-sm text-muted-foreground">
            {completedCount} of {totalCount} steps complete
          </p>
        </div>

        <div className="flex-shrink-0 text-muted-foreground">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-colors",
                      step.done 
                        ? "bg-primary/5" 
                        : "bg-muted/50 hover:bg-muted"
                    )}
                  >
                    {/* Status indicator */}
                    <div className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                      step.done 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted-foreground/20 text-muted-foreground"
                    )}>
                      {step.done ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium text-sm",
                        step.done ? "text-muted-foreground line-through" : "text-foreground"
                      )}>
                        {step.label}
                      </p>
                      {!step.done && (
                        <p className="text-xs text-muted-foreground truncate">
                          {step.description}
                        </p>
                      )}
                    </div>

                    {/* Action button */}
                    {!step.done && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-shrink-0 h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAction(step.id);
                        }}
                      >
                        {step.actionLabel}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
