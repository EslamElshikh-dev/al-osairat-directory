const OFFLINE_CACHE = 'osairat-offline-mobile-v3';
const IMAGE_CACHE = 'osairat-images-mobile-v3';
const MAX_IMAGES = 100;
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
      .then((keys) => Promise.all(keys.filter((key) => (key.startsWith('osairat-offline-') || key.startsWith('osairat-images-')) && key !== OFFLINE_CACHE && key !== IMAGE_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () =>
      (await caches.match(OFFLINE_PAGE)) || Response.error()
    ));
    return;
  }
  // Cache public media only. Account data, API responses and HTML stay fresh.
  if (!/^\/(images|brand|app-icons)\//.test(url.pathname) || request.destination !== 'image') return;
  event.respondWith((async () => {
    const cache = await caches.open(IMAGE_CACHE);
    const cached = await cache.match(request);
    const refresh = fetch(request).then(async (response) => {
      if (response.ok && !/private|no-store/i.test(response.headers.get('Cache-Control') || '')) {
        await cache.put(request, response.clone());
        const keys = await cache.keys();
        await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_IMAGES)).map(key => cache.delete(key)));
      }
      return response;
    });
    if (cached) {
      event.waitUntil(refresh.catch(() => undefined));
      return cached;
    }
    return refresh;
  })());
});
