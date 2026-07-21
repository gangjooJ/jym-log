const workout =
  window.JYMLog.workout;

const exercises =
  workout.exercises;

const workoutUI =
  window.JYMLog.workoutUI;

const historyUI =
  window.JYMLog.historyUI;

const analysisUI =
  window.JYMLog.analysisUI;

const routineUI =
  window.JYMLog.routineUI;

const layerManager =
  window.JYMLog.layerManager;

function applyAppMetadata() {
  const config =
    window.JYMLog.config;

  document
    .querySelectorAll(
      "[data-app-name]"
    )
    .forEach(
      (element) => {
        element.textContent =
          config.appName;
      }
    );

  document.title =
    config.appName;

  const today = new Date();

  const formattedDate =
    new Intl.DateTimeFormat(
      config.locale,
      {
        timeZone:
          config.timezone,
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long"
      }
    ).format(today);

  const todayLabel =
    document.getElementById(
      "todayLabel"
    );

  if (todayLabel) {
    todayLabel.textContent =
      formattedDate;
  }
}

function toast(message) {
  const toastElement =
    document.getElementById(
      "toast"
    );

  if (!toastElement) {
    return;
  }

  toastElement.textContent =
    message;

  toastElement.classList.add(
    "show"
  );

  window.setTimeout(
    () => {
      toastElement.classList.remove(
        "show"
      );
    },
    1900
  );
}

const NAVIGATION_STATE_MARKER =
  "jym-log-navigation";

const ROOT_SCREEN =
  "home";

const VALID_SCREENS =
  new Set([
    "home",
    "workout",
    "summary",
    "history",
    "session-detail",
    "analysis",
    "routine",
    "settings"
  ]);

const SCREEN_LABELS = {
  home: "오늘의 운동",
  workout: "운동 진행",
  summary: "운동 완료",
  history: "운동 기록",
  "session-detail":
    "운동 기록 상세",
  analysis: "진행 분석",
  routine: "루틴 관리",
  settings: "설정"
};

let currentScreen =
  document
    .querySelector(
      ".screen.active"
    )
    ?.id
    ?.replace(
      "screen-",
      ""
    ) ||
  ROOT_SCREEN;

let currentNavigationDepth = 0;

let allowNextWorkoutPop = false;

let pendingLeaveAction = null;

let swipeBackState = null;

/*
 * 화면별 마지막 스크롤 위치를
 * 현재 앱 실행 중에 보관합니다.
 */
const screenScrollPositions =
  new Map();

function normalizeScrollPosition(
  value
) {
  const numericValue =
    Number(value);

  return Number.isFinite(
    numericValue
  )
    ? Math.max(
        0,
        numericValue
      )
    : 0;
}

function readCurrentScrollPosition() {
  return normalizeScrollPosition(
    window.scrollY ??
      document
        .documentElement
        .scrollTop ??
      0
  );
}

function rememberScreenScrollPosition(
  name = currentScreen
) {
  const normalizedName =
    normalizeScreenName(name);

  screenScrollPositions.set(
    normalizedName,
    readCurrentScrollPosition()
  );
}

function getScreenScrollPosition(
  name
) {
  const normalizedName =
    normalizeScreenName(name);

  return normalizeScrollPosition(
    screenScrollPositions.get(
      normalizedName
    ) ?? 0
  );
}

function setScreenScrollPosition(
  name,
  position
) {
  const normalizedName =
    normalizeScreenName(name);

  screenScrollPositions.set(
    normalizedName,
    normalizeScrollPosition(
      position
    )
  );
}

function scrollWindowTo(
  position,
  behavior = "auto"
) {
  window.scrollTo({
    top:
      normalizeScrollPosition(
        position
      ),
    left: 0,
    behavior
  });
}

/*
 * 기록이나 분석 화면처럼
 * 비동기 데이터가 다시 그려지는 화면은
 * 로딩이 끝난 뒤 스크롤 위치를 한 번 더 맞춥니다.
 */
