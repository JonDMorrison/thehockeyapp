import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard } from "@/components/app/AppCard";
import { DataLoadError } from "@/components/app/DataLoadError";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/app/Skeleton";
import { format, parseISO, addDays } from "date-fns";
import {
  ChevronLeft,
  Calendar,
  Check,
  Clock,
  Target,
  House,
  Users,
  Loader2,
} from "lucide-react";
import { Helmet } from "react-helmet-async";

interface HistoryEntry {
  id: string;
  date: string;
  title: string | null;
  tier: string;
  source: "team" | "home";
  team_name: string | null;
  is_archived: boolean;
  task_count: number;
  completed_count: number;
  shots_logged: number;
  status: "complete" | "partial" | "none";
}
interface HistoryPage {
  items: HistoryEntry[];
  has_more: boolean;
  next_before: string;
}

const PlayerHistory: React.FC = () => {
  const { t } = useTranslation();
  const { id: playerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/auth", { replace: true });
  }, [authLoading, isAuthenticated, navigate]);
  const player = useQuery({
    queryKey: ["player", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", playerId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(user && playerId),
  });
  const history = useInfiniteQuery({
    queryKey: ["family-training-history", playerId, tomorrow],
    initialPageParam: tomorrow,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc(
        "get_player_training_history",
        { p_player_id: playerId!, p_before: pageParam, p_days: 30 },
      );
      if (error) throw error;
      const result = data as unknown as HistoryPage;
      if (
        !result ||
        !Array.isArray(result.items) ||
        typeof result.next_before !== "string"
      )
        throw new Error("Training history was not returned. Please retry.");
      return result;
    },
    getNextPageParam: (last) => (last.has_more ? last.next_before : undefined),
    enabled: Boolean(user && playerId),
  });
  const items = history.data?.pages.flatMap((page) => page.items) ?? [];
  const completed = items.filter((item) => item.status === "complete").length;
  const shots = items.reduce((sum, item) => sum + Number(item.shots_logged), 0);
  const activeDays = new Set(
    items
      .filter(
        (item) =>
          item.completed_count > 0 ||
          item.shots_logged > 0 ||
          item.status === "complete",
      )
      .map((item) => item.date),
  ).size;
  const loading = authLoading || player.isLoading || history.isLoading;
  const header = (
    <div className="flex w-full min-w-0 items-center gap-3">
      <Button
        aria-label="Go back"
        variant="ghost"
        size="icon-sm"
        onClick={() => navigate(`/players/${playerId}/home`)}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
          Your training log
        </p>
        <h1 className="truncate text-lg font-bold">
          {t("players.history.title")}
        </h1>
      </div>
      {player.data && (
        <Avatar
          src={player.data.profile_photo_url}
          fallback={player.data.first_name}
          size="sm"
        />
      )}
    </div>
  );
  if (!authLoading && !isAuthenticated) return null;
  return (
    <AppShell header={header}>
      <Helmet>
        <title>Training History | Hockey App</title>
      </Helmet>
      <PageContainer className="max-w-2xl space-y-5 pb-8">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : player.isError || (history.isError && !history.data) ? (
          <DataLoadError
            title="Couldn’t load training history"
            onRetry={() => {
              void player.refetch();
              void history.refetch();
            }}
            retrying={player.isFetching || history.isFetching}
          />
        ) : (
          <>
            <section className="overflow-hidden rounded-2xl border border-primary/25 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_65%),hsl(var(--card))] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                Every session adds up
              </p>
              <h2 className="mt-2 text-xl font-bold">
                Look at the work you’ve put in.
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Team and home workouts, in one place. Your own progress stays
                with your family when you leave a team.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4">
                {[
                  { value: completed, label: "Workouts done" },
                  { value: new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(shots), label: "Shots logged" },
                  { value: activeDays, label: "Days trained" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-2xl font-black tabular-nums">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[10px] text-muted-foreground">
                Totals for the {30 * (history.data?.pages.length ?? 1)} days
                loaded below.
              </p>
            </section>
            {items.length ? (
              <div className="space-y-3">
                {items.map((item) => (
                  <AppCard key={`${item.source}:${item.id}`} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-muted">
                        <span className="text-xl font-black">
                          {format(parseISO(item.date), "d")}
                        </span>
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {format(parseISO(item.date), "MMM")}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                          {item.source === "home" ? (
                            <House className="h-3 w-3" />
                          ) : (
                            <Users className="h-3 w-3" />
                          )}
                          <span>
                            {item.source === "home"
                              ? "Home workout"
                              : (item.team_name ?? "Team workout")}
                          </span>
                          {item.is_archived && (
                            <span className="rounded-full border border-border px-2 py-0.5">
                              Previous team
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1 break-words font-semibold">
                          {item.title ||
                            format(parseISO(item.date), "EEEE")}{" "}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            {item.completed_count}/{item.task_count} activities
                          </span>
                          {item.shots_logged > 0 && (
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {item.shots_logged.toLocaleString()} shots
                            </span>
                          )}
                        </div>
                        <p
                          className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${item.status === "complete" ? "text-emerald-500" : "text-muted-foreground"}`}
                        >
                          {item.status === "complete" ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Clock className="h-3.5 w-3.5" />
                          )}
                          {item.status === "complete"
                            ? "Complete"
                            : item.status === "partial"
                              ? "In progress"
                              : "Not started"}
                        </p>
                      </div>
                    </div>
                  </AppCard>
                ))}
              </div>
            ) : (
              <AppCard className="p-6 text-center">
                <Calendar className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <h2 className="font-semibold">
                  Your next session starts the story.
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  No workouts in this period. Completed home and team workouts
                  will appear here.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => navigate(`/players/${playerId}/home`)}
                >
                  Back to player home
                </Button>
              </AppCard>
            )}
            {history.isFetchNextPageError && (
              <DataLoadError
                title="Couldn’t load older workouts"
                onRetry={() => void history.fetchNextPage()}
                retrying={history.isFetchingNextPage}
              />
            )}
            {history.hasNextPage && !history.isFetchNextPageError && (
              <Button
                variant="outline"
                className="w-full min-h-11"
                disabled={history.isFetchingNextPage}
                onClick={() => void history.fetchNextPage()}
              >
                {history.isFetchingNextPage && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {history.isFetchingNextPage
                  ? "Loading older workouts…"
                  : "Load older workouts"}
              </Button>
            )}
          </>
        )}
      </PageContainer>
    </AppShell>
  );
};
export default PlayerHistory;
