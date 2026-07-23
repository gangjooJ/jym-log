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

window.JYMLog = window.JYMLog || {};

const workout = window.JYMLog.workout;
const progressionPolicy =
  window.JYMLog.progressionPolicy;

if (!progressionPolicy) {
  throw new Error(
    "진행 정책 모듈을 불러오지 못했습니다."
  );
}

const SESSION_SCHEMA_VERSION = 1;

const pendingSessionSaves =
  new Map();

function getCompletedSetCount(state) {
  return Object.values(
    state.sets || {}
  ).filter((set) => set.done).length;
}

function getTotalVolume(state) {
  return Math.round(
    Object.values(state.sets || {})
      .filter((set) => set.done)
      .reduce((total, set) => {
        const weight = Number(set.weight) || 0;
        const reps = Number(set.reps) || 0;
        return total + weight * reps;
      }, 0)
  );
}

function getExerciseSets(
  state,
  exercise,
  exerciseIndex,
  target
) {
  const sets = [];

  for (
    let setIndex = 0;
    setIndex < target.setCount;
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
          target.inputSetTargets[
            setIndex
          ] ??
          exercise.min
        ) || 0,
      done: Boolean(savedSet?.done)
    });
  }

  return sets;
}

function buildExerciseResults(
  state,
  routineId
) {
  return workout.exercises.map(
    (exercise, exerciseIndex) => {
      const normalizedExercise =
        progressionPolicy
          .normalizeRoutineExercise(
            exercise,
            {
              routineId,
              index: exerciseIndex
            }
          );

      const progressionSnapshot =
        progressionPolicy.createSnapshot(
          normalizedExercise,
          {
            routineId,
            index: exerciseIndex
          }
        );

      const target =
        progressionSnapshot.target;

      const sets = getExerciseSets(
        state,
        normalizedExercise,
        exerciseIndex,
        target
      );

      return {
        routineExerciseId:
          normalizedExercise
            .routineExerciseId,
        exerciseId:
          normalizedExercise.id,
        exerciseIndex,
        order: exerciseIndex,
        name:
          normalizedExercise.name,
        type:
          normalizedExercise.type,
        target: {
          weight: target.weight,
          sets: target.setCount,
          minReps: target.minReps,
          maxReps: target.maxReps,
          setTargets:
            [...target.inputSetTargets],
          successSetTargets:
            [...target.successSetTargets],
          strategy:
            target.strategy,
          stageIndex:
            target.stageIndex,
          stageId:
            target.stageId
        },
        progressionSnapshot,
        sets
      };
    }
  );
}

function isBenchPressSuccess(
  state,
  routineId
) {
  const firstExercise =
    workout.exercises[0];

  if (!firstExercise) {
    return false;
  }

  const normalizedExercise =
    progressionPolicy
      .normalizeRoutineExercise(
        firstExercise,
        {
          routineId,
          index: 0
        }
      );

  const target =
    progressionPolicy
      .getCurrentTarget(
        normalizedExercise,
        normalizedExercise
          .progressionPolicy,
        normalizedExercise
          .progressionState
      );

  const sets = getExerciseSets(
    state,
    normalizedExercise,
    0,
    target
  );

  return progressionPolicy
    .evaluateSets(
      sets,
      target,
      target.weight
    ).success;
}

function getCompletedWorkoutSessionId(
  state
) {
  const startedAtMillis =
    Number(
      state?.startedAt
    );

  if (
    !Number.isFinite(
      startedAtMillis
    ) ||
    startedAtMillis <= 0
  ) {
    return "";
  }

  return `session-${Math.floor(
    startedAtMillis
  )}`;
}

async function persistCompletedWorkoutSession(
  state = workout.state
) {
  const user = auth.currentUser;

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

  if (
    typeof workout
      .validateWorkoutCompletion !==
    "function"
  ) {
    throw new Error(
      "운동 완료 검증 기능을 불러오지 못했습니다."
    );
  }

  const completionValidation =
    workout
      .validateWorkoutCompletion(
        state
      );

  if (
    !completionValidation.valid
  ) {
    throw new Error(
      completionValidation.message
    );
  }

  const startedAtMillis =
    Number(state.startedAt);

  const completedAtMillis =
    Number(
      state.completedAt || Date.now()
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

  const sessionId =
    getCompletedWorkoutSessionId(
      state
    );

  const sessionDocument = doc(
    db,
    "users",
    user.uid,
    "workoutSessions",
    sessionId
  );

  const routineApi =
    window.JYMLog.routines;

  const activeRoutine =
    routineApi?.activeRoutine;

  const routineId =
    String(
      state.routineId ||
      activeRoutine?.id ||
      "main"
    );

  const sessionRoutine =
    routineApi?.routines
      ?.find(
        (routine) =>
          routine.id ===
          routineId
      ) ||
    activeRoutine;

  const routineName =
    String(
      state.routineName ||
      sessionRoutine?.name ||
      "운동 루틴"
    );

  const routineCode =
    String(
      state.routineCode ||
      sessionRoutine?.code ||
      routineId
    );

  await setDoc(
    sessionDocument,
    {
      userId: user.uid,
      schemaVersion:
        SESSION_SCHEMA_VERSION,
      routineId,
      routineName,
      routineCode,

      scheduledDate:
        state.scheduledDate ||
        null,

      scheduleSource:
        state.scheduleSource ||
        "manual",

      scheduledType:
        state.scheduledType ||
        "manual",

      scheduledRoutineId:
        state.scheduledRoutineId ||
        null,

      scheduledRoutineName:
        state.scheduledRoutineName ||
        null,

      overrideRoutineId:
        state.overrideRoutineId ||
        null,

      overrideRoutineName:
        state.overrideRoutineName ||
        null,

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
        isBenchPressSuccess(
          state,
          routineId
        ),
      exercises:
        buildExerciseResults(
          state,
          routineId
        ),
      savedAt:
        serverTimestamp()
    },
    {
      merge: true
    }
  );

  window.dispatchEvent(
    new CustomEvent(
      "jym-log:workout-session-saved",
      {
        detail: {
          sessionId,
          completedAtMillis
        }
      }
    )
  );

  return sessionId;
}

function saveCompletedWorkoutSession(
  state = workout.state
) {
  const sessionId =
    getCompletedWorkoutSessionId(
      state
    );

  /*
   * 시작 시각이 잘못된 상태는
   * 실제 저장 함수의 검증에서
   * 명확한 오류를 반환하게 합니다.
   */
  if (!sessionId) {
    return persistCompletedWorkoutSession(
      state
    );
  }

  const existingSave =
    pendingSessionSaves.get(
      sessionId
    );

  /*
   * 같은 운동 세션을 저장 중이면
   * 새 Firestore 요청을 만들지 않고
   * 진행 중인 Promise를 반환합니다.
   */
  if (existingSave) {
    return existingSave;
  }

  const savePromise =
    persistCompletedWorkoutSession(
      state
    ).finally(
      () => {
        if (
          pendingSessionSaves.get(
            sessionId
          ) === savePromise
        ) {
          pendingSessionSaves.delete(
            sessionId
          );
        }
      }
    );

  pendingSessionSaves.set(
    sessionId,
    savePromise
  );

  return savePromise;
}

window.JYMLog.sessions =
  Object.freeze({
    saveCompletedWorkoutSession
  });

export {
  saveCompletedWorkoutSession
};

