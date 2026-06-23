/**
 * StarkEd Service Worker v3
 *
 * Caching strategies:
 *   - Course content (lessons, videos, quizzes):  CacheFirst, 7-day expiration
 *   - Static assets (images, scripts, styles):    CacheFirst, 30-day expiration
 *   - GET API responses:                          NetworkFirst, 3s timeout -> cache
 *   - Documents / pages:                          StaleWhileRevalidate
 *   - Mutating API requests (POST/PUT/DELETE):    NetworkOnly + BackgroundSync replay
 *
 * Other features:
 *   - Push notifications
 *   - Background sync for offline progress submissions
 *   - Persistent storage request on activation
 */

importScripts(
  'https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js'
);

if (workbox) {
  const { routing, strategies, backgroundSync, expiration, cacheableResponse } =
    workbox;

  // Bumped to v3 so previous caches get cleanly evicted on activation.
  const STATIC_CACHE = 'starked-static-v3';
  const COURSE_CACHE = 'starked-course-content-v3';
  const API_CACHE = 'starked-api-v3';
  const DYNAMIC_CACHE = 'starked-dynamic-v3';
  const COURSE_QUEUE = 'starked-offline-course-queue';

  // ---------------------------------------------------------------------------
  // Background sync plugin for mutating requests (POST / PUT / DELETE / PATCH)
  // ---------------------------------------------------------------------------
  const bgSyncPlugin = new backgroundSync.BackgroundSyncPlugin(
    'starked-offline-queue',
    {
      maxRetentionTime: 24 * 60, // Retry for up to 24 hours (specified in minutes)
      onSync: async ({ queue }) => {
        try {
          await queue.replayRequests();
          // Notify clients that the queue was drained so the UI can update.
          const clients = await self.clients.matchAll({ includeUncontrolled: true });
          for (const client of clients) {
            client.postMessage({ type: 'OFFLINE_QUEUE_DRAINED' });
          }
        } catch (err) {
          console.error('BackgroundSync replay failed:', err);
        }
      },
    }
  );

  routing.registerRoute(
    ({ url, request }) =>
      url.pathname.startsWith('/api/') &&
      ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method),
    new strategies.NetworkOnly({ plugins: [bgSyncPlugin] })
  );

  // ---------------------------------------------------------------------------
  // Course content – CacheFirst so students can keep learning when offline.
  // ---------------------------------------------------------------------------
  routing.registerRoute(
    ({ url }) =>
      /\/api\/courses\/[^/]+\/(content|lessons|quizzes|assets)\b/.test(
        url.pathname
      ),
    new strategies.CacheFirst({
      cacheName: COURSE_CACHE,
      plugins: [
        new cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new expiration.ExpirationPlugin({
          maxEntries: 500,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          purgeOnQuotaError: true,
        }),
      ],
    })
  );

  // ---------------------------------------------------------------------------
  // Static assets – CacheFirst
  // ---------------------------------------------------------------------------
  routing.registerRoute(
    ({ request }) =>
      request.destination === 'image' ||
      request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'font',
    new strategies.CacheFirst({
      cacheName: STATIC_CACHE,
      plugins: [
        new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new expiration.ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          purgeOnQuotaError: true,
        }),
      ],
    })
  );

  // ---------------------------------------------------------------------------
  // GET APIs – NetworkFirst with 3s timeout fallback to cache
  // ---------------------------------------------------------------------------
  routing.registerRoute(
    ({ url, request }) =>
      url.pathname.startsWith('/api/') && request.method === 'GET',
    new strategies.NetworkFirst({
      cacheName: API_CACHE,
      networkTimeoutSeconds: 3,
      plugins: [
        new expiration.ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
          purgeOnQuotaError: true,
        }),
      ],
    })
  );

  // ---------------------------------------------------------------------------
  // Documents / HTML – StaleWhileRevalidate
  // ---------------------------------------------------------------------------
  routing.registerRoute(
    ({ request }) => request.destination === 'document',
    new strategies.StaleWhileRevalidate({
      cacheName: DYNAMIC_CACHE,
      plugins: [
        new expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        }),
      ],
    })
  );

  // ---------------------------------------------------------------------------
  // Activate – clean up old-version caches
  // ---------------------------------------------------------------------------
  self.addEventListener('activate', (event) => {
    const allowedCaches = [
      STATIC_CACHE,
      COURSE_CACHE,
      API_CACHE,
      DYNAMIC_CACHE,
    ];
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith('starked-') && !allowedCaches.includes(key))
            .map((key) => caches.delete(key))
        );
        await self.clients.claim();

        // Try to request persistent storage so we don't get evicted under pressure.
        if (navigator.storage && navigator.storage.persist) {
          try {
            await navigator.storage.persist();
          } catch (_) {
            // best-effort
          }
        }
      })()
    );
  });

  self.addEventListener('install', () => {
    self.skipWaiting();
  });
} else {
  console.warn('Workbox failed to load – service worker running without it.');
}

// ---------------------------------------------------------------------------
// Background sync for student progress (queue handled in IndexedDB by the app)
// ---------------------------------------------------------------------------
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-progress' || event.tag === COURSE_QUEUE) {
    // The app keeps its own progress queue in IndexedDB. Trigger an
    // immediate flush via a message broadcast to all open clients.
    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll({ includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({ type: 'REQUEST_SYNC_PROGRESS' });
        }
      })()
    );
  }
});

// ---------------------------------------------------------------------------
// Push notifications
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { title: 'StarkEd', body: event.data ? event.data.text() : '' };
  }

  const options = {
    body: payload.body || 'You have a new notification from StarkEd',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: payload.data || {},
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'StarkEd', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow('/');
    })
  );
});
