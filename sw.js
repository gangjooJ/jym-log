const CACHE_NAME = "jym-log-v0.2.0-rc-1";

const APP_SHELL = [
  "./",
  "./index.html",

  "./css/style.css",
  "./css/app-shell.css?v=dev59",
  "./css/progression.css",
  "./css/progression-history.css",
  "./css/progression-editor.css",
  "./css/routine-schedule.css",

  "./js/config.js?v=rc1",
  "./js/layer-manager.js?v=dev56",
  "./js/theme.js?v=dev59",
  "./js/viewport.js?v=dev54-1",
  "./js/firebase-client.js",
  "./js/profile.js",
  "./js/routines.js",
  "./js/sync.js",
  "./js/progression-history.js",
  "./js/history-ui.js",
  "./js/analysis-ui.js",
  "./js/sync-conflict-ui.js?v=dev56",
  "./js/sessions.js",
  "./js/history.js",
  "./js/analysis.js",
  "./js/auth.js",
  "./js/storage.js",
  "./js/progression-policy.js",
  "./js/workout.js?v=dev55-1",
  "./js/progression-engine.js",
  "./js/workout-ui.js?v=dev56-1",
  "./js/routine-ui.js?v=dev56",
  "./js/routine-schedule.js",
  "./js/routine-override.js",
  "./js/app.js?v=dev57",
  "./js/pwa-update.js?v=dev57",
  "./js/accessibility.js?v=dev59-1",

  "./manifest.webmanifest",

  "./assets/jym-mark.svg",
  "./assets/jym-mark-white.svg",
  "./assets/jym-logo.svg",
  "./assets/jym-logo-white.svg",
  "./assets/jym-app-icon.svg",

  "./icon-192.png",
  "./icon-512.png"
];

/**
 * 서비스 워커 설치
 *
 * 앱 실행에 필요한 기본 파일을 미리 캐시에 저장합니다.
 */
self.addEventListener(
  "install",
  (event) => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then(
          (cache) =>
            cache.addAll(
              APP_SHELL
            )
        )
    );
  }
);

/**
 * 사용자가 업데이트를 선택했을 때만
 * 대기 중인 서비스 워커를 활성화합니다.
 */
self.addEventListener(
  "message",
  (event) => {
    if (
      event.data?.type !==
      "SKIP_WAITING"
    ) {
      return;
    }

    event.waitUntil(
      self.skipWaiting()
    );
  }
);

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
