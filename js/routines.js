import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
  db
} from "./firebase-client.js";

window.JYMLog =
  window.JYMLog || {};

const workout =
  window.JYMLog.workout;

const progressionPolicy =
  window.JYMLog.progressionPolicy;

if (!progressionPolicy) {
  throw new Error(
    "진행 정책 모듈을 불러오지 못했습니다."
  );
}

const ROUTINE_SCHEMA_VERSION = 1;
const ACTIVE_ROUTINE_ID = "main";

let activeRoutine = null;

function cloneData(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function validateRoutineName(value) {
  const name = normalizeText(value);
  const length =
    Array.from(name).length;

  if (length < 2) {
    throw new Error(
      "루틴 이름은 2자 이상 입력해 주세요."
    );
  }

  if (length > 30) {
    throw new Error(
      "루틴 이름은 30자 이하로 입력해 주세요."
    );
  }

  return name;
}

function normalizeDescription(value) {
  const description =
    normalizeText(value);

  const length =
    Array.from(description).length;

  if (length > 60) {
    throw new Error(
      "루틴 설명은 60자 이하로 입력해 주세요."
    );
  }

  return description ||
    "사용자 설정 루틴";
}

function normalizeRoutineExercise(
  routineId,
  exercise,
  exerciseIndex
) {
  return progressionPolicy
    .normalizeRoutineExercise(
      exercise,
      {
        routineId,
        index: exerciseIndex
      }
    );
}

function getStrategyTypeLabel(strategy) {
  if (strategy === "stage") {
    return "반복 단계형";
  }

  if (strategy === "manual") {
    return "수동 관리형";
  }

  return strategy === "load"
    ? "고정 반복형"
    : "반복 범위형";
}

function buildRepeatedTargets(setCount, reps) {
  return Array.from(
    { length: setCount },
    () => reps
  );
}

function normalizeProgressionStages(inputStages) {
  if (!Array.isArray(inputStages) || inputStages.length === 0) {
    throw new Error(
      "반복 단계형에는 최소 1개의 단계가 필요합니다."
    );
  }

  if (inputStages.length > 12) {
    throw new Error(
      "반복 단계는 최대 12개까지 설정할 수 있습니다."
    );
  }

  let expectedSetCount = null;

  return inputStages.map(
    (stage, stageIndex) => {
      const rawTargets =
        Array.isArray(stage?.setTargets)
          ? stage.setTargets
          : [];

      if (
        rawTargets.length < 1 ||
        rawTargets.length > 20
      ) {
        throw new Error(
          `${stageIndex + 1}단계는 1~20개의 세트 목표가 필요합니다.`
        );
      }

      const setTargets =
        rawTargets.map(
          (target) => Number(target)
        );

      if (
        setTargets.some(
          (target) =>
            !Number.isInteger(target) ||
            target < 1 ||
            target > 100
        )
      ) {
        throw new Error(
          `${stageIndex + 1}단계 반복 수는 1~100 사이의 정수로 입력해 주세요.`
        );
      }

      if (expectedSetCount === null) {
        expectedSetCount =
          setTargets.length;
      } else if (
        setTargets.length !==
        expectedSetCount
      ) {
        throw new Error(
          "모든 반복 단계는 같은 세트 수를 사용해야 합니다."
        );
      }

      return {
        id: String(
          stage?.id ||
          `stage-${stageIndex + 1}`
        ),
        label: String(
          stage?.label ||
          `${stageIndex + 1}단계`
        ),
        setTargets
      };
    }
  );
}

function buildProgressionSignature(
  exercise,
  policy
) {
  return JSON.stringify({
    weight: Number(exercise.weight),
    strategy: policy.strategy,
    enabled: policy.enabled,
    requiredSuccesses:
      policy.requiredSuccesses,
    stages: policy.stages.map(
      (stage) => ({
        setTargets:
          [...stage.setTargets]
      })
    ),
    resetStageIndex:
      policy.resetStageIndex
  });
}

function validateExerciseInput(
  currentExercise,
  input,
  exerciseIndex
) {
  const name =
    normalizeText(input.name);

  const nameLength =
    Array.from(name).length;

  if (nameLength < 2) {
    throw new Error(
      "운동 이름은 2자 이상 입력해 주세요."
    );
  }

  if (nameLength > 30) {
    throw new Error(
      "운동 이름은 30자 이하로 입력해 주세요."
    );
  }

  const allowedStrategies =
    new Set([
      "load",
      "rep-range",
      "stage",
      "manual"
    ]);

  const legacyStrategy =
    input.type === "고정 반복형"
      ? "load"
      : "rep-range";

  const strategy =
    allowedStrategies.has(
      input.progressionStrategy
    )
      ? input.progressionStrategy
      : legacyStrategy;

  const type =
    getStrategyTypeLabel(strategy);

  const weight = Number(input.weight);

  if (
    !Number.isFinite(weight) ||
    weight < 0 ||
    weight > 1000
  ) {
    throw new Error(
      "중량은 0~1000kg 사이로 입력해 주세요."
    );
  }

  let sets = Number(input.sets);
  let minReps = Number(input.min);
  let maxReps = Number(input.max);
  let stages;

  if (strategy === "stage") {
    stages = normalizeProgressionStages(
      input.progressionStages
    );

    const allTargets =
      stages.flatMap(
        (stage) => stage.setTargets
      );

    sets = stages[0].setTargets.length;
    minReps = Math.min(...allTargets);
    maxReps = Math.max(...allTargets);
  } else {
    if (
      !Number.isInteger(sets) ||
      sets < 1 ||
      sets > 20
    ) {
      throw new Error(
        "세트 수는 1~20 사이의 정수로 입력해 주세요."
      );
    }

    if (
      !Number.isInteger(minReps) ||
      minReps < 1 ||
      minReps > 100
    ) {
      throw new Error(
        "최소 반복 수는 1~100 사이로 입력해 주세요."
      );
    }

    maxReps =
      strategy === "load"
        ? minReps
        : maxReps;

    if (
      !Number.isInteger(maxReps) ||
      maxReps < minReps ||
      maxReps > 100
    ) {
      throw new Error(
        "최대 반복 수는 최소 반복 수 이상, 100회 이하로 입력해 주세요."
      );
    }

    const successReps =
      strategy === "rep-range" ||
      strategy === "manual"
        ? maxReps
        : minReps;

    stages = [{
      id: "stage-1",
      label: "1단계",
      setTargets:
        buildRepeatedTargets(
          sets,
          successReps
        )
    }];
  }

  const rest = Number(input.rest);

  if (
    !Number.isInteger(rest) ||
    rest < 0 ||
    rest > 1800
  ) {
    throw new Error(
      "휴식 시간은 0~1800초 사이로 입력해 주세요."
    );
  }

  const increment =
    Number(input.increment);

  if (
    !Number.isFinite(increment) ||
    increment <= 0 ||
    increment > 100
  ) {
    throw new Error(
      "증량 단위는 0보다 크고 100kg 이하여야 합니다."
    );
  }

  const requiredSuccesses =
    strategy === "manual"
      ? 1
      : Number(
          input.requiredSuccesses
        );

  if (
    !Number.isInteger(
      requiredSuccesses
    ) ||
    requiredSuccesses < 1 ||
    requiredSuccesses > 10
  ) {
    throw new Error(
      "필요 성공 횟수는 1~10회 사이로 입력해 주세요."
    );
  }

  const routineId =
    activeRoutine?.id ||
    currentExercise?.routineId ||
    ACTIVE_ROUTINE_ID;

  const baseExercise = {
    ...currentExercise,
    id:
      currentExercise.id ||
      `exercise-${exerciseIndex + 1}`,
    order: exerciseIndex,
    name,
    icon:
      currentExercise.icon ||
      name.charAt(0),
    type,
    weight,
    sets,
    min: minReps,
    max: maxReps,
    rest,
    increment,
    progressionPolicy: {
      schemaVersion: 1,
      strategy,
      enabled:
        strategy !== "manual",
      requiredSuccesses,
      stages,
      resetStageIndex: 0
    }
  };

  const currentNormalized =
    normalizeRoutineExercise(
      routineId,
      currentExercise,
      exerciseIndex
    );

  const proposedPolicy =
    progressionPolicy.normalizePolicy(
      baseExercise,
      baseExercise.progressionPolicy
    );

  const keepState =
    buildProgressionSignature(
      currentNormalized,
      currentNormalized.progressionPolicy
    ) ===
    buildProgressionSignature(
      baseExercise,
      proposedPolicy
    );

  return normalizeRoutineExercise(
    routineId,
    {
      ...baseExercise,
      progressionPolicy:
        proposedPolicy,
      progressionState:
        keepState
          ? currentNormalized
              .progressionState
          : {
              currentStageIndex: 0,
              successStreak: 0,
              failureStreak: 0
            }
    },
    exerciseIndex
  );
}

function emitRoutineReady() {
  window.dispatchEvent(
    new CustomEvent(
      "jym-log:routine-ready",
      {
        detail: {
          routine: activeRoutine
        }
      }
    )
  );
}

function createDefaultRoutine(userId) {
  const exercises =
    workout.exercises.map(
      (exercise, index) =>
        normalizeRoutineExercise(
          ACTIVE_ROUTINE_ID,
          {
            ...cloneData(exercise),
            id:
              exercise.id ||
              `exercise-${index + 1}`,
            order: index
          },
          index
        )
    );

  return {
    id: ACTIVE_ROUTINE_ID,
    userId,
    schemaVersion:
      ROUTINE_SCHEMA_VERSION,
    name: "가슴 · 팔 A",
    code: "upper-a",
    description:
      "벤치프레스 중심",
    isActive: true,
    exercises
  };
}

function normalizeRoutine(
  routineId,
  data,
  userId
) {
  const fallbackRoutine =
    createDefaultRoutine(userId);

  const sourceExercises =
    Array.isArray(data?.exercises) &&
    data.exercises.length > 0
      ? data.exercises
      : fallbackRoutine.exercises;

  const exercises =
    [...sourceExercises]
      .sort(
        (first, second) =>
          (Number(first.order) || 0) -
          (Number(second.order) || 0)
      )
      .map(
        (exercise, index) =>
          normalizeRoutineExercise(
            routineId,
            exercise,
            index
          )
      );

  return {
    id: routineId,
    userId,
    schemaVersion:
      ROUTINE_SCHEMA_VERSION,
    name:
      normalizeText(data?.name) ||
      fallbackRoutine.name,
    code:
      normalizeText(data?.code) ||
      fallbackRoutine.code,
    description:
      normalizeText(
        data?.description
      ) ||
      fallbackRoutine.description,
    isActive:
      data?.isActive !== false,
    exercises
  };
}

async function ensureActiveRoutine(
  userId
) {
  if (!userId) {
    throw new Error(
      "루틴을 불러올 사용자 UID가 없습니다."
    );
  }

  const routineDocument =
    doc(
      db,
      "users",
      userId,
      "routines",
      ACTIVE_ROUTINE_ID
    );

  const routineSnapshot =
    await getDoc(
      routineDocument
    );

  if (!routineSnapshot.exists()) {
    const defaultRoutine =
      createDefaultRoutine(userId);

    await setDoc(
      routineDocument,
      {
        ...defaultRoutine,
        createdAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp()
      }
    );

    activeRoutine =
      defaultRoutine;

    console.info(
      "[JYM Log] 기본 운동 루틴 생성 완료"
    );
  } else {
    activeRoutine =
      normalizeRoutine(
        routineSnapshot.id,
        routineSnapshot.data(),
        userId
      );

    console.info(
      "[JYM Log] 사용자 운동 루틴 불러오기 완료"
    );
  }

  workout.replaceExercises(
    activeRoutine.exercises,
    false
  );

  emitRoutineReady();
  return activeRoutine;
}

async function updateActiveRoutineMetadata(
  nameValue,
  descriptionValue
) {
  if (!activeRoutine?.userId) {
    throw new Error(
      "수정할 사용자 루틴을 찾을 수 없습니다."
    );
  }

  const name =
    validateRoutineName(nameValue);

  const description =
    normalizeDescription(
      descriptionValue
    );

  const routineDocument =
    doc(
      db,
      "users",
      activeRoutine.userId,
      "routines",
      activeRoutine.id
    );

  await setDoc(
    routineDocument,
    {
      userId:
        activeRoutine.userId,
      schemaVersion:
        ROUTINE_SCHEMA_VERSION,
      name,
      description,
      updatedAt:
        serverTimestamp()
    },
    {
      merge: true
    }
  );

  activeRoutine = {
    ...activeRoutine,
    name,
    description
  };

  emitRoutineReady();

  console.info(
    "[JYM Log] 루틴 정보 저장 완료"
  );

  return activeRoutine;
}

function assertRoutineCanChange() {
  if (!activeRoutine?.userId) {
    throw new Error(
      "수정할 사용자 루틴을 찾을 수 없습니다."
    );
  }

  if (
    workout.state.started &&
    !workout.state.completed
  ) {
    throw new Error(
      "운동 진행 중에는 루틴을 수정할 수 없습니다."
    );
  }
}

function createExerciseId() {
  if (
    window.crypto &&
    typeof window.crypto.randomUUID ===
      "function"
  ) {
    return `exercise-${window.crypto.randomUUID()}`;
  }

  return [
    "exercise",
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 8)
  ].join("-");
}

