const CACHE_NAME = 'alertlife-v7-' + Date.now();
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

// 🔔 Live Web Push Notification (fires even when app is closed / minimized)
self.addEventListener('push', (e) => {
  let data = {
    title: '🚨 Alert Life Emergency Alert',
    body: 'Emergency event status updated in your network.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'alertlife-emergency',
    data: { url: '/' }
  };

  if (e.data) {
    try {
      const parsed = e.data.json();
      data = { ...data, ...parsed };
    } catch {
      data.body = e.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    tag: data.tag || 'alertlife-live-notification',
    renotify: true,
    requireInteraction: true,
    vibrate: [350, 150, 350, 250, 500],
    data: data.data || { url: '/' },
    actions: [
      { action: 'open', title: '👁️ View Live Radar' },
      { action: 'dismiss', title: '✕ Dismiss' }
    ]
  };

  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 🚀 Notification Click Action: Focus or Open App Window
self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  if (e.action === 'dismiss') return;

  const targetUrl = (e.notification.data && e.notification.data.url) ? e.notification.data.url : '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Periodic Background Sync or Message from Client
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SHOW_LIVE_NOTIFICATION') {
    const { title, body, icon, tag, data } = e.data;
    self.registration.showNotification(title || '🚨 Alert Life Emergency', {
      body: body || 'Live status update received.',
      icon: icon || '/favicon.svg',
      badge: '/favicon.svg',
      tag: tag || 'alertlife-' + Date.now(),
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 150, 300, 150, 400],
      data: data || { url: '/' }
    });
  }
});

