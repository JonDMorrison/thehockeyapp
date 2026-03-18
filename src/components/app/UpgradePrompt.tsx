import { Lock, Trophy, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURE_LABELS, type EntitlementKey } from "@/core/entitlements";
import { BETA_MODE } from "@/core/constants";
import { useTranslation } from "react-i18next";

type UpgradeContext =
  | "history_gate"      // Viewing history beyond 7 days
  | "ai_summary_gate"   // Accessing AI summary beyond preview
  | "team_ai_gate"      // Coach viewing roster AI summaries without plan
  | "team_milestone"    // Team hits a milestone
  | "generic";          // Default fallback

interface UpgradePromptProps {
  feature: EntitlementKey;
  onUpgrade?: () => void;
  compact?: boolean;
  /** Controls celebration-first copy and tone */
  context?: UpgradeContext;
  /** Optional stat to celebrate, e.g. "12 workouts completed" */
  celebrationStat?: string;
}

/**
 * Reusable upgrade prompt shown when a user
 * tries to access a gated feature.
 *
 * Supports celebration-first copy via `context` prop.
 */
export function UpgradePrompt({
  feature,
  onUpgrade,
  compact,
  context = "generic",
  celebrationStat,
}: UpgradePromptProps) {
  const { t } = useTranslation();
  const label = FEATURE_LABELS[feature];

  // During beta, all features are unlocked — don't show upgrade prompts
  if (BETA_MODE) return null;

  if (compact) {
    return (
      <button
        onClick={onUpgrade}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <Lock className="h-3 w-3" />
        <span>{t("common.upgradeToUnlock", { label })}</span>
      </button>
    );
  }

  const isTeamContext = context === "team_ai_gate" || context === "team_milestone";

  const nonTeamContexts: UpgradeContext[] = ["history_gate", "ai_summary_gate", "generic"];
  const safeContext = nonTeamContexts.includes(context) ? context : "generic";

  const headlineKey = isTeamContext
    ? `upgrade.${context}.headline`
    : `upgrade.${safeContext}.headline`;

  const bodyKey = isTeamContext
    ? `upgrade.${context}.body`
    : `upgrade.${safeContext}.body`;

  const ctaKey = isTeamContext
    ? `upgrade.${context}.cta`
    : `upgrade.${safeContext}.cta`;

  const Icon = isTeamContext ? Users : context === "history_gate" ? Trophy : Sparkles;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
      <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="h-6 w-6 text-primary" />
      </div>

      {celebrationStat && (
        <p className="text-sm font-medium text-primary">{celebrationStat}</p>
      )}

      <h3 className="font-semibold text-foreground">{t(headlineKey)}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        {t(bodyKey)}
      </p>
      <Button onClick={onUpgrade} className="mt-2">
        {t(ctaKey)}
      </Button>
      {!isTeamContext && (
        <p className="text-xs text-muted-foreground">
          {t("upgrade.trialFooter")}
        </p>
      )}
    </div>
  );
}
