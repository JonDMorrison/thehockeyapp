import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/app/AppShell";
import { NavigationHeader } from "@/components/app/NavigationHeader";
import { AppCard } from "@/components/app/AppCard";
import { EmptyState } from "@/components/app/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Flame, Dumbbell, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";

const ParentSummaries: React.FC = () => {
  const { t } = useTranslation();
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const { data: player } = useQuery({
    queryKey: ["player-name", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("first_name, last_initial")
        .eq("id", playerId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!playerId && !!user,
  });

  const { data: summaries, isLoading } = useQuery({
    queryKey: ["parent-summaries-list", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parent_week_summaries")
        .select("id, week_start, week_end, summary_text, stats, created_at")
        .eq("player_id", playerId!)
        .order("week_start", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!playerId && !!user,
  });

  const header = (
    <NavigationHeader
      title={t("players.summaries.title", { name: player?.first_name ?? t("players.summaries.playerFallback") })}
      backPath={playerId ? `/players/${playerId}/home` : "/today"}
    />
  );

  if (authLoading || isLoading) {
    return (
      <AppShell header={header}>
        <div className="px-5 py-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <AppShell header={header}>
      <div className="px-5 py-6 space-y-4">
        {!summaries || summaries.length === 0 ? (
          <AppCard>
            <EmptyState
              icon={FileText}
              title={t("players.summaries.emptyTitle")}
              description={t("players.summaries.emptyDescription")}
            />
          </AppCard>
        ) : (
          summaries.map((s) => {
            const stats = s.stats as Record<string, number> | null;
            return (
              <AppCard key={s.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {t("players.summaries.weekOf", { start: format(parseISO(s.week_start), "MMM d"), end: format(parseISO(s.week_end), "MMM d, yyyy") })}
                  </p>
                </div>

                <p className="text-sm leading-relaxed">{s.summary_text}</p>

                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className="gap-1 text-xs font-medium"
                  >
                    <Dumbbell className="w-3 h-3" />
                    {t("players.summaries.workouts", { count: stats?.workouts_completed ?? 0 })}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="gap-1 text-xs font-medium"
                  >
                    <Target className="w-3 h-3" />
                    {t("players.summaries.shots", { count: (stats?.total_shots_logged ?? 0).toLocaleString() })}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="gap-1 text-xs font-medium"
                  >
                    <Flame className="w-3 h-3" />
                    {t("players.summaries.homeStreak", { count: stats?.current_parent_streak ?? 0 })}
                  </Badge>
                </div>
              </AppCard>
            );
          })
        )}
      </div>
    </AppShell>
  );
};

export default ParentSummaries;
