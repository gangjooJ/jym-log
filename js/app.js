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

  const sessionDetailTitle =
    document.getElementById(
      "sessionDetailTitle"
    );

  const sessionDetailDate =
    document.getElementById(
      "sessionDetailDate"
    );

  const sessionDetailDuration =
    document.getElementById(
      "sessionDetailDuration"
    );

  const sessionDetailSets =
    document.getElementById(
      "sessionDetailSets"
    );

  const sessionDetailVolume =
    document.getElementById(
      "sessionDetailVolume"
    );

  const sessionDetailFatigue =
    document.getElementById(
      "sessionDetailFatigue"
    );

  const sessionDetailExerciseCount =
    document.getElementById(
      "sessionDetailExerciseCount"
    );

  const sessionDetailExerciseList =
    document.getElementById(
      "sessionDetailExerciseList"
    );

  const sessionDetailBackBtn =
    document.getElementById(
      "sessionDetailBackBtn"
    );

  const analysisWeekRange =
  document.getElementById(
    "analysisWeekRange"
  );

const analysisSessionCount =
  document.getElementById(
    "analysisSessionCount"
  );

const analysisWeeklySets =
  document.getElementById(
    "analysisWeeklySets"
  );

const analysisWeeklyVolume =
  document.getElementById(
    "analysisWeeklyVolume"
  );

const analysisBenchCard =
  document.getElementById(
    "analysisBenchCard"
  );

const analysisBenchWeight =
  document.getElementById(
    "analysisBenchWeight"
  );

const analysisBenchChange =
  document.getElementById(
    "analysisBenchChange"
  );

const analysisBars =
  document.getElementById(
    "analysisBars"
  );

const analysisState =
  document.getElementById(
    "analysisState"
  );

const homeRoutineName =
  document.getElementById(
    "homeRoutineName"
  );

const homeRoutineDescription =
  document.getElementById(
    "homeRoutineDescription"
  );

const homeRoutineSets =
  document.getElementById(
    "homeRoutineSets"
  );

const homeRoutineGoal =
  document.getElementById(
    "homeRoutineGoal"
  );

const homeRoutineGoalLabel =
  document.getElementById(
    "homeRoutineGoalLabel"
  );

const routineNameLabel =
  document.getElementById(
    "routineNameLabel"
  );

const routineExerciseCount =
  document.getElementById(
    "routineExerciseCount"
  );

const routineListElement =
  document.getElementById(
    "routineList"
  );

const routineInfoForm =
  document.getElementById(
    "routineInfoForm"
  );

const routineNameInput =
  document.getElementById(
    "routineNameInput"
  );

const routineDescriptionInput =
  document.getElementById(
    "routineDescriptionInput"
  );

const saveRoutineInfoBtn =
  document.getElementById(
    "saveRoutineInfoBtn"
  );

const routineEditorMessage =
  document.getElementById(
    "routineEditorMessage"
  );

const summaryRoutineName =
  document.getElementById(
    "summaryRoutineName"
  );

const exerciseEditorModal =
  document.getElementById(
    "exerciseEditorModal"
  );

const exerciseEditorForm =
  document.getElementById(
    "exerciseEditorForm"
  );

const exerciseEditorTitle =
  document.getElementById(
    "exerciseEditorTitle"
  );

const exerciseNameInput =
  document.getElementById(
    "exerciseNameInput"
  );

const exerciseTypeInput =
  document.getElementById(
    "exerciseTypeInput"
  );

const exerciseWeightInput =
  document.getElementById(
    "exerciseWeightInput"
  );

const exerciseSetsInput =
  document.getElementById(
    "exerciseSetsInput"
  );

const exerciseMinRepsInput =
  document.getElementById(
    "exerciseMinRepsInput"
  );

const exerciseMaxRepsInput =
  document.getElementById(
    "exerciseMaxRepsInput"
  );

const exerciseRestInput =
  document.getElementById(
    "exerciseRestInput"
  );

const exerciseIncrementInput =
  document.getElementById(
    "exerciseIncrementInput"
  );

const exerciseEditorMessage =
  document.getElementById(
    "exerciseEditorMessage"
  );

const saveExerciseEditorBtn =
  document.getElementById(
    "saveExerciseEditorBtn"
  );

const cancelExerciseEditorBtn =
  document.getElementById(
    "cancelExerciseEditorBtn"
  );

const closeExerciseEditorBtn =
  document.getElementById(
    "closeExerciseEditorBtn"
  );

const deleteExerciseEditorBtn =
  document.getElementById(
    "deleteExerciseEditorBtn"
  );

const addExerciseBtn =
  document.getElementById(
    "addExerciseBtn"
  );

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

let editingExerciseIndex = null;
let exerciseEditorMode = "edit";

let routineOrderSaving = false;
let routineDragState = null;

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

