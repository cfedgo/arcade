/* Luca's Games offline support.
   Bump VERSION whenever files change so phones pick up the new copy. */
const VERSION = 'lucas-games-v7';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/games/tictactoe.js',
  './js/games/dots.js',
  './js/games/connect4.js',
  './js/games/memory.js',
  './js/games/checkers.js',
  './fonts/bungee.woff2',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon.png',
  './coloring/',
  './coloring/index.html',
  './coloring/manifest.webmanifest',
  './coloring/pages/race.svg',
  './coloring/pages/tow.svg',
  './coloring/pages/monster.svg',
  './coloring/pages/football.svg',
  './coloring/pages/castle.svg',
  './coloring/pages/kitchen.svg',
  './coloring/icons/apple-touch-icon.png',
  './coloring/icons/icon-192.png',
  './coloring/icons/icon-512.png',
  './coloring/icons/icon-maskable-512.png',
  './coloring/icons/favicon.png'
];

self.addEventListener('install', (event) => {
  // cache: 'reload' skips the browser's own cache so a new version really is new.
  event.waitUntil(caches.open(VERSION).then((cache) =>
    cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve from the phone first (fast, works offline), then refresh the copy in the background.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Pages are stored as .../index.html; send each page visit to its own copy.
  let key = req;
  if (req.mode === 'navigate') {
    const path = new URL(req.url).pathname;
    key = path.endsWith('/') ? path + 'index.html' : path;
  }
  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(key, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(key, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
