(() => {
  window.JYMLog = window.JYMLog || {};

  const policyApi = window.JYMLog.progressionPolicy;

  if (!policyApi) {
    throw new Error("진행 정책 모듈을 불러오지 못했습니다.");
  }

  function toNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function formatNumber(value) {
    const number = toNumber(value);
    return Number.isInteger(number)
      ? String(number)
      : String(Math.round(number * 100) / 100);
  }

  function normalizeName(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function arraysEqual(first, second) {
    return Array.isArray(first) &&
      Array.isArray(second) &&
      first.length === second.length &&
      first.every((value, index) => Number(value) === Number(second[index]));
  }

  function formatTarget(target) {
    if (!target) {
      return "목표 정보 없음";
    }

    const targets = Array.isArray(target.successSetTargets)
      ? target.successSetTargets
      : [];
    const uniform = targets.length > 0 && targets.every(
      (value) => Number(value) === Number(targets[0])
    );

    if (target.strategy === "rep-range") {
      return `${formatNumber(target.weight)}kg · ${target.setCount} × ${target.minReps}–${target.maxReps}`;
    }

    return uniform
      ? `${formatNumber(target.weight)}kg · ${target.setCount} × ${targets[0]}`
      : `${formatNumber(target.weight)}kg · ${targets.join(" / ")}`;
  }

  function buildRoutineModel(exercise, exerciseIndex = 0) {
    const normalized = policyApi.normalizeRoutineExercise(exercise, {
      routineId: exercise?.routineId || "main",
      index: exerciseIndex
    });

    return {
      exercise: normalized,
      exerciseId: normalized.id,
      routineExerciseId: normalized.routineExerciseId,
      exerciseName: normalized.name,
      normalizedName: normalizeName(normalized.name),
      policy: normalized.progressionPolicy,
      state: normalized.progressionState,
      target: policyApi.getCurrentTarget(
        normalized,
        normalized.progressionPolicy,
        normalized.progressionState
      ),
      increment: normalized.increment
    };
  }

  function buildSessionModel(result, fallbackExercise, exerciseIndex = 0) {
    const snapshot = result?.progressionSnapshot;

    if (snapshot?.policy && snapshot?.target) {
      const fallback = buildRoutineModel(fallbackExercise || {}, exerciseIndex);
      return {
        exerciseId: String(snapshot.exerciseId || result?.exerciseId || fallback.exerciseId),
        routineExerciseId: String(snapshot.routineExerciseId || result?.routineExerciseId || fallback.routineExerciseId),
        exerciseName: String(result?.name || fallback.exerciseName),
        normalizedName: normalizeName(result?.name || fallback.exerciseName),
        policy: policyApi.normalizePolicy(fallback.exercise, snapshot.policy),
        state: policyApi.normalizeState(snapshot.policy, snapshot.state),
        target: {
          ...snapshot.target,
          inputSetTargets: policyApi.normalizeSetTargets(
            snapshot.target.inputSetTargets ?? result?.target?.setTargets,
            [snapshot.target.minReps || 1]
          ),
          successSetTargets: policyApi.normalizeSetTargets(
            snapshot.target.successSetTargets ?? result?.target?.successSetTargets,
            [snapshot.target.maxReps || 1]
          )
        },
        increment: toNumber(snapshot.increment, fallback.increment)
      };
    }

    return buildRoutineModel({
      ...(fallbackExercise || {}),
      id: result?.exerciseId || fallbackExercise?.id,
      routineExerciseId: result?.routineExerciseId || fallbackExercise?.routineExerciseId,
      name: result?.name || fallbackExercise?.name,
      type: result?.type || fallbackExercise?.type,
      weight: result?.target?.weight,
      sets: result?.target?.sets || result?.sets?.length,
      min: result?.target?.minReps,
      max: result?.target?.maxReps,
      increment: fallbackExercise?.increment || 2.5
    }, exerciseIndex);
  }

  function isSameTarget(first, second) {
    if (!first || !second) {
      return false;
    }

    if (
      first.routineExerciseId &&
      second.routineExerciseId &&
      first.routineExerciseId !== second.routineExerciseId
    ) {
      return false;
    }

    return Number(first.target.weight) === Number(second.target.weight) &&
      first.target.strategy === second.target.strategy &&
      Number(first.target.stageIndex) === Number(second.target.stageIndex) &&
      first.policy.requiredSuccesses === second.policy.requiredSuccesses &&
      arraysEqual(first.target.successSetTargets, second.target.successSetTargets);
  }

  function findSessionExercise(session, exercise, exerciseIndex) {
    const results = Array.isArray(session?.exercises) ? session.exercises : [];
    const routineExerciseId = String(exercise?.routineExerciseId || "");

    if (routineExerciseId) {
      const match = results.find((result) =>
        String(result?.routineExerciseId || result?.progressionSnapshot?.routineExerciseId || "") === routineExerciseId
      );
      if (match) return match;
    }

    const exerciseId = String(exercise?.id || "");
    if (exerciseId) {
      const match = results.find((result) => String(result?.exerciseId || "") === exerciseId);
      if (match) return match;
    }

    const name = normalizeName(exercise?.name);
    if (name) {
      const match = results.find((result) => normalizeName(result?.name) === name);
      if (match) return match;
    }

    return results.find((result) => Number(result?.exerciseIndex) === exerciseIndex) || null;
  }

  function buildRecords({ exercise, exerciseIndex, sessions }) {
    return [...(Array.isArray(sessions) ? sessions : [])]
      .sort((a, b) => toNumber(a?.completedAtMillis) - toNumber(b?.completedAtMillis))
      .map((session) => {
        const result = findSessionExercise(session, exercise, exerciseIndex);
        if (!result) return null;
        const model = buildSessionModel(result, exercise, exerciseIndex);
        const evaluation = policyApi.evaluateSets(result.sets, model.target, model.target.weight);
        return {
          sessionId: String(session?.id || ""),
          completedAtMillis: toNumber(session?.completedAtMillis),
          model,
          success: evaluation.success,
          evaluation
        };
      })
      .filter(Boolean);
  }

  function countStreakEndingAt(records, endIndex) {
    const end = records[endIndex];
    if (!end?.success) return 0;
    let count = 0;

    for (let index = endIndex; index >= 0; index -= 1) {
      const record = records[index];
      if (!record.success || !isSameTarget(record.model, end.model)) break;
      count += 1;
    }

    return count;
  }

  function inferChangeKind(previous, current, previousStreak) {
    const required = previous.policy.requiredSuccesses;
    const expectedWeight = Math.round(
      (toNumber(previous.target.weight) + toNumber(previous.increment, 2.5)) * 100
    ) / 100;

    if (
      previousStreak >= required &&
      Number(current.target.weight) === expectedWeight
    ) {
      return "recommended-increase";
    }

    if (
      previousStreak >= required &&
      Number(current.target.weight) === Number(previous.target.weight) &&
      Number(current.target.stageIndex) > Number(previous.target.stageIndex)
    ) {
      return "stage-advance";
    }

    return "target-change";
  }

  function buildChanges(records, routineModel, maxChanges) {
    const changes = [];

    for (let index = 1; index < records.length; index += 1) {
      const previous = records[index - 1];
      const current = records[index];
      if (isSameTarget(previous.model, current.model)) continue;
      const previousStreak = countStreakEndingAt(records, index - 1);
      changes.push({
        kind: inferChangeKind(previous.model, current.model, previousStreak),
        fromWeight: previous.model.target.weight,
        toWeight: current.model.target.weight,
        fromTargetText: formatTarget(previous.model.target),
        toTargetText: formatTarget(current.model.target),
        previousStreak,
        completedAtMillis: current.completedAtMillis,
        source: "session"
      });
    }

    if (records.length > 0) {
      const latest = records[records.length - 1];
      if (!isSameTarget(latest.model, routineModel)) {
        const previousStreak = countStreakEndingAt(records, records.length - 1);
        changes.push({
          kind: inferChangeKind(latest.model, routineModel, previousStreak),
          fromWeight: latest.model.target.weight,
          toWeight: routineModel.target.weight,
          fromTargetText: formatTarget(latest.model.target),
          toTargetText: formatTarget(routineModel.target),
          previousStreak,
          completedAtMillis: 0,
          source: "routine"
        });
      }
    }

    return changes.reverse().slice(0, Math.max(0, maxChanges));
  }

  function buildExerciseHistory({
    exercise,
    exerciseIndex = 0,
    sessions = [],
    maxChanges = 3
  }) {
    const routineModel = buildRoutineModel(exercise, exerciseIndex);
    const records = buildRecords({ exercise: routineModel.exercise, exerciseIndex, sessions });
    const requiredSuccesses = routineModel.policy.requiredSuccesses;
    const totalSuccesses = records.filter((record) => record.success).length;

    if (records.length === 0) {
      return {
        exerciseIndex,
        exerciseId: routineModel.exerciseId,
        routineExerciseId: routineModel.routineExerciseId,
        exerciseName: routineModel.exerciseName,
        state: "no-records",
        badge: "기록 없음",
        routineTargetText: formatTarget(routineModel.target),
        currentStreak: 0,
        requiredSuccesses,
        totalSuccesses: 0,
        recordCount: 0,
        latestSuccess: null,
        latestCompletedAtMillis: 0,
        statusMessage: "운동을 완료하면 연속 성공과 목표 변경 이력이 표시됩니다.",
        changes: []
      };
    }

    const latestIndex = records.length - 1;
    const latest = records[latestIndex];
    const currentStreak = countStreakEndingAt(records, latestIndex);
    const targetChanged = !isSameTarget(routineModel, latest.model);
    const changes = buildChanges(records, routineModel, maxChanges);

    let state = "retry";
    let badge = "재도전";
    let statusMessage = "최근 목표를 달성하지 못해 현재 목표 재도전이 필요합니다.";

    if (targetChanged) {
      const kind = changes[0]?.kind;
      if (kind === "recommended-increase") {
        state = "applied";
        badge = "증량 적용";
        statusMessage = `${formatTarget(latest.model.target)} 목표 달성 후 ${formatTarget(routineModel.target)}가 반영되었습니다.`;
      } else if (kind === "stage-advance") {
        state = "progress";
        badge = "단계 진행";
        statusMessage = `${formatTarget(latest.model.target)}에서 ${formatTarget(routineModel.target)}로 다음 단계가 반영되었습니다.`;
      } else {
        state = "changed";
        badge = "목표 변경";
        statusMessage = `최근 완료 목표와 현재 루틴 목표가 다릅니다.`;
      }
    } else if (latest.success && currentStreak >= requiredSuccesses) {
      state = "ready";
      badge = routineModel.policy.strategy === "stage" ? "다음 단계 준비" : "증량 준비";
      statusMessage = `현재 목표를 ${currentStreak}회 연속 달성했습니다.`;
    } else if (latest.success) {
      state = "progress";
      badge = `${currentStreak}/${requiredSuccesses} 성공`;
      statusMessage = `현재 목표를 ${currentStreak}회 연속 달성했습니다. ${requiredSuccesses}회 성공 시 다음 단계로 진행합니다.`;
    }

    return {
      exerciseIndex,
      exerciseId: routineModel.exerciseId,
      routineExerciseId: routineModel.routineExerciseId,
      exerciseName: routineModel.exerciseName,
      state,
      badge,
      routineTargetText: formatTarget(routineModel.target),
      latestTargetText: formatTarget(latest.model.target),
      currentStreak,
      requiredSuccesses,
      totalSuccesses,
      recordCount: records.length,
      latestSuccess: latest.success,
      latestCompletedAtMillis: latest.completedAtMillis,
      statusMessage,
      changes
    };
  }

  function buildOverview({ exercises = [], sessions = [], maxChanges = 3 }) {
    const exerciseHistories = (Array.isArray(exercises) ? exercises : []).map(
      (exercise, exerciseIndex) => buildExerciseHistory({
        exercise,
        exerciseIndex,
        sessions,
        maxChanges
      })
    );

    const countState = (state) => exerciseHistories.filter((history) => history.state === state).length;

    return {
      exerciseHistories,
      totalExercises: exerciseHistories.length,
      appliedCount: countState("applied"),
      readyCount: countState("ready"),
      progressCount: countState("progress"),
      retryCount: countState("retry"),
      changedCount: countState("changed"),
      noRecordCount: countState("no-records"),
      totalSuccesses: exerciseHistories.reduce((total, history) => total + history.totalSuccesses, 0),
      totalChanges: exerciseHistories.reduce((total, history) => total + history.changes.length, 0)
    };
  }

  window.JYMLog.progressionHistory = Object.freeze({
    defaultRequiredSuccesses: 2,
    buildOverview,
    buildExerciseHistory,
    evaluateExerciseResult(exerciseResult) {
      const model = buildSessionModel(exerciseResult, {}, Number(exerciseResult?.exerciseIndex) || 0);
      return policyApi.evaluateSets(exerciseResult?.sets, model.target, model.target.weight);
    },
    formatPrescription(target) {
      return formatTarget(target?.target || target);
    }
  });
})();

