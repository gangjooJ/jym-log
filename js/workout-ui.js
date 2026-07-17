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
  let latestRecommendation = null;
  let recommendationApplyInProgress =
    false;

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

  const recommendApplyArea =
    document.getElementById(
      "recommendApplyArea"
    );

  const applyRecommendationBtn =
    document.getElementById(
      "applyRecommendationBtn"
    );

  const recommendApplyMessage =
    document.getElementById(
      "recommendApplyMessage"
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

  function setRecommendationApplyMessage(
    message,
    isError = false
  ) {
    if (!recommendApplyMessage) {
      return;
    }

    recommendApplyMessage.textContent =
      message;

    recommendApplyMessage.style.color =
      isError
        ? "var(--danger)"
        : "var(--muted)";
  }

  function resetRecommendationAction() {
    latestRecommendation = null;
    recommendationApplyInProgress =
      false;

    recommendApplyArea?.classList.add(
      "hidden"
    );

    if (applyRecommendationBtn) {
      applyRecommendationBtn.disabled =
        true;

      applyRecommendationBtn.textContent =
        "추천 중량 적용";

      applyRecommendationBtn.setAttribute(
        "aria-busy",
        "false"
      );
    }

    setRecommendationApplyMessage(
      ""
    );
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

  function renderRecommendationAction(
    recommendation,
    exercise,
    exerciseIndex
  ) {
    resetRecommendationAction();

    if (
      recommendation?.action !==
        "increase" ||
      !exercise ||
      !recommendApplyArea ||
      !applyRecommendationBtn
    ) {
      return;
    }

    latestRecommendation = {
      ...recommendation,
      exerciseIndex,
      exerciseId:
        recommendation.exerciseId ||
        String(exercise.id || ""),
      exerciseName:
        recommendation.exerciseName ||
        exercise.name
    };

    recommendApplyArea.classList.remove(
      "hidden"
    );

    const nextWeightText =
      formatWeight(
        recommendation.nextWeight
      );

    if (
      !recommendation
        .currentSessionSaved
    ) {
      applyRecommendationBtn.disabled =
        true;

      applyRecommendationBtn.textContent =
        "완료 기록 저장 후 적용";

      setRecommendationApplyMessage(
        "완료 기록이 저장되면 추천 중량을 적용할 수 있습니다."
      );

      return;
    }

    if (
      areWeightsEqual(
        exercise.weight,
        recommendation.nextWeight
      )
    ) {
      applyRecommendationBtn.disabled =
        true;

      applyRecommendationBtn.textContent =
        "추천 중량 적용 완료";

      setRecommendationApplyMessage(
        `${nextWeightText}kg가 이미 다음 목표로 적용되어 있습니다.`
      );

      return;
    }

    if (
      !areWeightsEqual(
        exercise.weight,
        recommendation.currentWeight
      )
    ) {
      applyRecommendationBtn.disabled =
        true;

      applyRecommendationBtn.textContent =
        "루틴 목표 확인 필요";

      setRecommendationApplyMessage(
        "추천을 계산한 뒤 루틴 목표가 변경되어 자동 적용을 중단했습니다.",
        true
      );

      return;
    }

    applyRecommendationBtn.disabled =
      false;

    applyRecommendationBtn.textContent =
      `${nextWeightText}kg를 다음 목표로 적용`;

    setRecommendationApplyMessage(
      "누르면 다음 운동의 목표 중량만 변경되며, 완료된 과거 기록은 유지됩니다."
    );
  }

  function setRecommendationApplyBusy(
    isBusy
  ) {
    recommendationApplyInProgress =
      isBusy;

    if (!applyRecommendationBtn) {
      return;
    }

    applyRecommendationBtn.disabled =
      isBusy;

    applyRecommendationBtn.setAttribute(
      "aria-busy",
      String(isBusy)
    );

    if (isBusy) {
      applyRecommendationBtn.textContent =
        "추천 중량 적용 중...";
    }
  }

  async function applyProgressionRecommendation() {
    if (
      recommendationApplyInProgress
    ) {
      return;
    }

    const recommendation =
      latestRecommendation;

    if (
      recommendation?.action !==
        "increase" ||
      !recommendation
        .currentSessionSaved
    ) {
      setRecommendationApplyMessage(
        "적용할 수 있는 증량 추천이 없습니다.",
        true
      );
      return;
    }

    const exerciseIndex =
      Number(
        recommendation.exerciseIndex
      );

    const exercise =
      exercises[exerciseIndex];

    if (
      !Number.isInteger(
        exerciseIndex
      ) ||
      !isSameRecommendedExercise(
        exercise,
        recommendation
      )
    ) {
      setRecommendationApplyMessage(
        "추천 대상 운동을 현재 루틴에서 찾을 수 없습니다.",
        true
      );
      return;
    }

    if (
      areWeightsEqual(
        exercise.weight,
        recommendation.nextWeight
      )
    ) {
      renderRecommendationAction(
        recommendation,
        exercise,
        exerciseIndex
      );
      return;
    }

    if (
      !areWeightsEqual(
        exercise.weight,
        recommendation.currentWeight
      )
    ) {
      renderRecommendationAction(
        recommendation,
        exercise,
        exerciseIndex
      );
      return;
    }

    const routineApi =
      window.JYMLog.routines;

    if (
      !routineApi
        ?.updateActiveRoutineExercise
    ) {
      setRecommendationApplyMessage(
        "루틴 저장 기능을 불러오지 못했습니다.",
        true
      );
      return;
    }

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

    setRecommendationApplyBusy(true);

    setRecommendationApplyMessage(
      `${nextWeightText}kg 목표를 루틴에 저장하고 있습니다.`
    );

    try {
      await routineApi
        .updateActiveRoutineExercise(
          exerciseIndex,
          {
            name: exercise.name,
            type: exercise.type,
            weight:
              recommendation.nextWeight,
            sets: Number(exercise.sets),
            min: Number(exercise.min),
            max: Number(exercise.max),
            rest: Number(exercise.rest),
            increment:
              Number(exercise.increment)
          }
        );

      window.JYMLog.routineUI
        ?.refresh?.();

      applyRecommendationBtn.disabled =
        true;

      applyRecommendationBtn.textContent =
        "추천 중량 적용 완료";

      applyRecommendationBtn.setAttribute(
        "aria-busy",
        "false"
      );

      setRecommendationApplyMessage(
        `${nextWeightText}kg가 다음 ${exercise.name} 목표로 저장되었습니다.`
      );

      showToast(
        `${exercise.name} 목표를 ${nextWeightText}kg로 변경했습니다.`
      );
    } catch (error) {
      console.error(
        "[JYM Log] 추천 중량 적용 실패",
        error
      );

      setRecommendationApplyBusy(false);

      applyRecommendationBtn.textContent =
        `${nextWeightText}kg를 다음 목표로 적용`;

      setRecommendationApplyMessage(
        error.message ||
        "추천 중량을 루틴에 저장하지 못했습니다.",
        true
      );
    } finally {
      recommendationApplyInProgress =
        false;
    }
  }

  function renderRecommendationFallback(
    exercise
  ) {
    resetRecommendationAction();

    if (recommendTitle) {
      recommendTitle.textContent =
        exercise
          ? `다음 ${exercise.name} 추천`
          : "다음 운동 추천";
    }

    if (recommendText) {
      recommendText.textContent =
        exercise
          ? `${exercise.weight}kg 유지`
          : "추천을 준비하지 못했습니다.";
    }

    if (recommendReason1) {
      recommendReason1.textContent =
        "추천 엔진을 불러오지 못해 현재 목표를 유지합니다.";
    }

    if (recommendReason2) {
      recommendReason2.textContent =
        exercise
          ? `설정된 증량 단위는 ${exercise.increment}kg입니다.`
          : "루틴 설정을 확인해 주세요.";
    }
  }

  async function renderProgressionRecommendation() {
    syncState();

    const requestId =
      recommendationRequestId + 1;

    recommendationRequestId =
      requestId;

    const exerciseIndex = 0;
    const exercise =
      exercises[exerciseIndex];

    resetRecommendationAction();

    if (!exercise) {
      renderRecommendationFallback(
        null
      );
      return;
    }

    if (recommendTitle) {
      recommendTitle.textContent =
        `다음 ${exercise.name} 추천`;
    }

    if (recommendText) {
      recommendText.textContent =
        "최근 수행 기록을 분석하고 있습니다.";
    }

    if (recommendReason1) {
      recommendReason1.textContent =
        "이번 세트 달성 여부를 확인합니다.";
    }

    if (recommendReason2) {
      recommendReason2.textContent =
        `설정된 증량 단위 ${exercise.increment}kg을 확인합니다.`;
    }

    setRecommendationBusy(true);

    const engine =
      window.JYMLog
        .progressionEngine;

    if (!engine?.loadRecommendation) {
      setRecommendationBusy(false);
      renderRecommendationFallback(
        exercise
      );
      return;
    }

    try {
      const recommendation =
        await engine
          .loadRecommendation({
            exercise,
            exerciseIndex,
            state
          });

      if (
        requestId !==
        recommendationRequestId
      ) {
        return;
      }

      recommendText.textContent =
        recommendation.text;

      recommendReason1.textContent =
        recommendation.reason;

      recommendReason2.textContent =
        recommendation
          .incrementReason;

      renderRecommendationAction(
        recommendation,
        exercise,
        exerciseIndex
      );
    } catch (error) {
      console.error(
        "[JYM Log] 운동 증량 추천 표시 실패",
        error
      );

      if (
        requestId ===
        recommendationRequestId
      ) {
        renderRecommendationFallback(
          exercise
        );
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

    void renderProgressionRecommendation();
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
      await renderProgressionRecommendation();

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

    applyRecommendationBtn
      ?.addEventListener(
        "click",
        () => {
          void applyProgressionRecommendation();
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
