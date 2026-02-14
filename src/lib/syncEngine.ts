/**
 * Sync Engine - Handles syncing offline events to the server
 */
import { logger } from "@/core";

import { supabase } from "@/integrations/supabase/client";
import {
  getPendingEvents,
  markEventsSyncing,
  updateEventStatus,
  removeSucceededEvents,
  setLastSyncTime,
  QueuedEvent,
} from "./offlineStorage";

interface SyncResult {
  success: boolean;
  error?: string;
}

type SyncStatus = 'idle' | 'syncing' | 'error';
type SyncListener = (status: SyncStatus, pendingCount: number) => void;

const listeners = new Set<SyncListener>();
let currentStatus: SyncStatus = 'idle';
let syncInProgress = false;
let syncInterval: ReturnType<typeof setInterval> | null = null;

// Backoff configuration
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 300000; // 5 minutes
const MAX_RETRIES = 5;

let currentRetryDelay = INITIAL_RETRY_DELAY;

export function addSyncListener(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(status: SyncStatus, pendingCount: number) {
  currentStatus = status;
  listeners.forEach((listener) => listener(status, pendingCount));
}

export function isOnline(): boolean {
  return navigator.onLine;
}

async function applyOfflineEvent(event: QueuedEvent): Promise<SyncResult> {
  try {
    const { data, error } = await supabase.rpc('apply_offline_event', {
      p_local_event_id: event.localEventId,
      p_event_type: event.eventType,
      p_payload: event.payload as unknown as Record<string, never>,
    });

    if (error) {
      // Check for auth errors
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
        return { success: false, error: 'auth_expired' };
      }
      return { success: false, error: error.message };
    }

    const result = data as { success: boolean; error?: string } | null;
    if (!result?.success) {
      return { success: false, error: result?.error || 'Unknown error' };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function syncPendingEvents(): Promise<{ synced: number; failed: number }> {
  if (syncInProgress) {
    return { synced: 0, failed: 0 };
  }

  if (!isOnline()) {
    return { synced: 0, failed: 0 };
  }

  syncInProgress = true;
  let synced = 0;
  let failed = 0;

  try {
    const pendingEvents = await getPendingEvents();
    
    if (pendingEvents.length === 0) {
      notifyListeners('idle', 0);
      return { synced: 0, failed: 0 };
    }

    notifyListeners('syncing', pendingEvents.length);

    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < pendingEvents.length; i += batchSize) {
      const batch = pendingEvents.slice(i, i + batchSize);
      const eventIds = batch.map((e) => e.localEventId);
      
      await markEventsSyncing(eventIds);

      for (const event of batch) {
        // Skip events that have exceeded max retries
        if (event.retryCount >= MAX_RETRIES) {
          await updateEventStatus(event.localEventId, 'failed', 'Max retries exceeded');
          failed++;
          continue;
        }

        const result = await applyOfflineEvent(event);

        if (result.success) {
          await updateEventStatus(event.localEventId, 'succeeded');
          synced++;
          currentRetryDelay = INITIAL_RETRY_DELAY; // Reset backoff on success
        } else {
          // Handle auth errors specially
          if (result.error === 'auth_expired') {
            // Stop sync on auth errors
            await updateEventStatus(event.localEventId, 'pending', result.error);
            notifyListeners('error', pendingEvents.length - synced);
            return { synced, failed };
          }

          await updateEventStatus(event.localEventId, 'failed', result.error);
          failed++;

          // Increase backoff for transient errors
          currentRetryDelay = Math.min(currentRetryDelay * 2, MAX_RETRY_DELAY);
        }
      }
    }

    // Clean up succeeded events
    await removeSucceededEvents();

    // Update last sync time
    await setLastSyncTime(new Date().toISOString());

    // Get remaining pending count
    const remainingPending = await getPendingEvents();
    notifyListeners(remainingPending.length > 0 ? 'error' : 'idle', remainingPending.length);

    return { synced, failed };
  } catch (err) {
    logger.error('Sync error', { err });
    notifyListeners('error', 0);
    return { synced, failed };
  } finally {
    syncInProgress = false;
  }
}

export function startSyncInterval(intervalMs = 30000): void {
  if (syncInterval) return;

  // Initial sync
  syncPendingEvents();

  // Set up interval
  syncInterval = setInterval(() => {
    syncPendingEvents();
  }, intervalMs);

  // Listen for online/offline events
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

export function stopSyncInterval(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
}

function handleOnline() {
  // Sync immediately when coming back online
  setTimeout(() => {
    syncPendingEvents();
  }, 1000); // Small delay to ensure network is stable
}

function handleOffline() {
  notifyListeners('idle', 0);
}

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}
