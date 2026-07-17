const workout = window.JYMLog.workout;
const exercises = workout.exercises;
let state = workout.state;

const historyUI =
  window.JYMLog.historyUI;

const analysisUI =
  window.JYMLog.analysisUI;

const routineUI =
  window.JYMLog.routineUI;

const finishWorkoutBtn =
  document.getElementById(
    "finishWorkoutBtn"
  );

const fatigueModal =
  document.getElementById(
    "fatigueModal"
  );

const confirmFinishBtn =
  document.getElementById(
    "confirmFinishBtn"
  );

let workoutFinishInProgress =
  false;

function applyAppMetadata() {
  const config = window.JYMLog.config;

  document.querySelectorAll("[data-app-name]").forEach((element) => {
    element.textContent = config.appName;
  });

  document.title = config.appName;

  const today = new Date();

  const formattedDate = new Intl.DateTimeFormat(config.locale, {
    timeZone: config.timezone,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(today);

  document.getElementById("todayLabel").textContent =
    formattedDate;
}

function toast(msg) {
    const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 1900);
}

function navigate(name) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(`screen-${name}`).classList.add("active");
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.nav === name));
    const shouldHideBottomNav = [
      "workout",
      "summary",
      "session-detail"
    ].includes(name);

    document
      .getElementById("bottomNav")
      .classList.toggle(
        "hidden",
        shouldHideBottomNav
      );

    const labels = {
      home: "오늘의 운동",
      workout: "운동 진행",
      summary: "운동 완료",
      history: "운동 기록",
      "session-detail": "운동 기록 상세",
      analysis: "진행 분석",
      routine: "루틴 관리",
      settings: "설정"
    };

    document.getElementById("headerSub").textContent =
        labels[name] || window.JYMLog.config.appName;

        if (name === "history") {
          void historyUI?.load();
        }

        if (name === "analysis") {
          void analysisUI?.load();
        }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderHome() {
    document.getElementById("homeExerciseList").innerHTML = exercises.map((e, i) => `
    <div class="exercise-row">
      <div class="exercise-icon">${e.icon}</div>
      <div><strong>${e.name}</strong><p>${e.type} · 휴식 ${Math.round(e.rest / 60 * 10) / 10}분</p></div>
      <div class="exercise-target"><strong>${e.weight}kg</strong><span>${e.sets} × ${e.min === e.max ? e.min : `${e.min}–${e.max}`}</span></div>
    </div>`).join("");
}

function renderWorkout() {
    const exerciseIndex = state.activeExercise;
    const exercise = exercises[exerciseIndex];

    document.getElementById("workoutStep").textContent =
        `운동 ${exerciseIndex + 1} / ${exercises.length}`;

    document.getElementById("workoutTitle").textContent =
        exercise.name;

    document.getElementById("workoutProgress").style.width =
        `${((exerciseIndex + 1) / exercises.length) * 100}%`;

    document.getElementById("targetText").textContent =
        `${exercise.weight}kg · ${exercise.sets} × ${
            exercise.min === exercise.max
                ? exercise.min
                : `${exercise.min}–${exercise.max}`
        }`;

    document.getElementById("incrementText").textContent =
        `${exercise.increment}kg`;

    document.getElementById("previousText").textContent =
        exercise.previous;

    document.getElementById("prevExerciseBtn").disabled =
        exerciseIndex === 0;

    document.getElementById("nextExerciseBtn").textContent =
        exerciseIndex === exercises.length - 1
            ? "처음으로"
            : "다음 운동";

    const list = [];

    for (let setIndex = 0; setIndex < exercise.sets; setIndex += 1) {
        const set = workout.getSet(exerciseIndex, setIndex);

        list.push(`
            <div
                class="set-row ${set.done ? "done" : ""}"
                data-set="${setIndex}"
            >
                <div class="set-number">${setIndex + 1}</div>

                <div class="stepper">
                    <button
                        data-action="weight-down"
                        data-set="${setIndex}"
                    >
                        −
                    </button>

                    <input
                        inputmode="decimal"
                        value="${set.weight}"
                        data-field="weight"
                        data-set="${setIndex}"
                        aria-label="중량"
                    >

                    <button
                        data-action="weight-up"
                        data-set="${setIndex}"
                    >
                        ＋
                    </button>
                </div>

                <div class="stepper">
                    <button
                        data-action="reps-down"
                        data-set="${setIndex}"
                    >
                        −
                    </button>

                    <input
                        inputmode="numeric"
                        value="${set.reps}"
                        data-field="reps"
                        data-set="${setIndex}"
                        aria-label="반복"
                    >

                    <button
                        data-action="reps-up"
                        data-set="${setIndex}"
                    >
                        ＋
                    </button>
                </div>

                <button
                    class="set-done-btn"
                    data-action="done"
                    data-set="${setIndex}"
                >
                    ${set.done ? "✓" : "완료"}
                </button>
            </div>
        `);
    }

    document.getElementById("setList").innerHTML =
        list.join("");
}
function startRest(seconds) {
    const timerCard = document.getElementById("timerCard");

    timerCard.classList.remove("hidden");

    workout.startRestTimer(
        seconds,

        (remainingSeconds) => {
            document.getElementById("timerTime").textContent =
                workout.formatTime(remainingSeconds);
        },

        () => {
            toast("휴식 시간이 끝났습니다.");
        }
    );
}
function startElapsed() {
    workout.startElapsedTimer((elapsedSeconds) => {
        document.getElementById("elapsed").textContent =
            workout.formatTime(elapsedSeconds);
    });
}

