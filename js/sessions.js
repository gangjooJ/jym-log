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

async function saveCompletedWorkoutSession(
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
    `session-${startedAtMillis}`;

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
