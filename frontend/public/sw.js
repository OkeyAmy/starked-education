/**
 * Service Worker for StarkEd PWA
 * Built with Workbox for robust offline caching and background sync
 */

importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (workbox) {
  console.log('✅ Workbox loaded successfully');

  const { routing, strategies, backgroundSync, expiration } = workbox;

  // Setup Background Sync for offline interactions (POST, PUT, DELETE)
  const bgSyncPlugin = new backgroundSync.BackgroundSyncPlugin('starked-offline-queue', {
    maxRetentionTime: 24 * 60, // Retry for up to 24 hours (specified in minutes)
    onSync: async ({ queue }) => {
      console.log('🔄 Replaying offline queued requests via Background Sync...');
      await queue.replayRequests();
    }
  });

  routing.registerRoute(
    ({ url, request }) => url.pathname.startsWith('/api/') && ['POST', 'PUT', 'DELETE'].includes(request.method),
    new strategies.NetworkOnly({
      plugins: [bgSyncPlugin]
    })
  );

  // Cache-First strategy for static assets (Images, Scripts, Styles)
  routing.registerRoute(
    ({ request }) => request.destination === 'image' || request.destination === 'script' || request.destination === 'style',
    new strategies.CacheFirst({
      cacheName: 'starked-static-v2',
      plugins: [
        new expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // Network-First strategy for GET APIs (Courses, Profiles, Analytics)
  routing.registerRoute(
    ({ url, request }) => url.pathname.startsWith('/api/') && request.method === 'GET',
    new strategies.NetworkFirst({
      cacheName: 'starked-api-v2',
      networkTimeoutSeconds: 3, // Fall back to cache if network is slow
    })
  );

  // Stale-While-Revalidate for Documents/HTML
  routing.registerRoute(
    ({ request }) => request.destination === 'document',
    new strategies.StaleWhileRevalidate({
      cacheName: 'starked-dynamic-v2',
    })
  );
} else {
  console.log('❌ Workbox failed to load');
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-progress') {
    console.log('🔄 Custom Background sync triggered:', event.tag);
    // Let Workbox handle queued networks automatically, 
    // or trigger custom IndexedDB sync processes here
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received:', event);
  
  const options = {
    body: event.data?.text() || 'You have a new notification from StarkEd',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: event.data?.json() || {},
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('StarkEd', options)
  );
});
