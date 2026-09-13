import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ChevronRight, Clock, Dumbbell, Flame, Trophy } from "lucide-react";
import { useTodaySnapshot } from "@/hooks/useTodaySnapshot";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerGoalWidget } from "@/components/goals/PlayerGoalWidget";

interface TeamAssignmentsSectionProps {
  playerId: string;
  teamId: string;
  teamName: string;
  streakData?: { currentStreak: number; bestStreak: number } | null;
  compact?: boolean;
}

export function TeamAssignmentsSection({ playerId, teamId, teamName, streakData }: TeamAssignmentsSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { snapshot, isLoading } = useTodaySnapshot(playerId);
  const currentStreak = streakData?.currentStreak ?? 0;
  const bestStreak = streakData?.bestStreak ?? 0;
  const completed = snapshot?.progress?.completed ?? 0;
  const total = snapshot?.progress?.total_required ?? 0;
  const sessionComplete = snapshot?.has_card && total > 0 && completed === total;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (isLoading) {
    return <Skeleton className="h-44 w-full rounded-xl" />;
  }

  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={() => navigate(`/players/${playerId}/today`)}
        className={`group relative w-full overflow-hidden rounded-xl border p-5 text-left transition duration-150 active:scale-[0.995] sm:p-6 ${
          sessionComplete
            ? "border-success/25 bg-success/[0.06] hover:border-success/40"
            : snapshot?.has_card
              ? "border-primary/35 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_40%),hsl(var(--card))] hover:border-primary/55"
              : "border-border bg-card hover:border-primary/30"
        }`}
      >
        <div className="flex items-start gap-4">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${sessionComplete ? "bg-success/12 text-success" : snapshot?.has_card ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"}`}>
            {sessionComplete ? <CheckCircle2 className="h-6 w-6" /> : snapshot?.has_card ? <Dumbbell className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Today · {teamName}</span>
            <span className="mt-1 block font-display text-2xl font-black uppercase leading-tight">
              {snapshot?.has_card
                ? sessionComplete
                  ? t("players.teamAssignments.completed")
                  : t("players.teamAssignments.nOfMTasks", { n: completed, m: total })
                : snapshot?.mode === "gameday"
                  ? t("players.teamAssignments.gameDayRest")
                  : t("players.teamAssignments.noWorkout")}
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {snapshot?.has_card ? (sessionComplete ? "Nice work. Come back tomorrow." : "Your next task is ready.") : "Check again when your coach publishes the plan."}
            </span>
          </span>
          <ChevronRight className="mt-3 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>

        {snapshot?.has_card && total > 0 && (
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full transition-all duration-500 ${sessionComplete ? "bg-success" : "bg-primary"}`} style={{ width: `${progress}%` }} />
          </div>
        )}
      </button>

      {(currentStreak > 0 || bestStreak > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {currentStreak > 0 && (
            <span className="flex min-h-9 items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-3 text-sm font-semibold text-primary">
              <Flame className="h-4 w-4" /> {t("players.teamAssignments.dayTeamStreak", { n: currentStreak })}
            </span>
          )}
          {bestStreak > currentStreak && (
            <span className="flex min-h-9 items-center gap-1.5 rounded-md bg-muted px-3 text-xs font-medium text-muted-foreground">
              <Trophy className="h-3.5 w-3.5 text-primary" /> {t("players.teamAssignments.best", { n: bestStreak })}
            </span>
          )}
        </div>
      )}

      <PlayerGoalWidget teamId={teamId} />
    </section>
  );
}
