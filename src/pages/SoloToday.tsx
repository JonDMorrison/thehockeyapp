import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DAY_TEMPLATES, TASK_LIBRARY } from "@/lib/weekTemplates";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Avatar } from "@/components/app/Avatar";
import { Tag } from "@/components/app/Tag";
import { ProgressBar } from "@/components/app/ProgressBar";
import { SkeletonCard } from "@/components/app/Skeleton";
import { EmptyState } from "@/components/app/EmptyState";
import { WorkoutCheckItem } from "@/components/app/WorkoutCheckItem";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "@/components/app/Toast";
import {
  Dumbbell,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Check,
  Square,
  CheckSquare,
  Flame,
  Sparkles,
  RotateCcw,
  Trophy,
  User,
  Clock,
  Target,
  Timer,
  Heart,
  MoreHorizontal,
} from "lucide-react";

interface PersonalTask {
  id: string;
  label: string;
  task_type: string;
  sort_order: number;
  is_required: boolean;
  shots_expected: number | null;
}

interface PersonalCard {
  id: string;
  date: string;
  title: string | null;
  tier: string | null;
}

interface PersonalTaskCompletion {
  id: string;
  personal_practice_task_id: string;
  completed: boolean;
}

const SoloToday: React.FC = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const todayStr = format(startOfDay(new Date()), "yyyy-MM-dd");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch player
  const { data: player, isLoading: playerLoading } = useQuery({
    queryKey: ["player", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", playerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!playerId,
  });

  // Fetch training plan
  const { data: trainingPlan } = useQuery({
    queryKey: ["personal-training-plan", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_training_plans")
        .select("*")
        .eq("player_id", playerId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!playerId,
  });

  // Fetch today's card
  const { data: todayCard, isLoading: cardLoading } = useQuery({
    queryKey: ["personal-practice-card", playerId, todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_practice_cards")
        .select("*")
        .eq("player_id", playerId)
        .eq("date", todayStr)
        .maybeSingle();
      if (error) throw error;
      return data as PersonalCard | null;
    },
    enabled: !!user && !!playerId,
  });

  // Fetch tasks for today's card
  const { data: tasks } = useQuery({
    queryKey: ["personal-practice-tasks", todayCard?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_practice_tasks")
        .select("*")
        .eq("personal_practice_card_id", todayCard!.id)
        .order("sort_order");
      if (error) throw error;
      return data as PersonalTask[];
    },
    enabled: !!todayCard?.id,
  });

  // Fetch task completions (using personal_task_completions table)
  const { data: completions } = useQuery({
    queryKey: ["personal-task-completions", playerId, tasks?.map(t => t.id)],
    queryFn: async () => {
      if (!tasks || tasks.length === 0) return [];
      const { data, error } = await supabase
        .from("personal_task_completions")
        .select("*")
        .eq("player_id", playerId)
        .in("personal_practice_task_id", tasks.map(t => t.id));
      if (error) throw error;
      return data as PersonalTaskCompletion[];
    },
    enabled: !!tasks && tasks.length > 0,
  });

  // Create workout from template
  const createWorkout = useMutation({
    mutationFn: async (templateId: string) => {
      const template = DAY_TEMPLATES.find((t) => t.id === templateId);
      if (!template) throw new Error("Template not found");

      // Create the card
      const { data: card, error: cardError } = await supabase
        .from("personal_practice_cards")
        .insert({
          player_id: playerId,
          date: todayStr,
          title: template.title,
          tier: trainingPlan?.tier || "base",
          mode: "solo",
        })
        .select()
        .single();

      if (cardError) throw cardError;

      // Create tasks from template
      const taskInserts = template.taskIds.map((taskId, index) => {
        const taskTemplate = TASK_LIBRARY.find((t) => t.id === taskId);
        if (!taskTemplate) return null;

        return {
          personal_practice_card_id: card.id,
          label: taskTemplate.label,
          task_type: taskTemplate.type,
          sort_order: index,
          is_required: taskTemplate.isRequired || false,
          shots_expected: taskTemplate.shots || null,
        };
      }).filter(Boolean);

      const { error: tasksError } = await supabase
        .from("personal_practice_tasks")
        .insert(taskInserts);

      if (tasksError) throw tasksError;

      return card;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-practice-card", playerId, todayStr] });
      setShowWorkoutPicker(false);
      toast.success("Workout ready!", "Let's get to work 💪");
    },
    onError: (error: Error) => {
      toast.error("Failed to create workout", error.message);
    },
  });

  // Toggle task completion
  const toggleTask = useMutation({
    mutationFn: async (taskId: string) => {
      const existing = completions?.find((c) => c.personal_practice_task_id === taskId);
      const task = tasks?.find((t) => t.id === taskId);

      if (existing) {
        // Toggle off
        const { error } = await supabase
          .from("personal_task_completions")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
        return { completed: false, taskLabel: task?.label };
      } else {
        // Toggle on
        const { error } = await supabase
          .from("personal_task_completions")
          .insert({
            player_id: playerId,
            personal_practice_task_id: taskId,
            completed: true,
            completed_at: new Date().toISOString(),
            completed_by: user!.id,
            source: "solo",
          });
        if (error) throw error;
        return { completed: true, taskLabel: task?.label };
      }
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["personal-task-completions", playerId] });
      
      if (result?.completed) {
        // Check if this completes all tasks
        const newCompletedCount = (completions?.length || 0) + 1;
        const isNowAllDone = newCompletedCount === totalCount;
        
        if (isNowAllDone && todayCard) {
          toast.success("Workout Complete! 🎉", "Amazing work today!");
          
          // Log session completion
          await supabase
            .from("personal_session_completions")
            .upsert({
              player_id: playerId,
              personal_practice_card_id: todayCard.id,
              status: "complete",
              completed_at: new Date().toISOString(),
            }, { onConflict: "player_id,personal_practice_card_id" });
          
          // Invalidate dashboard data
          queryClient.invalidateQueries({ queryKey: ["solo-dashboard", playerId] });
        } else {
          toast.success("Nice! ✓", result.taskLabel || "Task completed");
        }
      }
    },
    onError: (error: Error) => {
      toast.error("Couldn't save", error.message);
    },
  });

  const completedCount = completions?.length || 0;
  const totalCount = tasks?.length || 0;
  const isAllDone = totalCount > 0 && completedCount === totalCount;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const isLoading = playerLoading || cardLoading || authLoading;

  if (isLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <SkeletonCard className="h-40" />
          <SkeletonCard className="h-64" />
        </PageContainer>
      </AppShell>
    );
  }

  if (!player) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <AppCard>
            <EmptyState
              icon={User}
              title="Player not found"
              description="This player doesn't exist or you don't have access."
              action={{ label: "Go Back", onClick: () => navigate("/welcome") }}
            />
          </AppCard>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center justify-between w-full">
          <button
            onClick={() => navigate("/solo/setup")}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors -ml-1 p-1"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <Avatar
              src={player.profile_photo_url}
              fallback={player.first_name}
              size="sm"
            />
            <div>
              <p className="font-semibold">{player.first_name}'s Training</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(), "EEEE, MMM d")}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(`/players/${playerId}/home`)}
          >
            <User className="w-5 h-5" />
          </Button>
        </div>
      }
    >
      <PageContainer>
        {/* Progress Header */}
        <AppCard
          className={`transition-all ${
            isAllDone
              ? "bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/30"
              : "bg-gradient-to-br from-orange-500/10 to-amber-500/5 border-orange-500/20"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                isAllDone ? "bg-green-500" : "bg-orange-500"
              }`}
            >
              {isAllDone ? (
                <Trophy className="w-7 h-7 text-white" />
              ) : (
                <Flame className="w-7 h-7 text-white" />
              )}
            </div>
            <div className="flex-1">
              {todayCard ? (
                <>
                  <p className="text-sm text-muted-foreground">Today's Workout</p>
                  <p className="font-bold text-lg">{todayCard.title || "Training Session"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <ProgressBar value={progressPercent} className="flex-1 h-2" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {completedCount}/{totalCount}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-bold text-lg">Ready to train?</p>
                  <p className="text-sm text-muted-foreground">
                    Pick a workout to get started
                  </p>
                </>
              )}
            </div>
          </div>
        </AppCard>

        {/* Tasks or Picker */}
        {todayCard && tasks && tasks.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-sm font-semibold text-muted-foreground">Tasks</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowWorkoutPicker(true)}
              >
                <RotateCcw className="w-3 h-3" />
                Change
              </Button>
            </div>
            
            <div className="space-y-3">
              {tasks.map((task) => {
                const isCompleted = completions?.some(
                  (c) => c.personal_practice_task_id === task.id
                );
                
                // Look up description from task library
                const taskTemplate = TASK_LIBRARY.find(t => t.label === task.label);
                const description = taskTemplate?.description;

                // Map task type to icon
                const taskTypeIcons: Record<string, React.ReactNode> = {
                  shooting: <Target className="w-6 h-6" />,
                  conditioning: <Dumbbell className="w-6 h-6" />,
                  mobility: <Heart className="w-6 h-6" />,
                  recovery: <Timer className="w-6 h-6" />,
                  prep: <Sparkles className="w-6 h-6" />,
                  other: <MoreHorizontal className="w-6 h-6" />,
                };

                const target = task.shots_expected 
                  ? `${task.shots_expected} shots`
                  : task.is_required 
                    ? "Required"
                    : undefined;

                return (
                  <WorkoutCheckItem
                    key={task.id}
                    id={task.id}
                    label={task.label}
                    target={target}
                    icon={taskTypeIcons[task.task_type] || taskTypeIcons.other}
                    completed={isCompleted || false}
                    onToggle={(id) => toggleTask.mutate(id)}
                  />
                );
              })}
            </div>

            {isAllDone && (
              <AppCard className="bg-green-500/10 border-green-500/30 text-center py-6">
                <Trophy className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="font-bold text-lg">Workout Complete! 🎉</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Great work, {player.first_name}! See you tomorrow.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => navigate(`/solo/dashboard/${playerId}`)}
                >
                  Return to Dashboard
                </Button>
              </AppCard>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground px-1">
              Pick a Workout
            </p>
            <div className="grid gap-3">
              {DAY_TEMPLATES.slice(0, 6).map((template) => (
                <AppCard
                  key={template.id}
                  className="cursor-pointer hover:shadow-medium transition-all"
                  onClick={() => createWorkout.mutate(template.id)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${template.color} text-white`}
                    >
                      {template.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{template.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {template.subtitle}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {template.estimatedMinutes}m
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </AppCard>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <AppCard>
          <AppCardTitle className="text-base mb-3">This Week</AppCardTitle>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-orange-500">
                {trainingPlan?.days_per_week || 4}
              </p>
              <p className="text-xs text-muted-foreground">Day Goal</p>
            </div>
            <div>
              <p className="text-2xl font-bold">--</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold">--</p>
              <p className="text-xs text-muted-foreground">Streak</p>
            </div>
          </div>
        </AppCard>
      </PageContainer>

      {/* Workout Picker Sheet */}
      <Sheet open={showWorkoutPicker} onOpenChange={setShowWorkoutPicker}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle>Change Today's Workout</SheetTitle>
            <SheetDescription>
              Pick a different workout template
            </SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-3 overflow-y-auto max-h-[50vh]">
            {DAY_TEMPLATES.map((template) => (
              <AppCard
                key={template.id}
                className="cursor-pointer hover:shadow-medium transition-all"
                onClick={() => {
                  // Would need to delete existing and create new
                  toast.info("Coming soon", "Workout change feature is being built.");
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${template.color} text-white`}
                  >
                    {template.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{template.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {template.subtitle} • ~{template.estimatedMinutes} min
                    </p>
                  </div>
                </div>
              </AppCard>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
};

export default SoloToday;