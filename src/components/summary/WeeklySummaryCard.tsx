import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/app/Skeleton";
import { toast } from "@/components/app/Toast";
import { format, startOfWeek, subWeeks } from "date-fns";
import { Sparkles, RefreshCw, FileText, Loader2 } from "lucide-react";

interface WeeklySummaryCardProps {
  playerId: string;
  teamId: string;
}

export const WeeklySummaryCard: React.FC<WeeklySummaryCardProps> = ({
  playerId,
  teamId,
}) => {
  // Get current week start (Sunday)
  const currentWeekStart = format(
    startOfWeek(new Date(), { weekStartsOn: 0 }),
    "yyyy-MM-dd"
  );
  
  // Also check last week in case current week has no summary yet
  const lastWeekStart = format(
    startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 0 }),
    "yyyy-MM-dd"
  );

  const { data: summary, isLoading } = useQuery({
    queryKey: ["player-week-summary", playerId, teamId],
    queryFn: async () => {
      // Try current week first
      const { data: currentWeek, error: currentError } = await supabase
        .from("player_week_summaries")
        .select("*")
        .eq("player_id", playerId)
        .eq("team_id", teamId)
        .eq("week_start", currentWeekStart)
        .maybeSingle();

      if (currentWeek) return currentWeek;

      // Fall back to last week
      const { data: lastWeek, error: lastError } = await supabase
        .from("player_week_summaries")
        .select("*")
        .eq("player_id", playerId)
        .eq("team_id", teamId)
        .eq("week_start", lastWeekStart)
        .maybeSingle();

      return lastWeek;
    },
    enabled: !!playerId && !!teamId,
  });

  if (isLoading) {
    return <SkeletonCard />;
  }

  if (!summary) {
    return null; // Don't show anything if no summary exists
  }

  const weekLabel = format(new Date(summary.week_start), "MMM d");

  return (
    <AppCard>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-team-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-team-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <AppCardTitle className="text-base mb-1">Weekly Summary</AppCardTitle>
          <p className="text-sm text-text-secondary">{summary.summary_text}</p>
          <p className="text-xs text-text-muted mt-2">Week of {weekLabel}</p>
        </div>
      </div>
    </AppCard>
  );
};

interface TeamWeeklySummaryCardProps {
  teamId: string;
}

export const TeamWeeklySummaryCard: React.FC<TeamWeeklySummaryCardProps> = ({
  teamId,
}) => {
  const queryClient = useQueryClient();
  
  const currentWeekStart = format(
    startOfWeek(new Date(), { weekStartsOn: 0 }),
    "yyyy-MM-dd"
  );
  
  const lastWeekStart = format(
    startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 0 }),
    "yyyy-MM-dd"
  );

  const { data: summary, isLoading } = useQuery({
    queryKey: ["team-week-summary", teamId],
    queryFn: async () => {
      const { data: currentWeek } = await supabase
        .from("team_week_summaries")
        .select("*")
        .eq("team_id", teamId)
        .eq("week_start", currentWeekStart)
        .maybeSingle();

      if (currentWeek) return currentWeek;

      const { data: lastWeek } = await supabase
        .from("team_week_summaries")
        .select("*")
        .eq("team_id", teamId)
        .eq("week_start", lastWeekStart)
        .maybeSingle();

      return lastWeek;
    },
    enabled: !!teamId,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-summaries-ai", {
        body: {
          team_id: teamId,
          week_start: lastWeekStart, // Generate for last week (complete data)
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-week-summary", teamId] });
      toast.success("Summaries generated!", "Player and team summaries are ready.");
    },
    onError: (error: Error) => {
      toast.error("Generation failed", error.message);
    },
  });

  if (isLoading) {
    return <SkeletonCard />;
  }

  return (
    <AppCard>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-team-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-team-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <AppCardTitle className="text-base mb-1">Team Summary</AppCardTitle>
            {summary ? (
              <>
                <p className="text-sm text-text-secondary">{summary.summary_text}</p>
                <p className="text-xs text-text-muted mt-2">
                  Week of {format(new Date(summary.week_start), "MMM d")}
                </p>
              </>
            ) : (
              <AppCardDescription>
                Generate a summary of last week's training activity.
              </AppCardDescription>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>
    </AppCard>
  );
};
