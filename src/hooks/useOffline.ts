/**
 * Custom hooks for offline functionality
 */

import { useState, useEffect, useCallback } from "react";
import { addSyncListener, isOnline, syncPendingEvents, getSyncStatus } from "@/lib/syncEngine";
import { getPendingEventCount } from "@/lib/offlineStorage";

export type OfflineStatus = 'online' | 'offline' | 'syncing' | 'pending' | 'error';

export interface UseOfflineResult {
  isOnline: boolean;
  status: OfflineStatus;
  pendingCount: number;
  triggerSync: () => Promise<void>;
}

export function useOffline(): UseOfflineResult {
  const [online, setOnline] = useState(isOnline());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>(getSyncStatus());
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Update pending count initially
    getPendingEventCount().then(setPendingCount).catch(() => {});

    // Listen for sync status changes
    const unsubscribe = addSyncListener((status, count) => {
      setSyncStatus(status);
      setPendingCount(count);
    });

    // Listen for online/offline
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Refresh pending count periodically
    const interval = setInterval(() => {
      getPendingEventCount().then(setPendingCount).catch(() => {});
    }, 5000);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const triggerSync = useCallback(async () => {
    if (online) {
      await syncPendingEvents();
    }
  }, [online]);

  // Derive combined status
  let status: OfflineStatus = 'online';
  if (!online) {
    status = 'offline';
  } else if (syncStatus === 'syncing') {
    status = 'syncing';
  } else if (syncStatus === 'error' || pendingCount > 0) {
    status = 'pending';
  }

  return {
    isOnline: online,
    status,
    pendingCount,
    triggerSync,
  };
}
