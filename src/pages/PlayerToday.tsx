import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveView } from "@/contexts/ActiveViewContext";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { useOffline } from "@/hooks/useOffline";
import { teamPalettes } from "@/lib/themes";
import {
  cachePracticeCard,
  getCachedCard,
  queueOfflineEvent,
  generateLocalEventId,
  saveCompletionSnapshot,
  getCompletionSnapshot,
} from "@/lib/offlineStorage";
import { startSyncInterval, stopSyncInterval, syncPendingEvents } from "@/lib/syncEngine";
import { logger } from "@/core";
import { fireGoalConfetti } from "@/lib/confetti";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { WorkoutCheckItem } from "@/components/app/WorkoutCheckItem";
import { ProgressBar } from "@/components/app/ProgressBar";
import { OfflineIndicator } from "@/components/app/OfflineIndicator";
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
  WifiOff,
  Zap,
  Settings,
  Award,
  Flame,
} from "lucide-react";
import { SessionPhotoUpload } from "@/components/player/SessionPhotoUpload";
import { PlayerSettingsSheet } from "@/components/player/PlayerSettingsSheet";
import { BadgeEarnedToast } from "@/components/player/BadgeEarnedToast";
import { useBadgeEvaluation } from "@/hooks/useBadgeEvaluation";
import { PlayerGoalWidget } from "@/components/goals";
import { ContextSwitcher } from "@/components/app/ContextSwitcher";
import { SessionCelebration } from "@/components/player/SessionCelebration";

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

interface PracticeCard {
  id: string;
  team_id: string;
  date: string;
  tier: string;
  title: string | null;
  notes: string | null;
  mode: string;
  practice_tasks: PracticeTask[];
}

interface GameDay {
  enabled: boolean;
}

interface LocalCompletion {
  completed: boolean;
  shotsLogged: number;
}

const taskTypeIcons: Record<string, React.ReactNode> = {
  shooting: <Target className="w-5 h-5" />,
  conditioning: <Dumbbell className="w-5 h-5" />,
  mobility: <Heart className="w-5 h-5" />,
  recovery: <Timer className="w-5 h-5" />,
  prep: <Sparkles className="w-5 h-5" />,
  other: <MoreHorizontal className="w-5 h-5" />,
};

// tierLabels is defined inside the component to access t()

