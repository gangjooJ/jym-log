const CACHE_NAME = "jym-log-v0.2.0-dev-8";

const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/config.js",
  "./js/firebase-client.js",
  "./js/profile.js",
  "./js/sync.js",
  "./js/sessions.js",
  "./js/history.js",
  "./js/auth.js",
  "./js/storage.js",
  "./js/workout.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

/**
 * 서비스 워커 설치
 *
 * 앱 실행에 필요한 기본 파일을 미리 캐시에 저장합니다.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/**
 * 서비스 워커 활성화
 *
 * 현재 버전을 제외한 과거 캐시를 삭제합니다.
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * 파일 요청 처리
 *
 * 1. 네트워크에서 최신 파일 요청
 * 2. 성공하면 캐시도 갱신
 * 3. 네트워크 실패 시 기존 캐시 사용
 */
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);

  // JYM Log와 같은 출처의 파일만 캐시합니다.
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type !== "basic"
        ) {
          return networkResponse;
        }

        const responseCopy = networkResponse.clone();

        event.waitUntil(
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, responseCopy))
        );

        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
          return cachedResponse;
        }

        // 오프라인 상태에서 화면 주소를 열었을 때
        // 캐시된 기본 화면을 대신 반환합니다.
        if (request.mode === "navigate") {
          return caches.match("./index.html");
        }

        return Response.error();
      })
  );
});