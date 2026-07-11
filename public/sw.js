const CACHE_VERSION = 'facilpdf-static-v2';
const APP_SHELL = [
  '/',
  '/es',
  '/en',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/pwa-icon.svg',
];

const USER_FILE_METHODS = new Set(['POST', 'PUT', 'PATCH']);
const USER_FILE_EXTENSIONS = /\.(pdf|zip|png|jpe?g|webp|txt)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;
  if (USER_FILE_METHODS.has(request.method)) return;
  if (USER_FILE_EXTENSIONS.test(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline.html')),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        const isStaticAsset =
          ['style', 'script', 'font', 'image'].includes(request.destination) ||
          url.pathname.startsWith('/_astro/') ||
          url.pathname.endsWith('.webmanifest');

        if (response.ok && isStaticAsset) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }

        return response;
      });
    }),
  );
});