function restoreScrollAfterLoad(
  screenName,
  position,
  loadTask
) {
  if (
    !loadTask ||
    typeof loadTask.then !==
      "function"
  ) {
    return;
  }

  const normalizedName =
    normalizeScreenName(
      screenName
    );

  const targetPosition =
    normalizeScrollPosition(
      position
    );

  const restore = () => {
    if (
      currentScreen !==
        normalizedName
    ) {
      return;
    }

    window.requestAnimationFrame(
      () => {
        if (
          currentScreen !==
            normalizedName
        ) {
          return;
        }

        scrollWindowTo(
          targetPosition
        );
      }
    );
  };

  void Promise
    .resolve(loadTask)
    .then(
      restore,
      restore
    );
}

function normalizeScreenName(
  name
) {
  const normalizedName =
    String(name || "")
      .trim();

  return VALID_SCREENS.has(
    normalizedName
  )
    ? normalizedName
    : ROOT_SCREEN;
}

function getScreenFromHash() {
  return normalizeScreenName(
    window.location.hash
      .replace(/^#/, "")
  );
}

function getScreenUrl(name) {
  const url =
    new URL(
      window.location.href
    );

  url.hash =
    normalizeScreenName(name);

  return (
    url.pathname +
    url.search +
    url.hash
  );
}

function createNavigationState(
  screen,
  depth
) {
  return {
    marker:
      NAVIGATION_STATE_MARKER,

    screen:
      normalizeScreenName(
        screen
      ),

    depth:
      Math.max(
        0,
        Number(depth) || 0
      ),

    updatedAt:
      Date.now()
  };
}

function prefersReducedMotion() {
  return window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
}

function isWorkoutInProgress() {
  const state =
    workout?.state;

  return Boolean(
    state?.started &&
    !state?.completed
  );
}

function shouldProtectWorkoutExit(
  targetScreen
) {
  return Boolean(
    currentScreen ===
      "workout" &&
    targetScreen !==
      "workout" &&
    targetScreen !==
      "summary" &&
    isWorkoutInProgress()
  );
}

function updateBackButton() {
  const navBackBtn =
    document.getElementById(
      "navBackBtn"
    );

  navBackBtn?.classList.toggle(
    "hidden",
    currentScreen ===
      ROOT_SCREEN
  );
}

function updateScreenChrome(
  name
) {
  document
    .querySelectorAll(
      ".nav-btn"
    )
    .forEach(
      (button) => {
        button.classList.toggle(
          "active",
          button.dataset.nav ===
            name
        );
      }
    );

  const shouldHideBottomNav =
    [
      "workout",
      "summary",
      "session-detail"
    ].includes(name);

  document
    .getElementById(
      "bottomNav"
    )
    ?.classList.toggle(
      "hidden",
      shouldHideBottomNav
    );

  const headerSub =
    document.getElementById(
      "headerSub"
    );

  if (headerSub) {
    headerSub.textContent =
      SCREEN_LABELS[name] ||
      window.JYMLog
        .config.appName;
  }

  updateBackButton();
}

function cleanupScreenMotion(
  screen
) {
  if (!screen) {
    return;
  }

  screen.classList.remove(
    "screen-enter-forward",
    "screen-enter-back",
    "screen-enter-tab",
    "is-swipe-back",
    "is-swipe-canceling"
  );

  screen.style.removeProperty(
    "--swipe-back-x"
  );
}

function commitScreenChange(
  targetScreen,
  direction,
  shouldAnimate,
  targetScrollTop = 0
) {
  /*
   * 기존 활성 화면을 먼저 숨기고
   * 전환용 클래스를 모두 정리합니다.
   */
  document
    .querySelectorAll(
      ".screen"
    )
    .forEach(
      (screen) => {
        screen.classList.remove(
          "active"
        );

        cleanupScreenMotion(
          screen
        );
      }
    );

  delete document
    .documentElement
    .dataset
    .navDirection;

  /*
   * 대상 화면을 먼저 표시해야
   * 브라우저가 그 화면의 실제 높이를
   * 기준으로 스크롤할 수 있습니다.
   */
  targetScreen.classList.add(
    "active"
  );

  scrollWindowTo(
    targetScrollTop
  );

  /*
   * display:none에서 block으로 변경된 직후
   * 레이아웃 계산이 늦게 반영되는 브라우저를 위해
   * 다음 프레임에 한 번 더 위치를 맞춥니다.
   */
  window.requestAnimationFrame(
    () => {
      if (
        targetScreen.classList
          .contains("active")
      ) {
        scrollWindowTo(
          targetScrollTop
        );
      }
    }
  );

  if (
    !shouldAnimate ||
    direction === "none"
  ) {
    return;
  }

  const motionClass =
    direction === "tab"
      ? "screen-enter-tab"
      : direction === "back"
        ? "screen-enter-back"
        : "screen-enter-forward";

  targetScreen.classList.add(
    motionClass
  );

  window.setTimeout(
    () => {
      cleanupScreenMotion(
        targetScreen
      );
    },
    320
  );
}

function renderScreen(
  name,
  options = {}
) {
  const normalizedName =
    normalizeScreenName(name);

  const targetScreen =
    document.getElementById(
      `screen-${normalizedName}`
    );

  if (!targetScreen) {
    console.warn(
      `[JYM Log] 화면을 찾을 수 없습니다: ${normalizedName}`
    );

    return false;
  }

  const previousScreen =
    currentScreen;

  const direction =
    options.direction ||
    (
      previousScreen ===
        normalizedName
        ? "none"
        : "forward"
    );

  /*
   * scrollMode
   *
   * top:
   * 새 화면을 맨 위에서 시작
   *
   * restore:
   * 이전에 저장한 위치로 복귀
   */
  const scrollMode =
    options.scrollMode ===
      "restore"
      ? "restore"
      : "top";

  /*
   * 현재 화면을 떠나기 전에
   * 마지막 위치를 저장합니다.
   */
  if (
    previousScreen !==
      normalizedName
  ) {
    rememberScreenScrollPosition(
      previousScreen
    );
  }

  const targetScrollTop =
    scrollMode === "restore"
      ? getScreenScrollPosition(
          normalizedName
        )
      : 0;

  if (
    scrollMode === "top"
  ) {
    setScreenScrollPosition(
      normalizedName,
      0
    );
  }

  const shouldAnimate =
    options.animate !== false &&
    direction !== "none" &&
    !prefersReducedMotion();

  commitScreenChange(
    targetScreen,
    direction,
    shouldAnimate,
    targetScrollTop
  );

  currentScreen =
    normalizedName;

  updateScreenChrome(
    normalizedName
  );

  let contentLoadTask = null;

  if (
    normalizedName ===
      "history"
  ) {
    contentLoadTask =
      historyUI?.load({
        /*
         * 뒤로 돌아온 경우에는
         * 기존 기록 목록을 유지하면서
         * 데이터를 갱신합니다.
         */
        preserveContent:
          scrollMode ===
            "restore"
      });
  }

  if (
    normalizedName ===
      "analysis"
  ) {
    contentLoadTask =
      analysisUI?.load();
  }

  /*
   * 비동기 로딩으로 화면 높이가 바뀌는 경우
   * 데이터 렌더링 후 저장 위치를 다시 적용합니다.
   */
  if (
    scrollMode === "restore"
  ) {
    restoreScrollAfterLoad(
      normalizedName,
      targetScrollTop,
      contentLoadTask
    );
  }

  return true;
}

function closeLeaveWorkoutModal() {
  const modal =
    document.getElementById(
      "leaveWorkoutModal"
    );

  if (!modal) {
    return false;
  }

  pendingLeaveAction =
    null;

  if (
    layerManager?.isOpen(
      "leave-workout"
    )
  ) {
    return layerManager.close(
      "leave-workout"
    );
  }

  /*
   * 레이어 관리자를 불러오지 못한 경우의
   * 최소 안전 처리입니다.
   */
  modal.classList.remove(
    "show"
  );

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  return true;
}

function openLeaveWorkoutModal(
  onConfirm
) {
  const modal =
    document.getElementById(
      "leaveWorkoutModal"
    );

  if (!modal) {
    if (
      typeof onConfirm ===
        "function"
    ) {
      onConfirm();
    }

    return false;
  }

  pendingLeaveAction =
    typeof onConfirm ===
      "function"
      ? onConfirm
      : null;

  if (layerManager) {
    const opened =
      layerManager.open(
        "leave-workout"
      );

    if (!opened) {
      pendingLeaveAction =
        null;
    }

    return opened;
  }

  modal.classList.add(
    "show"
  );

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  document
    .getElementById(
      "stayWorkoutBtn"
    )
    ?.focus();

  return true;
}

function closeTopLayer() {
  return Boolean(
    layerManager?.closeTop(
      "navigation"
    )
  );
}

function restoreCurrentHistoryEntry() {
  window.history.pushState(
    createNavigationState(
      currentScreen,
      currentNavigationDepth
    ),
    "",
    getScreenUrl(
      currentScreen
    )
  );
}

function navigate(
  name,
  options = {}
) {
  const normalizedName =
    normalizeScreenName(name);

  const targetScreen =
    document.getElementById(
      `screen-${normalizedName}`
    );

  if (!targetScreen) {
    console.warn(
      `[JYM Log] 화면을 찾을 수 없습니다: ${normalizedName}`
    );

    return false;
  }

  if (
    shouldProtectWorkoutExit(
      normalizedName
    ) &&
    options.force !== true
  ) {
    openLeaveWorkoutModal(
      () => {
        navigate(
          normalizedName,
          {
            ...options,
            force: true
          }
        );
      }
    );

    return false;
  }

  if (
    normalizedName ===
      currentScreen
  ) {
    updateScreenChrome(
      normalizedName
    );

    setScreenScrollPosition(
      normalizedName,
      0
    );

    scrollWindowTo(
      0,
      "smooth"
    );

    return true;
  }

  let historyMode =
    options.historyMode ||
    "push";

  /*
   * 운동 완료 화면은 운동 화면을
   * 대체합니다.
   *
   * 뒤로가기를 눌렀을 때 완료된
   * 운동 입력 화면으로 돌아가는
   * 현상을 방지합니다.
   */
  if (
    currentScreen ===
      "workout" &&
    normalizedName ===
      "summary" &&
    !options.historyMode
  ) {
    historyMode =
      "replace";
  }

  const direction =
    options.direction ||
    "forward";

  if (
    historyMode === "push"
  ) {
    currentNavigationDepth +=
      1;

    window.history.pushState(
      createNavigationState(
        normalizedName,
        currentNavigationDepth
      ),
      "",
      getScreenUrl(
        normalizedName
      )
    );
  } else if (
    historyMode === "replace"
  ) {
    window.history.replaceState(
      createNavigationState(
        normalizedName,
        currentNavigationDepth
      ),
      "",
      getScreenUrl(
        normalizedName
      )
    );
  }

  return renderScreen(
    normalizedName,
    {
      direction,

      animate:
        options.animate,

      scrollMode:
        options.scrollMode
    }
  );
}

function requestBack(
  options = {}
) {
  if (
    closeTopLayer()
  ) {
    return;
  }

  if (
    currentScreen ===
      "workout" &&
    isWorkoutInProgress() &&
    options.force !== true
  ) {
    openLeaveWorkoutModal(
      () => {
        allowNextWorkoutPop =
          true;

        requestBack({
          force: true
        });
      }
    );

    return;
  }

  if (
    currentNavigationDepth > 0
  ) {
    window.history.back();
    return;
  }

  if (
    currentScreen !==
      ROOT_SCREEN
  ) {
    navigate(
      ROOT_SCREEN,
      {
        historyMode:
          "replace",
        direction:
          "back",
        scrollMode:
          "restore",
        force: true
      }
    );
  }
}

function initializeNavigation() {
    /*
    * 브라우저와 앱이 동시에 스크롤을
    * 복원하면 위치가 두 번 바뀔 수 있으므로
    * 앱에서 직접 관리합니다.
    */
    if (
      "scrollRestoration" in
        window.history
    ) {
      window.history
        .scrollRestoration =
          "manual";
    }

  const existingState =
    window.history.state;

  const stateIsValid =
    existingState
      ?.marker ===
        NAVIGATION_STATE_MARKER &&
    VALID_SCREENS.has(
      existingState.screen
    );

  const initialScreen =
    stateIsValid
      ? existingState.screen
      : getScreenFromHash();

  currentNavigationDepth =
    stateIsValid
      ? Math.max(
          0,
          Number(
            existingState.depth
          ) || 0
        )
      : 0;

  window.history.replaceState(
    createNavigationState(
      initialScreen,
      currentNavigationDepth
    ),
    "",
    getScreenUrl(
      initialScreen
    )
  );

  renderScreen(
    initialScreen,
    {
      direction: "none",
      animate: false
    }
  );
}

function renderHome() {
  const homeExerciseList =
    document.getElementById(
      "homeExerciseList"
    );

  if (!homeExerciseList) {
    return;
  }

  homeExerciseList.innerHTML =
    exercises
      .map(
        (exercise) => `
          <div class="exercise-row">
            <div class="exercise-icon">
              ${exercise.icon}
            </div>

            <div>
              <strong>
                ${exercise.name}
              </strong>

              <p>
                ${exercise.type} · 휴식 ${
                  Math.round(
                    exercise.rest /
                      60 *
                      10
                  ) / 10
                }분
              </p>
            </div>

            <div class="exercise-target">
              <strong>
                ${exercise.weight}kg
              </strong>

              <span>
                ${exercise.sets} × ${
                  exercise.min ===
                    exercise.max
                    ? exercise.min
                    : `${exercise.min}–${exercise.max}`
                }
              </span>
            </div>
          </div>
        `
      )
      .join("");
}

document.addEventListener(
  "click",
  (event) => {
    const navButton =
      event.target.closest(
        "[data-nav]"
      );

    if (navButton) {
      event.preventDefault();

      const targetScreen =
        normalizeScreenName(
          navButton.dataset.nav
        );

      /*
      * 완료 화면의 ‘오늘 화면으로’는
      * 새 홈 화면을 쌓지 않고
      * 기존 홈으로 돌아갑니다.
      */
      if (
        currentScreen ===
          "summary" &&
        targetScreen ===
          "home"
      ) {
        requestBack();
        return;
      }

      navigate(
        targetScreen,
        {
          direction: "tab",
          scrollMode: "top"
        }
      );

      return;
    }

    const switchElement =
      event.target.closest(
        ".switch"
      );

    if (switchElement) {
      switchElement.classList.toggle(
        "on"
      );
    }
  }
);

const installInfoBtn =
  document.getElementById(
    "installInfoBtn"
  );

installInfoBtn?.addEventListener(
  "click",
  () => {
    toast(
      "HTTPS 또는 localhost에서 열면 브라우저의 ‘홈 화면에 추가’를 사용할 수 있습니다."
    );
  }
);

const resetBtn =
  document.getElementById(
    "resetBtn"
  );

resetBtn?.addEventListener(
  "click",
  () => {
    if (
      window.confirm(
        "프로토타입 기록을 초기화할까요?"
      )
    ) {
      workout.resetWorkout();
      location.reload();
    }
  }
);

const navBackBtn =
  document.getElementById(
    "navBackBtn"
  );

const stayWorkoutBtn =
  document.getElementById(
    "stayWorkoutBtn"
  );

const leaveWorkoutBtn =
  document.getElementById(
    "leaveWorkoutBtn"
  );

const leaveWorkoutModal =
  document.getElementById(
    "leaveWorkoutModal"
  );

layerManager?.register({
  id: "leave-workout",

  element:
    leaveWorkoutModal,

  showClass:
    "show",

  initialFocus:
    "#stayWorkoutBtn",

  closeOnBackdrop:
    true,

  canClose:
    () => true,

  onRequestClose:
    () => {
      closeLeaveWorkoutModal();
    }
});

const sessionDetailBackBtn =
  document.getElementById(
    "sessionDetailBackBtn"
  );

navBackBtn?.addEventListener(
  "click",
  () => {
    requestBack();
  }
);

stayWorkoutBtn?.addEventListener(
  "click",
  () => {
    closeLeaveWorkoutModal();
  }
);

leaveWorkoutBtn?.addEventListener(
  "click",
  () => {
    const action =
      pendingLeaveAction;

    /*
     * close 함수에서 pending action이
     * 초기화되므로 먼저 보관합니다.
     */
    closeLeaveWorkoutModal();

    if (
      typeof action ===
        "function"
    ) {
      action();
    }
  }
);

/*
 * history-ui.js에 기존 클릭 이벤트가
 * 있어도 캡처 단계에서 먼저 처리합니다.
 */
sessionDetailBackBtn
  ?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      requestBack();
    },
    true
  );