function setRoutineEditorMessage(
  message,
  status = "default"
) {
  if (!routineEditorMessage) {
    return;
  }

  routineEditorMessage.textContent =
    message;

  routineEditorMessage.classList.toggle(
    "success",
    status === "success"
  );

  routineEditorMessage.classList.toggle(
    "error",
    status === "error"
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
          <button
            class="card history-card history-card-button"
            type="button"
            data-session-id="${escapeHtml(
              session.id
            )}"
            aria-label="${escapeHtml(
              session.routineName
            )} 운동 기록 상세 보기"
          >
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

            <div class="history-card-action">
              상세 보기 ›
            </div>
          </button>
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

function formatSessionDateTime(
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
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(
    new Date(timestampMillis)
  );
}

function renderSessionDetail(
  session
) {
  if (!session) {
    return;
  }

  sessionDetailTitle.textContent =
    session.routineName;

  sessionDetailDate.textContent =
    formatSessionDateTime(
      session.completedAtMillis
    );

  sessionDetailDuration.textContent =
    formatSessionDuration(
      session.durationSeconds
    );

  sessionDetailSets.textContent =
    `${session.completedSets.toLocaleString()}세트`;

  sessionDetailVolume.textContent =
    `${session.totalVolume.toLocaleString()}kg`;

  sessionDetailFatigue.textContent =
    session.fatigue > 0
      ? `${session.fatigue} / 5`
      : "미입력";

  const recordedExercises =
    session.exercises.filter(
      (exercise) =>
        Array.isArray(
          exercise.sets
        ) &&
        exercise.sets.some(
          (set) => set.done
        )
    );

  sessionDetailExerciseCount.textContent =
    `${recordedExercises.length}개 운동`;

  sessionDetailExerciseList.setAttribute(
    "aria-busy",
    "false"
  );

  if (
    recordedExercises.length === 0
  ) {
    sessionDetailExerciseList.innerHTML = `
      <div class="card history-state">
        완료 처리된 운동 세트가 없습니다.
      </div>
    `;

    return;
  }

  sessionDetailExerciseList.innerHTML =
    recordedExercises
      .map(
        (exercise) => {
          const sets =
            Array.isArray(exercise.sets)
              ? exercise.sets
              : [];

          const completedCount =
            sets.filter(
              (set) => set.done
            ).length;

          return `
            <div class="card session-exercise-card">
              <div class="session-exercise-head">
                <div>
                  <h3>
                    ${escapeHtml(
                      exercise.name ||
                      "운동"
                    )}
                  </h3>

                  <p>
                    ${escapeHtml(
                      exercise.type ||
                      "운동 기록"
                    )}
                  </p>
                </div>

                <span class="session-exercise-count">
                  ${completedCount} / ${sets.length}세트
                </span>
              </div>

              <div class="session-set-list">
                ${sets
                  .map(
                    (set) => `
                      <div
                        class="session-set-row ${
                          set.done
                            ? ""
                            : "not-done"
                        }"
                      >
                        <span>
                          ${Number(
                            set.setNumber
                          ) || 0}세트
                        </span>

                        <strong>
                          ${
                            Number(
                              set.weight
                            ) || 0
                          }kg × ${
                            Number(
                              set.reps
                            ) || 0
                          }회
                        </strong>

                        <em class="session-set-status">
                          ${
                            set.done
                              ? "완료"
                              : "미완료"
                          }
                        </em>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            </div>
          `;
        }
      )
      .join("");
}

async function loadSessionDetail(
  sessionId
) {
  navigate(
    "session-detail"
  );

  sessionDetailTitle.textContent =
    "운동 기록";

  sessionDetailDate.textContent =
    "기록을 불러오고 있습니다.";

  sessionDetailDuration.textContent =
    "—";

  sessionDetailSets.textContent =
    "—";

  sessionDetailVolume.textContent =
    "—";

  sessionDetailFatigue.textContent =
    "—";

  sessionDetailExerciseCount.textContent =
    "불러오는 중";

  sessionDetailExerciseList.setAttribute(
    "aria-busy",
    "true"
  );

  sessionDetailExerciseList.innerHTML = `
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

    const session =
      await historyApi
        .loadWorkoutSessionById(
          sessionId
        );

    if (!session) {
      throw new Error(
        "운동 기록을 찾을 수 없습니다."
      );
    }

    renderSessionDetail(
      session
    );
  } catch (error) {
    console.error(
      "[JYM Log] 운동 상세 기록 불러오기 실패",
      error
    );

    sessionDetailDate.textContent =
      "기록을 불러오지 못했습니다.";

    sessionDetailExerciseCount.textContent =
      "오류";

    sessionDetailExerciseList.setAttribute(
      "aria-busy",
      "false"
    );

    sessionDetailExerciseList.innerHTML = `
      <div class="card history-state error">
        운동 상세 기록을 불러오지 못했습니다.<br>
        네트워크 연결을 확인한 뒤 다시 시도해 주세요.
      </div>
    `;
  }
}

