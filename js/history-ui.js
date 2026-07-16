(() => {
  window.JYMLog =
    window.JYMLog || {};

  let initialized = false;
  let navigate = null;
  let sessionsCache = [];
  let weekOffset = 0;

  const monthLabel =
    document.getElementById(
      "historyMonthLabel"
    );

  const calendar =
    document.getElementById(
      "historyCalendar"
    );

  const sessionCount =
    document.getElementById(
      "historySessionCount"
    );

  const sessionList =
    document.getElementById(
      "historySessionList"
    );

  const weekRange =
    document.getElementById(
      "historyWeekRange"
    );

  const prevWeekBtn =
    document.getElementById(
      "historyPrevWeekBtn"
    );

  const todayBtn =
    document.getElementById(
      "historyTodayBtn"
    );

  const nextWeekBtn =
    document.getElementById(
      "historyNextWeekBtn"
    );

  const detailTitle =
    document.getElementById(
      "sessionDetailTitle"
    );

  const detailDate =
    document.getElementById(
      "sessionDetailDate"
    );

  const detailDuration =
    document.getElementById(
      "sessionDetailDuration"
    );

  const detailSets =
    document.getElementById(
      "sessionDetailSets"
    );

  const detailVolume =
    document.getElementById(
      "sessionDetailVolume"
    );

  const detailFatigue =
    document.getElementById(
      "sessionDetailFatigue"
    );

  const detailExerciseCount =
    document.getElementById(
      "sessionDetailExerciseCount"
    );

  const detailExerciseList =
    document.getElementById(
      "sessionDetailExerciseList"
    );

  const detailBackBtn =
    document.getElementById(
      "sessionDetailBackBtn"
    );

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatHistoryDate(
    timestampMillis
  ) {
    if (!timestampMillis) {
      return "날짜 정보 없음";
    }

    return new Intl.DateTimeFormat(
      window.JYMLog.config.locale,
      {
        timeZone:
          window.JYMLog.config
            .timezone,
        month: "long",
        day: "numeric",
        weekday: "long"
      }
    ).format(
      new Date(timestampMillis)
    );
  }

  function formatSessionDuration(
    durationSeconds
  ) {
    const minutes =
      Math.max(
        1,
        Math.round(
          Number(durationSeconds) /
            60
        )
      );

    return `${minutes}분`;
  }

  function getDateKey(dateValue) {
    const date =
      new Date(dateValue);

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        date.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function renderCalendar(
    sessions = sessionsCache
  ) {
    if (
      !calendar ||
      !monthLabel
    ) {
      return;
    }

    const today =
      new Date();

    const referenceDate =
      new Date(today);

    referenceDate.setDate(
      today.getDate() +
        weekOffset * 7
    );

    const currentDay =
      referenceDate.getDay();

    const mondayOffset =
      currentDay === 0
        ? -6
        : 1 - currentDay;

    const monday =
      new Date(referenceDate);

    monday.setHours(
      0,
      0,
      0,
      0
    );

    monday.setDate(
      referenceDate.getDate() +
        mondayOffset
    );

    const sunday =
      new Date(monday);

    sunday.setDate(
      monday.getDate() + 6
    );

    const sessionDateKeys =
      new Set(
        sessions
          .filter(
            (session) =>
              session.completedAtMillis
          )
          .map(
            (session) =>
              getDateKey(
                session
                  .completedAtMillis
              )
          )
      );

    const weekdayLabels = [
      "월",
      "화",
      "수",
      "목",
      "금",
      "토",
      "일"
    ];

    const todayKey =
      getDateKey(today);

    calendar.innerHTML =
      weekdayLabels
        .map(
          (weekday, index) => {
            const date =
              new Date(monday);

            date.setDate(
              monday.getDate() +
                index
            );

            const dateKey =
              getDateKey(date);

            const classes = [
              "day"
            ];

            if (
              dateKey === todayKey
            ) {
              classes.push("today");
            }

            if (
              sessionDateKeys.has(
                dateKey
              )
            ) {
              classes.push(
                "has-session"
              );
            }

            return `
              <div class="${classes.join(" ")}">
                <small>${weekday}</small>
                <strong>${date.getDate()}</strong>
              </div>
            `;
          }
        )
        .join("");

    const monthFormatter =
      new Intl.DateTimeFormat(
        window.JYMLog.config.locale,
        {
          timeZone:
            window.JYMLog.config
              .timezone,
          year: "numeric",
          month: "long"
        }
      );

    const mondayMonth =
      monthFormatter.format(monday);

    const sundayMonth =
      monthFormatter.format(sunday);

    monthLabel.textContent =
      mondayMonth === sundayMonth
        ? mondayMonth
        : `${mondayMonth} – ${sundayMonth}`;

    if (weekRange) {
      const rangeFormatter =
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

      weekRange.textContent =
        `${rangeFormatter.format(monday)} – ` +
        `${rangeFormatter.format(sunday)}`;
    }

    if (nextWeekBtn) {
      nextWeekBtn.disabled =
        weekOffset >= 0;
    }

    if (todayBtn) {
      todayBtn.disabled =
        weekOffset === 0;
    }
  }

  function renderSessions(
    sessions
  ) {
    if (
      !sessionList ||
      !sessionCount
    ) {
      return;
    }

    const recentSessions =
      sessions.slice(0, 3);

    sessionList.setAttribute(
      "aria-busy",
      "false"
    );

    sessionCount.textContent =
      `${recentSessions.length}회`;

    if (
      recentSessions.length === 0
    ) {
      sessionList.innerHTML = `
        <div class="card history-state">
          아직 완료한 운동 기록이 없습니다.<br>
          운동을 완료하면 이곳에 표시됩니다.
        </div>
      `;

      return;
    }

    sessionList.innerHTML =
      recentSessions
        .map(
          (session) => `
            <button
              class="card history-card history-card-button"
              type="button"
              data-session-id="${escapeHtml(
                session.id
              )}"
              aria-label="${escapeHtml(
                session.routineName
              )} 운동 기록 상세 보기"
            >
              <div class="history-head">
                <div>
                  <h3>
                    ${escapeHtml(
                      session.routineName
                    )}
                  </h3>

                  <p class="history-date">
                    ${formatHistoryDate(
                      session.completedAtMillis
                    )}
                  </p>
                </div>

                <span class="tag">
                  완료
                </span>
              </div>

              <div class="history-meta">
                <span>
                  ⏱ ${formatSessionDuration(
                    session.durationSeconds
                  )}
                </span>

                <span>
                  ▦ ${Number(
                    session.completedSets
                  ).toLocaleString()}세트
                </span>

                <span>
                  ◈ ${Number(
                    session.totalVolume
                  ).toLocaleString()}kg
                </span>
              </div>

              <div class="history-card-action">
                상세 보기 ›
              </div>
            </button>
          `
        )
        .join("");
  }

  async function load() {
    if (
      !sessionList ||
      !sessionCount
    ) {
      return;
    }

    sessionCount.textContent =
      "불러오는 중";

    sessionList.setAttribute(
      "aria-busy",
      "true"
    );

    sessionList.innerHTML = `
      <div class="card history-state">
        운동 기록을 불러오고 있습니다.
      </div>
    `;

    try {
      const historyApi =
        window.JYMLog.history;

      if (!historyApi) {
        throw new Error(
          "운동 기록 모듈을 찾을 수 없습니다."
        );
      }

      const sessions =
        await historyApi
          .loadRecentWorkoutSessions(
            100
          );

      sessionsCache =
        sessions;

      renderCalendar(
        sessionsCache
      );

      renderSessions(
        sessionsCache
      );
    } catch (error) {
      console.error(
        "[JYM Log] 운동 기록 불러오기 실패",
        error
      );

      sessionCount.textContent =
        "오류";

      sessionList.setAttribute(
        "aria-busy",
        "false"
      );

      sessionList.innerHTML = `
        <div class="card history-state error">
          운동 기록을 불러오지 못했습니다.<br>
          네트워크 연결을 확인한 뒤 다시 열어 주세요.
        </div>
      `;
    }
  }

  function formatSessionDateTime(
    timestampMillis
  ) {
    if (!timestampMillis) {
      return "날짜 정보 없음";
    }

    return new Intl.DateTimeFormat(
      window.JYMLog.config.locale,
      {
        timeZone:
          window.JYMLog.config
            .timezone,
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit"
      }
    ).format(
      new Date(timestampMillis)
    );
  }

  function renderSessionDetail(
    session
  ) {
    if (
      !session ||
      !detailTitle ||
      !detailDate ||
      !detailDuration ||
      !detailSets ||
      !detailVolume ||
      !detailFatigue ||
      !detailExerciseCount ||
      !detailExerciseList
    ) {
      return;
    }

    detailTitle.textContent =
      session.routineName;

    detailDate.textContent =
      formatSessionDateTime(
        session.completedAtMillis
      );

    detailDuration.textContent =
      formatSessionDuration(
        session.durationSeconds
      );

    detailSets.textContent =
      `${Number(
        session.completedSets
      ).toLocaleString()}세트`;

    detailVolume.textContent =
      `${Number(
        session.totalVolume
      ).toLocaleString()}kg`;

    detailFatigue.textContent =
      session.fatigue > 0
        ? `${session.fatigue} / 5`
        : "미입력";

    const recordedExercises =
      Array.isArray(
        session.exercises
      )
        ? session.exercises.filter(
            (exercise) =>
              Array.isArray(
                exercise.sets
              ) &&
              exercise.sets.some(
                (set) => set.done
              )
          )
        : [];

    detailExerciseCount.textContent =
      `${recordedExercises.length}개 운동`;

    detailExerciseList.setAttribute(
      "aria-busy",
      "false"
    );

    if (
      recordedExercises.length === 0
    ) {
      detailExerciseList.innerHTML = `
        <div class="card history-state">
          완료 처리된 운동 세트가 없습니다.
        </div>
      `;

      return;
    }

    detailExerciseList.innerHTML =
      recordedExercises
        .map(
          (exercise) => {
            const sets =
              Array.isArray(
                exercise.sets
              )
                ? exercise.sets
                : [];

            const completedCount =
              sets.filter(
                (set) => set.done
              ).length;

            return `
              <div class="card session-exercise-card">
                <div class="session-exercise-head">
                  <div>
                    <h3>
                      ${escapeHtml(
                        exercise.name ||
                        "운동"
                      )}
                    </h3>

                    <p>
                      ${escapeHtml(
                        exercise.type ||
                        "운동 기록"
                      )}
                    </p>
                  </div>

                  <span class="session-exercise-count">
                    ${completedCount} / ${sets.length}세트
                  </span>
                </div>

                <div class="session-set-list">
                  ${sets
                    .map(
                      (set) => `
                        <div
                          class="session-set-row ${
                            set.done
                              ? ""
                              : "not-done"
                          }"
                        >
                          <span>
                            ${Number(
                              set.setNumber
                            ) || 0}세트
                          </span>

                          <strong>
                            ${Number(
                              set.weight
                            ) || 0}kg × ${
                              Number(
                                set.reps
                              ) || 0
                            }회
                          </strong>

                          <em class="session-set-status">
                            ${
                              set.done
                                ? "완료"
                                : "미완료"
                            }
                          </em>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              </div>
            `;
          }
        )
        .join("");
  }

  async function loadSessionDetail(
    sessionId
  ) {
    if (!sessionId) {
      return;
    }

    navigate?.("session-detail");

    if (
      !detailTitle ||
      !detailDate ||
      !detailDuration ||
      !detailSets ||
      !detailVolume ||
      !detailFatigue ||
      !detailExerciseCount ||
      !detailExerciseList
    ) {
      return;
    }

    detailTitle.textContent =
      "운동 기록";

    detailDate.textContent =
      "기록을 불러오고 있습니다.";

    detailDuration.textContent =
      "—";

    detailSets.textContent =
      "—";

    detailVolume.textContent =
      "—";

    detailFatigue.textContent =
      "—";

    detailExerciseCount.textContent =
      "불러오는 중";

    detailExerciseList.setAttribute(
      "aria-busy",
      "true"
    );

    detailExerciseList.innerHTML = `
      <div class="card history-state">
        운동 기록을 불러오고 있습니다.
      </div>
    `;

    try {
      const historyApi =
        window.JYMLog.history;

      if (!historyApi) {
        throw new Error(
          "운동 기록 모듈을 찾을 수 없습니다."
        );
      }

      const session =
        await historyApi
          .loadWorkoutSessionById(
            sessionId
          );

      if (!session) {
        throw new Error(
          "운동 기록을 찾을 수 없습니다."
        );
      }

      renderSessionDetail(
        session
      );
    } catch (error) {
      console.error(
        "[JYM Log] 운동 상세 기록 불러오기 실패",
        error
      );

      detailDate.textContent =
        "기록을 불러오지 못했습니다.";

      detailExerciseCount.textContent =
        "오류";

      detailExerciseList.setAttribute(
        "aria-busy",
        "false"
      );

      detailExerciseList.innerHTML = `
        <div class="card history-state error">
          운동 상세 기록을 불러오지 못했습니다.<br>
          네트워크 연결을 확인한 뒤 다시 시도해 주세요.
        </div>
      `;
    }
  }

  function reset() {
    weekOffset = 0;
    sessionsCache = [];

    renderCalendar(
      sessionsCache
    );
  }

  function attachEvents() {
    prevWeekBtn?.addEventListener(
      "click",
      () => {
        weekOffset -= 1;

        renderCalendar(
          sessionsCache
        );
      }
    );

    nextWeekBtn?.addEventListener(
      "click",
      () => {
        if (weekOffset >= 0) {
          return;
        }

        weekOffset += 1;

        renderCalendar(
          sessionsCache
        );
      }
    );

    todayBtn?.addEventListener(
      "click",
      () => {
        weekOffset = 0;

        renderCalendar(
          sessionsCache
        );
      }
    );

    detailBackBtn?.addEventListener(
      "click",
      () => {
        navigate?.("history");
      }
    );

    sessionList?.addEventListener(
      "click",
      (event) => {
        const sessionCard =
          event.target.closest(
            "[data-session-id]"
          );

        if (
          !sessionCard ||
          !sessionList.contains(
            sessionCard
          )
        ) {
          return;
        }

        void loadSessionDetail(
          sessionCard.dataset
            .sessionId
        );
      }
    );
  }

  function initialize(options = {}) {
    if (initialized) {
      return;
    }

    navigate =
      typeof options.navigate ===
        "function"
        ? options.navigate
        : null;

    attachEvents();
    reset();
    initialized = true;
  }

  window.JYMLog.historyUI =
    Object.freeze({
      initialize,
      load,
      reset,
      loadSessionDetail
    });
})();
