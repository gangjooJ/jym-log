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

const storage =
  window.JYMLog.storage;

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
          changedAt:
            Date.now()
        }
      }
    )
  );
}

function cloneState(state) {
  return JSON.parse(
    JSON.stringify(state)
  );
}

function getStateUpdatedAt(
  state
) {
  return (
    Number(state?.updatedAt) ||
    0
  );
}

function getCloudUpdatedAt(
  cloudData
) {
  const clientUpdatedAt =
    Number(
      cloudData?.clientUpdatedAt
    );

  if (clientUpdatedAt > 0) {
    return clientUpdatedAt;
  }

  const stateUpdatedAt =
    getStateUpdatedAt(
      cloudData?.state
    );

  if (stateUpdatedAt > 0) {
    return stateUpdatedAt;
  }

  if (
    typeof cloudData?.updatedAt
      ?.toMillis === "function"
  ) {
    return cloudData.updatedAt
      .toMillis();
  }

  return 0;
}

function chooseNewerState(
  firstState,
  secondState
) {
  if (!firstState) {
    return secondState
      ? cloneState(secondState)
      : null;
  }

  if (!secondState) {
    return cloneState(firstState);
  }

  return (
    getStateUpdatedAt(
      secondState
    ) >
    getStateUpdatedAt(
      firstState
    )
  )
    ? cloneState(secondState)
    : cloneState(firstState);
}

function getWorkoutDocument(
  userId
) {
  return doc(
    db,
    "users",
    userId,
    "appData",
    "currentWorkout"
  );
}

/**
 * Firestore 저장 시각과 별도로,
 * 기기에서 실제로 수정된 시각도 저장합니다.
 */
async function saveCloudState(
  userId,
  state
) {
  const copiedState =
    cloneState(state);

  let clientUpdatedAt =
    getStateUpdatedAt(
      copiedState
    );

  if (clientUpdatedAt <= 0) {
    clientUpdatedAt =
      Date.now();

    copiedState.updatedAt =
      clientUpdatedAt;
  }

  await setDoc(
    getWorkoutDocument(userId),
    {
      userId,

      schemaVersion:
        SYNC_SCHEMA_VERSION,

      state:
        copiedState,

      clientUpdatedAt,

      /*
       * Firestore 서버가 실제로
       * 요청을 받은 시각입니다.
       */
      updatedAt:
        serverTimestamp()
    },
    {
      merge: true
    }
  );

  return clientUpdatedAt;
}

/**
 * 대기 중인 가장 최신 상태를
 * Firestore에 저장합니다.
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
    cloneState(pendingState);

  pendingState = null;
  writeInProgress = true;

  let saveFailed = false;

  emitSyncStatus(
    "saving",
    "저장 중"
  );

  try {
    const savedUpdatedAt =
      await saveCloudState(
        userId,
        stateToSave
      );

    /*
     * 저장 도중 더 최신 상태가 생겼다면
     * clearPendingSync가 그 기록을 지우지 않습니다.
     */
    storage.clearPendingSync(
      userId,
      savedUpdatedAt
    );

    if (
      activeUserId === userId
    ) {
      console.info(
        "[JYM Log] 운동 기록 클라우드 저장 완료"
      );

      emitSyncStatus(
        "synced",
        "동기화됨"
      );
    }
  } catch (error) {
    saveFailed = true;

    const retryState =
      chooseNewerState(
        stateToSave,
        activeUserId === userId
          ? pendingState
          : null
      );

    storage.savePendingSync(
      userId,
      retryState
    );

    if (
      activeUserId === userId
    ) {
      pendingState =
        retryState;

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
    }
  } finally {
    writeInProgress = false;

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
  if (!activeUserId) {
    return;
  }

  const queued =
    storage.savePendingSync(
      activeUserId,
      state
    );

  if (!queued) {
    emitSyncStatus(
      "error",
      "로컬 저장 오류"
    );

    return;
  }

  pendingState =
    cloneState(
      queued.state
    );

  if (!navigator.onLine) {
    emitSyncStatus(
      "offline",
      "오프라인 저장"
    );

    return;
  }

  void flushPendingState();
}

