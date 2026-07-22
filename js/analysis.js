import {
  loadRecentWorkoutSessions
} from "./history.js";

window.JYMLog =
  window.JYMLog || {};

const MAX_TREND_POINTS =
  8;

function getMondayStart(
  dateValue = new Date()
) {
  const date =
    new Date(dateValue);

  const currentDay =
    date.getDay();

  const mondayOffset =
    currentDay === 0
      ? -6
      : 1 - currentDay;

  date.setHours(
    0,
    0,
    0,
    0
  );

  date.setDate(
    date.getDate() +
    mondayOffset
  );

  return date;
}

function getSundayEnd(
  monday
) {
  const sunday =
    new Date(monday);

  sunday.setDate(
    monday.getDate() + 6
  );

  sunday.setHours(
    23,
    59,
    59,
    999
  );

  return sunday;
}

function normalizeExerciseName(
  value
) {
  return String(
    value || ""
  ).trim();
}

function getCompletedSets(
  exercise
) {
  return (
    Array.isArray(
      exercise?.sets
    )
      ? exercise.sets
      : []
  )
    .filter(
      (set) =>
        Boolean(set?.done)
    )
    .map(
      (set) => ({
        weight:
          Math.max(
            0,
            Number(
              set?.weight
            ) || 0
          ),

        reps:
          Math.max(
            0,
            Number(
              set?.reps
            ) || 0
          )
      })
    )
    .filter(
      (set) =>
        set.weight > 0 &&
        set.reps > 0
    );
}

function countSessionCompletedSets(
  session
) {
  const storedCount =
    Math.max(
      0,
      Number(
        session?.completedSets
      ) || 0
    );

  const derivedCount =
    (
      Array.isArray(
        session?.exercises
      )
        ? session.exercises
        : []
    )
      .reduce(
        (
          total,
          exercise
        ) =>
          total +
          (
            Array.isArray(
              exercise?.sets
            )
              ? exercise.sets
                  .filter(
                    (set) =>
                      Boolean(
                        set?.done
                      )
                  )
                  .length
              : 0
          ),
        0
      );

  return Math.max(
    storedCount,
    derivedCount
  );
}

function calculateEstimatedOneRm(
  weight,
  reps
) {
  const normalizedWeight =
    Math.max(
      0,
      Number(weight) || 0
    );

  const normalizedReps =
    Math.max(
      0,
      Number(reps) || 0
    );

  if (
    normalizedWeight <= 0 ||
    normalizedReps <= 0
  ) {
    return 0;
  }

  if (normalizedReps === 1) {
    return normalizedWeight;
  }

  return Math.round(
    (
      normalizedWeight *
      (
        1 +
        Math.min(
          normalizedReps,
          30
        ) /
        30
      )
    ) *
    10
  ) / 10;
}

function createExerciseSessionPoint(
  session,
  exercise
) {
  const completedSets =
    getCompletedSets(
      exercise
    );

  if (
    completedSets.length ===
    0
  ) {
    return null;
  }

  const topWeight =
    Math.max(
      ...completedSets.map(
        (set) =>
          set.weight
      )
    );

  const estimatedOneRm =
    Math.max(
      ...completedSets.map(
        (set) =>
          calculateEstimatedOneRm(
            set.weight,
            set.reps
          )
      )
    );

  const volume =
    Math.round(
      completedSets.reduce(
        (
          total,
          set
        ) =>
          total +
          set.weight *
          set.reps,
        0
      )
    );

  return {
    sessionId:
      session.id,

    completedAtMillis:
      Number(
        session.completedAtMillis
      ) || 0,

    routineName:
      session.routineName ||
      "운동 세션",

    topWeight,
    estimatedOneRm,
    volume,

    completedSetCount:
      completedSets.length
  };
}

function getExerciseNames(
  sessions
) {
  const names =
    new Set();

  sessions.forEach(
    (session) => {
      const exercises =
        Array.isArray(
          session?.exercises
        )
          ? session.exercises
          : [];

      exercises.forEach(
        (exercise) => {
          const name =
            normalizeExerciseName(
              exercise?.name
            );

          if (
            name &&
            getCompletedSets(
              exercise
            ).length > 0
          ) {
            names.add(name);
          }
        }
      );
    }
  );

  return [
    ...names
  ].sort(
    (left, right) =>
      left.localeCompare(
        right,
        "ko"
      )
  );
}

