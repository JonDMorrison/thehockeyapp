import type { ReactNode } from "react";
import { CalendarPlus, CalendarRange, ChevronRight, Flame, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface PlanningHubCardsProps {
  teamId: string;
  onAddWorkout: () => void;
  onPlanWeek: () => void;
  onCreateProgram: () => void;
  onStartChallenge: () => void;
  weekPlanCount?: number;
}

interface PlanningCardProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  badge?: string;
  primary?: boolean;
  onClick: () => void;
}

function PlanningCard({ title, subtitle, icon, badge, primary = false, onClick }: PlanningCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex min-h-28 w-full items-center gap-4 rounded-lg border p-4 text-left transition duration-150 active:scale-[0.99]",
        primary
          ? "border-primary bg-primary text-white shadow-[0_12px_30px_hsl(var(--primary)/0.2)] hover:bg-brand-strong"
          : "border-border bg-card hover:border-primary/35 hover:bg-primary/[0.035]",
      )}
    >
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-md", primary ? "bg-black/15" : "bg-primary/10 text-primary")}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em]", primary ? "text-white/65" : "text-muted-foreground")}>
          {badge || "Planning tool"}
        </span>
        <span className="mt-1 block font-display text-lg font-black uppercase leading-tight">{title}</span>
        <span className={cn("mt-1 block text-xs leading-5", primary ? "text-white/70" : "text-muted-foreground")}>{subtitle}</span>
      </span>
      <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5", primary ? "text-white/70" : "text-muted-foreground")} />
    </button>
  );
}

export function PlanningHubCards({
  onAddWorkout,
  onPlanWeek,
  onCreateProgram,
  onStartChallenge,
  weekPlanCount = 0,
}: PlanningHubCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <PlanningCard
        title={t("practice.addWorkout")}
        subtitle={t("practice.oneWorkoutForOneDay")}
        icon={<CalendarPlus className="h-5 w-5" />}
        badge={weekPlanCount > 0 ? t("practice.nThisWeek", { n: weekPlanCount }) : "Fastest option"}
        primary
        onClick={onAddWorkout}
      />
      <PlanningCard
        title={t("practice.planTheWeek")}
        subtitle={t("practice.setUpMonSunReuseIt")}
        icon={<CalendarRange className="h-5 w-5" />}
        badge="Full week"
        onClick={onPlanWeek}
      />
      <PlanningCard
        title={t("practice.thirtyDayChallenge")}
        subtitle={t("practice.dailyExercisesFor30Days")}
        icon={<Flame className="h-5 w-5" />}
        badge="Build a habit"
        onClick={onStartChallenge}
      />
      <PlanningCard
        title={t("practice.createAProgram")}
        subtitle={t("practice.aiBuilds4To8Weeks")}
        icon={<Sparkles className="h-5 w-5" />}
        badge="Guided setup"
        onClick={onCreateProgram}
      />
    </div>
  );
}