function formatAnalysisDateRange(
  startMillis,
  endMillis
) {
  const formatter =
    new Intl.DateTimeFormat(
      window.JYMLog.config.locale,
      {
        timeZone:
          window.JYMLog.config.timezone,
        month: "numeric",
        day: "numeric"
      }
    );

  return `${
    formatter.format(
      new Date(startMillis)
    )
  } – ${
    formatter.format(
      new Date(endMillis)
    )
  }`;
}

function formatAnalysisBarDate(
  timestampMillis
) {
  return new Intl.DateTimeFormat(
    window.JYMLog.config.locale,
    {
      timeZone:
        window.JYMLog.config.timezone,
      month: "numeric",
      day: "numeric"
    }
  ).format(
    new Date(timestampMillis)
  );
}

function renderAnalysisBars(
  trend
) {
  if (!analysisBars) {
    return;
  }

  if (trend.length === 0) {
    analysisBars.innerHTML = "";
    return;
  }

  const weights =
    trend.map(
      (item) => item.weight
    );

  const minimumWeight =
    Math.min(...weights);

  const maximumWeight =
    Math.max(...weights);

  const weightRange =
    Math.max(
      2.5,
      maximumWeight -
      minimumWeight
    );

  analysisBars.innerHTML =
    trend
      .map(
        (item) => {
          const height =
            42 +
            (
              (
                item.weight -
                minimumWeight
              ) /
              weightRange
            ) *
            78;

          return `
            <div class="analysis-bar-item">
              <span class="analysis-bar-value">
                ${item.weight}kg
              </span>

              <div
                class="analysis-bar-column"
                style="height: ${Math.round(height)}px"
                title="${item.weight}kg"
              ></div>

              <span class="analysis-bar-label">
                ${formatAnalysisBarDate(
                  item.completedAtMillis
                )}
              </span>
            </div>
          `;
        }
      )
      .join("");
}

function renderWorkoutAnalysis(
  analysis
) {
  analysisWeekRange.textContent =
    formatAnalysisDateRange(
      analysis.weekStartMillis,
      analysis.weekEndMillis
    );

  analysisSessionCount.textContent =
    `${analysis.weeklySessionCount}회`;

  analysisWeeklySets.textContent =
    `${analysis.weeklyCompletedSets}세트`;

  analysisWeeklyVolume.textContent =
    `${analysis.weeklyVolume.toLocaleString()}kg`;

  if (
    analysis.currentBenchWeight <= 0
  ) {
    analysisBenchWeight.textContent =
      "기록 없음";

    analysisBenchChange.textContent =
      "—";

    analysisBenchChange.dataset.trend =
      "neutral";

    analysisState.textContent =
      "완료된 벤치프레스 기록이 쌓이면 중량 변화를 표시합니다.";

    renderAnalysisBars([]);

    return;
  }

  analysisBenchWeight.textContent =
    `${analysis.currentBenchWeight}kg`;

  const change =
    analysis.benchWeightChange;

  if (change > 0) {
    analysisBenchChange.textContent =
      `+${change}kg`;

    analysisBenchChange.dataset.trend =
      "up";
  } else if (change < 0) {
    analysisBenchChange.textContent =
      `${change}kg`;

    analysisBenchChange.dataset.trend =
      "down";
  } else {
    analysisBenchChange.textContent =
      "유지";

    analysisBenchChange.dataset.trend =
      "neutral";
  }

  renderAnalysisBars(
    analysis.benchTrend
  );

  analysisState.textContent =
    analysis.benchTrend.length === 1
      ? "기록이 더 쌓이면 최근 운동과 변화량을 비교합니다."
      : `최근 ${analysis.benchTrend.length}회의 완료 세션을 비교했습니다.`;
}

