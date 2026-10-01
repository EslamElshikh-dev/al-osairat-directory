const OFFLINE_CACHE = 'osairat-offline-v1';
const OFFLINE_PAGE = '/offline.html';
const OFFLINE_ASSETS = [OFFLINE_PAGE, '/app-icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE)
      .then((cache) => cache.addAll(OFFLINE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('osairat-offline-') && key !== OFFLINE_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(async () =>
    (await caches.match(OFFLINE_PAGE)) || Response.error()
  ));
});
