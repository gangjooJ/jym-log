const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const source = fs.readFileSync(
  path.join(__dirname, "..", "js", "progression-policy.js"),
  "utf8"
);

const context = {
  window: { JYMLog: {} },
  console
};

vm.createContext(context);
vm.runInContext(source, context);

const policy = context.window.JYMLog.progressionPolicy;

const fiveByFive = policy.normalizeRoutineExercise({
  id: "bench-press",
  name: "벤치프레스",
  type: "고정 반복형",
  weight: 80,
  sets: 5,
  min: 5,
  max: 5,
  increment: 2.5
}, {
  routineId: "strength-5x5",
  index: 0
});

assert.equal(fiveByFive.routineExerciseId, "strength-5x5::bench-press");
assert.equal(fiveByFive.progressionPolicy.strategy, "load");
assert.deepEqual(Array.from(fiveByFive.successSetTargets), [5, 5, 5, 5, 5]);

const fiveByFiveTransition = policy.getTransition({
  exercise: {
    ...fiveByFive,
    progressionPolicy: {
      ...fiveByFive.progressionPolicy,
      requiredSuccesses: 1
    }
  },
  policy: {
    ...fiveByFive.progressionPolicy,
    requiredSuccesses: 1
  },
  state: fiveByFive.progressionState,
  success: true
});

assert.equal(fiveByFiveTransition.action, "increase");
assert.equal(fiveByFiveTransition.nextWeight, 82.5);
assert.deepEqual(Array.from(fiveByFiveTransition.nextTarget.successSetTargets), [5, 5, 5, 5, 5]);

const stagedBench = policy.normalizeRoutineExercise({
  id: "bench-press",
  name: "벤치프레스",
  type: "고정 반복형",
  weight: 70,
  sets: 3,
  min: 5,
  max: 10,
  increment: 5,
  progressionPolicy: {
    strategy: "stage",
    requiredSuccesses: 1,
    stages: [
      { id: "stage-1", setTargets: [5, 5, 5] },
      { id: "stage-2", setTargets: [6, 6, 6] },
      { id: "stage-3", setTargets: [10, 9, 7] }
    ],
    resetStageIndex: 0
  },
  progressionState: {
    currentStageIndex: 0
  }
}, {
  routineId: "chest-main",
  index: 0
});

assert.equal(stagedBench.routineExerciseId, "chest-main::bench-press");
assert.equal(stagedBench.progressionPolicy.strategy, "stage");
assert.deepEqual(Array.from(stagedBench.successSetTargets), [5, 5, 5]);

const nextStage = policy.getTransition({
  exercise: stagedBench,
  policy: stagedBench.progressionPolicy,
  state: stagedBench.progressionState,
  success: true
});

assert.equal(nextStage.action, "advance-stage");
assert.equal(nextStage.nextState.currentStageIndex, 1);
assert.deepEqual(Array.from(nextStage.nextTarget.successSetTargets), [6, 6, 6]);
assert.equal(nextStage.nextWeight, 70);

const finalStageExercise = policy.normalizeRoutineExercise({
  ...stagedBench,
  progressionState: {
    currentStageIndex: 2
  }
}, {
  routineId: "chest-main",
  index: 0
});

const finalTransition = policy.getTransition({
  exercise: finalStageExercise,
  policy: finalStageExercise.progressionPolicy,
  state: finalStageExercise.progressionState,
  success: true
});

assert.equal(finalTransition.action, "increase");
assert.equal(finalTransition.nextWeight, 75);
assert.equal(finalTransition.nextState.currentStageIndex, 0);
assert.deepEqual(Array.from(finalTransition.nextTarget.successSetTargets), [5, 5, 5]);

const snapshot = policy.createSnapshot(finalStageExercise, {
  routineId: "chest-main",
  index: 0
});

assert.equal(snapshot.routineId, "chest-main");
assert.equal(snapshot.routineExerciseId, "chest-main::bench-press");
assert.equal(snapshot.target.stageIndex, 2);
assert.deepEqual(Array.from(snapshot.target.successSetTargets), [10, 9, 7]);

console.log("progression-policy tests passed");
