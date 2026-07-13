const workout = window.JYMLog.workout;
const exercises = workout.exercises;
let state = workout.state;

const syncStatus =
  document.getElementById("syncStatus");

const syncStatusText =
  document.getElementById("syncStatusText");

  const historyMonthLabel =
  document.getElementById(
    "historyMonthLabel"
  );

  const historyCalendar =
    document.getElementById(
      "historyCalendar"
    );

  const historySessionCount =
    document.getElementById(
      "historySessionCount"
    );

  const historySessionList =
    document.getElementById(
      "historySessionList"
    );

  const historyWeekRange =
    document.getElementById(
      "historyWeekRange"
    );

  const historyPrevWeekBtn =
    document.getElementById(
      "historyPrevWeekBtn"
    );

  const historyTodayBtn =
    document.getElementById(
      "historyTodayBtn"
    );

  const historyNextWeekBtn =
    document.getElementById(
      "historyNextWeekBtn"
    );

  let historySessionsCache = [];
  let historyWeekOffset = 0;

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

function updateSyncStatus(
  status,
  message
) {
  if (
    !syncStatus ||
    !syncStatusText
  ) {
    return;
  }

  syncStatus.dataset.state =
    status;

  syncStatusText.textContent =
    message;

  syncStatus.setAttribute(
    "aria-label",
    `클라우드 동기화 상태: ${message}`
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatHistoryDate(
  timestampMillis
) {
  if (!timestampMillis) {
    return "날짜 정보 없음";
  }

  return new Intl.DateTimeFormat(
    window.JYMLog.config.locale,
    {
      timeZone:
        window.JYMLog.config.timezone,
      month: "long",
      day: "numeric",
      weekday: "long"
    }
  ).format(
    new Date(timestampMillis)
  );
}

function formatSessionDuration(
  durationSeconds
) {
  const minutes =
    Math.max(
      1,
      Math.round(
        Number(durationSeconds) / 60
      )
    );

  return `${minutes}분`;
}

function getDateKey(dateValue) {
  const date =
    new Date(dateValue);

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function renderHistoryCalendar(
  sessions = historySessionsCache
) {
  if (!historyCalendar) {
    return;
  }

  const today =
    new Date();

  /*
   * 현재 주에서 historyWeekOffset만큼
   * 앞뒤로 이동한 날짜를 기준으로 사용합니다.
   */
  const referenceDate =
    new Date(today);

  referenceDate.setDate(
    today.getDate() +
    historyWeekOffset * 7
  );

  const currentDay =
    referenceDate.getDay();

  /*
   * JavaScript에서는 일요일이 0입니다.
   * 월요일부터 시작하는 주간 달력으로 변환합니다.
   */
  const mondayOffset =
    currentDay === 0
      ? -6
      : 1 - currentDay;

  const monday =
    new Date(referenceDate);

  monday.setHours(
    0,
    0,
    0,
    0
  );

  monday.setDate(
    referenceDate.getDate() +
    mondayOffset
  );

  const sunday =
    new Date(monday);

  sunday.setDate(
    monday.getDate() + 6
  );

  const sessionDateKeys =
    new Set(
      sessions
        .filter(
          (session) =>
            session.completedAtMillis
        )
        .map(
          (session) =>
            getDateKey(
              session.completedAtMillis
            )
        )
    );

  const weekdayLabels = [
    "월",
    "화",
    "수",
    "목",
    "금",
    "토",
    "일"
  ];

  const todayKey =
    getDateKey(today);

  const calendarDays =
    weekdayLabels.map(
      (weekday, index) => {
        const date =
          new Date(monday);

        date.setDate(
          monday.getDate() +
          index
        );

        const dateKey =
          getDateKey(date);

        const classes = [
          "day"
        ];

        if (dateKey === todayKey) {
          classes.push("today");
        }

        if (
          sessionDateKeys.has(dateKey)
        ) {
          classes.push(
            "has-session"
          );
        }

        return `
          <div class="${classes.join(" ")}">
            <small>${weekday}</small>
            <strong>${date.getDate()}</strong>
          </div>
        `;
      }
    );

  historyCalendar.innerHTML =
    calendarDays.join("");

  const monthFormatter =
    new Intl.DateTimeFormat(
      window.JYMLog.config.locale,
      {
        timeZone:
          window.JYMLog.config.timezone,
        year: "numeric",
        month: "long"
      }
    );

  const mondayMonth =
    monthFormatter.format(monday);

  const sundayMonth =
    monthFormatter.format(sunday);

  historyMonthLabel.textContent =
    mondayMonth === sundayMonth
      ? mondayMonth
      : `${mondayMonth} – ${sundayMonth}`;

  if (historyWeekRange) {
    const rangeFormatter =
      new Intl.DateTimeFormat(
        window.JYMLog.config.locale,
        {
          timeZone:
            window.JYMLog.config.timezone,
          month: "numeric",
          day: "numeric"
        }
      );

    historyWeekRange.textContent =
      `${rangeFormatter.format(monday)} – ${rangeFormatter.format(sunday)}`;
  }

  if (historyNextWeekBtn) {
    historyNextWeekBtn.disabled =
      historyWeekOffset >= 0;
  }

  if (historyTodayBtn) {
    historyTodayBtn.disabled =
      historyWeekOffset === 0;
  }
}

function renderHistorySessions(
  sessions
) {
  if (
    !historySessionList ||
    !historySessionCount
  ) {
    return;
  }

  const recentSessions =
    sessions.slice(0, 3);

  historySessionList.setAttribute(
    "aria-busy",
    "false"
  );

  historySessionCount.textContent =
    `${recentSessions.length}회`;

  if (
    recentSessions.length === 0
  ) {
    historySessionList.innerHTML = `
      <div class="card history-state">
        아직 완료한 운동 기록이 없습니다.<br>
        운동을 완료하면 이곳에 표시됩니다.
      </div>
    `;

    return;
  }

  historySessionList.innerHTML =
    recentSessions
      .map(
        (session) => `
          <div class="card history-card">
            <div class="history-head">
              <div>
                <h3>
                  ${escapeHtml(
                    session.routineName
                  )}
                </h3>

                <p class="history-date">
                  ${formatHistoryDate(
                    session.completedAtMillis
                  )}
                </p>
              </div>

              <span class="tag">
                완료
              </span>
            </div>

            <div class="history-meta">
              <span>
                ⏱ ${formatSessionDuration(
                  session.durationSeconds
                )}
              </span>

              <span>
                ▦ ${session.completedSets.toLocaleString()}세트
              </span>

              <span>
                ◈ ${session.totalVolume.toLocaleString()}kg
              </span>
            </div>
          </div>
        `
      )
      .join("");
}

async function loadHistory() {
  if (
    !historySessionList ||
    !historySessionCount
  ) {
    return;
  }

  historySessionCount.textContent =
    "불러오는 중";

  historySessionList.setAttribute(
    "aria-busy",
    "true"
  );

  historySessionList.innerHTML = `
    <div class="card history-state">
      운동 기록을 불러오고 있습니다.
    </div>
  `;

  try {
    const historyApi =
      window.JYMLog.history;

    if (!historyApi) {
      throw new Error(
        "운동 기록 모듈을 찾을 수 없습니다."
      );
    }

    const sessions =
      await historyApi
        .loadRecentWorkoutSessions(100);

    historySessionsCache =
      sessions;

    renderHistoryCalendar(
      historySessionsCache
    );

    renderHistorySessions(
      historySessionsCache
    );
  } catch (error) {
    console.error(
      "[JYM Log] 운동 기록 불러오기 실패",
      error
    );

    historySessionCount.textContent =
      "오류";

    historySessionList.setAttribute(
      "aria-busy",
      "false"
    );

    historySessionList.innerHTML = `
      <div class="card history-state error">
        운동 기록을 불러오지 못했습니다.<br>
        네트워크 연결을 확인한 뒤 다시 열어 주세요.
      </div>
    `;
  }
}

function navigate(name) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(`screen-${name}`).classList.add("active");
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.nav === name));
    document.getElementById("bottomNav").classList.toggle("hidden", name === "workout" || name === "summary");
    const labels = { home: "오늘의 운동", workout: "운동 진행", summary: "운동 완료", history: "운동 기록", analysis: "진행 분석", routine: "루틴 관리", settings: "설정" };
    document.getElementById("headerSub").textContent =
        labels[name] || window.JYMLog.config.appName;

        if (name === "history") {
          void loadHistory();
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
function renderRoutine() {
    document.getElementById("routineList").innerHTML = exercises.map((e, i) => `
    <div class="card routine-card">
      <div class="routine-top"><div style="display:flex;gap:12px;align-items:center"><div class="exercise-icon">${e.icon}</div><div><h3>${e.name}</h3><p style="font-size:12px;color:var(--muted);margin-top:5px">${e.sets}세트 · ${e.min === e.max ? e.min : `${e.min}–${e.max}`}회 · ${e.type}</p></div></div><span class="drag">☷</span></div>
    </div>`).join("");
}
function renderAnalysis() {
    const vals = [72.5, 75, 75, 77.5, 80, 80];
    document.getElementById("analysisBars").innerHTML = vals.map((v, i) => `
    <div class="bar-wrap"><div class="bar" style="height:${45 + (v - 70) * 7}px"></div><small>${i + 1}회</small></div>`).join("");
}
document.addEventListener("click", e => {
    const nav = e.target.closest("[data-nav]"); if (nav) { navigate(nav.dataset.nav); return; }
    const action = e.target.dataset.action;
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
document.getElementById("finishWorkoutBtn").onclick = () => document.getElementById("fatigueModal").classList.add("show");
document.getElementById(
    "confirmFinishBtn"
    ).onclick = async () => {
    document
        .getElementById("fatigueModal")
        .classList.remove("show");

    workout.finishWorkout();
    workout.stopRestTimer();
    workout.stopElapsedTimer();

    state = workout.state;

    renderSummary();
    navigate("summary");

    try {
        await window.JYMLog.sessions
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
    }
    };
document.getElementById("fatigueModal").onclick = e => { if (e.target.id === "fatigueModal") e.target.classList.remove("show") };
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
document.getElementById("addExerciseDemo").onclick = () => toast("다음 스프린트에서 운동 추가 편집 화면을 연결합니다.");
document.getElementById("installInfoBtn").onclick = () => toast("HTTPS 또는 localhost에서 열면 브라우저의 ‘홈 화면에 추가’를 사용할 수 있습니다.");
document.getElementById("resetBtn").onclick = () => {
    if (confirm("프로토타입 기록을 초기화할까요?")) {
        workout.resetWorkout();
        location.reload();
    }
};

if (historyPrevWeekBtn) {
  historyPrevWeekBtn.addEventListener(
    "click",
    () => {
      historyWeekOffset -= 1;

      renderHistoryCalendar(
        historySessionsCache
      );
    }
  );
}

if (historyNextWeekBtn) {
  historyNextWeekBtn.addEventListener(
    "click",
    () => {
      if (historyWeekOffset >= 0) {
        return;
      }

      historyWeekOffset += 1;

      renderHistoryCalendar(
        historySessionsCache
      );
    }
  );
}

if (historyTodayBtn) {
  historyTodayBtn.addEventListener(
    "click",
    () => {
      historyWeekOffset = 0;

      renderHistoryCalendar(
        historySessionsCache
      );
    }
  );
}

window.addEventListener(
  "jym-log:user-state-ready",
  () => {
    state = workout.state;

    renderHome();
    renderRoutine();
    renderAnalysis();
    historyWeekOffset = 0;
    historySessionsCache = [];

    renderHistoryCalendar(
      historySessionsCache
    );

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

window.addEventListener(
  "jym-log:sync-status",
  (event) => {
    const detail =
      event.detail || {};

    updateSyncStatus(
      detail.status || "loading",
      detail.message || "확인 중"
    );
  }
);

applyAppMetadata();

renderHome();
renderRoutine();
renderAnalysis();

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