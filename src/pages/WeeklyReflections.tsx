import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/app/AppShell";
import { NavigationHeader } from "@/components/app/NavigationHeader";
import { AppCard } from "@/components/app/AppCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Target,
  Flame,
  Dumbbell,
  FileText,
  Crown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, parseISO } from "date-fns";

const PAGE_SIZE = 20;

const WeeklyReflections: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);

  // Access control: must not be a coach-only user (must own or guard a player)
  const { data: hasPlayerAccess, isLoading: accessLoading } = useQuery({
    queryKey: ["has-player-access", user?.id],
    queryFn: async () => {
      const { data: owned } = await supabase
        .from("players")
        .select("id")
        .eq("owner_user_id", user!.id)
        .limit(1);

      if (owned && owned.length > 0) return true;

      const { data: guarded } = await supabase
        .from("player_guardians")
        .select("player_id")
        .eq("user_id", user!.id)
        .limit(1);

      return (guarded && guarded.length > 0) || false;
    },
    enabled: !!user,
  });

  // Check Pro access
  const { data: hasPro, isLoading: proLoading } = useQuery({
    queryKey: ["has-full-access", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_full_access", {
        p_user_id: user!.id,
      });
      return data === true;
    },
    enabled: !!user,
  });

  // Fetch summaries with pagination
  const { data: summaries, isLoading: summariesLoading } = useQuery({
    queryKey: ["weekly-reflections", user?.id, page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE;

      const { data, error, count } = await supabase
        .from("parent_weekly_summaries")
        .select("*", { count: "exact" })
        .eq("user_id", user!.id)
        .not("ai_summary", "is", null)
        .order("week_start", { ascending: false })
        .range(from, to - 1);

      if (error) throw error;
      return { items: data || [], total: count || 0 };
    },
    enabled: !!user && hasPlayerAccess === true,
  });

  const totalPages = Math.ceil((summaries?.total || 0) / PAGE_SIZE);
  const isLoading = authLoading || accessLoading || proLoading || summariesLoading;

  const header = (
    <NavigationHeader title="Weekly Reflections" backPath="/players" />
  );

  // Loading state
  if (isLoading) {
    return (
      <AppShell header={header}>
        <div className="px-5 py-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </AppShell>
    );
  }

  // Coach-only users blocked
  if (!hasPlayerAccess) {
    return (
      <AppShell header={header}>
        <div className="px-5 py-6">
          <AppCard className="p-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Weekly Reflections are available for parents and guardians only.
            </p>
          </AppCard>
        </div>
      </AppShell>
    );
  }

  const items = summaries?.items || [];

  return (
    <AppShell header={header}>
      <div className="px-5 py-6 space-y-4">
        {items.length === 0 ? (
          // Empty state
          <AppCard className="p-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              You haven't logged enough activity yet for a weekly reflection.
            </p>
          </AppCard>
        ) : (
          <>
            {items.map((s) => (
              <AppCard key={s.id} className="p-4 space-y-3">
                {/* Week range + Pro badge */}
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {format(parseISO(s.week_start), "MMM d")} –{" "}
                    {format(parseISO(s.week_end), "MMM d, yyyy")}
                  </p>
                  {hasPro && (
                    <Badge
                      variant="outline"
                      className="gap-1 text-[10px] font-semibold border-primary/30 text-primary"
                    >
                      <Crown className="w-3 h-3" />
                      Pro
                    </Badge>
                  )}
                </div>

                {/* Metrics row */}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className="gap-1 text-xs font-medium"
                  >
                    <Target className="w-3 h-3" />
                    {(s.total_shots ?? 0).toLocaleString()} shots
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="gap-1 text-xs font-medium"
                  >
                    <Dumbbell className="w-3 h-3" />
                    {s.total_workouts ?? 0} workouts
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="gap-1 text-xs font-medium"
                  >
                    <Flame className="w-3 h-3" />
                    {s.longest_streak ?? 0} day streak
                  </Badge>
                  {s.focus_areas && s.focus_areas.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-xs font-medium"
                    >
                      {s.focus_areas.join(", ")}
                    </Badge>
                  )}
                </div>

                {/* AI Summary */}
                <p className="text-sm leading-relaxed text-foreground">
                  {s.ai_summary}
                </p>
              </AppCard>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
};

export default WeeklyReflections;
