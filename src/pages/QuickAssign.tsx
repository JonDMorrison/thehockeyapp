import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard } from "@/components/app/AppCard";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/app/Toast";
import { format, addDays, isSameDay, isToday, isTomorrow, subDays } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Target,
  Dumbbell,
  Timer,
  Heart,
  Send,
  Zap,
  Calendar,
  AlertTriangle,
  Copy,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface ExercisePreset {
  id: string;
  label: string;
  task_type: string;
  icon: React.ReactNode;
  target_value: number;
  target_type: string;
  shot_type: string;
  description: string;
}

const EXERCISE_PRESETS: ExercisePreset[] = [
  {
    id: "wrist_shots",
    label: "Wrist Shots",
    task_type: "shooting",
    icon: <Target className="w-5 h-5" />,
    target_value: 50,
    target_type: "reps",
    shot_type: "wrist",
    description: "50 shots",
  },
  {
    id: "snap_shots",
    label: "Snap Shots",
    task_type: "shooting",
    icon: <Target className="w-5 h-5" />,
    target_value: 30,
    target_type: "reps",
    shot_type: "snap",
    description: "30 shots",
  },
  {
    id: "slap_shots",
    label: "Slap Shots",
    task_type: "shooting",
    icon: <Target className="w-5 h-5" />,
    target_value: 25,
    target_type: "reps",
    shot_type: "slap",
    description: "25 shots",
  },
  {
    id: "backhand",
    label: "Backhand",
    task_type: "shooting",
    icon: <Target className="w-5 h-5" />,
    target_value: 25,
    target_type: "reps",
    shot_type: "backhand",
    description: "25 shots",
  },
  {
    id: "pushups",
    label: "Push-ups",
    task_type: "conditioning",
    icon: <Dumbbell className="w-5 h-5" />,
    target_value: 20,
    target_type: "reps",
    shot_type: "none",
    description: "20 reps",
  },
  {
    id: "squats",
    label: "Squats",
    task_type: "conditioning",
    icon: <Dumbbell className="w-5 h-5" />,
    target_value: 25,
    target_type: "reps",
    shot_type: "none",
    description: "25 reps",
  },
  {
    id: "planks",
    label: "Planks",
    task_type: "conditioning",
    icon: <Timer className="w-5 h-5" />,
    target_value: 60,
    target_type: "seconds",
    shot_type: "none",
    description: "60 seconds",
  },
  {
    id: "stretching",
    label: "Stretching",
    task_type: "mobility",
    icon: <Heart className="w-5 h-5" />,
    target_value: 5,
    target_type: "minutes",
    shot_type: "none",
    description: "5 minutes",
  },
  {
    id: "stickhandling",
    label: "Stickhandling",
    task_type: "shooting",
    icon: <Target className="w-5 h-5" />,
    target_value: 5,
    target_type: "minutes",
    shot_type: "none",
    description: "5 minutes",
  },
  {
    id: "lunges",
    label: "Lunges",
    task_type: "conditioning",
    icon: <Dumbbell className="w-5 h-5" />,
    target_value: 20,
    target_type: "reps",
    shot_type: "none",
    description: "20 reps (10 each leg)",
  },
];

