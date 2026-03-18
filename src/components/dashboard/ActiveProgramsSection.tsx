import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays, isAfter, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { AppCard } from "@/components/app/AppCard";
import { SkeletonProgramCard } from "@/components/app/Skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar, Flame, Users, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActiveProgramsSectionProps {
  teamId: string;
}

interface ProgramWithStats {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  focus_areas: string[] | null;
  days_per_week: number | null;
  is_challenge: boolean;
  total_days: number;
  days_elapsed: number;
  progress_percent: number;
  sessions_completed: number;
  active_players: number;
}

export const ActiveProgramsSection: React.FC<ActiveProgramsSectionProps> = ({
  teamId,
}) => {
  const navigate = useNavigate();
  const today = startOfDay(new Date());

  // Fetch active training programs
  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ["active-programs", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_programs")
        .select("*")
        .eq("team_id", teamId)
        .eq("status", "active")
        .order("start_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!teamId,
  });

  // Fetch challenge practice cards (30-day challenges)
  const { data: challengeCards, isLoading: challengesLoading } = useQuery({
    queryKey: ["challenge-cards", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("practice_cards")
        .select("id, date, title, mode")
        .eq("team_id", teamId)
        .eq("program_source", "team")
        .eq("mode", "challenge")
        .order("date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!teamId,
  });

  // Fetch session completions for stats
  const { data: sessionStats } = useQuery({
    queryKey: ["program-session-stats", teamId],
    queryFn: async () => {
      // Get completions for challenge cards
      const { data, error } = await supabase
        .from("session_completions")
        .select(`
          id,
          player_id,
          practice_card_id,
          status,
          practice_cards!inner(team_id, mode)
        `)
        .eq("practice_cards.team_id", teamId)
        .eq("program_source", "team")
        .eq("status", "done");

      if (error) throw error;
      return data || [];
    },
    enabled: !!teamId,
  });

  // Transform programs into display format
  const activePrograms: ProgramWithStats[] = React.useMemo(() => {
    const result: ProgramWithStats[] = [];

    // Add training programs
    if (programs) {
      for (const program of programs) {
        const startDate = new Date(program.start_date);
        const endDate = new Date(program.end_date);
        const totalDays = differenceInDays(endDate, startDate) + 1;
        const daysElapsed = Math.min(
          Math.max(differenceInDays(today, startDate) + 1, 0),
          totalDays
        );
        const progressPercent = Math.round((daysElapsed / totalDays) * 100);

        result.push({
          id: program.id,
          name: program.name,
          start_date: program.start_date,
          end_date: program.end_date,
          status: program.status,
          focus_areas: program.focus_areas,
          days_per_week: program.days_per_week,
          is_challenge: false,
          total_days: totalDays,
          days_elapsed: daysElapsed,
          progress_percent: progressPercent,
          sessions_completed: 0,
          active_players: 0,
        });
      }
    }

    // Group challenge cards into a single challenge program
    if (challengeCards && challengeCards.length > 0) {
      const firstDate = new Date(challengeCards[0].date);
      const lastDate = new Date(challengeCards[challengeCards.length - 1].date);
      const totalDays = challengeCards.length;
      
      // Count completed days (cards with dates <= today)
      const completedCards = challengeCards.filter(
        (card) => !isAfter(new Date(card.date), today)
      );
      const daysElapsed = completedCards.length;
      const progressPercent = Math.round((daysElapsed / totalDays) * 100);

      // Count unique sessions and players from stats
      const challengeCardIds = new Set(challengeCards.map((c) => c.id));
      const challengeSessions = sessionStats?.filter((s) =>
        challengeCardIds.has(s.practice_card_id)
      ) || [];
      const sessionsCompleted = challengeSessions.length;
      const activePlayers = new Set(challengeSessions.map((s) => s.player_id)).size;

      result.push({
        id: "challenge-30day",
        name: challengeCards[0].title || "30 Day Challenge",
        start_date: challengeCards[0].date,
        end_date: challengeCards[challengeCards.length - 1].date,
        status: "active",
        focus_areas: null,
        days_per_week: null,
        is_challenge: true,
        total_days: totalDays,
        days_elapsed: daysElapsed,
        progress_percent: progressPercent,
        sessions_completed: sessionsCompleted,
        active_players: activePlayers,
      });
    }

    return result;
  }, [programs, challengeCards, sessionStats, today]);

  const isLoading = programsLoading || challengesLoading;

  if (isLoading) {
    return <SkeletonProgramCard />;
  }

  if (activePrograms.length === 0) {
    return null; // Don't show section if no active programs
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground px-1">
        Active Programs
      </h2>

      <div className="space-y-3">
        {activePrograms.map((program) => (
          <AppCard 
            key={program.id} 
            className="p-4 cursor-pointer hover:bg-accent/50 transition-colors active:scale-[0.99]"
            onClick={() => {
              // Navigate to team practice page - challenges and programs show in the card list
              navigate(`/teams/${teamId}/practice`);
            }}
          >
            <div className="space-y-3">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      program.is_challenge
                        ? "bg-orange-500/10 text-orange-500"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {program.is_challenge ? (
                      <Flame className="w-4 h-4" />
                    ) : (
                      <Calendar className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm truncate">
                      {program.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(program.start_date), "MMM d")} –{" "}
                      {format(new Date(program.end_date), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-muted-foreground">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <Progress value={program.progress_percent} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Day {program.days_elapsed} of {program.total_days}
                  </span>
                  <span>{program.progress_percent}%</span>
                </div>
              </div>

              {/* Stats row - only for challenges with data */}
              {program.is_challenge && (program.sessions_completed > 0 || program.active_players > 0) && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{program.active_players} players active</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{program.sessions_completed} sessions</span>
                  </div>
                </div>
              )}
            </div>
          </AppCard>
        ))}
      </div>
    </div>
  );
};
