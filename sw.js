/**
 * ATAMAN — Progressive Web App Service Worker
 * Provides offline caching, network-resilient fallbacks, and PWA installation support.
 */

const CACHE_NAME = 'ataman-pwa-v2.1.1-admin-only-registration';

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

/**
 * Safe CacheStorage Helpers with Self-Healing Recovery
 * Prevents "DOMException: Failed to execute 'open' on 'CacheStorage': Unexpected internal error"
 * from crashing the service worker during debugging or temporary profile storage locks.
 */
async function safeOpenCache(name = CACHE_NAME) {
  try {
    if (typeof caches === 'undefined' || !caches.open) return null;
    return await caches.open(name);
  } catch (err) {
    console.warn('[ATAMAN ServiceWorker] Cache open error, attempting recovery:', err?.message || err);
    try {
      if (typeof caches !== 'undefined' && caches.delete) {
        await caches.delete(name);
      }
      return await caches.open(name);
    } catch (retryErr) {
      console.warn('[ATAMAN ServiceWorker] CacheStorage unavailable; running in direct-network mode.');
      return null;
    }
  }
}

async function safeMatch(req) {
  try {
    if (typeof caches === 'undefined' || !caches.match) return null;
    return await caches.match(req);
  } catch (err) {
    return null;
  }
}

async function safePut(cache, req, response) {
  try {
    if (!cache || !req || !response) return;
    await cache.put(req, response);
  } catch (err) {
    // Quota exceeded or cache write locked -> silently ignore
  }
}

async function safeKeys() {
  try {
    if (typeof caches === 'undefined' || !caches.keys) return [];
    return await caches.keys();
  } catch (err) {
    return [];
  }
}

async function safeDelete(name) {
  try {
    if (typeof caches === 'undefined' || !caches.delete) return false;
    return await caches.delete(name);
  } catch (err) {
    return false;
  }
}

// ============================================================================
// 1. INSTALL LIFECYCLE
// ============================================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await safeOpenCache(CACHE_NAME);
        if (cache) {
          const cachePromises = PRECACHE_ASSETS.map(async (url) => {
            try {
              const response = await fetch(url, { cache: 'no-cache' });
              if (response && response.ok) {
                await safePut(cache, url, response);
              }
            } catch (err) {
              // Silently ignore single pre-cache asset misses
            }
          });
          await Promise.all(cachePromises);
        }
      } catch (err) {
        console.warn('[ATAMAN ServiceWorker] Pre-cache install error bypassed:', err?.message || err);
      }
      return self.skipWaiting();
    })()
  );
});

// ============================================================================
// 2. ACTIVATE LIFECYCLE
// ============================================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await safeKeys();
        await Promise.all(
          cacheNames.map(async (name) => {
            if (name !== CACHE_NAME && name.startsWith('ataman-pwa-')) {
              console.log('[ATAMAN ServiceWorker] Purging legacy cache:', name);
              await safeDelete(name);
            }
          })
        );
      } catch (err) {
        console.warn('[ATAMAN ServiceWorker] Cache purge encountered error:', err?.message || err);
      }
      return self.clients.claim();
    })()
  );
});

// ============================================================================
// 3. FETCH STRATEGY
// ============================================================================
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (_) {
    return;
  }

  // Skip browser extensions, chrome-extension://, or non-http protocols
  if (!url.protocol.startsWith('http')) return;

  // Bypass all external cross-origin requests (Leaflet CDN, Chart.js CDN, Map Tiles, Firebase, Google Fonts)
  // and local development servers (localhost / 127.0.0.1) so live edits are never served stale from CacheStorage
  if (
    url.origin !== self.location.origin ||
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    EXCLUDED_HOSTS.some(host => url.hostname.includes(host))
  ) {
    return;
  }

  // A. NAVIGATION REQUESTS (HTML Pages) -> Network-First, Block with Offline Page if Offline
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(req);
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            safeOpenCache(CACHE_NAME).then((cache) => safePut(cache, req, clone)).catch(() => {});
          }
          return networkResponse;
        } catch (fetchErr) {
          const offlineFallback = (await safeMatch('./offline.html')) || (await safeMatch('/offline.html'));
          if (offlineFallback) return offlineFallback;
          throw fetchErr;
        }
      })()
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

  const isCodeAsset = url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.json');

  if (isCodeAsset) {
    // Network-First for JS/CSS/JSON so cellphones and other devices always run the latest code
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(req);
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            safeOpenCache(CACHE_NAME).then((cache) => safePut(cache, req, clone)).catch(() => {});
            return networkResponse;
          }
        } catch (_) {}
        const cachedResponse = await safeMatch(req);
        if (cachedResponse) return cachedResponse;
        return new Response('Code asset unavailable offline', { status: 503, statusText: 'Service Unavailable' });
      })()
    );
    return;
  }

  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        const cachedResponse = await safeMatch(req);
        const networkFetch = (async () => {
          try {
            const networkResponse = await fetch(req);
            if (networkResponse && networkResponse.ok) {
              const clone = networkResponse.clone();
              safeOpenCache(CACHE_NAME).then((cache) => safePut(cache, req, clone)).catch(() => {});
            }
            return networkResponse;
          } catch (_) {
            return null;
          }
        })();
        if (cachedResponse) return cachedResponse;
        const res = await networkFetch;
        if (res) return res;
        return new Response('Asset unavailable offline', { status: 503, statusText: 'Service Unavailable' });
      })()
    );
    return;
  }

  // C. DEFAULT -> Network First
  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(req);
        if (networkResponse && networkResponse.ok) {
          const clone = networkResponse.clone();
          safeOpenCache(CACHE_NAME).then((cache) => safePut(cache, req, clone)).catch(() => {});
        }
        return networkResponse;
      } catch (err) {
        const cached = await safeMatch(req);
        if (cached) return cached;
        throw err;
      }
    })()
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
