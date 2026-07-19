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

/**
 * Firestore 운동 세션 문서를
 * 화면에서 사용할 공통 형식으로 변환합니다.
 */
function normalizeWorkoutSession(
  documentSnapshot
) {
  const data =
    documentSnapshot.data();

  return {
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

    exercises:
      Array.isArray(
        data.exercises
      )
        ? data.exercises
        : []
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
    loadWorkoutSessionById
  });

export {
  loadRecentWorkoutSessions,
  loadWorkoutSessionById
};
