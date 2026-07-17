const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const source = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "js",
    "progression-history.js"
  ),
  "utf8"
);

const context = {
  window: {
    JYMLog: {}
  },
  console
};

vm.createContext(context);
vm.runInContext(source, context);

const historyEngine =
  context.window.JYMLog
    .progressionHistory;

function makeExercise(
  weight = 80
) {
  return {
    id: "bench-press",
    name: "벤치프레스",
    type: "고정 반복형",
    weight,
    sets: 5,
    min: 5,
    max: 5,
    increment: 2.5
  };
}

function makeSession({
  weight = 80,
  reps = [5, 5, 5, 5, 5],
  completedAtMillis,
  startedAtMillis
}) {
  return {
    id:
      `session-${startedAtMillis}`,
    startedAtMillis,
    completedAtMillis,
    exercises: [
      {
        exerciseId:
          "bench-press",
        exerciseIndex: 0,
        name: "벤치프레스",
        type: "고정 반복형",
        target: {
          weight,
          sets: 5,
          minReps: 5,
          maxReps: 5
        },
        sets: reps.map(
          (value, index) => ({
            setNumber:
              index + 1,
            weight,
            reps: value,
            done: true
          })
        )
      }
    ]
  };
}

const noRecords =
  historyEngine
    .buildExerciseHistory({
      exercise:
        makeExercise(80),
      sessions: []
    });

assert.equal(
  noRecords.state,
  "no-records"
);
assert.equal(
  noRecords.currentStreak,
  0
);

const firstSuccess =
  historyEngine
    .buildExerciseHistory({
      exercise:
        makeExercise(80),
      sessions: [
        makeSession({
          completedAtMillis: 2000,
          startedAtMillis: 1000
        })
      ]
    });

assert.equal(
  firstSuccess.state,
  "progress"
);
assert.equal(
  firstSuccess.currentStreak,
  1
);
assert.equal(
  firstSuccess.totalSuccesses,
  1
);

const readyToIncrease =
  historyEngine
    .buildExerciseHistory({
      exercise:
        makeExercise(80),
      sessions: [
        makeSession({
          completedAtMillis: 2000,
          startedAtMillis: 1000
        }),
        makeSession({
          completedAtMillis: 4000,
          startedAtMillis: 3000
        })
      ]
    });

assert.equal(
  readyToIncrease.state,
  "ready"
);
assert.equal(
  readyToIncrease.currentStreak,
  2
);

const appliedIncrease =
  historyEngine
    .buildExerciseHistory({
      exercise:
        makeExercise(82.5),
      sessions: [
        makeSession({
          completedAtMillis: 2000,
          startedAtMillis: 1000
        }),
        makeSession({
          completedAtMillis: 4000,
          startedAtMillis: 3000
        })
      ]
    });

assert.equal(
  appliedIncrease.state,
  "applied"
);
assert.equal(
  appliedIncrease.changes[0].kind,
  "recommended-increase"
);
assert.equal(
  appliedIncrease.changes[0].fromWeight,
  80
);
assert.equal(
  appliedIncrease.changes[0].toWeight,
  82.5
);

const historicalIncrease =
  historyEngine
    .buildExerciseHistory({
      exercise:
        makeExercise(82.5),
      sessions: [
        makeSession({
          completedAtMillis: 2000,
          startedAtMillis: 1000
        }),
        makeSession({
          completedAtMillis: 4000,
          startedAtMillis: 3000
        }),
        makeSession({
          weight: 82.5,
          completedAtMillis: 6000,
          startedAtMillis: 5000
        })
      ]
    });

assert.equal(
  historicalIncrease.state,
  "progress"
);
assert.equal(
  historicalIncrease.currentStreak,
  1
);
assert.equal(
  historicalIncrease.changes[0].kind,
  "recommended-increase"
);

const failedLatest =
  historyEngine
    .buildExerciseHistory({
      exercise:
        makeExercise(80),
      sessions: [
        makeSession({
          completedAtMillis: 2000,
          startedAtMillis: 1000
        }),
        makeSession({
          reps: [5, 5, 5, 5, 4],
          completedAtMillis: 4000,
          startedAtMillis: 3000
        })
      ]
    });

assert.equal(
  failedLatest.state,
  "retry"
);
assert.equal(
  failedLatest.currentStreak,
  0
);
assert.equal(
  failedLatest.totalSuccesses,
  1
);

const overview =
  historyEngine.buildOverview({
    exercises: [
      makeExercise(82.5)
    ],
    sessions: [
      makeSession({
        completedAtMillis: 2000,
        startedAtMillis: 1000
      }),
      makeSession({
        completedAtMillis: 4000,
        startedAtMillis: 3000
      })
    ]
  });

assert.equal(
  overview.appliedCount,
  1
);
assert.equal(
  overview.totalExercises,
  1
);

console.log(
  "progression-history tests passed"
);
