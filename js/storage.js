window.JYMLog = window.JYMLog || {};

window.JYMLog.storage = {
  load(defaultValue) {
    try {
      const storageKey = window.JYMLog.config.storageKey;
      const legacyKey = "pl-prototype-state";

      let savedData = localStorage.getItem(storageKey);

      // v0.1.0에서 사용하던 기존 기록이 있으면 새 저장 키로 이전한다.
      if (!savedData) {
        savedData = localStorage.getItem(legacyKey);

        if (savedData) {
          localStorage.setItem(storageKey, savedData);
          localStorage.removeItem(legacyKey);
        }
      }

      return savedData ? JSON.parse(savedData) : defaultValue;
    } catch (error) {
      console.warn("저장된 운동 기록을 불러오지 못했습니다.", error);
      return defaultValue;
    }
  },

  save(value) {
    try {
      localStorage.setItem(
        window.JYMLog.config.storageKey,
        JSON.stringify(value)
      );

      return true;
    } catch (error) {
      console.warn("운동 기록을 저장하지 못했습니다.", error);
      return false;
    }
  },

  clear() {
    localStorage.removeItem(window.JYMLog.config.storageKey);
  }
};