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

const INITIAL_SYNC_TIMEOUT_MS =
  12000;

const SYNC_RETRY_DELAYS_MS = [
  1500,
  3000,
  7000,
  15000,
  30000
];  

function withTimeout(
  promise,
  timeoutMs,
  message
) {
  let timeoutId = null;

  const timeoutPromise =
    new Promise(
      (_, reject) => {
        timeoutId =
          window.setTimeout(
            () => {
              const error =
                new Error(message);

              error.code =
                "sync/timeout";

              reject(error);
            },
            timeoutMs
          );
      }
    );

  return Promise.race([
    promise,
    timeoutPromise
  ]).finally(
    () => {
      if (timeoutId !== null) {
        window.clearTimeout(
          timeoutId
        );
      }
    }
  );
}

let activeUserId = null;
let stateSavedHandler = null;
let pendingPayload = null;
let writeInProgress = false;
let currentCloudRevision = 0;
let syncConflictActive = false;

let syncRetryTimerId = null;
let syncRetryAttempt = 0;

const deviceId =
  storage.getDeviceId();

function clearSyncRetry(
  resetAttempt = true
) {
  if (syncRetryTimerId !== null) {
    window.clearTimeout(
      syncRetryTimerId
    );

    syncRetryTimerId = null;
  }

  if (resetAttempt) {
    syncRetryAttempt = 0;
  }
}

function scheduleSyncRetry(
  delayOverride = null
) {
  if (
    syncRetryTimerId !== null ||
    !activeUserId ||
    !navigator.onLine ||
    syncConflictActive
  ) {
    return false;
  }

  const retryIndex =
    Math.min(
      syncRetryAttempt,
      SYNC_RETRY_DELAYS_MS.length - 1
    );

  const delay =
    delayOverride === null
      ? SYNC_RETRY_DELAYS_MS[
          retryIndex
        ]
      : Math.max(
          0,
          Number(delayOverride) || 0
        );

  syncRetryAttempt += 1;

  syncRetryTimerId =
    window.setTimeout(
      () => {
        syncRetryTimerId = null;

        if (
          !activeUserId ||
          !navigator.onLine ||
          syncConflictActive
        ) {
          return;
        }

        if (!pendingPayload) {
          pendingPayload =
            storage.loadPendingSync(
              activeUserId
            );
        }

        if (!pendingPayload) {
          clearSyncRetry();
          return;
        }

        emitSyncStatus(
          "saving",
          "저장 재시도 중"
        );

        void flushPendingState();
      },
      delay
    );

  return true;
}

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

