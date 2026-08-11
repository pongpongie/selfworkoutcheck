var CACHE = 'gym-v15';
var ASSETS = [
  './', './index.html', './tokens.css', './core.js', './exercises.js', './manifest.json',
  './icon-192.png', './icon-512.png', './icon-512-maskable.png'
];

/* 같은 출처 응답은 200 + basic 일 때만 캐싱한다.
   이 검사가 없으면 배포 중 뜬 404/502 가 캐시에 영구히 박혀서
   cache-first 로 계속 그 깨진 응답이 나온다. */
function cacheableSameOrigin(res) {
  return !!res && res.status === 200 && res.type === 'basic';
}

/* 폰트는 <link rel=stylesheet> 라 no-cors → opaque(status 0) 로 온다.
   내용을 볼 수 없으니 opaque 도 허용하되, 최악이라도 폰트만 안 뜬다. */
function cacheableFont(res) {
  return !!res && (res.status === 200 || res.type === 'opaque');
}

function putIfCacheable(request, res, allow) {
  if (!allow(res)) return;
  var copy = res.clone();
  caches.open(CACHE).then(function (c) { c.put(request, copy); }).catch(function () {});
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
                           .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);

  // Google Fonts: 처음 한 번 받아두면 지하 헬스장에서도 뜬다
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        putIfCacheable(e.request, res, cacheableFont);
        return res;
      }).catch(function () { return hit; });
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  // 앱 셸: 캐시 먼저 주고 뒤에서 갱신
  e.respondWith(caches.match(e.request).then(function (hit) {
    var net = fetch(e.request).then(function (res) {
      putIfCacheable(e.request, res, cacheableSameOrigin);
      return res;
    }).catch(function () { return hit; });
    return hit || net;
  }));
});