async function loadAnalysis() {
  if (
    !analysisBenchCard ||
    !analysisState
  ) {
    return;
  }

  analysisBenchCard.setAttribute(
    "aria-busy",
    "true"
  );

  analysisState.classList.remove(
    "error"
  );

  analysisState.textContent =
    "운동 기록을 분석하고 있습니다.";

  try {
    const analysisApi =
      window.JYMLog.analysis;

    if (!analysisApi) {
      throw new Error(
        "운동 분석 모듈을 찾을 수 없습니다."
      );
    }

    const analysis =
      await analysisApi
        .loadWorkoutAnalysis(100);

    renderWorkoutAnalysis(
      analysis
    );

    analysisBenchCard.setAttribute(
      "aria-busy",
      "false"
    );
  } catch (error) {
    console.error(
      "[JYM Log] 운동 분석 불러오기 실패",
      error
    );

    analysisBenchCard.setAttribute(
      "aria-busy",
      "false"
    );

    analysisState.classList.add(
      "error"
    );

    analysisState.textContent =
      "분석 데이터를 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.";
  }
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
          void loadHistory();
        }

        if (name === "analysis") {
          void loadAnalysis();
        }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderRoutineMetadata(
  routine =
    window.JYMLog.routines
      ?.activeRoutine
) {
  if (!routine) {
    return;
  }

  const totalSets =
    exercises.reduce(
      (total, exercise) =>
        total +
        (
          Number(exercise.sets) ||
          0
        ),
      0
    );

  const firstExercise =
    exercises[0];

  if (homeRoutineName) {
    homeRoutineName.textContent =
      routine.name;
  }

  if (homeRoutineDescription) {
    homeRoutineDescription.textContent =
      `${routine.description} · 총 ${exercises.length}개 운동`;
  }

  if (homeRoutineSets) {
    homeRoutineSets.textContent =
      `${totalSets}세트`;
  }

  if (homeRoutineGoal) {
    homeRoutineGoal.textContent =
      firstExercise
        ? `${firstExercise.weight}kg`
        : "—";
  }

  if (homeRoutineGoalLabel) {
    homeRoutineGoalLabel.textContent =
      firstExercise
        ? `${firstExercise.name} 목표`
        : "운동 목표 준비 중";
  }

  if (routineNameLabel) {
    routineNameLabel.textContent =
      routine.name;
  }

  if (routineExerciseCount) {
    routineExerciseCount.textContent =
      `${exercises.length}개 운동`;
  }

  if (summaryRoutineName) {
    summaryRoutineName.textContent =
      routine.name;
  }

  if (routineNameInput) {
    routineNameInput.value =
      routine.name;
  }

  if (routineDescriptionInput) {
    routineDescriptionInput.value =
      routine.description;
  }
}

