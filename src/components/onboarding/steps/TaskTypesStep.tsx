import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Check, Target, Activity, Flame, Heart, Brain } from "lucide-react";
import type { TaskType } from "../CoachOnboardingWizard";

interface TaskTypesStepProps {
  value: TaskType[];
  onChange: (types: TaskType[]) => void;
}

const TASK_OPTIONS: { type: TaskType; icon: React.ReactNode; titleKey: string; descriptionKey: string; required?: boolean }[] = [
  {
    type: "shooting",
    icon: <Target className="h-5 w-5" />,
    titleKey: "welcome.taskTypes.shootingTitle",
    descriptionKey: "welcome.taskTypes.shootingDescription",
    required: true,
  },
  {
    type: "mobility",
    icon: <Activity className="h-5 w-5" />,
    titleKey: "welcome.taskTypes.mobilityTitle",
    descriptionKey: "welcome.taskTypes.mobilityDescription",
  },
  {
    type: "conditioning",
    icon: <Flame className="h-5 w-5" />,
    titleKey: "welcome.taskTypes.conditioningTitle",
    descriptionKey: "welcome.taskTypes.conditioningDescription",
  },
  {
    type: "recovery",
    icon: <Heart className="h-5 w-5" />,
    titleKey: "welcome.taskTypes.recoveryTitle",
    descriptionKey: "welcome.taskTypes.recoveryDescription",
  },
  {
    type: "prep",
    icon: <Brain className="h-5 w-5" />,
    titleKey: "welcome.taskTypes.prepTitle",
    descriptionKey: "welcome.taskTypes.prepDescription",
  },
];

export function TaskTypesStep({ value, onChange }: TaskTypesStepProps) {
  const { t } = useTranslation();

  const toggleType = (type: TaskType) => {
    if (type === "shooting") return; // Can't remove shooting

    if (value.includes(type)) {
      // Ensure at least one type remains
      if (value.length > 1) {
        onChange(value.filter((t) => t !== type));
      }
    } else {
      onChange([...value, type]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">{t("welcome.taskTypes.title")}</h1>
        <p className="text-muted-foreground">
          {t("welcome.taskTypes.subtitle")}
        </p>
      </div>

      <div className="space-y-2">
        {TASK_OPTIONS.map((option) => {
          const isSelected = value.includes(option.type);
          const isRequired = option.required;

          return (
            <button
              key={option.type}
              onClick={() => toggleType(option.type)}
              disabled={isRequired}
              aria-disabled={isRequired ? "true" : undefined}
              className={cn(
                "w-full p-4 rounded-xl border-2 text-left transition-all",
                "flex items-center gap-4",
                isRequired && "cursor-not-allowed",
                !isRequired && "hover:border-primary/50",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg",
                isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{t(option.titleKey)}</h3>
                  {isRequired && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {t("welcome.taskTypes.requiredBadge")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t(option.descriptionKey)}
                </p>
                {isRequired && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    {t("welcome.taskTypes.shootingAlwaysIncluded")}
                  </p>
                )}
              </div>
              <div className={cn(
                "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                isSelected
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-muted-foreground/30"
              )}>
                {isSelected && <Check className="h-4 w-4" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
