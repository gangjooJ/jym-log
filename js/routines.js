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

const ROUTINE_SCHEMA_VERSION = 1;
const ACTIVE_ROUTINE_ID = "main";

let activeRoutine = null;

function cloneData(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function validateRoutineName(value) {
  const name =
    normalizeText(value);

  const length =
    Array.from(name).length;

  if (length < 2) {
    throw new Error(
      "루틴 이름은 2자 이상 입력해 주세요."
    );
  }

  if (length > 30) {
    throw new Error(
      "루틴 이름은 30자 이하로 입력해 주세요."
    );
  }

  return name;
}

function normalizeDescription(value) {
  const description =
    normalizeText(value);

  const length =
    Array.from(description).length;

  if (length > 60) {
    throw new Error(
      "루틴 설명은 60자 이하로 입력해 주세요."
    );
  }

  return description ||
    "사용자 설정 루틴";
}

function validateExerciseInput(
  currentExercise,
  input,
  exerciseIndex
) {
  const name =
    normalizeText(input.name);

  const nameLength =
    Array.from(name).length;

  if (nameLength < 2) {
    throw new Error(
      "운동 이름은 2자 이상 입력해 주세요."
    );
  }

  if (nameLength > 30) {
    throw new Error(
      "운동 이름은 30자 이하로 입력해 주세요."
    );
  }

  const type =
    input.type === "고정 반복형"
      ? "고정 반복형"
      : "반복 범위형";

  const weight =
    Number(input.weight);

  if (
    !Number.isFinite(weight) ||
    weight < 0 ||
    weight > 1000
  ) {
    throw new Error(
      "중량은 0~1000kg 사이로 입력해 주세요."
    );
  }

  const sets =
    Number(input.sets);

  if (
    !Number.isInteger(sets) ||
    sets < 1 ||
    sets > 20
  ) {
    throw new Error(
      "세트 수는 1~20 사이의 정수로 입력해 주세요."
    );
  }

  const minReps =
    Number(input.min);

  if (
    !Number.isInteger(minReps) ||
    minReps < 1 ||
    minReps > 100
  ) {
    throw new Error(
      "최소 반복 수는 1~100 사이로 입력해 주세요."
    );
  }

  let maxReps =
    type === "고정 반복형"
      ? minReps
      : Number(input.max);

  if (
    !Number.isInteger(maxReps) ||
    maxReps < minReps ||
    maxReps > 100
  ) {
    throw new Error(
      "최대 반복 수는 최소 반복 수 이상, 100회 이하로 입력해 주세요."
    );
  }

  const rest =
    Number(input.rest);

  if (
    !Number.isInteger(rest) ||
    rest < 0 ||
    rest > 1800
  ) {
    throw new Error(
      "휴식 시간은 0~1800초 사이로 입력해 주세요."
    );
  }

  const increment =
    Number(input.increment);

  if (
    !Number.isFinite(increment) ||
    increment <= 0 ||
    increment > 100
  ) {
    throw new Error(
      "증량 단위는 0보다 크고 100kg 이하여야 합니다."
    );
  }

  return {
    ...currentExercise,

    id:
      currentExercise.id ||
      `exercise-${exerciseIndex + 1}`,

    order:
      exerciseIndex,

    name,

    icon:
      currentExercise.icon ||
      name.charAt(0),

    type,
    weight,
    sets,
    min:
      minReps,
    max:
      maxReps,
    rest,
    increment
  };
}

function emitRoutineReady() {
  window.dispatchEvent(
    new CustomEvent(
      "jym-log:routine-ready",
      {
        detail: {
          routine:
            activeRoutine
        }
      }
    )
  );
}

/**
 * 현재 기본 운동 목록으로
 * 첫 번째 사용자 루틴을 만듭니다.
 */
function createDefaultRoutine(userId) {
  const exercises =
    workout.exercises.map(
      (exercise, index) => ({
        ...cloneData(exercise),

        id:
          exercise.id ||
          `exercise-${index + 1}`,

        order:
          index
      })
    );

  return {
    id:
      ACTIVE_ROUTINE_ID,

    userId,

    schemaVersion:
      ROUTINE_SCHEMA_VERSION,

    name:
      "가슴 · 팔 A",

    code:
      "upper-a",

    description:
      "벤치프레스 중심",

    isActive:
      true,

    exercises
  };
}

function normalizeRoutine(
  routineId,
  data,
  userId
) {
  const fallbackRoutine =
    createDefaultRoutine(userId);

  const sourceExercises =
    Array.isArray(data?.exercises) &&
    data.exercises.length > 0
      ? data.exercises
      : fallbackRoutine.exercises;

  const exercises =
    [...sourceExercises]
      .sort(
        (first, second) =>
          (
            Number(first.order) || 0
          ) -
          (
            Number(second.order) || 0
          )
      )
      .map(
        (exercise, index) => ({
          ...cloneData(exercise),

          id:
            String(
              exercise.id ||
              `exercise-${index + 1}`
            ),

          order:
            index
        })
      );

  return {
    id:
      routineId,

    userId,

    schemaVersion:
      ROUTINE_SCHEMA_VERSION,

    name:
      normalizeText(data?.name) ||
      fallbackRoutine.name,

    code:
      normalizeText(data?.code) ||
      fallbackRoutine.code,

    description:
      normalizeText(
        data?.description
      ) ||
      fallbackRoutine.description,

    isActive:
      data?.isActive !== false,

    exercises
  };
}

/**
 * 로그인 사용자의 기본 루틴을 확인합니다.
 * 문서가 없으면 기본 루틴을 생성합니다.
 */
async function ensureActiveRoutine(
  userId
) {
  if (!userId) {
    throw new Error(
      "루틴을 불러올 사용자 UID가 없습니다."
    );
  }

  const routineDocument =
    doc(
      db,
      "users",
      userId,
      "routines",
      ACTIVE_ROUTINE_ID
    );

  const routineSnapshot =
    await getDoc(
      routineDocument
    );

  if (!routineSnapshot.exists()) {
    const defaultRoutine =
      createDefaultRoutine(userId);

    await setDoc(
      routineDocument,
      {
        ...defaultRoutine,

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      }
    );

    activeRoutine =
      defaultRoutine;

    console.info(
      "[JYM Log] 기본 운동 루틴 생성 완료"
    );
  } else {
    activeRoutine =
      normalizeRoutine(
        routineSnapshot.id,
        routineSnapshot.data(),
        userId
      );

    console.info(
      "[JYM Log] 사용자 운동 루틴 불러오기 완료"
    );
  }

  workout.replaceExercises(
    activeRoutine.exercises
  );

  emitRoutineReady();

  return activeRoutine;
}

/**
 * 활성 루틴의 이름과 설명을 수정합니다.
 */
async function updateActiveRoutineMetadata(
  nameValue,
  descriptionValue
) {
  if (!activeRoutine?.userId) {
    throw new Error(
      "수정할 사용자 루틴을 찾을 수 없습니다."
    );
  }

  const name =
    validateRoutineName(
      nameValue
    );

  const description =
    normalizeDescription(
      descriptionValue
    );

  const routineDocument =
    doc(
      db,
      "users",
      activeRoutine.userId,
      "routines",
      activeRoutine.id
    );

  await setDoc(
    routineDocument,
    {
      userId:
        activeRoutine.userId,

      schemaVersion:
        ROUTINE_SCHEMA_VERSION,

      name,
      description,

      updatedAt:
        serverTimestamp()
    },
    {
      merge: true
    }
  );

  activeRoutine = {
    ...activeRoutine,
    name,
    description
  };

  emitRoutineReady();

  console.info(
    "[JYM Log] 루틴 정보 저장 완료"
  );

  return activeRoutine;
}

function assertRoutineCanChange() {
  if (!activeRoutine?.userId) {
    throw new Error(
      "수정할 사용자 루틴을 찾을 수 없습니다."
    );
  }

  if (
    workout.state.started &&
    !workout.state.completed
  ) {
    throw new Error(
      "운동 진행 중에는 루틴을 수정할 수 없습니다."
    );
  }
}

function createExerciseId() {
  if (
    window.crypto &&
    typeof window.crypto.randomUUID ===
      "function"
  ) {
    return `exercise-${window.crypto.randomUUID()}`;
  }

  return [
    "exercise",
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 8)
  ].join("-");
}

