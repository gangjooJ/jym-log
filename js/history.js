import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
  auth,
  db
} from "./firebase-client.js";

window.JYMLog =
  window.JYMLog || {};

function getTimestampMillis(
  timestamp,
  fallbackValue
) {
  if (
    timestamp &&
    typeof timestamp.toMillis === "function"
  ) {
    return timestamp.toMillis();
  }

  const fallbackNumber =
    Number(fallbackValue);

  return Number.isFinite(fallbackNumber)
    ? fallbackNumber
    : 0;
}

function countCompletedExerciseSets(
  exercises
) {
  return (
    Array.isArray(exercises)
      ? exercises
      : []
  ).reduce(
    (
      total,
      exercise
    ) =>
      total +
      (
        Array.isArray(
          exercise?.sets
        )
          ? exercise.sets.filter(
              (set) =>
                Boolean(set?.done)
            ).length
          : 0
      ),
    0
  );
}

function getWorkoutSessionIntegrity(
  session
) {
  const storedCompletedSetCount =
    Math.max(
      0,
      Number(
        session?.completedSets
      ) || 0
    );

  const derivedCompletedSetCount =
    countCompletedExerciseSets(
      session?.exercises
    );

  /*
   * 기존 저장 합계와 실제 세트 배열 중
   * 더 신뢰할 수 있는 큰 값을 사용합니다.
   */
  const completedSetCount =
    Math.max(
      storedCompletedSetCount,
      derivedCompletedSetCount
    );

  const hasCompletedAt =
    Number(
      session?.completedAtMillis
    ) > 0;

  const issues = [];

  if (!hasCompletedAt) {
    issues.push(
      "완료 시각 없음"
    );
  }

  if (
    completedSetCount <= 0
  ) {
    issues.push(
      "완료 세트 없음"
    );
  }

  return {
    valid:
      issues.length === 0,

    issues,

    completedSetCount,

    storedCompletedSetCount,

    derivedCompletedSetCount
  };
}

function filterValidWorkoutSessions(
  sessions
) {
  return (
    Array.isArray(sessions)
      ? sessions
      : []
  ).filter(
    (session) =>
      getWorkoutSessionIntegrity(
        session
      ).valid
  );
}

function summarizeWorkoutSessionIntegrity(
  sessions
) {
  const list =
    Array.isArray(sessions)
      ? sessions
      : [];

  const integrityResults =
    list.map(
      (session) =>
        getWorkoutSessionIntegrity(
          session
        )
    );

  const invalidResults =
    integrityResults.filter(
      (result) =>
        !result.valid
    );

  return {
    totalCount:
      integrityResults.length,

    validCount:
      integrityResults.length -
      invalidResults.length,

    invalidCount:
      invalidResults.length,

    emptySessionCount:
      invalidResults.filter(
        (result) =>
          result.completedSetCount <=
          0
      ).length,

    missingCompletedAtCount:
      invalidResults.filter(
        (result) =>
          result.issues.includes(
            "완료 시각 없음"
          )
      ).length
  };
}

/**
 * Firestore 운동 세션 문서를
 * 화면에서 사용할 공통 형식으로 변환합니다.
 */
function normalizeWorkoutSession(
  documentSnapshot
) {
  const data =
    documentSnapshot.data();

  const exercises =
    Array.isArray(
      data.exercises
    )
      ? data.exercises
      : [];

  const normalizedSession = {
    id:
      documentSnapshot.id,

    routineName:
      data.routineName ||
      "운동 세션",

    completedAtMillis:
      getTimestampMillis(
        data.completedAt,
        data.completedAtMillis
      ),

    startedAtMillis:
      getTimestampMillis(
        data.startedAt,
        data.startedAtMillis
      ),

    durationSeconds:
      Number(
        data.durationSeconds
      ) || 0,

    completedSets:
      Number(
        data.completedSets
      ) || 0,

    totalVolume:
      Number(
        data.totalVolume
      ) || 0,

    fatigue:
      Number(
        data.fatigue
      ) || 0,

    benchPressSuccess:
      Boolean(
        data.benchPressSuccess
      ),

    exercises
  };

  const integrity =
    getWorkoutSessionIntegrity(
      normalizedSession
    );

  return {
    ...normalizedSession,

    /*
     * 저장된 합계가 잘못됐더라도
     * 실제 완료 세트가 있으면 복구합니다.
     */
    completedSets:
      integrity
        .completedSetCount,

    integrity
  };
}

async function loadRecentWorkoutSessions(
  maxResults = 20
) {
  const user =
    auth.currentUser;

  if (!user?.uid) {
    throw new Error(
      "로그인 사용자를 확인할 수 없습니다."
    );
  }

  const sessionCollection =
    collection(
      db,
      "users",
      user.uid,
      "workoutSessions"
    );

  const sessionQuery =
    query(
      sessionCollection,
      orderBy(
        "completedAt",
        "desc"
      ),
      limit(maxResults)
    );

  const snapshot =
    await getDocs(sessionQuery);

  return snapshot.docs.map(
    normalizeWorkoutSession
  );
}

/**
 * 운동 세션 문서 ID를 이용해
 * 완료 기록 한 건을 불러옵니다.
 */
async function loadWorkoutSessionById(
  sessionId
) {
  const user =
    auth.currentUser;

  if (!user?.uid) {
    throw new Error(
      "로그인 사용자를 확인할 수 없습니다."
    );
  }

  if (!sessionId) {
    throw new Error(
      "운동 세션 ID가 없습니다."
    );
  }

  const sessionDocument =
    doc(
      db,
      "users",
      user.uid,
      "workoutSessions",
      sessionId
    );

  const snapshot =
    await getDoc(sessionDocument);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeWorkoutSession(
    snapshot
  );
}

window.JYMLog.history =
  Object.freeze({
    loadRecentWorkoutSessions,
    loadWorkoutSessionById,
    getWorkoutSessionIntegrity,
    filterValidWorkoutSessions,
    summarizeWorkoutSessionIntegrity
  });

export {
  loadRecentWorkoutSessions,
  loadWorkoutSessionById,
  getWorkoutSessionIntegrity,
  filterValidWorkoutSessions,
  summarizeWorkoutSessionIntegrity
};