async function saveActiveRoutineExercises(
  nextExercises,
  logMessage
) {
  const orderedExercises =
    nextExercises.map(
      (exercise, index) =>
        normalizeRoutineExercise(
          activeRoutine.id,
          {
            ...exercise,
            order: index
          },
          index
        )
    );

  const routineDocument =
    doc(
      db,
      "users",
      activeRoutine.userId,
      "routines",
      activeRoutine.id
    );

  await setDoc(
    routineDocument,
    {
      userId:
        activeRoutine.userId,
      schemaVersion:
        ROUTINE_SCHEMA_VERSION,
      exercises:
        orderedExercises,
      updatedAt:
        serverTimestamp()
    },
    {
      merge: true
    }
  );

  activeRoutine = {
    ...activeRoutine,
    exercises:
      orderedExercises
  };

  workout.replaceExercises(
    orderedExercises,
    false
  );

  workout.resetWorkout();
  workout.saveState();

  emitRoutineReady();

  console.info(
    `[JYM Log] ${logMessage}`
  );

  return orderedExercises;
}

async function updateActiveRoutineExercise(
  exerciseIndex,
  exerciseInput
) {
  assertRoutineCanChange();

  const currentExercise =
    activeRoutine.exercises[
      exerciseIndex
    ];

  if (!currentExercise) {
    throw new Error(
      "수정할 운동을 찾을 수 없습니다."
    );
  }

  const updatedExercise =
    validateExerciseInput(
      currentExercise,
      exerciseInput,
      exerciseIndex
    );

  const nextExercises =
    activeRoutine.exercises.map(
      (exercise, index) =>
        index === exerciseIndex
          ? updatedExercise
          : exercise
    );

  await saveActiveRoutineExercises(
    nextExercises,
    "운동 설정 저장 완료"
  );

  return updatedExercise;
}

