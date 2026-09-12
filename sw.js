// Touch the Stars - service worker
// 1. The page itself (navigation): always ask the server first and skip the browser's
//    HTTP cache, so a new version shows up right away. Offline: serve the cached page.
// 2. Everything else: network first, cached copy as a fallback.
// 3. The page sends the list of files it loaded (fonts, Tailwind, images), so the game
//    also opens offline right after the first visit.
const CACHE = 'touch-the-stars-v3';
const PRECACHE = [
  './', './index.html', './manifest.json', './favicon.ico',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png', './icons/apple-touch-icon.png',
  './images/two-players.png', './images/vs-computer.png'
];

self.addEventListener('install', (event) => {
  // cache: 'reload' skips the browser's HTTP cache, so the stored copy is the newest one
  event.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function saveCopy(request, response) {
  if (response && (response.ok || response.type === 'opaque')) {
    const copy = response.clone();
    caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    // The game is one page: always store the latest copy under one fixed key ('./'),
    // so an old copy saved under a URL like '?v=2' can never be served offline
    event.respondWith(
      fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
        .then((res) => {
          if (res.ok && (res.headers.get('content-type') || '').includes('text/html')) saveCopy(new Request('./'), res);
          return res;
        })
        .catch(() => caches.match('./')
          .then((hit) => hit || caches.match('./index.html'))
          .then((hit) => hit || Response.error()))
    );
    return;
  }

  // Exact URL match only: the two Google Fonts stylesheets differ only in their query string
  event.respondWith(
    fetch(req)
      .then((res) => saveCopy(req, res))
      .catch(() => caches.match(req, { ignoreVary: true }).then((hit) => hit || Response.error()))
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'CACHE_URLS' || !Array.isArray(data.urls)) return;
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.all(data.urls.map(async (url) => {
    try {
      if (await cache.match(url, { ignoreVary: true })) return;
      let res = null;
      // Fonts must be stored as CORS responses, otherwise the browser rejects them offline
      try { res = await fetch(url, { mode: 'cors', credentials: 'omit' }); } catch (e) { res = null; }
      if (!res || !res.ok) res = await fetch(url, { mode: 'no-cors' });
      if (res && (res.ok || res.type === 'opaque')) await cache.put(url, res);
    } catch (e) { /* skip files that cannot be fetched */ }
  }))));
});
