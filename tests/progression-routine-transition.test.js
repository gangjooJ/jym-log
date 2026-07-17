const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const policySource = fs.readFileSync(
  path.join(__dirname, "..", "js", "progression-policy.js"),
  "utf8"
);

let routinesSource = fs.readFileSync(
  path.join(__dirname, "..", "js", "routines.js"),
  "utf8"
);

routinesSource = routinesSource
  .replace(/import\s*\{[\s\S]*?\}\s*from\s*"[^"]+";\s*/g, "")
  .replace(/export\s*\{[\s\S]*?\};\s*$/g, "");

const savedDocuments = [];
const workoutExercises = [];
const workout = {
  exercises: workoutExercises,
  state: {
    started: false,
    completed: false
  },
  replaceExercises(nextExercises) {
    workoutExercises.splice(
      0,
      workoutExercises.length,
      ...JSON.parse(JSON.stringify(nextExercises))
    );
  },
  resetWorkout() {
    this.state = {
      started: false,
      completed: false
    };
  },
  saveState() {}
};

const routineData = {
  userId: "user-1",
  schemaVersion: 1,
  name: "단계 루틴",
  code: "stage-routine",
  description: "반복 단계 테스트",
  isActive: true,
  exercises: [
    {
      id: "bench-press",
      routineId: "main",
      routineExerciseId: "main::bench-press",
      order: 0,
      name: "벤치프레스",
      type: "반복 단계형",
      weight: 80,
      sets: 3,
      min: 5,
      max: 6,
      rest: 180,
      increment: 2.5,
      progressionPolicy: {
        strategy: "stage",
        requiredSuccesses: 1,
        stages: [
          {
            id: "stage-1",
            label: "1단계",
            setTargets: [5, 5, 5]
          },
          {
            id: "stage-2",
            label: "2단계",
            setTargets: [6, 6, 6]
          }
        ],
        resetStageIndex: 0
      },
      progressionState: {
        currentStageIndex: 0,
        successStreak: 0,
        failureStreak: 0
      }
    }
  ]
};

class CustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}

const context = {
  window: {
    JYMLog: {
      workout
    },
    dispatchEvent() {},
    crypto: {
      randomUUID() {
        return "test-id";
      }
    }
  },
  console,
  CustomEvent,
  db: {},
  doc(...segments) {
    return segments.join("/");
  },
  async getDoc() {
    return {
      exists() {
        return true;
      },
      id: "main",
      data() {
        return JSON.parse(JSON.stringify(routineData));
      }
    };
  },
  serverTimestamp() {
    return "server-time";
  },
  async setDoc(documentRef, payload, options) {
    savedDocuments.push({
      documentRef,
      payload: JSON.parse(JSON.stringify(payload)),
      options
    });
  }
};

vm.createContext(context);
vm.runInContext(policySource, context);
vm.runInContext(routinesSource, context);

(async () => {
  const routines = context.window.JYMLog.routines;

  await routines.ensureActiveRoutine("user-1");

  await assert.rejects(
    routines.applyActiveRoutineProgressionTransition(
      0,
      {
        action: "increase",
        routineExerciseId: "main::bench-press",
        currentWeight: 80,
        nextWeight: 82.5,
        currentStageIndex: 0,
        nextStageIndex: 0
      }
    ),
    /현재 반복 단계에서는 중량을 증가할 수 없습니다/
  );

  const advanced =
    await routines.applyActiveRoutineProgressionTransition(
      0,
      {
        action: "advance-stage",
        routineExerciseId: "main::bench-press",
        currentWeight: 80,
        nextWeight: 80,
        currentStageIndex: 0,
        nextStageIndex: 1
      }
    );

  assert.equal(
    advanced.progressionState.currentStageIndex,
    1
  );
  assert.deepEqual(
    Array.from(advanced.successSetTargets),
    [6, 6, 6]
  );
  assert.equal(advanced.weight, 80);

  const increased =
    await routines.applyActiveRoutineProgressionTransition(
      0,
      {
        action: "increase",
        routineExerciseId: "main::bench-press",
        currentWeight: 80,
        nextWeight: 82.5,
        currentStageIndex: 1,
        nextStageIndex: 0
      }
    );

  assert.equal(increased.weight, 82.5);
  assert.equal(
    increased.progressionState.currentStageIndex,
    0
  );
  assert.deepEqual(
    Array.from(increased.successSetTargets),
    [5, 5, 5]
  );
  assert.equal(savedDocuments.length, 2);

  const configured =
    await routines.updateActiveRoutineExercise(
      0,
      {
        name: "벤치프레스",
        type: "반복 단계형",
        progressionStrategy: "stage",
        requiredSuccesses: 1,
        progressionStages: [
          { setTargets: [5, 5, 5] },
          { setTargets: [6, 6, 6] },
          { setTargets: [10, 9, 7] }
        ],
        weight: 70,
        sets: 3,
        min: 5,
        max: 10,
        rest: 180,
        increment: 5
      }
    );

  assert.equal(
    configured.progressionPolicy.strategy,
    "stage"
  );
  assert.equal(
    configured.progressionPolicy.stages.length,
    3
  );
  assert.deepEqual(
    Array.from(
      configured.progressionPolicy
        .stages[2].setTargets
    ),
    [10, 9, 7]
  );
  assert.equal(configured.sets, 3);
  assert.equal(configured.min, 5);
  assert.equal(configured.max, 5);
  assert.equal(
    configured.progressionState.currentStageIndex,
    0
  );

  const manual =
    await routines.updateActiveRoutineExercise(
      0,
      {
        name: "벤치프레스",
        type: "수동 관리형",
        progressionStrategy: "manual",
        requiredSuccesses: 1,
        progressionStages: [],
        weight: 70,
        sets: 3,
        min: 8,
        max: 12,
        rest: 180,
        increment: 5
      }
    );

  assert.equal(
    manual.progressionPolicy.strategy,
    "manual"
  );
  assert.equal(
    manual.progressionPolicy.enabled,
    false
  );
  assert.equal(manual.min, 8);
  assert.equal(manual.max, 12);

  console.log(
    "progression-routine-transition tests passed"
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