window.addEventListener(
  "popstate",
  (event) => {
    const targetState =
      event.state;

    const targetScreen =
      targetState
        ?.marker ===
          NAVIGATION_STATE_MARKER
        ? normalizeScreenName(
            targetState.screen
          )
        : getScreenFromHash();

    const targetDepth =
      targetState
        ?.marker ===
          NAVIGATION_STATE_MARKER
        ? Math.max(
            0,
            Number(
              targetState.depth
            ) || 0
          )
        : Math.max(
            0,
            currentNavigationDepth -
              1
          );

    /*
     * 모달이 열려 있으면 화면 이동 대신
     * 모달만 닫고 소비된 기록을 복원합니다.
     */
    if (
      closeTopLayer()
    ) {
      restoreCurrentHistoryEntry();
      return;
    }

    if (
      currentScreen ===
        "workout" &&
      isWorkoutInProgress() &&
      targetScreen !==
        "workout" &&
      !allowNextWorkoutPop
    ) {
      restoreCurrentHistoryEntry();

      openLeaveWorkoutModal(
        () => {
          allowNextWorkoutPop =
            true;

          window.history.back();
        }
      );

      return;
    }

    allowNextWorkoutPop =
      false;

    const direction =
      targetDepth <
        currentNavigationDepth
        ? "back"
        : "forward";

    currentNavigationDepth =
      targetDepth;

    renderScreen(
      targetScreen,
      {
        direction,
        animate: true,
        scrollMode: "restore"
      }
    );
  }
);

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key !==
        "Escape" ||
      event.defaultPrevented
    ) {
      return;
    }

    /*
     * 레이어가 열려 있으면
     * layer-manager가 먼저 Escape를 처리합니다.
     */
    if (
      currentScreen !==
      ROOT_SCREEN
    ) {
      event.preventDefault();

      requestBack();
    }
  },
  true
);

