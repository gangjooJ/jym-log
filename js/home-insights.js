(() => {
  "use strict";

  window.JYMLog =
    window.JYMLog || {};

  const DAY_MS =
    24 * 60 * 60 * 1000;

  const WINDOW_DAYS =
    28;

  const QUERY_LIMIT =
    200;

  const gridElement =
    document.getElementById(
      "homeInsightsGrid"
    );

  const messageElement =
    document.getElementById(
      "homeInsightsMessage"
    );

  let loading =
    false;

  let lastSnapshot =
    null;

  function cloneValue(
    value
  ) {
    if (!value) {
      return null;
    }

    return JSON.parse(
      JSON.stringify(
        value
      )
    );
  }

  function setText(
    id,
    value
  ) {
    const element =
      document.getElementById(
        id
      );

    if (element) {
      element.textContent =
        String(value);
    }
  }

  function setMessage(
    message
  ) {
    if (messageElement) {
      messageElement.textContent =
        String(message);
    }
  }

  function setGridState(
    state
  ) {
    if (!gridElement) {
      return;
    }

    gridElement.dataset.state =
      String(state);

    gridElement.setAttribute(
      "aria-busy",
      String(
        state === "loading"
      )
    );
  }

  function getCompletedAtMillis(
    session
  ) {
    const value =
      Number(
        session
          ?.completedAtMillis
      );

    return Number.isFinite(
      value
    )
      ? value
      : 0;
  }

  function getTotalVolume(
    sessions
  ) {
    return Math.round(
      sessions.reduce(
        (
          total,
          session
        ) =>
          total +
          Math.max(
            0,
            Number(
              session
                ?.totalVolume
            ) || 0
          ),
        0
      )
    );
  }

  function formatVolume(
    value
  ) {
    const volume =
      Math.max(
        0,
        Math.round(
          Number(value) || 0
        )
      );

    if (volume >= 10000) {
      return [
        new Intl
          .NumberFormat(
            "ko-KR",
            {
              maximumFractionDigits:
                1
            }
          )
          .format(
            volume / 1000
          ),
        "톤"
      ].join("");
    }

    return [
      new Intl
        .NumberFormat(
          "ko-KR"
        )
        .format(volume),
      "kg"
    ].join("");
  }

  function formatCountComparison(
    currentValue,
    previousValue
  ) {
    const current =
      Number(currentValue) || 0;

    const previous =
      Number(previousValue) || 0;

    if (
      current === 0 &&
      previous === 0
    ) {
      return "완료 기록 없음";
    }

    if (
      current > 0 &&
      previous === 0
    ) {
      return "최근 4주 첫 기록";
    }

    const difference =
      current - previous;

    if (difference === 0) {
      return "이전 4주와 동일";
    }

    return [
      "이전 4주보다 ",
      difference > 0
        ? "+"
        : "",
      difference,
      "회"
    ].join("");
  }

  function formatVolumeComparison(
    currentValue,
    previousValue
  ) {
    const current =
      Math.max(
        0,
        Number(currentValue) || 0
      );

    const previous =
      Math.max(
        0,
        Number(previousValue) || 0
      );

    if (
      current === 0 &&
      previous === 0
    ) {
      return "완료 기록 없음";
    }

    if (
      current > 0 &&
      previous === 0
    ) {
      return "최근 4주 첫 누적";
    }

    const difference =
      current - previous;

    if (difference === 0) {
      return "이전 4주와 동일";
    }

    return [
      "이전 4주보다 ",
      difference > 0
        ? "+"
        : "-",
      formatVolume(
        Math.abs(
          difference
        )
      )
    ].join("");
  }

  function createSnapshot(
    sessions,
    now = Date.now()
  ) {
    const currentStart =
      now -
      WINDOW_DAYS *
      DAY_MS;

    const previousStart =
      currentStart -
      WINDOW_DAYS *
      DAY_MS;

    const normalizedSessions =
      (
        Array.isArray(
          sessions
        )
          ? sessions
          : []
      )
        .filter(
          (session) => {
            const completedAt =
              getCompletedAtMillis(
                session
              );

            return (
              completedAt >=
                previousStart &&
              completedAt <=
                now
            );
          }
        );

    const currentSessions =
      normalizedSessions
        .filter(
          (session) =>
            getCompletedAtMillis(
              session
            ) >=
            currentStart
        );

    const previousSessions =
      normalizedSessions
        .filter(
          (session) => {
            const completedAt =
              getCompletedAtMillis(
                session
              );

            return (
              completedAt >=
                previousStart &&
              completedAt <
                currentStart
            );
          }
        );

    return {
      status: "ready",

      generatedAt:
        now,

      windowDays:
        WINDOW_DAYS,

      comparedSessionCount:
        normalizedSessions
          .length,

      current: {
        sessionCount:
          currentSessions.length,

        totalVolume:
          getTotalVolume(
            currentSessions
          )
      },

      previous: {
        sessionCount:
          previousSessions.length,

        totalVolume:
          getTotalVolume(
            previousSessions
          )
      }
    };
  }

  function renderLoading() {
    setGridState(
      "loading"
    );

    setText(
      "homeRecentWorkoutCount",
      "—"
    );

    setText(
      "homeRecentWorkoutCountChange",
      "기록 확인 중"
    );

    setText(
      "homeRecentVolume",
      "—"
    );

    setText(
      "homeRecentVolumeChange",
      "기록 확인 중"
    );

    setMessage(
      "최근 8주 완료 기록을 비교하고 있습니다."
    );
  }

  function renderSnapshot(
    snapshot
  ) {
    setGridState(
      "ready"
    );

    setText(
      "homeRecentWorkoutCount",
      `${snapshot.current.sessionCount}회`
    );

    setText(
      "homeRecentWorkoutCountChange",
      formatCountComparison(
        snapshot
          .current
          .sessionCount,

        snapshot
          .previous
          .sessionCount
      )
    );

    setText(
      "homeRecentVolume",
      formatVolume(
        snapshot
          .current
          .totalVolume
      )
    );

    setText(
      "homeRecentVolumeChange",
      formatVolumeComparison(
        snapshot
          .current
          .totalVolume,

        snapshot
          .previous
          .totalVolume
      )
    );

    if (
      snapshot
        .comparedSessionCount ===
      0
    ) {
      setMessage(
        "완료된 운동이 쌓이면 최근 흐름이 자동으로 표시됩니다."
      );

      return;
    }

    setMessage(
      [
        "최근 8주 완료 기록 ",
        snapshot
          .comparedSessionCount,
        "건을 비교했습니다."
      ].join("")
    );
  }

  function renderError(
    error
  ) {
    const message =
      String(
        error?.message ||
        "최근 흐름을 불러오지 못했습니다."
      );

    lastSnapshot = {
      status: "error",
      generatedAt:
        Date.now(),
      message
    };

    setGridState(
      "error"
    );

    setText(
      "homeRecentWorkoutCount",
      "확인 불가"
    );

    setText(
      "homeRecentWorkoutCountChange",
      "기록 화면은 계속 사용 가능"
    );

    setText(
      "homeRecentVolume",
      "확인 불가"
    );

    setText(
      "homeRecentVolumeChange",
      "잠시 후 다시 확인"
    );

    setMessage(
      "최근 흐름을 불러오지 못했습니다. 다른 운동 기록 기능에는 영향을 주지 않습니다."
    );
  }

  async function refresh() {
    if (loading) {
      return cloneValue(
        lastSnapshot
      );
    }

    const historyApi =
      window.JYMLog
        .history;

    if (
      typeof historyApi
        ?.loadRecentWorkoutSessions !==
      "function"
    ) {
      renderError(
        new Error(
          "운동 기록 모듈을 불러오지 못했습니다."
        )
      );

      return cloneValue(
        lastSnapshot
      );
    }

    loading =
      true;

    renderLoading();

    try {
      const sessions =
        await historyApi
          .loadRecentWorkoutSessions(
            QUERY_LIMIT
          );

      const snapshot =
        createSnapshot(
          sessions
        );

      lastSnapshot =
        snapshot;

      renderSnapshot(
        snapshot
      );

      return cloneValue(
        snapshot
      );
    } catch (error) {
      console.warn(
        "[JYM Log] 홈 최근 흐름 불러오기 실패",
        error
      );

      renderError(
        error
      );

      return cloneValue(
        lastSnapshot
      );
    } finally {
      loading =
        false;
    }
  }

  function initialize() {
    window.addEventListener(
      "jym-log:user-state-ready",
      () => {
        void refresh();
      }
    );

    window.addEventListener(
      "jym-log:workout-session-saved",
      () => {
        void refresh();
      }
    );

    window.addEventListener(
      "online",
      () => {
        if (
          lastSnapshot
            ?.status ===
          "error"
        ) {
          void refresh();
        }
      }
    );

    if (
      window.JYMLog
        .firebase
        ?.auth
        ?.currentUser
    ) {
      void refresh();
    }
  }

  initialize();

  window.JYMLog
    .homeInsights =
      Object.freeze({
        refresh,

        getSnapshot() {
          return cloneValue(
            lastSnapshot
          );
        }
      });
})();