const QuickAssign: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { setTeamTheme } = useTeamTheme();
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());
  const [copySheetOpen, setCopySheetOpen] = useState(false);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  const formatDateLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEEE");
  };

  const goToPreviousDay = () => {
    const prev = addDays(selectedDate, -1);
    // Don't allow past dates
    if (prev >= new Date(format(new Date(), "yyyy-MM-dd"))) {
      setSelectedDate(prev);
    }
  };

  const goToNextDay = () => {
    const next = addDays(selectedDate, 1);
    // Limit to 7 days ahead
    const maxDate = addDays(new Date(), 7);
    if (next <= maxDate) {
      setSelectedDate(next);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch team
  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["team", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Check if there's already a practice card for this date
  const { data: existingCard } = useQuery({
    queryKey: ["practice-card-date", id, selectedDateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("practice_cards")
        .select("id, published_at")
        .eq("team_id", id)
        .eq("date", selectedDateStr)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Check if it's a game day
  const { data: gameDay } = useQuery({
    queryKey: ["game-day-date", id, selectedDateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_game_days")
        .select("enabled, notes")
        .eq("team_id", id)
        .eq("date", selectedDateStr)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Check for team events on this date (games or practices)
  const { data: dateEvents } = useQuery({
    queryKey: ["team-events-date", id, selectedDateStr],
    queryFn: async () => {
      const startOfDay = `${selectedDateStr}T00:00:00Z`;
      const endOfDay = `${selectedDateStr}T23:59:59Z`;
      const { data, error } = await supabase
        .from("team_events")
        .select("id, event_type, title, start_time, location")
        .eq("team_id", id)
        .eq("is_cancelled", false)
        .gte("start_time", startOfDay)
        .lte("start_time", endOfDay)
        .order("start_time");
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Fetch recent practice cards with tasks for copy feature
  const { data: recentCards } = useQuery({
    queryKey: ["recent-practice-cards", id],
    queryFn: async () => {
      const weekAgo = format(subDays(new Date(), 14), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("practice_cards")
        .select(`
          id, 
          date, 
          title,
          practice_tasks (
            id, task_type, label, target_type, target_value, shot_type, shots_expected, is_required, sort_order
          )
        `)
        .eq("team_id", id)
        .gte("date", weekAgo)
        .neq("date", selectedDateStr)
        .order("date", { ascending: false })
        .limit(7);
      if (error) throw error;
      return data?.filter(card => card.practice_tasks && card.practice_tasks.length > 0);
    },
    enabled: !!user && !!id && copySheetOpen,
  });

  const isGameDayFlag = gameDay?.enabled || dateEvents?.some(e => e.event_type === "game");
  const hasPracticeEvent = dateEvents?.some(e => e.event_type === "practice");
  const gameEvent = dateEvents?.find(e => e.event_type === "game");
  const practiceEvent = dateEvents?.find(e => e.event_type === "practice");

  useEffect(() => {
    if (team?.palette_id) {
      setTeamTheme(team.palette_id);
    }
  }, [team?.palette_id, setTeamTheme]);

  const toggleExercise = (exerciseId: string) => {
    setSelectedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  };

  const copyWorkoutMutation = useMutation({
    mutationFn: async (sourceCardId: string) => {
      const sourceCard = recentCards?.find(c => c.id === sourceCardId);
      if (!sourceCard?.practice_tasks?.length) {
        throw new Error("No tasks to copy");
      }

      let practiceCardId = existingCard?.id;

      // Create or update practice card
      if (practiceCardId) {
        // Delete existing tasks
        await supabase.from("practice_tasks").delete().eq("practice_card_id", practiceCardId);
        
        // Update card
        const { error } = await supabase
          .from("practice_cards")
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq("id", practiceCardId);
        if (error) throw error;
      } else {
        // Create new card
        const { data: newCard, error } = await supabase
          .from("practice_cards")
          .insert({
            team_id: id,
            date: selectedDateStr,
            tier: "rep",
            created_by_user_id: user!.id,
          })
          .select()
          .single();
        if (error) throw error;
        practiceCardId = newCard.id;
      }

      // Copy tasks from source card
      const tasks = sourceCard.practice_tasks.map((task, index) => ({
        practice_card_id: practiceCardId,
        sort_order: task.sort_order ?? index,
        task_type: task.task_type,
        label: task.label,
        target_type: task.target_type,
        target_value: task.target_value,
        shot_type: task.shot_type,
        shots_expected: task.shots_expected,
        is_required: task.is_required,
      }));

      const { error: tasksError } = await supabase
        .from("practice_tasks")
        .insert(tasks);
      if (tasksError) throw tasksError;

      return { taskCount: tasks.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["team-dashboard", id] });
      queryClient.invalidateQueries({ queryKey: ["practice-cards", id] });
      queryClient.invalidateQueries({ queryKey: ["practice-card-date", id] });
      
      const dateLabel = isToday(selectedDate) ? "today" : formatDateLabel(selectedDate);
      toast.success("Copied!", `${result.taskCount} tasks copied to ${dateLabel}.`);
      setCopySheetOpen(false);
      navigate(`/teams/${id}`);
    },
    onError: (error: Error) => {
      toast.error("Failed", error.message);
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      if (selectedExercises.size === 0) {
        throw new Error("Select at least one exercise");
      }

      let practiceCardId = existingCard?.id;

      // Create or update practice card
      if (practiceCardId) {
        // Delete existing tasks
        await supabase.from("practice_tasks").delete().eq("practice_card_id", practiceCardId);
        
        // Update card
        const { error } = await supabase
          .from("practice_cards")
          .update({
            published_at: publish ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", practiceCardId);
        if (error) throw error;
      } else {
        // Create new card
        const { data: newCard, error } = await supabase
          .from("practice_cards")
          .insert({
            team_id: id,
            date: selectedDateStr,
            tier: "rep",
            created_by_user_id: user!.id,
            published_at: publish ? new Date().toISOString() : null,
          })
          .select()
          .single();
        if (error) throw error;
        practiceCardId = newCard.id;
      }

      // Insert selected exercises as tasks
      const selectedPresets = EXERCISE_PRESETS.filter((p) => selectedExercises.has(p.id));
      const tasks = selectedPresets.map((preset, index) => ({
        practice_card_id: practiceCardId,
        sort_order: index,
        task_type: preset.task_type,
        label: preset.label,
        target_type: preset.target_type,
        target_value: preset.target_value,
        shot_type: preset.shot_type,
        shots_expected: preset.task_type === "shooting" ? preset.target_value : null,
        is_required: true,
      }));

      const { error: tasksError } = await supabase
        .from("practice_tasks")
        .insert(tasks);
      if (tasksError) throw tasksError;

      return { published: publish };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["team-dashboard", id] });
      queryClient.invalidateQueries({ queryKey: ["practice-cards", id] });
      
      if (result.published) {
        const dateLabel = isToday(selectedDate) ? "today's" : formatDateLabel(selectedDate) + "'s";
        toast.success("Published!", `Players can now see ${dateLabel} workout.`);
      } else {
        toast.success("Saved", "Workout saved as draft.");
      }
      
      navigate(`/teams/${id}`);
    },
    onError: (error: Error) => {
      toast.error("Failed", error.message);
    },
  });

  if (teamLoading || authLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-64" />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate(`/teams/${id}`)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Assign Workout</h1>
            </div>
          </div>
          {/* Date Picker */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={goToPreviousDay}
              disabled={isToday(selectedDate)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center min-w-[100px]">
              <p className="text-sm font-medium">{formatDateLabel(selectedDate)}</p>
              <p className="text-xs text-muted-foreground">{format(selectedDate, "MMM d")}</p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={goToNextDay}
              disabled={isSameDay(selectedDate, addDays(new Date(), 7))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      }
    >
      <PageContainer className="space-y-4 pb-32">
        {/* Game Day Warning */}
        {isGameDayFlag && (
          <AppCard className="border-amber-500/50 bg-amber-500/10">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">Game Day!</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {gameEvent ? `${gameEvent.title || "Game"} at ${format(new Date(gameEvent.start_time), "h:mm a")}` : "Keep workouts light."}
                </p>
              </div>
            </div>
          </AppCard>
        )}

        {/* Practice Event Info */}
        {hasPracticeEvent && !isGameDayFlag && practiceEvent && (
          <AppCard className="border-blue-500/50 bg-blue-500/10">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-700 dark:text-blue-400">Practice Scheduled</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {practiceEvent.title || "Practice"} at {format(new Date(practiceEvent.start_time), "h:mm a")}
                  {practiceEvent.location && ` • ${practiceEvent.location}`}
                </p>
              </div>
            </div>
          </AppCard>
        )}

        {/* Instructions and Copy Button */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Tap exercises to build {isToday(selectedDate) ? "today's" : formatDateLabel(selectedDate) + "'s"} workout.
          </p>
          <Sheet open={copySheetOpen} onOpenChange={setCopySheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0">
                <Copy className="w-4 h-4 mr-1.5" />
                Copy
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[70vh]">
              <SheetHeader>
                <SheetTitle>Copy from another day</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3 overflow-y-auto max-h-[50vh]">
                {recentCards && recentCards.length > 0 ? (
                  recentCards.map((card) => {
                    const cardDate = new Date(card.date + "T12:00:00");
                    const taskCount = card.practice_tasks?.length || 0;
                    const taskLabels = card.practice_tasks?.slice(0, 3).map(t => t.label).join(", ") || "";
                    const hasMore = taskCount > 3;
                    
                    return (
                      <button
                        key={card.id}
                        onClick={() => copyWorkoutMutation.mutate(card.id)}
                        disabled={copyWorkoutMutation.isPending}
                        className="w-full p-4 rounded-xl text-left bg-card border border-border hover:border-primary/50 transition-all disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{format(cardDate, "EEEE, MMM d")}</span>
                          <span className="text-xs text-muted-foreground">{taskCount} tasks</span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {taskLabels}{hasMore && `, +${taskCount - 3} more`}
                        </p>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Copy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent workouts to copy</p>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Exercise Grid */}
        <div className="grid grid-cols-2 gap-3">
          {EXERCISE_PRESETS.map((exercise) => {
            const isSelected = selectedExercises.has(exercise.id);
            return (
              <button
                key={exercise.id}
                onClick={() => toggleExercise(exercise.id)}
                className={`
                  relative p-4 rounded-xl text-left transition-all
                  ${isSelected 
                    ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background" 
                    : "bg-card border border-border hover:border-primary/50"}
                `}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4" />
                  </div>
                )}
                <div className={`mb-2 ${isSelected ? "text-primary-foreground" : "text-primary"}`}>
                  {exercise.icon}
                </div>
                <div className="font-medium text-sm">{exercise.label}</div>
                <div className={`text-xs mt-0.5 ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {exercise.description}
                </div>
              </button>
            );
          })}
        </div>

        {/* Existing card warning */}
        {existingCard && (
          <AppCard variant="muted" className="border-warning/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                You already have a workout for {isToday(selectedDate) ? "today" : formatDateLabel(selectedDate)}. This will replace it.
              </p>
            </div>
          </AppCard>
        )}
      </PageContainer>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => assignMutation.mutate(false)}
            disabled={selectedExercises.size === 0 || assignMutation.isPending}
          >
            Save Draft
          </Button>
          <Button
            className="flex-1"
            onClick={() => assignMutation.mutate(true)}
            disabled={selectedExercises.size === 0 || assignMutation.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            {assignMutation.isPending ? "Publishing..." : `Publish (${selectedExercises.size})`}
          </Button>
        </div>
      </div>
    </AppShell>
  );
};

export default QuickAssign;