function isIosDevice() {
  return (
    /iPad|iPhone|iPod/
      .test(
        navigator.userAgent
      ) ||
    (
      navigator.platform ===
        "MacIntel" &&
      navigator.maxTouchPoints >
        1
    )
  );
}

function isStandaloneMode() {
  return Boolean(
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches ||
    window.navigator
      .standalone === true
  );
}

function hasOpenModal() {
  return Boolean(
    layerManager
      ?.activeLayerId
  );
}

function getActiveScreenElement() {
  return document.querySelector(
    ".screen.active"
  );
}

function clearSwipeBackPreview(
  animateBack = false
) {
  const activeScreen =
    getActiveScreenElement();

  if (!activeScreen) {
    swipeBackState = null;
    return;
  }

  if (animateBack) {
    activeScreen.classList.add(
      "is-swipe-canceling"
    );

    activeScreen.style
      .setProperty(
        "--swipe-back-x",
        "0px"
      );

    window.setTimeout(
      () => {
        cleanupScreenMotion(
          activeScreen
        );
      },
      220
    );
  } else {
    cleanupScreenMotion(
      activeScreen
    );
  }

  swipeBackState = null;
}

function initializeEdgeSwipeBack() {
  /*
   * Android의 시스템 제스처와
   * 시스템 버튼은 History API가 처리합니다.
   *
   * 사용자 정의 제스처는 iOS의
   * 홈 화면 PWA에서만 폴백으로 제공합니다.
   */
  if (
    !isIosDevice() ||
    !isStandaloneMode()
  ) {
    return;
  }

  document.addEventListener(
    "touchstart",
    (event) => {
      if (
        event.touches.length !==
          1 ||
        currentScreen ===
          ROOT_SCREEN ||
        hasOpenModal()
      ) {
        return;
      }

      const touch =
        event.touches[0];

      if (
        touch.clientX > 28
      ) {
        return;
      }

      if (
        event.target.closest(
          [
            "input",
            "select",
            "textarea",
            ".routine-drag-handle",
            "[data-drag-exercise-index]",
            ".calendar-row"
          ].join(",")
        )
      ) {
        return;
      }

      swipeBackState = {
        startX:
          touch.clientX,
        startY:
          touch.clientY,
        currentX:
          touch.clientX,
        currentY:
          touch.clientY,
        horizontal:
          false
      };
    },
    {
      passive: true
    }
  );

  document.addEventListener(
    "touchmove",
    (event) => {
      if (
        !swipeBackState ||
        event.touches.length !==
          1
      ) {
        return;
      }

      const touch =
        event.touches[0];

      const deltaX =
        touch.clientX -
        swipeBackState.startX;

      const deltaY =
        touch.clientY -
        swipeBackState.startY;

      swipeBackState.currentX =
        touch.clientX;

      swipeBackState.currentY =
        touch.clientY;

      if (
        deltaX < 0
      ) {
        clearSwipeBackPreview(
          true
        );

        return;
      }

      if (
        !swipeBackState
          .horizontal &&
        Math.abs(deltaY) >
          Math.abs(deltaX) &&
        Math.abs(deltaY) > 10
      ) {
        clearSwipeBackPreview(
          true
        );

        return;
      }

      if (
        deltaX > 8 &&
        Math.abs(deltaX) >
          Math.abs(deltaY)
      ) {
        swipeBackState
          .horizontal = true;

        event.preventDefault();

        const activeScreen =
          getActiveScreenElement();

        if (activeScreen) {
          activeScreen.classList.add(
            "is-swipe-back"
          );

          activeScreen.style
            .setProperty(
              "--swipe-back-x",
              `${Math.min(
                deltaX,
                150
              )}px`
            );
        }
      }
    },
    {
      passive: false
    }
  );

  document.addEventListener(
    "touchend",
    () => {
      if (!swipeBackState) {
        return;
      }

      const deltaX =
        swipeBackState.currentX -
        swipeBackState.startX;

      const deltaY =
        swipeBackState.currentY -
        swipeBackState.startY;

      const shouldGoBack =
        swipeBackState
          .horizontal &&
        deltaX >= 72 &&
        Math.abs(deltaX) >
          Math.abs(deltaY) *
            1.25;

      clearSwipeBackPreview(
        !shouldGoBack
      );

      if (shouldGoBack) {
        requestBack();
      }
    },
    {
      passive: true
    }
  );

  document.addEventListener(
    "touchcancel",
    () => {
      clearSwipeBackPreview(
        true
      );
    },
    {
      passive: true
    }
  );
}