function buildExerciseTrend(
  sessions,
  exerciseName
) {
  const normalizedName =
    normalizeExerciseName(
      exerciseName
    );

  if (!normalizedName) {
    return [];
  }

  return sessions
    .map(
      (session) => {
        const exercises =
          Array.isArray(
            session?.exercises
          )
            ? session.exercises
            : [];

        const exercise =
          exercises.find(
            (item) =>
              normalizeExerciseName(
                item?.name
              ) ===
              normalizedName
          );

        return exercise
          ? createExerciseSessionPoint(
              session,
              exercise
            )
          : null;
      }
    )
    .filter(Boolean)
    .sort(
      (
        left,
        right
      ) =>
        left.completedAtMillis -
        right.completedAtMillis
    );
}

function getChange(
  currentValue,
  previousValue
) {
  const current =
    Number(currentValue) || 0;

  const previous =
    Number(previousValue) || 0;

  return Math.round(
    (
      current -
      previous
    ) *
    10
  ) / 10;
}

function calculateExerciseAnalysis(
  sessions,
  exerciseName
) {
  const trend =
    buildExerciseTrend(
      sessions,
      exerciseName
    );

  const recentTrend =
    trend.slice(
      -MAX_TREND_POINTS
    );

  const latest =
    trend.at(-1) ||
    null;

  const previous =
    trend.at(-2) ||
    null;

  const previousBestOneRm =
    trend
      .slice(
        0,
        -1
      )
      .reduce(
        (
          highest,
          item
        ) =>
          Math.max(
            highest,
            Number(
              item.estimatedOneRm
            ) || 0
          ),
        0
      );

  const isPersonalRecord =
    Boolean(
      latest &&
      latest.estimatedOneRm > 0 &&
      latest.estimatedOneRm >
        previousBestOneRm
    );

  return {
    exerciseName:
      normalizeExerciseName(
        exerciseName
      ),

    sessionCount:
      trend.length,

    latest,
    previous,

    changes: {
      topWeight:
        getChange(
          latest?.topWeight,
          previous?.topWeight
        ),

      estimatedOneRm:
        getChange(
          latest?.estimatedOneRm,
          previous?.estimatedOneRm
        ),

      volume:
        getChange(
          latest?.volume,
          previous?.volume
        )
    },

    isPersonalRecord,
    previousBestOneRm,
    trend:
      recentTrend
  };
}

function calculateWorkoutAnalysis(
  sessions,
  selectedExerciseName = ""
) {
  const safeSessions =
    Array.isArray(
      sessions
    )
      ? sessions
      : [];

  const monday =
    getMondayStart();

  const sunday =
    getSundayEnd(
      monday
    );

  const weeklySessions =
    safeSessions.filter(
      (session) => {
        const completedAtMillis =
          Number(
            session
              ?.completedAtMillis
          ) || 0;

        const completedSetCount =
          countSessionCompletedSets(
            session
          );

        return (
          completedAtMillis >=
            monday.getTime() &&
          completedAtMillis <=
            sunday.getTime() &&
          completedSetCount > 0
        );
      }
    );

  const weeklyCompletedSets =
    weeklySessions.reduce(
      (
        total,
        session
      ) =>
        total +
        countSessionCompletedSets(
          session
        ),
      0
    );

  const weeklyVolume =
    weeklySessions.reduce(
      (
        total,
        session
      ) =>
        total +
        (
          Number(
            session.totalVolume
          ) || 0
        ),
      0
    );

  const exerciseNames =
    getExerciseNames(
      safeSessions
    );

  const selectedExercise =
    exerciseNames.includes(
      selectedExerciseName
    )
      ? selectedExerciseName
      : exerciseNames[0] || "";

  return {
    weekStartMillis:
      monday.getTime(),

    weekEndMillis:
      sunday.getTime(),

    weeklySessionCount:
      weeklySessions.length,

    weeklyCompletedSets,
    weeklyVolume,

    exerciseNames,

    selectedExercise,

    exercise:
      calculateExerciseAnalysis(
        safeSessions,
        selectedExercise
      )
  };
}

async function loadWorkoutAnalysis(
  maxResults = 200,
  selectedExerciseName = ""
) {
  const sessions =
    await loadRecentWorkoutSessions(
      maxResults
    );

  return calculateWorkoutAnalysis(
    sessions,
    selectedExerciseName
  );
}

window.JYMLog.analysis =
  Object.freeze({
    loadWorkoutAnalysis,
    calculateWorkoutAnalysis,
    calculateExerciseAnalysis
  });

export {
  calculateEstimatedOneRm,
  calculateExerciseAnalysis,
  calculateWorkoutAnalysis,
  loadWorkoutAnalysis
};