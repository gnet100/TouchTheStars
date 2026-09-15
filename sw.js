// Thinking Stars - service worker
// 1. Install: store every file of the site up front (the list below), so the game opens
//    offline after the first visit, including fonts that only later screens use.
//    A new file in the site must be added to PRECACHE.
// 2. The page itself (navigation): always ask the server first and skip the browser's
//    HTTP cache, so a new version shows up right away. Offline: serve the cached page.
// 3. Everything else from this site: network first, cached copy as a fallback.
// 4. Requests to other servers are not handled here (the page loads nothing from them).
// 5. All sites under gnet100.github.io share one cache storage, so only this game's
//    caches (touch-the-stars-*) are ever deleted.
const CACHE = 'touch-the-stars-v4';
const PREFIX = 'touch-the-stars-';
const PRECACHE = [
  './', './index.html', './manifest.json', './favicon.ico',
  './css/app.css', './js/game.js',
  './fonts/fonts.css', './fonts/rubik-hebrew.woff2', './fonts/rubik-latin.woff2',
  './fonts/fredoka-hebrew.woff2', './fonts/fredoka-latin.woff2', './fonts/material-symbols-outlined.woff2',
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
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function saveCopy(request, response) {
  if (response && response.ok && response.type === 'basic') {
    const copy = response.clone();
    caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

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

  event.respondWith(
    fetch(req)
      .then((res) => saveCopy(req, res))
      .catch(() => caches.match(req, { ignoreVary: true }).then((hit) => hit || Response.error()))
  );
});
