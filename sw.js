/* Luca's Games offline support.
   Bump VERSION whenever files change so phones pick up the new copy.
   Coloring page art is kept in its own cache (ART) that survives version bumps,
   so each picture downloads once; the page list comes from coloring/pages.js. */
importScripts('coloring/pages.js');

const VERSION = 'lucas-games-v9';
const ART = 'lucas-coloring-art-v1';
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
  './coloring/pages.js',
  './coloring/manifest.webmanifest',
  './coloring/icons/apple-touch-icon.png',
  './coloring/icons/icon-192.png',
  './coloring/icons/icon-512.png',
  './coloring/icons/icon-maskable-512.png',
  './coloring/icons/favicon.png'
];
const ART_FILES = (self.COLORING_PAGES || []).flatMap((p) => ['./coloring/' + p.thumb, './coloring/' + p.src]);
const isArt = (url) => url.pathname.includes('/coloring/pages/');

// Download any page art this phone doesn't have yet; one failure doesn't stop the rest.
async function fillArt() {
  const cache = await caches.open(ART);
  await Promise.allSettled(ART_FILES.map(async (url) => {
    if (!(await cache.match(url))) await cache.add(url);
  }));
}

self.addEventListener('install', (event) => {
  // cache: 'reload' skips the browser's own cache so a new version really is new.
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(fillArt)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION && k !== ART).map((k) => caches.delete(k)));
    // Forget art for pages that were removed from the list.
    const art = await caches.open(ART);
    const wanted = new Set(ART_FILES.map((u) => new URL(u, self.location).href));
    for (const req of await art.keys()) if (!wanted.has(req.url)) await art.delete(req);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Page art never changes once added: serve the saved copy, download it the first time.
  if (isArt(url)) {
    event.respondWith(caches.open(ART).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }));
    return;
  }

  // Everything else: serve from the phone first (fast, works offline), then refresh the copy in the background.
  // Pages are stored as .../index.html; send each page visit to its own copy.
  let key = req;
  if (req.mode === 'navigate') {
    key = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
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
