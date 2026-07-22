(() => {
  "use strict";

  window.JYMLog = window.JYMLog || {};

  const DAY_MS = 24 * 60 * 60 * 1000;
  const HOME_WINDOW_DAYS = 28;
  const WEEK_DAYS = 7;
  const WEEK_MS = WEEK_DAYS * DAY_MS;
  const DEFAULT_ANALYSIS_WEEKS = 8;
  const ANALYSIS_WEEK_OPTIONS = Object.freeze([4, 8, 12]);
  const PERIOD_STORAGE_KEY = "jym-log:home-insights:period-weeks";
  const QUERY_LIMIT = 200;

  const gridElement = document.getElementById("homeInsightsGrid");
  const messageElement = document.getElementById("homeInsightsMessage");
  const detailStateElement = document.getElementById(
    "insightsDetailState"
  );
  const detailMessageElement = document.getElementById(
    "insightsDetailMessage"
  );
  const refreshButton = document.getElementById("refreshInsightsBtn");
  const periodButtons = Array.from(
    document.querySelectorAll("[data-insights-weeks]")
  );

  let loading = false;
  let lastSnapshot = null;
  let lastSessions = [];
  let hasLoadedSessions = false;
  let selectedAnalysisWeeks = loadAnalysisWeeks();

  function cloneValue(value) {
    if (!value) {
      return null;
    }

    return JSON.parse(JSON.stringify(value));
  }

  function normalizeAnalysisWeeks(value) {
    const numericValue = Number(value);

    return ANALYSIS_WEEK_OPTIONS.includes(numericValue)
      ? numericValue
      : DEFAULT_ANALYSIS_WEEKS;
  }

  function loadAnalysisWeeks() {
    try {
      return normalizeAnalysisWeeks(
        localStorage.getItem(PERIOD_STORAGE_KEY)
      );
    } catch (error) {
      console.warn(
        "[JYM Log] 최근 흐름 분석 기간 불러오기 실패",
        error
      );

      return DEFAULT_ANALYSIS_WEEKS;
    }
  }

  function saveAnalysisWeeks(value) {
    try {
      localStorage.setItem(PERIOD_STORAGE_KEY, String(value));
    } catch (error) {
      console.warn(
        "[JYM Log] 최근 흐름 분석 기간 저장 실패",
        error
      );
    }
  }

  function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = String(value);
    }
  }

  function setMessage(message) {
    if (messageElement) {
      messageElement.textContent = String(message);
    }
  }

  function setDetailMessage(message) {
    if (detailMessageElement) {
      detailMessageElement.textContent = String(message);
    }
  }

  function setGridState(state) {
    if (!gridElement) {
      return;
    }

    gridElement.dataset.state = String(state);
    gridElement.setAttribute(
      "aria-busy",
      String(state === "loading")
    );
  }

  function setDetailState(state) {
    if (!detailStateElement) {
      return;
    }

    detailStateElement.dataset.state = String(state);
    detailStateElement.setAttribute(
      "aria-busy",
      String(state === "loading")
    );
  }

  function setTrendText(id, change) {
    const element = document.getElementById(id);

    if (!element) {
      return;
    }

    element.textContent = change.label;
    element.dataset.trend = change.trend;
  }

  function updatePeriodPresentation(
    weeks = selectedAnalysisWeeks
  ) {
    const normalizedWeeks =
      normalizeAnalysisWeeks(weeks);

    periodButtons.forEach((button) => {
      const active =
        Number(button.dataset.insightsWeeks) ===
        normalizedWeeks;

      button.setAttribute(
        "aria-pressed",
        String(active)
      );
    });

    setText(
      "insightsPeriodEyebrow",
      `최근 ${normalizedWeeks}주`
    );

    setText(
      "insightsDetailDescription",
      `최근 ${normalizedWeeks}주와 이전 ${normalizedWeeks}주를 비교하고, 7일 단위 운동 흐름을 표시합니다.`
    );

    setText(
      "insightsAverageDurationLabel",
      `최근 ${normalizedWeeks}주 기준`
    );

    setText(
      "insightsPeriodWorkoutLabel",
      `최근 ${normalizedWeeks}주 운동`
    );

    setText(
      "insightsPeriodVolumeLabel",
      `최근 ${normalizedWeeks}주 볼륨`
    );

    setText(
      "insightsComparisonPeriodLabel",
      `이전 ${normalizedWeeks}주와 비교`
    );

    setText(
      "insightsCountChartPeriod",
      `7일 단위 · 최근 ${normalizedWeeks}주`
    );

    setText(
      "insightsVolumeChartPeriod",
      `7일 단위 · 최근 ${normalizedWeeks}주`
    );

    const countChart = document.getElementById(
      "insightsWeeklyCountChart"
    );

    const volumeChart = document.getElementById(
      "insightsWeeklyVolumeChart"
    );

    countChart?.setAttribute(
      "aria-label",
      `최근 ${normalizedWeeks}주 주차별 운동 횟수`
    );

    volumeChart?.setAttribute(
      "aria-label",
      `최근 ${normalizedWeeks}주 주차별 운동 볼륨`
    );
  }

  function getCompletedAtMillis(session) {
    const value = Number(
      session?.completedAtMillis
    );

    return Number.isFinite(value)
      ? value
      : 0;
  }

  function getTotalVolume(sessions) {
    return Math.round(
      sessions.reduce(
        (total, session) =>
          total +
          Math.max(
            0,
            Number(session?.totalVolume) || 0
          ),
        0
      )
    );
  }

  function getAverageDuration(sessions) {
    const durations = sessions
      .map((session) =>
        Math.max(
          0,
          Number(session?.durationSeconds) || 0
        )
      )
      .filter(
        (duration) =>
          duration > 0
      );

    if (durations.length === 0) {
      return 0;
    }

    return Math.round(
      durations.reduce(
        (total, duration) =>
          total + duration,
        0
      ) /
        durations.length
    );
  }

  function formatDuration(value) {
    const totalSeconds = Math.max(
      0,
      Math.round(
        Number(value) || 0
      )
    );

    if (totalSeconds === 0) {
      return "기록 없음";
    }

    const totalMinutes = Math.max(
      1,
      Math.round(
        totalSeconds / 60
      )
    );

    if (totalMinutes < 60) {
      return `${totalMinutes}분`;
    }

    const hours = Math.floor(
      totalMinutes / 60
    );

    const minutes =
      totalMinutes % 60;

    return minutes > 0
      ? `${hours}시간 ${minutes}분`
      : `${hours}시간`;
  }

  function formatRecentDate(value) {
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

  function formatChartVolume(value) {
    const volume = Math.max(
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

  function formatVolume(value) {
    const volume = Math.max(
      0,
      Math.round(
        Number(value) || 0
      )
    );

    if (volume >= 10000) {
      return `${new Intl
        .NumberFormat(
          "ko-KR",
          {
            maximumFractionDigits: 1
          }
        )
        .format(
          volume / 1000
        )}톤`;
    }

    return `${new Intl
      .NumberFormat("ko-KR")
      .format(volume)}kg`;
  }

  function formatAverageCount(value) {
    return `${new Intl
      .NumberFormat(
        "ko-KR",
        {
          maximumFractionDigits: 1
        }
      )
      .format(
        Math.max(
          0,
          Number(value) || 0
        )
      )}회`;
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

    return `이전 4주보다 ${
      difference > 0
        ? "+"
        : ""
    }${difference}회`;
  }

  function formatVolumeComparison(
    currentValue,
    previousValue
  ) {
    const current = Math.max(
      0,
      Number(currentValue) || 0
    );

    const previous = Math.max(
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

    return `이전 4주보다 ${
      difference > 0
        ? "+"
        : "-"
    }${formatVolume(
      Math.abs(difference)
    )}`;
  }

  function createPercentChange(
    currentValue,
    previousValue
  ) {
    const current = Math.max(
      0,
      Number(currentValue) || 0
    );

    const previous = Math.max(
      0,
      Number(previousValue) || 0
    );

    if (
      current === 0 &&
      previous === 0
    ) {
      return {
        value: 0,
        label: "0%",
        trend: "neutral"
      };
    }

    if (previous === 0) {
      return {
        value: null,
        label: "신규",
        trend: "new"
      };
    }

    const percent = Math.round(
      (
        (
          current -
          previous
        ) /
        previous
      ) *
      100
    );

    return {
      value: percent,

      label:
        `${
          percent > 0
            ? "+"
            : ""
        }${percent}%`,

      trend:
        percent > 0
          ? "up"
          : percent < 0
            ? "down"
            : "neutral"
    };
  }

  function createWeeklyBuckets(
    sessions,
    now,
    weekCount
  ) {
    const normalizedWeekCount =
      normalizeAnalysisWeeks(
        weekCount
      );

    const oldestStart =
      now -
      normalizedWeekCount *
      WEEK_MS;

    const buckets =
      Array.from(
        {
          length:
            normalizedWeekCount
        },
        (
          _,
          index
        ) => {
          const weeksAgo =
            normalizedWeekCount -
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
            normalizedWeekCount - 1,
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

  function findBestWeek(weekly) {
    const candidates =
      Array.isArray(weekly)
        ? weekly
        : [];

    return candidates.reduce(
      (
        best,
        bucket
      ) => {
        if (
          bucket.totalVolume <= 0 &&
          bucket.sessionCount <= 0
        ) {
          return best;
        }

        if (!best) {
          return bucket;
        }

        if (
          bucket.totalVolume >
          best.totalVolume
        ) {
          return bucket;
        }

        if (
          bucket.totalVolume ===
            best.totalVolume &&
          bucket.sessionCount >
            best.sessionCount
        ) {
          return bucket;
        }

        return best;
      },
      null
    );
  }

  function createSnapshot(
    sessions,
    now = Date.now(),
    analysisWeeks =
      selectedAnalysisWeeks
  ) {
    const normalizedAnalysisWeeks =
      normalizeAnalysisWeeks(
        analysisWeeks
      );

    const homeCurrentStart =
      now -
      HOME_WINDOW_DAYS *
      DAY_MS;

    const homePreviousStart =
      homeCurrentStart -
      HOME_WINDOW_DAYS *
      DAY_MS;

    const analysisWindowMs =
      normalizedAnalysisWeeks *
      WEEK_MS;

    const analysisCurrentStart =
      now -
      analysisWindowMs;

    const analysisPreviousStart =
      analysisCurrentStart -
      analysisWindowMs;

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

    const homeComparedSessions =
      validSessions.filter(
        (session) =>
          getCompletedAtMillis(
            session
          ) >=
          homePreviousStart
      );

    const homeCurrentSessions =
      homeComparedSessions.filter(
        (session) =>
          getCompletedAtMillis(
            session
          ) >=
          homeCurrentStart
      );

    const homePreviousSessions =
      homeComparedSessions.filter(
        (session) => {
          const completedAt =
            getCompletedAtMillis(
              session
            );

          return (
            completedAt >=
              homePreviousStart &&
            completedAt <
              homeCurrentStart
          );
        }
      );

    const analysisComparedSessions =
      validSessions.filter(
        (session) =>
          getCompletedAtMillis(
            session
          ) >=
          analysisPreviousStart
      );

    const analysisCurrentSessions =
      analysisComparedSessions.filter(
        (session) =>
          getCompletedAtMillis(
            session
          ) >=
          analysisCurrentStart
      );

    const analysisPreviousSessions =
      analysisComparedSessions.filter(
        (session) => {
          const completedAt =
            getCompletedAtMillis(
              session
            );

          return (
            completedAt >=
              analysisPreviousStart &&
            completedAt <
              analysisCurrentStart
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

    const weekly =
      createWeeklyBuckets(
        analysisCurrentSessions,
        now,
        normalizedAnalysisWeeks
      );

    const currentSessionCount =
      analysisCurrentSessions.length;

    const currentTotalVolume =
      getTotalVolume(
        analysisCurrentSessions
      );

    const previousSessionCount =
      analysisPreviousSessions.length;

    const previousTotalVolume =
      getTotalVolume(
        analysisPreviousSessions
      );

    return {
      status: "ready",

      generatedAt:
        now,

      windowDays:
        HOME_WINDOW_DAYS,

      weekDays:
        WEEK_DAYS,

      comparedSessionCount:
        homeComparedSessions.length,

      recentWorkoutAt,

      current: {
        sessionCount:
          homeCurrentSessions.length,

        totalVolume:
          getTotalVolume(
            homeCurrentSessions
          ),

        averageDurationSeconds:
          getAverageDuration(
            homeCurrentSessions
          )
      },

      previous: {
        sessionCount:
          homePreviousSessions.length,

        totalVolume:
          getTotalVolume(
            homePreviousSessions
          ),

        averageDurationSeconds:
          getAverageDuration(
            homePreviousSessions
          )
      },

      analysis: {
        weeks:
          normalizedAnalysisWeeks,

        days:
          normalizedAnalysisWeeks *
          WEEK_DAYS,

        comparedSessionCount:
          analysisComparedSessions.length,

        current: {
          sessionCount:
            currentSessionCount,

          totalVolume:
            currentTotalVolume,

          averageDurationSeconds:
            getAverageDuration(
              analysisCurrentSessions
            ),

          weeklyAverageSessionCount:
            currentSessionCount /
            normalizedAnalysisWeeks,

          weeklyAverageVolume:
            currentTotalVolume /
            normalizedAnalysisWeeks
        },

        previous: {
          sessionCount:
            previousSessionCount,

          totalVolume:
            previousTotalVolume,

          averageDurationSeconds:
            getAverageDuration(
              analysisPreviousSessions
            ),

          weeklyAverageSessionCount:
            previousSessionCount /
            normalizedAnalysisWeeks,

          weeklyAverageVolume:
            previousTotalVolume /
            normalizedAnalysisWeeks
        },

        changes: {
          sessionCount:
            createPercentChange(
              currentSessionCount,
              previousSessionCount
            ),

          totalVolume:
            createPercentChange(
              currentTotalVolume,
              previousTotalVolume
            )
        },

        weekly,

        bestWeek:
          findBestWeek(
            weekly
          )
      }
    };
  }

  function clearElement(id) {
    document
      .getElementById(id)
      ?.replaceChildren();
  }

  function renderWeeklyChart(
    elementId,
    buckets,
    valueKey,
    formatter,
    bestWeekIndex = -1
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

    container.style.setProperty(
      "--insights-week-count",
      String(
        Math.max(
          1,
          safeBuckets.length
        )
      )
    );

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
                ) *
                100
              )
            : 0;

        const item =
          document.createElement(
            "div"
          );

        item.className =
          "insights-bar-item";

        item.classList.toggle(
          "is-best",
          bucket.index ===
            bestWeekIndex
        );

        item.setAttribute(
          "aria-label",
          `${
            bucket.label
          }: ${
            formatter(value)
          }${
            bucket.index ===
              bestWeekIndex
              ? ", 최고 주차"
              : ""
          }`
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

    updatePeriodPresentation();

    [
      "insightsRecentWorkout",
      "insightsAverageDuration",
      "insightsCurrentWorkoutCount",
      "insightsCurrentVolume",
      "insightsWeeklyAverageCount",
      "insightsWeeklyAverageVolume",
      "insightsBestWeek"
    ].forEach(
      (id) =>
        setText(
          id,
          "—"
        )
    );

    setTrendText(
      "insightsCountChangePercent",
      {
        label: "—",
        trend: "neutral"
      }
    );

    setTrendText(
      "insightsVolumeChangePercent",
      {
        label: "—",
        trend: "neutral"
      }
    );

    setText(
      "insightsBestWeekMeta",
      "기록 확인 중"
    );

    setDetailMessage(
      "완료 운동 기록을 불러오고 있습니다."
    );
  }

  function renderDetailSnapshot(
    snapshot
  ) {
    const analysis =
      snapshot.analysis;

    const bestWeek =
      analysis.bestWeek;

    const bestWeekIndex =
      bestWeek?.index ??
      -1;

    setDetailState(
      "ready"
    );

    updatePeriodPresentation(
      analysis.weeks
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
        analysis
          .current
          .averageDurationSeconds
      )
    );

    setText(
      "insightsCurrentWorkoutCount",
      `${analysis.current.sessionCount}회`
    );

    setText(
      "insightsCurrentVolume",
      formatVolume(
        analysis
          .current
          .totalVolume
      )
    );

    setText(
      "insightsWeeklyAverageCount",
      formatAverageCount(
        analysis
          .current
          .weeklyAverageSessionCount
      )
    );

    setText(
      "insightsWeeklyAverageVolume",
      formatVolume(
        analysis
          .current
          .weeklyAverageVolume
      )
    );

    setTrendText(
      "insightsCountChangePercent",
      analysis
        .changes
        .sessionCount
    );

    setTrendText(
      "insightsVolumeChangePercent",
      analysis
        .changes
        .totalVolume
    );

    if (bestWeek) {
      setText(
        "insightsBestWeek",
        bestWeek.label
      );

      setText(
        "insightsBestWeekMeta",
        `${bestWeek.sessionCount}회 · ${formatVolume(
          bestWeek.totalVolume
        )}`
      );
    } else {
      setText(
        "insightsBestWeek",
        "기록 없음"
      );

      setText(
        "insightsBestWeekMeta",
        "선택 기간 완료 기록 없음"
      );
    }

    renderWeeklyChart(
      "insightsWeeklyCountChart",
      analysis.weekly,
      "sessionCount",
      (value) =>
        `${Math.round(value)}회`,
      bestWeekIndex
    );

    renderWeeklyChart(
      "insightsWeeklyVolumeChart",
      analysis.weekly,
      "totalVolume",
      formatChartVolume,
      bestWeekIndex
    );

    if (
      analysis
        .current
        .sessionCount ===
      0
    ) {
      setDetailMessage(
        `최근 ${analysis.weeks}주 완료 기록이 없습니다.`
      );

      return;
    }

    setDetailMessage(
      `최근 ${analysis.weeks}주와 이전 ${analysis.weeks}주 완료 기록 ${analysis.comparedSessionCount}건을 비교했습니다.`
    );
  }

  function renderDetailError(
    message
  ) {
    setDetailState(
      "error"
    );

    [
      "insightsRecentWorkout",
      "insightsAverageDuration",
      "insightsCurrentWorkoutCount",
      "insightsCurrentVolume",
      "insightsWeeklyAverageCount",
      "insightsWeeklyAverageVolume",
      "insightsBestWeek"
    ].forEach(
      (id) =>
        setText(
          id,
          "확인 불가"
        )
    );

    setTrendText(
      "insightsCountChangePercent",
      {
        label: "확인 불가",
        trend: "neutral"
      }
    );

    setTrendText(
      "insightsVolumeChangePercent",
      {
        label: "확인 불가",
        trend: "neutral"
      }
    );

    setText(
      "insightsBestWeekMeta",
      "잠시 후 다시 확인"
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
      `최근 8주 완료 기록 ${snapshot.comparedSessionCount}건을 비교했습니다.`
    );
  }

  function renderError(error) {
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
      window.JYMLog.history;

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

      lastSessions =
        Array.isArray(
          sessions
        )
          ? sessions
          : [];

      hasLoadedSessions =
        true;

      const snapshot =
        createSnapshot(
          lastSessions,
          Date.now(),
          selectedAnalysisWeeks
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

  async function setPeriodWeeks(
    value
  ) {
    const nextWeeks =
      normalizeAnalysisWeeks(
        value
      );

    selectedAnalysisWeeks =
      nextWeeks;

    saveAnalysisWeeks(
      nextWeeks
    );

    updatePeriodPresentation(
      nextWeeks
    );

    if (!hasLoadedSessions) {
      return refresh();
    }

    const snapshot =
      createSnapshot(
        lastSessions,
        Date.now(),
        nextWeeks
      );

    lastSnapshot =
      snapshot;

    renderSnapshot(
      snapshot
    );

    window.dispatchEvent(
      new CustomEvent(
        "jym-log:home-insights-period-changed",
        {
          detail: {
            weeks:
              nextWeeks
          }
        }
      )
    );

    return cloneValue(
      snapshot
    );
  }

  function initialize() {
    updatePeriodPresentation();

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

    periodButtons.forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            void setPeriodWeeks(
              button.dataset
                .insightsWeeks
            );
          }
        );
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

  window.JYMLog.homeInsights =
    Object.freeze({
      refresh,
      setPeriodWeeks,

      getSnapshot() {
        return cloneValue(
          lastSnapshot
        );
      },

      get periodWeeks() {
        return selectedAnalysisWeeks;
      }
    });
})();