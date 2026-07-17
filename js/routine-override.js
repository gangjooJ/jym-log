import {
  deleteField,
  doc,
  FieldPath,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
  db
} from "./firebase-client.js";

window.JYMLog =
  window.JYMLog || {};

const SCHEDULE_SCHEMA_VERSION = 1;

const SCHEDULE_DOCUMENT_ID =
  "routineSchedule";

const todayRoutineOverrideSelect =
  document.getElementById(
    "todayRoutineOverrideSelect"
  );

const applyTodayRoutineOverrideBtn =
  document.getElementById(
    "applyTodayRoutineOverrideBtn"
  );

const clearTodayRoutineOverrideBtn =
  document.getElementById(
    "clearTodayRoutineOverrideBtn"
  );

const todayRoutineOverrideMessage =
  document.getElementById(
    "todayRoutineOverrideMessage"
  );

const homeScheduleStatus =
  document.getElementById(
    "homeScheduleStatus"
  );

const homeScheduleName =
  document.getElementById(
    "homeScheduleName"
  );

let activeUserId = null;

let overrides = {};

let overrideLoaded = false;

let overrideBusy = false;

let applyingOverride = false;

function cloneValue(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getRoutineApi() {
  return window.JYMLog.routines;
}

function getRoutines() {
  const routines =
    getRoutineApi()?.routines;

  return Array.isArray(routines)
    ? routines
    : [];
}

function findRoutine(routineId) {
  return (
    getRoutines().find(
      (routine) =>
        routine.id === routineId
    ) || null
  );
}

function getDateKey(
  date = new Date()
) {
  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          window.JYMLog.config
            ?.timezone ||
          "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    );

  const parts =
    formatter.formatToParts(
      date
    );

  const values =
    Object.fromEntries(
      parts.map(
        (part) => [
          part.type,
          part.value
        ]
      )
    );

  return [
    values.year,
    values.month,
    values.day
  ].join("-");
}

function getScheduleDocument(
  userId
) {
  return doc(
    db,
    "users",
    userId,
    "appData",
    SCHEDULE_DOCUMENT_ID
  );
}

function normalizeOverrides(
  input
) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    return {};
  }

  return Object.entries(input)
    .reduce(
      (
        result,
        [dateKey, entry]
      ) => {
        const routineId =
          String(
            entry?.routineId || ""
          ).trim();

        if (
          entry?.type ===
            "routine" &&
          routineId
        ) {
          result[dateKey] = {
            type: "routine",
            routineId,
            routineName:
              String(
                entry.routineName ||
                ""
              ),
            dateKey
          };
        }

        return result;
      },
      {}
    );
}

function getTodayOverride() {
  return (
    overrides[
      getDateKey()
    ] || null
  );
}

function getWeeklyEntry() {
  return (
    window.JYMLog
      .routineSchedule
      ?.today || {
      type: "manual",
      routineId: null
    }
  );
}

function setOverrideMessage(
  message,
  status = "default"
) {
  if (
    !todayRoutineOverrideMessage
  ) {
    return;
  }

  todayRoutineOverrideMessage
    .textContent = message;

  todayRoutineOverrideMessage
    .classList.toggle(
      "success",
      status === "success"
    );

  todayRoutineOverrideMessage
    .classList.toggle(
      "error",
      status === "error"
    );
}

function updateControlState() {
  const hasOverride =
    Boolean(
      getTodayOverride()
    );

  const selectedRoutineId =
    todayRoutineOverrideSelect
      ?.value || "";

  if (
    todayRoutineOverrideSelect
  ) {
    todayRoutineOverrideSelect
      .disabled =
        overrideBusy ||
        !overrideLoaded;
  }

  if (
    applyTodayRoutineOverrideBtn
  ) {
    applyTodayRoutineOverrideBtn
      .disabled =
        overrideBusy ||
        !overrideLoaded ||
        !selectedRoutineId;

    applyTodayRoutineOverrideBtn
      .setAttribute(
        "aria-busy",
        String(overrideBusy)
      );
  }

  if (
    clearTodayRoutineOverrideBtn
  ) {
    clearTodayRoutineOverrideBtn
      .disabled =
        overrideBusy ||
        !overrideLoaded ||
        !hasOverride;
  }
}

