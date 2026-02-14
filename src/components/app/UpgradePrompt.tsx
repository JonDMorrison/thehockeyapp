import { Lock, Trophy, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURE_LABELS, type EntitlementKey } from "@/core/entitlements";

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

/* ── Copy per context ── */

const PARENT_PRO_COPY: Record<
  Extract<UpgradeContext, "history_gate" | "ai_summary_gate" | "generic">,
  { headline: string; body: string; cta: string }
> = {
  history_gate: {
    headline: "You've been putting in the work.",
    body: "Unlock your full season history, structured programs, and AI-powered weekly summaries. Keep the momentum going.",
    cta: "Start 7-Day Free Trial",
  },
  ai_summary_gate: {
    headline: "Your weekly summary is ready.",
    body: "See what your child accomplished this week — trends, streaks, and coaching insights powered by AI.",
    cta: "Start 7-Day Free Trial",
  },
  generic: {
    headline: "Take training to the next level.",
    body: "Unlock full workout history, structured programs, and AI weekly summaries with Parent Pro.",
    cta: "Start 7-Day Free Trial",
  },
};

const TEAM_PLAN_COPY: Record<
  Extract<UpgradeContext, "team_ai_gate" | "team_milestone">,
  { headline: string; body: string; cta: string }
> = {
  team_ai_gate: {
    headline: "Your roster is training consistently.",
    body: "Give every family full Pro access — history, AI summaries, and structured programs — with one Team Plan. No parent pays individually.",
    cta: "Cover Your Team — $500/yr",
  },
  team_milestone: {
    headline: "Your team just hit a milestone.",
    body: "This is what accountability looks like. Give every family the tools to keep going — full history, AI insights, and zero individual fees.",
    cta: "Cover Your Team — $500/yr",
  },
};

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

  const isTeamContext = context === "team_ai_gate" || context === "team_milestone";
  const copy = isTeamContext
    ? TEAM_PLAN_COPY[context as keyof typeof TEAM_PLAN_COPY]
    : PARENT_PRO_COPY[(context in PARENT_PRO_COPY ? context : "generic") as keyof typeof PARENT_PRO_COPY];

  const Icon = isTeamContext ? Users : context === "history_gate" ? Trophy : Sparkles;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
      <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="h-6 w-6 text-primary" />
      </div>

      {celebrationStat && (
        <p className="text-sm font-medium text-primary">{celebrationStat}</p>
      )}

      <h3 className="font-semibold text-foreground">{copy.headline}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        {copy.body}
      </p>
      <Button onClick={onUpgrade} className="mt-2">
        {copy.cta}
      </Button>
      {!isTeamContext && (
        <p className="text-xs text-muted-foreground">
          $15/month after trial · Cancel anytime
        </p>
      )}
    </div>
  );
}
