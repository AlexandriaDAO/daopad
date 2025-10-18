/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'v2'; // Increment on each deploy
const CACHE_NAME = `daopad-${CACHE_VERSION}`;

self.addEventListener('install', (event: ExtendableEvent) => {
  // Force immediate activation
  self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames: string[]) => {
      // Delete old caches
      return Promise.all(
        cacheNames
          .filter((name: string) => name !== CACHE_NAME)
          .map((name: string) => caches.delete(name))
      );
    })
  );

  // Take control immediately
  return self.clients.claim();
});

self.addEventListener('fetch', (event: FetchEvent) => {
  // Network-first strategy for JS bundles
  if (event.request.url.includes('/assets/')) {
    event.respondWith(
      fetch(event.request)
        .then((response: Response) => {
          // Cache the new version
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache: Cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(event.request);
        })
    );
  }
});
