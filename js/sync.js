import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
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
let pendingPayload = null;
let writeInProgress = false;
let currentCloudRevision = 0;
let syncConflictActive = false;

const deviceId =
  storage.getDeviceId();

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

function emitSyncConflict(
  conflict
) {
  window.dispatchEvent(
    new CustomEvent(
      "jym-log:sync-conflict",
      {
        detail: {
          conflict
        }
      }
    )
  );
}

function cloneValue(value) {
  return JSON.parse(
    JSON.stringify(value)
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

function chooseNewerState(
  firstState,
  secondState
) {
  if (!firstState) {
    return secondState
      ? cloneValue(secondState)
      : null;
  }

  if (!secondState) {
    return cloneValue(firstState);
  }

  return (
    getStateUpdatedAt(
      secondState
    ) >
    getStateUpdatedAt(
      firstState
    )
  )
    ? cloneValue(secondState)
    : cloneValue(firstState);
}

function getCloudRevision(
  cloudData
) {
  return Math.max(
    0,
    Math.floor(
      Number(
        cloudData?.revision
      ) || 0
    )
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
 * 현재 클라우드 revision과
 * 이 기기가 알고 있는 revision이 같을 때만 저장합니다.
 */
async function saveCloudState(
  userId,
  state,
  expectedRevision
) {
  const workoutDocument =
    getWorkoutDocument(
      userId
    );

  const copiedState =
    cloneValue(state);

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

  return runTransaction(
    db,
    async (transaction) => {
      const snapshot =
        await transaction.get(
          workoutDocument
        );

      const cloudData =
        snapshot.exists()
          ? snapshot.data()
          : null;

      const cloudRevision =
        getCloudRevision(
          cloudData
        );

      if (
        cloudRevision !==
        expectedRevision
      ) {
        return {
          status:
            "conflict",

          cloudRevision,

          cloudState:
            cloudData?.state
              ? cloneValue(
                  cloudData.state
                )
              : null,

          cloudDeviceId:
            String(
              cloudData
                ?.lastDeviceId ||
              ""
            ),

          cloudUpdatedAt:
            getCloudUpdatedAt(
              cloudData
            )
        };
      }

      const nextRevision =
        cloudRevision + 1;

      transaction.set(
        workoutDocument,
        {
          userId,

          schemaVersion:
            SYNC_SCHEMA_VERSION,

          state:
            copiedState,

          revision:
            nextRevision,

          lastDeviceId:
            deviceId,

          clientUpdatedAt,

          updatedAt:
            serverTimestamp()
        },
        {
          merge: true
        }
      );

      return {
        status:
          "saved",

        revision:
          nextRevision,

        savedUpdatedAt:
          clientUpdatedAt
      };
    }
  );
}

function buildConflictRecord(
  localPayload,
  cloudResult
) {
  const previousConflict =
    storage.loadSyncConflict(
      activeUserId
    );

  const latestLocalState =
    chooseNewerState(
      previousConflict?.localState,
      localPayload?.state
    );

  return {
    detectedAt:
      Date.now(),

    localState:
      latestLocalState,

    localUpdatedAt:
      getStateUpdatedAt(
        latestLocalState
      ),

    localBaseRevision:
      Number(
        localPayload
          ?.baseRevision
      ) || 0,

    localDeviceId:
      deviceId,

    cloudState:
      cloudResult
        ?.cloudState ||
      previousConflict
        ?.cloudState ||
      null,

    cloudUpdatedAt:
      Number(
        cloudResult
          ?.cloudUpdatedAt
      ) ||
      Number(
        previousConflict
          ?.cloudUpdatedAt
      ) ||
      0,

    cloudRevision:
      Number(
        cloudResult
          ?.cloudRevision
      ) ||
      Number(
        previousConflict
          ?.cloudRevision
      ) ||
      0,

    cloudDeviceId:
      String(
        cloudResult
          ?.cloudDeviceId ||
        previousConflict
          ?.cloudDeviceId ||
        ""
      )
  };
}

function activateSyncConflict(
  userId,
  localPayload,
  cloudResult
) {
  const conflict =
    storage.saveSyncConflict(
      userId,
      buildConflictRecord(
        localPayload,
        cloudResult
      )
    );

  syncConflictActive = true;
  pendingPayload = null;

  /*
   * 일반 대기열과 충돌 백업이 동시에
   * 존재하지 않도록 대기열을 정리합니다.
   */
  storage.clearPendingSync(
    userId
  );

  currentCloudRevision =
    Number(
      conflict?.cloudRevision
    ) || 0;

  emitSyncStatus(
    "conflict",
    "동기화 충돌"
  );

  emitSyncConflict(
    conflict
  );

  console.warn(
    "[JYM Log] 다른 기기의 더 최신인 운동 기록을 감지했습니다.",
    conflict
  );

  return conflict;
}

/**
 * 충돌 상태에서 추가로 입력한 로컬 기록도
 * 같은 충돌 백업에 계속 갱신합니다.
 */
function preserveConflictLocalState(
  state
) {
  if (!activeUserId) {
    return null;
  }

  const previousConflict =
    storage.loadSyncConflict(
      activeUserId
    );

  const latestLocalState =
    chooseNewerState(
      previousConflict
        ?.localState,
      state
    );

  return storage.saveSyncConflict(
    activeUserId,
    {
      ...(previousConflict || {}),

      detectedAt:
        previousConflict
          ?.detectedAt ||
        Date.now(),

      localState:
        latestLocalState,

      localUpdatedAt:
        getStateUpdatedAt(
          latestLocalState
        ),

      localDeviceId:
        deviceId
    }
  );
}

async function flushPendingState() {
  if (
    writeInProgress ||
    !activeUserId ||
    !pendingPayload ||
    syncConflictActive
  ) {
    return;
  }

  const userId =
    activeUserId;

  const payloadToSave =
    cloneValue(
      pendingPayload
    );

  pendingPayload = null;
  writeInProgress = true;

  let saveFailed = false;

  emitSyncStatus(
    "saving",
    "저장 중"
  );

  try {
    const result =
      await saveCloudState(
        userId,
        payloadToSave.state,
        Number(
          payloadToSave
            .baseRevision
        ) || 0
      );

    if (
      result.status ===
      "conflict"
    ) {
      const newerLocalState =
        chooseNewerState(
          payloadToSave.state,
          activeUserId === userId
            ? pendingPayload?.state
            : null
        );

      activateSyncConflict(
        userId,
        {
          ...payloadToSave,
          state:
            newerLocalState
        },
        result
      );

      return;
    }

    currentCloudRevision =
      result.revision;

    storage.clearPendingSync(
      userId,
      result.savedUpdatedAt
    );

    /*
     * 첫 번째 저장 중에 새로운 변경이 생겼다면
     * 새 revision을 기준으로 다시 저장합니다.
     */
    if (
      pendingPayload &&
      activeUserId === userId
    ) {
      pendingPayload =
        storage.savePendingSync(
          userId,
          pendingPayload.state,
          currentCloudRevision
        );
    }

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
        payloadToSave.state,
        activeUserId === userId
          ? pendingPayload?.state
          : null
      );

    const retryPayload =
      storage.savePendingSync(
        userId,
        retryState,
        Number(
          payloadToSave
            .baseRevision
        ) ||
        currentCloudRevision
      );

    if (
      activeUserId === userId
    ) {
      pendingPayload =
        retryPayload;

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
      pendingPayload &&
      activeUserId === userId &&
      !syncConflictActive
    ) {
      void flushPendingState();
    }
  }
}

function queueCloudSave(state) {
  if (!activeUserId) {
    return;
  }

  if (syncConflictActive) {
    preserveConflictLocalState(
      state
    );

    emitSyncStatus(
      "conflict",
      "동기화 충돌"
    );

    return;
  }

  const queued =
    storage.savePendingSync(
      activeUserId,
      state,
      currentCloudRevision
    );

  if (!queued) {
    emitSyncStatus(
      "error",
      "로컬 저장 오류"
    );

    return;
  }

  pendingPayload =
    queued;

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
  pendingPayload = null;
  currentCloudRevision = 0;
  syncConflictActive = false;
}

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

  const storedConflict =
    storage.loadSyncConflict(
      userId
    );

  let localState =
    cloneValue(
      workout.state
    );

  if (storedPending?.state) {
    localState =
      chooseNewerState(
        localState,
        storedPending.state
      );

    pendingPayload =
      storedPending;
  }

  if (storedConflict?.localState) {
    localState =
      chooseNewerState(
        localState,
        storedConflict.localState
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

    if (storedConflict) {
      syncConflictActive = true;

      emitSyncStatus(
        "conflict",
        "동기화 충돌"
      );

      emitSyncConflict(
        storedConflict
      );
    } else {
      emitSyncStatus(
        navigator.onLine
          ? "error"
          : "offline",

        navigator.onLine
          ? "동기화 오류"
          : "오프라인 저장"
      );
    }

    console.warn(
      "[JYM Log] 클라우드 상태 확인 실패",
      error
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

  const cloudState =
    cloudData?.state
      ? cloneValue(
          cloudData.state
        )
      : null;

  currentCloudRevision =
    getCloudRevision(
      cloudData
    );

  /*
   * 이전 실행에서 감지한 충돌이 있다면
   * 자동으로 어느 기록도 덮어쓰지 않습니다.
   */
  if (storedConflict) {
    const refreshedConflict =
      storage.saveSyncConflict(
        userId,
        {
          ...storedConflict,

          localState,

          localUpdatedAt:
            getStateUpdatedAt(
              localState
            ),

          cloudState:
            cloudState ||
            storedConflict
              .cloudState ||
            null,

          cloudRevision:
            currentCloudRevision,

          cloudUpdatedAt:
            getCloudUpdatedAt(
              cloudData
            ),

          cloudDeviceId:
            String(
              cloudData
                ?.lastDeviceId ||
              storedConflict
                .cloudDeviceId ||
              ""
            )
        }
      );

    syncConflictActive = true;

    workout.replaceState(
      localState,
      true,
      false
    );

    attachStateSavedHandler();

    emitSyncStatus(
      "conflict",
      "동기화 충돌"
    );

    emitSyncConflict(
      refreshedConflict
    );

    return workout.state;
  }

  /*
   * 이 기기의 대기 기록이 기준으로 삼은 revision과
   * 현재 클라우드 revision이 다르면 동시 수정입니다.
   */
  if (
    storedPending &&
    Number(
      storedPending
        .baseRevision
    ) !==
      currentCloudRevision
  ) {
    workout.replaceState(
      localState,
      true,
      false
    );

    attachStateSavedHandler();

    activateSyncConflict(
      userId,
      storedPending,
      {
        cloudState,

        cloudRevision:
          currentCloudRevision,

        cloudUpdatedAt:
          getCloudUpdatedAt(
            cloudData
          ),

        cloudDeviceId:
          String(
            cloudData
              ?.lastDeviceId ||
            ""
          )
      }
    );

    return workout.state;
  }

  if (!cloudState) {
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
        cloneValue(
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
    workout.replaceState(
      cloudState,
      true,
      false
    );

    pendingPayload = null;

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

    if (syncConflictActive) {
      emitSyncStatus(
        "conflict",
        "동기화 충돌"
      );

      return;
    }

    if (!pendingPayload) {
      pendingPayload =
        storage.loadPendingSync(
          activeUserId
        );
    }

    if (pendingPayload) {
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
      syncConflictActive
        ? "conflict"
        : "offline",

      syncConflictActive
        ? "동기화 충돌"
        : "오프라인 저장"
    );
  }
);

window.JYMLog.sync =
  Object.freeze({
    get deviceId() {
      return deviceId;
    },

    get currentCloudRevision() {
      return currentCloudRevision;
    },

    get hasConflict() {
      return syncConflictActive;
    }
  });

export {
  initializeWorkoutSync,
  stopWorkoutSync
};