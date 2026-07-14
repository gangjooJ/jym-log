window.JYMLog =
  window.JYMLog || {};

window.JYMLog.storage = (() => {
  const SYNC_QUEUE_SCHEMA_VERSION =
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
    state
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

    return payload;
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

  return {
    load,
    save,
    clear,
    activateUser,
    deactivateUser,
    savePendingSync,
    loadPendingSync,
    clearPendingSync,

    get activeUserId() {
      return activeUserId;
    },

    get activeStorageKey() {
      return getActiveKey();
    }
  };
})();