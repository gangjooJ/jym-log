import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
  db
} from "./firebase-client.js";

window.JYMLog =
  window.JYMLog || {};

const workout =
  window.JYMLog.workout;

const SCHEDULE_SCHEMA_VERSION = 1;

const SCHEDULE_DOCUMENT_ID =
  "routineSchedule";

const DAY_ORDER = [
  {
    key: "monday",
    label: "월요일"
  },
  {
    key: "tuesday",
    label: "화요일"
  },
  {
    key: "wednesday",
    label: "수요일"
  },
  {
    key: "thursday",
    label: "목요일"
  },
  {
    key: "friday",
    label: "금요일"
  },
  {
    key: "saturday",
    label: "토요일"
  },
  {
    key: "sunday",
    label: "일요일"
  }
];

const DATE_DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
];

const routineScheduleGrid =
  document.getElementById(
    "routineScheduleGrid"
  );

const saveRoutineScheduleBtn =
  document.getElementById(
    "saveRoutineScheduleBtn"
  );

const routineScheduleMessage =
  document.getElementById(
    "routineScheduleMessage"
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

let currentSchedule =
  createDefaultSchedule();

let scheduleLoaded = false;

let scheduleBusy = false;

let applyingTodayRoutine = false;

function cloneValue(value) {
  return JSON.parse(
    JSON.stringify(value)
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

function createManualEntry() {
  return {
    type: "manual",
    routineId: null
  };
}

function createDefaultWeek() {
  return DAY_ORDER.reduce(
    (week, day) => {
      week[day.key] =
        createManualEntry();

      return week;
    },
    {}
  );
}

function createDefaultSchedule(
  userId = ""
) {
  return {
    userId,
    schemaVersion:
      SCHEDULE_SCHEMA_VERSION,
    week: createDefaultWeek()
  };
}

function normalizeScheduleEntry(
  input
) {
  const type =
    input?.type === "routine" ||
    input?.type === "rest" ||
    input?.type === "manual"
      ? input.type
      : "manual";

  if (type === "routine") {
    const routineId =
      String(
        input?.routineId || ""
      ).trim();

    if (routineId) {
      return {
        type: "routine",
        routineId
      };
    }
  }

  if (type === "rest") {
    return {
      type: "rest",
      routineId: null
    };
  }

  return createManualEntry();
}

function normalizeSchedule(
  data,
  userId
) {
  const normalizedWeek =
    createDefaultWeek();

  DAY_ORDER.forEach(
    (day) => {
      normalizedWeek[day.key] =
        normalizeScheduleEntry(
          data?.week?.[day.key]
        );
    }
  );

  return {
    userId,
    schemaVersion:
      SCHEDULE_SCHEMA_VERSION,
    week: normalizedWeek
  };
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

function getRoutineApi() {
  return window.JYMLog.routines;
}

function getAvailableRoutines() {
  const routines =
    getRoutineApi()?.routines;

  return Array.isArray(routines)
    ? routines
    : [];
}

function getTodayDayKey(
  date = new Date()
) {
  return (
    DATE_DAY_KEYS[
      date.getDay()
    ] || "monday"
  );
}

function getTodayEntry() {
  return normalizeScheduleEntry(
    currentSchedule.week[
      getTodayDayKey()
    ]
  );
}

function findRoutine(
  routineId
) {
  return getAvailableRoutines()
    .find(
      (routine) =>
        routine.id === routineId
    ) || null;
}

function setScheduleMessage(
  message,
  status = "default"
) {
  if (!routineScheduleMessage) {
    return;
  }

  routineScheduleMessage.textContent =
    message;

  routineScheduleMessage
    .classList.toggle(
      "success",
      status === "success"
    );

  routineScheduleMessage
    .classList.toggle(
      "error",
      status === "error"
    );
}

function setScheduleBusy(
  isBusy
) {
  scheduleBusy = isBusy;

  routineScheduleGrid
    ?.querySelectorAll("select")
    .forEach(
      (select) => {
        select.disabled = isBusy;
      }
    );

  if (saveRoutineScheduleBtn) {
    saveRoutineScheduleBtn.disabled =
      isBusy;

    saveRoutineScheduleBtn
      .setAttribute(
        "aria-busy",
        String(isBusy)
      );

    saveRoutineScheduleBtn
      .textContent =
        isBusy
          ? "일정 저장 중..."
          : "주간 일정 저장";
  }
}

function buildScheduleOptions(
  selectedEntry
) {
  const selectedValue =
    selectedEntry.type === "routine"
      ? `routine:${selectedEntry.routineId}`
      : selectedEntry.type;

  const staticOptions = [
    {
      value: "manual",
      label: "직접 선택"
    },
    {
      value: "rest",
      label: "휴식"
    }
  ];

  const routineOptions =
    getAvailableRoutines().map(
      (routine) => ({
        value:
          `routine:${routine.id}`,
        label:
          routine.name
      })
    );

  return [
    ...staticOptions,
    ...routineOptions
  ]
    .map(
      (option) => `
        <option
          value="${escapeHtml(
            option.value
          )}"
          ${
            option.value ===
            selectedValue
              ? "selected"
              : ""
          }
        >
          ${escapeHtml(
            option.label
          )}
        </option>
      `
    )
    .join("");
}

function renderScheduleEditor() {
  if (!routineScheduleGrid) {
    return;
  }

  routineScheduleGrid.innerHTML =
    DAY_ORDER
      .map(
        (day) => {
          const entry =
            normalizeScheduleEntry(
              currentSchedule
                .week[day.key]
            );

          return `
            <div
              class="routine-schedule-row"
            >
              <label
                for="routineSchedule-${day.key}"
              >
                ${day.label}
              </label>

              <select
                id="routineSchedule-${day.key}"
                data-schedule-day="${day.key}"
                ${scheduleBusy ? "disabled" : ""}
              >
                ${buildScheduleOptions(
                  entry
                )}
              </select>
            </div>
          `;
        }
      )
      .join("");
}

function renderHomeSchedule() {
  if (
    !homeScheduleStatus ||
    !homeScheduleName
  ) {
    return;
  }

  if (!scheduleLoaded) {
    homeScheduleStatus.innerHTML =
      '<span class="dot"></span> 일정 확인 중';

    homeScheduleName.textContent =
      "불러오는 중";

    return;
  }

  const todayEntry =
    getTodayEntry();

  if (
    todayEntry.type === "routine"
  ) {
    const routine =
      findRoutine(
        todayEntry.routineId
      );

    if (routine) {
      const isApplied =
        getRoutineApi()
          ?.activeRoutineId ===
        routine.id;

      homeScheduleStatus.innerHTML =
        `<span class="dot"></span> ${
          isApplied
            ? "오늘 일정 적용됨"
            : "오늘 일정"
        }`;

      homeScheduleName.textContent =
        routine.name;

      return;
    }

    homeScheduleStatus.innerHTML =
      '<span class="dot"></span> 일정 확인 필요';

    homeScheduleName.textContent =
      "삭제된 루틴";

    return;
  }

  if (
    todayEntry.type === "rest"
  ) {
    homeScheduleStatus.innerHTML =
      '<span class="dot"></span> 오늘은 회복일';

    homeScheduleName.textContent =
      "휴식";

    return;
  }

  homeScheduleStatus.innerHTML =
    '<span class="dot"></span> 오늘 루틴 직접 선택';

  homeScheduleName.textContent =
    getRoutineApi()
      ?.activeRoutine
      ?.name ||
    "직접 선택";
}

function emitScheduleReady() {
  window.dispatchEvent(
    new CustomEvent(
      "jym-log:routine-schedule-ready",
      {
        detail: {
          schedule:
            cloneValue(
              currentSchedule
            ),

          today:
            cloneValue(
              getTodayEntry()
            )
        }
      }
    )
  );
}

function parseScheduleSelectValue(
  value
) {
  const normalizedValue =
    String(value || "");

  if (
    normalizedValue.startsWith(
      "routine:"
    )
  ) {
    const routineId =
      normalizedValue
        .slice("routine:".length)
        .trim();

    if (
      routineId &&
      findRoutine(routineId)
    ) {
      return {
        type: "routine",
        routineId
      };
    }
  }

  if (
    normalizedValue === "rest"
  ) {
    return {
      type: "rest",
      routineId: null
    };
  }

  return createManualEntry();
}

function readScheduleFromEditor() {
  const week =
    createDefaultWeek();

  routineScheduleGrid
    ?.querySelectorAll(
      "[data-schedule-day]"
    )
    .forEach(
      (select) => {
        const dayKey =
          select.dataset
            .scheduleDay;

        if (!dayKey) {
          return;
        }

        week[dayKey] =
          parseScheduleSelectValue(
            select.value
          );
      }
    );

  return {
    userId:
      activeUserId,
    schemaVersion:
      SCHEDULE_SCHEMA_VERSION,
    week
  };
}

async function loadSchedule(
  userId
) {
  if (!userId) {
    throw new Error(
      "일정을 불러올 사용자 UID가 없습니다."
    );
  }

  activeUserId = userId;

  setScheduleMessage(
    "주간 일정을 불러오고 있습니다."
  );

  const scheduleSnapshot =
    await getDoc(
      getScheduleDocument(
        userId
      )
    );

  currentSchedule =
    scheduleSnapshot.exists()
      ? normalizeSchedule(
          scheduleSnapshot.data(),
          userId
        )
      : createDefaultSchedule(
          userId
        );

  scheduleLoaded = true;

  renderScheduleEditor();
  renderHomeSchedule();
  emitScheduleReady();

  setScheduleMessage(
    scheduleSnapshot.exists()
      ? "저장된 주간 일정을 불러왔습니다."
      : "요일별로 루틴, 휴식 또는 직접 선택을 지정할 수 있습니다."
  );

  return cloneValue(
    currentSchedule
  );
}

async function saveScheduleData(
  schedule
) {
  if (!activeUserId) {
    throw new Error(
      "일정을 저장할 로그인 사용자를 찾을 수 없습니다."
    );
  }

  await setDoc(
    getScheduleDocument(
      activeUserId
    ),
    {
      ...schedule,
      userId:
        activeUserId,
      schemaVersion:
        SCHEDULE_SCHEMA_VERSION,
      updatedAt:
        serverTimestamp()
    },
    {
      merge: true
    }
  );
}

async function saveSchedule() {
  if (
    scheduleBusy ||
    !scheduleLoaded
  ) {
    return;
  }

  setScheduleBusy(true);

  setScheduleMessage(
    "주간 일정을 저장하고 있습니다."
  );

  try {
    const nextSchedule =
      readScheduleFromEditor();

    await saveScheduleData(
      nextSchedule
    );

    currentSchedule =
      normalizeSchedule(
        nextSchedule,
        activeUserId
      );

    renderScheduleEditor();
    renderHomeSchedule();
    emitScheduleReady();

    setScheduleMessage(
      "주간 일정이 저장되었습니다.",
      "success"
    );

    await applyTodaySchedule();
  } catch (error) {
    console.error(
      "[JYM Log] 주간 일정 저장 실패",
      error
    );

    setScheduleMessage(
      error.message ||
      "주간 일정을 저장하지 못했습니다.",
      "error"
    );
  } finally {
    setScheduleBusy(false);
  }
}

async function applyTodaySchedule() {
  if (
    !scheduleLoaded ||
    applyingTodayRoutine
  ) {
    return null;
  }

  const routineApi =
    getRoutineApi();

  if (!routineApi) {
    return null;
  }

  const todayEntry =
    getTodayEntry();

  if (
    todayEntry.type !==
    "routine"
  ) {
    renderHomeSchedule();
    return null;
  }

  const targetRoutine =
    findRoutine(
      todayEntry.routineId
    );

  if (!targetRoutine) {
    renderHomeSchedule();
    return null;
  }

  if (
    routineApi.activeRoutineId ===
    targetRoutine.id
  ) {
    renderHomeSchedule();
    return targetRoutine;
  }

  if (
    workout.state.started &&
    !workout.state.completed
  ) {
    setScheduleMessage(
      `오늘 일정은 "${targetRoutine.name}"이지만 진행 중인 운동이 있어 자동 전환하지 않았습니다.`,
      "error"
    );

    renderHomeSchedule();
    return null;
  }

  applyingTodayRoutine = true;

  try {
    const routine =
      await routineApi
        .switchActiveRoutine(
          targetRoutine.id
        );

    setScheduleMessage(
      `오늘 일정에 따라 "${routine.name}" 루틴을 적용했습니다.`,
      "success"
    );

    renderHomeSchedule();

    return routine;
  } catch (error) {
    console.error(
      "[JYM Log] 오늘 루틴 자동 적용 실패",
      error
    );

    setScheduleMessage(
      error.message ||
      "오늘 루틴을 자동으로 적용하지 못했습니다.",
      "error"
    );

    return null;
  } finally {
    applyingTodayRoutine = false;
  }
}

async function removeRoutineReferences(
  routineId
) {
  const normalizedRoutineId =
    String(routineId || "")
      .trim();

  if (
    !normalizedRoutineId ||
    !scheduleLoaded
  ) {
    return false;
  }

  let changed = false;

  const nextWeek =
    cloneValue(
      currentSchedule.week
    );

  DAY_ORDER.forEach(
    (day) => {
      const entry =
        normalizeScheduleEntry(
          nextWeek[day.key]
        );

      if (
        entry.type === "routine" &&
        entry.routineId ===
          normalizedRoutineId
      ) {
        nextWeek[day.key] =
          createManualEntry();

        changed = true;
      }
    }
  );

  if (!changed) {
    return false;
  }

  const nextSchedule = {
    ...currentSchedule,
    week: nextWeek
  };

  await saveScheduleData(
    nextSchedule
  );

  currentSchedule =
    normalizeSchedule(
      nextSchedule,
      activeUserId
    );

  renderScheduleEditor();
  renderHomeSchedule();
  emitScheduleReady();

  setScheduleMessage(
    "삭제한 루틴이 포함된 요일을 직접 선택으로 변경했습니다.",
    "success"
  );

  return true;
}

async function handleRoutineReady(
  event
) {
  const routine =
    event.detail?.routine;

  if (!routine?.userId) {
    return;
  }

  if (
    activeUserId !==
      routine.userId ||
    !scheduleLoaded
  ) {
    try {
      await loadSchedule(
        routine.userId
      );

      await applyTodaySchedule();
    } catch (error) {
      console.error(
        "[JYM Log] 주간 일정 초기화 실패",
        error
      );

      setScheduleMessage(
        error.message ||
        "주간 일정을 불러오지 못했습니다.",
        "error"
      );
    }

    return;
  }

  renderScheduleEditor();
  renderHomeSchedule();
}

saveRoutineScheduleBtn
  ?.addEventListener(
    "click",
    () => {
      void saveSchedule();
    }
  );

window.addEventListener(
  "jym-log:routine-ready",
  (event) => {
    void handleRoutineReady(
      event
    );
  }
);

window.JYMLog.routineSchedule =
  Object.freeze({
    loadSchedule,
    saveSchedule,
    applyTodaySchedule,
    removeRoutineReferences,

    get schedule() {
      return cloneValue(
        currentSchedule
      );
    },

    get today() {
      return cloneValue(
        getTodayEntry()
      );
    }
  });

const existingRoutine =
  getRoutineApi()?.activeRoutine;

if (existingRoutine?.userId) {
  void handleRoutineReady({
    detail: {
      routine:
        existingRoutine
    }
  });
}
