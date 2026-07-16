(() => {
  window.JYMLog =
    window.JYMLog || {};

  let initialized = false;

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

  const benchCard =
    document.getElementById(
      "analysisBenchCard"
    );

  const benchWeight =
    document.getElementById(
      "analysisBenchWeight"
    );

  const benchChange =
    document.getElementById(
      "analysisBenchChange"
    );

  const bars =
    document.getElementById(
      "analysisBars"
    );

  const stateMessage =
    document.getElementById(
      "analysisState"
    );

  function hasRequiredElements() {
    return Boolean(
      weekRange &&
      sessionCount &&
      weeklySets &&
      weeklyVolume &&
      benchCard &&
      benchWeight &&
      benchChange &&
      bars &&
      stateMessage
    );
  }

  function formatDateRange(
    startMillis,
    endMillis
  ) {
    const formatter =
      new Intl.DateTimeFormat(
        window.JYMLog.config.locale,
        {
          timeZone:
            window.JYMLog.config
              .timezone,
          month: "numeric",
          day: "numeric"
        }
      );

    return `${
      formatter.format(
        new Date(startMillis)
      )
    } – ${
      formatter.format(
        new Date(endMillis)
      )
    }`;
  }

  function formatBarDate(
    timestampMillis
  ) {
    return new Intl.DateTimeFormat(
      window.JYMLog.config.locale,
      {
        timeZone:
          window.JYMLog.config
            .timezone,
        month: "numeric",
        day: "numeric"
      }
    ).format(
      new Date(timestampMillis)
    );
  }

  function renderBars(
    trend
  ) {
    if (!bars) {
      return;
    }

    if (
      !Array.isArray(trend) ||
      trend.length === 0
    ) {
      bars.innerHTML = "";
      return;
    }

    const weights =
      trend.map(
        (item) =>
          Number(item.weight) || 0
      );

    const minimumWeight =
      Math.min(...weights);

    const maximumWeight =
      Math.max(...weights);

    const weightRange =
      Math.max(
        2.5,
        maximumWeight -
          minimumWeight
      );

    bars.innerHTML =
      trend
        .map(
          (item) => {
            const weight =
              Number(item.weight) || 0;

            const height =
              42 +
              (
                (
                  weight -
                  minimumWeight
                ) /
                weightRange
              ) *
              78;

            return `
              <div class="analysis-bar-item">
                <span class="analysis-bar-value">
                  ${weight}kg
                </span>

                <div
                  class="analysis-bar-column"
                  style="height: ${Math.round(height)}px"
                  title="${weight}kg"
                ></div>

                <span class="analysis-bar-label">
                  ${formatBarDate(
                    item.completedAtMillis
                  )}
                </span>
              </div>
            `;
          }
        )
        .join("");
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

    weekRange.textContent =
      formatDateRange(
        analysis.weekStartMillis,
        analysis.weekEndMillis
      );

    sessionCount.textContent =
      `${analysis.weeklySessionCount}회`;

    weeklySets.textContent =
      `${analysis.weeklyCompletedSets}세트`;

    weeklyVolume.textContent =
      `${Number(
        analysis.weeklyVolume
      ).toLocaleString()}kg`;

    if (
      analysis.currentBenchWeight <= 0
    ) {
      benchWeight.textContent =
        "기록 없음";

      benchChange.textContent =
        "—";

      benchChange.dataset.trend =
        "neutral";

      stateMessage.textContent =
        "완료된 벤치프레스 기록이 쌓이면 중량 변화를 표시합니다.";

      renderBars([]);
      return;
    }

    benchWeight.textContent =
      `${analysis.currentBenchWeight}kg`;

    const change =
      Number(
        analysis.benchWeightChange
      ) || 0;

    if (change > 0) {
      benchChange.textContent =
        `+${change}kg`;

      benchChange.dataset.trend =
        "up";
    } else if (change < 0) {
      benchChange.textContent =
        `${change}kg`;

      benchChange.dataset.trend =
        "down";
    } else {
      benchChange.textContent =
        "유지";

      benchChange.dataset.trend =
        "neutral";
    }

    const benchTrend =
      Array.isArray(
        analysis.benchTrend
      )
        ? analysis.benchTrend
        : [];

    renderBars(
      benchTrend
    );

    stateMessage.textContent =
      benchTrend.length === 1
        ? "기록이 더 쌓이면 최근 운동과 변화량을 비교합니다."
        : `최근 ${benchTrend.length}회의 완료 세션을 비교했습니다.`;
  }

  async function load() {
    if (!hasRequiredElements()) {
      console.warn(
        "[JYM Log] 운동 분석 UI 요소를 찾을 수 없습니다."
      );
      return;
    }

    benchCard.setAttribute(
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
        window.JYMLog.analysis;

      if (
        !analysisApi
          ?.loadWorkoutAnalysis
      ) {
        throw new Error(
          "운동 분석 모듈을 찾을 수 없습니다."
        );
      }

      const analysis =
        await analysisApi
          .loadWorkoutAnalysis(100);

      render(
        analysis
      );

      benchCard.setAttribute(
        "aria-busy",
        "false"
      );
    } catch (error) {
      console.error(
        "[JYM Log] 운동 분석 불러오기 실패",
        error
      );

      benchCard.setAttribute(
        "aria-busy",
        "false"
      );

      stateMessage.classList.add(
        "error"
      );

      stateMessage.textContent =
        "분석 데이터를 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.";
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

    benchWeight.textContent =
      "—";

    benchChange.textContent =
      "—";

    benchChange.dataset.trend =
      "neutral";

    benchCard.setAttribute(
      "aria-busy",
      "false"
    );

    stateMessage.classList.remove(
      "error"
    );

    stateMessage.textContent =
      "운동 기록을 분석하고 있습니다.";

    renderBars([]);
  }

  function initialize() {
    if (initialized) {
      return;
    }

    reset();
    initialized = true;
  }

  window.JYMLog.analysisUI =
    Object.freeze({
      initialize,
      load,
      reset,
      render
    });
})();
