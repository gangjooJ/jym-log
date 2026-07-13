import {
  doc,
  serverTimestamp,
  setDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
  auth,
  db
} from "./firebase-client.js";

window.JYMLog =
  window.JYMLog || {};

const workout =
  window.JYMLog.workout;

const SESSION_SCHEMA_VERSION = 1;

/**
 * 완료한 세트 수를 계산합니다.
 */
function getCompletedSetCount(state) {
  return Object.values(
    state.sets || {}
  ).filter(
    (set) => set.done
  ).length;
}

/**
 * 완료한 세트의 총 볼륨을 계산합니다.
 *
 * 볼륨 = 중량 × 반복 수
 */
function getTotalVolume(state) {
  return Math.round(
    Object.values(state.sets || {})
      .filter((set) => set.done)
      .reduce((total, set) => {
        const weight =
          Number(set.weight) || 0;

        const reps =
          Number(set.reps) || 0;

        return total + weight * reps;
      }, 0)
  );
}

/**
 * 벤치프레스 목표 달성 여부를 계산합니다.
 */
function isBenchPressSuccess(state) {
  const benchPress =
    workout.exercises[0];

  for (
    let setIndex = 0;
    setIndex < benchPress.sets;
    setIndex += 1
  ) {
    const set =
      state.sets?.[`0-${setIndex}`];

    if (
      !set?.done ||
      Number(set.reps) < benchPress.max
    ) {
      return false;
    }
  }

  return true;
}

/**
 * 운동별 세트 기록을
 * 세션 저장 형식으로 변환합니다.
 */
function buildExerciseResults(state) {
  return workout.exercises.map(
    (exercise, exerciseIndex) => {
      const sets = [];

      for (
        let setIndex = 0;
        setIndex < exercise.sets;
        setIndex += 1
      ) {
        const savedSet =
          state.sets?.[
            `${exerciseIndex}-${setIndex}`
          ];

        sets.push({
          setNumber: setIndex + 1,

          weight:
            Number(
              savedSet?.weight ??
              exercise.weight
            ) || 0,

          reps:
            Number(
              savedSet?.reps ??
              exercise.min
            ) || 0,

          done:
            Boolean(savedSet?.done)
        });
      }

      return {
        exerciseId:
          exercise.id ||
          `exercise-${exerciseIndex + 1}`,

        exerciseIndex,

        order:
          exerciseIndex,

        name:
          exercise.name,

        type:
          exercise.type,

        target: {
          weight: exercise.weight,
          sets: exercise.sets,
          minReps: exercise.min,
          maxReps: exercise.max
        },

        sets
      };
    }
  );
}

/**
 * 완료된 운동 1회를 Firestore에 저장합니다.
 */
async function saveCompletedWorkoutSession(
  state = workout.state
) {
  const user =
    auth.currentUser;

  if (!user?.uid) {
    throw new Error(
      "로그인 사용자를 확인할 수 없습니다."
    );
  }

  if (
    !state?.started ||
    !state?.completed ||
    !state?.startedAt
  ) {
    throw new Error(
      "완료된 운동 상태가 아닙니다."
    );
  }

  const startedAtMillis =
    Number(state.startedAt);

  const completedAtMillis =
    Number(
      state.completedAt ||
      Date.now()
    );

  const durationSeconds =
    Math.max(
      0,
      Math.floor(
        (
          completedAtMillis -
          startedAtMillis
        ) / 1000
      )
    );

  /**
   * 운동 시작 시각을 문서 ID에 사용합니다.
   *
   * 같은 운동을 다시 저장해도
   * 동일 문서가 갱신되므로 중복이 생기지 않습니다.
   */
  const sessionId =
    `session-${startedAtMillis}`;

  const sessionDocument =
    doc(
      db,
      "users",
      user.uid,
      "workoutSessions",
      sessionId
    );

  const activeRoutine =
    window.JYMLog.routines
      ?.activeRoutine;
  
  await setDoc(
    sessionDocument,
    {
      userId: user.uid,
      schemaVersion:
        SESSION_SCHEMA_VERSION,

      routineId:
        activeRoutine?.id ||
        "main",

      routineName:
        activeRoutine?.name ||
        "가슴 · 팔 A",

      routineCode:
        activeRoutine?.code ||
        "upper-a",

      startedAt:
        Timestamp.fromMillis(
          startedAtMillis
        ),

      completedAt:
        Timestamp.fromMillis(
          completedAtMillis
        ),

      startedAtMillis,
      completedAtMillis,
      durationSeconds,

      completedSets:
        getCompletedSetCount(state),

      totalVolume:
        getTotalVolume(state),

      fatigue:
        Number(state.fatigue) || 3,

      benchPressSuccess:
        isBenchPressSuccess(state),

      exercises:
        buildExerciseResults(state),

      savedAt:
        serverTimestamp()
    },
    {
      merge: true
    }
  );

  console.info(
    `[JYM Log] 완료 운동 세션 저장 완료: ${sessionId}`
  );

  return sessionId;
}

window.JYMLog.sessions =
  Object.freeze({
    saveCompletedWorkoutSession
  });

export {
  saveCompletedWorkoutSession
};