import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURE_LABELS, type EntitlementKey } from "@/core/entitlements";

interface UpgradePromptProps {
  feature: EntitlementKey;
  onUpgrade?: () => void;
  compact?: boolean;
}

/**
 * Reusable paywall prompt shown when a free-tier user
 * tries to access a gated feature.
 */
export function UpgradePrompt({ feature, onUpgrade, compact }: UpgradePromptProps) {
  const label = FEATURE_LABELS[feature];

  if (compact) {
    return (
      <button
        onClick={onUpgrade}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <Lock className="h-3 w-3" />
        <span>Upgrade to unlock {label}</span>
      </button>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
      <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <h3 className="font-semibold text-foreground">{label}</h3>
      <p className="text-sm text-muted-foreground">
        Upgrade to Pro to unlock {label.toLowerCase()} and take your training to the next level.
      </p>
      <Button onClick={onUpgrade} className="mt-2">
        Upgrade to Pro — $15/mo
      </Button>
    </div>
  );
}
