import { cn } from "@/lib/utils";
import { Target, Scale, Rocket } from "lucide-react";
import type { TrainingMode } from "../CoachOnboardingWizard";

interface TrainingModeStepProps {
  value: TrainingMode;
  onChange: (mode: TrainingMode) => void;
}

const OPTIONS: { mode: TrainingMode; icon: React.ReactNode; title: string; description: string; tag?: string }[] = [
  {
    mode: "shooting_only",
    icon: <Target className="h-8 w-8" />,
    title: "Just shooting",
    description: "Track shots and simple daily reps. Minimal setup.",
  },
  {
    mode: "balanced",
    icon: <Scale className="h-8 w-8" />,
    title: "Balanced training",
    description: "Shooting + light conditioning + mobility. Most teams choose this.",
    tag: "Recommended",
  },
  {
    mode: "performance",
    icon: <Rocket className="h-8 w-8" />,
    title: "Performance-focused",
    description: "Higher volume. Conditioning + recovery included. Best for Rep/Elite teams.",
  },
];

export function TrainingModeStep({ value, onChange }: TrainingModeStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">How do you want to use this app?</h1>
        <p className="text-muted-foreground">
          Choose a training style that fits your team
        </p>
      </div>

      <div className="space-y-3">
        {OPTIONS.map((option) => (
          <button
            key={option.mode}
            onClick={() => onChange(option.mode)}
            className={cn(
              "w-full p-4 rounded-xl border-2 text-left transition-all",
              "hover:border-primary/50 hover:bg-accent/50",
              value === option.mode
                ? "border-primary bg-primary/5"
                : "border-border bg-card"
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn(
                "p-3 rounded-lg",
                value === option.mode ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{option.title}</h3>
                  {option.tag && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {option.tag}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {option.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