async function saveRoutineInfo(
  event
) {
  event.preventDefault();

  const routineApi =
    window.JYMLog.routines;

  if (
    !routineApi ||
    !routineNameInput ||
    !routineDescriptionInput ||
    !saveRoutineInfoBtn
  ) {
    setRoutineEditorMessage(
      "루틴 편집 기능을 불러오지 못했습니다.",
      "error"
    );

    return;
  }

  saveRoutineInfoBtn.disabled = true;
  routineNameInput.disabled = true;
  routineDescriptionInput.disabled = true;

  saveRoutineInfoBtn.textContent =
    "저장 중...";

  setRoutineEditorMessage(
    "루틴 정보를 저장하고 있습니다."
  );

  try {
    const routine =
      await routineApi
        .updateActiveRoutineMetadata(
          routineNameInput.value,
          routineDescriptionInput.value
        );

    renderRoutineMetadata(
      routine
    );

    setRoutineEditorMessage(
      "루틴 정보가 저장되었습니다.",
      "success"
    );

    toast(
      "루틴 정보가 저장되었습니다."
    );
  } catch (error) {
    console.error(
      "[JYM Log] 루틴 정보 저장 실패",
      error
    );

    setRoutineEditorMessage(
      error.message ||
      "루틴 정보를 저장하지 못했습니다.",
      "error"
    );
  } finally {
    saveRoutineInfoBtn.disabled = false;
    routineNameInput.disabled = false;
    routineDescriptionInput.disabled = false;

    saveRoutineInfoBtn.textContent =
      "루틴 정보 저장";
  }
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

function renderRoutine() {
  if (!routineListElement) {
    return;
  }

  routineListElement.innerHTML =
    exercises
      .map(
        (exercise, index) => {
          const isFirst =
            index === 0;

          const isLast =
            index ===
            exercises.length - 1;

          return `
            <div
              class="card routine-card"
              data-routine-index="${index}"
            >
              <button
                class="routine-drag-handle"
                type="button"
                tabindex="-1"
                data-drag-exercise-index="${index}"
                aria-label="${escapeHtml(
                  exercise.name
                )} 운동을 끌어서 순서 변경"
                title="끌어서 순서 변경"
              >
                <span
                  class="routine-grip"
                  aria-hidden="true"
                >
                  ⠿
                </span>

                <span
                  class="exercise-icon"
                  aria-hidden="true"
                >
                  ${escapeHtml(
                    exercise.icon
                  )}
                </span>
              </button>

              <div class="routine-card-copy">
                <h3>
                  ${escapeHtml(
                    exercise.name
                  )}
                </h3>

                <p>
                  ${exercise.weight}kg ·
                  ${exercise.sets}세트 ·
                  ${
                    exercise.min ===
                    exercise.max
                      ? exercise.min
                      : `${exercise.min}–${exercise.max}`
                  }회
                  · 휴식 ${exercise.rest}초
                </p>
              </div>

              <div class="routine-card-actions">
                <div
                  class="routine-order-buttons"
                  aria-label="${escapeHtml(
                    exercise.name
                  )} 순서 변경"
                >
                  <button
                    class="routine-order-btn"
                    type="button"
                    data-move-exercise="up"
                    data-exercise-index="${index}"
                    aria-label="위로 이동"
                    ${isFirst ? "disabled" : ""}
                  >
                    ↑
                  </button>

                  <button
                    class="routine-order-btn"
                    type="button"
                    data-move-exercise="down"
                    data-exercise-index="${index}"
                    aria-label="아래로 이동"
                    ${isLast ? "disabled" : ""}
                  >
                    ↓
                  </button>
                </div>

                <button
                  class="routine-edit-btn"
                  type="button"
                  data-edit-exercise-index="${index}"
                >
                  편집
                </button>
              </div>
            </div>
          `;
        }
      )
      .join("");
}

function setRoutineOrderBusy(
  isBusy
) {
  routineOrderSaving =
    isBusy;

  if (!routineListElement) {
    return;
  }

  routineListElement.setAttribute(
    "aria-busy",
    String(isBusy)
  );

  if (!isBusy) {
    return;
  }

  routineListElement
    .querySelectorAll("button")
    .forEach((button) => {
      button.disabled = true;
    });
}

async function moveExerciseByButton(
  exerciseIndex,
  direction
) {
  if (routineOrderSaving) {
    return;
  }

  const targetIndex =
    direction === "up"
      ? exerciseIndex - 1
      : exerciseIndex + 1;

  if (
    targetIndex < 0 ||
    targetIndex >= exercises.length
  ) {
    return;
  }

  const routineApi =
    window.JYMLog.routines;

  if (!routineApi) {
    toast(
      "루틴 기능을 불러오지 못했습니다."
    );

    return;
  }

  setRoutineOrderBusy(true);

  try {
    await routineApi
      .moveActiveRoutineExercise(
        exerciseIndex,
        direction
      );

    toast(
      "운동 순서가 변경되었습니다."
    );
  } catch (error) {
    console.error(
      "[JYM Log] 운동 순서 변경 실패",
      error
    );

    toast(
      error.message ||
      "운동 순서를 변경하지 못했습니다."
    );
  } finally {
    routineOrderSaving = false;

    if (routineListElement) {
      routineListElement.setAttribute(
        "aria-busy",
        "false"
      );
    }

    /*
     * 첫 번째·마지막 버튼의
     * 비활성 상태까지 다시 계산합니다.
     */
    renderRoutine();
  }
}

function cleanupRoutineDrag(
  restoreOriginalOrder = false
) {
  if (!routineDragState) {
    return;
  }

  const draggedCard =
    routineDragState.card;

  draggedCard.classList.remove(
    "is-dragging"
  );

  routineListElement?.classList.remove(
    "routine-list-dragging"
  );

  document.body.classList.remove(
    "routine-drag-active"
  );

  window.removeEventListener(
    "pointermove",
    handleRoutineDragMove
  );

  window.removeEventListener(
    "pointerup",
    finishRoutineDrag
  );

  window.removeEventListener(
    "pointercancel",
    cancelRoutineDrag
  );

  routineDragState = null;

  if (restoreOriginalOrder) {
    renderRoutine();
  }
}

function startRoutineDrag(
  event,
  dragHandle
) {
  if (
    routineOrderSaving ||
    routineDragState
  ) {
    return;
  }

  /*
   * 마우스 오른쪽 버튼 등으로는
   * 드래그를 시작하지 않습니다.
   */
  if (
    event.pointerType === "mouse" &&
    event.button !== 0
  ) {
    return;
  }

  if (
    state.started &&
    !state.completed
  ) {
    toast(
      "운동 진행 중에는 순서를 변경할 수 없습니다."
    );

    return;
  }

  const draggedCard =
    dragHandle.closest(
      "[data-routine-index]"
    );

  if (!draggedCard) {
    return;
  }

  event.preventDefault();

  routineDragState = {
    pointerId:
      event.pointerId,

    card:
      draggedCard,

    fromIndex:
      Number(
        draggedCard.dataset
          .routineIndex
      )
  };

  draggedCard.classList.add(
    "is-dragging"
  );

  routineListElement.classList.add(
    "routine-list-dragging"
  );

  document.body.classList.add(
    "routine-drag-active"
  );

  window.addEventListener(
    "pointermove",
    handleRoutineDragMove,
    {
      passive: false
    }
  );

  window.addEventListener(
    "pointerup",
    finishRoutineDrag
  );

  window.addEventListener(
    "pointercancel",
    cancelRoutineDrag
  );
}

function handleRoutineDragMove(
  event
) {
  if (
    !routineDragState ||
    event.pointerId !==
      routineDragState.pointerId
  ) {
    return;
  }

  event.preventDefault();

  /*
   * 화면 가장자리에 가까워지면
   * 긴 루틴에서도 자동 스크롤합니다.
   */
  const scrollEdge = 90;
  const scrollSpeed = 13;

  if (event.clientY < scrollEdge) {
    window.scrollBy(
      0,
      -scrollSpeed
    );
  } else if (
    event.clientY >
    window.innerHeight -
      scrollEdge
  ) {
    window.scrollBy(
      0,
      scrollSpeed
    );
  }

  const elementBelow =
    document.elementFromPoint(
      event.clientX,
      event.clientY
    );

  const targetCard =
    elementBelow?.closest(
      "[data-routine-index]"
    );

  const draggedCard =
    routineDragState.card;

  if (
    !targetCard ||
    targetCard === draggedCard ||
    !routineListElement.contains(
      targetCard
    )
  ) {
    return;
  }

  const targetRectangle =
    targetCard.getBoundingClientRect();

  const insertAfter =
    event.clientY >
    targetRectangle.top +
      targetRectangle.height / 2;

  const referenceElement =
    insertAfter
      ? targetCard.nextElementSibling
      : targetCard;

  if (
    referenceElement ===
    draggedCard
  ) {
    return;
  }

  routineListElement.insertBefore(
    draggedCard,
    referenceElement
  );
}

async function finishRoutineDrag(
  event
) {
  if (
    !routineDragState ||
    event.pointerId !==
      routineDragState.pointerId
  ) {
    return;
  }

  const {
    card,
    fromIndex
  } = routineDragState;

  const orderedCards = [
    ...routineListElement
      .querySelectorAll(
        "[data-routine-index]"
      )
  ];

  const targetIndex =
    orderedCards.indexOf(card);

  cleanupRoutineDrag(false);

  if (
    targetIndex < 0 ||
    targetIndex === fromIndex
  ) {
    renderRoutine();
    return;
  }

  const routineApi =
    window.JYMLog.routines;

  if (!routineApi) {
    renderRoutine();

    toast(
      "루틴 기능을 불러오지 못했습니다."
    );

    return;
  }

  setRoutineOrderBusy(true);

  try {
    await routineApi
      .reorderActiveRoutineExercises(
        fromIndex,
        targetIndex
      );

    toast(
      "운동 순서가 저장되었습니다."
    );
  } catch (error) {
    console.error(
      "[JYM Log] 드래그 순서 저장 실패",
      error
    );

    toast(
      error.message ||
      "운동 순서를 저장하지 못했습니다."
    );
  } finally {
    routineOrderSaving = false;

    if (routineListElement) {
      routineListElement.setAttribute(
        "aria-busy",
        "false"
      );
    }

    renderRoutine();
  }
}

function cancelRoutineDrag(
  event
) {
  if (
    !routineDragState ||
    event.pointerId !==
      routineDragState.pointerId
  ) {
    return;
  }

  cleanupRoutineDrag(true);
}

function setExerciseEditorMessage(
  message,
  isError = false
) {
  if (!exerciseEditorMessage) {
    return;
  }

  exerciseEditorMessage.textContent =
    message;

  exerciseEditorMessage.classList.toggle(
    "error",
    isError
  );
}

function syncExerciseTypeFields() {
  if (
    !exerciseTypeInput ||
    !exerciseMinRepsInput ||
    !exerciseMaxRepsInput
  ) {
    return;
  }

  const isFixed =
    exerciseTypeInput.value ===
    "고정 반복형";

  exerciseMaxRepsInput.disabled =
    isFixed;

  if (isFixed) {
    exerciseMaxRepsInput.value =
      exerciseMinRepsInput.value;
  }
}

function openExerciseEditor(
  exerciseIndex
) {
  if (
    state.started &&
    !state.completed
  ) {
    toast(
      "운동 진행 중에는 루틴을 수정할 수 없습니다."
    );

    return;
  }

  const exercise =
    exercises[exerciseIndex];

  if (!exercise) {
    toast(
      "편집할 운동을 찾을 수 없습니다."
    );

    return;
  }

  editingExerciseIndex =
    exerciseIndex;

  exerciseEditorMode =
    "edit";

  exerciseEditorTitle.textContent =
    exercise.name;

  exerciseNameInput.value =
    exercise.name;

  exerciseTypeInput.value =
    exercise.type;

  exerciseWeightInput.value =
    exercise.weight;

  exerciseSetsInput.value =
    exercise.sets;

  exerciseMinRepsInput.value =
    exercise.min;

  exerciseMaxRepsInput.value =
    exercise.max;

  exerciseRestInput.value =
    exercise.rest;

  exerciseIncrementInput.value =
    exercise.increment;

  saveExerciseEditorBtn.textContent =
    "운동 설정 저장";

  deleteExerciseEditorBtn.classList.remove(
    "hidden"
  );

  setExerciseEditorMessage(
    "변경한 설정은 다음 운동부터 적용됩니다."
  );

  syncExerciseTypeFields();

  exerciseEditorModal.classList.remove(
    "hidden"
  );

  document.body.style.overflow =
    "hidden";

  window.setTimeout(
    () => {
      exerciseNameInput.focus();
    },
    50
  );
}

function openExerciseCreator() {
  if (
    state.started &&
    !state.completed
  ) {
    toast(
      "운동 진행 중에는 운동을 추가할 수 없습니다."
    );

    return;
  }

  exerciseEditorMode =
    "create";

  editingExerciseIndex =
    null;

  exerciseEditorTitle.textContent =
    "새 운동 추가";

  exerciseNameInput.value =
    "";

  exerciseTypeInput.value =
    "반복 범위형";

  exerciseWeightInput.value =
    0;

  exerciseSetsInput.value =
    3;

  exerciseMinRepsInput.value =
    8;

  exerciseMaxRepsInput.value =
    12;

  exerciseRestInput.value =
    90;

  exerciseIncrementInput.value =
    2.5;

  saveExerciseEditorBtn.textContent =
    "운동 추가";

  deleteExerciseEditorBtn.classList.add(
    "hidden"
  );

  setExerciseEditorMessage(
    "새 운동의 기본 설정을 입력해 주세요."
  );

  syncExerciseTypeFields();

  exerciseEditorModal.classList.remove(
    "hidden"
  );

  document.body.style.overflow =
    "hidden";

  window.setTimeout(
    () => {
      exerciseNameInput.focus();
    },
    50
  );
}

function closeExerciseEditor() {
  exerciseEditorModal.classList.add(
    "hidden"
  );

  document.body.style.overflow = "";

  editingExerciseIndex = null;
  exerciseEditorMode = "edit";

  deleteExerciseEditorBtn.classList.add(
    "hidden"
  );

  saveExerciseEditorBtn.textContent =
    "운동 설정 저장";
}

async function saveExerciseEditor(
  event
) {
  event.preventDefault();

  if (
    exerciseEditorMode === "edit" &&
    editingExerciseIndex === null
  ) {
    return;
  }

  const routineApi =
    window.JYMLog.routines;

  if (!routineApi) {
    setExerciseEditorMessage(
      "루틴 기능을 불러오지 못했습니다.",
      true
    );

    return;
  }

  const exerciseInput = {
    name:
      exerciseNameInput.value,

    type:
      exerciseTypeInput.value,

    weight:
      exerciseWeightInput.value,

    sets:
      Number(
        exerciseSetsInput.value
      ),

    min:
      Number(
        exerciseMinRepsInput.value
      ),

    max:
      Number(
        exerciseMaxRepsInput.value
      ),

    rest:
      Number(
        exerciseRestInput.value
      ),

    increment:
      exerciseIncrementInput.value
  };

  saveExerciseEditorBtn.disabled =
    true;

  deleteExerciseEditorBtn.disabled =
    true;

  saveExerciseEditorBtn.textContent =
    exerciseEditorMode === "create"
      ? "추가 중..."
      : "저장 중...";

  setExerciseEditorMessage(
    exerciseEditorMode === "create"
      ? "새 운동을 추가하고 있습니다."
      : "운동 설정을 저장하고 있습니다."
  );

  try {
    if (
      exerciseEditorMode === "create"
    ) {
      await routineApi
        .addActiveRoutineExercise(
          exerciseInput
        );

      toast(
        "새 운동이 추가되었습니다."
      );
    } else {
      await routineApi
        .updateActiveRoutineExercise(
          editingExerciseIndex,
          exerciseInput
        );

      toast(
        "운동 설정이 저장되었습니다."
      );
    }

    closeExerciseEditor();
  } catch (error) {
    console.error(
      "[JYM Log] 운동 설정 처리 실패",
      error
    );

    setExerciseEditorMessage(
      error.message ||
      "운동 설정을 처리하지 못했습니다.",
      true
    );
  } finally {
    saveExerciseEditorBtn.disabled =
      false;

    deleteExerciseEditorBtn.disabled =
      false;

    if (
      !exerciseEditorModal.classList
        .contains("hidden")
    ) {
      saveExerciseEditorBtn.textContent =
        exerciseEditorMode === "create"
          ? "운동 추가"
          : "운동 설정 저장";
    }
  }
}

async function deleteExerciseFromRoutine() {
  if (
    exerciseEditorMode !== "edit" ||
    editingExerciseIndex === null
  ) {
    return;
  }

  const exercise =
    exercises[editingExerciseIndex];

  if (!exercise) {
    setExerciseEditorMessage(
      "삭제할 운동을 찾을 수 없습니다.",
      true
    );

    return;
  }

  const confirmed =
    window.confirm(
      `"${exercise.name}" 운동을 루틴에서 삭제할까요?\n\n기존에 완료된 과거 운동 기록은 삭제되지 않습니다.`
    );

  if (!confirmed) {
    return;
  }

  const routineApi =
    window.JYMLog.routines;

  if (!routineApi) {
    setExerciseEditorMessage(
      "루틴 기능을 불러오지 못했습니다.",
      true
    );

    return;
  }

  deleteExerciseEditorBtn.disabled =
    true;

  saveExerciseEditorBtn.disabled =
    true;

  deleteExerciseEditorBtn.textContent =
    "삭제 중...";

  setExerciseEditorMessage(
    "운동을 삭제하고 있습니다."
  );

  try {
    await routineApi
      .deleteActiveRoutineExercise(
        editingExerciseIndex
      );

    toast(
      `"${exercise.name}" 운동이 삭제되었습니다.`
    );

    closeExerciseEditor();
  } catch (error) {
    console.error(
      "[JYM Log] 운동 삭제 실패",
      error
    );

    setExerciseEditorMessage(
      error.message ||
      "운동을 삭제하지 못했습니다.",
      true
    );
  } finally {
    deleteExerciseEditorBtn.disabled =
      false;

    saveExerciseEditorBtn.disabled =
      false;

    deleteExerciseEditorBtn.textContent =
      "이 운동 삭제";
  }
}

document.addEventListener("click", e => {
    const nav = e.target.closest("[data-nav]"); if (nav) { navigate(nav.dataset.nav); return; }
    const sessionCard =
      e.target.closest(
        "[data-session-id]"
      );

    if (sessionCard) {
      void loadSessionDetail(
        sessionCard.dataset.sessionId
      );

      return;
    }

    const exerciseMoveButton =
      e.target.closest(
        "[data-move-exercise]"
      );

    if (exerciseMoveButton) {
      void moveExerciseByButton(
        Number(
          exerciseMoveButton.dataset
            .exerciseIndex
        ),
        exerciseMoveButton.dataset
          .moveExercise
      );

      return;
    }

    const exerciseEditButton =
      e.target.closest(
        "[data-edit-exercise-index]"
      );

    if (exerciseEditButton) {
      openExerciseEditor(
        Number(
          exerciseEditButton.dataset
            .editExerciseIndex
        )
      );

      return;
    }

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

document.addEventListener(
  "pointerdown",
  (event) => {
    const dragHandle =
      event.target.closest(
        "[data-drag-exercise-index]"
      );

    if (!dragHandle) {
      return;
    }

    startRoutineDrag(
      event,
      dragHandle
    );
  }
);

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

if (sessionDetailBackBtn) {
  sessionDetailBackBtn.addEventListener(
    "click",
    () => {
      navigate("history");
    }
  );
}

if (routineInfoForm) {
  routineInfoForm.addEventListener(
    "submit",
    saveRoutineInfo
  );
}

if (exerciseEditorForm) {
  exerciseEditorForm.addEventListener(
    "submit",
    saveExerciseEditor
  );
}

if (exerciseTypeInput) {
  exerciseTypeInput.addEventListener(
    "change",
    syncExerciseTypeFields
  );
}

if (exerciseMinRepsInput) {
  exerciseMinRepsInput.addEventListener(
    "input",
    () => {
      if (
        exerciseTypeInput.value ===
        "고정 반복형"
      ) {
        exerciseMaxRepsInput.value =
          exerciseMinRepsInput.value;
      }
    }
  );
}

if (cancelExerciseEditorBtn) {
  cancelExerciseEditorBtn.addEventListener(
    "click",
    closeExerciseEditor
  );
}

if (closeExerciseEditorBtn) {
  closeExerciseEditorBtn.addEventListener(
    "click",
    closeExerciseEditor
  );
}

if (exerciseEditorModal) {
  exerciseEditorModal.addEventListener(
    "click",
    (event) => {
      if (
        event.target ===
        exerciseEditorModal
      ) {
        closeExerciseEditor();
      }
    }
  );
}

if (addExerciseBtn) {
  addExerciseBtn.addEventListener(
    "click",
    openExerciseCreator
  );
}

if (deleteExerciseEditorBtn) {
  deleteExerciseEditorBtn.addEventListener(
    "click",
    deleteExerciseFromRoutine
  );
}

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

    renderRoutineMetadata();
    renderHome();
    renderRoutine();
    
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
  "jym-log:routine-ready",
  (event) => {
    const routine =
      event.detail?.routine;

    renderRoutineMetadata(
      routine
    );

    renderHome();
    renderRoutine();

    console.info(
      "[JYM Log] 사용자 루틴 화면 반영 완료"
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

window.addEventListener(
  "jym-log:sync-conflict",
  () => {
    updateSyncStatus(
      "conflict",
      "동기화 충돌"
    );

    toast(
      "다른 기기의 변경이 감지되었습니다. 이 기기의 기록은 안전하게 보관했습니다."
    );
  }
);

applyAppMetadata();

renderHome();
renderRoutine();

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