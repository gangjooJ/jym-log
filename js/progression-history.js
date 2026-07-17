(() => {
  window.JYMLog =
    window.JYMLog || {};

  const DEFAULT_REQUIRED_SUCCESSES = 2;

  function toFiniteNumber(
    value,
    fallback = 0
  ) {
    const number = Number(value);

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

  function areNumbersEqual(
    first,
    second,
    tolerance = 0.001
  ) {
    return (
      Math.abs(
        toFiniteNumber(first) -
        toFiniteNumber(second)
      ) <= tolerance
    );
  }

  function getRoutinePrescription(
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
        String(exercise?.id || ""),
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

  function formatPrescription(
    prescription
  ) {
    if (!prescription) {
      return "목표 정보 없음";
    }

    return (
      `${formatNumber(
        prescription.weight
      )}kg · ` +
      `${prescription.sets} × ` +
      `${formatRepTarget(
        prescription.minReps,
        prescription.maxReps
      )}`
    );
  }

  function isSamePrescription(
    first,
    second
  ) {
    if (!first || !second) {
      return false;
    }

    return (
      areNumbersEqual(
        first.weight,
        second.weight
      ) &&
      first.sets === second.sets &&
      first.minReps ===
        second.minReps &&
      first.maxReps ===
        second.maxReps &&
      first.type === second.type
    );
  }

  function evaluateExerciseResult(
    exerciseResult
  ) {
    if (!exerciseResult) {
      return {
        success: false,
        missingSets: 0,
        incompleteSets: 0,
        belowWeightSets: 0,
        belowRepSets: 0
      };
    }

    const prescription =
      getSessionPrescription(
        exerciseResult
      );

    const sets =
      Array.isArray(
        exerciseResult.sets
      )
        ? exerciseResult.sets
        : [];

    let missingSets = 0;
    let incompleteSets = 0;
    let belowWeightSets = 0;
    let belowRepSets = 0;

    for (
      let setIndex = 0;
      setIndex < prescription.sets;
      setIndex += 1
    ) {
      const set = sets[setIndex];

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
      String(exercise?.id || "");

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

    return (
      results.find(
        (result) =>
          Number(
            result?.exerciseIndex
          ) === exerciseIndex
      ) || null
    );
  }

  function buildRecords({
    exercise,
    exerciseIndex,
    sessions
  }) {
    return [...(
      Array.isArray(sessions)
        ? sessions
        : []
    )]
      .sort(
        (first, second) =>
          toFiniteNumber(
            first?.completedAtMillis
          ) -
          toFiniteNumber(
            second?.completedAtMillis
          )
      )
      .map((session) => {
        const exerciseResult =
          findSessionExercise(
            session,
            exercise,
            exerciseIndex
          );

        if (!exerciseResult) {
          return null;
        }

        const prescription =
          getSessionPrescription(
            exerciseResult
          );

        const evaluation =
          evaluateExerciseResult(
            exerciseResult
          );

        return {
          sessionId:
            String(session?.id || ""),
          startedAtMillis:
            toFiniteNumber(
              session?.startedAtMillis
            ),
          completedAtMillis:
            toFiniteNumber(
              session?.completedAtMillis
            ),
          prescription,
          success:
            evaluation.success,
          evaluation
        };
      })
      .filter(Boolean);
  }

  function countStreakEndingAt(
    records,
    endIndex
  ) {
    const endRecord =
      records[endIndex];

    if (!endRecord?.success) {
      return 0;
    }

    let count = 0;

    for (
      let index = endIndex;
      index >= 0;
      index -= 1
    ) {
      const record = records[index];

      if (
        !record.success ||
        !isSamePrescription(
          record.prescription,
          endRecord.prescription
        )
      ) {
        break;
      }

      count += 1;
    }

    return count;
  }

  function inferChangeKind({
    fromWeight,
    toWeight,
    previousStreak,
    increment,
    requiredSuccesses
  }) {
    const expectedWeight =
      Math.round(
        (
          toFiniteNumber(
            fromWeight
          ) +
          toFiniteNumber(
            increment,
            2.5
          )
        ) * 100
      ) / 100;

    if (
      toFiniteNumber(toWeight) >
        toFiniteNumber(fromWeight) &&
      previousStreak >=
        requiredSuccesses &&
      areNumbersEqual(
        toWeight,
        expectedWeight
      )
    ) {
      return "recommended-increase";
    }

    return "target-change";
  }

  function buildHistoricalChanges({
    records,
    increment,
    requiredSuccesses,
    maxChanges
  }) {
    const changes = [];

    for (
      let index = 1;
      index < records.length;
      index += 1
    ) {
      const previous =
        records[index - 1];
      const current =
        records[index];

      if (
        isSamePrescription(
          previous.prescription,
          current.prescription
        )
      ) {
        continue;
      }

      const previousStreak =
        countStreakEndingAt(
          records,
          index - 1
        );

      const onlyWeightChanged =
        previous.prescription.sets ===
          current.prescription.sets &&
        previous.prescription.minReps ===
          current.prescription.minReps &&
        previous.prescription.maxReps ===
          current.prescription.maxReps &&
        previous.prescription.type ===
          current.prescription.type &&
        !areNumbersEqual(
          previous.prescription.weight,
          current.prescription.weight
        );

      changes.push({
        kind:
          onlyWeightChanged
            ? inferChangeKind({
                fromWeight:
                  previous.prescription.weight,
                toWeight:
                  current.prescription.weight,
                previousStreak,
                increment,
                requiredSuccesses
              })
            : "target-change",
        fromWeight:
          previous.prescription.weight,
        toWeight:
          current.prescription.weight,
        fromTargetText:
          formatPrescription(
            previous.prescription
          ),
        toTargetText:
          formatPrescription(
            current.prescription
          ),
        onlyWeightChanged,
        previousStreak,
        completedAtMillis:
          current.completedAtMillis,
        source: "session"
      });
    }

    return changes
      .reverse()
      .slice(
        0,
        Math.max(0, maxChanges)
      );
  }

  function buildExerciseHistory({
    exercise,
    exerciseIndex = 0,
    sessions = [],
    requiredSuccesses =
      DEFAULT_REQUIRED_SUCCESSES,
    maxChanges = 3
  }) {
    const routinePrescription =
      getRoutinePrescription(
        exercise
      );

    const records =
      buildRecords({
        exercise,
        exerciseIndex,
        sessions
      });

    const totalSuccesses =
      records.filter(
        (record) => record.success
      ).length;

    if (records.length === 0) {
      return {
        exerciseIndex,
        exerciseId:
          routinePrescription.exerciseId,
        exerciseName:
          routinePrescription.name,
        state: "no-records",
        badge: "기록 없음",
        routinePrescription,
        routineTargetText:
          formatPrescription(
            routinePrescription
          ),
        latestPrescription: null,
        latestTargetText:
          "완료 기록 없음",
        currentStreak: 0,
        requiredSuccesses,
        totalSuccesses: 0,
        recordCount: 0,
        latestSuccess: null,
        latestCompletedAtMillis: 0,
        statusMessage:
          "운동을 완료하면 연속 성공과 목표 변경 이력이 표시됩니다.",
        changes: []
      };
    }

    const latestIndex =
      records.length - 1;
    const latestRecord =
      records[latestIndex];
    const currentStreak =
      countStreakEndingAt(
        records,
        latestIndex
      );

    const targetChangedAfterLastSession =
      !isSamePrescription(
        routinePrescription,
        latestRecord.prescription
      );

    const changes =
      buildHistoricalChanges({
        records,
        increment:
          routinePrescription.increment,
        requiredSuccesses,
        maxChanges
      });

    let state = "retry";
    let badge = "재도전";
    let statusMessage =
      "최근 목표를 달성하지 못해 같은 중량 재도전이 필요합니다.";

    if (targetChangedAfterLastSession) {
      const onlyWeightChanged =
        routinePrescription.sets ===
          latestRecord.prescription.sets &&
        routinePrescription.minReps ===
          latestRecord.prescription.minReps &&
        routinePrescription.maxReps ===
          latestRecord.prescription.maxReps &&
        routinePrescription.type ===
          latestRecord.prescription.type &&
        !areNumbersEqual(
          routinePrescription.weight,
          latestRecord.prescription.weight
        );

      const changeKind =
        onlyWeightChanged
          ? inferChangeKind({
              fromWeight:
                latestRecord
                  .prescription.weight,
              toWeight:
                routinePrescription.weight,
              previousStreak:
                currentStreak,
              increment:
                routinePrescription.increment,
              requiredSuccesses
            })
          : "target-change";

      const currentChange = {
        kind: changeKind,
        fromWeight:
          latestRecord
            .prescription.weight,
        toWeight:
          routinePrescription.weight,
        fromTargetText:
          formatPrescription(
            latestRecord.prescription
          ),
        toTargetText:
          formatPrescription(
            routinePrescription
          ),
        onlyWeightChanged,
        previousStreak:
          currentStreak,
        completedAtMillis: 0,
        source: "routine"
      };

      changes.unshift(
        currentChange
      );

      if (
        changes.length > maxChanges
      ) {
        changes.length = maxChanges;
      }

      state =
        changeKind ===
        "recommended-increase"
          ? "applied"
          : "changed";

      badge =
        state === "applied"
          ? "증량 적용"
          : "목표 변경";

      statusMessage =
        state === "applied"
          ? `${formatNumber(
              latestRecord
                .prescription.weight
            )}kg 목표를 ${currentStreak}회 연속 달성해 ${formatNumber(
              routinePrescription.weight
            )}kg가 다음 목표로 반영되었습니다.`
          : `최근 완료 목표 ${formatNumber(
              latestRecord
                .prescription.weight
            )}kg와 현재 루틴 목표 ${formatNumber(
              routinePrescription.weight
            )}kg가 다릅니다.`;
    } else if (
      latestRecord.success &&
      currentStreak >=
        requiredSuccesses
    ) {
      state = "ready";
      badge = "증량 준비";
      statusMessage =
        `${formatNumber(
          latestRecord
            .prescription.weight
        )}kg 목표를 ${currentStreak}회 연속 달성했습니다.`;
    } else if (
      latestRecord.success &&
      currentStreak > 0
    ) {
      state = "progress";
      badge =
        `${currentStreak}/${requiredSuccesses} 성공`;
      statusMessage =
        `현재 목표를 ${currentStreak}회 연속 달성했습니다. ${requiredSuccesses}회 연속 성공 시 증량합니다.`;
    }

    return {
      exerciseIndex,
      exerciseId:
        routinePrescription.exerciseId,
      exerciseName:
        routinePrescription.name,
      state,
      badge,
      routinePrescription,
      routineTargetText:
        formatPrescription(
          routinePrescription
        ),
      latestPrescription:
        latestRecord.prescription,
      latestTargetText:
        formatPrescription(
          latestRecord.prescription
        ),
      currentStreak,
      requiredSuccesses,
      totalSuccesses,
      recordCount:
        records.length,
      latestSuccess:
        latestRecord.success,
      latestCompletedAtMillis:
        latestRecord
          .completedAtMillis,
      statusMessage,
      changes
    };
  }

  function buildOverview({
    exercises = [],
    sessions = [],
    requiredSuccesses =
      DEFAULT_REQUIRED_SUCCESSES,
    maxChanges = 3
  }) {
    const exerciseHistories =
      (
        Array.isArray(exercises)
          ? exercises
          : []
      ).map(
        (exercise, exerciseIndex) =>
          buildExerciseHistory({
            exercise,
            exerciseIndex,
            sessions,
            requiredSuccesses,
            maxChanges
          })
      );

    const countState =
      (state) =>
        exerciseHistories.filter(
          (history) =>
            history.state === state
        ).length;

    return {
      exerciseHistories,
      totalExercises:
        exerciseHistories.length,
      appliedCount:
        countState("applied"),
      readyCount:
        countState("ready"),
      progressCount:
        countState("progress"),
      retryCount:
        countState("retry"),
      changedCount:
        countState("changed"),
      noRecordCount:
        countState("no-records"),
      totalSuccesses:
        exerciseHistories.reduce(
          (total, history) =>
            total +
            history.totalSuccesses,
          0
        ),
      totalChanges:
        exerciseHistories.reduce(
          (total, history) =>
            total +
            history.changes.length,
          0
        )
    };
  }

  window.JYMLog.progressionHistory =
    Object.freeze({
      defaultRequiredSuccesses:
        DEFAULT_REQUIRED_SUCCESSES,
      buildOverview,
      buildExerciseHistory,
      evaluateExerciseResult,
      formatPrescription
    });
})();