async function applyActiveRoutineProgressionTransition(
  exerciseIndex,
  transitionInput = {}
) {
  assertRoutineCanChange();

  const currentExercise =
    activeRoutine.exercises[
      exerciseIndex
    ];

  if (!currentExercise) {
    throw new Error(
      "진행할 운동을 찾을 수 없습니다."
    );
  }

  if (
    transitionInput.routineExerciseId &&
    transitionInput.routineExerciseId !==
      currentExercise.routineExerciseId
  ) {
    throw new Error(
      "추천 대상 운동이 현재 루틴과 일치하지 않습니다."
    );
  }

  const policy =
    currentExercise.progressionPolicy;
  const state =
    currentExercise.progressionState;
  const target =
    progressionPolicy.getCurrentTarget(
      currentExercise,
      policy,
      state
    );

  const expectedWeight =
    Number(
      transitionInput.currentWeight
    );

  if (
    Number.isFinite(expectedWeight) &&
    Math.abs(
      expectedWeight -
      Number(currentExercise.weight)
    ) > 0.0001
  ) {
    throw new Error(
      "추천 계산 후 목표 중량이 변경되었습니다."
    );
  }

  const expectedStageIndex =
    Number(
      transitionInput.currentStageIndex
    );

  if (
    Number.isInteger(expectedStageIndex) &&
    expectedStageIndex !==
      target.stageIndex
  ) {
    throw new Error(
      "추천 계산 후 반복 단계가 변경되었습니다."
    );
  }

  let nextWeight =
    Number(currentExercise.weight);
  let nextState;

  if (
    transitionInput.action ===
    "advance-stage"
  ) {
    if (
      policy.strategy !== "stage" ||
      target.stageIndex >=
        policy.stages.length - 1
    ) {
      throw new Error(
        "현재 운동은 다음 반복 단계로 이동할 수 없습니다."
      );
    }

    nextState = {
      currentStageIndex:
        target.stageIndex + 1,
      successStreak: 0,
      failureStreak: 0
    };
  } else if (
    transitionInput.action ===
    "increase"
  ) {
    if (
      policy.strategy === "manual" ||
      (
        policy.strategy === "stage" &&
        target.stageIndex <
          policy.stages.length - 1
      )
    ) {
      throw new Error(
        "현재 반복 단계에서는 중량을 증가할 수 없습니다."
      );
    }

    nextWeight = Math.round(
      (
        Number(currentExercise.weight) +
        Number(currentExercise.increment)
      ) * 100
    ) / 100;

    nextState = {
      currentStageIndex:
        policy.resetStageIndex,
      successStreak: 0,
      failureStreak: 0
    };
  } else {
    throw new Error(
      "적용할 수 없는 진행 추천입니다."
    );
  }

  if (
    Number.isFinite(
      Number(transitionInput.nextWeight)
    ) &&
    Math.abs(
      Number(transitionInput.nextWeight) -
      nextWeight
    ) > 0.0001
  ) {
    throw new Error(
      "추천 중량과 현재 루틴 규칙이 일치하지 않습니다."
    );
  }

  if (
    Number.isInteger(
      Number(
        transitionInput.nextStageIndex
      )
    ) &&
    Number(
      transitionInput.nextStageIndex
    ) !== nextState.currentStageIndex
  ) {
    throw new Error(
      "추천 단계와 현재 루틴 규칙이 일치하지 않습니다."
    );
  }

  const updatedExercise =
    normalizeRoutineExercise(
      activeRoutine.id,
      {
        ...currentExercise,
        weight: nextWeight,
        progressionState:
          nextState
      },
      exerciseIndex
    );

  const nextExercises =
    activeRoutine.exercises.map(
      (exercise, index) =>
        index === exerciseIndex
          ? updatedExercise
          : exercise
    );

  await saveActiveRoutineExercises(
    nextExercises,
    transitionInput.action ===
      "advance-stage"
      ? "반복 단계 적용 완료"
      : "추천 중량 적용 완료"
  );

  return updatedExercise;
}

