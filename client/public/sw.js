/*
 * Dollars at Work service worker.
 *
 * It exists so the app can be installed and so a dropped connection shows a friendly page instead of the
 * browser's error. That is all it does. It never caches or answers API requests, and never stores anything
 * a signed-in person has entered: your numbers only ever come from the server, fresh.
 */
const CACHE = 'daw-offline-v1';
const OFFLINE_URL = '/offline.html';
const ASSETS = [OFFLINE_URL, '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Only page loads, only when the network fails. Everything else goes straight through untouched.
  if (request.mode !== 'navigate') return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL);
      return cached ?? new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }),
  );
});