/**
 * 운동 목록을 Firestore에 저장하고
 * 현재 앱 화면에도 적용합니다.
 */
async function saveActiveRoutineExercises(
  nextExercises,
  logMessage
) {
  const orderedExercises =
    nextExercises.map(
      (exercise, index) => ({
        ...exercise,
        order: index
      })
    );

  const routineDocument =
    doc(
      db,
      "users",
      activeRoutine.userId,
      "routines",
      activeRoutine.id
    );

  await setDoc(
    routineDocument,
    {
      userId:
        activeRoutine.userId,

      schemaVersion:
        ROUTINE_SCHEMA_VERSION,

      exercises:
        orderedExercises,

      updatedAt:
        serverTimestamp()
    },
    {
      merge: true
    }
  );

  activeRoutine = {
    ...activeRoutine,
    exercises:
      orderedExercises
  };

  workout.replaceExercises(
    orderedExercises,
    false
  );

  /*
   * 운동 구조가 바뀌면 이전 초안의
   * 세트 번호가 어긋날 수 있으므로 초기화합니다.
   */
  workout.resetWorkout();
  workout.saveState();

  emitRoutineReady();

  console.info(
    `[JYM Log] ${logMessage}`
  );

  return orderedExercises;
}

/**
 * 기존 운동 설정 수정
 */
