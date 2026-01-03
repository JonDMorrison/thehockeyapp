/**
 * Offline Storage Layer using IndexedDB
 * Handles caching practice cards and queueing offline events
 */

const DB_NAME = 'hockey-training-offline';
const DB_VERSION = 1;

export interface CachedCard {
  key: string; // team_id + date
  teamId: string;
  date: string;
  practiceCardJson: string;
  cachedAt: string;
}

export interface QueuedEvent {
  localEventId: string;
  createdAt: string;
  userId: string;
  playerId: string;
  teamId: string;
  practiceCardId: string;
  eventType: 'task_toggle' | 'shots_update' | 'session_complete' | 'session_partial';
  payload: Record<string, unknown>;
  status: 'pending' | 'syncing' | 'succeeded' | 'failed';
  lastError?: string;
  retryCount: number;
}

export interface QueuedPhoto {
  localPhotoId: string;
  playerId: string;
  practiceCardId: string;
  localUri: string; // blob URL or data URI
  visibility: 'parent_only' | 'team_adults';
  caption: string;
  status: 'pending' | 'uploading' | 'succeeded' | 'failed';
  createdAt: string;
  retryCount: number;
}

export interface CompletionSnapshot {
  key: string; // player_id + practice_card_id
  playerId: string;
  practiceCardId: string;
  taskCompletionMap: Record<string, { completed: boolean; shotsLogged: number }>;
  sessionStatus: 'none' | 'partial' | 'complete';
  updatedAt: string;
}

let db: IDBDatabase | null = null;

export async function initOfflineDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Cached practice cards store
      if (!database.objectStoreNames.contains('cachedCards')) {
        database.createObjectStore('cachedCards', { keyPath: 'key' });
      }

      // Queued events store
      if (!database.objectStoreNames.contains('queuedEvents')) {
        const eventStore = database.createObjectStore('queuedEvents', { keyPath: 'localEventId' });
        eventStore.createIndex('status', 'status', { unique: false });
        eventStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Completion snapshots store
      if (!database.objectStoreNames.contains('completionSnapshots')) {
        database.createObjectStore('completionSnapshots', { keyPath: 'key' });
      }

      // Sync metadata store
      if (!database.objectStoreNames.contains('syncMeta')) {
        database.createObjectStore('syncMeta', { keyPath: 'key' });
      }

      // Queued photos store (for offline photo uploads)
      if (!database.objectStoreNames.contains('queuedPhotos')) {
        const photoStore = database.createObjectStore('queuedPhotos', { keyPath: 'localPhotoId' });
        photoStore.createIndex('status', 'status', { unique: false });
      }
    };
  });
}

// Generic helpers
async function getDB(): Promise<IDBDatabase> {
  if (!db) {
    await initOfflineDB();
  }
  return db!;
}

