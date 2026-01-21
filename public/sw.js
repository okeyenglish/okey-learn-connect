// Service Worker for O'KEY ENGLISH CRM
// Handles caching and push notifications

const CACHE_NAME = 'okey-english-v3';
const STATIC_FALLBACK = '/';

const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
];

// ============= INSTALLATION =============
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => undefined)
  );
});

// ============= ACTIVATION =============
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// ============= FETCH HANDLER =============
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache dev source modules
  if (url.pathname.startsWith('/src/')) {
    event.respondWith(fetch(req));
    return;
  }

  // Navigation: network-first (avoid serving stale HTML)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(STATIC_FALLBACK))
    );
    return;
  }

  // Assets: cache-first, then update cache
  if (url.pathname.startsWith('/assets/') || ['style', 'script', 'image', 'font'].includes(req.destination)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => undefined);
          return resp;
        });
      })
    );
    return;
  }

  // Default: network
  event.respondWith(fetch(req));
});

// ============= PUSH NOTIFICATIONS =============
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {
    title: "O'KEY ENGLISH",
    body: 'Новое уведомление',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'default',
    data: {}
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
    // Try as text
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    tag: data.tag || 'okey-notification',
    vibrate: [100, 50, 100],
    data: {
      ...data.data,
      url: data.url || data.data?.url || '/',
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'close', title: 'Закрыть' }
    ],
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ============= NOTIFICATION CLICK =============
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (urlToOpen !== '/') {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      // Open new window
      return clients.openWindow(urlToOpen);
    })
  );
});

// ============= NOTIFICATION CLOSE =============
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});

// ============= MESSAGE HANDLER =============
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
