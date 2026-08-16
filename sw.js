/* All Pro Building Supplies — service worker (PWA) */
const CACHE_VERSION = 'apbs-pwa-v11';
const SHELL = [
  './',
  './index.html',
  './products.html',
  './cart.html',
  './checkout.html',
  './login.html',
  './register.html',
  './account.html',
  './contact.html',
  './about.html',
  './admin.html',
  './offline.html',
  './manifest.webmanifest',
  './assets/style.css',
  './assets/main.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  './images/logo.png',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(SHELL).catch(function () {
        // Best-effort: cache what we can if one asset 404s.
        return Promise.all(
          SHELL.map(function (url) {
            return cache.add(url).catch(function () {});
          })
        );
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_VERSION) return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function isApiRequest(url) {
  try {
    var u = new URL(url);
    return u.pathname.indexOf('/api') === 0 || u.hostname.indexOf('workers.dev') !== -1;
  } catch (_) {
    return false;
  }
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url = request.url;
  if (isApiRequest(url)) {
    // Always network for API — never serve stale auth/catalog from cache.
    event.respondWith(
      fetch(request).catch(function () {
        return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    return;
  }

  // Navigations: network first, fall back to cache, then offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          var copy = response.clone();
          caches.open(CACHE_VERSION).then(function (cache) {
            cache.put(request, copy);
          });
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) {
            return cached || caches.match('./offline.html') || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Static assets: cache first, then network.
  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        var copy = response.clone();
        caches.open(CACHE_VERSION).then(function (cache) {
          cache.put(request, copy);
        });
        return response;
      }).catch(function () {
        return cached;
      });
    })
  );
});
