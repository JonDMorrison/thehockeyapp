import type { ReactNode } from "react";
import {
  CalendarPlus,
  CalendarRange,
  ChevronRight,
  Flame,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface PlanningHubCardsProps {
  teamId: string;
  onAddWorkout: () => void;
  onPlanWeek: () => void;
  onCreateProgram: () => void;
  onStartChallenge: () => void;
  weekPlanCount?: number;
  showQuickWorkout?: boolean;
  compact?: boolean;
}

interface PlanningCardProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  badge?: string;
  primary?: boolean;
  onClick: () => void;
}

function PlanningCard({
  title,
  subtitle,
  icon,
  badge,
  primary = false,
  onClick,
}: PlanningCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex min-h-28 w-full items-center gap-4 rounded-lg border p-4 text-left transition duration-150 active:scale-[0.99]",
        primary
          ? "border-primary/30 bg-primary/[0.06] hover:border-primary/60 hover:bg-primary/10"
          : "border-border bg-card hover:border-primary/35 hover:bg-primary/[0.035]",
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-md",
          primary ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em]",
            primary ? "text-muted-foreground" : "text-muted-foreground",
          )}
        >
          {badge || "Planning tool"}
        </span>
        <span className="mt-1 block font-display text-lg font-black uppercase leading-tight">
          {title}
        </span>
        <span
          className={cn(
            "mt-1 block text-xs leading-5",
            primary ? "text-muted-foreground" : "text-muted-foreground",
          )}
        >
          {subtitle}
        </span>
      </span>
      <ChevronRight
        className={cn(
          "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5",
          primary ? "text-muted-foreground" : "text-muted-foreground",
        )}
      />
    </button>
  );
}

export function PlanningHubCards({
  onAddWorkout,
  onPlanWeek,
  onCreateProgram,
  onStartChallenge,
  weekPlanCount = 0,
  showQuickWorkout = true,
  compact = false,
}: PlanningHubCardsProps) {
  const { t } = useTranslation();

  if (compact)
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {showQuickWorkout && (
          <PlanningCard
            title={t("practice.addWorkout")}
            subtitle="One workout. One day. Ready when you are."
            icon={<CalendarPlus className="h-5 w-5" />}
            badge="Quick session"
            onClick={onAddWorkout}
          />
        )}
        <PlanningCard
          title={t("practice.planTheWeek")}
          subtitle="Map out a balanced Monday–Sunday."
          icon={<CalendarRange className="h-5 w-5" />}
          badge="Weekly plan"
          onClick={onPlanWeek}
        />
        <PlanningCard
          title="Start a program"
          subtitle="Choose a plan and make it your team’s."
          icon={<Sparkles className="h-5 w-5" />}
          badge="Build consistency"
          onClick={onCreateProgram}
        />
        <details className="rounded-xl border border-border sm:col-span-2 xl:col-span-3">
          <summary className="cursor-pointer px-4 py-3 text-sm text-muted-foreground">
            More planning options
          </summary>
          <div className="p-3 pt-0">
            <PlanningCard
              title={t("practice.thirtyDayChallenge")}
              subtitle={t("practice.dailyExercisesFor30Days")}
              icon={<Flame className="h-5 w-5" />}
              badge="Build a habit"
              onClick={onStartChallenge}
            />
          </div>
        </details>
      </div>
    );

  return (
    <div className="space-y-3">
      {showQuickWorkout && (
        <PlanningCard
          title={t("practice.addWorkout")}
          subtitle={t("practice.oneWorkoutForOneDay")}
          icon={<CalendarPlus className="h-5 w-5" />}
          badge={
            weekPlanCount > 0
              ? t("practice.nThisWeek", { n: weekPlanCount })
              : "Fastest option"
          }
          primary
          onClick={onAddWorkout}
        />
      )}
      <details className="group overflow-hidden rounded-lg border border-border bg-card">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 font-semibold [&::-webkit-details-marker]:hidden">
          <span className="flex-1">More planning options</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
        </summary>
        <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
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
      </details>
    </div>
  );
}
