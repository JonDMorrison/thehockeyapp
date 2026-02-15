import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppCard } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Target,
  Flame,
  Dumbbell,
  ChevronRight,
  Info,
} from "lucide-react";
import { startOfWeek, format } from "date-fns";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface ParentWeeklySummaryProps {
  playerId: string;
}

export const ParentWeeklySummary: React.FC<ParentWeeklySummaryProps> = ({
  playerId,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Current week start (Monday)
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  // Fetch existing summary
  const { data: summary, isLoading } = useQuery({
    queryKey: ["parent-week-summary", playerId, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_parent_week_summary", {
        p_player_id: playerId,
        p_week_start: weekStart,
      });
      if (error) throw error;
      return data as {
        success: boolean;
        error?: string;
        summary_text?: string;
        stats?: {
          workouts_completed?: number;
          total_shots_logged?: number;
          current_parent_streak?: number;
          completion_pct?: number;
        };
        created_at?: string;
      };
    },
    enabled: !!user && !!playerId,
    staleTime: 5 * 60 * 1000,
  });

  // Generate summary mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("generate-parent-summary-ai", {
        body: { player_id: playerId, week_start: weekStart },
      });

      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["parent-week-summary", playerId, weekStart],
      });
      toast.success("Weekly summary generated!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to generate summary");
    },
  });

  const hasSummary = summary?.success && summary.summary_text;
  const stats = summary?.stats;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">This Week's Summary</h4>
        {hasSummary && (
          <Link
            to={`/parents/${playerId}/summaries`}
            className="text-xs text-primary flex items-center gap-0.5"
          >
            Past Summaries
            <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {isLoading ? (
        <AppCard className="space-y-3 p-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </AppCard>
      ) : hasSummary ? (
        <AppCard className="p-4 space-y-3">
          <p className="text-sm leading-relaxed">{summary.summary_text}</p>

          {/* Stats chips */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1 text-xs font-medium">
              <Dumbbell className="w-3 h-3" />
              {stats?.workouts_completed ?? 0} workouts
            </Badge>
            <Badge variant="secondary" className="gap-1 text-xs font-medium">
              <Target className="w-3 h-3" />
              {(stats?.total_shots_logged ?? 0).toLocaleString()} shots
            </Badge>
            <Badge variant="secondary" className="gap-1 text-xs font-medium">
              <Flame className="w-3 h-3" />
              {stats?.current_parent_streak ?? 0} day home streak
            </Badge>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-1.5 pt-1">
            <Info className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              This summary is based on your home plan only.
            </p>
          </div>
        </AppCard>
      ) : (
        <AppCard className="p-4 space-y-3">
          {generateMutation.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
            </div>
          ) : (
            <div className="text-center py-2 space-y-3">
              <p className="text-sm text-muted-foreground">
                No summary yet for this week.
              </p>
              <Button
                size="sm"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Generate Weekly Summary
              </Button>
              <div className="flex items-start gap-1.5 justify-center">
                <Info className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                  This summary is based on your home plan only.
                </p>
              </div>
            </div>
          )}
        </AppCard>
      )}
    </div>
  );
};
