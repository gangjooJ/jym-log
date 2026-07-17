(() => {
  window.JYMLog =
    window.JYMLog || {};

  const REQUIRED_CONSECUTIVE_SUCCESSES =
    2;

  function toFiniteNumber(
    value,
    fallback = 0
  ) {
    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : fallback;
  }

  function toPositiveInteger(
    value,
    fallback = 1
  ) {
    return Math.max(
      1,
      Math.round(
        toFiniteNumber(
          value,
          fallback
        )
      )
    );
  }

  function normalizeName(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function formatNumber(value) {
    const number =
      toFiniteNumber(value);

    return Number.isInteger(number)
      ? String(number)
      : String(
          Math.round(number * 100) /
          100
        );
  }

  function formatRepTarget(
    minReps,
    maxReps
  ) {
    return minReps === maxReps
      ? String(maxReps)
      : `${minReps}–${maxReps}`;
  }

  function getExercisePrescription(
    exercise
  ) {
    const minReps =
      toPositiveInteger(
        exercise?.min,
        1
      );

    const maxReps =
      Math.max(
        minReps,
        toPositiveInteger(
          exercise?.max,
          minReps
        )
      );

    const increment =
      toFiniteNumber(
        exercise?.increment,
        2.5
      );

    return {
      exerciseId:
        String(
          exercise?.id || ""
        ),

      name:
        String(
          exercise?.name || "운동"
        ),

      normalizedName:
        normalizeName(
          exercise?.name
        ),

      type:
        String(
          exercise?.type ||
          "반복 범위형"
        ),

      weight:
        Math.max(
          0,
          toFiniteNumber(
            exercise?.weight
          )
        ),

      sets:
        toPositiveInteger(
          exercise?.sets,
          1
        ),

      minReps,
      maxReps,

      increment:
        increment > 0
          ? increment
          : 2.5
    };
  }

  function getSessionPrescription(
    exerciseResult
  ) {
    const target =
      exerciseResult?.target || {};

    const resultSets =
      Array.isArray(
        exerciseResult?.sets
      )
        ? exerciseResult.sets
        : [];

    const minReps =
      toPositiveInteger(
        target.minReps,
        1
      );

    const maxReps =
      Math.max(
        minReps,
        toPositiveInteger(
          target.maxReps,
          minReps
        )
      );

    return {
      exerciseId:
        String(
          exerciseResult
            ?.exerciseId || ""
        ),

      name:
        String(
          exerciseResult?.name ||
          "운동"
        ),

      normalizedName:
        normalizeName(
          exerciseResult?.name
        ),

      type:
        String(
          exerciseResult?.type ||
          "반복 범위형"
        ),

      weight:
        Math.max(
          0,
          toFiniteNumber(
            target.weight,
            resultSets[0]?.weight
          )
        ),

      sets:
        toPositiveInteger(
          target.sets,
          Math.max(
            1,
            resultSets.length
          )
        ),

      minReps,
      maxReps
    };
  }

  function isSamePrescription(
    first,
    second
  ) {
    return (
      first.weight ===
        second.weight &&
      first.sets ===
        second.sets &&
      first.minReps ===
        second.minReps &&
      first.maxReps ===
        second.maxReps &&
      first.type ===
        second.type
    );
  }

  function evaluateSets(
    sets,
    prescription
  ) {
    const normalizedSets =
      Array.isArray(sets)
        ? sets
        : [];

    let missingSets = 0;
    let incompleteSets = 0;
    let belowWeightSets = 0;
    let belowRepSets = 0;

    for (
      let setIndex = 0;
      setIndex <
        prescription.sets;
      setIndex += 1
    ) {
      const set =
        normalizedSets[setIndex];

      if (!set) {
        missingSets += 1;
        continue;
      }

      if (!set.done) {
        incompleteSets += 1;
      }

      if (
        toFiniteNumber(
          set.weight
        ) < prescription.weight
      ) {
        belowWeightSets += 1;
      }

      if (
        toFiniteNumber(
          set.reps
        ) < prescription.maxReps
      ) {
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

  function getCurrentExerciseSets(
    state,
    exerciseIndex,
    setCount
  ) {
    const sets = [];

    for (
      let setIndex = 0;
      setIndex < setCount;
      setIndex += 1
    ) {
      sets.push(
        state?.sets?.[
          `${exerciseIndex}-${setIndex}`
        ] || null
      );
    }

    return sets;
  }

  function findSessionExercise(
    session,
    exercise,
    exerciseIndex
  ) {
    const results =
      Array.isArray(
        session?.exercises
      )
        ? session.exercises
        : [];

    const exerciseId =
      String(
        exercise?.id || ""
      );

    if (exerciseId) {
      const idMatch =
        results.find(
          (result) =>
            String(
              result?.exerciseId ||
              ""
            ) === exerciseId
        );

      if (idMatch) {
        return idMatch;
      }
    }

    const normalizedName =
      normalizeName(
        exercise?.name
      );

    if (normalizedName) {
      const nameMatch =
        results.find(
          (result) =>
            normalizeName(
              result?.name
            ) === normalizedName
        );

      if (nameMatch) {
        return nameMatch;
      }
    }

    return results.find(
      (result) =>
        Number(
          result?.exerciseIndex
        ) === exerciseIndex
    ) || null;
  }

  function countPreviousSuccesses({
    exercise,
    exerciseIndex,
    state,
    sessions,
    prescription
  }) {
    let successCount = 0;

    const currentStartedAt =
      toFiniteNumber(
        state?.startedAt
      );

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

    for (
      const session of orderedSessions
    ) {
      if (
        currentStartedAt > 0 &&
        toFiniteNumber(
          session?.startedAtMillis
        ) === currentStartedAt
      ) {
        continue;
      }

      const exerciseResult =
        findSessionExercise(
          session,
          exercise,
          exerciseIndex
        );

      /*
       * 다른 루틴처럼 해당 운동이 없는
       * 세션은 연속 성공 판정에서 건너뜁니다.
       */
      if (!exerciseResult) {
        continue;
      }

      const sessionPrescription =
        getSessionPrescription(
          exerciseResult
        );

      /*
       * 중량·세트·반복 목표가 달라졌다면
       * 같은 진행 구간으로 보지 않습니다.
       */
      if (
        !isSamePrescription(
          sessionPrescription,
          prescription
        )
      ) {
        break;
      }

      const evaluation =
        evaluateSets(
          exerciseResult.sets,
          sessionPrescription
        );

      if (!evaluation.success) {
        break;
      }

      successCount += 1;
    }

    return successCount;
  }

  function getFailureReason(
    evaluation
  ) {
    const unfinishedCount =
      evaluation.missingSets +
      evaluation.incompleteSets;

    if (unfinishedCount > 0) {
      return `${unfinishedCount}개 세트가 미완료여서 동일 중량 재도전을 추천합니다.`;
    }

    if (
      evaluation.belowWeightSets > 0
    ) {
      return `${evaluation.belowWeightSets}개 세트가 목표 중량보다 낮아 동일 중량 재도전을 추천합니다.`;
    }

    if (
      evaluation.belowRepSets > 0
    ) {
      return `${evaluation.belowRepSets}개 세트가 목표 반복 수에 미달해 동일 중량 재도전을 추천합니다.`;
    }

    return "모든 목표 세트를 달성하지 않아 동일 중량 재도전을 추천합니다.";
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
    const exercisePrescription =
      getExercisePrescription(
        exercise
      );

    /*
     * 완료 세션이 저장된 뒤 루틴 중량이
     * 변경되어도, 완료 당시 목표를 기준으로
     * 추천 결과를 다시 계산합니다.
     */
    const prescription =
      currentExerciseResult
        ? {
            ...getSessionPrescription(
              currentExerciseResult
            ),
            increment:
              exercisePrescription.increment
          }
        : exercisePrescription;

    const currentSets =
      currentExerciseResult
        ? currentExerciseResult.sets
        : getCurrentExerciseSets(
            state,
            exerciseIndex,
            prescription.sets
          );

    const currentEvaluation =
      evaluateSets(
        currentSets,
        prescription
      );

    const previousSuccesses =
      currentEvaluation.success &&
      historyAvailable
        ? countPreviousSuccesses({
            exercise,
            exerciseIndex,
            state,
            sessions,
            prescription
          })
        : 0;

    const successStreak =
      currentEvaluation.success
        ? previousSuccesses + 1
        : 0;

    const repTarget =
      formatRepTarget(
        prescription.minReps,
        prescription.maxReps
      );

    const currentTargetText =
      `${formatNumber(
        prescription.weight
      )}kg · ` +
      `${prescription.sets} × ` +
      repTarget;

    const incrementText =
      `${formatNumber(
        prescription.increment
      )}kg`;

    if (
      currentEvaluation.success &&
      historyAvailable &&
      successStreak >=
        REQUIRED_CONSECUTIVE_SUCCESSES
    ) {
      const nextWeight =
        Math.round(
          (
            prescription.weight +
            prescription.increment
          ) * 100
        ) / 100;

      return {
        action: "increase",
        success: true,
        exerciseIndex,
        exerciseId:
          prescription.exerciseId,
        exerciseName:
          prescription.name,
        currentSessionSaved:
          Boolean(currentSessionSaved),
        successStreak,
        requiredSuccesses:
          REQUIRED_CONSECUTIVE_SUCCESSES,
        currentWeight:
          prescription.weight,
        nextWeight,
        increment:
          prescription.increment,
        text:
          `${formatNumber(
            nextWeight
          )}kg · ` +
          `${prescription.sets} × ` +
          `${repTarget} 증량 추천`,
        reason:
          `${currentTargetText} 목표를 ` +
          `${successStreak}회 연속 달성했습니다.`,
        incrementReason:
          `설정된 증량 단위 ${incrementText}을 반영했습니다.`
      };
    }

    if (currentEvaluation.success) {
      return {
        action: "repeat",
        success: true,
        exerciseIndex,
        exerciseId:
          prescription.exerciseId,
        exerciseName:
          prescription.name,
        currentSessionSaved:
          Boolean(currentSessionSaved),
        successStreak,
        requiredSuccesses:
          REQUIRED_CONSECUTIVE_SUCCESSES,
        currentWeight:
          prescription.weight,
        nextWeight:
          prescription.weight,
        increment:
          prescription.increment,
        text:
          `${currentTargetText} 한 번 더`,
        reason:
          historyAvailable
            ? `${currentTargetText} 목표를 ${successStreak}회 달성했습니다. 2회 연속 성공 시 증량합니다.`
            : "이번 목표 달성은 확인했지만 이전 기록을 불러오지 못해 동일 중량 1회 추가 수행을 추천합니다.",
        incrementReason:
          `다음 증량 단위는 ${incrementText}입니다.`
      };
    }

    return {
      action: "maintain",
      success: false,
      exerciseIndex,
      exerciseId:
        prescription.exerciseId,
      exerciseName:
        prescription.name,
      currentSessionSaved:
        Boolean(currentSessionSaved),
      successStreak: 0,
      requiredSuccesses:
        REQUIRED_CONSECUTIVE_SUCCESSES,
      currentWeight:
        prescription.weight,
      nextWeight:
        prescription.weight,
      increment:
        prescription.increment,
      text:
        `${currentTargetText} 유지`,
      reason:
        getFailureReason(
          currentEvaluation
        ),
      incrementReason:
        `다음 증량 단위는 ${incrementText}입니다.`
    };
  }

  async function loadRecommendation({
    exercise,
    exerciseIndex = 0,
    state,
    maxSessions = 50
  }) {
    const historyApi =
      window.JYMLog.history;

    if (
      !historyApi
        ?.loadRecentWorkoutSessions
    ) {
      return buildRecommendation({
        exercise,
        exerciseIndex,
        state,
        sessions: [],
        historyAvailable: false
      });
    }

    try {
      const sessions =
        await historyApi
          .loadRecentWorkoutSessions(
            maxSessions
          );

      const currentSession =
        sessions.find(
          (session) =>
            toFiniteNumber(
              session?.startedAtMillis
            ) ===
            toFiniteNumber(
              state?.startedAt
            )
        ) || null;

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
        historyAvailable: true,
        currentExerciseResult,
        currentSessionSaved:
          Boolean(
            currentExerciseResult
          )
      });
    } catch (error) {
      console.warn(
        "[JYM Log] 이전 운동 기록을 불러오지 못해 보수적으로 추천합니다.",
        error
      );

      return buildRecommendation({
        exercise,
        exerciseIndex,
        state,
        sessions: [],
        historyAvailable: false
      });
    }
  }


  function findCurrentSession(
    sessions,
    state
  ) {
    const currentStartedAt =
      toFiniteNumber(
        state?.startedAt
      );

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
    const routineExercises =
      Array.isArray(exercises)
        ? exercises
        : [];

    return routineExercises.map(
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
            Boolean(
              currentExerciseResult
            )
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

    if (
      !historyApi
        ?.loadRecentWorkoutSessions
    ) {
      return buildRecommendations({
        exercises,
        state,
        sessions: [],
        historyAvailable: false,
        currentSession: null
      });
    }

    try {
      /*
       * 루틴 전체 추천에서도 기록 조회는
       * 한 번만 수행하고 모든 운동이 공유합니다.
       */
      const sessions =
        await historyApi
          .loadRecentWorkoutSessions(
            maxSessions
          );

      const currentSession =
        findCurrentSession(
          sessions,
          state
        );

      return buildRecommendations({
        exercises,
        state,
        sessions,
        historyAvailable: true,
        currentSession
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

  window.JYMLog.progressionEngine =
    Object.freeze({
      requiredConsecutiveSuccesses:
        REQUIRED_CONSECUTIVE_SUCCESSES,
      buildRecommendation,
      buildRecommendations,
      loadRecommendation,
      loadRecommendations
    });
})();