async function addActiveRoutineExercise(
  exerciseInput
) {
  assertRoutineCanChange();

  if (
    activeRoutine.exercises.length >= 30
  ) {
    throw new Error(
      "하나의 루틴에는 운동을 최대 30개까지 추가할 수 있습니다."
    );
  }

  const exerciseIndex =
    activeRoutine.exercises.length;

  const exerciseDraft = {
    id: createExerciseId(),
    order: exerciseIndex,
    name: "새 운동",
    icon: "",
    type: "반복 범위형",
    weight: 0,
    sets: 3,
    min: 8,
    max: 12,
    rest: 90,
    increment: 2.5,
    previous:
      "이전 기록 없음"
  };

  const newExercise =
    validateExerciseInput(
      exerciseDraft,
      exerciseInput,
      exerciseIndex
    );

  const nextExercises = [
    ...activeRoutine.exercises,
    newExercise
  ];

  await saveActiveRoutineExercises(
    nextExercises,
    "새 운동 추가 완료"
  );

  return newExercise;
}

async function deleteActiveRoutineExercise(
  exerciseIndex
) {
  assertRoutineCanChange();

  if (
    activeRoutine.exercises.length <= 1
  ) {
    throw new Error(
      "루틴에는 최소 1개의 운동이 필요합니다."
    );
  }

  const deletedExercise =
    activeRoutine.exercises[
      exerciseIndex
    ];

  if (!deletedExercise) {
    throw new Error(
      "삭제할 운동을 찾을 수 없습니다."
    );
  }

  const nextExercises =
    activeRoutine.exercises.filter(
      (_, index) =>
        index !== exerciseIndex
    );

  await saveActiveRoutineExercises(
    nextExercises,
    "운동 삭제 완료"
  );

  return deletedExercise;
}

