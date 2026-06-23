/**
 * Offline Sync Hook
 * Manages offline data synchronization and queue management
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

interface OfflineSyncOptions {
  autoSync?: boolean;
  syncInterval?: number;
  maxRetries?: number;
  storageKey?: string;
}

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  queuedItems: number;
  lastSyncTime?: Date;
  syncErrors: string[];
}

export const useOfflineSync = (options: OfflineSyncOptions = {}) => {
  const {
    autoSync = true,
    syncInterval = 30000, // 30 seconds
    maxRetries = 3,
    storageKey = 'starked-offline-sync-queue'
  } = options;

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    queuedItems: 0,
    syncErrors: []
  });

  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  // Load queue from storage on mount
  useEffect(() => {
    loadQueueFromStorage();
  }, []);

  // Listen for service-worker messages so we can refresh the queue
  // when the BackgroundSync plugin drains pending POSTs.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event?.data?.type === 'OFFLINE_QUEUE_DRAINED') {
        loadQueueFromStorage();
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
      if (autoSync) {
        processQueue();
      }
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoSync]);

  // Auto-sync interval
  useEffect(() => {
    if (autoSync && syncStatus.isOnline) {
      syncIntervalRef.current = setInterval(() => {
        if (queue.length > 0 && !isProcessingRef.current) {
          processQueue();
        }
      }, syncInterval);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [autoSync, syncStatus.isOnline, queue.length, syncInterval]);

  // Load queue from IndexedDB/localStorage
  const loadQueueFromStorage = useCallback(async () => {
    try {
      // Try IndexedDB first
      if ('indexedDB' in window) {
        const db = await openIndexedDB();
        const items = await getQueueFromIndexedDB(db);
        setQueue(items);
        setSyncStatus(prev => ({ ...prev, queuedItems: items.length }));
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const items = JSON.parse(stored);
          setQueue(items);
          setSyncStatus(prev => ({ ...prev, queuedItems: items.length }));
        }
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
    }
  }, [storageKey]);

  // Save queue to storage
  const saveQueueToStorage = useCallback(async (items: SyncQueueItem[]) => {
    try {
      if ('indexedDB' in window) {
        const db = await openIndexedDB();
        await saveQueueToIndexedDB(db, items);
      } else {
        // Fallback to localStorage
        localStorage.setItem(storageKey, JSON.stringify(items));
      }
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }, [storageKey]);

  // Open IndexedDB
  const openIndexedDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('StarkEdOfflineSync', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }
      };
    });
  };

  // Get queue from IndexedDB
  const getQueueFromIndexedDB = (db: IDBDatabase): Promise<SyncQueueItem[]> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  };

  // Save queue to IndexedDB
  const saveQueueToIndexedDB = (db: IDBDatabase, items: SyncQueueItem[]): Promise<void> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');

      // Clear existing items
      store.clear();

      // Add new items
      items.forEach(item => {
        store.add(item);
      });

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
  };

  // Add item to sync queue
  const addToQueue = useCallback(async (type: SyncQueueItem['type'], endpoint: string, data: any) => {
    const item: SyncQueueItem = {
      id: generateId(),
      type,
      endpoint,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };

    const newQueue = [...queue, item];
    setQueue(newQueue);
    setSyncStatus(prev => ({ ...prev, queuedItems: newQueue.length }));
    await saveQueueToStorage(newQueue);

    // Try to sync immediately if online
    if (syncStatus.isOnline && autoSync) {
      setTimeout(() => processQueue(), 100);
    }
  }, [queue, syncStatus.isOnline, autoSync, saveQueueToStorage]);

  // Process the sync queue
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || !syncStatus.isOnline || queue.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    setSyncStatus(prev => ({ ...prev, isSyncing: true, syncErrors: [] }));

    try {
      const itemsToProcess = [...queue];
      const processedItems: string[] = [];
      const errors: string[] = [];

      for (const item of itemsToProcess) {
        try {
          const response = await fetch(item.endpoint, {
            method: item.type === 'delete' ? 'DELETE' : 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: item.type !== 'delete' ? JSON.stringify(item.data) : undefined,
          });

          if (response.ok) {
            processedItems.push(item.id);
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to sync ${item.type} to ${item.endpoint}: ${errorMessage}`);

          // Increment retry count
          item.retryCount++;

          // Remove item if max retries exceeded
          if (item.retryCount >= maxRetries) {
            processedItems.push(item.id);
            errors.push(`Max retries exceeded for ${item.endpoint}`);
          }
        }
      }

      // Update queue
      const updatedQueue = queue.filter(item => !processedItems.includes(item.id));
      setQueue(updatedQueue);
      setSyncStatus(prev => ({
        ...prev,
        queuedItems: updatedQueue.length,
        lastSyncTime: new Date(),
        syncErrors: errors
      }));

      await saveQueueToStorage(updatedQueue);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSyncStatus(prev => ({
        ...prev,
        syncErrors: [...prev.syncErrors, errorMessage]
      }));
    } finally {
      isProcessingRef.current = false;
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [queue, syncStatus.isOnline, maxRetries, saveQueueToStorage]);

  // Manual sync trigger
  const triggerSync = useCallback(() => {
    if (syncStatus.isOnline) {
      processQueue();
    } else {
      setSyncStatus(prev => ({
        ...prev,
        syncErrors: [...prev.syncErrors, 'Cannot sync while offline']
      }));
    }
  }, [syncStatus.isOnline, processQueue]);

  // Clear queue
  const clearQueue = useCallback(async () => {
    setQueue([]);
    setSyncStatus(prev => ({ ...prev, queuedItems: 0, syncErrors: [] }));
    await saveQueueToStorage([]);
  }, [saveQueueToStorage]);

  // Remove specific item from queue
  const removeFromQueue = useCallback(async (itemId: string) => {
    const updatedQueue = queue.filter(item => item.id !== itemId);
    setQueue(updatedQueue);
    setSyncStatus(prev => ({ ...prev, queuedItems: updatedQueue.length }));
    await saveQueueToStorage(updatedQueue);
  }, [queue, saveQueueToStorage]);

  // Get queue statistics
  const getQueueStats = useCallback(() => {
    const stats = {
      total: queue.length,
      byType: {} as Record<string, number>,
      byEndpoint: {} as Record<string, number>,
      oldestItem: queue.length > 0 ? new Date(Math.min(...queue.map(item => item.timestamp))) : null,
      retryCount: queue.reduce((sum, item) => sum + item.retryCount, 0)
    };

    queue.forEach(item => {
      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
      stats.byEndpoint[item.endpoint] = (stats.byEndpoint[item.endpoint] || 0) + 1;
    });

    return stats;
  }, [queue]);

  // Generate unique ID
  const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Register service worker for background sync
  useEffect(() => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.sync) {
          registration.sync.register('background-sync');
        }
      });
    }
  }, []);

  return {
    syncStatus,
    queue,
    addToQueue,
    triggerSync,
    clearQueue,
    removeFromQueue,
    getQueueStats,
    isOnline: syncStatus.isOnline,
    isSyncing: syncStatus.isSyncing
  };
};

// ---------------------------------------------------------------------------
// Storage quota monitoring — issued by the OfflineIndicator once usage
// crosses 80% so the UI can warn the student.
// ---------------------------------------------------------------------------
export interface StorageQuotaState {
  usage: number;
  quota: number;
  percent: number;
  isHighUsage: boolean;            // >= 80%
  isCritical: boolean;             // >= 95%
  isPersistent: boolean;
  isSupported: boolean;
}

const DEFAULT_STATE: StorageQuotaState = {
  usage: 0,
  quota: 0,
  percent: 0,
  isHighUsage: false,
  isCritical: false,
  isPersistent: false,
  isSupported:
    typeof navigator !== 'undefined' &&
    typeof navigator.storage !== 'undefined' &&
    typeof navigator.storage.estimate === 'function',
};

export const useStorageQuota = (
  pollIntervalMs = 60_000,
  warningThreshold = 0.8,
  criticalThreshold = 0.95
): StorageQuotaState => {
  const [state, setState] = useState<StorageQuotaState>(DEFAULT_STATE);

  const refresh = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
      return;
    }
    try {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      const percent = quota > 0 ? usage / quota : 0;

      let isPersistent = false;
      if (navigator.storage?.persisted) {
        try {
          isPersistent = await navigator.storage.persisted();
        } catch (_) {
          isPersistent = false;
        }
      }

      setState({
        usage,
        quota,
        percent,
        isHighUsage: percent >= warningThreshold,
        isCritical: percent >= criticalThreshold,
        isPersistent,
        isSupported: true,
      });
    } catch (err) {
      console.warn('Failed to read storage quota:', err);
    }
  }, [warningThreshold, criticalThreshold]);

  useEffect(() => {
    refresh();
    if (!pollIntervalMs) return;
    const interval = setInterval(refresh, pollIntervalMs);
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [pollIntervalMs, refresh]);

  return state;
};

// ---------------------------------------------------------------------------
// Hook for offline data management
// ---------------------------------------------------------------------------
export const useOfflineData = <T>(key: string, initialValue?: T) => {
  const [data, setData] = useState<T | undefined>(initialValue);
  const [isOffline, setIsOffline] = useState(
    typeof navigator === 'undefined' ? false : !navigator.onLine
  );

  useEffect(() => {
    // Load data from storage
    const loadData = async () => {
      try {
        if ('indexedDB' in window) {
          const db = await openDataDB();
          const stored = await getDataFromIndexedDB(db, key);
          if (stored !== undefined) {
            setData(stored);
          }
        } else {
          const stored = localStorage.getItem(`offline-${key}`);
          if (stored) {
            setData(JSON.parse(stored));
          }
        }
      } catch (error) {
        console.error('Error loading offline data:', error);
      }
    };

    loadData();

    // Monitor online status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [key]);

  const saveData = useCallback(async (newData: T) => {
    try {
      setData(newData);

      if ('indexedDB' in window) {
        const db = await openDataDB();
        await saveDataToIndexedDB(db, key, newData);
      } else {
        localStorage.setItem(`offline-${key}`, JSON.stringify(newData));
      }
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  }, [key]);

  const clearData = useCallback(async () => {
    try {
      setData(undefined);

      if ('indexedDB' in window) {
        const db = await openDataDB();
        await deleteDataFromIndexedDB(db, key);
      } else {
        localStorage.removeItem(`offline-${key}`);
      }
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  }, [key]);

  return {
    data,
    setData: saveData,
    clearData,
    isOffline
  };
};

// ---------------------------------------------------------------------------
// Helpers for offline-data IndexedDB
// ---------------------------------------------------------------------------
const openDataDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('StarkEdOfflineData', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('data')) {
        db.createObjectStore('data', { keyPath: 'key' });
      }
    };
  });
};

const getDataFromIndexedDB = (db: IDBDatabase, key: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['data'], 'readonly');
    const store = transaction.objectStore('data');
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result?.value);
  });
};

const saveDataToIndexedDB = (db: IDBDatabase, key: string, value: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['data'], 'readwrite');
    const store = transaction.objectStore('data');
    const request = store.put({ key, value });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

const deleteDataFromIndexedDB = (db: IDBDatabase, key: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['data'], 'readwrite');
    const store = transaction.objectStore('data');
    const request = store.delete(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};
