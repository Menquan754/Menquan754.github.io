/* 个人站点 Service Worker：缓存静态资源，二次访问与弱网下更快更稳 */
var VERSION = 'v1';
var CACHE = 'site-' + VERSION;
var CORE = [
  './',
  './index.html',
  './projects.html',
  './about.html',
  './css/style.css',
  './js/main.js',
  './assets/avatar.jpg',
  './assets/favicon.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(CORE);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key !== CACHE;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // 只缓存同源资源

  var isHtml = request.mode === 'navigate' ||
    url.pathname === '/' ||
    /\.html(?:\?|$)/.test(url.pathname);

  if (isHtml) {
    // HTML：网络优先，保证内容最新；失败时回退缓存
    event.respondWith(
      fetch(request).then(function (response) {
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      }).catch(function () {
        return caches.match(request);
      })
    );
    return;
  }

  // 静态资源：缓存优先，后台更新（stale-while-revalidate）
  event.respondWith(
    caches.match(request).then(function (cached) {
      var network = fetch(request).then(function (response) {
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      }).catch(function () {
        return cached;
      });
      return cached || network;
    })
  );
});
