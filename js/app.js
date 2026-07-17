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

function navigate(name) {
  const targetScreen =
    document.getElementById(
      `screen-${name}`
    );

  if (!targetScreen) {
    console.warn(
      `[JYM Log] 화면을 찾을 수 없습니다: ${name}`
    );
    return;
  }

  document
    .querySelectorAll(".screen")
    .forEach(
      (screen) => {
        screen.classList.remove(
          "active"
        );
      }
    );

  targetScreen.classList.add(
    "active"
  );

  document
    .querySelectorAll(".nav-btn")
    .forEach(
      (button) => {
        button.classList.toggle(
          "active",
          button.dataset.nav === name
        );
      }
    );

  const shouldHideBottomNav = [
    "workout",
    "summary",
    "session-detail"
  ].includes(name);

  document
    .getElementById("bottomNav")
    ?.classList.toggle(
      "hidden",
      shouldHideBottomNav
    );

  const labels = {
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

  const headerSub =
    document.getElementById(
      "headerSub"
    );

  if (headerSub) {
    headerSub.textContent =
      labels[name] ||
      window.JYMLog.config.appName;
  }

  if (name === "history") {
    void historyUI?.load();
  }

  if (name === "analysis") {
    void analysisUI?.load();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
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
      navigate(
        navButton.dataset.nav
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

if (
  "serviceWorker" in navigator
) {
  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker
        .register("./sw.js")
        .catch(
          (error) => {
            console.warn(
              "서비스 워커 등록에 실패했습니다.",
              error
            );
          }
        );
    }
  );
}
