import {
  collection,
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

/**
 * Firestore Timestamp 또는 숫자형 시각을
 * 밀리초 숫자로 정리합니다.
 */
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
 * 로그인 사용자의 최근 완료 운동 기록을
 * 완료 시각이 최신인 순서로 불러옵니다.
 */
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
    (documentSnapshot) => {
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
  );
}

window.JYMLog.history =
  Object.freeze({
    loadRecentWorkoutSessions
  });

export {
  loadRecentWorkoutSessions
};