function attachStateSavedHandler() {
  stateSavedHandler =
    (event) => {
      const detail =
        event.detail || {};

      if (
        detail.userId !==
          activeUserId ||
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
}

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

  /*
   * LocalStorage의 미전송 기록은
   * 로그아웃이나 앱 종료에도 삭제하지 않습니다.
   */
}

/**
 * 로그인 시 로컬과 클라우드 중
 * 더 최근에 수정된 상태를 선택합니다.
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

  activeUserId =
    userId;

  const storedPending =
    storage.loadPendingSync(
      userId
    );

  let localState =
    cloneState(
      workout.state
    );

  if (storedPending?.state) {
    localState =
      chooseNewerState(
        localState,
        storedPending.state
      );

    pendingState =
      cloneState(
        storedPending.state
      );
  }

  const workoutDocument =
    getWorkoutDocument(
      userId
    );

  let workoutSnapshot = null;

  try {
    workoutSnapshot =
      await getDoc(
        workoutDocument
      );
  } catch (error) {
    /*
     * 클라우드를 확인하지 못했을 때는
     * 로컬 상태를 그대로 유지합니다.
     */
    if (
      activeUserId !== userId
    ) {
      return workout.state;
    }

    workout.replaceState(
      localState,
      true,
      false
    );

    attachStateSavedHandler();

    console.warn(
      "[JYM Log] 클라우드 상태 확인 실패",
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

    return workout.state;
  }

  if (
    activeUserId !== userId
  ) {
    return workout.state;
  }

  const cloudData =
    workoutSnapshot.exists()
      ? workoutSnapshot.data()
      : null;

  if (!cloudData?.state) {
    /*
     * 클라우드 문서가 없고 로컬 상태도
     * 수정 시각이 없다면 최초 시각을 생성합니다.
     */
    if (
      getStateUpdatedAt(
        localState
      ) <= 0
    ) {
      workout.replaceState(
        localState,
        false
      );

      workout.saveState();

      localState =
        cloneState(
          workout.state
        );
    } else {
      workout.replaceState(
        localState,
        true,
        false
      );
    }

    attachStateSavedHandler();

    queueCloudSave(
      localState
    );

    console.info(
      "[JYM Log] 기존 운동 기록 최초 업로드 준비"
    );

    return workout.state;
  }

  const cloudState =
    cloneState(
      cloudData.state
    );

  const localUpdatedAt =
    getStateUpdatedAt(
      localState
    );

  const cloudUpdatedAt =
    getCloudUpdatedAt(
      cloudData
    );

  if (
    localUpdatedAt >
    cloudUpdatedAt
  ) {
    /*
     * 오프라인 변경 등으로 로컬이 더 최신이면
     * 로컬을 화면에 적용하고 업로드합니다.
     */
    workout.replaceState(
      localState,
      true,
      false
    );

    attachStateSavedHandler();

    queueCloudSave(
      localState
    );

    console.info(
      "[JYM Log] 더 최신인 로컬 운동 기록 업로드 준비"
    );
  } else {
    /*
     * 클라우드가 같거나 더 최신이면
     * 클라우드 상태를 로컬에 적용합니다.
     */
    workout.replaceState(
      cloudState,
      true,
      false
    );

    pendingState = null;

    storage.clearPendingSync(
      userId,
      cloudUpdatedAt
    );

    attachStateSavedHandler();

    emitSyncStatus(
      "synced",
      "동기화됨"
    );

    console.info(
      "[JYM Log] 더 최신인 클라우드 운동 기록 적용 완료"
    );
  }

  return workout.state;
}

window.addEventListener(
  "online",
  () => {
    if (!activeUserId) {
      return;
    }

    if (!pendingState) {
      const storedPending =
        storage.loadPendingSync(
          activeUserId
        );

      if (storedPending?.state) {
        pendingState =
          cloneState(
            storedPending.state
          );
      }
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