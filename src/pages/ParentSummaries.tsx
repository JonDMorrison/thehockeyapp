import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/app/AppShell";
import { NavigationHeader } from "@/components/app/NavigationHeader";
import { AppCard } from "@/components/app/AppCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Flame, Dumbbell, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";

const ParentSummaries: React.FC = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const { user, loading: authLoading } = useAuth();

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
      title={`${player?.first_name ?? "Player"}'s Summaries`}
      backPath={`/players/${playerId}/home`}
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

  return (
    <AppShell header={header}>
      <div className="px-5 py-6 space-y-4">
        {!summaries || summaries.length === 0 ? (
          <AppCard className="p-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No summaries yet. Generate one from the Home Development section.
            </p>
          </AppCard>
        ) : (
          summaries.map((s) => {
            const stats = s.stats as Record<string, number> | null;
            return (
              <AppCard key={s.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Week of {format(parseISO(s.week_start), "MMM d")} –{" "}
                    {format(parseISO(s.week_end), "MMM d, yyyy")}
                  </p>
                </div>

                <p className="text-sm leading-relaxed">{s.summary_text}</p>

                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className="gap-1 text-xs font-medium"
                  >
                    <Dumbbell className="w-3 h-3" />
                    {stats?.workouts_completed ?? 0} workouts
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="gap-1 text-xs font-medium"
                  >
                    <Target className="w-3 h-3" />
                    {(stats?.total_shots_logged ?? 0).toLocaleString()} shots
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="gap-1 text-xs font-medium"
                  >
                    <Flame className="w-3 h-3" />
                    {stats?.current_parent_streak ?? 0} day home streak
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