window.addEventListener(
  "jym-log:user-state-ready",
  () => {
    routineUI?.refresh();
    renderHome();

    historyUI?.reset();
    analysisUI?.reset();
    workoutUI?.handleUserStateReady();

    console.info(
      "[JYM Log] 로그인 사용자 운동 기록 준비 완료"
    );
  }
);

if (workoutUI) {
  workoutUI.initialize({
    navigate,
    toast
  });
} else {
  console.warn(
    "[JYM Log] 운동 진행 UI 모듈을 찾을 수 없습니다."
  );
}

if (routineUI) {
  routineUI.initialize({
    toast,

    onRoutineChanged() {
      renderHome();
    }
  });
} else {
  console.warn(
    "[JYM Log] 루틴 UI 모듈을 찾을 수 없습니다."
  );
}

if (analysisUI) {
  analysisUI.initialize();
} else {
  console.warn(
    "[JYM Log] 운동 분석 UI 모듈을 찾을 수 없습니다."
  );
}

if (historyUI) {
  historyUI.initialize({
    navigate
  });
} else {
  console.warn(
    "[JYM Log] 운동 기록 UI 모듈을 찾을 수 없습니다."
  );
}

const syncConflictUI =
  window.JYMLog.syncConflictUI;

if (syncConflictUI) {
  syncConflictUI.initialize({
    toast,

    onResolved() {
      renderHome();
      workoutUI?.refreshAfterSync();
    }
  });
} else {
  console.warn(
    "[JYM Log] 동기화 충돌 UI 모듈을 찾을 수 없습니다."
  );
}

applyAppMetadata();
initializeNavigation();
initializeEdgeSwipeBack();
renderHome();

const settingsAppName =
  document.getElementById(
    "settingsAppName"
  );

const settingsVersion =
  document.getElementById(
    "settingsVersion"
  );

const settingsUpdated =
  document.getElementById(
    "settingsUpdated"
  );

if (settingsAppName) {
  settingsAppName.textContent =
    window.JYMLog.config.appName;
}

if (settingsVersion) {
  settingsVersion.textContent =
    window.JYMLog.config.version;
}

if (settingsUpdated) {
  settingsUpdated.textContent =
    window.JYMLog.config.updatedAt;
}

window.JYMLog.navigation =
  Object.freeze({
    navigate,
    requestBack,

    get currentScreen() {
      return currentScreen;
    },

    get depth() {
      return currentNavigationDepth;
    }
  });

