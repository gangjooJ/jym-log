window.JYMLog = window.JYMLog || {};

window.JYMLog.workout = (() => {
  /**
   * 현재 프로토타입에서 사용하는 운동 목록
   *
   * 나중에는 이 데이터를 Supabase에서 불러오게 됩니다.
   * 지금은 운동 기록 화면을 테스트하기 위해 코드에 직접 작성합니다.
   */
  const exercises = [
    {
      name: "벤치프레스",
      icon: "B",
      weight: 80,
      sets: 5,
      min: 5,
      max: 5,
      previous: "80kg · 5 / 5 / 5 / 5 / 4",
      rest: 180,
      increment: 2.5,
      type: "고정 반복형"
    },
    {
      name: "인클라인 벤치프레스",
      icon: "I",
      weight: 50,
      sets: 3,
      min: 8,
      max: 12,
      previous: "50kg · 12 / 11 / 10",
      rest: 120,
      increment: 2.5,
      type: "반복 범위형"
    },
    {
      name: "케이블 크로스오버",
      icon: "C",
      weight: 24,
      sets: 3,
      min: 8,
      max: 12,
      previous: "24kg · 12 / 12 / 11",
      rest: 90,
      increment: 6,
      type: "반복 범위형"
    },
    {
      name: "트라이셉스 푸시다운",
      icon: "T",
      weight: 30,
      sets: 3,
      min: 8,
      max: 12,
      previous: "30kg · 12 / 10 / 10",
      rest: 90,
      increment: 6,
      type: "반복 범위형"
    },
    {
      name: "바벨 컬",
      icon: "A",
      weight: 25,
      sets: 3,
      min: 8,
      max: 12,
      previous: "25kg · 11 / 10 / 9",
      rest: 90,
      increment: 2.5,
      type: "반복 범위형"
    }
  ];

  /**
   * 사용자가 아직 운동을 시작하지 않았을 때의 기본 상태
   */
  const defaultState = {
    activeExercise: 0,
    started: false,
    startedAt: null,
    sets: {},
    fatigue: 3,
    completed: false
  };
  function createDefaultState() {
  return {
    ...defaultState,
    sets: {}
  };
}

  /**
   * 브라우저에 저장된 운동 상태를 불러옵니다.
   *
   * 저장된 기록이 없다면 defaultState를 사용합니다.
   */
  let state =
  window.JYMLog.storage.load(
    createDefaultState()
  );

  let restTimerId = null;
  let elapsedTimerId = null;
  let restRemaining = 0;

  /**
   * 현재 운동 상태를 브라우저에 저장합니다.
   */
  function saveState() {
    return window.JYMLog.storage.save(state);
  }

  /**
 * 기존 state 객체 자체는 유지하면서
 * 내부 데이터만 새로운 상태로 교체합니다.
 *
 * app.js가 같은 state 객체를 계속 참조하도록
 * 객체를 새로 대입하지 않는 것이 중요합니다.
 */
function replaceState(
  nextState,
  persist = true
) {
  const normalizedState = {
    ...createDefaultState(),
    ...(nextState || {}),
    sets: {
      ...(nextState?.sets || {})
    }
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
    saveState();
  }

  return state;
}

/**
 * 로그인 계정의 전용 운동 기록을 활성화합니다.
 */
function activateUser(userId) {
  const userState =
    window.JYMLog.storage.activateUser(
      userId,
      createDefaultState()
    );

  replaceState(
    userState,
    true
  );

  return state;
}

function deactivateUser() {
  window.JYMLog.storage.deactivateUser();
}

  /**
   * 초 단위 시간을 00:00 형식으로 변환합니다.
   */
  function formatTime(seconds) {
    const safeSeconds = Math.max(0, Number(seconds) || 0);

    const minutes = Math.floor(safeSeconds / 60)
      .toString()
      .padStart(2, "0");

    const remainingSeconds = Math.floor(safeSeconds % 60)
      .toString()
      .padStart(2, "0");

    return `${minutes}:${remainingSeconds}`;
  }

  /**
   * 특정 운동의 특정 세트 기록을 가져옵니다.
   *
   * 기록이 없다면 해당 운동의 기본 중량과 반복 수로 생성합니다.
   */
  function getSet(exerciseIndex, setIndex) {
    const key = `${exerciseIndex}-${setIndex}`;

    if (!state.sets[key]) {
      state.sets[key] = {
        weight: exercises[exerciseIndex].weight,
        reps: exercises[exerciseIndex].min,
        done: false
      };

      saveState();
    }

    return state.sets[key];
  }

  /**
   * 세트의 중량이나 반복 수를 수정합니다.
   */
  function updateSet(exerciseIndex, setIndex, field, value) {
    const set = getSet(exerciseIndex, setIndex);

    set[field] = value;
    saveState();

    return set;
  }

  /**
   * 세트 완료와 완료 취소를 전환합니다.
   */
  function toggleSetDone(exerciseIndex, setIndex) {
    const set = getSet(exerciseIndex, setIndex);

    set.done = !set.done;
    saveState();

    return set.done;
  }

  /**
   * 현재 화면에 표시할 운동 번호를 변경합니다.
   */
  function setActiveExercise(exerciseIndex) {
    state.activeExercise = exerciseIndex;
    saveState();
  }

  /**
   * 운동을 시작 상태로 변경합니다.
   */
  function beginWorkout() {
    state.started = true;
    state.completed = false;

    if (!state.startedAt) {
      state.startedAt = Date.now();
    }

    saveState();
  }

  /**
   * 운동을 완료 상태로 변경합니다.
   */
  function finishWorkout() {
    state.completed = true;
    saveState();
  }

  /**
   * 운동 완료 후 입력한 피로도를 저장합니다.
   */
  function setFatigue(value) {
    state.fatigue = Number(value);
    saveState();
  }

  /**
   * 완료한 전체 세트 수를 계산합니다.
   */
  function getCompletedSetCount() {
    return Object.values(state.sets).filter((set) => set.done).length;
  }

  /**
   * 완료한 세트의 총 운동 볼륨을 계산합니다.
   *
   * 볼륨 = 중량 × 반복 수
   */
  function getTotalVolume() {
    return Math.round(
      Object.values(state.sets)
        .filter((set) => set.done)
        .reduce((total, set) => {
          const weight = Number(set.weight) || 0;
          const reps = Number(set.reps) || 0;

          return total + weight * reps;
        }, 0)
    );
  }

  /**
   * 벤치프레스 5세트 모두 5회 이상 성공했는지 확인합니다.
   */
  function isBenchPressSuccess() {
    const benchPress = exercises[0];

    for (let setIndex = 0; setIndex < benchPress.sets; setIndex += 1) {
      const set = getSet(0, setIndex);

      if (!set.done || Number(set.reps) < benchPress.max) {
        return false;
      }
    }

    return true;
  }

  /**
   * 휴식 타이머를 시작합니다.
   *
   * onTick:
   * 1초마다 남은 시간을 화면에 전달합니다.
   *
   * onFinish:
   * 시간이 끝났을 때 실행합니다.
   */
  function startRestTimer(seconds, onTick, onFinish) {
    stopRestTimer();

    restRemaining = Number(seconds) || 0;
    onTick(restRemaining);

    restTimerId = window.setInterval(() => {
      restRemaining -= 1;
      onTick(restRemaining);

      if (restRemaining <= 0) {
        stopRestTimer();

        if (typeof onFinish === "function") {
          onFinish();
        }
      }
    }, 1000);
  }

  /**
   * 현재 휴식 시간에 초를 추가합니다.
   */
  function addRestTime(seconds, onTick) {
    restRemaining += Number(seconds) || 0;

    if (typeof onTick === "function") {
      onTick(restRemaining);
    }
  }

  /**
   * 휴식 타이머를 중지합니다.
   */
  function stopRestTimer() {
    if (restTimerId !== null) {
      window.clearInterval(restTimerId);
      restTimerId = null;
    }
  }

  /**
   * 전체 운동 경과 시간을 측정합니다.
   */
  function startElapsedTimer(onTick) {
    stopElapsedTimer();

    elapsedTimerId = window.setInterval(() => {
      if (!state.startedAt) {
        return;
      }

      const elapsedSeconds = Math.floor(
        (Date.now() - state.startedAt) / 1000
      );

      onTick(elapsedSeconds);
    }, 1000);
  }

  /**
   * 운동 경과 시간 타이머를 중지합니다.
   */
  function stopElapsedTimer() {
    if (elapsedTimerId !== null) {
      window.clearInterval(elapsedTimerId);
      elapsedTimerId = null;
    }
  }

  /**
   * 프로토타입 운동 기록을 초기 상태로 되돌립니다.
   */
  function resetWorkout() {
  stopRestTimer();
  stopElapsedTimer();

  window.JYMLog.storage.clear();

  replaceState(
    createDefaultState(),
    false
  );
}

  /**
   * 다른 파일에서 사용할 기능만 외부로 공개합니다.
   */
  return {
    exercises,

    get state() {
      return state;
    },

    saveState,
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