// Cached Cards
export async function cachePracticeCard(
  teamId: string,
  date: string,
  cardData: unknown
): Promise<void> {
  const database = await getDB();
  const key = `${teamId}_${date}`;
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('cachedCards', 'readwrite');
    const store = tx.objectStore('cachedCards');
    
    const data: CachedCard = {
      key,
      teamId,
      date,
      practiceCardJson: JSON.stringify(cardData),
      cachedAt: new Date().toISOString(),
    };
    
    const request = store.put(data);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedCard(
  teamId: string,
  date: string
): Promise<unknown | null> {
  const database = await getDB();
  const key = `${teamId}_${date}`;
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('cachedCards', 'readonly');
    const store = tx.objectStore('cachedCards');
    const request = store.get(key);
    
    request.onsuccess = () => {
      const result = request.result as CachedCard | undefined;
      if (result) {
        try {
          resolve(JSON.parse(result.practiceCardJson));
        } catch {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// Queued Events
export async function queueOfflineEvent(event: Omit<QueuedEvent, 'retryCount'>): Promise<void> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('queuedEvents', 'readwrite');
    const store = tx.objectStore('queuedEvents');
    
    const data: QueuedEvent = {
      ...event,
      retryCount: 0,
    };
    
    const request = store.put(data);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingEvents(): Promise<QueuedEvent[]> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('queuedEvents', 'readonly');
    const store = tx.objectStore('queuedEvents');
    const index = store.index('status');
    const request = index.getAll('pending');
    
    request.onsuccess = () => {
      const events = request.result as QueuedEvent[];
      // Sort by createdAt ascending
      events.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      resolve(events);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function updateEventStatus(
  localEventId: string,
  status: QueuedEvent['status'],
  lastError?: string
): Promise<void> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('queuedEvents', 'readwrite');
    const store = tx.objectStore('queuedEvents');
    const getRequest = store.get(localEventId);
    
    getRequest.onsuccess = () => {
      const event = getRequest.result as QueuedEvent | undefined;
      if (event) {
        event.status = status;
        if (lastError) event.lastError = lastError;
        if (status === 'failed') event.retryCount++;
        
        const putRequest = store.put(event);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function markEventsSyncing(eventIds: string[]): Promise<void> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('queuedEvents', 'readwrite');
    const store = tx.objectStore('queuedEvents');
    
    let completed = 0;
    
    eventIds.forEach((id) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const event = getRequest.result as QueuedEvent | undefined;
        if (event) {
          event.status = 'syncing';
          store.put(event);
        }
        completed++;
        if (completed === eventIds.length) resolve();
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
    
    if (eventIds.length === 0) resolve();
  });
}

export async function removeSucceededEvents(): Promise<void> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('queuedEvents', 'readwrite');
    const store = tx.objectStore('queuedEvents');
    const index = store.index('status');
    const request = index.openCursor('succeeded');
    
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingEventCount(): Promise<number> {
  const events = await getPendingEvents();
  return events.length;
}

// Completion Snapshots
export async function saveCompletionSnapshot(
  playerId: string,
  practiceCardId: string,
  taskCompletionMap: Record<string, { completed: boolean; shotsLogged: number }>,
  sessionStatus: 'none' | 'partial' | 'complete'
): Promise<void> {
  const database = await getDB();
  const key = `${playerId}_${practiceCardId}`;
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('completionSnapshots', 'readwrite');
    const store = tx.objectStore('completionSnapshots');
    
    const data: CompletionSnapshot = {
      key,
      playerId,
      practiceCardId,
      taskCompletionMap,
      sessionStatus,
      updatedAt: new Date().toISOString(),
    };
    
    const request = store.put(data);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCompletionSnapshot(
  playerId: string,
  practiceCardId: string
): Promise<CompletionSnapshot | null> {
  const database = await getDB();
  const key = `${playerId}_${practiceCardId}`;
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('completionSnapshots', 'readonly');
    const store = tx.objectStore('completionSnapshots');
    const request = store.get(key);
    
    request.onsuccess = () => {
      resolve(request.result as CompletionSnapshot | null);
    };
    request.onerror = () => reject(request.error);
  });
}

// Sync metadata
export async function getLastSyncTime(): Promise<string | null> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('syncMeta', 'readonly');
    const store = tx.objectStore('syncMeta');
    const request = store.get('lastSync');
    
    request.onsuccess = () => {
      const result = request.result as { key: string; value: string } | undefined;
      resolve(result?.value || null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function setLastSyncTime(time: string): Promise<void> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('syncMeta', 'readwrite');
    const store = tx.objectStore('syncMeta');
    const request = store.put({ key: 'lastSync', value: time });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Generate unique local event ID
export function generateLocalEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// Queued Photos for offline upload
export async function queuePhoto(photo: Omit<QueuedPhoto, 'retryCount'>): Promise<void> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('queuedPhotos', 'readwrite');
    const store = tx.objectStore('queuedPhotos');
    
    const data: QueuedPhoto = {
      ...photo,
      retryCount: 0,
    };
    
    const request = store.put(data);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingPhotos(): Promise<QueuedPhoto[]> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('queuedPhotos', 'readonly');
    const store = tx.objectStore('queuedPhotos');
    const index = store.index('status');
    const request = index.getAll('pending');
    
    request.onsuccess = () => {
      resolve(request.result as QueuedPhoto[]);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function updatePhotoStatus(
  localPhotoId: string,
  status: QueuedPhoto['status']
): Promise<void> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('queuedPhotos', 'readwrite');
    const store = tx.objectStore('queuedPhotos');
    const getRequest = store.get(localPhotoId);
    
    getRequest.onsuccess = () => {
      const photo = getRequest.result as QueuedPhoto | undefined;
      if (photo) {
        photo.status = status;
        if (status === 'failed') photo.retryCount++;
        
        const putRequest = store.put(photo);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function removeSucceededPhotos(): Promise<void> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('queuedPhotos', 'readwrite');
    const store = tx.objectStore('queuedPhotos');
    const index = store.index('status');
    const request = index.openCursor('succeeded');
    
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getQueuedPhotosForSession(
  playerId: string,
  practiceCardId: string
): Promise<QueuedPhoto[]> {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('queuedPhotos', 'readonly');
    const store = tx.objectStore('queuedPhotos');
    const request = store.getAll();
    
    request.onsuccess = () => {
      const all = request.result as QueuedPhoto[];
      const filtered = all.filter(
        (p) => p.playerId === playerId && p.practiceCardId === practiceCardId
      );
      resolve(filtered);
    };
    request.onerror = () => reject(request.error);
  });
}