async function updateActiveRoutineExercise(
  exerciseIndex,
  exerciseInput
) {
  assertRoutineCanChange();

  const currentExercise =
    activeRoutine.exercises[
      exerciseIndex
    ];

  if (!currentExercise) {
    throw new Error(
      "수정할 운동을 찾을 수 없습니다."
    );
  }

  const updatedExercise =
    validateExerciseInput(
      currentExercise,
      exerciseInput,
      exerciseIndex
    );

  const nextExercises =
    activeRoutine.exercises.map(
      (exercise, index) =>
        index === exerciseIndex
          ? updatedExercise
          : exercise
    );

  await saveActiveRoutineExercises(
    nextExercises,
    "운동 설정 저장 완료"
  );

  return updatedExercise;
}

/**
 * 새 운동 추가
 */
async function addActiveRoutineExercise(
  exerciseInput
) {
  assertRoutineCanChange();

  if (
    activeRoutine.exercises.length >=
    30
  ) {
    throw new Error(
      "하나의 루틴에는 운동을 최대 30개까지 추가할 수 있습니다."
    );
  }

  const exerciseIndex =
    activeRoutine.exercises.length;

  const exerciseDraft = {
    id:
      createExerciseId(),

    order:
      exerciseIndex,

    name:
      "새 운동",

    icon:
      "",

    type:
      "반복 범위형",

    weight:
      0,

    sets:
      3,

    min:
      8,

    max:
      12,

    rest:
      90,

    increment:
      2.5,

    previous:
      "이전 기록 없음"
  };

  const newExercise =
    validateExerciseInput(
      exerciseDraft,
      exerciseInput,
      exerciseIndex
    );

  const nextExercises = [
    ...activeRoutine.exercises,
    newExercise
  ];

  await saveActiveRoutineExercises(
    nextExercises,
    "새 운동 추가 완료"
  );

  return newExercise;
}

/**
 * 기존 운동 삭제
 */
async function deleteActiveRoutineExercise(
  exerciseIndex
) {
  assertRoutineCanChange();

  if (
    activeRoutine.exercises.length <= 1
  ) {
    throw new Error(
      "루틴에는 최소 1개의 운동이 필요합니다."
    );
  }

  const deletedExercise =
    activeRoutine.exercises[
      exerciseIndex
    ];

  if (!deletedExercise) {
    throw new Error(
      "삭제할 운동을 찾을 수 없습니다."
    );
  }

  const nextExercises =
    activeRoutine.exercises.filter(
      (_, index) =>
        index !== exerciseIndex
    );

  await saveActiveRoutineExercises(
    nextExercises,
    "운동 삭제 완료"
  );

  return deletedExercise;
}

window.JYMLog.routines =
  Object.freeze({
    ensureActiveRoutine,
    updateActiveRoutineMetadata,
    updateActiveRoutineExercise,
    addActiveRoutineExercise,
    deleteActiveRoutineExercise,

    get activeRoutine() {
      return activeRoutine;
    }
  });

export {
  ensureActiveRoutine,
  updateActiveRoutineMetadata,
  updateActiveRoutineExercise,
  addActiveRoutineExercise,
  deleteActiveRoutineExercise
};