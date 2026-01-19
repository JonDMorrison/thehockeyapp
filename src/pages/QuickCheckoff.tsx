import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { useOffline } from "@/hooks/useOffline";
import {
  queueOfflineEvent,
  generateLocalEventId,
  saveCompletionSnapshot,
  getCompletionSnapshot,
} from "@/lib/offlineStorage";
import { startSyncInterval, stopSyncInterval } from "@/lib/syncEngine";
import { OfflineDot } from "@/components/app/OfflineIndicator";
import { WorkoutCheckItem } from "@/components/app/WorkoutCheckItem";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/app/Toast";
import { format } from "date-fns";
import {
  Check,
  X,
  Target,
  Dumbbell,
  Timer,
  Heart,
  Sparkles,
  MoreHorizontal,
  Undo2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PracticeTask {
  id: string;
  sort_order: number;
  task_type: string;
  label: string;
  target_type: string;
  target_value: number | null;
  shot_type: string;
  shots_expected: number | null;
  is_required: boolean;
}

interface PracticeCard {
  id: string;
  team_id: string;
  date: string;
  tier: string;
  title: string | null;
  mode: string;
  practice_tasks: PracticeTask[];
}

interface LocalCompletion {
  completed: boolean;
  shotsLogged: number;
}

interface UndoAction {
  taskId: string;
  previousState: boolean;
  timestamp: number;
}

const taskTypeIcons: Record<string, React.ReactNode> = {
  shooting: <Target className="w-6 h-6" />,
  conditioning: <Dumbbell className="w-6 h-6" />,
  mobility: <Heart className="w-6 h-6" />,
  recovery: <Timer className="w-6 h-6" />,
  prep: <Sparkles className="w-6 h-6" />,
  other: <MoreHorizontal className="w-6 h-6" />,
};

const QuickCheckoff: React.FC = () => {
  const [searchParams] = useSearchParams();
  const playerId = searchParams.get("player_id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();
  const { isOnline, status: offlineStatus } = useOffline();

  const [localCompletions, setLocalCompletions] = useState<Record<string, LocalCompletion>>({});
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);

  useEffect(() => {
    startSyncInterval();
    return () => stopSyncInterval();
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch player's active team
  const { data: teamData } = useQuery({
    queryKey: ["player-active-team", playerId],
    queryFn: async () => {
      const { data: pref } = await supabase
        .from("player_team_preferences")
        .select("active_team_id")
        .eq("player_id", playerId!)
        .maybeSingle();

      if (!pref?.active_team_id) return null;

      const { data: team, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", pref.active_team_id)
        .single();

      if (error) throw error;
      return team;
    },
    enabled: !!user && !!playerId,
  });

  // Apply team theme
  useEffect(() => {
    if (teamData?.palette_id) {
      setTeamTheme(teamData.palette_id);
    }
  }, [teamData?.palette_id, setTeamTheme]);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Check if game day
  const { data: gameDayData } = useQuery({
    queryKey: ["team-game-day", teamData?.id, todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_game_days")
        .select("enabled")
        .eq("team_id", teamData!.id)
        .eq("date", todayStr)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!teamData?.id && isOnline,
  });

  const isGameDay = gameDayData?.enabled === true;

  // Fetch practice card with tasks
  const { data: practiceCard, isLoading } = useQuery<PracticeCard | null>({
    queryKey: ["quick-checkoff-card", teamData?.id, todayStr, isGameDay],
    queryFn: async () => {
      if (isGameDay) {
        const { data: gameDayCard, error: gameDayError } = await supabase
          .from("practice_cards")
          .select(`*, practice_tasks (*)`)
          .eq("team_id", teamData!.id)
          .eq("date", todayStr)
          .eq("mode", "game_day")
          .not("published_at", "is", null)
          .maybeSingle();

        if (gameDayError) throw gameDayError;
        if (gameDayCard) return gameDayCard as PracticeCard;
      }

      const { data, error } = await supabase
        .from("practice_cards")
        .select(`*, practice_tasks (*)`)
        .eq("team_id", teamData!.id)
        .eq("date", todayStr)
        .eq("mode", "normal")
        .not("published_at", "is", null)
        .maybeSingle();

      if (error) throw error;
      return data as PracticeCard | null;
    },
    enabled: !!teamData?.id,
  });

  // Fetch existing completions
  const { data: existingCompletions } = useQuery({
    queryKey: ["quick-checkoff-completions", practiceCard?.id, playerId],
    queryFn: async () => {
      const taskIds = practiceCard!.practice_tasks.map((t) => t.id);
      const { data, error } = await supabase
        .from("task_completions")
        .select("*")
        .in("practice_task_id", taskIds)
        .eq("player_id", playerId!);

      if (error) throw error;
      
      const completions: Record<string, LocalCompletion> = {};
      data?.forEach((c) => {
        completions[c.practice_task_id] = {
          completed: c.completed ?? false,
          shotsLogged: c.shots_logged ?? 0,
        };
      });
      setLocalCompletions((prev) => ({ ...prev, ...completions }));
      return data;
    },
    enabled: !!practiceCard?.practice_tasks?.length && !!playerId && isOnline,
  });

  // Load cached completions
  useEffect(() => {
    const loadCached = async () => {
      if (practiceCard?.id && playerId) {
        const snapshot = await getCompletionSnapshot(playerId, practiceCard.id);
        if (snapshot) {
          setLocalCompletions(snapshot.taskCompletionMap);
        }
      }
    };
    loadCached();
  }, [practiceCard?.id, playerId]);

  // Required tasks only
  const requiredTasks = practiceCard?.practice_tasks
    ?.filter((t) => t.is_required)
    .sort((a, b) => a.sort_order - b.sort_order) || [];

  const completedCount = requiredTasks.filter((t) => localCompletions[t.id]?.completed).length;
  const progress = requiredTasks.length > 0 ? (completedCount / requiredTasks.length) * 100 : 0;
  const allDone = completedCount === requiredTasks.length && requiredTasks.length > 0;

  // Save snapshot
  const saveSnapshot = useCallback(async (completions: Record<string, LocalCompletion>) => {
    if (practiceCard?.id && playerId) {
      const done = requiredTasks.filter((t) => completions[t.id]?.completed).length;
      const status = done === 0 ? 'none' : done === requiredTasks.length ? 'complete' : 'partial';
      await saveCompletionSnapshot(playerId, practiceCard.id, completions, status);
    }
  }, [practiceCard?.id, playerId, requiredTasks]);

  // Clear undo after 5 seconds
  useEffect(() => {
    if (undoAction) {
      const timer = setTimeout(() => setUndoAction(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [undoAction]);

  // Handle task toggle
  const handleToggle = useCallback(async (taskId: string) => {
    const current = localCompletions[taskId]?.completed ?? false;
    const newCompleted = !current;
    const now = new Date().toISOString();

    // Store undo action
    setUndoAction({ taskId, previousState: current, timestamp: Date.now() });

    // Optimistic update
    const newCompletions = {
      ...localCompletions,
      [taskId]: { completed: newCompleted, shotsLogged: localCompletions[taskId]?.shotsLogged ?? 0 },
    };
    setLocalCompletions(newCompletions);
    await saveSnapshot(newCompletions);

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(newCompleted ? 50 : 30);
    }

    if (isOnline) {
      try {
        const existing = existingCompletions?.find((c) => c.practice_task_id === taskId);
        if (existing) {
          await supabase
            .from("task_completions")
            .update({ completed: newCompleted, completed_at: newCompleted ? now : null, updated_at: now })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("task_completions")
            .insert({
              practice_task_id: taskId,
              player_id: playerId,
              completed: newCompleted,
              completed_at: newCompleted ? now : null,
              completed_by: "quick_checkoff",
            });
        }
        queryClient.invalidateQueries({ queryKey: ["quick-checkoff-completions"] });
      } catch {
        await queueForOffline(taskId, newCompleted, now);
      }
    } else {
      await queueForOffline(taskId, newCompleted, now);
    }
  }, [localCompletions, existingCompletions, playerId, isOnline, queryClient, saveSnapshot]);

  const queueForOffline = async (taskId: string, completed: boolean, timestamp: string) => {
    await queueOfflineEvent({
      localEventId: generateLocalEventId(),
      createdAt: timestamp,
      userId: user!.id,
      playerId: playerId!,
      teamId: teamData!.id,
      practiceCardId: practiceCard!.id,
      eventType: 'task_toggle',
      payload: {
        practice_task_id: taskId,
        player_id: playerId,
        completed,
        completed_at: completed ? timestamp : null,
        completed_by: 'quick_checkoff',
        shots_logged: localCompletions[taskId]?.shotsLogged ?? 0,
      },
      status: 'pending',
    });
  };

  // Undo handler
  const handleUndo = useCallback(async () => {
    if (!undoAction) return;
    const { taskId, previousState } = undoAction;
    const now = new Date().toISOString();

    const newCompletions = {
      ...localCompletions,
      [taskId]: { completed: previousState, shotsLogged: localCompletions[taskId]?.shotsLogged ?? 0 },
    };
    setLocalCompletions(newCompletions);
    await saveSnapshot(newCompletions);
    setUndoAction(null);

    if (isOnline) {
      try {
        const existing = existingCompletions?.find((c) => c.practice_task_id === taskId);
        if (existing) {
          await supabase
            .from("task_completions")
            .update({ completed: previousState, completed_at: previousState ? now : null, updated_at: now })
            .eq("id", existing.id);
        }
        queryClient.invalidateQueries({ queryKey: ["quick-checkoff-completions"] });
      } catch {
        await queueForOffline(taskId, previousState, now);
      }
    }
  }, [undoAction, localCompletions, existingCompletions, isOnline, queryClient, saveSnapshot]);

  // Complete session handler
  const handleCompleteSession = async () => {
    const now = new Date().toISOString();
    
    if (isOnline) {
      try {
        await supabase
          .from("session_completions")
          .upsert({
            practice_card_id: practiceCard!.id,
            player_id: playerId!,
            status: 'complete',
            completed_at: now,
            completed_by: 'quick_checkoff',
          }, { onConflict: 'practice_card_id,player_id' });
        
        toast.success("Session complete!", "Great work today!");
        navigate(`/players/${playerId}/home`);
      } catch {
        toast.error("Error completing session");
      }
    } else {
      await queueOfflineEvent({
        localEventId: generateLocalEventId(),
        createdAt: now,
        userId: user!.id,
        playerId: playerId!,
        teamId: teamData!.id,
        practiceCardId: practiceCard!.id,
        eventType: 'session_complete',
        payload: {
          practice_card_id: practiceCard!.id,
          player_id: playerId,
          status: 'complete',
          completed_at: now,
          completed_by: 'quick_checkoff',
        },
        status: 'pending',
      });
      toast.success("Saved offline", "Will sync when online");
      navigate(`/players/${playerId}/home`);
    }
  };

  if (!playerId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No player selected</p>
      </div>
    );
  }

  // Show loading state while auth or data is loading
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Zap className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  // If not authenticated, render nothing while redirect happens
  if (!isAuthenticated) {
    return null;
  }

  if (!practiceCard) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No workout published today</p>
          <Button variant="outline" onClick={() => navigate(`/players/${playerId}/home`)}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(`/players/${playerId}/today`)}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Quick Mode</span>
            <OfflineDot status={offlineStatus} />
          </div>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
            <span>{completedCount} of {requiredTasks.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      {/* Task list */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {requiredTasks.map((task) => {
          const isCompleted = localCompletions[task.id]?.completed ?? false;
          const target = task.target_type === 'reps' && task.target_value
            ? `${task.target_value} reps`
            : task.target_type === 'seconds' && task.target_value
              ? `${task.target_value}s`
              : task.target_type === 'minutes' && task.target_value
                ? `${task.target_value} min`
                : '';

          return (
            <WorkoutCheckItem
              key={task.id}
              id={task.id}
              label={task.label}
              target={target}
              icon={taskTypeIcons[task.task_type]}
              completed={isCompleted}
              onToggle={(id) => handleToggle(id)}
            />
          );
        })}
      </main>

      {/* Undo snackbar */}
      {undoAction && (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
          <div className="bg-card border border-border rounded-lg shadow-lg p-3 flex items-center justify-between">
            <span className="text-sm">Task updated</span>
            <Button variant="ghost" size="sm" onClick={handleUndo}>
              <Undo2 className="w-4 h-4 mr-1" />
              Undo
            </Button>
          </div>
        </div>
      )}

      {/* Complete session button */}
      <footer className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border p-4">
        <Button
          onClick={handleCompleteSession}
          className="w-full h-14 text-lg font-semibold"
          disabled={!allDone}
        >
          {allDone ? "Complete Session" : `${requiredTasks.length - completedCount} tasks remaining`}
        </Button>
      </footer>
    </div>
  );
};

export default QuickCheckoff;