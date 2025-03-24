const CACHE_NAME = 'hexaequo-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './src/js/main.js',
  './src/js/core/gameBoard.js',
  './src/js/core/gameState.js',
  './src/js/ui/threeRenderer.js',
  './src/js/ui/uiManager.js',
  './src/js/utils/storageManager.js',
  './src/assets/models/modern/tile_black.glb',
  './src/assets/models/modern/tile_white.glb',
  './src/assets/models/modern/disc_black.glb',
  './src/assets/models/modern/disc_white.glb',
  './src/assets/models/modern/ring_black.glb',
  './src/assets/models/modern/ring_white.glb',
  './manifest.json',
  './src/assets/icons/favicon.ico',
  './src/assets/icons/icon-192x192.png',
  './src/assets/icons/icon-512x512.png',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js'
];

// Install event - cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          return response;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses or non-GET requests
            if (!response || response.status !== 200 || event.request.method !== 'GET') {
              return response;
            }
            
            // Clone the response to cache it and return the original
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          });
      })
      .catch(() => {
        // Fallback for offline - could return a custom offline page
        return new Response('You are currently offline. Please check your connection.');
      })
  );
}); 