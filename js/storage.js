window.JYMLog =
  window.JYMLog || {};

window.JYMLog.storage = (() => {
  const SYNC_QUEUE_SCHEMA_VERSION =
    1;

  const SYNC_CONFLICT_SCHEMA_VERSION =
    1;

  let activeUserId = null;

  const legacyKey =
    "pl-prototype-state";

  function cloneValue(value) {
    return JSON.parse(
      JSON.stringify(value)
    );
  }

  function getBaseKey() {
    return window.JYMLog.config
      .storageKey;
  }

  function getUserKey(userId) {
    return [
      getBaseKey(),
      "user",
      userId
    ].join(":");
  }

  function getMigrationOwnerKey() {
    return [
      getBaseKey(),
      "migration-owner"
    ].join(":");
  }

  function getPendingSyncKey(
    userId
  ) {
    return [
      getBaseKey(),
      "sync-queue",
      userId
    ].join(":");
  }

  function getSyncConflictKey(
    userId
  ) {
    return [
      getBaseKey(),
      "sync-conflict",
      userId
    ].join(":");
  }

  function getDeviceIdKey() {
    return [
      getBaseKey(),
      "device-id"
    ].join(":");
  }

  function getActiveKey() {
    if (activeUserId) {
      return getUserKey(
        activeUserId
      );
    }

    return getBaseKey();
  }

  function resolveUserId(userId) {
    return userId || activeUserId;
  }

  function readValue(
    storageKey,
    defaultValue
  ) {
    try {
      const savedData =
        localStorage.getItem(
          storageKey
        );

      return savedData
        ? JSON.parse(savedData)
        : defaultValue;
    } catch (error) {
      console.warn(
        "저장된 운동 기록을 불러오지 못했습니다.",
        error
      );

      return defaultValue;
    }
  }

  function writeValue(
    storageKey,
    value
  ) {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(value)
      );

      return true;
    } catch (error) {
      console.warn(
        "운동 기록을 저장하지 못했습니다.",
        error
      );

      return false;
    }
  }

  function createDeviceId() {
    if (
      window.crypto &&
      typeof window.crypto
        .randomUUID === "function"
    ) {
      return `device-${window.crypto.randomUUID()}`;
    }

    return [
      "device",
      Date.now(),
      Math.random()
        .toString(36)
        .slice(2, 10)
    ].join("-");
  }

  function getDeviceId() {
    const storageKey =
      getDeviceIdKey();

    const existingDeviceId =
      localStorage.getItem(
        storageKey
      );

    if (existingDeviceId) {
      return existingDeviceId;
    }

    const deviceId =
      createDeviceId();

    try {
      localStorage.setItem(
        storageKey,
        deviceId
      );
    } catch (error) {
      console.warn(
        "기기 식별자를 저장하지 못했습니다.",
        error
      );
    }

    return deviceId;
  }

  /**
   * 로그인 도입 전 기록을 확인합니다.
   */
  function getPreviousLocalData() {
    const baseKey =
      getBaseKey();

    let savedData =
      localStorage.getItem(
        baseKey
      );

    if (!savedData) {
      savedData =
        localStorage.getItem(
          legacyKey
        );

      if (savedData) {
        localStorage.setItem(
          baseKey,
          savedData
        );

        localStorage.removeItem(
          legacyKey
        );
      }
    }

    return savedData;
  }

  function load(defaultValue) {
    return readValue(
      getActiveKey(),
      defaultValue
    );
  }

  function activateUser(
    userId,
    defaultValue
  ) {
    if (!userId) {
      throw new Error(
        "사용자 UID가 필요합니다."
      );
    }

    activeUserId = userId;

    const userKey =
      getUserKey(userId);

    const existingUserData =
      localStorage.getItem(
        userKey
      );

    if (existingUserData) {
      return readValue(
        userKey,
        defaultValue
      );
    }

    const previousData =
      getPreviousLocalData();

    const migrationOwner =
      localStorage.getItem(
        getMigrationOwnerKey()
      );

    if (
      previousData &&
      (
        !migrationOwner ||
        migrationOwner === userId
      )
    ) {
      localStorage.setItem(
        userKey,
        previousData
      );

      localStorage.setItem(
        getMigrationOwnerKey(),
        userId
      );

      console.info(
        "[JYM Log] 기존 운동 기록을 로그인 계정으로 이전했습니다."
      );

      return readValue(
        userKey,
        defaultValue
      );
    }

    return defaultValue;
  }

  function deactivateUser() {
    activeUserId = null;
  }

  function save(value) {
    const storageKey =
      getActiveKey();

    const saved =
      writeValue(
        storageKey,
        value
      );

    if (!saved) {
      return false;
    }

    window.dispatchEvent(
      new CustomEvent(
        "jym-log:state-saved",
        {
          detail: {
            userId:
              activeUserId,

            storageKey,

            state:
              cloneValue(value)
          }
        }
      )
    );

    return true;
  }

  function clear() {
    localStorage.removeItem(
      getActiveKey()
    );
  }

  /**
   * 앱 종료 후에도 남아 있어야 하는
   * 미전송 운동 상태를 저장합니다.
   */
  function savePendingSync(
    userId,
    state,
    baseRevision = 0
  ) {
    const resolvedUserId =
      resolveUserId(userId);

    if (!resolvedUserId) {
      return null;
    }

    const copiedState =
      cloneValue(state);

    const localUpdatedAt =
      Number(
        copiedState?.updatedAt
      ) || Date.now();

    copiedState.updatedAt =
      localUpdatedAt;

    const payload = {
      schemaVersion:
        SYNC_QUEUE_SCHEMA_VERSION,

      userId:
        resolvedUserId,

      deviceId:
        getDeviceId(),

      /*
        * 이 로컬 기록이 어떤 클라우드
        * revision을 기준으로 수정됐는지 기록합니다.
        */
      baseRevision:
        Math.max(
          0,
          Math.floor(
            Number(
              baseRevision
            ) || 0
          )
        ),

      localUpdatedAt,

      state:
        copiedState
    };

    const saved =
      writeValue(
        getPendingSyncKey(
          resolvedUserId
        ),
        payload
      );

    return saved
      ? payload
      : null;
  }

  function loadPendingSync(
    userId
  ) {
    const resolvedUserId =
      resolveUserId(userId);

    if (!resolvedUserId) {
      return null;
    }

    const payload =
      readValue(
        getPendingSyncKey(
          resolvedUserId
        ),
        null
      );

    if (
      !payload ||
      payload.userId !==
        resolvedUserId ||
      !payload.state
    ) {
      return null;
    }

    return {
      ...payload,

      baseRevision:
        Math.max(
          0,
          Math.floor(
            Number(
              payload.baseRevision
            ) || 0
          )
        )
    };
  }

  /**
   * 저장 완료 시각보다 더 최신인
   * 대기 기록이 있으면 삭제하지 않습니다.
   */
  function clearPendingSync(
    userId,
    savedUpdatedAt = Infinity
  ) {
    const resolvedUserId =
      resolveUserId(userId);

    if (!resolvedUserId) {
      return false;
    }

    const currentPending =
      loadPendingSync(
        resolvedUserId
      );

    if (
      currentPending &&
      Number(
        currentPending.localUpdatedAt
      ) >
        Number(savedUpdatedAt)
    ) {
      return false;
    }

    localStorage.removeItem(
      getPendingSyncKey(
        resolvedUserId
      )
    );

    return true;
  }

  /**
   * PC와 모바일의 운동 상태가 충돌했을 때
   * 로컬 상태와 클라우드 상태를 별도로 보관합니다.
   */
  function saveSyncConflict(
    userId,
    conflict
  ) {
    const resolvedUserId =
      resolveUserId(userId);

    if (!resolvedUserId) {
      return null;
    }

    const payload = {
      ...cloneValue(
        conflict || {}
      ),

      schemaVersion:
        SYNC_CONFLICT_SCHEMA_VERSION,

      userId:
        resolvedUserId
    };

    const saved =
      writeValue(
        getSyncConflictKey(
          resolvedUserId
        ),
        payload
      );

    return saved
      ? payload
      : null;
  }

  function loadSyncConflict(
    userId
  ) {
    const resolvedUserId =
      resolveUserId(userId);

    if (!resolvedUserId) {
      return null;
    }

    const payload =
      readValue(
        getSyncConflictKey(
          resolvedUserId
        ),
        null
      );

    if (
      !payload ||
      payload.userId !==
        resolvedUserId ||
      !payload.localState
    ) {
      return null;
    }

    return payload;
  }

  function clearSyncConflict(
    userId
  ) {
    const resolvedUserId =
      resolveUserId(userId);

    if (!resolvedUserId) {
      return false;
    }

    localStorage.removeItem(
      getSyncConflictKey(
        resolvedUserId
      )
    );

    return true;
  }

  return {
    load,
    save,
    clear,
    activateUser,
    deactivateUser,
    getDeviceId,
    savePendingSync,
    loadPendingSync,
    clearPendingSync,
    saveSyncConflict,
    loadSyncConflict,
    clearSyncConflict,

    get activeUserId() {
      return activeUserId;
    },

    get activeStorageKey() {
      return getActiveKey();
    }
  };
})();
