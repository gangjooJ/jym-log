(() => {
  window.JYMLog = window.JYMLog || {};

  const policyApi =
    window.JYMLog.progressionPolicy;

  if (!policyApi) {
    throw new Error(
      "진행 정책 모듈을 불러오지 못했습니다."
    );
  }

  const LEGACY_REQUIRED_SUCCESSES = 2;

  function toFiniteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function normalizeName(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function formatNumber(value) {
    const number = toFiniteNumber(value);
    return Number.isInteger(number)
      ? String(number)
      : String(Math.round(number * 100) / 100);
  }

  function arraysEqual(first, second) {
    if (
      !Array.isArray(first) ||
      !Array.isArray(second) ||
      first.length !== second.length
    ) {
      return false;
    }

    return first.every(
      (value, index) =>
        Number(value) === Number(second[index])
    );
  }

  function formatTarget(target) {
    const successTargets =
      Array.isArray(target?.successSetTargets)
        ? target.successSetTargets
        : [];

    const uniform =
      successTargets.length > 0 &&
      successTargets.every(
        (value) =>
          Number(value) ===
          Number(successTargets[0])
      );

    if (
      target?.strategy === "rep-range"
    ) {
      return (
        `${formatNumber(target.weight)}kg · ` +
        `${target.setCount} × ` +
        `${target.minReps}–${target.maxReps}`
      );
    }

    if (uniform) {
      return (
        `${formatNumber(target.weight)}kg · ` +
        `${target.setCount} × ${successTargets[0]}`
      );
    }

    return (
      `${formatNumber(target?.weight)}kg · ` +
      successTargets.join(" / ")
    );
  }

  function buildExerciseModel(
    exercise,
    exerciseIndex = 0
  ) {
    const routineId =
      exercise?.routineId ||
      window.JYMLog.routines
        ?.activeRoutine?.id ||
      "main";

    const normalizedExercise =
      policyApi.normalizeRoutineExercise(
        exercise,
        {
          routineId,
          index: exerciseIndex
        }
      );

    return {
      exercise: normalizedExercise,
      exerciseId: normalizedExercise.id,
      routineExerciseId:
        normalizedExercise.routineExerciseId,
      exerciseName:
        normalizedExercise.name,
      normalizedName:
        normalizeName(
          normalizedExercise.name
        ),
      policy:
        normalizedExercise.progressionPolicy,
      progressionState:
        normalizedExercise.progressionState,
      target:
        policyApi.getCurrentTarget(
          normalizedExercise,
          normalizedExercise
            .progressionPolicy,
          normalizedExercise
            .progressionState
        ),
      increment:
        normalizedExercise.increment
    };
  }

  function buildSessionModel(
    exerciseResult,
    fallbackExercise,
    exerciseIndex = 0
  ) {
    const snapshot =
      exerciseResult
        ?.progressionSnapshot;

    if (
      snapshot?.policy &&
      snapshot?.target
    ) {
      const fallbackModel =
        buildExerciseModel(
          fallbackExercise || {},
          exerciseIndex
        );

      const exercise = {
        ...fallbackModel.exercise,
        id:
          snapshot.exerciseId ||
          exerciseResult?.exerciseId ||
          fallbackModel.exercise.id,
        routineId:
          snapshot.routineId ||
          fallbackModel.exercise.routineId,
        routineExerciseId:
          snapshot.routineExerciseId ||
          exerciseResult?.routineExerciseId ||
          fallbackModel.exercise
            .routineExerciseId,
        name:
          exerciseResult?.name ||
          fallbackModel.exercise.name,
        weight:
          toFiniteNumber(
            snapshot.target.weight,
            fallbackModel.exercise.weight
          ),
        increment:
          toFiniteNumber(
            snapshot.increment,
            fallbackModel.increment
          ),
        sets:
          snapshot.target.setCount,
        min:
          snapshot.target.minReps,
        max:
          snapshot.target.maxReps,
        progressionPolicy:
          snapshot.policy,
        progressionState:
          snapshot.state
      };

      return {
        exercise,
        exerciseId:
          String(exercise.id || ""),
        routineExerciseId:
          String(
            exercise.routineExerciseId || ""
          ),
        exerciseName:
          String(exercise.name || "운동"),
        normalizedName:
          normalizeName(exercise.name),
        policy:
          policyApi.normalizePolicy(
            exercise,
            snapshot.policy
          ),
        progressionState:
          policyApi.normalizeState(
            snapshot.policy,
            snapshot.state
          ),
        target: {
          ...snapshot.target,
          inputSetTargets:
            policyApi.normalizeSetTargets(
              snapshot.target
                .inputSetTargets ??
              exerciseResult?.target
                ?.setTargets,
              [snapshot.target.minReps || 1]
            ),
          successSetTargets:
            policyApi.normalizeSetTargets(
              snapshot.target
                .successSetTargets ??
              exerciseResult?.target
                ?.successSetTargets,
              [snapshot.target.maxReps || 1]
            )
        },
        increment:
          toFiniteNumber(
            snapshot.increment,
            fallbackModel.increment
          )
      };
    }

    const target =
      exerciseResult?.target || {};

    const legacyExercise = {
      ...(fallbackExercise || {}),
      id:
        exerciseResult?.exerciseId ||
        fallbackExercise?.id ||
        `exercise-${exerciseIndex + 1}`,
      routineExerciseId:
        exerciseResult?.routineExerciseId ||
        fallbackExercise?.routineExerciseId,
      name:
        exerciseResult?.name ||
        fallbackExercise?.name ||
        "운동",
      type:
        exerciseResult?.type ||
        fallbackExercise?.type ||
        "반복 범위형",
      weight:
        toFiniteNumber(
          target.weight,
          exerciseResult?.sets?.[0]
            ?.weight
        ),
      sets:
        target.sets ||
        exerciseResult?.sets?.length ||
        1,
      min:
        target.minReps || 1,
      max:
        target.maxReps ||
        target.minReps || 1,
      increment:
        fallbackExercise?.increment ||
        2.5
    };

    return buildExerciseModel(
      legacyExercise,
      exerciseIndex
    );
  }

  function isSameTarget(first, second) {
    if (!first || !second) {
      return false;
    }

    if (
      first.routineExerciseId &&
      second.routineExerciseId &&
      first.routineExerciseId !==
        second.routineExerciseId
    ) {
      return false;
    }

    return (
      Number(first.target.weight) ===
        Number(second.target.weight) &&
      first.target.strategy ===
        second.target.strategy &&
      Number(first.target.stageIndex) ===
        Number(second.target.stageIndex) &&
      first.policy.requiredSuccesses ===
        second.policy.requiredSuccesses &&
      arraysEqual(
        first.target.successSetTargets,
        second.target.successSetTargets
      )
    );
  }

  function findSessionExercise(
    session,
    exercise,
    exerciseIndex
  ) {
    const results =
      Array.isArray(session?.exercises)
        ? session.exercises
        : [];

    const routineExerciseId =
      String(
        exercise?.routineExerciseId || ""
      );

    if (routineExerciseId) {
      const match = results.find(
        (result) =>
          String(
            result?.routineExerciseId ||
            result?.progressionSnapshot
              ?.routineExerciseId ||
            ""
          ) === routineExerciseId
      );

      if (match) {
        return match;
      }
    }

    const exerciseId =
      String(exercise?.id || "");

    if (exerciseId) {
      const match = results.find(
        (result) =>
          String(result?.exerciseId || "") ===
          exerciseId
      );

      if (match) {
        return match;
      }
    }

    const normalizedName =
      normalizeName(exercise?.name);

    if (normalizedName) {
      const match = results.find(
        (result) =>
          normalizeName(result?.name) ===
          normalizedName
      );

      if (match) {
        return match;
      }
    }

    return results.find(
      (result) =>
        Number(result?.exerciseIndex) ===
        exerciseIndex
    ) || null;
  }

  function getCurrentExerciseSets(
    state,
    exerciseIndex,
    setCount
  ) {
    return Array.from(
      { length: setCount },
      (_, setIndex) =>
        state?.sets?.[
          `${exerciseIndex}-${setIndex}`
        ] || null
    );
  }

  function countPreviousSuccesses({
    exercise,
    exerciseIndex,
    state,
    sessions,
    currentModel
  }) {
    let successCount = 0;
    const currentStartedAt =
      toFiniteNumber(state?.startedAt);

    const orderedSessions =
      [...(
        Array.isArray(sessions)
          ? sessions
          : []
      )].sort(
        (first, second) =>
          toFiniteNumber(
            second?.completedAtMillis
          ) -
          toFiniteNumber(
            first?.completedAtMillis
          )
      );

    for (const session of orderedSessions) {
      if (
        currentStartedAt > 0 &&
        toFiniteNumber(
          session?.startedAtMillis
        ) === currentStartedAt
      ) {
        continue;
      }

      const result = findSessionExercise(
        session,
        exercise,
        exerciseIndex
      );

      if (!result) {
        continue;
      }

      const sessionModel =
        buildSessionModel(
          result,
          exercise,
          exerciseIndex
        );

      if (!isSameTarget(sessionModel, currentModel)) {
        break;
      }

      const evaluation =
        policyApi.evaluateSets(
          result.sets,
          sessionModel.target,
          sessionModel.target.weight
        );

      if (!evaluation.success) {
        break;
      }

      successCount += 1;
    }

    return successCount;
  }

  function getFailureReason(evaluation) {
    const unfinishedCount =
      evaluation.missingSets +
      evaluation.incompleteSets;

    if (unfinishedCount > 0) {
      return `${unfinishedCount}개 세트가 미완료여서 현재 목표 재도전을 추천합니다.`;
    }

    if (evaluation.belowWeightSets > 0) {
      return `${evaluation.belowWeightSets}개 세트가 목표 중량보다 낮아 현재 목표 재도전을 추천합니다.`;
    }

    if (evaluation.belowRepSets > 0) {
      return `${evaluation.belowRepSets}개 세트가 목표 반복 수에 미달해 현재 목표 재도전을 추천합니다.`;
    }

    return "모든 목표 세트를 달성하지 않아 현재 목표 재도전을 추천합니다.";
  }

  function createBaseResult({
    model,
    exerciseIndex,
    currentSessionSaved,
    successStreak,
    action,
    success,
    nextWeight,
    nextTarget,
    nextState,
    text,
    reason,
    incrementReason
  }) {
    return {
      action,
      success,
      exerciseIndex,
      exerciseId: model.exerciseId,
      routineExerciseId:
        model.routineExerciseId,
      exerciseName:
        model.exerciseName,
      strategy:
        model.policy.strategy,
      currentSessionSaved:
        Boolean(currentSessionSaved),
      successStreak,
      requiredSuccesses:
        model.policy.requiredSuccesses,
      currentWeight:
        model.target.weight,
      nextWeight,
      increment: model.increment,
      currentStageIndex:
        model.target.stageIndex,
      nextStageIndex:
        nextTarget.stageIndex,
      currentSetTargets:
        [...model.target.successSetTargets],
      nextSetTargets:
        [...nextTarget.successSetTargets],
      nextProgressionState:
        nextState,
      text,
      reason,
      incrementReason
    };
  }

  function buildRecommendation({
    exercise,
    exerciseIndex = 0,
    state,
    sessions = [],
    historyAvailable = true,
    currentExerciseResult = null,
    currentSessionSaved = false
  }) {
    const model = currentExerciseResult
      ? buildSessionModel(
          currentExerciseResult,
          exercise,
          exerciseIndex
        )
      : buildExerciseModel(
          exercise,
          exerciseIndex
        );

    const currentSets = currentExerciseResult
      ? currentExerciseResult.sets
      : getCurrentExerciseSets(
          state,
          exerciseIndex,
          model.target.setCount
        );

    const evaluation =
      policyApi.evaluateSets(
        currentSets,
        model.target,
        model.target.weight
      );

    const previousSuccesses =
      evaluation.success && historyAvailable
        ? countPreviousSuccesses({
            exercise: model.exercise,
            exerciseIndex,
            state,
            sessions,
            currentModel: model
          })
        : 0;

    const successStreak =
      evaluation.success
        ? previousSuccesses + 1
        : 0;

    const transition =
      policyApi.getTransition({
        exercise: model.exercise,
        policy: model.policy,
        state: {
          ...model.progressionState,
          successStreak:
            previousSuccesses
        },
        success: evaluation.success
      });

    const currentTargetText =
      formatTarget(model.target);
    const nextTargetText =
      formatTarget(transition.nextTarget);
    const incrementText =
      `${formatNumber(model.increment)}kg`;

    if (transition.action === "increase") {
      return createBaseResult({
        model,
        exerciseIndex,
        currentSessionSaved,
        successStreak,
        action: "increase",
        success: true,
        nextWeight:
          transition.nextWeight,
        nextTarget:
          transition.nextTarget,
        nextState:
          transition.nextState,
        text:
          `${nextTargetText} 증량 추천`,
        reason:
          `${currentTargetText} 목표를 ${successStreak}회 연속 달성했습니다.`,
        incrementReason:
          `설정된 증량 단위 ${incrementText}을 반영했습니다.`
      });
    }

    if (transition.action === "advance-stage") {
      return createBaseResult({
        model,
        exerciseIndex,
        currentSessionSaved,
        successStreak,
        action: "advance-stage",
        success: true,
        nextWeight:
          transition.nextWeight,
        nextTarget:
          transition.nextTarget,
        nextState:
          transition.nextState,
        text:
          `${nextTargetText} 다음 단계`,
        reason:
          `${currentTargetText} 목표를 달성해 다음 반복 단계로 이동할 수 있습니다.`,
        incrementReason:
          "최종 단계를 완료하면 설정된 중량만큼 증량합니다."
      });
    }

    if (transition.action === "manual") {
      return createBaseResult({
        model,
        exerciseIndex,
        currentSessionSaved,
        successStreak,
        action: "manual",
        success: evaluation.success,
        nextWeight:
          model.target.weight,
        nextTarget:
          model.target,
        nextState:
          transition.nextState,
        text:
          `${currentTargetText} 수동 관리`,
        reason:
          "이 운동은 자동 진행 추천을 사용하지 않습니다.",
        incrementReason:
          "완료 기록은 진행 이력에 계속 보존됩니다."
      });
    }

    if (transition.action === "repeat") {
      return createBaseResult({
        model,
        exerciseIndex,
        currentSessionSaved,
        successStreak,
        action: "repeat",
        success: true,
        nextWeight:
          model.target.weight,
        nextTarget:
          model.target,
        nextState:
          transition.nextState,
        text:
          `${currentTargetText} 한 번 더`,
        reason:
          historyAvailable
            ? `${currentTargetText} 목표를 ${successStreak}회 달성했습니다. ${model.policy.requiredSuccesses}회 연속 성공 시 다음 단계로 진행합니다.`
            : "이번 목표 달성은 확인했지만 이전 기록을 불러오지 못해 현재 목표 1회 추가 수행을 추천합니다.",
        incrementReason:
          `다음 증량 단위는 ${incrementText}입니다.`
      });
    }

    return createBaseResult({
      model,
      exerciseIndex,
      currentSessionSaved,
      successStreak: 0,
      action: "maintain",
      success: false,
      nextWeight:
        model.target.weight,
      nextTarget:
        model.target,
      nextState:
        transition.nextState,
      text:
        `${currentTargetText} 유지`,
      reason:
        getFailureReason(evaluation),
      incrementReason:
        `다음 증량 단위는 ${incrementText}입니다.`
    });
  }

  function findCurrentSession(sessions, state) {
    const currentStartedAt =
      toFiniteNumber(state?.startedAt);

    if (currentStartedAt <= 0) {
      return null;
    }

    return (
      Array.isArray(sessions)
        ? sessions
        : []
    ).find(
      (session) =>
        toFiniteNumber(
          session?.startedAtMillis
        ) === currentStartedAt
    ) || null;
  }

  function buildRecommendations({
    exercises = [],
    state,
    sessions = [],
    historyAvailable = true,
    currentSession = null
  }) {
    return (
      Array.isArray(exercises)
        ? exercises
        : []
    ).map(
      (exercise, exerciseIndex) => {
        const currentExerciseResult =
          currentSession
            ? findSessionExercise(
                currentSession,
                exercise,
                exerciseIndex
              )
            : null;

        return buildRecommendation({
          exercise,
          exerciseIndex,
          state,
          sessions,
          historyAvailable,
          currentExerciseResult,
          currentSessionSaved:
            Boolean(currentExerciseResult)
        });
      }
    );
  }

  async function loadRecommendations({
    exercises = [],
    state,
    maxSessions = 50
  }) {
    const historyApi =
      window.JYMLog.history;

    if (!historyApi?.loadRecentWorkoutSessions) {
      return buildRecommendations({
        exercises,
        state,
        sessions: [],
        historyAvailable: false,
        currentSession: null
      });
    }

    try {
      const sessions =
        await historyApi
          .loadRecentWorkoutSessions(
            maxSessions
          );

      return buildRecommendations({
        exercises,
        state,
        sessions,
        historyAvailable: true,
        currentSession:
          findCurrentSession(
            sessions,
            state
          )
      });
    } catch (error) {
      console.warn(
        "[JYM Log] 이전 운동 기록을 불러오지 못해 루틴 전체를 보수적으로 추천합니다.",
        error
      );

      return buildRecommendations({
        exercises,
        state,
        sessions: [],
        historyAvailable: false,
        currentSession: null
      });
    }
  }

  async function loadRecommendation({
    exercise,
    exerciseIndex = 0,
    state,
    maxSessions = 50
  }) {
    const recommendations =
      await loadRecommendations({
        exercises: [exercise],
        state,
        maxSessions
      });

    return recommendations[0] || null;
  }

  window.JYMLog.progressionEngine =
    Object.freeze({
      requiredConsecutiveSuccesses:
        LEGACY_REQUIRED_SUCCESSES,
      buildRecommendation,
      buildRecommendations,
      loadRecommendation,
      loadRecommendations
    });
})();