async function reorderActiveRoutineExercises(
  sourceIndex,
  targetIndex
) {
  assertRoutineCanChange();

  const exerciseCount =
    activeRoutine.exercises.length;

  if (
    !Number.isInteger(sourceIndex) ||
    !Number.isInteger(targetIndex) ||
    sourceIndex < 0 ||
    targetIndex < 0 ||
    sourceIndex >= exerciseCount ||
    targetIndex >= exerciseCount
  ) {
    throw new Error(
      "변경할 운동 순서를 확인할 수 없습니다."
    );
  }

  if (sourceIndex === targetIndex) {
    return activeRoutine.exercises;
  }

  const nextExercises = [
    ...activeRoutine.exercises
  ];

  const [movedExercise] =
    nextExercises.splice(
      sourceIndex,
      1
    );

  nextExercises.splice(
    targetIndex,
    0,
    movedExercise
  );

  await saveActiveRoutineExercises(
    nextExercises,
    "운동 순서 저장 완료"
  );

  return nextExercises;
}

async function moveActiveRoutineExercise(
  exerciseIndex,
  direction
) {
  assertRoutineCanChange();

  const movement =
    direction === "up"
      ? -1
      : direction === "down"
        ? 1
        : 0;

  if (movement === 0) {
    throw new Error(
      "운동 이동 방향이 올바르지 않습니다."
    );
  }

  const targetIndex =
    exerciseIndex + movement;

  if (
    targetIndex < 0 ||
    targetIndex >=
      activeRoutine.exercises.length
  ) {
    return activeRoutine.exercises;
  }

  return reorderActiveRoutineExercises(
    exerciseIndex,
    targetIndex
  );
}

window.JYMLog.routines =
  Object.freeze({
    ensureActiveRoutine,
    updateActiveRoutineMetadata,
    updateActiveRoutineExercise,
    applyActiveRoutineProgressionTransition,
    addActiveRoutineExercise,
    deleteActiveRoutineExercise,
    reorderActiveRoutineExercises,
    moveActiveRoutineExercise,
    get activeRoutine() {
      return activeRoutine;
    }
  });

export {
  ensureActiveRoutine,
  updateActiveRoutineMetadata,
  updateActiveRoutineExercise,
  applyActiveRoutineProgressionTransition,
  addActiveRoutineExercise,
  deleteActiveRoutineExercise,
  reorderActiveRoutineExercises,
  moveActiveRoutineExercise
};
