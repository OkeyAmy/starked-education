const DB_NAME = 'StarkEdOfflineDB';
const DB_VERSION = 1;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('courses')) {
        db.createObjectStore('courses', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('progress')) {
        db.createObjectStore('progress', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveCourseOffline = async (courseId: string, courseData: any): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('courses', 'readwrite');
    const store = transaction.objectStore('courses');
    const request = store.put({ id: courseId, data: courseData, downloadedAt: Date.now() });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getOfflineCourse = async (courseId: string): Promise<any> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('courses', 'readonly');
    const store = transaction.objectStore('courses');
    const request = store.get(courseId);
    request.onsuccess = () => resolve(request.result?.data || null);
    request.onerror = () => reject(request.error);
  });
};

export const saveOfflineProgress = async (id: string, progressData: any): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('progress', 'readwrite');
    const store = transaction.objectStore('progress');
    const request = store.put({ id, data: progressData, savedAt: Date.now() });
    
    request.onsuccess = () => {
      // Auto-register background sync via service worker if available
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
          (registration as any).sync.register('sync-progress').catch(console.error);
        });
      }
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

export const queueOfflineAction = async (action: any): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('syncQueue', 'readwrite');
    const store = transaction.objectStore('syncQueue');
    const request = store.add({ payload: action, queuedAt: Date.now() });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};