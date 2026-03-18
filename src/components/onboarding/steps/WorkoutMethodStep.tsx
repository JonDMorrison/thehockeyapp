import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Bot, Pencil } from "lucide-react";

interface WorkoutMethodStepProps {
  value: boolean;
  onChange: (useAi: boolean) => void;
}

const OPTIONS: { useAi: boolean; icon: React.ReactNode; titleKey: string; descriptionKey: string; tagKey?: string }[] = [
  {
    useAi: true,
    icon: <Bot className="h-8 w-8" />,
    titleKey: "welcome.workoutMethod.aiTitle",
    descriptionKey: "welcome.workoutMethod.aiDescription",
    tagKey: "welcome.trainingMode.recommendedTag",
  },
  {
    useAi: false,
    icon: <Pencil className="h-8 w-8" />,
    titleKey: "welcome.workoutMethod.manualTitle",
    descriptionKey: "welcome.workoutMethod.manualDescription",
  },
];

export function WorkoutMethodStep({ value, onChange }: WorkoutMethodStepProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">{t("welcome.workoutMethod.title")}</h1>
        <p className="text-muted-foreground">
          {t("welcome.workoutMethod.subtitle")}
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
                  <h3 className="font-semibold">{t(option.titleKey)}</h3>
                  {option.tagKey && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {t(option.tagKey)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t(option.descriptionKey)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
