const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const source = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "js",
    "progression-engine.js"
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

const engine =
  context.window.JYMLog
    .progressionEngine;

const exercise = {
  id: "bench-press",
  name: "벤치프레스",
  type: "고정 반복형",
  weight: 80,
  sets: 5,
  min: 5,
  max: 5,
  increment: 2.5
};

function makeState(
  reps,
  startedAt = 2000
) {
  const sets = {};

  reps.forEach(
    (value, index) => {
      sets[`0-${index}`] = {
        weight: 80,
        reps: value,
        done: true
      };
    }
  );

  return {
    startedAt,
    completed: true,
    sets
  };
}

function makeSession(
  reps,
  startedAt = 1000
) {
  return {
    startedAtMillis: startedAt,
    completedAtMillis:
      startedAt + 3600000,
    exercises: [
      {
        exerciseId:
          "bench-press",
        exerciseIndex: 0,
        name: "벤치프레스",
        type: "고정 반복형",
        target: {
          weight: 80,
          sets: 5,
          minReps: 5,
          maxReps: 5
        },
        sets: reps.map(
          (value, index) => ({
            setNumber:
              index + 1,
            weight: 80,
            reps: value,
            done: true
          })
        )
      }
    ]
  };
}

const firstSuccess =
  engine.buildRecommendation({
    exercise,
    exerciseIndex: 0,
    state:
      makeState([5, 5, 5, 5, 5]),
    sessions: []
  });

assert.equal(
  firstSuccess.action,
  "repeat"
);
assert.equal(
  firstSuccess.successStreak,
  1
);

const secondSuccess =
  engine.buildRecommendation({
    exercise,
    exerciseIndex: 0,
    state:
      makeState([5, 5, 5, 5, 5]),
    sessions: [
      makeSession([5, 5, 5, 5, 5])
    ]
  });

assert.equal(
  secondSuccess.action,
  "increase"
);
assert.equal(
  secondSuccess.nextWeight,
  82.5
);

const failedAttempt =
  engine.buildRecommendation({
    exercise,
    exerciseIndex: 0,
    state:
      makeState([5, 5, 5, 5, 4]),
    sessions: [
      makeSession([5, 5, 5, 5, 5])
    ]
  });

assert.equal(
  failedAttempt.action,
  "maintain"
);
assert.match(
  failedAttempt.reason,
  /목표 반복 수/
);

const lowerWeightState =
  makeState([5, 5, 5, 5, 5]);

lowerWeightState.sets["0-4"]
  .weight = 77.5;

const lowerWeightAttempt =
  engine.buildRecommendation({
    exercise,
    exerciseIndex: 0,
    state:
      lowerWeightState,
    sessions: []
  });

assert.equal(
  lowerWeightAttempt.action,
  "maintain"
);
assert.match(
  lowerWeightAttempt.reason,
  /목표 중량/
);

console.log(
  "progression-engine tests passed"
);
