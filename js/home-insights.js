(() => {
  "use strict";

  window.JYMLog =
    window.JYMLog || {};

  const DAY_MS =
    24 * 60 * 60 * 1000;

  const WINDOW_DAYS =
    28;

  const WEEK_DAYS =
    7;

  const WEEK_COUNT =
    8;

  const WEEK_MS =
    WEEK_DAYS * DAY_MS;

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

  const detailStateElement =
    document.getElementById(
      "insightsDetailState"
    );

  const detailMessageElement =
    document.getElementById(
      "insightsDetailMessage"
    );

  const refreshButton =
    document.getElementById(
      "refreshInsightsBtn"
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

  function getAverageDuration(
    sessions
  ) {
    const durations =
      sessions
        .map(
          (session) =>
            Math.max(
              0,
              Number(
                session
                  ?.durationSeconds
              ) || 0
            )
        )
        .filter(
          (duration) =>
            duration > 0
        );

    if (
      durations.length ===
      0
    ) {
      return 0;
    }

    return Math.round(
      durations.reduce(
        (
          total,
          duration
        ) =>
          total + duration,
        0
      ) /
      durations.length
    );
  }

  function formatDuration(
    value
  ) {
    const totalSeconds =
      Math.max(
        0,
        Math.round(
          Number(value) || 0
        )
      );

    if (totalSeconds === 0) {
      return "기록 없음";
    }

    const totalMinutes =
      Math.max(
        1,
        Math.round(
          totalSeconds / 60
        )
      );

    if (totalMinutes < 60) {
      return `${totalMinutes}분`;
    }

    const hours =
      Math.floor(
        totalMinutes / 60
      );

    const minutes =
      totalMinutes % 60;

    return minutes > 0
      ? `${hours}시간 ${minutes}분`
      : `${hours}시간`;
  }

  function formatRecentDate(
    value
  ) {
    const timestamp =
      Number(value) || 0;

    if (timestamp <= 0) {
      return "기록 없음";
    }

    return new Intl
      .DateTimeFormat(
        "ko-KR",
        {
          month: "long",
          day: "numeric"
        }
      )
      .format(
        new Date(timestamp)
      );
  }

  function formatChartVolume(
    value
  ) {
    const volume =
      Math.max(
        0,
        Number(value) || 0
      );

    if (volume >= 10000) {
      return `${Math.round(
        volume / 1000
      )}t`;
    }

    if (volume >= 1000) {
      return `${(
        volume / 1000
      ).toFixed(1)}t`;
    }

    return String(
      Math.round(volume)
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

  function createWeeklyBuckets(
    sessions,
    now
  ) {
    const oldestStart =
      now -
      WEEK_COUNT *
      WEEK_MS;

    const buckets =
      Array.from(
        {
          length:
            WEEK_COUNT
        },
        (
          _,
          index
        ) => {
          const weeksAgo =
            WEEK_COUNT -
            index -
            1;

          return {
            index,

            startAt:
              oldestStart +
              index *
              WEEK_MS,

            endAt:
              oldestStart +
              (
                index + 1
              ) *
              WEEK_MS,

            label:
              weeksAgo === 0
                ? "이번 7일"
                : `${weeksAgo}주 전`,

            shortLabel:
              weeksAgo === 0
                ? "이번"
                : `${weeksAgo}주`,

            sessions: []
          };
        }
      );

    sessions.forEach(
      (session) => {
        const completedAt =
          getCompletedAtMillis(
            session
          );

        if (
          completedAt <
            oldestStart ||
          completedAt >
            now
        ) {
          return;
        }

        const rawIndex =
          Math.floor(
            (
              completedAt -
              oldestStart
            ) /
            WEEK_MS
          );

        const bucketIndex =
          Math.min(
            WEEK_COUNT - 1,
            Math.max(
              0,
              rawIndex
            )
          );

        buckets[
          bucketIndex
        ].sessions.push(
          session
        );
      }
    );

    return buckets.map(
      (bucket) => ({
        index:
          bucket.index,

        startAt:
          bucket.startAt,

        endAt:
          bucket.endAt,

        label:
          bucket.label,

        shortLabel:
          bucket.shortLabel,

        sessionCount:
          bucket.sessions.length,

        totalVolume:
          getTotalVolume(
            bucket.sessions
          ),

        averageDurationSeconds:
          getAverageDuration(
            bucket.sessions
          )
      })
    );
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

    const validSessions =
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
              completedAt > 0 &&
              completedAt <= now
            );
          }
        );

    const comparedSessions =
      validSessions
        .filter(
          (session) =>
            getCompletedAtMillis(
              session
            ) >=
            previousStart
        );

    const currentSessions =
      comparedSessions
        .filter(
          (session) =>
            getCompletedAtMillis(
              session
            ) >=
            currentStart
        );

    const previousSessions =
      comparedSessions
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

    const recentWorkoutAt =
      validSessions.reduce(
        (
          latest,
          session
        ) =>
          Math.max(
            latest,
            getCompletedAtMillis(
              session
            )
          ),
        0
      );

    return {
      status: "ready",

      generatedAt:
        now,

      windowDays:
        WINDOW_DAYS,

      weekDays:
        WEEK_DAYS,

      comparedSessionCount:
        comparedSessions.length,

      recentWorkoutAt,

      current: {
        sessionCount:
          currentSessions.length,

        totalVolume:
          getTotalVolume(
            currentSessions
          ),

        averageDurationSeconds:
          getAverageDuration(
            currentSessions
          )
      },

      previous: {
        sessionCount:
          previousSessions.length,

        totalVolume:
          getTotalVolume(
            previousSessions
          ),

        averageDurationSeconds:
          getAverageDuration(
            previousSessions
          )
      },

      weekly:
        createWeeklyBuckets(
          comparedSessions,
          now
        )
    };
  }

  function setDetailState(
    state
  ) {
    if (!detailStateElement) {
      return;
    }

    detailStateElement.dataset.state =
      String(state);

    detailStateElement.setAttribute(
      "aria-busy",
      String(
        state === "loading"
      )
    );
  }

  function setDetailMessage(
    message
  ) {
    if (detailMessageElement) {
      detailMessageElement.textContent =
        String(message);
    }
  }

  function clearElement(
    id
  ) {
    document
      .getElementById(id)
      ?.replaceChildren();
  }

  function renderWeeklyChart(
    elementId,
    buckets,
    valueKey,
    formatter
  ) {
    const container =
      document.getElementById(
        elementId
      );

    if (!container) {
      return;
    }

    const safeBuckets =
      Array.isArray(
        buckets
      )
        ? buckets
        : [];

    const values =
      safeBuckets.map(
        (bucket) =>
          Math.max(
            0,
            Number(
              bucket?.[
                valueKey
              ]
            ) || 0
          )
      );

    const maxValue =
      Math.max(
        ...values,
        0
      );

    container.replaceChildren();

    safeBuckets.forEach(
      (
        bucket,
        index
      ) => {
        const value =
          values[index];

        const height =
          maxValue > 0 &&
          value > 0
            ? Math.max(
                8,
                (
                  value /
                  maxValue
                ) * 100
              )
            : 0;

        const item =
          document.createElement(
            "div"
          );

        item.className =
          "insights-bar-item";

        item.setAttribute(
          "aria-label",
          `${bucket.label}: ${formatter(
            value
          )}`
        );

        const valueElement =
          document.createElement(
            "span"
          );

        valueElement.className =
          "insights-bar-value";

        valueElement.textContent =
          formatter(value);

        const track =
          document.createElement(
            "div"
          );

        track.className =
          "insights-bar-track";

        const fill =
          document.createElement(
            "div"
          );

        fill.className =
          "insights-bar-fill";

        fill.style.setProperty(
          "--insights-bar-height",
          `${height}%`
        );

        track.appendChild(
          fill
        );

        const label =
          document.createElement(
            "span"
          );

        label.className =
          "insights-bar-label";

        label.textContent =
          bucket.shortLabel;

        item.append(
          valueElement,
          track,
          label
        );

        container.appendChild(
          item
        );
      }
    );
  }

  function renderDetailLoading() {
    setDetailState(
      "loading"
    );

    setText(
      "insightsRecentWorkout",
      "—"
    );

    setText(
      "insightsAverageDuration",
      "—"
    );

    setText(
      "insightsCurrentWorkoutCount",
      "—"
    );

    setText(
      "insightsCurrentVolume",
      "—"
    );

    setDetailMessage(
      "완료 운동 기록을 불러오고 있습니다."
    );
  }

  function renderDetailSnapshot(
    snapshot
  ) {
    setDetailState(
      "ready"
    );

    setText(
      "insightsRecentWorkout",
      formatRecentDate(
        snapshot.recentWorkoutAt
      )
    );

    setText(
      "insightsAverageDuration",
      formatDuration(
        snapshot
          .current
          .averageDurationSeconds
      )
    );

    setText(
      "insightsCurrentWorkoutCount",
      `${snapshot.current.sessionCount}회`
    );

    setText(
      "insightsCurrentVolume",
      formatVolume(
        snapshot
          .current
          .totalVolume
      )
    );

    renderWeeklyChart(
      "insightsWeeklyCountChart",
      snapshot.weekly,
      "sessionCount",
      (value) =>
        `${Math.round(value)}회`
    );

    renderWeeklyChart(
      "insightsWeeklyVolumeChart",
      snapshot.weekly,
      "totalVolume",
      formatChartVolume
    );

    if (
      snapshot
        .comparedSessionCount ===
      0
    ) {
      setDetailMessage(
        "최근 8주 완료 기록이 없습니다."
      );

      return;
    }

    setDetailMessage(
      `최근 8주 완료 기록 ${snapshot.comparedSessionCount}건을 7일 단위로 표시했습니다.`
    );
  }

  function renderDetailError(
    message
  ) {
    setDetailState(
      "error"
    );

    setText(
      "insightsRecentWorkout",
      "확인 불가"
    );

    setText(
      "insightsAverageDuration",
      "확인 불가"
    );

    setText(
      "insightsCurrentWorkoutCount",
      "확인 불가"
    );

    setText(
      "insightsCurrentVolume",
      "확인 불가"
    );

    clearElement(
      "insightsWeeklyCountChart"
    );

    clearElement(
      "insightsWeeklyVolumeChart"
    );

    setDetailMessage(
      message ||
      "최근 흐름 상세 정보를 불러오지 못했습니다."
    );
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

    renderDetailLoading();
  }

  function renderSnapshot(
    snapshot
  ) {
    setGridState(
      "ready"
    );

    renderDetailSnapshot(
      snapshot
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

    renderDetailError(
      message
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

    refreshButton
      ?.addEventListener(
        "click",
        () => {
          void refresh();
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