function startWorkout() {
  workout.beginWorkout();
  state = workout.state;

  setWorkoutFinishBusy(false);

  renderWorkout();
  startElapsed();
  navigate("workout");
}

function allDoneCount() {
    return workout.getCompletedSetCount();
}
function totalVolume() {
    return workout.getTotalVolume();
}
function renderSummary() {
    const endAt =
        state.completedAt ||
        Date.now();

        const sec = state.startedAt
        ? Math.max(
            60,
            Math.floor(
                (
                endAt -
                state.startedAt
                ) / 1000
            )
            )
        : 0;
    document.getElementById("summaryDuration").textContent = `${Math.round(sec / 60)}분`;
    document.getElementById("summarySets").textContent = allDoneCount();
    document.getElementById("summaryVolume").textContent = `${totalVolume().toLocaleString()}kg`;
    const benchSuccess =
  workout.isBenchPressSuccess();
    if (benchSuccess) {
        document.getElementById("recommendText").textContent = "80kg · 5 × 5 한 번 더";
        document.getElementById("recommendReason1").textContent = "80kg 5×5를 첫 번째로 완수했습니다. 2회 연속 성공 시 증량합니다.";
    } else {
        document.getElementById("recommendText").textContent = "80kg · 5 × 5 유지";
        document.getElementById("recommendReason1").textContent = "아직 모든 목표 세트를 달성하지 않아 동일 중량 재도전을 추천합니다.";
    }
}

function setWorkoutFinishBusy(
  isBusy
) {
  workoutFinishInProgress =
    isBusy;

  if (confirmFinishBtn) {
    confirmFinishBtn.disabled =
      isBusy;

    confirmFinishBtn.textContent =
      isBusy
        ? "기록 저장 중..."
        : "기록 저장하고 완료";

    confirmFinishBtn.setAttribute(
      "aria-busy",
      String(isBusy)
    );
  }

  if (finishWorkoutBtn) {
    finishWorkoutBtn.disabled =
      isBusy;
  }
}

async function confirmWorkoutFinish() {
  if (workoutFinishInProgress) {
    return;
  }

  setWorkoutFinishBusy(true);

  if (fatigueModal) {
    fatigueModal.classList.remove(
      "show"
    );
  }

  try {
    /*
     * 완료 처리는 최초 한 번만 실행합니다.
     */
    if (!state.completed) {
      workout.finishWorkout();
      workout.stopRestTimer();
      workout.stopElapsedTimer();

      state = workout.state;
    }

    renderSummary();
    navigate("summary");

    const sessionsApi =
      window.JYMLog.sessions;

    if (
      !sessionsApi
        ?.saveCompletedWorkoutSession
    ) {
      throw new Error(
        "완료 운동 저장 기능을 불러오지 못했습니다."
      );
    }

    await sessionsApi
      .saveCompletedWorkoutSession(
        state
      );

    toast(
      "완료한 운동 기록이 저장되었습니다."
    );
  } catch (error) {
    console.error(
      "[JYM Log] 완료 운동 세션 저장 실패",
      error
    );

    toast(
      "현재 운동은 저장됐지만 완료 기록 저장을 확인해 주세요."
    );
  } finally {
    setWorkoutFinishBusy(false);
  }
}

