const CACHE_NAME = 'alertlife-v3';
const ASSETS = [
  '/manifest.json',
  '/manifest-volunteer.json',
  '/favicon.svg',
  '/volunteer-icon.svg'
];

// Install: cache only static assets (NOT index.html — let network serve it fresh)
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  // Immediately activate the new service worker
  self.skipWaiting();
});

// Activate: delete all old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// Fetch: Network-first for HTML, cache-first for static assets
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Always fetch HTML from network (never serve stale index.html)
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first for other static assets
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request).then((networkResponse) => {
        return networkResponse;
      });
    })
  );
});
