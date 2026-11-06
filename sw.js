/**
 * ATAMAN — Progressive Web App Service Worker
 * Provides offline caching, network-resilient fallbacks, and PWA installation support.
 */

const CACHE_NAME = 'ataman-pwa-v1.3.2';

// Core Application Shell Assets to Pre-cache
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './login.html',
  './splash.html',
  './register-adopter.html',
  './register-caretaker.html',
  './my-trees.html',
  './admin-tree-map.html',
  './admin-trees.html',
  './offline.html',
  './manifest.json',
  './dashboard.css',
  './style.css',
  './my-trees.css',
  './admin-tree-map.css',
  './admin-trees.css',
  './register.css',
  './ATAMAN-init.js',
  './ataman-connectivity.js',
  './realtime-admin.js',
  './firebase-config.js',
  './app.js',
  './pwa-register.js',
  './favicon.svg',
  './favicon.png',
  './favicon.ico',
  './apple-touch-icon.png',
  './assets/icons/icon-96.png',
  './assets/icons/icon-144.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-192.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/ataman-logo-stacked.png',
  './assets/atamanlogo-noborder.png',
  './assets/Plain.jpg',
  './assets/btn-leaf-icon.png'
];

// Domains/Paths that should NEVER be cached by the service worker
const EXCLUDED_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'firebasestorage.googleapis.com',
  'google.com',
  'googleapis.com'
];

// ============================================================================
// 1. INSTALL LIFECYCLE
// ============================================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Robust caching: add files individually so one missing asset doesn't abort install
      const cachePromises = PRECACHE_ASSETS.map(async (url) => {
        try {
          const response = await fetch(url, { cache: 'no-cache' });
          if (response && response.ok) {
            await cache.put(url, response);
          }
        } catch (err) {
          console.warn('[ATAMAN ServiceWorker] Pre-cache item skipped:', url, err.message);
        }
      });
      await Promise.all(cachePromises);
      return self.skipWaiting();
    })
  );
});

// ============================================================================
// 2. ACTIVATE LIFECYCLE
// ============================================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && name.startsWith('ataman-pwa-')) {
            console.log('[ATAMAN ServiceWorker] Purging legacy cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ============================================================================
// 3. FETCH STRATEGY
// ============================================================================
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip browser extensions, chrome-extension://, or non-http protocols
  if (!url.protocol.startsWith('http')) return;

  // Bypass Firebase SDK and Google Auth endpoints to avoid breaking realtime streams
  if (EXCLUDED_HOSTS.some(host => url.hostname.includes(host))) {
    return;
  }

  // A. NAVIGATION REQUESTS (HTML Pages) -> Network-First, Block with Offline Page if Offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // User requested: Block access while offline -> serve blocking offline page
          const offlineFallback = await caches.match('./offline.html');
          if (offlineFallback) return offlineFallback;
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // B. STATIC ASSETS (CSS, JS, Images, Fonts, Icons) -> Stale-While-Revalidate
  const isStaticAsset =
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.json') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('unpkg.com');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        // Fetch latest version in background to update cache
        const fetchPromise = fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
            }
            return networkResponse;
          })
          .catch(() => {
            // Silently ignore background fetch failure when offline
          });

        // Return cached version immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // C. DEFAULT -> Network First
  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(req))
  );
});

// ============================================================================
// 4. CLIENT MESSAGES (Skip Waiting & Updates)
// ============================================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
