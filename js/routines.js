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

/**
 * 현재 하드코딩된 운동 목록으로
 * 최초 기본 루틴을 만듭니다.
 */
function createDefaultRoutine(
  userId
) {
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
      String(
        data?.name ||
        fallbackRoutine.name
      ),

    code:
      String(
        data?.code ||
        fallbackRoutine.code
      ),

    description:
      String(
        data?.description ||
        fallbackRoutine.description
      ),

    isActive:
      data?.isActive !== false,

    exercises
  };
}

/**
 * 사용자의 기본 루틴을 확인합니다.
 *
 * 문서가 없으면 현재 프로토타입 루틴을
 * Firestore에 최초 생성합니다.
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

  return activeRoutine;
}

window.JYMLog.routines =
  Object.freeze({
    ensureActiveRoutine,

    get activeRoutine() {
      return activeRoutine;
    }
  });

export {
  ensureActiveRoutine
};