function emitSyncConflictResolved(
  strategy,
  state
) {
  window.dispatchEvent(
    new CustomEvent(
      "jym-log:sync-conflict-resolved",
      {
        detail: {
          strategy,
          state:
            cloneValue(state),
          changedAt:
            Date.now()
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

function normalizeRevision(
  revision
) {
  return Math.max(
    0,
    Math.floor(
      Number(revision) || 0
    )
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
  return normalizeRevision(
    cloudData?.revision
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
 * 앱이 저장 성공 직전에 종료되면
 * 이미 클라우드에 반영된 대기열이
 * LocalStorage에 남을 수 있습니다.
 */
function isPendingAlreadySaved(
  pending,
  cloudData
) {
  if (
    !pending ||
    !cloudData
  ) {
    return false;
  }

  const pendingDeviceId =
    String(
      pending.deviceId || ""
    );

  const cloudDeviceId =
    String(
      cloudData.lastDeviceId || ""
    );

  if (
    !pendingDeviceId ||
    pendingDeviceId !==
      cloudDeviceId
  ) {
    return false;
  }

  const pendingUpdatedAt =
    Number(
      pending.localUpdatedAt
    ) ||
    getStateUpdatedAt(
      pending.state
    );

  const cloudUpdatedAt =
    getCloudUpdatedAt(
      cloudData
    );

  return (
    getCloudRevision(
      cloudData
    ) >
      normalizeRevision(
        pending.baseRevision
      ) &&
    cloudUpdatedAt >=
      pendingUpdatedAt
  );
}

/**
 * 현재 클라우드 revision과
 * 이 기기가 알고 있는 revision이
 * 일치할 때만 저장합니다.
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
        normalizeRevision(
          expectedRevision
        )
      ) {
        return {
          status: "conflict",

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
        status: "saved",

        revision:
          nextRevision,

        savedUpdatedAt:
          clientUpdatedAt
      };
    }
  );
}

/**
 * 사용자가 명시적으로 이 기기 기록을 선택했을 때
 * 현재 클라우드 revision을 다시 읽고 로컬 상태로 저장합니다.
 */
async function overwriteCloudState(
  userId,
  state
) {
  const workoutDocument =
    getWorkoutDocument(
      userId
    );

  const copiedState =
    cloneValue(state);

  return runTransaction(
    db,
    async (transaction) => {
      /*
       * 저장 직전 최신 클라우드 revision과
       * 현재 클라우드 갱신 시각을 읽습니다.
       */
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

      /*
       * 충돌 해결 결과는 반드시 기존 양쪽
       * 기록보다 최신 시각을 가져야 합니다.
       *
       * 단순히 Date.now()만 사용하면 기기 간
       * 시계 차이 때문에 다른 기기의 오래된
       * 상태가 다시 최신으로 판단될 수 있습니다.
       */
      const resolvedUpdatedAt =
        Math.max(
          Date.now(),
          getCloudUpdatedAt(
            cloudData
          ) + 1,
          getStateUpdatedAt(
            copiedState
          ) + 1
        );

      copiedState.updatedAt =
        resolvedUpdatedAt;

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

          clientUpdatedAt:
            resolvedUpdatedAt,

          updatedAt:
            serverTimestamp()
        },
        {
          merge: true
        }
      );

      return {
        status: "saved",

        revision:
          nextRevision,

        savedUpdatedAt:
          resolvedUpdatedAt,

        savedState:
          cloneValue(
            copiedState
          )
      };
    }
  );
}

function buildConflictRecord(
  userId,
  localPayload,
  cloudResult
) {
  const previousConflict =
    storage.loadSyncConflict(
      userId
    );

  const latestLocalState =
    chooseNewerState(
      previousConflict?.localState,
      localPayload?.state
    );

  return {
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

    localBaseRevision:
      normalizeRevision(
        localPayload
          ?.baseRevision
      ),

    localDeviceId:
      String(
        localPayload?.deviceId ||
        deviceId
      ),

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
      normalizeRevision(
        cloudResult
          ?.cloudRevision ??
        previousConflict
          ?.cloudRevision
      ),

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
  const conflictRecord =
    buildConflictRecord(
      userId,
      localPayload,
      cloudResult
    );

  const storedConflict =
    storage.saveSyncConflict(
      userId,
      conflictRecord
    ) || conflictRecord;

  syncConflictActive = true;
  pendingPayload = null;

  /*
   * 일반 대기열 대신 충돌 백업이
   * 로컬 기록을 보호합니다.
   */
  storage.clearPendingSync(
    userId
  );

  currentCloudRevision =
    normalizeRevision(
      storedConflict
        .cloudRevision
    );

  emitSyncStatus(
    "conflict",
    "동기화 충돌"
  );

  emitSyncConflict(
    storedConflict
  );

  console.warn(
    "[JYM Log] 다른 기기의 운동 기록과 충돌했습니다.",
    storedConflict
  );

  return storedConflict;
}

/**
 * 충돌 발생 후 이 기기에서 추가한
 * 변경도 충돌 백업에 계속 저장합니다.
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
      previousConflict?.localState,
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

function applyResolvedStateLocally(
  nextState
) {
  detachStateSavedHandler();

  try {
    /*
     * 로컬에는 저장하지만
     * state-saved 이벤트를 동기화 모듈이
     * 다시 처리하지 않도록 잠시 분리합니다.
     */
    workout.replaceState(
      nextState,
      true,
      false
    );
  } finally {
    if (activeUserId) {
      attachStateSavedHandler();
    }
  }

  return workout.state;
}

async function resolveSyncConflict(
  strategy
) {
  if (!activeUserId) {
    throw new Error(
      "로그인 사용자 정보를 찾을 수 없습니다."
    );
  }

  if (
    strategy !== "local" &&
    strategy !== "cloud"
  ) {
    throw new Error(
      "충돌 해결 방법이 올바르지 않습니다."
    );
  }

  const userId =
    activeUserId;

  const conflict =
    storage.loadSyncConflict(
      userId
    );

  if (!conflict) {
    syncConflictActive = false;

    emitSyncStatus(
      "synced",
      "동기화됨"
    );

    return workout.state;
  }

  if (!navigator.onLine) {
    throw new Error(
      "동기화 충돌은 인터넷에 연결된 상태에서 해결할 수 있습니다."
    );
  }

  if (writeInProgress) {
    throw new Error(
      "다른 저장 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요."
    );
  }

  writeInProgress = true;

  emitSyncStatus(
    "saving",
    strategy === "local"
      ? "이 기기 기록 저장 중"
      : "클라우드 기록 확인 중"
  );

  try {
    /*
     * 최신 클라우드 기록을 선택합니다.
     */
    if (strategy === "cloud") {
      const snapshot =
        await getDoc(
          getWorkoutDocument(
            userId
          )
        );

      const cloudData =
        snapshot.exists()
          ? snapshot.data()
          : null;

      if (!cloudData?.state) {
        throw new Error(
          "클라우드 운동 기록을 찾을 수 없습니다."
        );
      }

      const cloudState =
        cloneValue(
          cloudData.state
        );

      currentCloudRevision =
        getCloudRevision(
          cloudData
        );

      pendingPayload = null;
      syncConflictActive = false;

      storage.clearPendingSync(
        userId
      );

      storage.clearSyncConflict(
        userId
      );

      applyResolvedStateLocally(
        cloudState
      );

      emitSyncStatus(
        "synced",
        "동기화됨"
      );

      emitSyncConflictResolved(
        "cloud",
        cloudState
      );

      console.info(
        "[JYM Log] 클라우드 기록으로 동기화 충돌을 해결했습니다."
      );

      return workout.state;
    }

    /*
     * 이 기기 기록을 선택합니다.
     */
    const localState =
      conflict.localState
        ? cloneValue(
            conflict.localState
          )
        : null;

    if (!localState) {
      throw new Error(
        "보관된 이 기기 운동 기록을 찾을 수 없습니다."
      );
    }

    /*
      * 사용자가 이 기기 기록을 명시적으로 선택했으므로
      * 최신 클라우드 revision을 다시 읽고 저장합니다.
      */
    const result =
      await overwriteCloudState(
        userId,
        localState
      );

    currentCloudRevision =
      normalizeRevision(
        result.revision
      );

    const resolvedLocalState =
      result.savedState
        ? cloneValue(
            result.savedState
          )
        : cloneValue(
            localState
          );

    resolvedLocalState.updatedAt =
      Number(
        result.savedUpdatedAt
      ) ||
      getStateUpdatedAt(
        resolvedLocalState
      ) ||
      Date.now();  

    clearSyncRetry();
    
    pendingPayload = null;
    syncConflictActive = false;

    storage.clearPendingSync(
      userId
    );

    storage.clearSyncConflict(
      userId
    );

    applyResolvedStateLocally(
      resolvedLocalState
    );

    emitSyncStatus(
      "synced",
      "동기화됨"
    );

    emitSyncConflictResolved(
      "local",
      resolvedLocalState
    );

    console.info(
      "[JYM Log] 이 기기 기록으로 동기화 충돌을 해결했습니다."
    );

    return workout.state;
  } catch (error) {
    syncConflictActive = true;

    emitSyncStatus(
      "conflict",
      "동기화 충돌"
    );

    throw error;
  } finally {
    writeInProgress = false;
  }
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
        payloadToSave
          .baseRevision
      );

    if (
      result.status ===
      "conflict"
    ) {
      clearSyncRetry();

      const latestLocalState =
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
            latestLocalState
        },
        result
      );

      return;
    }

    currentCloudRevision =
      normalizeRevision(
        result.revision
      );

    clearSyncRetry();  

    storage.clearPendingSync(
      userId,
      result.savedUpdatedAt
    );

    /*
     * 첫 저장 중에 새 변경이 생겼다면
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
        normalizeRevision(
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

      const isOnline =
        navigator.onLine;

      emitSyncStatus(
        isOnline
          ? "saving"
          : "offline",

        isOnline
          ? "재시도 대기"
          : "오프라인 저장"
      );

      if (isOnline) {
        scheduleSyncRetry();
      }
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

function detachStateSavedHandler() {
  if (!stateSavedHandler) {
    return;
  }

  window.removeEventListener(
    "jym-log:state-saved",
    stateSavedHandler
  );

  stateSavedHandler = null;
}

function attachStateSavedHandler() {
  if (stateSavedHandler) {
    return;
  }

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
  detachStateSavedHandler();
  clearSyncRetry();

  activeUserId = null;
  pendingPayload = null;
  writeInProgress = false;
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
      await withTimeout(
        getDoc(
          workoutDocument
        ),
        INITIAL_SYNC_TIMEOUT_MS,
        "클라우드 확인 시간이 초과되었습니다."
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
      const isOffline =
        !navigator.onLine;

      const isTimeout =
        error?.code ===
          "sync/timeout";

      emitSyncStatus(
        isOffline
          ? "offline"
          : "error",

        isOffline
          ? "오프라인 저장"
          : isTimeout
            ? "동기화 지연"
            : "동기화 오류"
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
   * 과거 실행에서 감지한 충돌은
   * 자동으로 어느 쪽도 덮어쓰지 않습니다.
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
   * 저장 성공 직후 앱이 종료돼서
   * 오래된 대기열만 남은 경우입니다.
   */
  if (
    isPendingAlreadySaved(
      storedPending,
      cloudData
    )
  ) {
    storage.clearPendingSync(
      userId
    );

    pendingPayload = null;
  }

  const activePending =
    storage.loadPendingSync(
      userId
    );

  /*
   * 대기 기록의 기준 revision과 현재
   * 클라우드 revision이 다르면 충돌입니다.
   */
  if (
    activePending &&
    normalizeRevision(
      activePending
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
      activePending,
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
        "재연결 확인 중"
      );

      /*
      * 네트워크가 online으로 바뀐 직후에는
      * Firestore 연결이 아직 준비되지 않았을 수 있어
      * 약간 기다린 뒤 저장합니다.
      */
      clearSyncRetry(false);

      scheduleSyncRetry(
        1500
      );

      return;
    }

    emitSyncStatus(
      "synced",
      "동기화됨"
    );
  }
);

window.addEventListener(
  "visibilitychange",
  () => {
    if (
      document.hidden ||
      !activeUserId ||
      !navigator.onLine ||
      syncConflictActive
    ) {
      return;
    }

    if (!pendingPayload) {
      pendingPayload =
        storage.loadPendingSync(
          activeUserId
        );
    }

    if (!pendingPayload) {
      return;
    }

    emitSyncStatus(
      "saving",
      "대기 기록 확인 중"
    );

    scheduleSyncRetry(0);
  }
);

window.addEventListener(
  "offline",
  () => {
    if (!activeUserId) {
      return;
    }

    clearSyncRetry(false);

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
    resolveConflict:
      resolveSyncConflict,

    getConflict() {
      if (!activeUserId) {
        return null;
      }

      return storage.loadSyncConflict(
        activeUserId
      );
    },

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
  stopWorkoutSync,
  resolveSyncConflict
};
