const CACHE_NAME = 'alertlife-v6';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest-volunteer.json',
  '/favicon.svg',
  '/volunteer-icon.svg'
];

// Install: cache essential PWA shell and index.html
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old version caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network-first for navigation, falling back to cached index.html
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Handle SPA navigation requests
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html') || caches.match('/'))
    );
    return;
  }

  // Handle other assets
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request);
    })
  );
});
