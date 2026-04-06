// TOTV+ Smart Cache Service Worker
// Caches: app shell, assets, and poster images from IPTV server

const CACHE_VER    = 'totv-v3';
const IMG_CACHE    = 'totv-images-v1';
const ASSETS_CACHE = 'totv-assets-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/Icon-180.png',
  '/icons/Icon-192.png',
  '/icons/Icon-512.png',
];

// Install: pre-cache shell
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_VER).then(c => c.addAll(STATIC_ASSETS).catch(() => {}))
  );
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VER && k !== IMG_CACHE && k !== ASSETS_CACHE)
        .map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - App shell (HTML/JS/CSS): Network first, cache fallback
// - Images (poster/logos): Cache first, network fallback, then cache
// - API calls to IPTV server: Network only (never cache)
// - Static assets: Cache first (long TTL)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET
  if (e.request.method !== 'GET') return;

  // Skip IPTV server API calls (player_api, stream URLs)
  if (url.pathname.includes('player_api') ||
      url.pathname.includes('/live/') ||
      url.pathname.includes('/movie/') ||
      url.pathname.includes('/series/') ||
      url.port === '2052' || url.port === '8080' || url.port === '8000') {
    return; // Let browser handle directly
  }

  // Image caching (poster images from any domain)
  const isImage = /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url.pathname) ||
    e.request.destination === 'image';
  if (isImage) {
    e.respondWith(
      caches.open(IMG_CACHE).then(cache =>
        cache.match(e.request).then(hit => {
          if (hit) return hit;
          return fetch(e.request, { mode: 'no-cors' }).then(res => {
            if (res && res.status === 0 || res.ok) {
              cache.put(e.request, res.clone());
            }
            return res;
          }).catch(() => new Response('', { status: 408 }));
        })
      )
    );
    return;
  }

  // JS/WASM/fonts: Cache first (long TTL assets)
  const isAsset = /\.(js|wasm|otf|ttf|frag)(\?.*)?$/i.test(url.pathname);
  if (isAsset && url.origin === self.location.origin) {
    e.respondWith(
      caches.open(ASSETS_CACHE).then(cache =>
        cache.match(e.request).then(hit => {
          if (hit) return hit;
          return fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // HTML/navigation: Network first, cache fallback → offline shell
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const c = res.clone();
          caches.open(CACHE_VER).then(cache => cache.put(e.request, c));
        }
        return res;
      }).catch(() =>
        caches.match('/index.html').then(c => c || caches.match('/'))
      )
    );
    return;
  }
});
