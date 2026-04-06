// TOTV+ Smart Cache Service Worker v3
// Purpose: Cache poster images ONLY — no interference with app shell
// The flutter_service_worker.js handles app shell caching.

const IMG_CACHE = 'totv-images-v2';

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  // Clean old image caches only
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k.startsWith('totv-images-') && k !== IMG_CACHE; })
          .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // ONLY intercept external image requests (poster/logo images from IPTV servers)
  // Never touch: same-origin requests, HTML, JS, JSON, WASM, API calls, stream URLs
  var isSameOrigin = url.origin === self.location.origin;
  if (isSameOrigin) return; // let flutter SW handle all same-origin

  var isImage = (
    req.destination === 'image' ||
    /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url.pathname)
  );
  if (!isImage) return;

  // Skip stream URLs
  var port = url.port;
  if (port === '2052' || port === '8080' || port === '8000' || port === '25461') return;
  if (url.pathname.includes('/live/') || url.pathname.includes('/movie/') || url.pathname.includes('/series/')) return;

  // Cache-first for poster images
  e.respondWith(
    caches.open(IMG_CACHE).then(function(cache) {
      return cache.match(req).then(function(hit) {
        if (hit) return hit;
        return fetch(req, { mode: 'no-cors', credentials: 'omit' })
          .then(function(res) {
            // res.status === 0 means opaque response (no-cors) — still cacheable
            if (res) cache.put(req, res.clone());
            return res;
          })
          .catch(function() {
            return new Response('', { status: 200, headers: { 'Content-Type': 'image/gif' } });
          });
      });
    })
  );
});

// Handle skip waiting message
self.addEventListener('message', function(e) {
  if (e.data && e.data.action === 'skipWaiting') self.skipWaiting();
});
