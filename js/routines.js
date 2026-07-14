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

window.JYMLog.routines =
  Object.freeze({
    ensureActiveRoutine,
    updateActiveRoutineMetadata,

    get activeRoutine() {
      return activeRoutine;
    }
  });

export {
  ensureActiveRoutine,
  updateActiveRoutineMetadata
};