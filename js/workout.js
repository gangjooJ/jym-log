window.JYMLog = window.JYMLog || {};

window.JYMLog.workout = (() => {
  const progressionPolicy =
    window.JYMLog.progressionPolicy;

  if (!progressionPolicy) {
    throw new Error(
      "진행 정책 모듈을 불러오지 못했습니다."
    );
  }

  const rawExercises = [
    {
      id: "bench-press",
      name: "벤치프레스",
      icon: "B",
      weight: 80,
      sets: 5,
      min: 5,
      max: 5,
      previous:
        "80kg · 5 / 5 / 5 / 5 / 4",
      rest: 180,
      increment: 2.5,
      type: "고정 반복형"
    },
    {
      id: "incline-bench-press",
      name: "인클라인 벤치프레스",
      icon: "I",
      weight: 50,
      sets: 3,
      min: 8,
      max: 12,
      previous:
        "50kg · 12 / 11 / 10",
      rest: 120,
      increment: 2.5,
      type: "반복 범위형"
    },
    {
      id: "cable-crossover",
      name: "케이블 크로스오버",
      icon: "C",
      weight: 24,
      sets: 3,
      min: 8,
      max: 12,
      previous:
        "24kg · 12 / 12 / 11",
      rest: 90,
      increment: 6,
      type: "반복 범위형"
    },
    {
      id: "triceps-pushdown",
      name: "트라이셉스 푸시다운",
      icon: "T",
      weight: 30,
      sets: 3,
      min: 8,
      max: 12,
      previous:
        "30kg · 12 / 10 / 10",
      rest: 90,
      increment: 6,
      type: "반복 범위형"
    },
    {
      id: "barbell-curl",
      name: "바벨 컬",
      icon: "A",
      weight: 25,
      sets: 3,
      min: 8,
      max: 12,
      previous:
        "25kg · 11 / 10 / 9",
      rest: 90,
      increment: 2.5,
      type: "반복 범위형"
    }
  ];

  const exercises = rawExercises.map(
    (exercise, index) =>
      progressionPolicy
        .normalizeRoutineExercise(
          exercise,
          {
            routineId: "main",
            index
          }
        )
  );

  const defaultState = {
    routineId: "main",
    routineName: "",
    routineCode: "",

    scheduledDate: null,
    scheduleSource: "manual",
    scheduledType: "manual",
    scheduledRoutineId: null,
    scheduledRoutineName: null,
    overrideRoutineId: null,
    overrideRoutineName: null,

    activeExercise: 0,
    started: false,
    startedAt: null,
    completedAt: null,
    sets: {},
    fatigue: 3,
    completed: false,
    updatedAt: 0
  };

  function createDefaultState() {
    return {
      ...defaultState,
      sets: {}
    };
  }

  let state =
    window.JYMLog.storage.load(
      createDefaultState()
    );

  let restTimerId = null;
  let elapsedTimerId = null;
  let restRemaining = 0;

  function saveState(options = {}) {
    const touchUpdatedAt =
      options.touchUpdatedAt !== false;

    if (touchUpdatedAt) {
      state.updatedAt = Date.now();
    }

    return window.JYMLog.storage.save(
      state
    );
  }

  function normalizeExercise(
    exercise,
    index
  ) {
    return progressionPolicy
      .normalizeRoutineExercise(
        exercise,
        {
          routineId:
            exercise?.routineId ||
            state?.routineId ||
            "main",
          index
        }
      );
  }

  function replaceExercises(
    nextExercises,
    persist = true
  ) {
    if (
      !Array.isArray(nextExercises) ||
      nextExercises.length === 0
    ) {
      throw new Error(
        "루틴에 하나 이상의 운동이 필요합니다."
      );
    }

    const normalizedExercises =
      nextExercises.map(
        normalizeExercise
      );

    exercises.splice(
      0,
      exercises.length,
      ...normalizedExercises
    );

    if (
      state.activeExercise >=
      exercises.length
    ) {
      state.activeExercise = 0;
    }

    if (!state.started) {
      state.routineId =
        normalizedExercises[0]
          ?.routineId ||
        state.routineId ||
        "main";
    }

    if (persist) {
      saveState();
    }

    return exercises;
  }

  function replaceState(
    nextState,
    persist = true,
    touchUpdatedAt = false
  ) {
    const normalizedState = {
      ...createDefaultState(),
      ...(nextState || {}),
      routineId:
        String(
          nextState?.routineId ||
          exercises[0]?.routineId ||
          "main"
        ),
      sets: {
        ...(nextState?.sets || {})
      },
      updatedAt:
        Number(
          nextState?.updatedAt
        ) || 0
    };

    Object.keys(state).forEach(
      (key) => {
        delete state[key];
      }
    );

    Object.assign(
      state,
      normalizedState
    );

    if (persist) {
      saveState({ touchUpdatedAt });
    }

    return state;
  }

  function activateUser(userId) {
    const userState =
      window.JYMLog.storage
        .activateUser(
          userId,
          createDefaultState()
        );

    replaceState(
      userState,
      false
    );

    return state;
  }

  function deactivateUser() {
    window.JYMLog.storage
      .deactivateUser();
  }

  function formatTime(seconds) {
    const safeSeconds =
      Math.max(
        0,
        Number(seconds) || 0
      );

    const minutes =
      Math.floor(
        safeSeconds / 60
      )
        .toString()
        .padStart(2, "0");

    const remainingSeconds =
      Math.floor(
        safeSeconds % 60
      )
        .toString()
        .padStart(2, "0");

    return `${minutes}:${remainingSeconds}`;
  }

  function getDefaultSetReps(
    exercise,
    setIndex
  ) {
    return Number(
      exercise?.setTargets?.[
        setIndex
      ] ??
      exercise?.min ??
      1
    ) || 1;
  }

  function getSet(
    exerciseIndex,
    setIndex
  ) {
    const key =
      `${exerciseIndex}-${setIndex}`;

    if (!state.sets[key]) {
      const exercise =
        exercises[exerciseIndex];

      state.sets[key] = {
        weight:
          exercise?.weight || 0,
        reps:
          getDefaultSetReps(
            exercise,
            setIndex
          ),
        done: false
      };

      saveState();
    }

    return state.sets[key];
  }

  function updateSet(
    exerciseIndex,
    setIndex,
    field,
    value
  ) {
    const set = getSet(
      exerciseIndex,
      setIndex
    );

    set[field] = value;
    saveState();
    return set;
  }

  function toggleSetDone(
    exerciseIndex,
    setIndex
  ) {
    const set = getSet(
      exerciseIndex,
      setIndex
    );

    set.done = !set.done;
    saveState();
    return set.done;
  }

  function setActiveExercise(
    exerciseIndex
  ) {
    state.activeExercise =
      exerciseIndex;
    saveState();
  }

  function beginWorkout(
    context = {}
  ) {
    /*
    * 이미 운동 중이면 시작 시점의
    * 루틴·일정 스냅샷을 덮어쓰지 않습니다.
    */
    if (
      state.started &&
      !state.completed
    ) {
      return state;
    }

    if (state.completed) {
      replaceState(
        createDefaultState(),
        false
      );
    }

    const activeRoutine =
      window.JYMLog.routines
        ?.activeRoutine;

    const routineId =
      String(
        context.routineId ||
        activeRoutine?.id ||
        exercises[0]?.routineId ||
        state.routineId ||
        "main"
      );

    state.routineId =
      routineId;

    state.routineName =
      String(
        context.routineName ||
        activeRoutine?.name ||
        "운동 루틴"
      );

    state.routineCode =
      String(
        context.routineCode ||
        activeRoutine?.code ||
        routineId
      );

    state.scheduledDate =
      context.scheduledDate ||
      null;

    state.scheduleSource =
      String(
        context.scheduleSource ||
        "manual"
      );

    state.scheduledType =
      String(
        context.scheduledType ||
        "manual"
      );

    state.scheduledRoutineId =
      context.scheduledRoutineId ||
      null;

    state.scheduledRoutineName =
      context.scheduledRoutineName ||
      null;

    state.overrideRoutineId =
      context.overrideRoutineId ||
      null;

    state.overrideRoutineName =
      context.overrideRoutineName ||
      null;

    state.started = true;
    state.completed = false;
    state.completedAt = null;

    if (!state.startedAt) {
      state.startedAt =
        Date.now();
    }

    saveState();

    return state;
  }

  function finishWorkout() {
    state.completed = true;

    if (!state.completedAt) {
      state.completedAt =
        Date.now();
    }

    saveState();
  }

  function setFatigue(value) {
    state.fatigue = Number(value);
    saveState();
  }

  function getCompletedSetCount() {
    return Object.values(
      state.sets
    ).filter(
      (set) => set.done
    ).length;
  }

  function getTotalVolume() {
    return Math.round(
      Object.values(state.sets)
        .filter((set) => set.done)
        .reduce(
          (total, set) => {
            const weight =
              Number(set.weight) || 0;
            const reps =
              Number(set.reps) || 0;

            return total +
              weight * reps;
          },
          0
        )
    );
  }

  function isBenchPressSuccess() {
    const benchPress =
      exercises[0];

    if (!benchPress) {
      return false;
    }

    const target =
      progressionPolicy
        .getCurrentTarget(
          benchPress,
          benchPress
            .progressionPolicy,
          benchPress
            .progressionState
        );

    const sets = [];

    for (
      let setIndex = 0;
      setIndex < target.setCount;
      setIndex += 1
    ) {
      sets.push(
        state.sets?.[
          `0-${setIndex}`
        ] || null
      );
    }

    return progressionPolicy
      .evaluateSets(
        sets,
        target,
        benchPress.weight
      ).success;
  }

  function startRestTimer(
    seconds,
    onTick,
    onFinish
  ) {
    stopRestTimer();

    restRemaining =
      Number(seconds) || 0;

    onTick(restRemaining);

    restTimerId =
      window.setInterval(
        () => {
          restRemaining -= 1;
          onTick(restRemaining);

          if (restRemaining <= 0) {
            stopRestTimer();

            if (
              typeof onFinish ===
              "function"
            ) {
              onFinish();
            }
          }
        },
        1000
      );
  }

  function addRestTime(
    seconds,
    onTick
  ) {
    restRemaining +=
      Number(seconds) || 0;

    if (
      typeof onTick ===
      "function"
    ) {
      onTick(restRemaining);
    }
  }

  function stopRestTimer() {
    if (restTimerId !== null) {
      window.clearInterval(
        restTimerId
      );

      restTimerId = null;
    }
  }

  function startElapsedTimer(
    onTick
  ) {
    stopElapsedTimer();

    elapsedTimerId =
      window.setInterval(
        () => {
          if (!state.startedAt) {
            return;
          }

          const elapsedSeconds =
            Math.floor(
              (
                Date.now() -
                state.startedAt
              ) / 1000
            );

          onTick(elapsedSeconds);
        },
        1000
      );
  }

  function stopElapsedTimer() {
    if (elapsedTimerId !== null) {
      window.clearInterval(
        elapsedTimerId
      );

      elapsedTimerId = null;
    }
  }

  function resetWorkout() {
    stopRestTimer();
    stopElapsedTimer();

    window.JYMLog.storage.clear();

    replaceState(
      createDefaultState(),
      false
    );
  }

  return {
    exercises,
    get state() {
      return state;
    },
    saveState,
    replaceExercises,
    replaceState,
    activateUser,
    deactivateUser,
    formatTime,
    getSet,
    updateSet,
    toggleSetDone,
    setActiveExercise,
    beginWorkout,
    finishWorkout,
    setFatigue,
    getCompletedSetCount,
    getTotalVolume,
    isBenchPressSuccess,
    startRestTimer,
    addRestTime,
    stopRestTimer,
    startElapsedTimer,
    stopElapsedTimer,
    resetWorkout
  };
})();

