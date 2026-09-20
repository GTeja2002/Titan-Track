/* TitanTrack service worker.
 *
 * The app already keeps all its data in localStorage, so the only thing
 * standing between it and working offline is the shell. This caches the built
 * assets on first visit and serves them from cache when the network is gone.
 *
 * Strategy: network-first for navigations, so a deploy is picked up straight
 * away and the cached shell is only a fallback; cache-first for hashed build
 * assets and images, which never change under the same URL.
 */
// Bumping this name makes the activate handler delete every older cache, so a
// stale set from a previous worker cannot survive an update.
const VERSION = 'titantrack-v2';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => { /* a missing shell entry must not block installation */ })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // never touch Supabase or Google

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(request, copy));
        }
        return res;
      }).catch(() => cached || Response.error());
    })
  );
});
