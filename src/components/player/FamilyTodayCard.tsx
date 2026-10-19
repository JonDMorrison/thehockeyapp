import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  Moon,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
export interface FamilyWorkout {
  title: string;
  source: string;
  href: string;
  completed: number;
  total: number;
  finished: boolean;
}
export function FamilyTodayCard({
  workout,
  loading,
  error,
  onRetry,
  teamName,
  restDay = false,
  playerId,
  homeAlsoReady = false,
}: {
  workout?: FamilyWorkout;
  loading?: boolean;
  error?: boolean;
  onRetry: () => void;
  teamName?: string;
  restDay?: boolean;
  playerId: string;
  homeAlsoReady?: boolean;
}) {
  const done = Boolean(workout?.finished);
  const completed = Math.min(workout?.completed ?? 0, workout?.total ?? 0);
  const total = workout?.total ?? 0;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  return (
    <section
      aria-label="Today’s workout"
      className={`relative flex h-full min-h-[300px] min-w-0 flex-col overflow-hidden rounded-2xl border p-5 sm:p-6 ${done ? "border-success/25 bg-success/[0.045]" : "border-primary/25 bg-card"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Dumbbell className="h-4 w-4 text-primary" />
          Today’s workout
        </p>
        <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-xs text-muted-foreground">
          {workout?.source ?? (teamName ? "Team training" : "Home training")}
        </span>
      </div>
      {loading ? (
        <p role="status" className="my-8 text-sm text-muted-foreground">
          Finding today’s workout…
        </p>
      ) : error ? (
        <div role="alert" className="my-6">
          <h2 className="text-lg font-semibold">
            Today’s workout couldn’t load
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your saved work is still there. Try loading it again.
          </p>
          <Button variant="outline" className="mt-4" onClick={onRetry}>
            Retry today’s workout
          </Button>
        </div>
      ) : workout ? (
        <>
          <div className="my-5 flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 sm:h-24 sm:w-24">
              <svg
                aria-hidden="true"
                viewBox="0 0 100 100"
                className="h-full w-full -rotate-90"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={done ? "hsl(var(--success))" : "hsl(var(--primary))"}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${percent * 2.64} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {done ? (
                  <CheckCircle2 className="h-8 w-8 text-success" />
                ) : (
                  <>
                    <span className="font-display text-2xl font-bold tabular-nums">
                      {completed}
                      <span className="text-base text-muted-foreground">
                        /{total}
                      </span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      activities
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
                {done ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    That’s a win
                  </>
                ) : completed > 0 ? (
                  "Keep it going"
                ) : (
                  "Your next small win"
                )}
              </p>
              <h2 className="break-words font-display text-2xl font-bold leading-tight">
                {done ? "You did it!" : workout.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {done
                  ? "Great effort. Take a breath and enjoy the win."
                  : total === 0
                    ? "Open your workout to see the plan."
                    : completed === total
                      ? "All activities checked. Open your workout to finish."
                      : "One activity at a time. Every bit of practice counts."}
              </p>
            </div>
          </div>
          <div className="mb-4 text-xs text-muted-foreground">
            {done
              ? `${total} activities · workout complete`
              : `${completed} of ${total} activities checked`}
          </div>
          <Button
            asChild
            className="mt-auto min-h-12 w-full sm:w-auto sm:self-start"
            variant={done ? "outline" : "default"}
          >
            <Link to={workout.href}>
              {done
                ? "View workout"
                : total > 0 && completed === total
                  ? "Finish workout"
                  : completed > 0
                    ? "Continue workout"
                    : "Start workout"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-start">
          <span className="mb-3 mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {restDay ? (
              <Moon className="h-6 w-6" />
            ) : (
              <Dumbbell className="h-6 w-6" />
            )}
          </span>
          <h2 className="font-display text-2xl font-bold">
            {restDay
              ? "Recovery counts, too"
              : "A little hockey goes a long way"}
          </h2>
          <p className="mb-5 mt-2 text-sm leading-6 text-muted-foreground">
            {restDay
              ? "It’s game day, with no team workout published for today. Rest up and have fun."
              : teamName
                ? "No team workout is published for today. You can still choose a home workout."
                : "Pick a home workout and find your next small win."}
          </p>
          <Button asChild className="mt-auto min-h-11" variant="outline">
            <Link to={`/solo/today/${playerId}`}>
              Choose a home workout
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
      {homeAlsoReady && !error && !loading && (
        <Link
          className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
          to={`/solo/today/${playerId}`}
        >
          Home workout also ready
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </section>
  );
}
