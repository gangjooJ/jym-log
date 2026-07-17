(() => {
  window.JYMLog =
    window.JYMLog || {};

  const workout =
    window.JYMLog.workout;

  const exercises =
    workout.exercises;

  let state =
    workout.state;

  let initialized = false;
  let navigate = null;
  let toast = null;
  let finishInProgress = false;
  let recommendationRequestId = 0;
  let latestRecommendations = [];
  let recommendationApplyInProgress =
    false;
  let activeRecommendationIndex =
    null;
  let selectedRecommendationIndexes =
    new Set();

  const startWorkoutBtn =
    document.getElementById(
      "startWorkoutBtn"
    );

  const workoutStep =
    document.getElementById(
      "workoutStep"
    );

  const workoutTitle =
    document.getElementById(
      "workoutTitle"
    );

  const workoutProgress =
    document.getElementById(
      "workoutProgress"
    );

  const targetText =
    document.getElementById(
      "targetText"
    );

  const incrementText =
    document.getElementById(
      "incrementText"
    );

  const previousText =
    document.getElementById(
      "previousText"
    );

  const setList =
    document.getElementById(
      "setList"
    );

  const prevExerciseBtn =
    document.getElementById(
      "prevExerciseBtn"
    );

  const nextExerciseBtn =
    document.getElementById(
      "nextExerciseBtn"
    );

  const finishWorkoutBtn =
    document.getElementById(
      "finishWorkoutBtn"
    );

  const elapsed =
    document.getElementById(
      "elapsed"
    );

  const timerCard =
    document.getElementById(
      "timerCard"
    );

  const timerTime =
    document.getElementById(
      "timerTime"
    );

  const add30Btn =
    document.getElementById(
      "add30Btn"
    );

  const stopTimerBtn =
    document.getElementById(
      "stopTimerBtn"
    );

  const fatigueModal =
    document.getElementById(
      "fatigueModal"
    );

  const scoreRow =
    document.getElementById(
      "scoreRow"
    );

  const confirmFinishBtn =
    document.getElementById(
      "confirmFinishBtn"
    );

  const summaryDuration =
    document.getElementById(
      "summaryDuration"
    );

  const summarySets =
    document.getElementById(
      "summarySets"
    );

  const summaryVolume =
    document.getElementById(
      "summaryVolume"
    );

  const progressionRecommendation =
    document.getElementById(
      "progressionRecommendation"
    );

  const recommendTitle =
    document.getElementById(
      "recommendTitle"
    );

  const recommendText =
    document.getElementById(
      "recommendText"
    );

  const recommendReason1 =
    document.getElementById(
      "recommendReason1"
    );

  const recommendReason2 =
    document.getElementById(
      "recommendReason2"
    );

  const recommendationList =
    document.getElementById(
      "recommendationList"
    );

  const recommendationListMessage =
    document.getElementById(
      "recommendationListMessage"
    );

  const recommendationBatchArea =
    document.getElementById(
      "recommendationBatchArea"
    );

  const recommendationSelectAll =
    document.getElementById(
      "recommendationSelectAll"
    );

  const recommendationBatchSummary =
    document.getElementById(
      "recommendationBatchSummary"
    );

  const applySelectedRecommendationsBtn =
    document.getElementById(
      "applySelectedRecommendationsBtn"
    );

  const recommendationBatchMessage =
    document.getElementById(
      "recommendationBatchMessage"
    );

  function showToast(message) {
    if (
      typeof toast === "function"
    ) {
      toast(message);
    }
  }

  function syncState() {
    state = workout.state;
    return state;
  }

  function hasWorkoutElements() {
    return Boolean(
      workoutStep &&
      workoutTitle &&
      workoutProgress &&
      targetText &&
      incrementText &&
      previousText &&
      setList &&
      prevExerciseBtn &&
      nextExerciseBtn
    );
  }

  function renderWorkout() {
    syncState();

    if (!hasWorkoutElements()) {
      return;
    }

    const exerciseIndex =
      Number(state.activeExercise) || 0;

    const exercise =
      exercises[exerciseIndex];

    if (!exercise) {
      console.warn(
        "[JYM Log] 표시할 운동을 찾을 수 없습니다."
      );
      return;
    }

    workoutStep.textContent =
      `운동 ${exerciseIndex + 1} / ${exercises.length}`;

    workoutTitle.textContent =
      exercise.name;

    workoutProgress.style.width =
      `${((exerciseIndex + 1) / exercises.length) * 100}%`;

    targetText.textContent =
      `${exercise.weight}kg · ${exercise.sets} × ${
        exercise.min === exercise.max
          ? exercise.min
          : `${exercise.min}–${exercise.max}`
      }`;

    incrementText.textContent =
      `${exercise.increment}kg`;

    previousText.textContent =
      exercise.previous;

    prevExerciseBtn.disabled =
      exerciseIndex === 0;

    nextExerciseBtn.textContent =
      exerciseIndex ===
        exercises.length - 1
        ? "처음으로"
        : "다음 운동";

    const rows = [];

    for (
      let setIndex = 0;
      setIndex < exercise.sets;
      setIndex += 1
    ) {
      const set =
        workout.getSet(
          exerciseIndex,
          setIndex
        );

      rows.push(`
        <div
          class="set-row ${set.done ? "done" : ""}"
          data-set="${setIndex}"
        >
          <div class="set-number">
            ${setIndex + 1}
          </div>

          <div class="stepper">
            <button
              data-action="weight-down"
              data-set="${setIndex}"
              type="button"
              aria-label="${setIndex + 1}세트 중량 감소"
            >
              −
            </button>

            <input
              inputmode="decimal"
              value="${set.weight}"
              data-field="weight"
              data-set="${setIndex}"
              aria-label="${setIndex + 1}세트 중량"
            >

            <button
              data-action="weight-up"
              data-set="${setIndex}"
              type="button"
              aria-label="${setIndex + 1}세트 중량 증가"
            >
              ＋
            </button>
          </div>

          <div class="stepper">
            <button
              data-action="reps-down"
              data-set="${setIndex}"
              type="button"
              aria-label="${setIndex + 1}세트 반복 감소"
            >
              −
            </button>

            <input
              inputmode="numeric"
              value="${set.reps}"
              data-field="reps"
              data-set="${setIndex}"
              aria-label="${setIndex + 1}세트 반복"
            >

            <button
              data-action="reps-up"
              data-set="${setIndex}"
              type="button"
              aria-label="${setIndex + 1}세트 반복 증가"
            >
              ＋
            </button>
          </div>

          <button
            class="set-done-btn"
            data-action="done"
            data-set="${setIndex}"
            type="button"
            aria-pressed="${String(Boolean(set.done))}"
          >
            ${set.done ? "✓" : "완료"}
          </button>
        </div>
      `);
    }

    setList.innerHTML =
      rows.join("");
  }

  function startRest(seconds) {
    if (
      !timerCard ||
      !timerTime
    ) {
      return;
    }

    timerCard.classList.remove(
      "hidden"
    );

    workout.startRestTimer(
      seconds,

      (remainingSeconds) => {
        timerTime.textContent =
          workout.formatTime(
            remainingSeconds
          );
      },

      () => {
        showToast(
          "휴식 시간이 끝났습니다."
        );
      }
    );
  }

  function startElapsed() {
    if (!elapsed) {
      return;
    }

    workout.startElapsedTimer(
      (elapsedSeconds) => {
        elapsed.textContent =
          workout.formatTime(
            elapsedSeconds
          );
      }
    );
  }

  function startWorkout() {
    if (
      exercises.length === 0
    ) {
      showToast(
        "루틴에 운동을 먼저 추가해 주세요."
      );
      return;
    }

    workout.beginWorkout();
    syncState();

    setFinishBusy(false);
    renderWorkout();
    startElapsed();

    if (
      typeof navigate === "function"
    ) {
      navigate("workout");
    }
  }

  function setRecommendationBusy(
    isBusy
  ) {
    progressionRecommendation
      ?.setAttribute(
        "aria-busy",
        String(isBusy)
      );
  }

  function formatWeight(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "0";
    }

    return Number.isInteger(number)
      ? String(number)
      : String(
          Math.round(number * 100) /
          100
        );
  }

  function areWeightsEqual(
    first,
    second
  ) {
    return Math.abs(
      Number(first) - Number(second)
    ) <= 0.001;
  }

  function normalizeExerciseName(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function escapeRecommendationHtml(
    value
  ) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setRecommendationListMessage(
    message,
    isError = false
  ) {
    if (!recommendationListMessage) {
      return;
    }

    recommendationListMessage.textContent =
      message;

    recommendationListMessage.classList.toggle(
      "error",
      isError
    );
  }

  function resetRecommendationList() {
    latestRecommendations = [];
    recommendationApplyInProgress =
      false;
    activeRecommendationIndex =
      null;
    selectedRecommendationIndexes =
      new Set();

    if (recommendationBatchArea) {
      recommendationBatchArea.classList.add(
        "hidden"
      );
    }

    if (recommendationList) {
      recommendationList.innerHTML = "";
    }

    setRecommendationListMessage("");
  }

  function isSameRecommendedExercise(
    exercise,
    recommendation
  ) {
    if (!exercise || !recommendation) {
      return false;
    }

    const recommendationId =
      String(
        recommendation.exerciseId ||
        ""
      );

    const exerciseId =
      String(exercise.id || "");

    if (
      recommendationId &&
      exerciseId
    ) {
      return (
        recommendationId ===
        exerciseId
      );
    }

    return (
      normalizeExerciseName(
        exercise.name
      ) ===
      normalizeExerciseName(
        recommendation.exerciseName
      )
    );
  }

  function findExerciseForRecommendation(
    recommendation
  ) {
    if (!recommendation) {
      return null;
    }

    const preferredIndex =
      Number(
        recommendation.exerciseIndex
      );

    if (
      Number.isInteger(
        preferredIndex
      ) &&
      preferredIndex >= 0 &&
      isSameRecommendedExercise(
        exercises[preferredIndex],
        recommendation
      )
    ) {
      return {
        exercise:
          exercises[preferredIndex],
        exerciseIndex:
          preferredIndex
      };
    }

    const matchedIndex =
      exercises.findIndex(
        (exercise) =>
          isSameRecommendedExercise(
            exercise,
            recommendation
          )
      );

    if (matchedIndex < 0) {
      return null;
    }

    return {
      exercise:
        exercises[matchedIndex],
      exerciseIndex:
        matchedIndex
    };
  }

  function getRecommendationApplyState(
    recommendation
  ) {
    if (
      recommendation?.action !==
      "increase"
    ) {
      return {
        showButton: false,
        canApply: false,
        state: "not-needed"
      };
    }

    const matched =
      findExerciseForRecommendation(
        recommendation
      );

    const nextWeightText =
      formatWeight(
        recommendation.nextWeight
      );

    if (!matched) {
      return {
        showButton: true,
        canApply: false,
        state: "missing",
        buttonText:
          "추천 대상 확인 필요",
        message:
          "추천 대상 운동을 현재 루틴에서 찾을 수 없습니다.",
        isError: true
      };
    }

    if (
      !recommendation
        .currentSessionSaved
    ) {
      return {
        ...matched,
        showButton: true,
        canApply: false,
        state: "waiting",
        buttonText:
          "완료 기록 저장 후 적용",
        message:
          "완료 기록이 저장되면 추천 중량을 적용할 수 있습니다.",
        isError: false
      };
    }

    if (
      areWeightsEqual(
        matched.exercise.weight,
        recommendation.nextWeight
      )
    ) {
      return {
        ...matched,
        showButton: true,
        canApply: false,
        state: "applied",
        buttonText:
          "추천 중량 적용 완료",
        message:
          `${nextWeightText}kg가 이미 다음 목표로 적용되어 있습니다.`,
        isError: false
      };
    }

    if (
      !areWeightsEqual(
        matched.exercise.weight,
        recommendation.currentWeight
      )
    ) {
      return {
        ...matched,
        showButton: true,
        canApply: false,
        state: "stale",
        buttonText:
          "루틴 목표 확인 필요",
        message:
          "추천 계산 후 루틴 목표가 변경되어 자동 적용을 중단했습니다.",
        isError: true
      };
    }

    return {
      ...matched,
      showButton: true,
      canApply: true,
      state: "ready",
      buttonText:
        `${nextWeightText}kg를 다음 목표로 적용`,
      message:
        "다음 운동의 목표 중량만 변경되며 완료된 과거 기록은 유지됩니다.",
      isError: false
    };
  }

  function getRecommendationBadge(
    action
  ) {
    if (action === "increase") {
      return {
        label: "증량",
        className: "increase"
      };
    }

    if (action === "repeat") {
      return {
        label: "한 번 더",
        className: "repeat"
      };
    }

    return {
      label: "유지",
      className: "maintain"
    };
  }

  function renderRecommendationItem(
    recommendation,
    recommendationIndex
  ) {
    const badge =
      getRecommendationBadge(
        recommendation.action
      );

    const applyState =
      getRecommendationApplyState(
        recommendation
      );

    const selectionMarkup =
      applyState.canApply
        ? `
          <label class="progression-select-item">
            <input
              type="checkbox"
              data-select-recommendation-index="${recommendationIndex}"
              checked
            >

            <span>
              일괄 적용에 포함
            </span>
          </label>
        `
        : "";

    const applyMarkup =
      applyState.showButton
        ? `
          <button
            class="secondary-btn full progression-apply-btn"
            type="button"
            data-apply-recommendation-index="${recommendationIndex}"
            aria-busy="false"
            ${
              applyState.canApply
                ? ""
                : "disabled"
            }
          >
            ${escapeRecommendationHtml(
              applyState.buttonText
            )}
          </button>

          <p
            class="progression-item-message ${
              applyState.isError
                ? "error"
                : ""
            }"
            data-recommendation-message-index="${recommendationIndex}"
            role="status"
            aria-live="polite"
          >
            ${escapeRecommendationHtml(
              applyState.message
            )}
          </p>
        `
        : "";

    return `
      <article
        class="card progression-item"
        data-recommendation-action="${escapeRecommendationHtml(
          recommendation.action
        )}"
      >
        <div class="progression-item-head">
          <div class="progression-item-title">
            <span class="progression-order">
              ${String(
                recommendationIndex + 1
              ).padStart(2, "0")}
            </span>

            <strong>
              ${escapeRecommendationHtml(
                recommendation.exerciseName
              )}
            </strong>
          </div>

          <span
            class="progression-badge ${badge.className}"
          >
            ${badge.label}
          </span>
        </div>

        ${selectionMarkup}

        <div class="progression-target">
          ${escapeRecommendationHtml(
            recommendation.text
          )}
        </div>

        <p class="progression-reason">
          ${escapeRecommendationHtml(
            recommendation.reason
          )}
        </p>

        <p class="progression-increment">
          ${escapeRecommendationHtml(
            recommendation.incrementReason
          )}
        </p>

        ${applyMarkup}
      </article>
    `;
  }

  function renderRecommendationList(
    recommendations
  ) {
    const list =
      Array.isArray(recommendations)
        ? recommendations
        : [];

    latestRecommendations =
      list.map(
        (recommendation) => ({
          ...recommendation
        })
      );

    selectedRecommendationIndexes =
      new Set(
        list
          .map(
            (recommendation, index) =>
              getRecommendationApplyState(
                recommendation
              ).canApply
                ? index
                : null
          )
          .filter(
            (index) =>
              index !== null
          )
      );

    const increaseCount =
      list.filter(
        (recommendation) =>
          recommendation.action ===
          "increase"
      ).length;

    const repeatCount =
      list.filter(
        (recommendation) =>
          recommendation.action ===
          "repeat"
      ).length;

    const maintainCount =
      list.length -
      increaseCount -
      repeatCount;

    if (recommendTitle) {
      recommendTitle.textContent =
        "루틴 전체 추천";
    }

    if (recommendText) {
      recommendText.textContent =
        `증량 ${increaseCount}개 · ` +
        `한 번 더 ${repeatCount}개 · ` +
        `유지 ${maintainCount}개`;
    }

    if (recommendReason1) {
      recommendReason1.textContent =
        "이번 운동의 모든 세트와 동일 목표의 최근 기록을 운동별로 비교했습니다.";
    }

    if (recommendReason2) {
      recommendReason2.textContent =
        increaseCount > 0
          ? `증량 추천 ${increaseCount}개는 개별 또는 선택 일괄 적용할 수 있습니다.`
          : "이번 세션에는 자동 적용할 증량 추천이 없습니다.";
    }

    if (!recommendationList) {
      return;
    }

    if (list.length === 0) {
      recommendationList.innerHTML = `
        <div class="card progression-empty">
          추천할 운동이 없습니다.
        </div>
      `;

      setRecommendationListMessage(
        "루틴에 운동을 추가한 뒤 다시 확인해 주세요."
      );

      updateRecommendationBatchControls();
      return;
    }

    recommendationList.innerHTML =
      list
        .map(
          renderRecommendationItem
        )
        .join("");

    setRecommendationListMessage(
      `총 ${list.length}개 운동의 다음 목표를 분석했습니다.`
    );

    updateRecommendationBatchControls(
      "적용할 증량 추천을 선택한 뒤 일괄 적용할 수 있습니다."
    );
  }

  function setRecommendationBatchMessage(
    message,
    isError = false
  ) {
    if (!recommendationBatchMessage) {
      return;
    }

    recommendationBatchMessage.textContent =
      message;

    recommendationBatchMessage.classList.toggle(
      "error",
      isError
    );
  }

  function getReadyRecommendationIndexes() {
    return latestRecommendations
      .map(
        (recommendation, index) =>
          getRecommendationApplyState(
            recommendation
          ).canApply
            ? index
            : null
      )
      .filter(
        (index) =>
          index !== null
      );
  }

  function updateRecommendationBatchControls(
    message = null,
    isError = false
  ) {
    const increaseCount =
      latestRecommendations.filter(
        (recommendation) =>
          recommendation.action ===
          "increase"
      ).length;

    const readyIndexes =
      getReadyRecommendationIndexes();

    const readyIndexSet =
      new Set(readyIndexes);

    selectedRecommendationIndexes =
      new Set(
        [...selectedRecommendationIndexes]
          .filter(
            (index) =>
              readyIndexSet.has(index)
          )
      );

    const selectedCount =
      selectedRecommendationIndexes.size;

    recommendationBatchArea
      ?.classList.toggle(
        "hidden",
        increaseCount === 0
      );

    if (recommendationBatchSummary) {
      recommendationBatchSummary.textContent =
        `적용 가능 ${readyIndexes.length}개 · 선택 ${selectedCount}개`;
    }

    if (recommendationSelectAll) {
      recommendationSelectAll.checked =
        readyIndexes.length > 0 &&
        selectedCount ===
          readyIndexes.length;

      recommendationSelectAll.indeterminate =
        selectedCount > 0 &&
        selectedCount <
          readyIndexes.length;

      recommendationSelectAll.disabled =
        recommendationApplyInProgress ||
        readyIndexes.length === 0;
    }

    recommendationList
      ?.querySelectorAll(
        "[data-select-recommendation-index]"
      )
      .forEach(
        (checkbox) => {
          const index = Number(
            checkbox.dataset
              .selectRecommendationIndex
          );

          checkbox.checked =
            selectedRecommendationIndexes
              .has(index);

          checkbox.disabled =
            recommendationApplyInProgress;
        }
      );

    if (applySelectedRecommendationsBtn) {
      applySelectedRecommendationsBtn.disabled =
        recommendationApplyInProgress ||
        selectedCount === 0;

      applySelectedRecommendationsBtn.setAttribute(
        "aria-busy",
        String(
          recommendationApplyInProgress &&
          activeRecommendationIndex ===
            null
        )
      );

      applySelectedRecommendationsBtn.textContent =
        recommendationApplyInProgress
          ? activeRecommendationIndex ===
              null
            ? "선택 추천 적용 중..."
            : "다른 추천 적용 중..."
          : `선택 ${selectedCount}개 일괄 적용`;
    }

    if (message !== null) {
      setRecommendationBatchMessage(
        message,
        isError
      );
    } else if (
      increaseCount > 0 &&
      readyIndexes.length === 0 &&
      !recommendationApplyInProgress
    ) {
      setRecommendationBatchMessage(
        "현재 바로 적용할 수 있는 증량 추천이 없습니다. 완료 기록 저장 또는 루틴 목표를 확인해 주세요."
      );
    }
  }

  function setRecommendationItemMessage(
    recommendationIndex,
    message,
    isError = false
  ) {
    const messageElement =
      recommendationList
        ?.querySelector(
          `[data-recommendation-message-index="${recommendationIndex}"]`
        );

    if (!messageElement) {
      setRecommendationListMessage(
        message,
        isError
      );
      return;
    }

    messageElement.textContent =
      message;

    messageElement.classList.toggle(
      "error",
      isError
    );
  }

  function setRecommendationApplyBusy(
    isBusy,
    recommendationIndex = null
  ) {
    recommendationApplyInProgress =
      isBusy;

    activeRecommendationIndex =
      isBusy
        ? recommendationIndex
        : null;

    if (recommendationBatchArea) {
      recommendationBatchArea.setAttribute(
        "aria-busy",
        String(isBusy)
      );
    }

    recommendationList
      ?.querySelectorAll(
        "[data-apply-recommendation-index]"
      )
      .forEach(
        (button) => {
          const buttonIndex =
            Number(
              button.dataset
                .applyRecommendationIndex
            );

          button.disabled =
            isBusy ||
            button.disabled;

          button.setAttribute(
            "aria-busy",
            String(
              isBusy &&
              buttonIndex ===
                recommendationIndex
            )
          );

          if (
            isBusy &&
            buttonIndex ===
              recommendationIndex
          ) {
            button.textContent =
              "추천 중량 적용 중...";
          }
        }
      );

    updateRecommendationBatchControls();
  }

  function buildRoutineExerciseInput(
    exercise,
    nextWeight
  ) {
    return {
      name: exercise.name,
      type: exercise.type,
      weight: nextWeight,
      sets: Number(exercise.sets),
      min: Number(exercise.min),
      max: Number(exercise.max),
      rest: Number(exercise.rest),
      increment:
        Number(exercise.increment)
    };
  }

  async function applyProgressionRecommendation(
    recommendationIndex
  ) {
    if (
      recommendationApplyInProgress
    ) {
      return;
    }

    const recommendation =
      latestRecommendations[
        recommendationIndex
      ];

    const applyState =
      getRecommendationApplyState(
        recommendation
      );

    if (
      !recommendation ||
      !applyState.canApply ||
      !applyState.exercise
    ) {
      setRecommendationItemMessage(
        recommendationIndex,
        applyState.message ||
          "적용할 수 있는 증량 추천이 없습니다.",
        Boolean(applyState.isError)
      );
      return;
    }

    const routineApi =
      window.JYMLog.routines;

    if (
      !routineApi
        ?.updateActiveRoutineExercise
    ) {
      setRecommendationItemMessage(
        recommendationIndex,
        "루틴 저장 기능을 불러오지 못했습니다.",
        true
      );
      return;
    }

    const exercise =
      applyState.exercise;

    const exerciseIndex =
      applyState.exerciseIndex;

    const currentWeightText =
      formatWeight(
        recommendation.currentWeight
      );

    const nextWeightText =
      formatWeight(
        recommendation.nextWeight
      );

    const confirmed =
      window.confirm(
        `"${exercise.name}" 목표 중량을 ${currentWeightText}kg에서 ${nextWeightText}kg으로 변경할까요?\n\n다음 운동부터 적용되며 완료된 과거 기록은 변경되지 않습니다.`
      );

    if (!confirmed) {
      return;
    }

    setRecommendationApplyBusy(
      true,
      recommendationIndex
    );

    setRecommendationItemMessage(
      recommendationIndex,
      `${nextWeightText}kg 목표를 루틴에 저장하고 있습니다.`
    );

    try {
      await routineApi
        .updateActiveRoutineExercise(
          exerciseIndex,
          buildRoutineExerciseInput(
            exercise,
            recommendation.nextWeight
          )
        );

      window.JYMLog.routineUI
        ?.refresh?.();

      await renderProgressionRecommendations();

      showToast(
        `${exercise.name} 목표를 ${nextWeightText}kg로 변경했습니다.`
      );
    } catch (error) {
      console.error(
        "[JYM Log] 운동별 추천 중량 적용 실패",
        error
      );

      recommendationApplyInProgress =
        false;
      activeRecommendationIndex =
        null;

      renderRecommendationList(
        latestRecommendations
      );

      setRecommendationItemMessage(
        recommendationIndex,
        error.message ||
          "추천 중량을 루틴에 저장하지 못했습니다.",
        true
      );
    } finally {
      recommendationApplyInProgress =
        false;
      activeRecommendationIndex =
        null;
      updateRecommendationBatchControls();
    }
  }

  async function applySelectedProgressionRecommendations() {
    if (
      recommendationApplyInProgress
    ) {
      return;
    }

    const selectedEntries =
      [...selectedRecommendationIndexes]
        .sort(
          (first, second) =>
            first - second
        )
        .map(
          (recommendationIndex) => {
            const recommendation =
              latestRecommendations[
                recommendationIndex
              ];

            return {
              recommendationIndex,
              recommendation,
              applyState:
                getRecommendationApplyState(
                  recommendation
                )
            };
          }
        )
        .filter(
          (entry) =>
            entry.recommendation &&
            entry.applyState.canApply &&
            entry.applyState.exercise
        );

    if (selectedEntries.length === 0) {
      updateRecommendationBatchControls(
        "선택한 항목 중 현재 적용할 수 있는 증량 추천이 없습니다.",
        true
      );
      return;
    }

    const routineApi =
      window.JYMLog.routines;

    if (
      !routineApi
        ?.updateActiveRoutineExercise
    ) {
      updateRecommendationBatchControls(
        "루틴 저장 기능을 불러오지 못했습니다.",
        true
      );
      return;
    }

    const changeLines =
      selectedEntries.map(
        ({
          recommendation,
          applyState
        }) =>
          `• ${applyState.exercise.name}: ` +
          `${formatWeight(
            recommendation.currentWeight
          )}kg → ` +
          `${formatWeight(
            recommendation.nextWeight
          )}kg`
      );

    const confirmed =
      window.confirm(
        `선택한 ${selectedEntries.length}개 운동의 목표 중량을 변경할까요?\n\n` +
        `${changeLines.join("\n")}\n\n` +
        "다음 운동부터 적용되며 완료된 과거 기록은 변경되지 않습니다."
      );

    if (!confirmed) {
      return;
    }

    setRecommendationApplyBusy(
      true,
      null
    );

    setRecommendationBatchMessage(
      `선택한 ${selectedEntries.length}개 추천을 순서대로 저장하고 있습니다.`
    );

    const successes = [];
    const failures = [];

    for (const entry of selectedEntries) {
      const {
        recommendationIndex,
        recommendation
      } = entry;

      const currentApplyState =
        getRecommendationApplyState(
          recommendation
        );

      if (
        !currentApplyState.canApply ||
        !currentApplyState.exercise
      ) {
        failures.push({
          exerciseName:
            recommendation.exerciseName,
          message:
            currentApplyState.message ||
            "현재 루틴 상태와 추천이 일치하지 않습니다."
        });
        continue;
      }

      const exercise =
        currentApplyState.exercise;

      const exerciseIndex =
        currentApplyState.exerciseIndex;

      const nextWeightText =
        formatWeight(
          recommendation.nextWeight
        );

      setRecommendationItemMessage(
        recommendationIndex,
        `${nextWeightText}kg 목표를 저장하고 있습니다.`
      );

      try {
        await routineApi
          .updateActiveRoutineExercise(
            exerciseIndex,
            buildRoutineExerciseInput(
              exercise,
              recommendation.nextWeight
            )
          );

        successes.push({
          exerciseName: exercise.name,
          nextWeightText
        });
      } catch (error) {
        console.error(
          "[JYM Log] 추천 중량 일괄 적용 항목 저장 실패",
          {
            exerciseName:
              exercise.name,
            error
          }
        );

        failures.push({
          exerciseName:
            exercise.name,
          message:
            error.message ||
            "추천 중량을 저장하지 못했습니다."
        });
      }
    }

    try {
      window.JYMLog.routineUI
        ?.refresh?.();

      await renderProgressionRecommendations();

      if (failures.length > 0) {
        const failedNames =
          failures
            .map(
              (failure) =>
                failure.exerciseName
            )
            .join(", ");

        setRecommendationListMessage(
          `${successes.length}개 적용 완료 · ${failures.length}개 실패 (${failedNames}). 실패한 추천만 다시 확인해 주세요.`,
          true
        );

        showToast(
          `${successes.length}개 적용, ${failures.length}개 확인 필요`
        );
      } else {
        setRecommendationListMessage(
          `${successes.length}개 운동의 추천 중량을 다음 목표로 적용했습니다.`
        );

        showToast(
          `${successes.length}개 추천 중량을 적용했습니다.`
        );
      }
    } finally {
      recommendationApplyInProgress =
        false;
      activeRecommendationIndex =
        null;
      updateRecommendationBatchControls();
    }
  }

  function renderRecommendationFallback() {
    const fallbackRecommendations =
      exercises.map(
        (exercise, exerciseIndex) => ({
          action: "maintain",
          success: false,
          exerciseIndex,
          exerciseId:
            String(exercise.id || ""),
          exerciseName:
            exercise.name || "운동",
          currentSessionSaved: false,
          successStreak: 0,
          currentWeight:
            Number(exercise.weight) || 0,
          nextWeight:
            Number(exercise.weight) || 0,
          increment:
            Number(exercise.increment) || 0,
          text:
            `${formatWeight(
              exercise.weight
            )}kg · ` +
            `${Number(exercise.sets) || 0} × ` +
            `${
              Number(exercise.min) ===
              Number(exercise.max)
                ? Number(exercise.max) || 0
                : `${Number(exercise.min) || 0}–${Number(exercise.max) || 0}`
            } 유지`,
          reason:
            "추천 엔진을 불러오지 못해 현재 목표를 유지합니다.",
          incrementReason:
            `설정된 증량 단위는 ${formatWeight(
              exercise.increment
            )}kg입니다.`
        })
      );

    renderRecommendationList(
      fallbackRecommendations
    );

    setRecommendationListMessage(
      "추천 엔진을 불러오지 못해 현재 루틴 목표를 표시했습니다.",
      true
    );
  }

  async function renderProgressionRecommendations() {
    syncState();

    const requestId =
      recommendationRequestId + 1;

    recommendationRequestId =
      requestId;

    resetRecommendationList();

    if (recommendTitle) {
      recommendTitle.textContent =
        "루틴 전체 추천";
    }

    if (recommendText) {
      recommendText.textContent =
        "모든 운동의 수행 기록을 분석하고 있습니다.";
    }

    if (recommendReason1) {
      recommendReason1.textContent =
        "이번 세션의 운동별 세트 달성 여부를 확인합니다.";
    }

    if (recommendReason2) {
      recommendReason2.textContent =
        "동일 목표의 최근 성공 기록을 비교합니다.";
    }

    if (recommendationList) {
      recommendationList.innerHTML = `
        <div
          class="card progression-empty"
          aria-live="polite"
        >
          운동별 추천을 계산하고 있습니다.
        </div>
      `;
    }

    setRecommendationBusy(true);

    const engine =
      window.JYMLog
        .progressionEngine;

    if (!engine?.loadRecommendations) {
      setRecommendationBusy(false);
      renderRecommendationFallback();
      return;
    }

    try {
      const recommendations =
        await engine
          .loadRecommendations({
            exercises:
              [...exercises],
            state
          });

      if (
        requestId !==
        recommendationRequestId
      ) {
        return;
      }

      renderRecommendationList(
        recommendations
      );
    } catch (error) {
      console.error(
        "[JYM Log] 루틴 전체 증량 추천 표시 실패",
        error
      );

      if (
        requestId ===
        recommendationRequestId
      ) {
        renderRecommendationFallback();
      }
    } finally {
      if (
        requestId ===
        recommendationRequestId
      ) {
        setRecommendationBusy(false);
      }
    }
  }

  function renderSummary() {
    syncState();

    if (
      !summaryDuration ||
      !summarySets ||
      !summaryVolume
    ) {
      return;
    }

    const endAt =
      state.completedAt ||
      Date.now();

    const durationSeconds =
      state.startedAt
        ? Math.max(
            60,
            Math.floor(
              (
                endAt -
                state.startedAt
              ) / 1000
            )
          )
        : 0;

    summaryDuration.textContent =
      `${Math.round(
        durationSeconds / 60
      )}분`;

    summarySets.textContent =
      workout.getCompletedSetCount();

    summaryVolume.textContent =
      `${workout
        .getTotalVolume()
        .toLocaleString()}kg`;

    void renderProgressionRecommendations();
  }

  function setFinishBusy(
    isBusy
  ) {
    finishInProgress =
      isBusy;

    if (confirmFinishBtn) {
      confirmFinishBtn.disabled =
        isBusy;

      confirmFinishBtn.textContent =
        isBusy
          ? "기록 저장 중..."
          : "기록 저장하고 완료";

      confirmFinishBtn.setAttribute(
        "aria-busy",
        String(isBusy)
      );
    }

    if (finishWorkoutBtn) {
      finishWorkoutBtn.disabled =
        isBusy;
    }
  }

  async function confirmWorkoutFinish() {
    if (finishInProgress) {
      return;
    }

    setFinishBusy(true);

    fatigueModal?.classList.remove(
      "show"
    );

    try {
      syncState();

      if (!state.completed) {
        workout.finishWorkout();
        workout.stopRestTimer();
        workout.stopElapsedTimer();
        syncState();
      }

      renderSummary();

      if (
        typeof navigate === "function"
      ) {
        navigate("summary");
      }

      const sessionsApi =
        window.JYMLog.sessions;

      if (
        !sessionsApi
          ?.saveCompletedWorkoutSession
      ) {
        throw new Error(
          "완료 운동 저장 기능을 불러오지 못했습니다."
        );
      }

      await sessionsApi
        .saveCompletedWorkoutSession(
          state
        );

      /*
       * 완료 세션이 기록된 뒤 다시 계산해야
       * 추천 적용 버튼을 안전하게 활성화할 수 있습니다.
       */
      await renderProgressionRecommendations();

      showToast(
        "완료한 운동 기록이 저장되었습니다."
      );
    } catch (error) {
      console.error(
        "[JYM Log] 완료 운동 세션 저장 실패",
        error
      );

      showToast(
        "현재 운동은 저장됐지만 완료 기록 저장을 확인해 주세요."
      );
    } finally {
      setFinishBusy(false);
    }
  }

  function handleSetAction(
    actionButton
  ) {
    const action =
      actionButton.dataset.action;

    if (!action) {
      return;
    }

    syncState();

    const exerciseIndex =
      Number(state.activeExercise) || 0;

    const setIndex =
      Number(
        actionButton.dataset.set
      );

    const exercise =
      exercises[exerciseIndex];

    if (
      !exercise ||
      !Number.isInteger(setIndex) ||
      setIndex < 0
    ) {
      return;
    }

    const set =
      workout.getSet(
        exerciseIndex,
        setIndex
      );

    if (action === "weight-down") {
      workout.updateSet(
        exerciseIndex,
        setIndex,
        "weight",
        Math.max(
          0,
          Number(set.weight) -
            exercise.increment
        )
      );
    }

    if (action === "weight-up") {
      workout.updateSet(
        exerciseIndex,
        setIndex,
        "weight",
        Number(set.weight) +
          exercise.increment
      );
    }

    if (action === "reps-down") {
      workout.updateSet(
        exerciseIndex,
        setIndex,
        "reps",
        Math.max(
          0,
          Number(set.reps) - 1
        )
      );
    }

    if (action === "reps-up") {
      workout.updateSet(
        exerciseIndex,
        setIndex,
        "reps",
        Number(set.reps) + 1
      );
    }

    if (action === "done") {
      const isDone =
        workout.toggleSetDone(
          exerciseIndex,
          setIndex
        );

      if (isDone) {
        startRest(
          exercise.rest
        );
      }
    }

    syncState();
    renderWorkout();
  }

  function handleSetChange(event) {
    const input =
      event.target.closest(
        "[data-field]"
      );

    if (!input) {
      return;
    }

    syncState();

    const exerciseIndex =
      Number(state.activeExercise) || 0;

    const setIndex =
      Number(input.dataset.set);

    const field =
      input.dataset.field;

    if (
      !Number.isInteger(setIndex) ||
      setIndex < 0 ||
      (
        field !== "weight" &&
        field !== "reps"
      )
    ) {
      return;
    }

    workout.updateSet(
      exerciseIndex,
      setIndex,
      field,
      Number(input.value) || 0
    );

    syncState();
  }

  function selectFatigueScore(
    scoreButton
  ) {
    scoreRow
      ?.querySelectorAll(
        ".score-btn"
      )
      .forEach(
        (button) => {
          button.classList.remove(
            "selected"
          );

          button.setAttribute(
            "aria-pressed",
            "false"
          );
        }
      );

    scoreButton.classList.add(
      "selected"
    );

    scoreButton.setAttribute(
      "aria-pressed",
      "true"
    );

    workout.setFatigue(
      Number(
        scoreButton.textContent
      )
    );

    syncState();
  }

  function moveExercise(direction) {
    syncState();

    if (
      exercises.length === 0
    ) {
      return;
    }

    const currentIndex =
      Number(state.activeExercise) || 0;

    let nextIndex =
      currentIndex + direction;

    if (direction > 0) {
      nextIndex =
        nextIndex %
        exercises.length;
    }

    if (
      nextIndex < 0 ||
      nextIndex >= exercises.length
    ) {
      return;
    }

    workout.setActiveExercise(
      nextIndex
    );

    syncState();
    renderWorkout();
    window.scrollTo(0, 0);
  }

  function handleUserStateReady() {
    syncState();
    setFinishBusy(false);

    if (
      state.started &&
      !state.completed
    ) {
      renderWorkout();
      startElapsed();
    }

    if (state.completed) {
      renderSummary();
    }
  }

  function refreshAfterSync() {
    syncState();
    renderWorkout();

    if (state.completed) {
      renderSummary();
    }
  }

  function initialize(options = {}) {
    if (initialized) {
      return;
    }

    initialized = true;

    navigate =
      typeof options.navigate ===
        "function"
        ? options.navigate
        : null;

    toast =
      typeof options.toast ===
        "function"
        ? options.toast
        : null;

    if (!hasWorkoutElements()) {
      console.warn(
        "[JYM Log] 운동 진행 UI 요소를 모두 찾지 못했습니다."
      );
    }

    startWorkoutBtn?.addEventListener(
      "click",
      startWorkout
    );

    prevExerciseBtn?.addEventListener(
      "click",
      () => moveExercise(-1)
    );

    nextExerciseBtn?.addEventListener(
      "click",
      () => moveExercise(1)
    );

    setList?.addEventListener(
      "click",
      (event) => {
        const actionButton =
          event.target.closest(
            "[data-action]"
          );

        if (actionButton) {
          handleSetAction(
            actionButton
          );
        }
      }
    );

    setList?.addEventListener(
      "change",
      handleSetChange
    );

    finishWorkoutBtn
      ?.addEventListener(
        "click",
        () => {
          syncState();

          if (
            finishInProgress ||
            state.completed
          ) {
            return;
          }

          fatigueModal
            ?.classList.add(
              "show"
            );
        }
      );

    confirmFinishBtn
      ?.addEventListener(
        "click",
        confirmWorkoutFinish
      );

    fatigueModal?.addEventListener(
      "click",
      (event) => {
        if (
          event.target ===
            fatigueModal &&
          !finishInProgress
        ) {
          fatigueModal.classList.remove(
            "show"
          );
        }
      }
    );

    scoreRow?.addEventListener(
      "click",
      (event) => {
        const scoreButton =
          event.target.closest(
            ".score-btn"
          );

        if (scoreButton) {
          selectFatigueScore(
            scoreButton
          );
        }
      }
    );

    recommendationList
      ?.addEventListener(
        "click",
        (event) => {
          const applyButton =
            event.target.closest(
              "[data-apply-recommendation-index]"
            );

          if (!applyButton) {
            return;
          }

          const recommendationIndex =
            Number(
              applyButton.dataset
                .applyRecommendationIndex
            );

          if (
            !Number.isInteger(
              recommendationIndex
            ) ||
            recommendationIndex < 0
          ) {
            return;
          }

          void applyProgressionRecommendation(
            recommendationIndex
          );
        }
      );

    recommendationList
      ?.addEventListener(
        "change",
        (event) => {
          const checkbox =
            event.target.closest(
              "[data-select-recommendation-index]"
            );

          if (!checkbox) {
            return;
          }

          const recommendationIndex =
            Number(
              checkbox.dataset
                .selectRecommendationIndex
            );

          if (
            !Number.isInteger(
              recommendationIndex
            ) ||
            recommendationIndex < 0
          ) {
            return;
          }

          if (checkbox.checked) {
            selectedRecommendationIndexes.add(
              recommendationIndex
            );
          } else {
            selectedRecommendationIndexes.delete(
              recommendationIndex
            );
          }

          updateRecommendationBatchControls(
            "선택한 추천만 일괄 적용됩니다."
          );
        }
      );

    recommendationSelectAll
      ?.addEventListener(
        "change",
        () => {
          const readyIndexes =
            getReadyRecommendationIndexes();

          selectedRecommendationIndexes =
            recommendationSelectAll.checked
              ? new Set(readyIndexes)
              : new Set();

          updateRecommendationBatchControls(
            recommendationSelectAll.checked
              ? "적용 가능한 증량 추천을 모두 선택했습니다."
              : "일괄 적용 선택을 모두 해제했습니다."
          );
        }
      );

    applySelectedRecommendationsBtn
      ?.addEventListener(
        "click",
        () => {
          void applySelectedProgressionRecommendations();
        }
      );

    add30Btn?.addEventListener(
      "click",
      () => {
        workout.addRestTime(
          30,
          (remainingSeconds) => {
            if (timerTime) {
              timerTime.textContent =
                workout.formatTime(
                  remainingSeconds
                );
            }
          }
        );
      }
    );

    stopTimerBtn?.addEventListener(
      "click",
      () => {
        workout.stopRestTimer();

        timerCard?.classList.add(
          "hidden"
        );
      }
    );

    scoreRow
      ?.querySelectorAll(
        ".score-btn"
      )
      .forEach(
        (button) => {
          button.setAttribute(
            "type",
            "button"
          );

          button.setAttribute(
            "aria-pressed",
            String(
              button.classList.contains(
                "selected"
              )
            )
          );
        }
      );

    syncState();

    if (
      state.started &&
      !state.completed
    ) {
      renderWorkout();
      startElapsed();
    }

    if (state.completed) {
      renderSummary();
    }
  }

  window.JYMLog.workoutUI =
    Object.freeze({
      initialize,
      handleUserStateReady,
      refreshAfterSync,
      renderWorkout,
      renderSummary
    });
})();
