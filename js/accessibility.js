window.JYMLog =
  window.JYMLog || {};

window.JYMLog.accessibility =
  (() => {
    "use strict";

    const observers =
      [];

    function getTextContent(
      element
    ) {
      return String(
        element?.textContent ||
        ""
      ).trim();
    }

    /*
     * 설정 스위치의 화면 표시 상태를
     * 접근성 상태와 동기화합니다.
     */
    function syncSwitchState(
      switchElement
    ) {
      if (!switchElement) {
        return;
      }

      const isChecked =
        switchElement
          .classList
          .contains("on");

      switchElement.setAttribute(
        "aria-checked",
        String(isChecked)
      );
    }

    function enhanceSwitch(
      switchElement
    ) {
      if (
        !switchElement ||
        switchElement.dataset
          .a11yReady ===
          "true"
      ) {
        return;
      }

      switchElement.dataset
        .a11yReady =
        "true";

      switchElement.setAttribute(
        "role",
        "switch"
      );

      switchElement.setAttribute(
        "tabindex",
        "0"
      );

      const settingRow =
        switchElement.closest(
          ".setting-row"
        );

      const settingTitle =
        settingRow?.querySelector(
          "p"
        );

      const label =
        getTextContent(
          settingTitle
        );

      if (
        label &&
        !switchElement
          .hasAttribute(
            "aria-label"
          )
      ) {
        switchElement.setAttribute(
          "aria-label",
          label
        );
      }

      syncSwitchState(
        switchElement
      );

      switchElement.addEventListener(
        "keydown",
        (event) => {
          if (
            event.key !== " " &&
            event.key !== "Enter"
          ) {
            return;
          }

          event.preventDefault();

          /*
           * 기존 click 리스너를 그대로 사용해
           * 마우스와 키보드 동작을 일치시킵니다.
           */
          switchElement.click();
        }
      );

      const observer =
        new MutationObserver(
          () => {
            syncSwitchState(
              switchElement
            );
          }
        );

      observer.observe(
        switchElement,
        {
          attributes: true,
          attributeFilter: [
            "class"
          ]
        }
      );

      observers.push(observer);
    }

    function enhanceSwitches() {
      document
        .querySelectorAll(
          ".switch"
        )
        .forEach(
          enhanceSwitch
        );
    }

    /*
     * 피로도 점수는 선택 버튼이므로
     * aria-pressed 상태를 제공합니다.
     */
    function syncScoreButtons() {
      document
        .querySelectorAll(
          ".score-btn"
        )
        .forEach(
          (button) => {
            const isSelected =
              button.classList
                .contains(
                  "selected"
                );

            button.setAttribute(
              "aria-pressed",
              String(isSelected)
            );

            const score =
              getTextContent(button);

            if (
              score &&
              !button.hasAttribute(
                "aria-label"
              )
            ) {
              button.setAttribute(
                "aria-label",
                `피로도 ${score}점`
              );
            }
          }
        );
    }

    function enhanceScoreButtons() {
      const scoreRow =
        document.getElementById(
          "scoreRow"
        );

      if (!scoreRow) {
        return;
      }

      syncScoreButtons();

      const observer =
        new MutationObserver(
          syncScoreButtons
        );

      observer.observe(
        scoreRow,
        {
          subtree: true,
          attributes: true,
          attributeFilter: [
            "class"
          ]
        }
      );

      observers.push(observer);
    }

    /*
     * 토스트 문구를 스크린리더가
     * 화면 이동 없이 안내하도록 합니다.
     */
    function enhanceToast() {
      const toast =
        document.getElementById(
          "toast"
        );

      if (!toast) {
        return;
      }

      toast.setAttribute(
        "role",
        "status"
      );

      toast.setAttribute(
        "aria-live",
        "polite"
      );

      toast.setAttribute(
        "aria-atomic",
        "true"
      );
    }

    /*
     * 동기화 상태가 클릭 가능한 상태일 때
     * 키보드에서도 실행할 수 있게 합니다.
     */
    function syncSyncStatusAccessibility() {
      const syncStatus =
        document.getElementById(
          "syncStatus"
        );

      if (!syncStatus) {
        return;
      }

      const isActionable =
        syncStatus.classList
          .contains(
            "is-actionable"
          );

      if (isActionable) {
        syncStatus.setAttribute(
          "role",
          "button"
        );

        syncStatus.setAttribute(
          "tabindex",
          "0"
        );

        syncStatus.setAttribute(
          "aria-label",
          "동기화 충돌 내용 확인"
        );

        return;
      }

      syncStatus.setAttribute(
        "role",
        "status"
      );

      syncStatus.removeAttribute(
        "tabindex"
      );

      syncStatus.removeAttribute(
        "aria-label"
      );
    }

    function enhanceSyncStatus() {
      const syncStatus =
        document.getElementById(
          "syncStatus"
        );

      if (!syncStatus) {
        return;
      }

      syncSyncStatusAccessibility();

      syncStatus.addEventListener(
        "keydown",
        (event) => {
          if (
            !syncStatus.classList
              .contains(
                "is-actionable"
              ) ||
            (
              event.key !==
                " " &&
              event.key !==
                "Enter"
            )
          ) {
            return;
          }

          event.preventDefault();

          syncStatus.click();
        }
      );

      const observer =
        new MutationObserver(
          syncSyncStatusAccessibility
        );

      observer.observe(
        syncStatus,
        {
          attributes: true,
          attributeFilter: [
            "class"
          ]
        }
      );

      observers.push(observer);
    }

    /*
     * 터치 피드백이 필요한 비표준 조작 요소에
     * 짧은 pressed 상태를 제공합니다.
     */
    function initializeTouchFeedback() {
      const selector = [
        ".switch",
        ".theme-option",
        ".sync-status.is-actionable"
      ].join(",");

      const clearPressedState =
        () => {
          document
            .querySelectorAll(
              ".is-touch-pressed"
            )
            .forEach(
              (element) => {
                element.classList
                  .remove(
                    "is-touch-pressed"
                  );
              }
            );
        };

      document.addEventListener(
        "pointerdown",
        (event) => {
          const target =
            event.target.closest(
              selector
            );

          if (!target) {
            return;
          }

          target.classList.add(
            "is-touch-pressed"
          );
        },
        {
          passive: true
        }
      );

      document.addEventListener(
        "pointerup",
        clearPressedState,
        {
          passive: true
        }
      );

      document.addEventListener(
        "pointercancel",
        clearPressedState,
        {
          passive: true
        }
      );
    }

    function initialize() {
      enhanceSwitches();
      enhanceScoreButtons();
      enhanceToast();
      enhanceSyncStatus();
      initializeTouchFeedback();

      window.dispatchEvent(
        new CustomEvent(
          "jym-log:accessibility-ready"
        )
      );
    }

    if (
      document.readyState ===
      "loading"
    ) {
      document.addEventListener(
        "DOMContentLoaded",
        initialize,
        {
          once: true
        }
      );
    } else {
      initialize();
    }

    return Object.freeze({
      initialize,
      syncSwitchState,
      syncScoreButtons
    });
  })();