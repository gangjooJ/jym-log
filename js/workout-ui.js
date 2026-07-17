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

  const recommendText =
    document.getElementById(
      "recommendText"
    );

  const recommendReason1 =
    document.getElementById(
      "recommendReason1"
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

  function renderSummary() {
    syncState();

    if (
      !summaryDuration ||
      !summarySets ||
      !summaryVolume ||
      !recommendText ||
      !recommendReason1
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

    const benchSuccess =
      workout.isBenchPressSuccess();

    if (benchSuccess) {
      recommendText.textContent =
        "80kg · 5 × 5 한 번 더";

      recommendReason1.textContent =
        "80kg 5×5를 첫 번째로 완수했습니다. 2회 연속 성공 시 증량합니다.";
    } else {
      recommendText.textContent =
        "80kg · 5 × 5 유지";

      recommendReason1.textContent =
        "아직 모든 목표 세트를 달성하지 않아 동일 중량 재도전을 추천합니다.";
    }
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
