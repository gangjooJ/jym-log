import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
  db
} from "./firebase-client.js";

const workout =
  window.JYMLog.workout;

const SYNC_SCHEMA_VERSION = 1;

let activeUserId = null;
let stateSavedHandler = null;
let pendingState = null;
let writeInProgress = false;

function emitSyncStatus(
  status,
  message
) {
  window.dispatchEvent(
    new CustomEvent(
      "jym-log:sync-status",
      {
        detail: {
          status,
          message,
          changedAt: Date.now()
        }
      }
    )
  );
}

/**
 * Firestore에 전달할 상태를
 * 현재 객체와 분리된 순수 데이터로 복사합니다.
 */
function cloneState(state) {
  return JSON.parse(
    JSON.stringify(state)
  );
}

/**
 * 로그인 사용자의 현재 운동 문서 위치입니다.
 *
 * users/{uid}/appData/currentWorkout
 */
function getWorkoutDocument(userId) {
  return doc(
    db,
    "users",
    userId,
    "appData",
    "currentWorkout"
  );
}

/**
 * 현재 운동 상태를 Firestore에 저장합니다.
 */
async function saveCloudState(
  userId,
  state
) {
  await setDoc(
    getWorkoutDocument(userId),
    {
      userId,
      schemaVersion:
        SYNC_SCHEMA_VERSION,

      state:
        cloneState(state),

      updatedAt:
        serverTimestamp()
    },
    {
      merge: true
    }
  );
}

/**
 * 대기 중인 최신 상태를 클라우드에 저장합니다.
 *
 * 저장 중에 새로운 변경이 발생하면
 * 가장 최근 상태만 이어서 한 번 더 저장합니다.
 */
async function flushPendingState() {
  if (
    writeInProgress ||
    !activeUserId ||
    !pendingState
  ) {
    return;
  }

  const userId =
    activeUserId;

  const stateToSave =
    pendingState;

  pendingState = null;
  writeInProgress = true;

  let saveFailed = false;

  emitSyncStatus(
  "saving",
  "저장 중"
);

  try {
    await saveCloudState(
      userId,
      stateToSave
    );

    console.info(
      "[JYM Log] 운동 기록 클라우드 저장 완료"
    );

    emitSyncStatus(
      "synced",
      "동기화됨"
    );

  } catch (error) {
    saveFailed = true;

    if (activeUserId === userId) {
      pendingState =
        stateToSave;
    }

    console.warn(
      "[JYM Log] 운동 기록 클라우드 저장 실패",
      error
    );

    emitSyncStatus(
      navigator.onLine
        ? "error"
        : "offline",

      navigator.onLine
        ? "동기화 오류"
        : "오프라인 저장"
    );

  } finally {
    writeInProgress = false;

    /**
     * 저장 중에 추가 변경이 발생했다면
     * 가장 최신 상태를 이어서 저장합니다.
     */
    if (
      !saveFailed &&
      pendingState &&
      activeUserId === userId
    ) {
      void flushPendingState();
    }
  }
}

function queueCloudSave(state) {
  pendingState =
    cloneState(state);

  if (!navigator.onLine) {
    emitSyncStatus(
      "offline",
      "오프라인 저장"
    );

    return;
  }

  void flushPendingState();
}

/**
 * 현재 사용자의 클라우드 동기화를 중지합니다.
 */
function stopWorkoutSync() {
  if (stateSavedHandler) {
    window.removeEventListener(
      "jym-log:state-saved",
      stateSavedHandler
    );
  }

  activeUserId = null;
  stateSavedHandler = null;
  pendingState = null;
}

/**
 * 로그인 사용자의 운동 기록 동기화를 시작합니다.
 */
async function initializeWorkoutSync(
  userId
) {
  stopWorkoutSync();

    emitSyncStatus(
    "loading",
    "확인 중"
  );

  if (!userId) {
    throw new Error(
      "동기화할 사용자 UID가 없습니다."
    );
  }

  activeUserId = userId;

  const workoutDocument =
    getWorkoutDocument(userId);

  const workoutSnapshot =
    await getDoc(workoutDocument);

  /**
   * 로그인 계정이 동기화 도중 바뀌었다면
   * 이전 요청 결과를 적용하지 않습니다.
   */
  if (activeUserId !== userId) {
    return workout.state;
  }

  const cloudData =
    workoutSnapshot.exists()
      ? workoutSnapshot.data()
      : null;

  if (cloudData?.state) {
    workout.replaceState(
      cloudData.state,
      true
    );

    console.info(
      "[JYM Log] 클라우드 운동 기록 불러오기 완료"
    );

    emitSyncStatus(
        "synced",
        "동기화됨"
      );

  } else {
    await saveCloudState(
      userId,
      workout.state
    );

    console.info(
      "[JYM Log] 기존 운동 기록 최초 업로드 완료"
    );

    emitSyncStatus(
      "synced",
      "동기화됨"
    );

  }

  /**
   * 초기 데이터 결정이 끝난 뒤부터
   * 로컬 변경 이벤트를 클라우드에 저장합니다.
   */
  stateSavedHandler = (event) => {
    const detail =
      event.detail || {};

    if (
      detail.userId !== activeUserId ||
      !detail.state
    ) {
      return;
    }

    queueCloudSave(
      detail.state
    );
  };

  window.addEventListener(
    "jym-log:state-saved",
    stateSavedHandler
  );

  return workout.state;
}

/**
 * 오프라인 중 실패한 저장이 있다면
 * 네트워크가 복구됐을 때 다시 시도합니다.
 */
window.addEventListener(
  "online",
  () => {
    if (!activeUserId) {
      return;
    }

    if (pendingState) {
      emitSyncStatus(
        "saving",
        "저장 중"
      );

      void flushPendingState();
      return;
    }

    emitSyncStatus(
      "synced",
      "동기화됨"
    );
  }
);

window.addEventListener(
  "offline",
  () => {
    if (!activeUserId) {
      return;
    }

    emitSyncStatus(
      "offline",
      "오프라인 저장"
    );
  }
);

export {
  initializeWorkoutSync,
  stopWorkoutSync
};