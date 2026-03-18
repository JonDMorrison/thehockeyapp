import React from "react";
import { useNavigate } from "react-router-dom";
import { useTodaySnapshot } from "@/hooks/useTodaySnapshot";
import { AppCard, AppCardTitle } from "@/components/app/AppCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "@/components/app/Tag";
import { PlayerGoalWidget } from "@/components/goals/PlayerGoalWidget";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  Dumbbell,
  CheckCircle,
  Clock,
  Flame,
  Trophy,
  Users,
} from "lucide-react";

interface TeamAssignmentsSectionProps {
  playerId: string;
  teamId: string;
  teamName: string;
  streakData?: { currentStreak: number; bestStreak: number } | null;
  compact?: boolean;
}

export const TeamAssignmentsSection: React.FC<TeamAssignmentsSectionProps> = ({
  playerId,
  teamId,
  teamName,
  streakData,
  compact = false,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { snapshot: todaySnapshot, isLoading: snapshotLoading } = useTodaySnapshot(playerId);

  const currentStreak = streakData?.currentStreak ?? 0;
  const bestStreak = streakData?.bestStreak ?? 0;

  if (snapshotLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-team-primary/10 flex items-center justify-center">
          <Users className="w-4 h-4 text-team-primary" />
        </div>
        <div>
          <h3 className="font-bold text-base">{t("players.teamAssignments.title")}</h3>
          <p className="text-xs text-muted-foreground">{teamName}</p>
        </div>
      </div>

      {/* Today's Team Card */}
      {todaySnapshot?.success && (
        <AppCard
          className="cursor-pointer hover:shadow-medium transition-shadow"
          onClick={() => navigate(`/players/${playerId}/today`)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  todaySnapshot.has_card
                    ? todaySnapshot.progress?.completed ===
                        todaySnapshot.progress?.total_required &&
                      (todaySnapshot.progress?.total_required ?? 0) > 0
                      ? "bg-success/10"
                      : "bg-team-primary/10"
                    : "bg-surface-muted"
                }`}
              >
                {todaySnapshot.has_card ? (
                  todaySnapshot.progress?.completed ===
                    todaySnapshot.progress?.total_required &&
                  (todaySnapshot.progress?.total_required ?? 0) > 0 ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <Dumbbell className="w-5 h-5 text-team-primary" />
                  )
                ) : (
                  <Clock className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-medium">
                  {t("players.teamAssignments.todayWorkout")}
                </p>
                {todaySnapshot.has_card ? (
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">
                      {todaySnapshot.progress?.completed ===
                        todaySnapshot.progress?.total_required &&
                      (todaySnapshot.progress?.total_required ?? 0) > 0
                        ? t("players.teamAssignments.completed")
                        : t("players.teamAssignments.nOfMTasks", {
                            n: todaySnapshot.progress?.completed || 0,
                            m: todaySnapshot.progress?.total_required || 0,
                          })}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {todaySnapshot.mode === "gameday"
                      ? t("players.teamAssignments.gameDayRest")
                      : t("players.teamAssignments.noWorkout")}
                  </p>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
          {todaySnapshot.has_card &&
            (todaySnapshot.progress?.total_required ?? 0) > 0 && (
              <div className="mt-3 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    todaySnapshot.progress?.completed ===
                    todaySnapshot.progress?.total_required
                      ? "bg-success"
                      : "bg-team-primary"
                  }`}
                  style={{
                    width: `${Math.round(((todaySnapshot.progress?.completed ?? 0) / (todaySnapshot.progress?.total_required ?? 1)) * 100)}%`,
                  }}
                />
              </div>
            )}
        </AppCard>
      )}

      {/* Team Streak */}
      {(currentStreak > 0 || bestStreak > 0) && (
        <div className="flex items-center gap-3">
          {currentStreak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20">
              <Flame className="w-4 h-4 text-orange-500" />
               <span className="text-sm font-semibold text-orange-600">
                 {t("players.teamAssignments.dayTeamStreak", { n: currentStreak })}
              </span>
            </div>
          )}
          {bestStreak > 0 && bestStreak > currentStreak && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Trophy className="w-3 h-3 text-amber-500" />
              <span className="text-xs font-medium text-amber-600">
                {t("players.teamAssignments.best", { n: bestStreak })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Team Goals */}
      <PlayerGoalWidget teamId={teamId} />
    </div>
  );
};