function setOverrideBusy(
  isBusy
) {
  overrideBusy = isBusy;

  updateControlState();
}

function renderOverrideControl() {
  if (
    !todayRoutineOverrideSelect
  ) {
    return;
  }

  const todayOverride =
    getTodayOverride();

  const options = [
    `
      <option value="">
        오늘 수행할 루틴 선택
      </option>
    `,
    ...getRoutines().map(
      (routine) => `
        <option
          value="${escapeHtml(
            routine.id
          )}"
          ${
            routine.id ===
            todayOverride
              ?.routineId
              ? "selected"
              : ""
          }
        >
          ${escapeHtml(
            routine.name
          )}
        </option>
      `
    )
  ];

  todayRoutineOverrideSelect
    .innerHTML =
      options.join("");

  updateControlState();
}

function renderOverrideStatus() {
  const todayOverride =
    getTodayOverride();

  if (!todayOverride) {
    return;
  }

  const routine =
    findRoutine(
      todayOverride.routineId
    );

  if (!routine) {
    return;
  }

  if (homeScheduleStatus) {
    homeScheduleStatus.innerHTML =
      '<span class="dot"></span> 오늘만 변경 적용됨';
  }

  if (homeScheduleName) {
    homeScheduleName.textContent =
      routine.name;
  }
}

function isWorkoutInProgress() {
  const state =
    window.JYMLog.workout
      ?.state;

  return Boolean(
    state?.started &&
    !state?.completed
  );
}

async function saveTodayOverride(
  routine
) {
  if (!activeUserId) {
    throw new Error(
      "로그인 사용자를 확인할 수 없습니다."
    );
  }

  const dateKey =
    getDateKey();

  const scheduleDocument =
    getScheduleDocument(
      activeUserId
    );

  const scheduleSnapshot =
    await getDoc(
      scheduleDocument
    );

  const entry = {
    type: "routine",
    routineId:
      routine.id,
    routineName:
      routine.name,
    dateKey,
    updatedAtMillis:
      Date.now()
  };

  if (
    scheduleSnapshot.exists()
  ) {
    await updateDoc(
      scheduleDocument,
      new FieldPath(
        "overrides",
        dateKey
      ),
      entry,
      "updatedAt",
      serverTimestamp()
    );
  } else {
    await setDoc(
      scheduleDocument,
      {
        userId:
          activeUserId,
        schemaVersion:
          SCHEDULE_SCHEMA_VERSION,
        week: {},
        overrides: {
          [dateKey]:
            entry
        },
        updatedAt:
          serverTimestamp()
      }
    );
  }

  overrides[dateKey] =
    entry;

  return entry;
}

async function deleteTodayOverride() {
  const dateKey =
    getDateKey();

  if (!activeUserId) {
    delete overrides[dateKey];
    return;
  }

  const scheduleDocument =
    getScheduleDocument(
      activeUserId
    );

  const scheduleSnapshot =
    await getDoc(
      scheduleDocument
    );

  if (
    scheduleSnapshot.exists()
  ) {
    await updateDoc(
      scheduleDocument,
      new FieldPath(
        "overrides",
        dateKey
      ),
      deleteField(),
      "updatedAt",
      serverTimestamp()
    );
  }

  delete overrides[dateKey];
}

