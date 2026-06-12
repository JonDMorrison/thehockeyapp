import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveView } from "@/contexts/ActiveViewContext";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard } from "@/components/app/AppCard";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  isSameDay,
  parseISO,
} from "date-fns";
import { Check, Circle, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

interface PracticeTaskRef {
  id: string;
}

interface WeekCard {
  id: string;
  date: string;
  title: string | null;
  practice_tasks: PracticeTaskRef[] | null;
}

interface SessionCompletionRow {
  practice_card_id: string;
  status: string;
}

interface TaskCompletionRow {
  practice_task_id: string;
  completed: boolean;
}

interface DaySummary {
  date: Date;
  dateStr: string;
  isToday: boolean;
  card: WeekCard | null;
  total: number;
  done: number;
  sessionComplete: boolean;
}

const PlayerWeek: React.FC = () => {
  const { t } = useTranslation();
  const { id: playerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setActiveView, setActivePlayerId } = useActiveView();
  const { setTeamTheme } = useTeamTheme();

  // State holds the current week's Monday
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Resolve player's active team (mirror PlayerToday)
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ["player-active-team", playerId],
    queryFn: async () => {
      const { data: pref } = await supabase
        .from("player_team_preferences")
        .select("active_team_id")
        .eq("player_id", playerId!)
        .maybeSingle();

      if (!pref?.active_team_id) return null;

      const { data: team, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", pref.active_team_id)
        .single();

      if (error) throw error;
      return team;
    },
    enabled: !!user && !!playerId,
  });

  // Apply team theme and persist context
  useEffect(() => {
    if (teamData?.palette_id) {
      setTeamTheme(teamData.palette_id);
    }
    if (playerId) {
      setActiveView("parent");
      setActivePlayerId(playerId);
    }
  }, [teamData?.palette_id, setTeamTheme, playerId, setActiveView, setActivePlayerId]);

  // Fetch published team cards for the week with their task ids
  const { data: cards, isLoading: cardsLoading } = useQuery<WeekCard[]>({
    queryKey: ["week-cards", teamData?.id, weekStartStr, weekEndStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("practice_cards")
        .select("id, date, title, practice_tasks(id)")
        .eq("team_id", teamData!.id)
        .eq("program_source", "team")
        .gte("date", weekStartStr)
        .lte("date", weekEndStr)
        .not("published_at", "is", null);

      if (error) throw error;
      return (data || []) as WeekCard[];
    },
    enabled: !!teamData?.id,
  });

  const cardIds = useMemo(() => (cards || []).map((c) => c.id), [cards]);
  const taskIds = useMemo(
    () => (cards || []).flatMap((c) => (c.practice_tasks || []).map((task) => task.id)),
    [cards]
  );

  // Session completions for those cards
  const { data: sessionCompletions } = useQuery<SessionCompletionRow[]>({
    queryKey: ["week-session-completions", playerId, cardIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_completions")
        .select("practice_card_id, status")
        .eq("player_id", playerId!)
        .in("practice_card_id", cardIds);

      if (error) throw error;
      return (data || []) as SessionCompletionRow[];
    },
    enabled: !!playerId && cardIds.length > 0,
  });

  // Task completions for the tasks on those cards
  const { data: taskCompletions } = useQuery<TaskCompletionRow[]>({
    queryKey: ["week-task-completions", playerId, taskIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_completions")
        .select("practice_task_id, completed")
        .eq("player_id", playerId!)
        .in("practice_task_id", taskIds);

      if (error) throw error;
      return (data || []) as TaskCompletionRow[];
    },
    enabled: !!playerId && taskIds.length > 0,
  });

  const today = new Date();

  const days: DaySummary[] = useMemo(() => {
    const cardByDate = new Map<string, WeekCard>();
    (cards || []).forEach((c) => cardByDate.set(c.date, c));

    const sessionByCard = new Map<string, string>();
    (sessionCompletions || []).forEach((s) =>
      sessionByCard.set(s.practice_card_id, s.status)
    );

    const completedTaskIds = new Set(
      (taskCompletions || []).filter((tc) => tc.completed).map((tc) => tc.practice_task_id)
    );

    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(weekStart, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const card = cardByDate.get(dateStr) || null;
      const cardTaskIds = card?.practice_tasks?.map((task) => task.id) || [];
      const total = cardTaskIds.length;
      const done = cardTaskIds.filter((tid) => completedTaskIds.has(tid)).length;
      const sessionComplete = card ? sessionByCard.get(card.id) === "complete" : false;

      return {
        date,
        dateStr,
        isToday: isSameDay(date, today),
        card,
        total,
        done,
        sessionComplete,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, sessionCompletions, taskCompletions, weekStart]);

  const isLoading = authLoading || teamLoading || cardsLoading;

  const rangeLabel = t("playerWeek.weekOf", {
    start: format(weekStart, "MMM d"),
    end: format(weekEnd, "MMM d"),
  });

  // Renders the completion indicator for a day
  const renderIndicator = (day: DaySummary) => {
    if (!day.card) return null;
    const allDone = day.sessionComplete || (day.total > 0 && day.done >= day.total);
    if (allDone) {
      return <Check className="w-5 h-5 text-success" aria-label={t("playerWeek.complete")} />;
    }
    if (day.done > 0) {
      return (
        <span className="text-sm font-semibold text-team-primary tabular-nums">
          {day.done}/{day.total}
        </span>
      );
    }
    return <Circle className="w-5 h-5 text-text-muted" aria-label={t("playerWeek.notStarted")} />;
  };

  const handleDayClick = (day: DaySummary) => {
    // v1 fallback: only today (with a card) navigates to PlayerToday
    if (day.isToday && day.card) {
      navigate(`/players/${playerId}/today`);
    }
  };

  const header = (
    <div className="flex items-center gap-3 w-full">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => navigate(`/players/${playerId}/home`)}
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold truncate">{t("playerWeek.title")}</h1>
        {teamData && (
          <span className="text-xs text-text-muted truncate">{teamData.name}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("playerWeek.prevWeek")}
          onClick={() => setWeekStart((w) => subWeeks(w, 1))}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("playerWeek.nextWeek")}
          onClick={() => setWeekStart((w) => addWeeks(w, 1))}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <AppShell hideNav header={header}>
        <PageContainer className="space-y-2">
          <SkeletonCard className="h-12" />
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonCard key={i} className="h-16" />
          ))}
        </PageContainer>
      </AppShell>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const dayContent = (day: DaySummary) => {
    const interactive = day.isToday && !!day.card;
    return (
      <AppCard
        key={day.dateStr}
        className={[
          "transition-colors h-full",
          day.isToday ? "border-team-primary border-2" : "",
          interactive ? "cursor-pointer hover:shadow-medium" : "cursor-default",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={interactive ? () => handleDayClick(day) : undefined}
      >
        {/* Stacked row on mobile, compact column cell on md+ */}
        <div className="flex items-center justify-between gap-3 md:flex-col md:items-start md:gap-2">
          <div className="flex-1 min-w-0 md:flex-none md:w-full">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {format(day.date, "EEE d")}
              </span>
              {day.isToday && (
                <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-team-primary/10 text-team-primary">
                  {t("playerWeek.today")}
                </span>
              )}
            </div>
            {day.card ? (
              <>
                <p className="text-sm text-text-secondary truncate mt-1">
                  {day.card.title || t("playerWeek.untitled")}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {t("playerWeek.taskCount", { count: day.total })}
                </p>
              </>
            ) : (
              <p className="text-sm text-text-muted italic mt-1">
                {t("playerWeek.restDay")}
              </p>
            )}
          </div>
          {day.card && (
            <div className="flex-shrink-0 flex items-center">
              {renderIndicator(day)}
            </div>
          )}
        </div>
      </AppCard>
    );
  };

  return (
    <AppShell hideNav header={header}>
      <Helmet>
        <title>This Week | Hockey App</title>
      </Helmet>
      <PageContainer>
        <div className="flex items-center justify-center mb-4">
          <span className="text-sm font-medium text-text-secondary">{rangeLabel}</span>
        </div>

        {/* Mobile: stacked rows. md+: 7-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {days.map((day) => dayContent(day))}
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default PlayerWeek;
