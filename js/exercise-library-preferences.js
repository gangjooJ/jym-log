(() => {
  "use strict";

  window.JYMLog =
    window.JYMLog || {};

  const MAX_RECENT = 8;

  function getCatalog() {
    return window.JYMLog
      .exerciseCatalog;
  }

  function getStorageKey() {
    const baseKey =
      window.JYMLog.config
        ?.storageKey ||
      "jym-log";

    const userId =
      window.JYMLog.storage
        ?.activeUserId ||
      "guest";

    return [
      baseKey,
      "exercise-library-preferences",
      userId
    ].join(":");
  }

  function normalizeTemplateId(
    value
  ) {
    const catalog =
      getCatalog();

    const templateId =
      catalog
        ?.normalizeTemplateId?.(
          value
        ) ||
      "";

    if (
      !templateId ||
      !catalog
        ?.getTemplateById?.(
          templateId
        )
    ) {
      return "";
    }

    return templateId;
  }

  function normalizeTemplateIds(
    values
  ) {
    const source =
      Array.isArray(values)
        ? values
        : [];

    const seen =
      new Set();

    return source
      .map(
        normalizeTemplateId
      )
      .filter(
        (templateId) => {
          if (
            !templateId ||
            seen.has(
              templateId
            )
          ) {
            return false;
          }

          seen.add(
            templateId
          );

          return true;
        }
      );
  }

  function createEmptyState() {
    return {
      favorites: [],
      recent: []
    };
  }

  function loadState() {
    try {
      const rawValue =
        localStorage.getItem(
          getStorageKey()
        );

      if (!rawValue) {
        return createEmptyState();
      }

      const parsed =
        JSON.parse(
          rawValue
        );

      return {
        favorites:
          normalizeTemplateIds(
            parsed?.favorites
          ),

        recent:
          normalizeTemplateIds(
            parsed?.recent
          )
            .slice(
              0,
              MAX_RECENT
            )
      };
    } catch (error) {
      console.warn(
        "[JYM Log] 운동 선택 선호 정보를 불러오지 못했습니다.",
        error
      );

      return createEmptyState();
    }
  }

  function saveState(
    nextState
  ) {
    const normalizedState = {
      favorites:
        normalizeTemplateIds(
          nextState?.favorites
        ),

      recent:
        normalizeTemplateIds(
          nextState?.recent
        )
          .slice(
            0,
            MAX_RECENT
          )
    };

    try {
      localStorage.setItem(
        getStorageKey(),
        JSON.stringify(
          normalizedState
        )
      );

      window.dispatchEvent(
        new CustomEvent(
          "jym-log:exercise-library-preferences-changed",
          {
            detail: {
              favorites: [
                ...normalizedState
                  .favorites
              ],

              recent: [
                ...normalizedState
                  .recent
              ]
            }
          }
        )
      );

      return normalizedState;
    } catch (error) {
      console.warn(
        "[JYM Log] 운동 선택 선호 정보를 저장하지 못했습니다.",
        error
      );

      return loadState();
    }
  }

  function getSnapshot() {
    const state =
      loadState();

    return {
      favorites: [
        ...state.favorites
      ],

      recent: [
        ...state.recent
      ]
    };
  }

  function getFavorites() {
    return getSnapshot()
      .favorites;
  }

  function getRecent() {
    return getSnapshot()
      .recent;
  }

  function isFavorite(
    templateId
  ) {
    const normalizedId =
      normalizeTemplateId(
        templateId
      );

    return Boolean(
      normalizedId &&
      getFavorites()
        .includes(
          normalizedId
        )
    );
  }

  function toggleFavorite(
    templateId
  ) {
    const normalizedId =
      normalizeTemplateId(
        templateId
      );

    if (!normalizedId) {
      return false;
    }

    const state =
      loadState();

    const alreadyFavorite =
      state.favorites
        .includes(
          normalizedId
        );

    state.favorites =
      alreadyFavorite
        ? state.favorites
            .filter(
              (id) =>
                id !==
                normalizedId
            )
        : [
            normalizedId,
            ...state.favorites
          ];

    saveState(state);

    return !alreadyFavorite;
  }

  function markRecent(
    templateId
  ) {
    const normalizedId =
      normalizeTemplateId(
        templateId
      );

    if (!normalizedId) {
      return getSnapshot();
    }

    const state =
      loadState();

    state.recent = [
      normalizedId,
      ...state.recent
        .filter(
          (id) =>
            id !==
            normalizedId
        )
    ].slice(
      0,
      MAX_RECENT
    );

    return saveState(
      state
    );
  }

  function clearRecent() {
    const state =
      loadState();

    state.recent = [];

    return saveState(
      state
    );
  }

  window.JYMLog
    .exerciseLibraryPreferences =
      Object.freeze({
        getSnapshot,
        getFavorites,
        getRecent,
        isFavorite,
        toggleFavorite,
        markRecent,
        clearRecent
      });
})();