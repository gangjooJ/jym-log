(() => {
  window.JYMLog = window.JYMLog || {};

  const POLICY_SCHEMA_VERSION = 1;

  const STRATEGIES = Object.freeze({
    LOAD: "load",
    REP_RANGE: "rep-range",
    STAGE: "stage",
    MANUAL: "manual"
  });

  const VALID_STRATEGIES = new Set(
    Object.values(STRATEGIES)
  );

  function cloneValue(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function toFiniteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function toPositiveInteger(value, fallback = 1) {
    return Math.max(
      1,
      Math.round(toFiniteNumber(value, fallback))
    );
  }

  function clampInteger(value, minimum, maximum, fallback) {
    return Math.min(
      maximum,
      Math.max(
        minimum,
        Math.round(toFiniteNumber(value, fallback))
      )
    );
  }

  function normalizeIdentifier(value, fallback) {
    const identifier = String(value || "").trim();
    return identifier || fallback;
  }

  function buildRepeatedTargets(setCount, reps) {
    return Array.from(
      { length: toPositiveInteger(setCount, 1) },
      () => toPositiveInteger(reps, 1)
    );
  }

  function normalizeSetTargets(value, fallbackTargets) {
    const fallback = Array.isArray(fallbackTargets) && fallbackTargets.length > 0
      ? fallbackTargets.map((target) => toPositiveInteger(target, 1))
      : [1];

    if (!Array.isArray(value) || value.length === 0) {
      return [...fallback];
    }

    return value.map((target, index) =>
      toPositiveInteger(target, fallback[index] || fallback[fallback.length - 1] || 1)
    );
  }

  function inferStrategy(exercise, inputPolicy = {}) {
    const requested = String(inputPolicy?.strategy || "").trim();

    if (VALID_STRATEGIES.has(requested)) {
      return requested;
    }

    if (inputPolicy?.enabled === false) {
      return STRATEGIES.MANUAL;
    }

    if (exercise?.type === "반복 단계형") {
      return STRATEGIES.STAGE;
    }

    if (exercise?.type === "수동 관리형") {
      return STRATEGIES.MANUAL;
    }

    const minReps = toPositiveInteger(exercise?.min, 1);
    const maxReps = Math.max(
      minReps,
      toPositiveInteger(exercise?.max, minReps)
    );

    return (
      exercise?.type === "고정 반복형" ||
      minReps === maxReps
    )
      ? STRATEGIES.LOAD
      : STRATEGIES.REP_RANGE;
  }

  function normalizeStage(stage, index, fallbackTargets) {
    const setTargets = normalizeSetTargets(
      stage?.setTargets ?? stage?.reps,
      fallbackTargets
    );

    return {
      id: normalizeIdentifier(stage?.id, `stage-${index + 1}`),
      label: String(stage?.label || `${index + 1}단계`).trim() || `${index + 1}단계`,
      setTargets
    };
  }

  function normalizePolicy(exercise, inputPolicy = exercise?.progressionPolicy) {
    const source = inputPolicy && typeof inputPolicy === "object"
      ? inputPolicy
      : {};

    const strategy = inferStrategy(exercise, source);
    const setCount = toPositiveInteger(exercise?.sets, 1);
    const minReps = toPositiveInteger(exercise?.min, 1);
    const maxReps = Math.max(
      minReps,
      toPositiveInteger(exercise?.max, minReps)
    );

    const fixedFallback = buildRepeatedTargets(setCount, maxReps);
    const stageFallback = buildRepeatedTargets(setCount, minReps);

    let stages;

    if (
      strategy === STRATEGIES.STAGE &&
      Array.isArray(source.stages) &&
      source.stages.length > 0
    ) {
      stages = source.stages.map((stage, index) =>
        normalizeStage(stage, index, stageFallback)
      );
    } else {
      stages = [
        normalizeStage(
          source.stages?.[0],
          0,
          fixedFallback
        )
      ];
    }

    const defaultRequiredSuccesses =
      strategy === STRATEGIES.STAGE ? 1 : 2;

    return {
      schemaVersion: POLICY_SCHEMA_VERSION,
      strategy,
      enabled:
        strategy !== STRATEGIES.MANUAL &&
        source.enabled !== false,
      requiredSuccesses: clampInteger(
        source.requiredSuccesses,
        1,
        10,
        defaultRequiredSuccesses
      ),
      stages,
      stageSuccessAction:
        strategy === STRATEGIES.STAGE
          ? "advance-stage"
          : "repeat",
      finalStageAction:
        strategy === STRATEGIES.MANUAL
          ? "manual"
          : "increase-load",
      failureAction: "hold",
      resetStageIndex: clampInteger(
        source.resetStageIndex,
        0,
        Math.max(0, stages.length - 1),
        0
      )
    };
  }

  function normalizeState(policy, inputState = {}) {
    const stageCount = Math.max(1, policy?.stages?.length || 1);

    return {
      currentStageIndex: clampInteger(
        inputState?.currentStageIndex,
        0,
        stageCount - 1,
        0
      ),
      successStreak: Math.max(
        0,
        Math.round(toFiniteNumber(inputState?.successStreak, 0))
      ),
      failureStreak: Math.max(
        0,
        Math.round(toFiniteNumber(inputState?.failureStreak, 0))
      )
    };
  }

  function createRoutineExerciseId(routineId, exerciseId, index = 0) {
    const normalizedRoutineId = normalizeIdentifier(routineId, "main");
    const normalizedExerciseId = normalizeIdentifier(
      exerciseId,
      `exercise-${index + 1}`
    );

    return `${normalizedRoutineId}::${normalizedExerciseId}`;
  }

  function getCurrentTarget(exercise, policyInput, stateInput) {
    const policy = normalizePolicy(exercise, policyInput);
    const state = normalizeState(policy, stateInput ?? exercise?.progressionState);
    const stage = policy.stages[state.currentStageIndex] || policy.stages[0];

    const setCount = Math.max(
      1,
      stage?.setTargets?.length || toPositiveInteger(exercise?.sets, 1)
    );

    const minReps = toPositiveInteger(exercise?.min, 1);
    const maxReps = Math.max(
      minReps,
      toPositiveInteger(exercise?.max, minReps)
    );

    const successSetTargets = normalizeSetTargets(
      stage?.setTargets,
      buildRepeatedTargets(setCount, maxReps)
    );

    const inputSetTargets =
      policy.strategy === STRATEGIES.REP_RANGE ||
      policy.strategy === STRATEGIES.MANUAL
        ? buildRepeatedTargets(setCount, minReps)
        : [...successSetTargets];

    return {
      strategy: policy.strategy,
      stageId: stage?.id || "stage-1",
      stageLabel: stage?.label || "1단계",
      stageIndex: state.currentStageIndex,
      stageCount: policy.stages.length,
      weight: Math.max(0, toFiniteNumber(exercise?.weight, 0)),
      setCount,
      inputSetTargets,
      successSetTargets,
      minReps: Math.min(...inputSetTargets, ...successSetTargets),
      maxReps: Math.max(...inputSetTargets, ...successSetTargets)
    };
  }

  function normalizeRoutineExercise(exercise, options = {}) {
    const index = Math.max(0, Math.round(toFiniteNumber(options.index, exercise?.order || 0)));
    const id = normalizeIdentifier(exercise?.id, `exercise-${index + 1}`);

        const catalog =
      window.JYMLog
        .exerciseCatalog;

    const requestedTemplateId =
      String(
        exercise?.templateId ||
        ""
      ).trim();

    const templateId =
      catalog
        ?.normalizeTemplateId?.(
          requestedTemplateId
        ) ||
      "";

    const template =
      templateId
        ? catalog
            ?.getTemplateById?.(
              templateId
            )
        : null;

    const equipment =
      catalog
        ?.normalizeEquipment?.(
          exercise?.equipment
        ) ||
      "other";

    const primaryBodyPart =
      catalog
        ?.normalizeBodyPart?.(
          exercise
            ?.primaryBodyPart ||
          template
            ?.primaryBodyPart
        ) ||
      "other";

    const requestedSource =
      String(
        exercise?.source ||
        ""
      ).trim();

    const source =
      templateId
        ? "builtin"
        : requestedSource ===
            "custom"
          ? "custom"
          : "legacy";

    const routineId = normalizeIdentifier(
      exercise?.routineId || options.routineId,
      "main"
    );

        const name =
      String(
        exercise?.name ||
        template?.name ||
        `운동 ${index + 1}`
      ).trim() ||
      `운동 ${index + 1}`;
    const minReps = toPositiveInteger(exercise?.min, 1);
    const maxReps = Math.max(
      minReps,
      toPositiveInteger(exercise?.max, minReps)
    );
    const increment = toFiniteNumber(exercise?.increment, 2.5);

    const baseExercise = {
      ...cloneValue(exercise || {}),
      id,
      routineId,
      routineExerciseId: normalizeIdentifier(
        exercise?.routineExerciseId,
        createRoutineExerciseId(routineId, id, index)
      ),
      templateId,
      equipment,
      primaryBodyPart,
      source,
      order: index,
      name,
      icon: String(exercise?.icon || name.charAt(0) || "E").slice(0, 2),
      type: String(
        exercise?.type ||
        (minReps === maxReps ? "고정 반복형" : "반복 범위형")
      ),
      weight: Math.max(0, toFiniteNumber(exercise?.weight, 0)),
      sets: toPositiveInteger(exercise?.sets, 1),
      min: minReps,
      max: maxReps,
      previous: String(exercise?.previous || "이전 기록 없음"),
      rest: Math.max(0, Math.round(toFiniteNumber(exercise?.rest, 0))),
      increment:
        Number.isFinite(increment) && increment > 0
          ? increment
          : 2.5
    };

    const progressionPolicy = normalizePolicy(
      baseExercise,
      exercise?.progressionPolicy
    );
    const progressionState = normalizeState(
      progressionPolicy,
      exercise?.progressionState
    );
    const target = getCurrentTarget(
      baseExercise,
      progressionPolicy,
      progressionState
    );

    return {
      ...baseExercise,
      sets: target.setCount,
      min: target.minReps,
      max: target.maxReps,
      progressionPolicy,
      progressionState,
      setTargets: [...target.inputSetTargets],
      successSetTargets: [...target.successSetTargets]
    };
  }

  function evaluateSets(sets, target, minimumWeight = target?.weight) {
    const normalizedSets = Array.isArray(sets) ? sets : [];
    const successTargets = normalizeSetTargets(
      target?.successSetTargets,
      [toPositiveInteger(target?.maxReps, 1)]
    );
    const setCount = Math.max(
      1,
      toPositiveInteger(target?.setCount, successTargets.length)
    );

    let missingSets = 0;
    let incompleteSets = 0;
    let belowWeightSets = 0;
    let belowRepSets = 0;

    for (let setIndex = 0; setIndex < setCount; setIndex += 1) {
      const set = normalizedSets[setIndex];
      const targetReps = successTargets[setIndex] ?? successTargets[successTargets.length - 1];

      if (!set) {
        missingSets += 1;
        continue;
      }

      if (!set.done) {
        incompleteSets += 1;
      }

      if (toFiniteNumber(set.weight, 0) < toFiniteNumber(minimumWeight, 0)) {
        belowWeightSets += 1;
      }

      if (toFiniteNumber(set.reps, 0) < targetReps) {
        belowRepSets += 1;
      }
    }

    return {
      success:
        missingSets === 0 &&
        incompleteSets === 0 &&
        belowWeightSets === 0 &&
        belowRepSets === 0,
      missingSets,
      incompleteSets,
      belowWeightSets,
      belowRepSets
    };
  }

  function getTransition({
    exercise,
    policy: policyInput,
    state: stateInput,
    success
  }) {
    const normalizedExercise = normalizeRoutineExercise(exercise, {
      routineId: exercise?.routineId,
      index: exercise?.order || 0
    });
    const policy = normalizePolicy(normalizedExercise, policyInput);
    const state = normalizeState(policy, stateInput);
    const currentTarget = getCurrentTarget(normalizedExercise, policy, state);

    if (!policy.enabled || policy.strategy === STRATEGIES.MANUAL) {
      return {
        action: "manual",
        currentTarget,
        nextTarget: currentTarget,
        nextWeight: normalizedExercise.weight,
        nextState: state
      };
    }

    if (!success) {
      return {
        action: "maintain",
        currentTarget,
        nextTarget: currentTarget,
        nextWeight: normalizedExercise.weight,
        nextState: {
          ...state,
          successStreak: 0,
          failureStreak: state.failureStreak + 1
        }
      };
    }

    const nextSuccessStreak = state.successStreak + 1;

    if (nextSuccessStreak < policy.requiredSuccesses) {
      return {
        action: "repeat",
        currentTarget,
        nextTarget: currentTarget,
        nextWeight: normalizedExercise.weight,
        nextState: {
          ...state,
          successStreak: nextSuccessStreak,
          failureStreak: 0
        }
      };
    }

    const isFinalStage =
      state.currentStageIndex >= policy.stages.length - 1;

    if (policy.strategy === STRATEGIES.STAGE && !isFinalStage) {
      const nextState = {
        currentStageIndex: state.currentStageIndex + 1,
        successStreak: 0,
        failureStreak: 0
      };

      return {
        action: "advance-stage",
        currentTarget,
        nextTarget: getCurrentTarget(normalizedExercise, policy, nextState),
        nextWeight: normalizedExercise.weight,
        nextState
      };
    }

    const nextWeight = Math.round(
      (normalizedExercise.weight + normalizedExercise.increment) * 100
    ) / 100;
    const nextState = {
      currentStageIndex: policy.resetStageIndex,
      successStreak: 0,
      failureStreak: 0
    };
    const nextExercise = {
      ...normalizedExercise,
      weight: nextWeight
    };

    return {
      action: "increase",
      currentTarget,
      nextTarget: getCurrentTarget(nextExercise, policy, nextState),
      nextWeight,
      nextState
    };
  }

  function createSnapshot(exercise, options = {}) {
    const normalizedExercise = normalizeRoutineExercise(exercise, options);
    const target = getCurrentTarget(
      normalizedExercise,
      normalizedExercise.progressionPolicy,
      normalizedExercise.progressionState
    );

    return {
      schemaVersion: POLICY_SCHEMA_VERSION,
      routineId: normalizedExercise.routineId,
      routineExerciseId: normalizedExercise.routineExerciseId,
      exerciseId: normalizedExercise.id,
      increment: normalizedExercise.increment,
      policy: cloneValue(normalizedExercise.progressionPolicy),
      state: cloneValue(normalizedExercise.progressionState),
      target: cloneValue(target)
    };
  }

  window.JYMLog.progressionPolicy = Object.freeze({
    schemaVersion: POLICY_SCHEMA_VERSION,
    strategies: STRATEGIES,
    buildRepeatedTargets,
    normalizeSetTargets,
    normalizePolicy,
    normalizeState,
    normalizeRoutineExercise,
    createRoutineExerciseId,
    getCurrentTarget,
    evaluateSets,
    getTransition,
    createSnapshot
  });
})();

