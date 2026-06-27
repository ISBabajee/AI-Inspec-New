const CACHE_NAME = 'techlens-inspector-v4.1'; // Increment version to force update
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx', // The browser will fetch imports from here
  '/manifest.json',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/assets/icons/icon-maskable-192x192.png',
  '/assets/icons/icon-maskable-512x512.png',
  // Key CDN resources
  'https://cdn.tailwindcss.com',
  'https://aistudiocdn.com/react@19.2.0/index.js',
  'https://aistudiocdn.com/react-dom@19.2.0/client.js',
  'https://esm.sh/react-router-dom@6.24.1?external=react',
  'https://esm.sh/@google/genai@0.14.0',
  'https://esm.sh/idb@8.0.0',
  'https://esm.sh/xlsx@0.18.5'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Add all URLs, but don't fail install if some CDN resources are unreachable during install
        const cachePromises = urlsToCache.map(urlToCache => {
          return cache.add(urlToCache).catch(err => {
            console.warn(`Failed to cache ${urlToCache}:`, err);
          });
        });
        return Promise.all(cachePromises);
      })
      .then(() => self.skipWaiting()) // Activate new SW immediately
  )
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of open clients
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  // For navigation requests, try network first, then cache (for SPA routing)
  // For other requests, try cache first, then network.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // If successful, cache the response for future offline use.
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => caches.match(request).then(response => response || caches.match('/index.html'))) // Fallback to index.html for SPAs
    );
  } else if (urlsToCache.includes(request.url) || request.destination === 'script' || request.destination === 'style' || request.destination === 'manifest' || request.url.startsWith('https://esm.sh/') || request.url.startsWith('https://aistudiocdn.com/')) {
     event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            return response; // Serve from cache
          }
          // Not in cache, fetch from network
          return fetch(request).then(
            networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                // Cache the new resource if it's one of our core assets or from a trusted CDN
                if (urlsToCache.includes(request.url) || request.url.startsWith('https://esm.sh/') || request.url.startsWith('https://cdn.tailwindcss.com') || request.url.startsWith('https://aistudiocdn.com/')) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                        cache.put(request, responseToCache);
                        });
                }
              }
              return networkResponse;
            }
          ).catch(error => {
            console.warn(`Fetch failed for ${request.url}; returning offline page or error`, error);
            // Optionally, return a generic offline page or a more specific error response
            // For now, just let the browser handle the error if not in cache and network fails
          });
        })
    );
  }
  // For API calls (e.g., to Gemini), always go to network. Offline handling for API calls will be managed by app logic (IndexedDB queueing).
  // Let other requests pass through (e.g., Gemini API calls handled by app logic)
});