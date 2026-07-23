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

  const REST_TIMER_SCHEMA_VERSION =
  1;

  let restTimerId = null;
  let elapsedTimerId = null;
  let restTimerEndsAt = 0;

  function getRestTimerStorageKey() {
    const baseKey =
      window.JYMLog.config
        ?.storageKey ||
      "jym-log";

    const userId =
      window.JYMLog.storage
        ?.activeUserId ||
      "anonymous";

    return [
      baseKey,
      "rest-timer",
      userId
    ].join(":");
  }

  function readRestTimerSnapshot() {
    try {
      const savedValue =
        window.localStorage
          .getItem(
            getRestTimerStorageKey()
          );

      if (!savedValue) {
        return null;
      }

      const snapshot =
        JSON.parse(savedValue);

      if (
        snapshot?.schemaVersion !==
          REST_TIMER_SCHEMA_VERSION
      ) {
        return null;
      }

      return snapshot;
    } catch (error) {
      console.warn(
        "[JYM Log] 휴식 타이머를 불러오지 못했습니다.",
        error
      );

      return null;
    }
  }

  function writeRestTimerSnapshot(
    endsAt
  ) {
    const safeEndsAt =
      Number(endsAt) || 0;

    const workoutStartedAt =
      Number(state.startedAt) || 0;

    if (
      !state.started ||
      state.completed ||
      !workoutStartedAt ||
      safeEndsAt <= Date.now()
    ) {
      clearRestTimerSnapshot();
      return false;
    }

    try {
      window.localStorage
        .setItem(
          getRestTimerStorageKey(),
          JSON.stringify({
            schemaVersion:
              REST_TIMER_SCHEMA_VERSION,

            endsAt:
              safeEndsAt,

            workoutStartedAt,

            updatedAt:
              Date.now()
          })
        );

      return true;
    } catch (error) {
      console.warn(
        "[JYM Log] 휴식 타이머를 저장하지 못했습니다.",
        error
      );

      return false;
    }
  }

  function clearRestTimerSnapshot() {
    try {
      window.localStorage
        .removeItem(
          getRestTimerStorageKey()
        );
    } catch (error) {
      console.warn(
        "[JYM Log] 휴식 타이머 저장값을 삭제하지 못했습니다.",
        error
      );
    }
  }

  function isRestTimerSnapshotValid(
    snapshot
  ) {
    if (
      !snapshot ||
      !state.started ||
      state.completed
    ) {
      return false;
    }

    const snapshotStartedAt =
      Number(
        snapshot.workoutStartedAt
      ) || 0;

    const currentStartedAt =
      Number(state.startedAt) || 0;

    const snapshotEndsAt =
      Number(snapshot.endsAt) || 0;

    return (
      snapshotStartedAt > 0 &&
      snapshotStartedAt ===
        currentStartedAt &&
      snapshotEndsAt >
        Date.now()
    );
  }

  function clearRestTimerInterval() {
    if (restTimerId === null) {
      return;
    }

    window.clearInterval(
      restTimerId
    );

    restTimerId = null;
  }

  function getRestTimerRemaining() {
    if (!restTimerEndsAt) {
      return 0;
    }

    return Math.max(
      0,
      Math.ceil(
        (
          restTimerEndsAt -
          Date.now()
        ) / 1000
      )
    );
  }

  function hasActiveRestTimer() {
    return (
      getRestTimerRemaining() >
      0
    );
  }

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
      clearRestTimerInterval();
      stopElapsedTimer();

      restTimerEndsAt = 0;

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
    clearRestTimerInterval();
    stopElapsedTimer();

    restTimerEndsAt = 0;

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

  function normalizeSetFieldValue(
    field,
    value
  ) {
    const numericValue =
      Number(value);

    if (
      !Number.isFinite(
        numericValue
      )
    ) {
      throw new Error(
        "올바른 숫자를 입력해 주세요."
      );
    }

    if (field === "weight") {
      if (
        numericValue < 0 ||
        numericValue > 1000
      ) {
        throw new Error(
          "중량은 0~1000kg 사이로 입력해 주세요."
        );
      }

      return Math.round(
        numericValue * 100
      ) / 100;
    }

    if (field === "reps") {
      if (
        !Number.isInteger(
          numericValue
        ) ||
        numericValue < 0 ||
        numericValue > 100
      ) {
        throw new Error(
          "반복 수는 0~100 사이의 정수로 입력해 주세요."
        );
      }

      return numericValue;
    }

    throw new Error(
      "수정할 세트 항목을 확인할 수 없습니다."
    );
  }

  function validateSet(set) {
    const weight =
      Number(set?.weight);

    const reps =
      Number(set?.reps);

    if (
      !Number.isFinite(weight) ||
      weight < 0 ||
      weight > 1000
    ) {
      return {
        valid: false,
        message:
          "중량은 0kg 이상으로 입력해 주세요."
      };
    }

    if (
      !Number.isInteger(reps) ||
      reps < 1 ||
      reps > 100
    ) {
      return {
        valid: false,
        message:
          "세트 완료 전 반복 수를 1회 이상 입력해 주세요."
      };
    }

    return {
      valid: true,
      message: ""
    };
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

    set[field] =
      normalizeSetFieldValue(
        field,
        value
      );

    /*
    * 완료된 세트의 값을 무효한 값으로 바꾸면
    * 완료 상태를 자동 해제합니다.
    */
    if (
      set.done &&
      !validateSet(set).valid
    ) {
      set.done = false;
    }

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

    /*
    * 이미 완료된 세트는 검증 없이
    * 완료 취소할 수 있어야 합니다.
    */
    if (set.done) {
      set.done = false;
      saveState();

      return false;
    }

    const validation =
      validateSet(set);

    if (!validation.valid) {
      throw new Error(
        validation.message
      );
    }

    set.done = true;
    saveState();

    return true;
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

    if (
      state.started &&
      !state.completed
    ) {
      return state;
    }

    stopRestTimer();
    stopElapsedTimer();

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
    const validation =
      validateWorkoutCompletion(
        state
      );

    if (!validation.valid) {
      throw new Error(
        validation.message
      );
    }

    /*
    * 이미 완료된 운동은 완료 시각을
    * 다시 덮어쓰지 않습니다.
    */
    if (state.completed) {
      return state;
    }

    state.completed = true;

    if (!state.completedAt) {
      state.completedAt =
        Date.now();
    }

    stopRestTimer();
    stopElapsedTimer();

    saveState();

    return state;
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

  function validateWorkoutCompletion(
    targetState = state
  ) {
    const startedAt =
      Number(
        targetState?.startedAt
      );

    if (
      !targetState?.started ||
      !Number.isFinite(startedAt) ||
      startedAt <= 0
    ) {
      return {
        valid: false,
        message:
          "먼저 운동을 시작해 주세요.",
        completedSetCount: 0
      };
    }

    const completedSets =
      Object.values(
        targetState?.sets || {}
      ).filter(
        (set) =>
          Boolean(set?.done)
      );

    if (
      completedSets.length === 0
    ) {
      return {
        valid: false,
        message:
          "완료한 세트가 없습니다. 한 세트 이상 완료해 주세요.",
        completedSetCount: 0
      };
    }

    const invalidCompletedSet =
      completedSets.find(
        (set) =>
          !validateSet(set).valid
      );

    if (invalidCompletedSet) {
      return {
        valid: false,
        message:
          "완료한 세트의 중량과 반복 수를 확인해 주세요.",
        completedSetCount:
          completedSets.length
      };
    }

    return {
      valid: true,
      message: "",
      completedSetCount:
        completedSets.length
    };
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

  function runRestTimer(
    onTick,
    onFinish
  ) {
    clearRestTimerInterval();

    let previousRemaining =
      null;

    const tick = () => {
      const remaining =
        getRestTimerRemaining();

      /*
      * interval은 250ms마다 확인하지만,
      * 표시되는 초가 바뀔 때만 UI를 갱신합니다.
      */
      if (
        remaining !==
          previousRemaining
      ) {
        previousRemaining =
          remaining;

        if (
          typeof onTick ===
            "function"
        ) {
          onTick(remaining);
        }
      }

      if (remaining > 0) {
        return;
      }

      const hadActiveTimer =
        restTimerEndsAt > 0;

      clearRestTimerInterval();

      restTimerEndsAt = 0;

      clearRestTimerSnapshot();

      if (
        hadActiveTimer &&
        typeof onFinish ===
          "function"
      ) {
        onFinish();
      }
    };

    tick();

    if (
      getRestTimerRemaining() >
        0
    ) {
      restTimerId =
        window.setInterval(
          tick,
          250
        );
    }
  }

  function startRestTimer(
    seconds,
    onTick,
    onFinish
  ) {
    const safeSeconds =
      Math.max(
        0,
        Math.floor(
          Number(seconds) || 0
        )
      );

    clearRestTimerInterval();

    if (
      !state.started ||
      state.completed ||
      safeSeconds <= 0
    ) {
      restTimerEndsAt = 0;

      clearRestTimerSnapshot();

      if (
        typeof onTick ===
          "function"
      ) {
        onTick(0);
      }

      return false;
    }

    restTimerEndsAt =
      Date.now() +
      safeSeconds * 1000;

    writeRestTimerSnapshot(
      restTimerEndsAt
    );

    runRestTimer(
      onTick,
      onFinish
    );

    return true;
  }

  function resumeRestTimer(
    onTick,
    onFinish
  ) {
    clearRestTimerInterval();

    const snapshot =
      readRestTimerSnapshot();

    if (
      !isRestTimerSnapshotValid(
        snapshot
      )
    ) {
      restTimerEndsAt = 0;

      clearRestTimerSnapshot();

      if (
        typeof onTick ===
          "function"
      ) {
        onTick(0);
      }

      return false;
    }

    restTimerEndsAt =
      Number(
        snapshot.endsAt
      ) || 0;

    runRestTimer(
      onTick,
      onFinish
    );

    return true;
  }

  function addRestTime(
    seconds,
    onTick
  ) {
    const addedSeconds =
      Math.max(
        0,
        Math.floor(
          Number(seconds) || 0
        )
      );

    if (
      addedSeconds <= 0 ||
      !hasActiveRestTimer()
    ) {
      return 0;
    }

    restTimerEndsAt +=
      addedSeconds * 1000;

    writeRestTimerSnapshot(
      restTimerEndsAt
    );

    const remaining =
      getRestTimerRemaining();

    if (
      typeof onTick ===
        "function"
    ) {
      onTick(remaining);
    }

    return remaining;
  }

  function stopRestTimer() {
    const hadActiveTimer =
      Boolean(
        restTimerId !== null ||
        restTimerEndsAt > 0
      );

    clearRestTimerInterval();

    restTimerEndsAt = 0;

    clearRestTimerSnapshot();

    return hadActiveTimer;
  }

  function getElapsedSeconds() {
    if (!state.startedAt) {
      return 0;
    }

    const endAt =
      state.completedAt ||
      Date.now();

    return Math.max(
      0,
      Math.floor(
        (
          endAt -
          state.startedAt
        ) / 1000
      )
    );
  }

  function startElapsedTimer(
    onTick
  ) {
    stopElapsedTimer();

    const tick = () => {
      if (
        typeof onTick ===
          "function"
      ) {
        onTick(
          getElapsedSeconds()
        );
      }
    };

    /*
    * 화면 진입 직후에도 1초를 기다리지 않고
    * 현재 운동 시간을 바로 표시합니다.
    */
    tick();

    if (
      !state.started ||
      state.completed
    ) {
      return;
    }

    elapsedTimerId =
      window.setInterval(
        tick,
        1000
      );
  }

  function stopElapsedTimer() {
    if (
      elapsedTimerId === null
    ) {
      return;
    }

    window.clearInterval(
      elapsedTimerId
    );

    elapsedTimerId = null;
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
    validateSet,
    validateWorkoutCompletion,
    toggleSetDone,
    setActiveExercise,
    beginWorkout,
    finishWorkout,
    setFatigue,
    getCompletedSetCount,
    getTotalVolume,
    isBenchPressSuccess,
    startRestTimer,
    resumeRestTimer,
    addRestTime,
    stopRestTimer,
    getRestTimerRemaining,
    hasActiveRestTimer,
    startElapsedTimer,
    stopElapsedTimer,
    resetWorkout
  };
})();

