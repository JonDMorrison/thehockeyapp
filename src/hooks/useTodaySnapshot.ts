/**
 * Hook for managing today snapshot for widgets
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TodaySnapshot {
  success: boolean;
  player_id?: string;
  player_display?: string;
  team_id?: string;
  team_name?: string;
  palette_id?: string;
  date?: string;
  mode?: string;
  tier?: string;
  card_id?: string;
  has_card?: boolean;
  progress?: {
    completed: number;
    total_required: number;
  };
  next_task?: {
    practice_task_id: string;
    label: string;
    task_type: string;
    target: string;
  } | null;
  error?: string;
}

const SNAPSHOT_CACHE_KEY = "today_snapshot_cache";

export function useTodaySnapshot(playerId: string | null) {
  const [snapshot, setSnapshot] = useState<TodaySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cached snapshot
  useEffect(() => {
    if (!playerId) return;
    
    try {
      const cached = localStorage.getItem(`${SNAPSHOT_CACHE_KEY}_${playerId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Only use cache if it's from today
        if (parsed.date === new Date().toISOString().split('T')[0]) {
          setSnapshot(parsed);
        }
      }
    } catch {
      // Ignore cache errors
    }
  }, [playerId]);

  // Fetch fresh snapshot
  const refresh = useCallback(async () => {
    if (!playerId) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: rpcError } = await supabase.rpc("get_today_snapshot", {
        p_player_id: playerId,
      });

      if (rpcError) throw rpcError;

      const result = data as unknown as TodaySnapshot;
      
      if (result.success) {
        setSnapshot(result);
        // Cache the snapshot
        try {
          localStorage.setItem(`${SNAPSHOT_CACHE_KEY}_${playerId}`, JSON.stringify(result));
        } catch {
          // Ignore storage errors
        }
      } else {
        setError(result.error || "Unknown error");
      }
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch snapshot";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [playerId]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Quick action helper
  const performQuickAction = useCallback(async (
    actionType: "toggle_next_task" | "complete_session"
  ) => {
    if (!playerId) return { success: false, error: "No player" };
    
    const localEventId = `quick_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    try {
      const { data, error: rpcError } = await supabase.rpc("apply_quick_action", {
        p_player_id: playerId,
        p_action_type: actionType,
        p_local_event_id: localEventId,
      });

      if (rpcError) throw rpcError;

      // Refresh snapshot after action
      await refresh();
      
      return data as unknown as { success: boolean; action?: string; error?: string };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Action failed";
      return { success: false, error: message };
    }
  }, [playerId, refresh]);

  return {
    snapshot,
    isLoading,
    error,
    refresh,
    performQuickAction,
  };
}