import { useLocalCalendarDay } from "@/hooks/useLocalCalendarDay";
import { DataLoadError } from "@/components/app/DataLoadError";
import { useBadgeEvaluation } from "@/hooks/useBadgeEvaluation";
import { BadgeEarnedToast } from "@/components/player/BadgeEarnedToast";
import { savePersonalWorkouts } from "@/lib/savePersonalWorkouts";
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DAY_TEMPLATES, TASK_LIBRARY } from "@/lib/weekTemplates";
import { getRecommendedCoachingVideoUrl } from "@/lib/coachingVideos";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Avatar } from "@/components/app/Avatar";
import { Tag } from "@/components/app/Tag";
import { ProgressBar } from "@/components/app/ProgressBar";
import { SkeletonCard } from "@/components/app/Skeleton";
import { EmptyState } from "@/components/app/EmptyState";
import { WorkoutCheckItem } from "@/components/app/WorkoutCheckItem";
import { Button } from "@/components/ui/button";
import { SkillVideo } from "@/components/player/SkillVideo";
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
  shot_type: string | null;
  shots_expected: number | null;
  video_url: string | null;
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
  const { t } = useTranslation();
  const calendar = useLocalCalendarDay();
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const { evaluate: evaluateBadges, newBadges, dismissAllBadges } = useBadgeEvaluation(playerId);

  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const todayStr = calendar.split("|")[0];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch player
  const { data: player, isLoading: playerLoading, isError: playerError, refetch: retryPlayer } = useQuery({
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
  const { data: trainingPlan, isError: planError, refetch: retryPlan } = useQuery({
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
  const { data: todayCard, isLoading: cardLoading, isError: cardError, refetch: retryCard } = useQuery({
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
  const { data: tasks, isLoading: tasksLoading, isError: tasksError, refetch: retryTasks } = useQuery({
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
  const { data: completions, isLoading: completionsLoading, isError: completionsError, refetch: retryCompletions } = useQuery({
    queryKey: ["personal-task-completions", playerId, tasks?.map(t => t.id)],
    queryFn: async () => {
      if (!tasks || tasks.length === 0) return [];
      const { data, error } = await supabase
        .from("personal_task_completions")
        .select("*")
        .eq("player_id", playerId)
        .in("personal_practice_task_id", tasks.map(t => t.id));
      if (error) throw error;
      return (data as PersonalTaskCompletion[]).filter(completion => completion.completed);
    },
    enabled: !!tasks && tasks.length > 0,
  });

  // Create workout from template
  const createWorkout = useMutation({
    mutationFn: async (templateId: string) => {
      const template = DAY_TEMPLATES.find((t) => t.id === templateId);
      if (!template) throw new Error("Template not found");

      const tasks = template.taskIds.map(taskId => TASK_LIBRARY.find(task => task.id === taskId)).filter((task): task is NonNullable<typeof task> => Boolean(task));
      return savePersonalWorkouts(playerId!, trainingPlan?.tier || "base", [{
        date: todayStr, title: template.title, mode: "solo",
        tasks: tasks.map((task, index) => ({
          label: task.label, task_type: task.type, sort_order: index, is_required: task.isRequired || false,
          shot_type: task.shotType ?? "none", shots_expected: task.shots || null,
          target_type: task.minutes ? "minutes" : task.reps ? "reps" : "none", target_value: task.minutes || task.reps || null,
          video_url: getRecommendedCoachingVideoUrl({ label: task.label, taskType: task.type, shotType: task.shotType }),
        })),
      }]);

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-practice-card", playerId, todayStr] });
      setShowWorkoutPicker(false);
      toast.success(t('solo.workoutReady'), t('solo.letsGetToWork'));
    },
    onError: (error: Error) => {
      toast.error(t('solo.failedToCreateWorkout'), error.message);
    },
  });

  // Toggle task completion
  const toggleTask = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const { data, error } = await supabase.rpc("set_personal_task_completion", {
        p_player_id: playerId!, p_task_id: taskId, p_completed: completed,
      });
      if (error) throw error;
      if (!data || typeof data !== "object" || Array.isArray(data) || data.success !== true) throw new Error("Your activity could not be saved. Please try again.");
      return { completed: data.completed === true, allDone: data.session_status === "complete", taskLabel: tasks?.find(task => task.id === taskId)?.label };
    },
    onSuccess: async result => {
      await queryClient.invalidateQueries({ queryKey: ["personal-task-completions", playerId] });
      await queryClient.invalidateQueries({ queryKey: ["solo-dashboard", playerId] });
      if (result.allDone) {
        toast.success(t('solo.workoutComplete'), t('solo.amazingWorkToday'));
        evaluateBadges();
      }
      else if (result.completed) toast.success(t('solo.niceCheck'), result.taskLabel || t('solo.taskCompleted'));
    },

    onError: (error: Error) => {
      toast.error(t('solo.couldntSave'), error.message);
    },
  });

  const completedCount = completions?.length || 0;
  const totalCount = tasks?.length || 0;
  const isAllDone = totalCount > 0 && completedCount === totalCount;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const isLoading = playerLoading || cardLoading || tasksLoading || completionsLoading || authLoading;

  // Show loading state while auth or data is loading
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

  // If not authenticated, render nothing while redirect happens
  if (!isAuthenticated) {
    return null;
  }

  if (playerError || planError || cardError || tasksError || completionsError) {
    return <AppShell><PageContainer><DataLoadError title="Couldn’t load your home workout" onRetry={() => {
      void Promise.all([playerError && retryPlayer(), planError && retryPlan(), cardError && retryCard(), tasksError && retryTasks(), completionsError && retryCompletions()]);
    }} /></PageContainer></AppShell>;
  }

  if (!player) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <AppCard>
            <EmptyState
              icon={User}
              title={t('solo.playerNotFound')}
              description={t('solo.playerNotFoundDesc')}
              action={{ label: t('common.back'), onClick: () => navigate("/welcome") }}
            />
          </AppCard>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell
      header={
        <div className="flex items-center justify-between w-full">
          <button aria-label="Go back"
            onClick={() => navigate(`/solo/dashboard/${playerId}`)}
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
              <p className="font-semibold">{t('solo.playersTraining', { name: player.first_name })}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(), "EEEE, MMM d")}
              </p>
            </div>
          </div>
          <Button aria-label="Open player profile"
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
              ? "bg-gradient-to-br from-success/10 to-success/5 border-success/30"
              : "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                isAllDone ? "bg-success" : "bg-primary"
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
                  <p className="text-sm text-muted-foreground">{t('solo.todaysWorkout')}</p>
                  <p className="font-bold text-lg">{todayCard.title || t('solo.trainingSession')}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <ProgressBar value={progressPercent} className="flex-1 h-2" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {completedCount}/{totalCount}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-bold text-lg">{t('solo.readyToTrain')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('solo.pickAWorkoutToGetStarted')}
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
              <p className="text-sm font-semibold text-muted-foreground">{t('solo.tasks')}</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowWorkoutPicker(true)}
              >
                <RotateCcw className="w-3 h-3" />
                {t('solo.change')}
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
                    ? t('solo.required')
                    : undefined;

                return (
                  <div key={task.id} className="space-y-2">
                    <WorkoutCheckItem
                      id={task.id}
                      label={task.label}
                      target={target}
                      icon={taskTypeIcons[task.task_type] || taskTypeIcons.other}
                      completed={isCompleted || false}
                      disabled={toggleTask.isPending || createWorkout.isPending}
                      onToggle={(id, completed) => toggleTask.mutate({ taskId: id, completed })}
                    />
                    {task.video_url ? (
                      <SkillVideo
                        key={task.video_url}
                        url={task.video_url}
                        taskTitle={task.label}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>

            {isAllDone && (
              <AppCard className="bg-success/10 border-success/30 text-center py-6">
                <Trophy className="w-12 h-12 text-success mx-auto mb-3" />
                <p className="font-bold text-lg">{t('solo.workoutComplete')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('solo.greatWorkSeeYouTomorrow', { name: player.first_name })}
                </p>
                <Button
                  className="mt-4"
                  onClick={() => navigate(`/solo/dashboard/${playerId}`)}
                >
                  {t('solo.returnToDashboard')}
                </Button>
              </AppCard>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground px-1">
              {t('solo.pickAWorkout')}
            </p>
            <div className="grid gap-3">
              {DAY_TEMPLATES.slice(0, 6).map((template) => (
                <button type="button" key={template.id} disabled={createWorkout.isPending} onClick={() => createWorkout.mutate(template.id)} className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">
                <AppCard className="hover:shadow-medium transition-all">
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
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <AppCard>
          <AppCardTitle className="text-base mb-3">{t('solo.thisWeek')}</AppCardTitle>
          <div className="flex justify-center text-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                {trainingPlan?.days_per_week || 4}
              </p>
              <p className="text-xs text-muted-foreground">{t('solo.dayGoal')}</p>
            </div>
          </div>
        </AppCard>
      </PageContainer>

      {/* Workout Picker Sheet */}
      <Sheet open={showWorkoutPicker} onOpenChange={setShowWorkoutPicker}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle>{t('solo.changeTodaysWorkout')}</SheetTitle>
            <SheetDescription>
              {t('solo.pickDifferentWorkoutTemplate')}
            </SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-3 overflow-y-auto max-h-[50vh]">
            {DAY_TEMPLATES.filter(template => template.id !== "rest_day").map((template) => (
              <button type="button" key={template.id} disabled={createWorkout.isPending} onClick={() => createWorkout.mutate(template.id)} className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">
              <AppCard className="hover:shadow-medium transition-all">
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
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
      {newBadges.length > 0 && <BadgeEarnedToast badgeName={newBadges[0].name} onClose={dismissAllBadges} />}
    </AppShell>
  );
};

export default SoloToday;
