import { syncSessionPhotos } from "./sessionPhotoSync";
import { syncShotDrafts } from "./shootingDrafts";
/**
 * Sync Engine - Handles syncing offline events to the server
 */
import { logger } from "@/core";

import { supabase } from "@/integrations/supabase/client";
import {
  getPendingEvents,
  getPendingEventCount,
  getOfflineAccountOwner,
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

type SyncStatus = "idle" | "syncing" | "error";
type SyncListener = (status: SyncStatus, pendingCount: number) => void;

const listeners = new Set<SyncListener>();
let currentStatus: SyncStatus = "idle";
let activeSync: { ownerId: string; controller: AbortController } | null = null;
let syncInterval: ReturnType<typeof setInterval> | null = null;

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

async function applyOfflineEvent(
  event: QueuedEvent,
  signal: AbortSignal,
): Promise<SyncResult> {
  try {
    const { data, error } = await supabase
      .rpc("apply_offline_event", {
        p_local_event_id: event.localEventId,
        p_event_type: event.eventType,
        p_payload: event.payload as unknown as Record<string, never>,
      })
      .abortSignal(signal);

    if (error) {
      // Check for auth errors
      if (error.code === "PGRST301" || error.message.includes("JWT")) {
        return { success: false, error: "auth_expired" };
      }
      return { success: false, error: error.message };
    }

    const result = data as { success: boolean; error?: string } | null;
    if (!result?.success) {
      return { success: false, error: result?.error || "Unknown error" };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function syncPendingEvents(): Promise<{
  synced: number;
  failed: number;
}> {
  const ownerId = getOfflineAccountOwner();
  if (!ownerId || !isOnline()) return { synced: 0, failed: 0 };
  if (activeSync) {
    if (activeSync.ownerId !== ownerId) activeSync.controller.abort();
    return { synced: 0, failed: 0 };
  }
  const job = { ownerId, controller: new AbortController() };
  activeSync = job;
  const stillOwnsJob = () =>
    activeSync === job &&
    getOfflineAccountOwner() === ownerId &&
    !job.controller.signal.aborted;
  let synced = 0;
  let failed = 0;
  let inFlight: QueuedEvent | null = null;
  try {
    const pendingEvents = await getPendingEvents();
    if (!stillOwnsJob()) return { synced, failed };
    notifyListeners(
      pendingEvents.length ? "syncing" : "idle",
      pendingEvents.length,
    );
    // Preserve event order: a session must not finish before its queued task writes.
    for (const event of pendingEvents) {
      if (!stillOwnsJob() || event.userId !== ownerId)
        return { synced, failed };
      inFlight = event;
      await markEventsSyncing([event.localEventId]);
      if (!stillOwnsJob()) return { synced, failed };
      const result = await applyOfflineEvent(event, job.controller.signal);
      // Replaying an interrupted request uses the same idempotency key.
      await updateEventStatus(
        event.localEventId,
        result.success ? "succeeded" : "pending",
        result.error,
      );
      inFlight = null;
      if (!stillOwnsJob())
        return { synced: synced + Number(result.success), failed };
      if (!result.success) {
        failed++;
        notifyListeners("error", await getPendingEventCount());
        return { synced, failed };
      }
      synced++;
    }
    await removeSucceededEvents();
    if (stillOwnsJob()) {
      const shots = await syncShotDrafts(
        ownerId,
        job.controller.signal,
        stillOwnsJob,
      );
      synced += shots.synced;
      failed += shots.failed;
      const photos = await syncSessionPhotos(
        ownerId,
        job.controller.signal,
        stillOwnsJob,
      );
      synced += photos.synced;
      failed += photos.failed;
    }
    if (stillOwnsJob()) {
      await setLastSyncTime(new Date().toISOString());
      notifyListeners(failed ? "error" : "idle", await getPendingEventCount());
    }
    return { synced, failed };
  } catch (err) {
    logger.error("Sync error", { err });
    if (stillOwnsJob())
      notifyListeners("error", await getPendingEventCount().catch(() => 0));
    return { synced, failed };
  } finally {
    if (inFlight)
      await updateEventStatus(inFlight.localEventId, "pending").catch((err) =>
        logger.error("Could not retain interrupted sync", { err }),
      );
    if (activeSync === job) activeSync = null;
    if (job.controller.signal.aborted && getOfflineAccountOwner() && isOnline())
      setTimeout(() => void syncPendingEvents(), 0);
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
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
}

export function stopSyncInterval(): void {
  activeSync?.controller.abort();
  notifyListeners("idle", 0);
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  window.removeEventListener("online", handleOnline);
  window.removeEventListener("offline", handleOffline);
}

function handleOnline() {
  // Sync immediately when coming back online
  setTimeout(() => {
    syncPendingEvents();
  }, 1000); // Small delay to ensure network is stable
}

function handleOffline() {
  notifyListeners("idle", 0);
}

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}
