import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { teamPalettes } from "@/lib/themes";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardTitle } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { ChecklistItem } from "@/components/app/ChecklistItem";
import { ProgressBar } from "@/components/app/ProgressBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "@/components/app/Toast";
import { format } from "date-fns";
import {
  ChevronLeft,
  Target,
  Dumbbell,
  Timer,
  Heart,
  Sparkles,
  MoreHorizontal,
  Trophy,
  Calendar,
} from "lucide-react";

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

interface TaskCompletion {
  id: string;
  practice_task_id: string;
  completed: boolean;
  shots_logged: number;
}

interface SessionCompletion {
  id: string;
  status: string;
  completed_at: string | null;
}

const taskTypeIcons: Record<string, React.ReactNode> = {
  shooting: <Target className="w-5 h-5" />,
  conditioning: <Dumbbell className="w-5 h-5" />,
  mobility: <Heart className="w-5 h-5" />,
  recovery: <Timer className="w-5 h-5" />,
  prep: <Sparkles className="w-5 h-5" />,
  other: <MoreHorizontal className="w-5 h-5" />,
};

const tierLabels: Record<string, string> = {
  rec: "Rec",
  rep: "Rep",
  elite: "Elite",
};

const PlayerToday: React.FC = () => {
  const { id: playerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();

  const [showShotsSheet, setShowShotsSheet] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [shotsInput, setShotsInput] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch player
  const { data: player } = useQuery({
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

  // Fetch player's active team
  const { data: teamData, isLoading: teamLoading } = useQuery({
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

  // Fetch today's practice card with tasks
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const { data: practiceCard, isLoading: cardLoading } = useQuery({
    queryKey: ["todays-card-full", teamData?.id, todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("practice_cards")
        .select(`
          *,
          practice_tasks (*)
        `)
        .eq("team_id", teamData!.id)
        .eq("date", todayStr)
        .not("published_at", "is", null)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!teamData?.id,
  });

  // Fetch task completions for this player
  const { data: taskCompletions, isLoading: completionsLoading } = useQuery({
    queryKey: ["task-completions", practiceCard?.id, playerId],
    queryFn: async () => {
      const taskIds = practiceCard!.practice_tasks.map((t: PracticeTask) => t.id);
      
      const { data, error } = await supabase
        .from("task_completions")
        .select("*")
        .in("practice_task_id", taskIds)
        .eq("player_id", playerId!);

      if (error) throw error;
      return data as TaskCompletion[];
    },
    enabled: !!practiceCard?.practice_tasks?.length && !!playerId,
  });

  // Fetch session completion
  const { data: sessionCompletion } = useQuery({
    queryKey: ["session-completion", practiceCard?.id, playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_completions")
        .select("*")
        .eq("practice_card_id", practiceCard!.id)
        .eq("player_id", playerId!)
        .maybeSingle();

      if (error) throw error;
      return data as SessionCompletion | null;
    },
    enabled: !!practiceCard?.id && !!playerId,
  });

  // Apply team theme
  useEffect(() => {
    if (teamData?.palette_id) {
      setTeamTheme(teamData.palette_id);
    }
  }, [teamData?.palette_id, setTeamTheme]);

  const tasks = useMemo(() => {
    if (!practiceCard?.practice_tasks) return [];
    return [...practiceCard.practice_tasks].sort((a: PracticeTask, b: PracticeTask) => a.sort_order - b.sort_order);
  }, [practiceCard]);

  const completionMap = useMemo(() => {
    const map: Record<string, TaskCompletion> = {};
    taskCompletions?.forEach((c) => {
      map[c.practice_task_id] = c;
    });
    return map;
  }, [taskCompletions]);

  const completedCount = tasks.filter((t: PracticeTask) => completionMap[t.id]?.completed).length;
  const requiredCount = tasks.filter((t: PracticeTask) => t.is_required).length;
  const requiredCompletedCount = tasks.filter(
    (t: PracticeTask) => t.is_required && completionMap[t.id]?.completed
  ).length;
  const totalShots = taskCompletions?.reduce((sum, c) => sum + (c.shots_logged || 0), 0) || 0;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  // Toggle task completion
  const toggleMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const existing = completionMap[taskId];

      if (existing) {
        const { error } = await supabase
          .from("task_completions")
          .update({
            completed,
            completed_at: completed ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("task_completions")
          .insert({
            practice_task_id: taskId,
            player_id: playerId,
            completed,
            completed_at: completed ? new Date().toISOString() : null,
            completed_by: "parent",
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-completions", practiceCard?.id, playerId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to update", error.message);
    },
  });

  // Log shots
  const logShotsMutation = useMutation({
    mutationFn: async ({ taskId, shots }: { taskId: string; shots: number }) => {
      const existing = completionMap[taskId];

      if (existing) {
        const { error } = await supabase
          .from("task_completions")
          .update({
            shots_logged: shots,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("task_completions")
          .insert({
            practice_task_id: taskId,
            player_id: playerId,
            completed: false,
            shots_logged: shots,
            completed_by: "parent",
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-completions", practiceCard?.id, playerId] });
      setShowShotsSheet(false);
      setShotsInput("");
      toast.success("Shots logged");
    },
    onError: (error: Error) => {
      toast.error("Failed to log shots", error.message);
    },
  });

  // Complete session
  const completeSessionMutation = useMutation({
    mutationFn: async () => {
      const status = requiredCompletedCount === requiredCount ? "complete" : "partial";

      if (sessionCompletion) {
        const { error } = await supabase
          .from("session_completions")
          .update({
            status: "complete",
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionCompletion.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("session_completions")
          .insert({
            practice_card_id: practiceCard!.id,
            player_id: playerId,
            status: "complete",
            completed_at: new Date().toISOString(),
            completed_by: "parent",
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-completion", practiceCard?.id, playerId] });
      setShowSuccess(true);
      toast.success("Session complete! 🎉");
    },
    onError: (error: Error) => {
      toast.error("Failed to complete session", error.message);
    },
  });

  const handleTaskToggle = (taskId: string, completed: boolean) => {
    toggleMutation.mutate({ taskId, completed });
  };

  const handleShotsClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShotsInput(completionMap[taskId]?.shots_logged?.toString() || "");
    setShowShotsSheet(true);
  };

  const palette = teamData ? teamPalettes.find((p) => p.id === teamData.palette_id) : null;
  const isLoading = authLoading || teamLoading || cardLoading;
  const isSessionComplete = sessionCompletion?.status === "complete";

  if (isLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <SkeletonCard />
          <SkeletonCard />
        </PageContainer>
      </AppShell>
    );
  }

  if (!practiceCard) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate("/today")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold">Today</h1>
          </div>
          <AppCard>
            <EmptyState
              icon={Calendar}
              title="No practice today"
              description="There's no workout published for today. Check back later!"
              action={{
                label: "Go Back",
                onClick: () => navigate("/today"),
              }}
            />
          </AppCard>
        </PageContainer>
      </AppShell>
    );
  }

  if (showSuccess) {
    return (
      <AppShell hideNav>
        <PageContainer className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
            style={{
              background: palette ? `hsl(${palette.primary} / 0.1)` : undefined,
            }}
          >
            <Trophy
              className="w-12 h-12"
              style={{ color: palette ? `hsl(${palette.primary})` : undefined }}
            />
          </div>
          <h1 className="text-2xl font-bold mb-2">Great work!</h1>
          <p className="text-text-muted mb-2">
            {player?.first_name} completed today's practice
          </p>
          <div className="flex items-center gap-2 mb-6">
            <Tag variant="tier">{tierLabels[practiceCard.tier]}</Tag>
            {totalShots > 0 && (
              <Tag variant="accent">{totalShots} shots</Tag>
            )}
          </div>
          <Button onClick={() => navigate("/today")}>Done</Button>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate("/today")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">Today</h1>
            <div className="flex items-center gap-2">
              <Tag variant="tier" size="sm">{tierLabels[practiceCard.tier]}</Tag>
              {teamData && (
                <span className="text-xs text-text-muted truncate">{teamData.name}</span>
              )}
            </div>
          </div>
          {player && (
            <Avatar
              src={player.profile_photo_url}
              fallback={`${player.first_name} ${player.last_initial || ""}`}
              size="sm"
            />
          )}
        </div>
      }
    >
      <PageContainer>
        {/* Progress */}
        <AppCard>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-text-muted">
              {completedCount}/{tasks.length} tasks
            </span>
          </div>
          <ProgressBar value={progress} />
        </AppCard>

        {/* Tasks */}
        <div>
          {practiceCard.title && (
            <p className="text-sm text-text-secondary mb-3 font-medium">
              {practiceCard.title}
            </p>
          )}

          <div className="space-y-2">
            {tasks.map((task: PracticeTask) => {
              const completion = completionMap[task.id];
              const isCompleted = !!completion?.completed;
              const isShooting = task.task_type === "shooting" || task.shots_expected;

              return (
                <div key={task.id} className="relative">
                  <ChecklistItem
                    id={task.id}
                    label={task.label}
                    target={
                      task.target_type !== "none" && task.target_value
                        ? `${task.target_value} ${task.target_type}`
                        : undefined
                    }
                    icon={taskTypeIcons[task.task_type]}
                    completed={isCompleted}
                    disabled={isSessionComplete}
                    onToggle={handleTaskToggle}
                  />
                  {isShooting && (
                    <button
                      className="absolute right-12 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded bg-muted text-text-muted hover:bg-muted/80 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShotsClick(task.id);
                      }}
                      disabled={isSessionComplete}
                    >
                      {completion?.shots_logged || 0} shots
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="space-y-3 pt-4">
          {totalShots > 0 && (
            <AppCard variant="muted">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">Total Shots</span>
                <span className="font-semibold">{totalShots}</span>
              </div>
            </AppCard>
          )}

          {!isSessionComplete && (
            <Button
              className="w-full"
              size="lg"
              onClick={() => completeSessionMutation.mutate()}
              disabled={completeSessionMutation.isPending}
            >
              <Trophy className="w-5 h-5 mr-2" />
              Complete Session
            </Button>
          )}

          {isSessionComplete && (
            <AppCard
              className="text-center"
              style={{
                background: palette ? `hsl(${palette.primary} / 0.05)` : undefined,
              }}
            >
              <Trophy
                className="w-8 h-8 mx-auto mb-2"
                style={{ color: palette ? `hsl(${palette.primary})` : undefined }}
              />
              <p className="font-semibold">Session Complete!</p>
              <p className="text-sm text-text-muted">
                {format(new Date(sessionCompletion!.completed_at!), "h:mm a")}
              </p>
            </AppCard>
          )}
        </div>
      </PageContainer>

      {/* Shots Input Sheet */}
      <Sheet open={showShotsSheet} onOpenChange={setShowShotsSheet}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>Log Shots</SheetTitle>
            <SheetDescription>
              How many shots did {player?.first_name} take?
            </SheetDescription>
          </SheetHeader>
          <div className="py-6 space-y-4">
            <Input
              type="number"
              value={shotsInput}
              onChange={(e) => setShotsInput(e.target.value)}
              placeholder="0"
              className="text-center text-2xl h-16"
              autoFocus
            />
            <div className="flex gap-2">
              {[10, 25, 50, 100].map((num) => (
                <Button
                  key={num}
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShotsInput(num.toString())}
                >
                  {num}
                </Button>
              ))}
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (selectedTaskId && shotsInput) {
                  logShotsMutation.mutate({
                    taskId: selectedTaskId,
                    shots: parseInt(shotsInput),
                  });
                }
              }}
              disabled={!shotsInput || logShotsMutation.isPending}
            >
              Save
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
};

export default PlayerToday;
