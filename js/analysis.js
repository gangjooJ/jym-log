import {
  loadRecentWorkoutSessions
} from "./history.js";

window.JYMLog =
  window.JYMLog || {};

function getMondayStart(dateValue = new Date()) {
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

function getSundayEnd(monday) {
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

/**
 * 완료된 벤치프레스 세트 중
 * 가장 높은 중량을 반환합니다.
 */
function getBenchPressWeight(session) {
  const benchPress =
    session.exercises.find(
      (exercise) =>
        exercise.name === "벤치프레스"
    );

  if (!benchPress) {
    return 0;
  }

  const completedWeights =
    benchPress.sets
      .filter(
        (set) => set.done
      )
      .map(
        (set) =>
          Number(set.weight) || 0
      );

  if (
    completedWeights.length === 0
  ) {
    return 0;
  }

  return Math.max(
    ...completedWeights
  );
}

function buildBenchPressTrend(sessions) {
  return sessions
    .map(
      (session) => ({
        sessionId:
          session.id,

        completedAtMillis:
          session.completedAtMillis,

        weight:
          getBenchPressWeight(
            session
          )
      })
    )
    .filter(
      (item) => item.weight > 0
    )
    .slice(0, 6)
    .reverse();
}

function calculateWorkoutAnalysis(
  sessions
) {
  const monday =
    getMondayStart();

  const sunday =
    getSundayEnd(monday);

  const weeklySessions =
    sessions.filter(
      (session) =>
        session.completedAtMillis >=
          monday.getTime() &&
        session.completedAtMillis <=
          sunday.getTime()
    );

  const weeklyCompletedSets =
    weeklySessions.reduce(
      (total, session) =>
        total +
        session.completedSets,
      0
    );

  const weeklyVolume =
    weeklySessions.reduce(
      (total, session) =>
        total +
        session.totalVolume,
      0
    );

  const benchTrend =
    buildBenchPressTrend(
      sessions
    );

  const firstBenchWeight =
    benchTrend[0]?.weight || 0;

  const currentBenchWeight =
    benchTrend.at(-1)?.weight || 0;

  return {
    weekStartMillis:
      monday.getTime(),

    weekEndMillis:
      sunday.getTime(),

    weeklySessionCount:
      weeklySessions.length,

    weeklyCompletedSets,
    weeklyVolume,
    benchTrend,
    currentBenchWeight,

    benchWeightChange:
      currentBenchWeight -
      firstBenchWeight
  };
}

async function loadWorkoutAnalysis(
  maxResults = 100
) {
  const sessions =
    await loadRecentWorkoutSessions(
      maxResults
    );

  return calculateWorkoutAnalysis(
    sessions
  );
}

window.JYMLog.analysis =
  Object.freeze({
    loadWorkoutAnalysis
  });

export {
  calculateWorkoutAnalysis,
  loadWorkoutAnalysis
};
