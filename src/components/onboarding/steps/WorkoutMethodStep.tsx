import { cn } from "@/lib/utils";
import { Bot, Pencil } from "lucide-react";

interface WorkoutMethodStepProps {
  value: boolean;
  onChange: (useAi: boolean) => void;
}

const OPTIONS = [
  {
    useAi: true,
    icon: <Bot className="h-8 w-8" />,
    title: "Help me build them with AI",
    description: "Generates drafts based on your preferences. You review and publish.",
    tag: "Recommended",
  },
  {
    useAi: false,
    icon: <Pencil className="h-8 w-8" />,
    title: "I'll build them myself",
    description: "Use the manual workout builder only.",
  },
];

export function WorkoutMethodStep({ value, onChange }: WorkoutMethodStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">How do you want to create workouts?</h1>
        <p className="text-muted-foreground">
          You can always change your mind later
        </p>
      </div>

      <div className="space-y-3">
        {OPTIONS.map((option) => (
          <button
            key={String(option.useAi)}
            onClick={() => onChange(option.useAi)}
            className={cn(
              "w-full p-4 rounded-xl border-2 text-left transition-all",
              "hover:border-primary/50 hover:bg-accent/50",
              value === option.useAi
                ? "border-primary bg-primary/5"
                : "border-border bg-card"
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn(
                "p-3 rounded-lg",
                value === option.useAi ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
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
