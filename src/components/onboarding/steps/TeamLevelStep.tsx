import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { TeamTier } from "../CoachOnboardingWizard";

interface TeamLevelStepProps {
  value: TeamTier;
  onChange: (tier: TeamTier) => void;
}

const TIERS: { tier: TeamTier; titleKey: string; descriptionKey: string }[] = [
  {
    tier: "rec",
    titleKey: "welcome.teamLevel.recTitle",
    descriptionKey: "welcome.teamLevel.recDescription",
  },
  {
    tier: "rep",
    titleKey: "welcome.teamLevel.repTitle",
    descriptionKey: "welcome.teamLevel.repDescription",
  },
  {
    tier: "elite",
    titleKey: "welcome.teamLevel.eliteTitle",
    descriptionKey: "welcome.teamLevel.eliteDescription",
  },
];

export function TeamLevelStep({ value, onChange }: TeamLevelStepProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">{t("welcome.teamLevel.title")}</h1>
        <p className="text-muted-foreground">
          {t("welcome.teamLevel.subtitle")}
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
            <h3 className="font-semibold text-lg">{t(option.titleKey)}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t(option.descriptionKey)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
