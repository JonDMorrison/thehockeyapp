import { cn } from "@/lib/utils";
import type { TeamTier } from "../CoachOnboardingWizard";

interface TeamLevelStepProps {
  value: TeamTier;
  onChange: (tier: TeamTier) => void;
}

const TIERS: { tier: TeamTier; title: string; description: string }[] = [
  {
    tier: "rec",
    title: "Rec",
    description: "House league, beginner, or casual players",
  },
  {
    tier: "rep",
    title: "Rep",
    description: "Travel team, competitive, or select players",
  },
  {
    tier: "elite",
    title: "Elite",
    description: "AAA, high-performance, or academy players",
  },
];

export function TeamLevelStep({ value, onChange }: TeamLevelStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">What level is your team?</h1>
        <p className="text-muted-foreground">
          This adjusts targets automatically (shots, time, reps)
        </p>
      </div>

      <div className="space-y-3">
        {TIERS.map((option) => (
          <button
            key={option.tier}
            onClick={() => onChange(option.tier)}
            className={cn(
              "w-full p-4 rounded-xl border-2 text-left transition-all",
              "hover:border-primary/50",
              value === option.tier
                ? "border-primary bg-primary/5"
                : "border-border bg-card"
            )}
          >
            <h3 className="font-semibold text-lg">{option.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {option.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
