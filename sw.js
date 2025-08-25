/* Lightweight SW: cache-only static, never cache API requests */
const VERSION = 'v1.0.0';
const STATIC_CACHE = `static-${VERSION}`;
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './utils.js',
  './assets/fontawesome/css/all.min.css',
  './assets/data/airports.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== STATIC_CACHE ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

/** Helper: decide if a request must bypass cache (APIs & POST/etc) */
function mustBypassCache(req) {
  const url = new URL(req.url);

  // Never cache non-GET or cross-origin API calls
  if (req.method !== 'GET') return true;

  // Bypass any obvious API endpoints (your host or others)
  if (url.pathname.startsWith('/api') || url.hostname.includes('devcommonhub.ru')) return true;

  // Also bypass requests with cache-control: no-store set by page
  const cc = req.headers.get('Cache-Control') || '';
  if (cc.includes('no-store')) return true;

  return false;
}

/** Fetch strategy:
 * - For API/POST → network only (no-store)
 * - For navigation/doc → network falling back to cache
 * - For static assets (css/js/fonts) → cache-first
 */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (mustBypassCache(req)) {
    event.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }

  // Navigation requests: try network, then fallback to cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Only cache basic/opaque ok responses
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'opaque')) {
          const resClone = res.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(req, resClone));
        }
        return res;
      });
    })
  );
});
