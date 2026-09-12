const CACHE_NAME = 'alertlife-v1.0.0';
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

// Activate: clean old version caches immediately
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

// Fetch: Network-first for everything to always deliver latest code
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(e.request).then(cached => cached || (e.request.mode === 'navigate' ? caches.match('/index.html') : null)))
  );
});
