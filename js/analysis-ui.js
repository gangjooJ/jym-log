(() => {
  "use strict";

  window.JYMLog =
    window.JYMLog || {};

  const ANALYSIS_MODULE_URL =
    new URL(
      "./analysis.js?v=dev0304",
      document.currentScript?.src ||
        window.location.href
    ).href;

  const EXERCISE_STORAGE_KEY =
    "jym-log:analysis:selected-exercise";

  let initialized =
    false;

  let loading =
    false;

  let selectedExercise =
    loadSelectedExercise();

  let selectedMetric =
    "estimatedOneRm";

  let lastAnalysis =
    null;

  const weekRange =
    document.getElementById(
      "analysisWeekRange"
    );

  const sessionCount =
    document.getElementById(
      "analysisSessionCount"
    );

  const weeklySets =
    document.getElementById(
      "analysisWeeklySets"
    );

  const weeklyVolume =
    document.getElementById(
      "analysisWeeklyVolume"
    );

  const analysisCard =
    document.getElementById(
      "analysisBenchCard"
    );

  const exerciseSelector =
    document.getElementById(
      "analysisExerciseSelector"
    );

  const metricSelector =
    document.getElementById(
      "analysisMetricSelector"
    );

  const bars =
    document.getElementById(
      "analysisBars"
    );

  const stateMessage =
    document.getElementById(
      "analysisState"
    );

  function loadSelectedExercise() {
    try {
      return String(
        localStorage.getItem(
          EXERCISE_STORAGE_KEY
        ) || ""
      );
    } catch (error) {
      console.warn(
        "[JYM Log] 분석 운동 선택값 불러오기 실패",
        error
      );

      return "";
    }
  }

  function saveSelectedExercise(
    value
  ) {
    try {
      localStorage.setItem(
        EXERCISE_STORAGE_KEY,
        String(value || "")
      );
    } catch (error) {
      console.warn(
        "[JYM Log] 분석 운동 선택값 저장 실패",
        error
      );
    }
  }

  function hasRequiredElements() {
    return Boolean(
      weekRange &&
      sessionCount &&
      weeklySets &&
      weeklyVolume &&
      analysisCard &&
      exerciseSelector &&
      metricSelector &&
      bars &&
      stateMessage
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

  function formatDateRange(
    startMillis,
    endMillis
  ) {
    const formatter =
      new Intl.DateTimeFormat(
        window.JYMLog
          .config.locale,
        {
          timeZone:
            window.JYMLog
              .config.timezone,

          month:
            "numeric",

          day:
            "numeric"
        }
      );

    return `${formatter.format(
      new Date(startMillis)
    )} – ${formatter.format(
      new Date(endMillis)
    )}`;
  }

  function formatBarDate(
    timestampMillis
  ) {
    return new Intl
      .DateTimeFormat(
        window.JYMLog
          .config.locale,
        {
          timeZone:
            window.JYMLog
              .config.timezone,

          month:
            "numeric",

          day:
            "numeric"
        }
      )
      .format(
        new Date(
          timestampMillis
        )
      );
  }

  function formatWeight(
    value
  ) {
    const number =
      Number(value) || 0;

    return number > 0
      ? `${number}kg`
      : "기록 없음";
  }

  function formatVolume(
    value
  ) {
    const number =
      Math.max(
        0,
        Math.round(
          Number(value) || 0
        )
      );

    return number > 0
      ? `${number.toLocaleString()}kg`
      : "기록 없음";
  }

  function formatChange(
    value,
    unit
  ) {
    const number =
      Number(value) || 0;

    if (number > 0) {
      return `직전보다 +${number}${unit}`;
    }

    if (number < 0) {
      return `직전보다 ${number}${unit}`;
    }

    return "직전과 동일";
  }

  function renderExerciseOptions(
    exerciseNames,
    activeExercise
  ) {
    const names =
      Array.isArray(
        exerciseNames
      )
        ? exerciseNames
        : [];

    exerciseSelector
      .replaceChildren();

    if (
      names.length ===
      0
    ) {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        "";

      option.textContent =
        "완료 운동 기록 없음";

      exerciseSelector
        .appendChild(
          option
        );

      exerciseSelector.disabled =
        true;

      return;
    }

    names.forEach(
      (name) => {
        const option =
          document.createElement(
            "option"
          );

        option.value =
          name;

        option.textContent =
          name;

        exerciseSelector
          .appendChild(
            option
          );
      }
    );

    exerciseSelector.disabled =
      false;

    exerciseSelector.value =
      activeExercise;
  }

  function getMetricConfig() {
    const configs = {
      estimatedOneRm: {
        key:
          "estimatedOneRm",

        unit:
          "kg",

        formatter:
          formatWeight
      },

      topWeight: {
        key:
          "topWeight",

        unit:
          "kg",

        formatter:
          formatWeight
      },

      volume: {
        key:
          "volume",

        unit:
          "kg",

        formatter:
          formatVolume
      }
    };

    return (
      configs[
        selectedMetric
      ] ||
      configs.estimatedOneRm
    );
  }

  function renderBars(
    trend
  ) {
    const safeTrend =
      Array.isArray(
        trend
      )
        ? trend
        : [];

    bars.replaceChildren();

    bars.style.setProperty(
      "--analysis-point-count",
      String(
        Math.max(
          1,
          safeTrend.length
        )
      )
    );

    if (
      safeTrend.length ===
      0
    ) {
      return;
    }

    const config =
      getMetricConfig();

    const values =
      safeTrend.map(
        (item) =>
          Math.max(
            0,
            Number(
              item[
                config.key
              ]
            ) || 0
          )
      );

    const minimum =
      Math.min(
        ...values
      );

    const maximum =
      Math.max(
        ...values
      );

    const range =
      Math.max(
        1,
        maximum -
          minimum
      );

    safeTrend.forEach(
      (
        item,
        index
      ) => {
        const value =
          values[index];

        const height =
          value <= 0
            ? 0
            : 42 +
              (
                (
                  value -
                  minimum
                ) /
                range
              ) *
              78;

        const barItem =
          document.createElement(
            "div"
          );

        barItem.className =
          "analysis-bar-item";

        barItem.classList.toggle(
          "is-pr",
          Boolean(
            lastAnalysis
              ?.exercise
              ?.isPersonalRecord &&
            index ===
              safeTrend.length - 1
          )
        );

        const valueElement =
          document.createElement(
            "span"
          );

        valueElement.className =
          "analysis-bar-value";

        valueElement.textContent =
          config.formatter(
            value
          );

        const column =
          document.createElement(
            "div"
          );

        column.className =
          "analysis-bar-column";

        column.style.height =
          `${Math.round(
            height
          )}px`;

        column.title =
          config.formatter(
            value
          );

        const label =
          document.createElement(
            "span"
          );

        label.className =
          "analysis-bar-label";

        label.textContent =
          formatBarDate(
            item.completedAtMillis
          );

        barItem.append(
          valueElement,
          column,
          label
        );

        bars.appendChild(
          barItem
        );
      }
    );
  }

  function renderExercise(
    exercise
  ) {
    const latest =
      exercise?.latest;

    const previous =
      exercise?.previous;

    setText(
      "analysisExerciseName",
      exercise?.exerciseName ||
      "기록 없음"
    );

    setText(
      "analysisTopWeight",
      formatWeight(
        latest?.topWeight
      )
    );

    setText(
      "analysisEstimatedOneRm",
      formatWeight(
        latest?.estimatedOneRm
      )
    );

    setText(
      "analysisExerciseVolume",
      formatVolume(
        latest?.volume
      )
    );

    setText(
      "analysisExerciseSessionCount",
      `${Number(
        exercise?.sessionCount
      ) || 0}회`
    );

    setText(
      "analysisExercisePeriod",
      exercise?.sessionCount > 0
        ? "완료 세션 기준"
        : "기록 없음"
    );

    if (!latest) {
      setText(
        "analysisTopWeightChange",
        "비교할 기록 없음"
      );

      setText(
        "analysisEstimatedOneRmChange",
        "비교할 기록 없음"
      );

      setText(
        "analysisExerciseVolumeChange",
        "비교할 기록 없음"
      );

      const badge =
        document.getElementById(
          "analysisPrBadge"
        );

      if (badge) {
        badge.dataset.state =
          "empty";

        badge.textContent =
          "기록 없음";
      }

      stateMessage.textContent =
        "선택한 운동의 완료 세트 기록이 없습니다.";

      renderBars([]);

      return;
    }

    setText(
      "analysisTopWeightChange",
      previous
        ? formatChange(
            exercise
              .changes
              .topWeight,
            "kg"
          )
        : "첫 완료 기록"
    );

    setText(
      "analysisEstimatedOneRmChange",
      previous
        ? formatChange(
            exercise
              .changes
              .estimatedOneRm,
            "kg"
          )
        : "첫 완료 기록"
    );

    setText(
      "analysisExerciseVolumeChange",
      previous
        ? formatChange(
            exercise
              .changes
              .volume,
            "kg"
          )
        : "첫 완료 기록"
    );

    const badge =
      document.getElementById(
        "analysisPrBadge"
      );

    if (badge) {
      badge.dataset.state =
        exercise
          .isPersonalRecord
          ? "pr"
          : "steady";

      badge.textContent =
        exercise
          .isPersonalRecord
          ? "새 개인기록"
          : "최근 기록";
    }

    renderBars(
      exercise.trend
    );

    stateMessage.textContent =
      exercise.sessionCount === 1
        ? "기록이 더 쌓이면 직전 세션과 변화를 비교합니다."
        : `최근 ${exercise.trend.length}회의 성과 추이를 표시했습니다.`;
  }

  function render(
    analysis
  ) {
    if (
      !hasRequiredElements() ||
      !analysis
    ) {
      return;
    }

    lastAnalysis =
      analysis;

    weekRange.textContent =
      formatDateRange(
        analysis
          .weekStartMillis,
        analysis
          .weekEndMillis
      );

    sessionCount.textContent =
      `${analysis.weeklySessionCount}회`;

    weeklySets.textContent =
      `${analysis.weeklyCompletedSets}세트`;

    weeklyVolume.textContent =
      `${Number(
        analysis.weeklyVolume
      ).toLocaleString()}kg`;

    selectedExercise =
      analysis.selectedExercise ||
      "";

    saveSelectedExercise(
      selectedExercise
    );

    renderExerciseOptions(
      analysis.exerciseNames,
      selectedExercise
    );

    renderExercise(
      analysis.exercise
    );
  }

  async function ensureAnalysisApi() {
    let analysisApi =
      window.JYMLog.analysis;

    if (
      typeof analysisApi
        ?.loadWorkoutAnalysis ===
      "function"
    ) {
      return analysisApi;
    }

    await import(
      ANALYSIS_MODULE_URL
    );

    analysisApi =
      window.JYMLog.analysis;

    if (
      typeof analysisApi
        ?.loadWorkoutAnalysis !==
      "function"
    ) {
      throw new Error(
        "운동 분석 모듈을 찾을 수 없습니다."
      );
    }

    return analysisApi;
  }

  async function load(
    exerciseName =
      selectedExercise
  ) {
    if (
      !hasRequiredElements() ||
      loading
    ) {
      return null;
    }

    const currentUser =
      window.JYMLog
        .firebase
        ?.auth
        ?.currentUser;

    if (!currentUser?.uid) {
      analysisCard.setAttribute(
        "aria-busy",
        "false"
      );

      stateMessage.classList.remove(
        "error"
      );

      stateMessage.textContent =
        "로그인 상태를 확인하고 있습니다.";

      return null;
    }

    loading =
      true;

    analysisCard.setAttribute(
      "aria-busy",
      "true"
    );

    stateMessage.classList.remove(
      "error"
    );

    stateMessage.textContent =
      "운동 기록을 분석하고 있습니다.";

    try {
      const analysisApi =
        await ensureAnalysisApi();

      const analysis =
        await analysisApi
          .loadWorkoutAnalysis(
            200,
            exerciseName
          );

      render(
        analysis
      );
    } catch (error) {
      const isAuthUnavailable =
        error?.message ===
        "로그인 사용자를 확인할 수 없습니다.";

      if (isAuthUnavailable) {
        stateMessage.classList.remove(
          "error"
        );

        stateMessage.textContent =
          "로그인 상태를 확인하고 있습니다.";

        return null;
      }

      console.error(
        "[JYM Log] 운동 분석 불러오기 실패",
        error
      );

      stateMessage.classList.add(
        "error"
      );

      stateMessage.textContent =
        "분석 데이터를 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.";
    } finally {
      loading =
        false;

      analysisCard.setAttribute(
        "aria-busy",
        "false"
      );
    }
  }

  function reset() {
    if (!hasRequiredElements()) {
      return;
    }

    weekRange.textContent =
      "불러오는 중";

    sessionCount.textContent =
      "—";

    weeklySets.textContent =
      "—";

    weeklyVolume.textContent =
      "—";

    setText(
      "analysisExerciseName",
      "—"
    );

    setText(
      "analysisTopWeight",
      "—"
    );

    setText(
      "analysisEstimatedOneRm",
      "—"
    );

    setText(
      "analysisExerciseVolume",
      "—"
    );

    setText(
      "analysisExerciseSessionCount",
      "—"
    );

    stateMessage.textContent =
      "운동 기록을 분석하고 있습니다.";

    renderBars([]);
  }

  function initialize() {
    if (initialized) {
      return;
    }

    exerciseSelector
      ?.addEventListener(
        "change",
        () => {
          selectedExercise =
            exerciseSelector.value;

          saveSelectedExercise(
            selectedExercise
          );

          void load(
            selectedExercise
          );
        }
      );

    metricSelector
      ?.addEventListener(
        "change",
        () => {
          selectedMetric =
            metricSelector.value;

          renderBars(
            lastAnalysis
              ?.exercise
              ?.trend ||
            []
          );
        }
      );

    window.addEventListener(
      "jym-log:workout-session-saved",
      () => {
        void load(
          selectedExercise
        );
      }
    );

    window.addEventListener(
      "jym-log:user-state-ready",
      () => {
        const analysisScreen =
          document.getElementById(
            "screen-analysis"
          );

        if (
          analysisScreen
            ?.classList
            .contains("active")
        ) {
          void load(
            selectedExercise
          );
        }
      }
    );

    reset();

    initialized =
      true;
  }

  window.JYMLog.analysisUI =
    Object.freeze({
      initialize,
      load,
      reset,
      render,

      get selectedExercise() {
        return selectedExercise;
      }
    });
})();