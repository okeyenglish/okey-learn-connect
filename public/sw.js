// Simple service worker for caching static assets (PRODUCTION ONLY)
// NOTE: do NOT cache Vite dev source files like /src/*

const CACHE_NAME = 'okey-english-v2';
const STATIC_FALLBACK = '/';

const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => undefined)
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

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