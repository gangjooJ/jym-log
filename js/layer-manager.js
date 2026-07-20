window.JYMLog =
  window.JYMLog || {};

window.JYMLog.layerManager =
  (() => {
    "use strict";

    const layers =
      new Map();

    let activeLayerId =
      null;

    let lockedScrollY =
      0;

    const FOCUSABLE_SELECTOR = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled]):not([type='hidden'])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");

    function getLayer(id) {
      return (
        layers.get(
          String(id || "")
        ) || null
      );
    }

    function dispatchLayerEvent(
      type,
      detail
    ) {
      window.dispatchEvent(
        new CustomEvent(
          type,
          {
            detail
          }
        )
      );
    }

    function getFocusableElements(
      root
    ) {
      if (!root) {
        return [];
      }

      return [
        ...root.querySelectorAll(
          FOCUSABLE_SELECTOR
        )
      ].filter(
        (element) =>
          element instanceof
            HTMLElement &&
          !element.hidden &&
          element.getAttribute(
            "aria-hidden"
          ) !== "true" &&
          element.getClientRects()
            .length > 0
      );
    }

    function resolveInitialFocus(
      entry
    ) {
      const configuredTarget =
        typeof entry.initialFocus ===
          "function"
          ? entry.initialFocus()
          : typeof entry
                .initialFocus ===
              "string"
            ? entry.element
                .querySelector(
                  entry.initialFocus
                )
            : entry.initialFocus;

      if (
        configuredTarget instanceof
          HTMLElement
      ) {
        return configuredTarget;
      }

      return (
        getFocusableElements(
          entry.element
        )[0] ||
        entry.element
      );
    }

    function setLayerVisible(
      entry,
      visible
    ) {
      if (entry.showClass) {
        entry.element
          .classList.toggle(
            entry.showClass,
            visible
          );
      }

      if (entry.hiddenClass) {
        entry.element
          .classList.toggle(
            entry.hiddenClass,
            !visible
          );
      }

      entry.element.setAttribute(
        "aria-hidden",
        String(!visible)
      );

      entry.element
        .dataset.layerOpen =
          visible
            ? "true"
            : "false";
    }

    function lockBodyScroll() {
      const body =
        document.body;

      if (
        !body ||
        body.classList.contains(
          "layer-open"
        )
      ) {
        return;
      }

      lockedScrollY =
        Math.max(
          0,
          window.scrollY || 0
        );

      body.classList.add(
        "layer-open"
      );

      body.style.position =
        "fixed";

      body.style.top =
        `-${lockedScrollY}px`;

      body.style.right = "0";
      body.style.left = "0";
      body.style.width = "100%";
    }

    function unlockBodyScroll() {
      const body =
        document.body;

      if (!body) {
        return;
      }

      body.classList.remove(
        "layer-open"
      );

      body.style.removeProperty(
        "position"
      );

      body.style.removeProperty(
        "top"
      );

      body.style.removeProperty(
        "right"
      );

      body.style.removeProperty(
        "left"
      );

      body.style.removeProperty(
        "width"
      );

      window.scrollTo({
        top: lockedScrollY,
        left: 0,
        behavior: "auto"
      });
    }

    function register(
      options = {}
    ) {
      const element =
        options.element;

      const id =
        String(
          options.id ||
          element?.dataset
            ?.layer ||
          ""
        ).trim();

      if (
        !id ||
        !(element instanceof
          HTMLElement)
      ) {
        console.warn(
          "[JYM Log] 레이어 등록 정보가 올바르지 않습니다.",
          options
        );

        return false;
      }

      element.dataset.layer =
        id;

      if (
        !element.hasAttribute(
          "tabindex"
        )
      ) {
        element.setAttribute(
          "tabindex",
          "-1"
        );
      }

      const showClass =
        options.showClass ||
        null;

      const hiddenClass =
        options.hiddenClass ||
        null;

      const currentlyVisible =
        showClass
          ? element.classList
              .contains(
                showClass
              )
          : hiddenClass
            ? !element.classList
                .contains(
                  hiddenClass
                )
            : element.getAttribute(
                "aria-hidden"
              ) === "false";

      element.setAttribute(
        "aria-hidden",
        String(
          !currentlyVisible
        )
      );

      layers.set(
        id,
        {
          id,
          element,
          showClass,
          hiddenClass,

          initialFocus:
            options.initialFocus ||
            null,

          closeOnBackdrop:
            options
              .closeOnBackdrop ===
            true,

          canClose:
            typeof options.canClose ===
              "function"
              ? options.canClose
              : () => true,

          onRequestClose:
            typeof options
              .onRequestClose ===
              "function"
              ? options
                  .onRequestClose
              : null,

          previousFocus: null
        }
      );

      return true;
    }

    function isOpen(id) {
      return (
        activeLayerId ===
        String(id || "")
      );
    }

    function open(id) {
      const entry =
        getLayer(id);

      if (
        !entry ||
        !entry.element
          .isConnected
      ) {
        return false;
      }

      if (
        activeLayerId ===
        entry.id
      ) {
        return true;
      }

      /*
       * 한 번에 하나의 레이어만 표시합니다.
       * 열려 있는 편집창을 다른 모달이
       * 덮어쓰는 상황을 방지합니다.
       */
      if (activeLayerId) {
        dispatchLayerEvent(
          "jym-log:layer-blocked",
          {
            activeId:
              activeLayerId,

            requestedId:
              entry.id
          }
        );

        return false;
      }

      entry.previousFocus =
        document.activeElement instanceof
          HTMLElement
          ? document.activeElement
          : null;

      activeLayerId =
        entry.id;

      lockBodyScroll();

      setLayerVisible(
        entry,
        true
      );

      window
        .requestAnimationFrame(
          () => {
            resolveInitialFocus(
              entry
            )?.focus({
              preventScroll: true
            });
          }
        );

      dispatchLayerEvent(
        "jym-log:layer-open",
        {
          id: entry.id
        }
      );

      return true;
    }

    function close(
      id,
      options = {}
    ) {
      const entry =
        getLayer(id);

      if (
        !entry ||
        activeLayerId !==
          entry.id
      ) {
        return false;
      }

      const focusTarget =
        entry.previousFocus;

      entry.previousFocus =
        null;

      setLayerVisible(
        entry,
        false
      );

      activeLayerId =
        null;

      unlockBodyScroll();

      if (
        options.restoreFocus !==
          false &&
        focusTarget?.isConnected &&
        typeof focusTarget.focus ===
          "function"
      ) {
        window
          .requestAnimationFrame(
            () => {
              focusTarget.focus({
                preventScroll: true
              });
            }
          );
      }

      dispatchLayerEvent(
        "jym-log:layer-close",
        {
          id: entry.id
        }
      );

      return true;
    }

    function requestClose(
      id = activeLayerId,
      reason = "request"
    ) {
      const entry =
        getLayer(id);

      if (
        !entry ||
        activeLayerId !==
          entry.id
      ) {
        return false;
      }

      if (
        entry.canClose() ===
        false
      ) {
        dispatchLayerEvent(
          "jym-log:layer-close-blocked",
          {
            id: entry.id,
            reason
          }
        );

        return false;
      }

      const result =
        entry.onRequestClose
          ?.call(
            null,
            reason
          );

      if (result === false) {
        return false;
      }

      /*
       * 요청 콜백에서 직접 닫지 않은 경우
       * 관리자가 기본 닫기를 수행합니다.
       */
      if (
        activeLayerId ===
        entry.id
      ) {
        close(
          entry.id
        );
      }

      return true;
    }

    function closeTop(
      reason = "request"
    ) {
      if (!activeLayerId) {
        return false;
      }

      return requestClose(
        activeLayerId,
        reason
      );
    }

    function trapFocus(
      event
    ) {
      const entry =
        getLayer(
          activeLayerId
        );

      if (!entry) {
        return;
      }

      const focusable =
        getFocusableElements(
          entry.element
        );

      if (
        focusable.length === 0
      ) {
        event.preventDefault();

        entry.element.focus({
          preventScroll: true
        });

        return;
      }

      const first =
        focusable[0];

      const last =
        focusable[
          focusable.length - 1
        ];

      const activeElement =
        document.activeElement;

      const focusIsOutside =
        !entry.element.contains(
          activeElement
        );

      if (
        event.shiftKey &&
        (
          activeElement === first ||
          focusIsOutside
        )
      ) {
        event.preventDefault();

        last.focus({
          preventScroll: true
        });

        return;
      }

      if (
        !event.shiftKey &&
        (
          activeElement === last ||
          focusIsOutside
        )
      ) {
        event.preventDefault();

        first.focus({
          preventScroll: true
        });
      }
    }

    document.addEventListener(
      "keydown",
      (event) => {
        if (!activeLayerId) {
          return;
        }

        if (
          event.key ===
          "Escape"
        ) {
          /*
           * 저장 중처럼 닫기가 거부돼도
           * 뒤쪽 화면까지 Escape가 전달되면 안 됩니다.
           */
          event.preventDefault();
          event.stopImmediatePropagation();

          requestClose(
            activeLayerId,
            "escape"
          );

          return;
        }

        if (
          event.key === "Tab"
        ) {
          trapFocus(event);
        }
      },
      true
    );

    document.addEventListener(
      "click",
      (event) => {
        if (
          !activeLayerId ||
          !(event.target instanceof
            Element)
        ) {
          return;
        }

        const backdrop =
          event.target.closest(
            "[data-layer-backdrop]"
          );

        if (!backdrop) {
          return;
        }

        const layerElement =
          backdrop.matches(
            "[data-layer]"
          )
            ? backdrop
            : backdrop.closest(
                "[data-layer]"
              );

        if (
          !layerElement ||
          layerElement.dataset
            .layer !==
            activeLayerId
        ) {
          return;
        }

        /*
         * 레이어 루트 자체가 배경인 경우에는
         * 시트 내부 클릭을 닫기로 처리하지 않습니다.
         */
        if (
          backdrop ===
            layerElement &&
          event.target !==
            layerElement
        ) {
          return;
        }

        const entry =
          getLayer(
            activeLayerId
          );

        if (
          !entry
            ?.closeOnBackdrop
        ) {
          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        requestClose(
          activeLayerId,
          "backdrop"
        );
      },
      true
    );

    return Object.freeze({
      register,
      open,
      close,
      requestClose,
      closeTop,
      isOpen,

      get activeLayerId() {
        return activeLayerId;
      }
    });
  })();