async function applySavedOverride() {
  if (
    !overrideLoaded ||
    applyingOverride
  ) {
    return null;
  }

  const todayOverride =
    getTodayOverride();

  if (!todayOverride) {
    return null;
  }

  const routineApi =
    getRoutineApi();

  const targetRoutine =
    findRoutine(
      todayOverride.routineId
    );

  if (!targetRoutine) {
    await deleteTodayOverride();

    renderOverrideControl();

    setOverrideMessage(
      "삭제된 루틴의 오늘 변경 설정을 해제했습니다.",
      "error"
    );

    return (
      window.JYMLog
        .routineSchedule
        ?.applyTodaySchedule?.() ||
      null
    );
  }

  if (
    isWorkoutInProgress()
  ) {
    setOverrideMessage(
      `오늘만 변경 루틴은 "${targetRoutine.name}"이지만 진행 중인 운동은 변경하지 않았습니다.`,
      "error"
    );

    renderOverrideStatus();

    return null;
  }

  if (
    routineApi
      ?.activeRoutineId ===
    targetRoutine.id
  ) {
    renderOverrideControl();
    renderOverrideStatus();

    return targetRoutine;
  }

  applyingOverride = true;

  try {
    const routine =
      await routineApi
        .switchActiveRoutine(
          targetRoutine.id
        );

    renderOverrideControl();
    renderOverrideStatus();

    setOverrideMessage(
      `"${routine.name}" 루틴을 오늘만 적용했습니다.`,
      "success"
    );

    return routine;
  } catch (error) {
    console.error(
      "[JYM Log] 오늘만 루틴 적용 실패",
      error
    );

    setOverrideMessage(
      error.message ||
      "오늘만 루틴을 적용하지 못했습니다.",
      "error"
    );

    return null;
  } finally {
    applyingOverride = false;
  }
}

async function applySelectedOverride() {
  if (
    overrideBusy ||
    !overrideLoaded
  ) {
    return;
  }

  if (
    isWorkoutInProgress()
  ) {
    setOverrideMessage(
      "운동 진행 중에는 오늘의 루틴을 변경할 수 없습니다.",
      "error"
    );

    return;
  }

  const routineId =
    todayRoutineOverrideSelect
      ?.value || "";

  const routine =
    findRoutine(routineId);

  if (!routine) {
    setOverrideMessage(
      "오늘 수행할 루틴을 선택해 주세요.",
      "error"
    );

    return;
  }

  setOverrideBusy(true);

  setOverrideMessage(
    "오늘의 루틴을 변경하고 있습니다."
  );

  try {
    await saveTodayOverride(
      routine
    );

    await applySavedOverride();
  } catch (error) {
    console.error(
      "[JYM Log] 오늘만 루틴 저장 실패",
      error
    );

    setOverrideMessage(
      error.message ||
      "오늘만 루틴을 저장하지 못했습니다.",
      "error"
    );
  } finally {
    setOverrideBusy(false);
  }
}

async function clearSelectedOverride() {
  if (
    overrideBusy ||
    !overrideLoaded
  ) {
    return;
  }

  if (
    isWorkoutInProgress()
  ) {
    setOverrideMessage(
      "운동 진행 중에는 오늘의 루틴을 변경할 수 없습니다.",
      "error"
    );

    return;
  }

  setOverrideBusy(true);

  setOverrideMessage(
    "오늘만 변경 설정을 해제하고 있습니다."
  );

  try {
    await deleteTodayOverride();

    renderOverrideControl();

    setOverrideMessage(
      "오늘만 변경을 해제하고 주간 일정으로 돌아갑니다.",
      "success"
    );

    await window.JYMLog
      .routineSchedule
      ?.applyTodaySchedule?.();
  } catch (error) {
    console.error(
      "[JYM Log] 오늘만 루틴 해제 실패",
      error
    );

    setOverrideMessage(
      error.message ||
      "오늘만 변경을 해제하지 못했습니다.",
      "error"
    );
  } finally {
    setOverrideBusy(false);
  }
}