document.addEventListener("click", e => {
    const nav = e.target.closest("[data-nav]"); if (nav) { navigate(nav.dataset.nav); return; }
    const action =
      e.target.dataset.action;
    if (action) {
  const exerciseIndex = state.activeExercise;
  const setIndex = Number(e.target.dataset.set);
  const exercise = exercises[exerciseIndex];
  const set = workout.getSet(exerciseIndex, setIndex);

  if (action === "weight-down") {
    workout.updateSet(
      exerciseIndex,
      setIndex,
      "weight",
      Math.max(0, Number(set.weight) - exercise.increment)
    );
  }

  if (action === "weight-up") {
    workout.updateSet(
      exerciseIndex,
      setIndex,
      "weight",
      Number(set.weight) + exercise.increment
    );
  }

  if (action === "reps-down") {
    workout.updateSet(
      exerciseIndex,
      setIndex,
      "reps",
      Math.max(0, Number(set.reps) - 1)
    );
  }

  if (action === "reps-up") {
    workout.updateSet(
      exerciseIndex,
      setIndex,
      "reps",
      Number(set.reps) + 1
    );
  }

  if (action === "done") {
    const isDone = workout.toggleSetDone(
      exerciseIndex,
      setIndex
    );

    if (isDone) {
      startRest(exercise.rest);
    }
  }

  state = workout.state;
  renderWorkout();
  return;
}
    if (e.target.classList.contains("switch")) e.target.classList.toggle("on");
    if (e.target.classList.contains("score-btn")) {
        document.querySelectorAll(".score-btn").forEach(b => b.classList.remove("selected"));
        e.target.classList.add("selected");
        workout.setFatigue(Number(e.target.textContent));
        state = workout.state;
    }
});

document.addEventListener("change", (e) => {
  if (!e.target.dataset.field) {
    return;
  }

  const exerciseIndex = state.activeExercise;
  const setIndex = Number(e.target.dataset.set);
  const field = e.target.dataset.field;
  const value = Number(e.target.value) || 0;

  workout.updateSet(
    exerciseIndex,
    setIndex,
    field,
    value
  );

  state = workout.state;
});
document.getElementById("startWorkoutBtn").onclick = startWorkout;
document.getElementById("prevExerciseBtn").onclick = () => {
  if (state.activeExercise <= 0) {
    return;
  }

  workout.setActiveExercise(
    state.activeExercise - 1
  );

  state = workout.state;

  renderWorkout();
  window.scrollTo(0, 0);
};
document.getElementById("nextExerciseBtn").onclick = () => {
  const nextExerciseIndex =
    (state.activeExercise + 1) % exercises.length;

  workout.setActiveExercise(nextExerciseIndex);
  state = workout.state;

  renderWorkout();
  window.scrollTo(0, 0);
};

if (finishWorkoutBtn) {
  finishWorkoutBtn.addEventListener(
    "click",
    () => {
      if (
        workoutFinishInProgress ||
        state.completed
      ) {
        return;
      }

      fatigueModal?.classList.add(
        "show"
      );
    }
  );
}

if (confirmFinishBtn) {
  confirmFinishBtn.addEventListener(
    "click",
    confirmWorkoutFinish
  );
}

if (fatigueModal) {
  fatigueModal.addEventListener(
    "click",
    (event) => {
      if (
        event.target ===
          fatigueModal &&
        !workoutFinishInProgress
      ) {
        fatigueModal.classList.remove(
          "show"
        );
      }
    }
  );
}

document.getElementById("add30Btn").onclick = () => {
    workout.addRestTime(30, (remainingSeconds) => {
        document.getElementById("timerTime").textContent =
            workout.formatTime(remainingSeconds);
    });
};
document.getElementById("stopTimerBtn").onclick = () => {
    workout.stopRestTimer();

    document.getElementById("timerCard").classList.add("hidden");
};

/*
 * 기존 설정 버튼 이벤트 계속
 */
document.getElementById("installInfoBtn").onclick = () => toast("HTTPS 또는 localhost에서 열면 브라우저의 ‘홈 화면에 추가’를 사용할 수 있습니다.");
document.getElementById("resetBtn").onclick = () => {
    if (confirm("프로토타입 기록을 초기화할까요?")) {
        workout.resetWorkout();
        location.reload();
    }
};

window.addEventListener(
  "jym-log:user-state-ready",
  () => {
    state = workout.state;

    routineUI?.refresh();
    renderHome();

    historyUI?.reset();
    analysisUI?.reset();

    if (
      state.started &&
      !state.completed
    ) {
      startElapsed();
    }

    console.info(
      "[JYM Log] 로그인 사용자 운동 기록 준비 완료"
    );
  }
);

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
      state =
        workout.state;

      renderHome();
      renderWorkout();

      if (state.completed) {
        renderSummary();
      }
    }
  });
} else {
  console.warn(
    "[JYM Log] 동기화 충돌 UI 모듈을 찾을 수 없습니다."
  );
}

applyAppMetadata();

renderHome();

document.getElementById("settingsAppName").textContent =
    window.JYMLog.config.appName;

document.getElementById("settingsVersion").textContent =
    window.JYMLog.config.version;

document.getElementById("settingsUpdated").textContent =
    window.JYMLog.config.updatedAt;

if (state.started && !state.completed) { startElapsed(); }
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .catch((error) => {
        console.warn(
          "서비스 워커 등록에 실패했습니다.",
          error
        );
      });
  });
}