window.JYMLog = window.JYMLog || {};

window.JYMLog.storage = (() => {
  let activeUserId = null;

  const legacyKey =
    "pl-prototype-state";

  function getBaseKey() {
    return window.JYMLog.config.storageKey;
  }

  function getUserKey(userId) {
    return `${getBaseKey()}:user:${userId}`;
  }

  function getMigrationOwnerKey() {
    return `${getBaseKey()}:migration-owner`;
  }

  function getActiveKey() {
    if (activeUserId) {
      return getUserKey(activeUserId);
    }

    return getBaseKey();
  }

  function readValue(
    storageKey,
    defaultValue
  ) {
    try {
      const savedData =
        localStorage.getItem(storageKey);

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

  /**
   * v0.1.0 또는 로그인 도입 전의 기록을 확인합니다.
   */
  function getPreviousLocalData() {
    const baseKey = getBaseKey();

    let savedData =
      localStorage.getItem(baseKey);

    if (!savedData) {
      savedData =
        localStorage.getItem(legacyKey);

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

  /**
   * 로그인 전 임시 저장 공간을 불러옵니다.
   */
  function load(defaultValue) {
    return readValue(
      getActiveKey(),
      defaultValue
    );
  }

  /**
   * 로그인 사용자의 전용 저장 공간을 활성화합니다.
   */
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
      localStorage.getItem(userKey);

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

    /**
     * 기존 기록은 첫 로그인 계정에만 귀속합니다.
     * 다른 계정이 같은 기록을 가져가지 못하게 합니다.
     */
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
    try {
      const storageKey =
        getActiveKey();

      localStorage.setItem(
        storageKey,
        JSON.stringify(value)
      );

      /**
       * 다음 단계의 Firestore 동기화에서
       * 이 이벤트를 감지합니다.
       */
      window.dispatchEvent(
        new CustomEvent(
          "jym-log:state-saved",
          {
            detail: {
              userId: activeUserId,
              storageKey,
              state: value
            }
          }
        )
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

  function clear() {
    localStorage.removeItem(
      getActiveKey()
    );
  }

  return {
    load,
    save,
    clear,
    activateUser,
    deactivateUser,

    get activeUserId() {
      return activeUserId;
    },

    get activeStorageKey() {
      return getActiveKey();
    }
  };
})();