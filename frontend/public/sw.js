const CACHE_NAME = 'alertlife-v1.0.3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest-volunteer.json',
  '/favicon.svg',
  '/volunteer-icon.svg'
];

// Install: immediately activate new worker
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

// Activate: clean old version caches immediately
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Fetch: Never intercept /api or /assets to prevent stale bundle mismatch
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  
  try {
    const url = new URL(e.request.url);
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/assets')) {
      return; // Direct network pass-through
    }
  } catch {}

  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
