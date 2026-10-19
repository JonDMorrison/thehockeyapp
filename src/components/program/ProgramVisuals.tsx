import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Moon,
  Target,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DAY_TEMPLATES,
  THEME_SCHEDULES,
  WEEK_THEMES,
  type WeekThemeId,
} from "@/lib/weekTemplates";
import { SetupProgress } from "@/components/onboarding/SetupProgress";

export function ProgramProgress({ step }: { step: number }) {
  return (
    <SetupProgress
      step={step}
      labels={["Choose plan", "Customize", "Invite"]}
    />
  );
}
export function ProgramPlans({
  onSelect,
}: {
  onSelect: (id: WeekThemeId) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[...WEEK_THEMES]
        .sort(
          (a, b) => Number(b.id === "balanced") - Number(a.id === "balanced"),
        )
        .map((theme) => {
          const schedule = THEME_SCHEDULES[theme.id];
          const training = schedule.filter((id) => id !== "rest_day");
          const minutes = training.reduce(
            (sum, id) =>
              sum +
              (DAY_TEMPLATES.find((d) => d.id === id)?.estimatedMinutes || 0),
            0,
          );
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelect(theme.id)}
              aria-label={theme.title}
              className="group rounded-2xl border border-white/10 bg-gradient-to-b from-card to-background p-5 text-left hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-xl font-bold">
                  {theme.title}
                </span>
                {theme.id === "balanced" && (
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                    All-round
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {theme.description}
              </p>
              <div aria-hidden="true" className="my-5 grid grid-cols-7 gap-1">
                {schedule.map((id, i) => (
                  <div
                    key={i}
                    className={`flex h-10 items-center justify-center rounded-md text-[10px] font-semibold ${id === "rest_day" ? "border border-dashed border-white/10 text-muted-foreground" : "bg-primary/15 text-primary"}`}
                  >
                    {["M", "T", "W", "T", "F", "S", "S"][i]}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                <span className="text-muted-foreground">
                  {training.length} training days · {minutes} min / week
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1"
                />
              </div>
            </button>
          );
        })}
    </div>
  );
}
export interface VisualDay {
  date: string;
  title: string;
  tasks: { label: string; task_type: string; shots_expected?: number | null }[];
}
export function ProgramWeek({
  days,
  onEdit,
}: {
  days: VisualDay[];
  onEdit?: (index: number) => void;
}) {
  return (
    <div className="space-y-2">
      {days.map((day, i) => {
        const rest = day.tasks.length === 0;
        const Icon = rest
          ? Moon
          : day.tasks.some((t) => t.task_type === "shooting")
            ? Target
            : CalendarDays;
        const content = (
          <>
            <span className="flex w-10 shrink-0 flex-col items-center text-muted-foreground">
              <span className="text-[10px] uppercase">
                {format(parseISO(day.date), "EEE")}
              </span>
              <span className="text-lg font-bold text-foreground">
                {format(parseISO(day.date), "d")}
              </span>
            </span>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${rest ? "bg-white/5 text-muted-foreground" : "bg-primary/10 text-primary"}`}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block break-words text-sm font-semibold ${rest ? "text-muted-foreground" : "text-foreground"}`}
              >
                {rest ? "Rest & recharge" : day.title || "Training day"}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {rest
                  ? onEdit
                    ? "Tap to add training"
                    : "Recovery is part of the plan"
                  : day.tasks
                      .slice(0, 2)
                      .map((t) => t.label)
                      .join(" · ")}
              </span>
            </span>
            {onEdit && (
              <ChevronRight
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-muted-foreground"
              />
            )}
          </>
        );
        const cls = `flex w-full items-center gap-3 rounded-xl border p-3 text-left ${rest ? "border-dashed border-white/10 bg-background" : "border-white/10 bg-card"}`;
        return onEdit ? (
          <button
            key={day.date}
            type="button"
            aria-label={`Edit ${format(parseISO(day.date), "EEEE")}`}
            className={`${cls} hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
            onClick={() => onEdit(i)}
          >
            {content}
          </button>
        ) : (
          <div key={day.date} className={cls}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
export function ProgramAction({
  label,
  onClick,
  disabled,
  busy,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
      <div className="mx-auto max-w-3xl">
        <Button
          className="min-h-12 w-full"
          disabled={disabled || busy}
          onClick={onClick}
        >
          {busy ? "Saving your plan…" : label}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
