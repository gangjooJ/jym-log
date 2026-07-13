const workout = window.JYMLog.workout;
const exercises = workout.exercises;
let state = workout.state;

function toast(msg) {
    const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 1900);
}

function navigate(name) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(`screen-${name}`).classList.add("active");
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.nav === name));
    document.getElementById("bottomNav").classList.toggle("hidden", name === "workout" || name === "summary");
    const labels = { home: "오늘의 운동", workout: "운동 진행", summary: "운동 완료", history: "운동 기록", analysis: "진행 분석", routine: "루틴 관리", settings: "설정" };
    document.getElementById("headerSub").textContent = labels[name] || "Progress Log";
    window.scrollTo({ top: 0, behavior: "smooth" });
}
function renderHome() {
    document.getElementById("homeExerciseList").innerHTML = exercises.map((e, i) => `
    <div class="exercise-row">
      <div class="exercise-icon">${e.icon}</div>
      <div><strong>${e.name}</strong><p>${e.type} · 휴식 ${Math.round(e.rest / 60 * 10) / 10}분</p></div>
      <div class="exercise-target"><strong>${e.weight}kg</strong><span>${e.sets} × ${e.min === e.max ? e.min : `${e.min}–${e.max}`}</span></div>
    </div>`).join("");
}

function renderWorkout() {
    const s = workout.getSet(state.activeExercise, i);
    document.getElementById("workoutStep").textContent = `운동 ${state.activeExercise + 1} / ${exercises.length}`;
    document.getElementById("workoutTitle").textContent = e.name;
    document.getElementById("workoutProgress").style.width = `${((state.activeExercise + 1) / exercises.length) * 100}%`;
    document.getElementById("targetText").textContent = `${e.weight}kg · ${e.sets} × ${e.min === e.max ? e.min : `${e.min}–${e.max}`}`;
    document.getElementById("incrementText").textContent = `${e.increment}kg`;
    document.getElementById("previousText").textContent = e.previous;
    document.getElementById("prevExerciseBtn").disabled = state.activeExercise === 0;
    document.getElementById("nextExerciseBtn").textContent = state.activeExercise === exercises.length - 1 ? "처음으로" : "다음 운동";
    const list = [];
    for (let i = 0; i < e.sets; i++) {
        const s = getSet(state.activeExercise, i);
        list.push(`<div class="set-row ${s.done ? "done" : ""}" data-set="${i}">
      <div class="set-number">${i + 1}</div>
      <div class="stepper">
        <button data-action="weight-down" data-set="${i}">−</button>
        <input inputmode="decimal" value="${s.weight}" data-field="weight" data-set="${i}" aria-label="중량">
        <button data-action="weight-up" data-set="${i}">＋</button>
      </div>
      <div class="stepper">
        <button data-action="reps-down" data-set="${i}">−</button>
        <input inputmode="numeric" value="${s.reps}" data-field="reps" data-set="${i}" aria-label="반복">
        <button data-action="reps-up" data-set="${i}">＋</button>
      </div>
      <button class="set-done-btn" data-action="done" data-set="${i}">${s.done ? "✓" : "완료"}</button>
    </div>`);
    }
    document.getElementById("setList").innerHTML = list.join("");
}
function startRest(seconds) {
    const timerCard = document.getElementById("timerCard");

    timerCard.classList.remove("hidden");

    workout.startRestTimer(
        seconds,

        (remainingSeconds) => {
            document.getElementById("timerTime").textContent =
                workout.formatTime(remainingSeconds);
        },

        () => {
            toast("휴식 시간이 끝났습니다.");
        }
    );
}
function startElapsed() {
    workout.startElapsedTimer((elapsedSeconds) => {
        document.getElementById("elapsed").textContent =
            workout.formatTime(elapsedSeconds);
    });
}
function startWorkout() {
    workout.beginWorkout();
    state = workout.state;
    renderWorkout();
    startElapsed();
    navigate("workout");
}
function allDoneCount() {
    return workout.getCompletedSetCount();
}
function totalVolume() {
    return workout.getTotalVolume();
}
function renderSummary() {
    const sec = state.startedAt ? Math.max(60, Math.floor((Date.now() - state.startedAt) / 1000)) : 0;
    document.getElementById("summaryDuration").textContent = `${Math.round(sec / 60)}분`;
    document.getElementById("summarySets").textContent = allDoneCount();
    document.getElementById("summaryVolume").textContent = `${totalVolume().toLocaleString()}kg`;
    const benchSuccess =
  workout.isBenchPressSuccess();
    if (benchSuccess) {
        document.getElementById("recommendText").textContent = "80kg · 5 × 5 한 번 더";
        document.getElementById("recommendReason1").textContent = "80kg 5×5를 첫 번째로 완수했습니다. 2회 연속 성공 시 증량합니다.";
    } else {
        document.getElementById("recommendText").textContent = "80kg · 5 × 5 유지";
        document.getElementById("recommendReason1").textContent = "아직 모든 목표 세트를 달성하지 않아 동일 중량 재도전을 추천합니다.";
    }
}
function renderRoutine() {
    document.getElementById("routineList").innerHTML = exercises.map((e, i) => `
    <div class="card routine-card">
      <div class="routine-top"><div style="display:flex;gap:12px;align-items:center"><div class="exercise-icon">${e.icon}</div><div><h3>${e.name}</h3><p style="font-size:12px;color:var(--muted);margin-top:5px">${e.sets}세트 · ${e.min === e.max ? e.min : `${e.min}–${e.max}`}회 · ${e.type}</p></div></div><span class="drag">☷</span></div>
    </div>`).join("");
}
function renderAnalysis() {
    const vals = [72.5, 75, 75, 77.5, 80, 80];
    document.getElementById("analysisBars").innerHTML = vals.map((v, i) => `
    <div class="bar-wrap"><div class="bar" style="height:${45 + (v - 70) * 7}px"></div><small>${i + 1}회</small></div>`).join("");
}
document.addEventListener("click", e => {
    const nav = e.target.closest("[data-nav]"); if (nav) { navigate(nav.dataset.nav); return; }
    const action = e.target.dataset.action;
    if (action) {
  const exerciseIndex = state.activeExercise;
  const setIndex = Number(e.target.dataset.set);
  const exercise = exercises[exerciseIndex];
  const set = workout.getSet(exerciseIndex, setIndex);

  if (action === "weight-down") {
    workout.updateSet(
      exerciseIndex,
      setIndex,
      "weight",
      Math.max(0, Number(set.weight) - exercise.increment)
    );
  }

  if (action === "weight-up") {
    workout.updateSet(
      exerciseIndex,
      setIndex,
      "weight",
      Number(set.weight) + exercise.increment
    );
  }

  if (action === "reps-down") {
    workout.updateSet(
      exerciseIndex,
      setIndex,
      "reps",
      Math.max(0, Number(set.reps) - 1)
    );
  }

  if (action === "reps-up") {
    workout.updateSet(
      exerciseIndex,
      setIndex,
      "reps",
      Number(set.reps) + 1
    );
  }

  if (action === "done") {
    const isDone = workout.toggleSetDone(
      exerciseIndex,
      setIndex
    );

    if (isDone) {
      startRest(exercise.rest);
    }
  }

  state = workout.state;
  renderWorkout();
  return;
}
    if (e.target.classList.contains("switch")) e.target.classList.toggle("on");
    if (e.target.classList.contains("score-btn")) {
        document.querySelectorAll(".score-btn").forEach(b => b.classList.remove("selected"));
        e.target.classList.add("selected");
        workout.setFatigue(Number(e.target.textContent));
        state = workout.state;
    }
});
document.addEventListener("change", (e) => {
  if (!e.target.dataset.field) {
    return;
  }

  const exerciseIndex = state.activeExercise;
  const setIndex = Number(e.target.dataset.set);
  const field = e.target.dataset.field;
  const value = Number(e.target.value) || 0;

  workout.updateSet(
    exerciseIndex,
    setIndex,
    field,
    value
  );

  state = workout.state;
});
document.getElementById("startWorkoutBtn").onclick = startWorkout;
document.getElementById("prevExerciseBtn").onclick = () => {
  if (state.activeExercise <= 0) {
    return;
  }

  workout.setActiveExercise(
    state.activeExercise - 1
  );

  state = workout.state;

  renderWorkout();
  window.scrollTo(0, 0);
};
document.getElementById("nextExerciseBtn").onclick = () => {
  const nextExerciseIndex =
    (state.activeExercise + 1) % exercises.length;

  workout.setActiveExercise(nextExerciseIndex);
  state = workout.state;

  renderWorkout();
  window.scrollTo(0, 0);
};
document.getElementById("finishWorkoutBtn").onclick = () => document.getElementById("fatigueModal").classList.add("show");
document.getElementById("confirmFinishBtn").onclick = () => {
    document.getElementById("fatigueModal").classList.remove("show");
    workout.finishWorkout();
    workout.stopRestTimer();
    workout.stopElapsedTimer();

    state = workout.state;
    renderSummary();
    navigate("summary");
};
document.getElementById("fatigueModal").onclick = e => { if (e.target.id === "fatigueModal") e.target.classList.remove("show") };
document.getElementById("add30Btn").onclick = () => {
    workout.addRestTime(30, (remainingSeconds) => {
        document.getElementById("timerTime").textContent =
            workout.formatTime(remainingSeconds);
    });
};
document.getElementById("stopTimerBtn").onclick = () => {
    workout.stopRestTimer();

    document.getElementById("timerCard").classList.add("hidden");
};
document.getElementById("addExerciseDemo").onclick = () => toast("다음 스프린트에서 운동 추가 편집 화면을 연결합니다.");
document.getElementById("installInfoBtn").onclick = () => toast("HTTPS 또는 localhost에서 열면 브라우저의 ‘홈 화면에 추가’를 사용할 수 있습니다.");
document.getElementById("resetBtn").onclick = () => {
    if (confirm("프로토타입 기록을 초기화할까요?")) {
        workout.resetWorkout();
        location.reload();
    }
};

renderHome();
renderRoutine();
renderAnalysis();

document.getElementById("settingsAppName").textContent =
    window.JYMLog.config.appName;

document.getElementById("settingsVersion").textContent =
    window.JYMLog.config.version;

document.getElementById("settingsUpdated").textContent =
    window.JYMLog.config.updatedAt;

if (state.started && !state.completed) { startElapsed(); }
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => { }));
}