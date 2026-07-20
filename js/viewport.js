(function initializeViewportController() {
  "use strict";

  const root =
    document.documentElement;

  const visualViewport =
    window.visualViewport;

  const EDITABLE_SELECTOR = [
    "input:not([type='checkbox']):not([type='radio']):not([type='button']):not([type='submit']):not([type='reset'])",
    "textarea",
    "select",
    "[contenteditable='true']"
  ].join(",");

  /*
   * 주소창 변화와 키보드 표시를 구분하기 위한 값입니다.
   * 일반적인 주소창 변화보다 큰 140px 이상 축소되면서
   * 입력 요소가 활성화된 경우 키보드가 열린 것으로 봅니다.
   */
  const KEYBOARD_THRESHOLD =
    140;

  const FOCUS_SETTLE_DELAY =
    220;

  let baselineHeight =
    Math.max(
      window.innerHeight,
      visualViewport?.height ||
        0
    );

  let frameId = 0;
  let focusTimer = 0;

  function setKeyboardPending(
    pending
  ) {
    root.dataset.keyboardPending =
      pending
      ? "true"
      : "false";
  }

  function isEditable(
    element
  ) {
    return Boolean(
      element instanceof
        HTMLElement &&
      element.matches(
        EDITABLE_SELECTOR
      )
    );
  }

  function prefersReducedMotion() {
    return window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }

  function ensureFocusedElementVisible() {
    const activeElement =
      document.activeElement;

    if (
      root.dataset
        .keyboardOpen !==
        "true" ||
      !isEditable(
        activeElement
      )
    ) {
      return;
    }

    const viewportHeight =
      visualViewport?.height ||
      window.innerHeight;

    const viewportOffsetTop =
      visualViewport?.offsetTop ||
      0;

    const topbarBottom =
      document
        .querySelector(
          ".topbar"
        )
        ?.getBoundingClientRect()
        .bottom ||
      0;

    const topLimit =
      Math.max(
        viewportOffsetTop +
          12,
        topbarBottom
      );

    const bottomLimit =
      viewportOffsetTop +
      viewportHeight -
      20;

    const rect =
      activeElement
        .getBoundingClientRect();

    /*
     * 현재 입력 요소가 키보드 위의
     * 실제 가시 영역 안에 있으면
     * 스크롤하지 않습니다.
     */
    if (
      rect.top >= topLimit &&
      rect.bottom <=
        bottomLimit
    ) {
      return;
    }

    activeElement
      .scrollIntoView({
        block: "center",
        inline: "nearest",

        behavior:
          prefersReducedMotion()
            ? "auto"
            : "smooth"
      });
  }

  function updateViewportState() {
    frameId = 0;

    const viewportHeight =
      visualViewport?.height ||
      window.innerHeight;

    const viewportOffsetTop =
      visualViewport?.offsetTop ||
      0;

    const hasEditableFocus =
      isEditable(
        document.activeElement
      );

    /*
     * 키보드가 닫혀 있을 때 확보된
     * 가장 큰 높이를 기준 높이로 저장합니다.
     */
    if (
      !hasEditableFocus
    ) {
      baselineHeight =
        Math.max(
          baselineHeight,
          window.innerHeight,
          viewportHeight
        );
    }

    const viewportReduction =
      Math.max(
        0,
        baselineHeight -
          viewportHeight -
          viewportOffsetTop
      );

    const keyboardOpen =
      hasEditableFocus &&
      viewportReduction >=
        KEYBOARD_THRESHOLD;

    root.style.setProperty(
      "--visual-viewport-height",
      `${Math.round(
        viewportHeight
      )}px`
    );

    root.dataset.keyboardOpen =
      keyboardOpen
        ? "true"
        : "false";

    if (keyboardOpen) {
    /*
     * 실제 키보드 열림이 확인됐으므로
     * 임시 대기 상태는 종료합니다.
     */
    setKeyboardPending(
        false
    );

    window
        .requestAnimationFrame(
        ensureFocusedElementVisible
        );
    }
  }

  function scheduleViewportUpdate() {
    if (frameId) {
      window
        .cancelAnimationFrame(
          frameId
        );
    }

    frameId =
      window
        .requestAnimationFrame(
          updateViewportState
        );
  }

  function scheduleFocusCheck() {
    window.clearTimeout(
        focusTimer
    );

    /*
    * 키보드가 화면 크기를 변경하기 전에
    * 하단 내비를 먼저 숨깁니다.
    */
    setKeyboardPending(
        true
    );

    /*
    * 키보드 애니메이션이 진행된 뒤
    * 실제 화면 축소량으로 상태를 확정합니다.
    */
    focusTimer =
       window.setTimeout(
      () => {
          setKeyboardPending(
          false
          );

          scheduleViewportUpdate();
      },
      FOCUS_SETTLE_DELAY
    );
  }

  function resetBaseline() {
    baselineHeight =
      Math.max(
        window.innerHeight,
        visualViewport?.height ||
          0
      );

    scheduleViewportUpdate();
  }

  visualViewport
    ?.addEventListener(
      "resize",
      scheduleViewportUpdate
    );

  visualViewport
    ?.addEventListener(
      "scroll",
      scheduleViewportUpdate
    );

  window.addEventListener(
    "resize",
    scheduleViewportUpdate
  );

  window.addEventListener(
    "orientationchange",
    () => {
      window.setTimeout(
        resetBaseline,
        280
      );
    }
  );

  document.addEventListener(
    "focusin",
    (event) => {
      if (
        isEditable(
          event.target
        )
      ) {
        scheduleFocusCheck();
      }
    }
  );

  document.addEventListener(
    "focusout",
    () => {
        window.clearTimeout(
        focusTimer
        );

        /*
        * 입력칸 사이를 이동하는 경우와
        * 키보드를 완전히 닫는 경우를 구분합니다.
        */
        focusTimer =
        window.setTimeout(
            () => {
            if (
                isEditable(
                document.activeElement
                )
            ) {
                scheduleFocusCheck();
                return;
            }

            setKeyboardPending(
                false
            );

            scheduleViewportUpdate();
            },
            120
        );
    }
  );

  setKeyboardPending(
    false
  );

  scheduleViewportUpdate();
})();