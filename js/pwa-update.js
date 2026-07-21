window.JYMLog =
  window.JYMLog || {};

window.JYMLog.pwaUpdate =
  (() => {
    "use strict";

    let registration =
      null;

    let waitingWorker =
      null;

    let updateRequested =
      false;

    let reloadStarted =
      false;

    let initialized =
      false;

    let banner =
      null;

    let titleElement =
      null;

    let messageElement =
      null;

    let laterButton =
      null;

    let updateButton =
      null;

    function isSupported() {
      return (
        "serviceWorker" in
        navigator
      );
    }

    function isWorkoutInProgress() {
      const state =
        window.JYMLog
          .workout
          ?.state;

      return Boolean(
        state?.started &&
        !state.completed
      );
    }

    function createBanner() {
      if (banner) {
        return banner;
      }

      banner =
        document.createElement(
          "section"
        );

      banner.id =
        "pwaUpdateBanner";

      banner.className =
        "pwa-update-banner";

      banner.setAttribute(
        "aria-hidden",
        "true"
      );

      banner.setAttribute(
        "aria-label",
        "앱 업데이트 안내"
      );

      const content =
        document.createElement(
          "div"
        );

      content.className =
        "pwa-update-content";

      titleElement =
        document.createElement(
          "strong"
        );

      titleElement.className =
        "pwa-update-title";

      messageElement =
        document.createElement(
          "p"
        );

      messageElement.className =
        "pwa-update-message";

      messageElement.setAttribute(
        "role",
        "status"
      );

      messageElement.setAttribute(
        "aria-live",
        "polite"
      );

      const actions =
        document.createElement(
          "div"
        );

      actions.className =
        "pwa-update-actions";

      laterButton =
        document.createElement(
          "button"
        );

      laterButton.type =
        "button";

      laterButton.className =
        "pwa-update-later";

      laterButton.textContent =
        "나중에";

      updateButton =
        document.createElement(
          "button"
        );

      updateButton.type =
        "button";

      updateButton.className =
        "pwa-update-now";

      updateButton.textContent =
        "지금 업데이트";

      content.append(
        titleElement,
        messageElement
      );

      actions.append(
        laterButton,
        updateButton
      );

      banner.append(
        content,
        actions
      );

      document.body.appendChild(
        banner
      );

      laterButton.addEventListener(
        "click",
        hideBanner
      );

      updateButton.addEventListener(
        "click",
        requestUpdate
      );

      return banner;
    }

    function setBannerMessage(
      title,
      message
    ) {
      createBanner();

      titleElement.textContent =
        title;

      messageElement.textContent =
        message;
    }

    function setBannerBusy(
      isBusy
    ) {
      if (!updateButton) {
        return;
      }

      updateButton.disabled =
        isBusy;

      laterButton.disabled =
        isBusy;

      updateButton.setAttribute(
        "aria-busy",
        String(isBusy)
      );

      updateButton.textContent =
        isBusy
          ? "업데이트 중..."
          : "지금 업데이트";
    }

    function showBanner(
      worker
    ) {
      if (!worker) {
        return false;
      }

      waitingWorker =
        worker;

      createBanner();

      setBannerBusy(false);

      setBannerMessage(
        "새 버전이 준비되었습니다.",
        "업데이트하면 최신 기능과 수정 사항이 적용됩니다."
      );

      banner.classList.add(
        "show"
      );

      banner.setAttribute(
        "aria-hidden",
        "false"
      );

      return true;
    }

    function hideBanner() {
      if (!banner) {
        return;
      }

      banner.classList.remove(
        "show"
      );

      banner.setAttribute(
        "aria-hidden",
        "true"
      );
    }

    function requestUpdate() {
      if (
        updateRequested ||
        !waitingWorker
      ) {
        return;
      }

      /*
       * 진행 중 운동 기록을 보호하기 위해
       * 운동 중에는 새로고침을 허용하지 않습니다.
       */
      if (
        isWorkoutInProgress()
      ) {
        setBannerMessage(
          "운동 완료 후 업데이트해 주세요.",
          "진행 중인 운동 기록을 보호하기 위해 지금은 업데이트하지 않습니다."
        );

        updateButton.textContent =
          "운동 후 업데이트";

        return;
      }

      updateRequested =
        true;

      setBannerBusy(true);

      setBannerMessage(
        "새 버전을 적용하고 있습니다.",
        "잠시 후 앱이 한 번 새로고침됩니다."
      );

      try {
        waitingWorker.postMessage({
          type:
            "SKIP_WAITING"
        });
      } catch (error) {
        console.error(
          "[JYM Log] 서비스 워커 업데이트 요청 실패",
          error
        );

        updateRequested =
          false;

        setBannerBusy(false);

        setBannerMessage(
          "업데이트를 시작하지 못했습니다.",
          "네트워크 상태를 확인한 뒤 다시 시도해 주세요."
        );
      }
    }

    function handleControllerChange() {
      /*
       * 최초 서비스 워커 설치나 다른 원인으로
       * controller가 바뀐 경우에는 새로고침하지 않습니다.
       */
      if (
        !updateRequested ||
        reloadStarted
      ) {
        return;
      }

      reloadStarted =
        true;

      window.location.reload();
    }

    function watchInstallingWorker(
      targetRegistration
    ) {
      const installingWorker =
        targetRegistration
          .installing;

      if (!installingWorker) {
        return;
      }

      installingWorker
        .addEventListener(
          "statechange",
          () => {
            if (
              installingWorker
                .state !==
                "installed" ||
              !navigator
                .serviceWorker
                .controller
            ) {
              return;
            }

            showBanner(
              targetRegistration
                .waiting ||
              installingWorker
            );
          }
        );
    }

    async function checkForUpdate() {
      if (!registration) {
        return false;
      }

      try {
        await registration.update();

        if (
          registration.waiting &&
          navigator
            .serviceWorker
            .controller
        ) {
          showBanner(
            registration.waiting
          );
        }

        return true;
      } catch (error) {
        console.warn(
          "[JYM Log] 새 버전 확인 실패",
          error
        );

        return false;
      }
    }

    async function initialize() {
      if (
        initialized ||
        !isSupported()
      ) {
        return false;
      }

      initialized =
        true;

      createBanner();

      navigator.serviceWorker
        .addEventListener(
          "controllerchange",
          handleControllerChange
        );

      try {
        registration =
          await navigator
            .serviceWorker
            .register(
              "./sw.js"
            );

        if (
          registration.waiting &&
          navigator
            .serviceWorker
            .controller
        ) {
          showBanner(
            registration.waiting
          );
        }

        registration
          .addEventListener(
            "updatefound",
            () => {
              watchInstallingWorker(
                registration
              );
            }
          );

        window.addEventListener(
          "online",
          () => {
            void checkForUpdate();
          }
        );

        document.addEventListener(
          "visibilitychange",
          () => {
            if (!document.hidden) {
              void checkForUpdate();
            }
          }
        );

        void checkForUpdate();

        return true;
      } catch (error) {
        console.warn(
          "[JYM Log] 서비스 워커 등록 실패",
          error
        );

        return false;
      }
    }

    window.addEventListener(
      "load",
      () => {
        void initialize();
      },
      {
        once: true
      }
    );

    return Object.freeze({
      initialize,
      checkForUpdate,

      get hasWaitingUpdate() {
        return Boolean(
          waitingWorker
        );
      }
    });
  })();