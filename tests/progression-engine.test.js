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


const changedRoutineExercise = {
  ...exercise,
  weight: 82.5
};

const savedCurrentSession =
  makeSession(
    [5, 5, 5, 5, 5],
    2000
  );

const stableAfterRoutineChange =
  engine.buildRecommendation({
    exercise:
      changedRoutineExercise,
    exerciseIndex: 0,
    state:
      makeState(
        [5, 5, 5, 5, 5],
        2000
      ),
    sessions: [
      makeSession(
        [5, 5, 5, 5, 5],
        1000
      ),
      savedCurrentSession
    ],
    currentExerciseResult:
      savedCurrentSession
        .exercises[0],
    currentSessionSaved: true
  });

assert.equal(
  stableAfterRoutineChange.action,
  "increase"
);
assert.equal(
  stableAfterRoutineChange.currentWeight,
  80
);
assert.equal(
  stableAfterRoutineChange.nextWeight,
  82.5
);
assert.equal(
  stableAfterRoutineChange
    .currentSessionSaved,
  true
);


const rowExercise = {
  id: "barbell-row",
  name: "바벨 로우",
  type: "고정 반복형",
  weight: 60,
  sets: 3,
  min: 8,
  max: 8,
  increment: 5
};

const curlExercise = {
  id: "barbell-curl",
  name: "바벨 컬",
  type: "반복 범위형",
  weight: 20,
  sets: 3,
  min: 8,
  max: 12,
  increment: 2.5
};

function makeMultiExerciseState() {
  const state = {
    startedAt: 5000,
    completed: true,
    sets: {}
  };

  [5, 5, 5, 5, 5]
    .forEach((reps, index) => {
      state.sets[`0-${index}`] = {
        weight: 80,
        reps,
        done: true
      };
    });

  [8, 8, 8]
    .forEach((reps, index) => {
      state.sets[`1-${index}`] = {
        weight: 60,
        reps,
        done: true
      };
    });

  [12, 11, 10]
    .forEach((reps, index) => {
      state.sets[`2-${index}`] = {
        weight: 20,
        reps,
        done: true
      };
    });

  return state;
}

const previousMultiSession = {
  startedAtMillis: 4000,
  completedAtMillis: 4500,
  exercises: [
    makeSession(
      [5, 5, 5, 5, 5],
      4000
    ).exercises[0],
    {
      exerciseId: "barbell-row",
      exerciseIndex: 1,
      name: "바벨 로우",
      type: "고정 반복형",
      target: {
        weight: 60,
        sets: 3,
        minReps: 8,
        maxReps: 8
      },
      sets: [8, 8, 7].map(
        (reps, index) => ({
          setNumber: index + 1,
          weight: 60,
          reps,
          done: true
        })
      )
    },
    {
      exerciseId: "barbell-curl",
      exerciseIndex: 2,
      name: "바벨 컬",
      type: "반복 범위형",
      target: {
        weight: 20,
        sets: 3,
        minReps: 8,
        maxReps: 12
      },
      sets: [12, 12, 12].map(
        (reps, index) => ({
          setNumber: index + 1,
          weight: 20,
          reps,
          done: true
        })
      )
    }
  ]
};

const allRecommendations =
  engine.buildRecommendations({
    exercises: [
      exercise,
      rowExercise,
      curlExercise
    ],
    state:
      makeMultiExerciseState(),
    sessions: [
      previousMultiSession
    ]
  });

assert.deepEqual(
  Array.from(
    allRecommendations,
    (recommendation) =>
      recommendation.action
  ),
  [
    "increase",
    "repeat",
    "maintain"
  ]
);

assert.equal(
  allRecommendations[0]
    .nextWeight,
  82.5
);
assert.equal(
  allRecommendations[1]
    .successStreak,
  1
);
assert.match(
  allRecommendations[2]
    .reason,
  /목표 반복 수/
);

console.log(
  "progression-engine tests passed"
);