const PlayerToday: React.FC = () => {
  const { t } = useTranslation();
  const { id: playerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const tierLabels: Record<string, string> = {
    rec: t("teams.practice.tierRec"),
    rep: t("teams.practice.tierRep"),
    elite: t("teams.practice.tierElite"),
  };
  const { setActiveView, setActivePlayerId } = useActiveView();
  const { setTeamTheme } = useTeamTheme();
  const { isOnline, status: offlineStatus, pendingCount, triggerSync } = useOffline();
  const { evaluate: evaluateBadges, newBadges, dismissAllBadges } = useBadgeEvaluation(playerId);

  const [showShotsSheet, setShowShotsSheet] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [shotsInput, setShotsInput] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [isFirstWorkout, setIsFirstWorkout] = useState(false);
  
  // Local state for offline optimistic updates
  const [localCompletions, setLocalCompletions] = useState<Record<string, LocalCompletion>>({});
  const [localSessionStatus, setLocalSessionStatus] = useState<'none' | 'partial' | 'complete' | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const [cachedCardData, setCachedCardData] = useState<PracticeCard | null>(null);

  // Start sync interval on mount
  useEffect(() => {
    startSyncInterval();
    return () => stopSyncInterval();
  }, []);

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

  // Check if game day is enabled
  const todayStr = format(new Date(), "yyyy-MM-dd");
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
      return data as GameDay | null;
    },
    enabled: !!teamData?.id && isOnline,
  });

  const isGameDay = gameDayData?.enabled === true;

  // Fetch today's practice card with tasks (with offline fallback)
  const { data: practiceCard, isLoading: cardLoading } = useQuery<PracticeCard | null>({
    queryKey: ["todays-card-full", teamData?.id, todayStr, isGameDay],
    queryFn: async (): Promise<PracticeCard | null> => {
      try {
        // If game day is enabled, look for game_day card first
        if (isGameDay) {
          const { data: gameDayCard, error: gameDayError } = await supabase
            .from("practice_cards")
            .select(`
              *,
              practice_tasks (*)
            `)
            .eq("team_id", teamData!.id)
            .eq("date", todayStr)
            .eq("mode", "game_day")
            .not("published_at", "is", null)
            .maybeSingle();

          if (gameDayError) throw gameDayError;
          
          if (gameDayCard) {
            await cachePracticeCard(teamData!.id, `${todayStr}_game_day`, gameDayCard);
            setUsingCache(false);
            return gameDayCard as PracticeCard;
          }
        }

        // Otherwise, fall back to normal card
        const { data, error } = await supabase
          .from("practice_cards")
          .select(`
            *,
            practice_tasks (*)
          `)
          .eq("team_id", teamData!.id)
          .eq("date", todayStr)
          .eq("mode", "normal")
          .not("published_at", "is", null)
          .maybeSingle();

        if (error) throw error;

        // Cache for offline use
        if (data) {
          await cachePracticeCard(teamData!.id, todayStr, data);
          setUsingCache(false);
        }

        return data as PracticeCard | null;
      } catch (err) {
        // Try to load from cache if network fails
        if (!isOnline) {
          // Try game day cache first
          const cachedGameDay = await getCachedCard(teamData!.id, `${todayStr}_game_day`);
          if (cachedGameDay) {
            setUsingCache(true);
            const cardData = cachedGameDay as PracticeCard;
            setCachedCardData(cardData);
            return cardData;
          }
          
          // Fall back to normal cache
          const cached = await getCachedCard(teamData!.id, todayStr);
          if (cached) {
            setUsingCache(true);
            const cardData = cached as PracticeCard;
            setCachedCardData(cardData);
            return cardData;
          }
        }
        throw err;
      }
    },
    enabled: !!teamData?.id,
    retry: isOnline ? 3 : 0,
    staleTime: isOnline ? 30000 : Infinity,
  });

  // Load cached completions when offline
  useEffect(() => {
    const loadCachedCompletions = async () => {
      if (practiceCard?.id && playerId) {
        const snapshot = await getCompletionSnapshot(playerId, practiceCard.id);
        if (snapshot) {
          setLocalCompletions(snapshot.taskCompletionMap);
          setLocalSessionStatus(snapshot.sessionStatus);
        }
      }
    };
    loadCachedCompletions();
  }, [practiceCard?.id, playerId]);

  // Fetch task completions for this player (online only)
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
      
      // Update local state with server data
      const serverCompletions: Record<string, LocalCompletion> = {};
      data?.forEach((c: TaskCompletion) => {
        serverCompletions[c.practice_task_id] = {
          completed: c.completed,
          shotsLogged: c.shots_logged,
        };
      });
      setLocalCompletions((prev) => ({ ...prev, ...serverCompletions }));
      
      return data as TaskCompletion[];
    },
    enabled: !!practiceCard?.practice_tasks?.length && !!playerId && isOnline,
    staleTime: 30000,
  });

  // Fetch session completion (online only)
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
      
      // Always update localSessionStatus based on server data (or reset if no data)
      if (data) {
        setLocalSessionStatus(data.status as 'none' | 'partial' | 'complete');
      } else {
        // No session completion for this card yet - reset to 'none'
        setLocalSessionStatus('none');
      }
      
      return data as SessionCompletion | null;
    },
    enabled: !!practiceCard?.id && !!playerId && isOnline,
  });

  // Apply team theme and persist context
  useEffect(() => {
    if (teamData?.palette_id) {
      setTeamTheme(teamData.palette_id);
    }
    if (playerId) {
      setActiveView("parent");
      setActivePlayerId(playerId);
    }
  }, [teamData?.palette_id, setTeamTheme, playerId, setActiveView, setActivePlayerId]);

  const tasks = useMemo(() => {
    if (!practiceCard?.practice_tasks) return [];
    return [...practiceCard.practice_tasks].sort((a: PracticeTask, b: PracticeTask) => a.sort_order - b.sort_order);
  }, [practiceCard]);

  // Use local completions for UI (optimistic updates)
  const completionMap = localCompletions;

  const completedCount = tasks.filter((t: PracticeTask) => completionMap[t.id]?.completed).length;
  const requiredCount = tasks.filter((t: PracticeTask) => t.is_required).length;
  const requiredCompletedCount = tasks.filter(
    (t: PracticeTask) => t.is_required && completionMap[t.id]?.completed
  ).length;
  const totalShots = Object.values(completionMap).reduce((sum, c) => sum + (c.shotsLogged || 0), 0);
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  // Save local snapshot
  const saveLocalSnapshot = useCallback(async (
    completions: Record<string, LocalCompletion>,
    sessionStatus: 'none' | 'partial' | 'complete'
  ) => {
    if (practiceCard?.id && playerId) {
      await saveCompletionSnapshot(playerId, practiceCard.id, completions, sessionStatus);
    }
  }, [practiceCard?.id, playerId]);

  // Handle task toggle with offline support
  const handleTaskToggle = useCallback(async (taskId: string, completed: boolean) => {
    const now = new Date().toISOString();
    const existingShots = completionMap[taskId]?.shotsLogged || 0;

    // Optimistic update
    const newCompletions = {
      ...localCompletions,
      [taskId]: { completed, shotsLogged: existingShots },
    };
    setLocalCompletions(newCompletions);

    // Determine session status
    const newCompletedCount = tasks.filter((t: PracticeTask) => newCompletions[t.id]?.completed).length;
    const newSessionStatus = newCompletedCount === 0 ? 'none' : 
      newCompletedCount === tasks.length ? 'complete' : 'partial';

    // Save to local storage
    await saveLocalSnapshot(newCompletions, newSessionStatus);

    if (isOnline) {
      // Try online update
      try {
        const existingCompletion = taskCompletions?.find((c) => c.practice_task_id === taskId);
        
        if (existingCompletion) {
          const { error: updateError } = await supabase
            .from("task_completions")
            .update({
              completed,
              completed_at: completed ? now : null,
              updated_at: now,
            })
            .eq("id", existingCompletion.id);
          if (updateError) logger.error("Failed to update task completion", { updateError });
        } else {
          const { error: insertError } = await supabase
            .from("task_completions")
            .insert({
              practice_task_id: taskId,
              player_id: playerId,
              completed,
              completed_at: completed ? now : null,
              completed_by: "parent",
            });
          if (insertError) logger.error("Failed to insert task completion", { insertError });
        }

        queryClient.invalidateQueries({ queryKey: ["task-completions", practiceCard?.id, playerId] });
      } catch (err) {
        // Queue for offline sync
        await queueForSync('task_toggle', taskId, completed, existingShots, now);
        toast.info(t("common.savedOffline"));
      }
    } else {
      // Queue for offline sync
      await queueForSync('task_toggle', taskId, completed, existingShots, now);
      toast.info(t("common.savedOffline"));
    }
  }, [completionMap, localCompletions, tasks, taskCompletions, playerId, practiceCard?.id, isOnline, queryClient, saveLocalSnapshot]);

  const queueForSync = async (
    type: 'task_toggle' | 'shots_update' | 'session_complete',
    taskId?: string,
    completed?: boolean,
    shotsLogged?: number,
    timestamp?: string
  ) => {
    const localEventId = generateLocalEventId();

    if (type === 'task_toggle' && taskId) {
      await queueOfflineEvent({
        localEventId,
        createdAt: timestamp || new Date().toISOString(),
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
          completed_by: 'parent',
          shots_logged: shotsLogged || 0,
        },
        status: 'pending',
      });
    } else if (type === 'shots_update' && taskId) {
      await queueOfflineEvent({
        localEventId,
        createdAt: timestamp || new Date().toISOString(),
        userId: user!.id,
        playerId: playerId!,
        teamId: teamData!.id,
        practiceCardId: practiceCard!.id,
        eventType: 'shots_update',
        payload: {
          practice_task_id: taskId,
          player_id: playerId,
          shots_logged: shotsLogged,
          updated_at: timestamp,
        },
        status: 'pending',
      });
    } else if (type === 'session_complete') {
      await queueOfflineEvent({
        localEventId,
        createdAt: timestamp || new Date().toISOString(),
        userId: user!.id,
        playerId: playerId!,
        teamId: teamData!.id,
        practiceCardId: practiceCard!.id,
        eventType: 'session_complete',
        payload: {
          practice_card_id: practiceCard!.id,
          player_id: playerId,
          status: 'complete',
          completed_at: timestamp,
          completed_by: 'parent',
        },
        status: 'pending',
      });
    }
  };

  // Handle shots logging
  const handleShotsSubmit = useCallback(async () => {
    if (!selectedTaskId || !shotsInput) return;

    const shots = parseInt(shotsInput);
    const now = new Date().toISOString();
    const existingCompleted = completionMap[selectedTaskId]?.completed || false;

    // Optimistic update
    const newCompletions = {
      ...localCompletions,
      [selectedTaskId]: { completed: existingCompleted, shotsLogged: shots },
    };
    setLocalCompletions(newCompletions);
    
    // Save to local storage
    const sessionStatus = localSessionStatus || 'none';
    await saveLocalSnapshot(newCompletions, sessionStatus);

    setShowShotsSheet(false);
    setShotsInput("");

    if (isOnline) {
      try {
        const existingCompletion = taskCompletions?.find((c) => c.practice_task_id === selectedTaskId);
        
        if (existingCompletion) {
          const { error: updateError } = await supabase
            .from("task_completions")
            .update({
              shots_logged: shots,
              updated_at: now,
            })
            .eq("id", existingCompletion.id);
          if (updateError) logger.error("Failed to update shots logged", { updateError });
        } else {
          const { error: insertError } = await supabase
            .from("task_completions")
            .insert({
              practice_task_id: selectedTaskId,
              player_id: playerId,
              completed: false,
              shots_logged: shots,
              completed_by: "parent",
            });
          if (insertError) logger.error("Failed to insert shots logged", { insertError });
        }

        queryClient.invalidateQueries({ queryKey: ["task-completions", practiceCard?.id, playerId] });
        toast.success(t("players.today.shotsLogged"));
      } catch (err) {
        await queueForSync('shots_update', selectedTaskId, undefined, shots, now);
        toast.info(t("players.today.savedOnDevice"));
      }
    } else {
      await queueForSync('shots_update', selectedTaskId, undefined, shots, now);
      toast.info(t("players.today.savedOnDevice"));
    }
  }, [selectedTaskId, shotsInput, completionMap, localCompletions, localSessionStatus, taskCompletions, playerId, practiceCard?.id, isOnline, queryClient, saveLocalSnapshot]);

  // Handle session completion
  const handleSessionComplete = useCallback(async () => {
    const now = new Date().toISOString();

    // Optimistic update
    setLocalSessionStatus('complete');
    await saveLocalSnapshot(localCompletions, 'complete');

    if (isOnline) {
      try {
        // Check if this is the player's first completed workout (before inserting)
        const { count: existingCompletions } = await supabase
          .from("session_completions")
          .select("*", { count: "exact", head: true })
          .eq("player_id", playerId!)
          .eq("status", "complete");
        
        const isFirst = (existingCompletions || 0) === 0;
        setIsFirstWorkout(isFirst);

        if (sessionCompletion) {
          const { error: updateError } = await supabase
            .from("session_completions")
            .update({
              status: "complete",
              completed_at: now,
              updated_at: now,
            })
            .eq("id", sessionCompletion.id);
          if (updateError) logger.error("Failed to update session completion", { updateError });
        } else {
          const { error: insertError } = await supabase
            .from("session_completions")
            .insert({
              practice_card_id: practiceCard!.id,
              player_id: playerId,
              status: "complete",
              completed_at: now,
              completed_by: "parent",
            });
          if (insertError) logger.error("Failed to insert session completion", { insertError });
        }
        
        queryClient.invalidateQueries({ queryKey: ["session-completion", practiceCard?.id, playerId] });
        setShowSuccess(true);
        
        // Fire confetti celebration!
        fireGoalConfetti();
        
        if (isFirst) {
          toast.success(t("players.today.firstWorkoutTitle"), t("players.today.firstWorkoutDescription"));
        } else {
          toast.success(t("players.today.sessionCompleteToast"));
        }

        // Evaluate badges after session completion
        evaluateBadges();
      } catch (err) {
        await queueForSync('session_complete', undefined, undefined, undefined, now);
        setShowSuccess(true);
        toast.info(t("players.today.savedOnDevice"));
      }
    } else {
      await queueForSync('session_complete', undefined, undefined, undefined, now);
      setShowSuccess(true);
      toast.info(t("players.today.sessionSavedOnDevice"));
    }
  }, [localCompletions, sessionCompletion, practiceCard?.id, playerId, isOnline, queryClient, saveLocalSnapshot, evaluateBadges]);

  const handleShotsClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShotsInput(completionMap[taskId]?.shotsLogged?.toString() || "");
    setShowShotsSheet(true);
  };

  const palette = teamData ? teamPalettes.find((p) => p.id === teamData.palette_id) : null;
  const isLoading = authLoading || teamLoading || cardLoading;
  const isSessionComplete = localSessionStatus === 'complete' || sessionCompletion?.status === "complete";

  // Handle offline with no cache
  if (!isLoading && !practiceCard && !isOnline) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate(`/players/${playerId}/home`)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold">{t("players.today.pageTitle")}</h1>
            <OfflineIndicator status={offlineStatus} pendingCount={pendingCount} />
          </div>
          <AppCard>
            <EmptyState
              icon={WifiOff}
              title={t("players.today.offlineNoCacheTitle")}
              description={t("players.today.offlineNoCacheDescription")}
              action={{
                label: t("players.today.goBack"),
                onClick: () => navigate(`/players/${playerId}/home`),
              }}
            />
          </AppCard>
        </PageContainer>
      </AppShell>
    );
  }

  // Show loading state while auth or data is loading
  if (isLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <SkeletonCard className="h-16" />
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-64" />
        </PageContainer>
      </AppShell>
    );
  }

  // If not authenticated, render nothing while redirect happens
  if (!isAuthenticated) {
    return null;
  }

  if (!practiceCard) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate(`/players/${playerId}/home`)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold">{t("players.today.pageTitle")}</h1>
          </div>
          <AppCard>
            <EmptyState
              icon={Calendar}
              title={t("players.today.noPracticeTitle")}
              description={t("players.today.noPracticeDescription")}
              action={{
                label: t("players.today.goBack"),
                onClick: () => navigate(`/players/${playerId}/home`),
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
        <PageContainer>
          <SessionCelebration
            playerName={player?.first_name || ''}
            isFirstWorkout={isFirstWorkout}
            practiceTitle={practiceCard.title || undefined}
            isGameDay={practiceCard.mode === 'game_day'}
            tier={practiceCard.tier}
            totalShots={totalShots}
            tasksCompleted={completedCount}
            totalTasks={tasks.length}
            completedAt={sessionCompletion?.completed_at || undefined}
            teamName={teamData?.name}
            onContinue={() => navigate(`/players/${playerId}/home`)}
            onBonusTraining={() => navigate(`/players/${playerId}/home`)}
          />
          {!isOnline && (
            <div className="flex justify-center mt-4">
              <OfflineIndicator status={offlineStatus} pendingCount={pendingCount} />
            </div>
          )}
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
            onClick={() => navigate(`/players/${playerId}/home`)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold truncate">
                {practiceCard.mode === "game_day" ? t("players.today.gameDay") : t("players.today.pageTitle")}
              </h1>
              <OfflineIndicator status={offlineStatus} pendingCount={pendingCount} />
            </div>
            <div className="flex items-center gap-2">
              {practiceCard.mode === "game_day" ? (
                <Tag variant="accent" size="sm">
                  <Zap className="w-3 h-3" />
                  {t("players.today.gameDayPrepTag")}
                </Tag>
              ) : (
                <Tag variant="tier" size="sm">{tierLabels[practiceCard.tier]}</Tag>
              )}
              {teamData && (
                <span className="text-xs text-text-muted truncate">{teamData.name}</span>
              )}
              {usingCache && (
                <span className="text-xs text-warning">{t("players.today.cached")}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ContextSwitcher currentPlayerId={playerId} compact />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate(`/quick-checkoff?player_id=${playerId}`)}
              title={t("players.today.quickModeTitle")}
            >
              <Zap className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowSettingsSheet(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            {player && (
              <Avatar
                src={player.profile_photo_url}
                fallback={`${player.first_name} ${player.last_initial || ""}`}
                size="sm"
              />
            )}
          </div>
        </div>
      }
    >
      <PageContainer>
        {/* Team Goal Widget */}
        {teamData?.id && (
          <PlayerGoalWidget teamId={teamData.id} className="mb-4" />
        )}

        {/* Progress */}
        <AppCard>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">{t("players.today.progress")}</span>
            <span className="text-sm text-text-muted">
              {completedCount}/{tasks.length} {t("teams.practice.tasks")}
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
                <div key={task.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <WorkoutCheckItem
                      id={task.id}
                      label={task.label}
                      target={
                        task.target_type !== "none" && task.target_value
                          ? `${task.target_value} ${task.target_type}`
                          : isShooting
                            ? t("players.today.shotsLoggedCount", { count: completion?.shotsLogged || 0 })
                            : undefined
                      }
                      icon={taskTypeIcons[task.task_type]}
                      completed={isCompleted}
                      disabled={isSessionComplete}
                      onToggle={handleTaskToggle}
                    />
                  </div>
                  {isShooting && (
                    <button
                      className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-white/60 dark:bg-white/10 backdrop-blur-sm text-text-muted hover:bg-white/80 dark:hover:bg-white/20 transition-colors border border-white/40 dark:border-white/10 font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShotsClick(task.id);
                      }}
                      disabled={isSessionComplete}
                    >
                      {t("players.today.shotsCount", { count: completion?.shotsLogged || 0 })}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Photo Proof Section */}
        {practiceCard && player && (
          <SessionPhotoUpload
            practiceCardId={practiceCard.id}
            playerId={playerId!}
            playerName={player.first_name}
            disabled={false}
          />
        )}

        {/* Footer */}
        <div className="space-y-3 pt-4">
          {totalShots > 0 && (
            <AppCard variant="muted">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">{t("players.today.totalShots")}</span>
                <span className="font-semibold">{totalShots}</span>
              </div>
            </AppCard>
          )}

          {!isSessionComplete && (
            <Button
              className="w-full"
              size="lg"
              onClick={handleSessionComplete}
            >
              <Trophy className="w-5 h-5 mr-2" />
              {t("players.today.completeSession")}
            </Button>
          )}

          {isSessionComplete && (
            <div className="space-y-3">
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
                <p className="font-semibold">{t("players.today.sessionCompleteMessage")}</p>
                {sessionCompletion?.completed_at && (
                  <p className="text-sm text-text-muted">
                    {t("players.today.finishedAt", { time: format(new Date(sessionCompletion.completed_at), "h:mm a") })}
                  </p>
                )}
              </AppCard>
              
              <Button
                className="w-full"
                size="lg"
                onClick={() => navigate(`/players/${playerId}/home`)}
              >
                {t("players.today.done")}
              </Button>
            </div>
          )}
        </div>
      </PageContainer>

      {/* Shots Input Sheet */}
      <Sheet open={showShotsSheet} onOpenChange={setShowShotsSheet}>
        <SheetContent side="bottom" className="h-auto pb-safe">
          <SheetHeader>
            <SheetTitle>{t("players.today.logShotsTitle")}</SheetTitle>
            <SheetDescription>
              {t("players.today.logShotsDescription", { name: player?.first_name })}
            </SheetDescription>
          </SheetHeader>
          <div className="py-6 space-y-4">
            <Input
              type="number"
              inputMode="numeric"
              value={shotsInput}
              onChange={(e) => setShotsInput(e.target.value)}
              placeholder="0"
              className="text-center text-2xl h-16 w-full"
              autoFocus
            />
            <div className="flex gap-3">
              {[10, 25, 50, 100].map((num) => (
                <Button
                  key={num}
                  variant="outline"
                  className="flex-1 h-12 text-base"
                  onClick={() => setShotsInput(num.toString())}
                >
                  {num}
                </Button>
              ))}
            </div>
            <Button
              className="w-full h-12 text-base"
              onClick={handleShotsSubmit}
              disabled={!shotsInput}
            >
              {t("players.today.saveShots")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Player Settings Sheet */}
      {player && (
        <PlayerSettingsSheet
          open={showSettingsSheet}
          onOpenChange={setShowSettingsSheet}
          playerId={playerId!}
          playerName={player.first_name}
        />
      )}

      {/* Badge Earned Toast */}
      {newBadges.length > 0 && (
        <BadgeEarnedToast
          badgeName={newBadges[0].name}
          onClose={dismissAllBadges}
        />
      )}
    </AppShell>
  );
};

export default PlayerToday;