async function loadOverrideState(
  userId
) {
  if (!userId) {
    return;
  }

  activeUserId = userId;

  overrideLoaded = false;

  renderOverrideControl();

  const scheduleSnapshot =
    await getDoc(
      getScheduleDocument(
        userId
      )
    );

  overrides =
    scheduleSnapshot.exists()
      ? normalizeOverrides(
          scheduleSnapshot
            .data()
            ?.overrides
        )
      : {};

  overrideLoaded = true;

  renderOverrideControl();

  const todayOverride =
    getTodayOverride();

  if (
    todayOverride &&
    !findRoutine(
      todayOverride.routineId
    )
  ) {
    await deleteTodayOverride();

    renderOverrideControl();

    setOverrideMessage(
      "삭제된 루틴의 오늘 변경 설정을 정리했습니다.",
      "error"
    );
  }

  await applySavedOverride();
}

function getWorkoutContext() {
  const routineApi =
    getRoutineApi();

  const activeRoutine =
    routineApi?.activeRoutine;

  const weeklyEntry =
    getWeeklyEntry();

  const weeklyRoutine =
    weeklyEntry.type ===
      "routine"
      ? findRoutine(
          weeklyEntry.routineId
        )
      : null;

  const todayOverride =
    getTodayOverride();

  const overrideRoutine =
    todayOverride
      ? findRoutine(
          todayOverride.routineId
        )
      : null;

  const scheduleSource =
    overrideRoutine
      ? "override"
      : weeklyEntry.type ===
          "routine"
        ? "weekly"
        : weeklyEntry.type ===
            "rest"
          ? "rest"
          : "manual";

  return {
    routineId:
      activeRoutine?.id ||
      "main",

    routineName:
      activeRoutine?.name ||
      "운동 루틴",

    routineCode:
      activeRoutine?.code ||
      activeRoutine?.id ||
      "main",

    scheduledDate:
      getDateKey(),

    scheduleSource,

    scheduledType:
      weeklyEntry.type ||
      "manual",

    scheduledRoutineId:
      weeklyRoutine?.id ||
      null,

    scheduledRoutineName:
      weeklyRoutine?.name ||
      null,

    overrideRoutineId:
      overrideRoutine?.id ||
      null,

    overrideRoutineName:
      overrideRoutine?.name ||
      null
  };
}

async function handleScheduleReady(
  event
) {
  const userId =
    event.detail
      ?.schedule
      ?.userId;

  if (!userId) {
    return;
  }

  if (
    activeUserId !== userId ||
    !overrideLoaded
  ) {
    try {
      await loadOverrideState(
        userId
      );
    } catch (error) {
      console.error(
        "[JYM Log] 오늘만 루틴 초기화 실패",
        error
      );

      overrideLoaded = true;

      renderOverrideControl();

      setOverrideMessage(
        error.message ||
        "오늘만 루틴 설정을 불러오지 못했습니다.",
        "error"
      );
    }

    return;
  }

  renderOverrideControl();

  await applySavedOverride();
}

todayRoutineOverrideSelect
  ?.addEventListener(
    "change",
    updateControlState
  );

applyTodayRoutineOverrideBtn
  ?.addEventListener(
    "click",
    () => {
      void applySelectedOverride();
    }
  );

clearTodayRoutineOverrideBtn
  ?.addEventListener(
    "click",
    () => {
      void clearSelectedOverride();
    }
  );

window.addEventListener(
  "jym-log:routine-schedule-ready",
  (event) => {
    void handleScheduleReady(
      event
    );
  }
);

window.addEventListener(
  "jym-log:routine-ready",
  () => {
    if (!overrideLoaded) {
      return;
    }

    renderOverrideControl();
    renderOverrideStatus();
  }
);

window.JYMLog.routineOverride =
  Object.freeze({
    loadOverrideState,
    applySavedOverride,
    getWorkoutContext,

    get hasTodayOverride() {
      return Boolean(
        getTodayOverride()
      );
    },

    get todayOverride() {
      return cloneValue(
        getTodayOverride()
      );
    }
  });

renderOverrideControl();