(() => {
  const workout =
    window.JYMLog.workout;

  const exercises =
    workout.exercises;

const homeRoutineName =
  document.getElementById(
    "homeRoutineName"
  );

const homeRoutineDescription =
  document.getElementById(
    "homeRoutineDescription"
  );

const homeRoutineSets =
  document.getElementById(
    "homeRoutineSets"
  );

const homeRoutineGoal =
  document.getElementById(
    "homeRoutineGoal"
  );

const homeRoutineGoalLabel =
  document.getElementById(
    "homeRoutineGoalLabel"
  );

const routineNameLabel =
  document.getElementById(
    "routineNameLabel"
  );

const routineExerciseCount =
  document.getElementById(
    "routineExerciseCount"
  );

const routineListElement =
  document.getElementById(
    "routineList"
  );

const routineInfoForm =
  document.getElementById(
    "routineInfoForm"
  );

const routineNameInput =
  document.getElementById(
    "routineNameInput"
  );

const routineDescriptionInput =
  document.getElementById(
    "routineDescriptionInput"
  );

const saveRoutineInfoBtn =
  document.getElementById(
    "saveRoutineInfoBtn"
  );

const routineEditorMessage =
  document.getElementById(
    "routineEditorMessage"
  );

const summaryRoutineName =
  document.getElementById(
    "summaryRoutineName"
  );

const exerciseEditorModal =
  document.getElementById(
    "exerciseEditorModal"
  );

const exerciseEditorForm =
  document.getElementById(
    "exerciseEditorForm"
  );

const exerciseEditorTitle =
  document.getElementById(
    "exerciseEditorTitle"
  );

const exerciseNameInput =
  document.getElementById(
    "exerciseNameInput"
  );

const exerciseTypeInput =
  document.getElementById(
    "exerciseTypeInput"
  );

const exerciseWeightInput =
  document.getElementById(
    "exerciseWeightInput"
  );

const exerciseSetsInput =
  document.getElementById(
    "exerciseSetsInput"
  );

const exerciseMinRepsInput =
  document.getElementById(
    "exerciseMinRepsInput"
  );

const exerciseMaxRepsInput =
  document.getElementById(
    "exerciseMaxRepsInput"
  );

const exerciseRestInput =
  document.getElementById(
    "exerciseRestInput"
  );

const exerciseIncrementInput =
  document.getElementById(
    "exerciseIncrementInput"
  );

const exerciseEditorMessage =
  document.getElementById(
    "exerciseEditorMessage"
  );

const saveExerciseEditorBtn =
  document.getElementById(
    "saveExerciseEditorBtn"
  );

const cancelExerciseEditorBtn =
  document.getElementById(
    "cancelExerciseEditorBtn"
  );

const closeExerciseEditorBtn =
  document.getElementById(
    "closeExerciseEditorBtn"
  );

const deleteExerciseEditorBtn =
  document.getElementById(
    "deleteExerciseEditorBtn"
  );

const addExerciseBtn =
  document.getElementById(
    "addExerciseBtn"
  );


let editingExerciseIndex = null;
let exerciseEditorMode = "edit";

let routineOrderSaving = false;
let routineDragState = null;


let initialized = false;

let showToast = (message) => {
  console.info(
    "[JYM Log] 루틴 안내",
    message
  );
};

let onRoutineChanged = () => {};

function toast(message) {
  showToast(message);
}

function setRoutineEditorMessage(
  message,
  status = "default"
) {
  if (!routineEditorMessage) {
    return;
  }

  routineEditorMessage.textContent =
    message;

  routineEditorMessage.classList.toggle(
    "success",
    status === "success"
  );

  routineEditorMessage.classList.toggle(
    "error",
    status === "error"
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderRoutineMetadata(
  routine =
    window.JYMLog.routines
      ?.activeRoutine
) {
  if (!routine) {
    return;
  }

  const totalSets =
    exercises.reduce(
      (total, exercise) =>
        total +
        (
          Number(exercise.sets) ||
          0
        ),
      0
    );

  const firstExercise =
    exercises[0];

  if (homeRoutineName) {
    homeRoutineName.textContent =
      routine.name;
  }

  if (homeRoutineDescription) {
    homeRoutineDescription.textContent =
      `${routine.description} · 총 ${exercises.length}개 운동`;
  }

  if (homeRoutineSets) {
    homeRoutineSets.textContent =
      `${totalSets}세트`;
  }

  if (homeRoutineGoal) {
    homeRoutineGoal.textContent =
      firstExercise
        ? `${firstExercise.weight}kg`
        : "—";
  }

  if (homeRoutineGoalLabel) {
    homeRoutineGoalLabel.textContent =
      firstExercise
        ? `${firstExercise.name} 목표`
        : "운동 목표 준비 중";
  }

  if (routineNameLabel) {
    routineNameLabel.textContent =
      routine.name;
  }

  if (routineExerciseCount) {
    routineExerciseCount.textContent =
      `${exercises.length}개 운동`;
  }

  if (summaryRoutineName) {
    summaryRoutineName.textContent =
      routine.name;
  }

  if (routineNameInput) {
    routineNameInput.value =
      routine.name;
  }

  if (routineDescriptionInput) {
    routineDescriptionInput.value =
      routine.description;
  }
}

async function saveRoutineInfo(
  event
) {
  event.preventDefault();

  const routineApi =
    window.JYMLog.routines;

  if (
    !routineApi ||
    !routineNameInput ||
    !routineDescriptionInput ||
    !saveRoutineInfoBtn
  ) {
    setRoutineEditorMessage(
      "루틴 편집 기능을 불러오지 못했습니다.",
      "error"
    );

    return;
  }

  saveRoutineInfoBtn.disabled = true;
  routineNameInput.disabled = true;
  routineDescriptionInput.disabled = true;

  saveRoutineInfoBtn.textContent =
    "저장 중...";

  setRoutineEditorMessage(
    "루틴 정보를 저장하고 있습니다."
  );

  try {
    const routine =
      await routineApi
        .updateActiveRoutineMetadata(
          routineNameInput.value,
          routineDescriptionInput.value
        );

    renderRoutineMetadata(
      routine
    );

    onRoutineChanged(routine);

    setRoutineEditorMessage(
      "루틴 정보가 저장되었습니다.",
      "success"
    );

    toast(
      "루틴 정보가 저장되었습니다."
    );
  } catch (error) {
    console.error(
      "[JYM Log] 루틴 정보 저장 실패",
      error
    );

    setRoutineEditorMessage(
      error.message ||
      "루틴 정보를 저장하지 못했습니다.",
      "error"
    );
  } finally {
    saveRoutineInfoBtn.disabled = false;
    routineNameInput.disabled = false;
    routineDescriptionInput.disabled = false;

    saveRoutineInfoBtn.textContent =
      "루틴 정보 저장";
  }
}

function renderRoutine() {
  if (!routineListElement) {
    return;
  }

  routineListElement.innerHTML =
    exercises
      .map(
        (exercise, index) => {
          const isFirst =
            index === 0;

          const isLast =
            index ===
            exercises.length - 1;

          return `
            <div
              class="card routine-card"
              data-routine-index="${index}"
            >
              <button
                class="routine-drag-handle"
                type="button"
                tabindex="-1"
                data-drag-exercise-index="${index}"
                aria-label="${escapeHtml(
                  exercise.name
                )} 운동을 끌어서 순서 변경"
                title="끌어서 순서 변경"
              >
                <span
                  class="routine-grip"
                  aria-hidden="true"
                >
                  ⠿
                </span>

                <span
                  class="exercise-icon"
                  aria-hidden="true"
                >
                  ${escapeHtml(
                    exercise.icon
                  )}
                </span>
              </button>

              <div class="routine-card-copy">
                <h3>
                  ${escapeHtml(
                    exercise.name
                  )}
                </h3>

                <p>
                  ${exercise.weight}kg ·
                  ${exercise.sets}세트 ·
                  ${
                    exercise.min ===
                    exercise.max
                      ? exercise.min
                      : `${exercise.min}–${exercise.max}`
                  }회
                  · 휴식 ${exercise.rest}초
                </p>
              </div>

              <div class="routine-card-actions">
                <div
                  class="routine-order-buttons"
                  aria-label="${escapeHtml(
                    exercise.name
                  )} 순서 변경"
                >
                  <button
                    class="routine-order-btn"
                    type="button"
                    data-move-exercise="up"
                    data-exercise-index="${index}"
                    aria-label="위로 이동"
                    ${isFirst ? "disabled" : ""}
                  >
                    ↑
                  </button>

                  <button
                    class="routine-order-btn"
                    type="button"
                    data-move-exercise="down"
                    data-exercise-index="${index}"
                    aria-label="아래로 이동"
                    ${isLast ? "disabled" : ""}
                  >
                    ↓
                  </button>
                </div>

                <button
                  class="routine-edit-btn"
                  type="button"
                  data-edit-exercise-index="${index}"
                >
                  편집
                </button>
              </div>
            </div>
          `;
        }
      )
      .join("");
}

function setRoutineOrderBusy(
  isBusy
) {
  routineOrderSaving =
    isBusy;

  if (!routineListElement) {
    return;
  }

  routineListElement.setAttribute(
    "aria-busy",
    String(isBusy)
  );

  if (!isBusy) {
    return;
  }

  routineListElement
    .querySelectorAll("button")
    .forEach((button) => {
      button.disabled = true;
    });
}

async function moveExerciseByButton(
  exerciseIndex,
  direction
) {
  if (routineOrderSaving) {
    return;
  }

  const targetIndex =
    direction === "up"
      ? exerciseIndex - 1
      : exerciseIndex + 1;

  if (
    targetIndex < 0 ||
    targetIndex >= exercises.length
  ) {
    return;
  }

  const routineApi =
    window.JYMLog.routines;

  if (!routineApi) {
    toast(
      "루틴 기능을 불러오지 못했습니다."
    );

    return;
  }

  setRoutineOrderBusy(true);

  try {
    await routineApi
      .moveActiveRoutineExercise(
        exerciseIndex,
        direction
      );

    toast(
      "운동 순서가 변경되었습니다."
    );
  } catch (error) {
    console.error(
      "[JYM Log] 운동 순서 변경 실패",
      error
    );

    toast(
      error.message ||
      "운동 순서를 변경하지 못했습니다."
    );
  } finally {
    routineOrderSaving = false;

    if (routineListElement) {
      routineListElement.setAttribute(
        "aria-busy",
        "false"
      );
    }

    /*
     * 첫 번째·마지막 버튼의
     * 비활성 상태까지 다시 계산합니다.
     */
    renderRoutine();
  }
}

function cleanupRoutineDrag(
  restoreOriginalOrder = false
) {
  if (!routineDragState) {
    return;
  }

  const draggedCard =
    routineDragState.card;

  draggedCard.classList.remove(
    "is-dragging"
  );

  routineListElement?.classList.remove(
    "routine-list-dragging"
  );

  document.body.classList.remove(
    "routine-drag-active"
  );

  window.removeEventListener(
    "pointermove",
    handleRoutineDragMove
  );

  window.removeEventListener(
    "pointerup",
    finishRoutineDrag
  );

  window.removeEventListener(
    "pointercancel",
    cancelRoutineDrag
  );

  routineDragState = null;

  if (restoreOriginalOrder) {
    renderRoutine();
  }
}

function startRoutineDrag(
  event,
  dragHandle
) {
  if (
    routineOrderSaving ||
    routineDragState
  ) {
    return;
  }

  /*
   * 마우스 오른쪽 버튼 등으로는
   * 드래그를 시작하지 않습니다.
   */
  if (
    event.pointerType === "mouse" &&
    event.button !== 0
  ) {
    return;
  }

  if (
    workout.state.started &&
    !workout.state.completed
  ) {
    toast(
      "운동 진행 중에는 순서를 변경할 수 없습니다."
    );

    return;
  }

  const draggedCard =
    dragHandle.closest(
      "[data-routine-index]"
    );

  if (!draggedCard) {
    return;
  }

  event.preventDefault();

  routineDragState = {
    pointerId:
      event.pointerId,

    card:
      draggedCard,

    fromIndex:
      Number(
        draggedCard.dataset
          .routineIndex
      )
  };

  draggedCard.classList.add(
    "is-dragging"
  );

  routineListElement.classList.add(
    "routine-list-dragging"
  );

  document.body.classList.add(
    "routine-drag-active"
  );

  window.addEventListener(
    "pointermove",
    handleRoutineDragMove,
    {
      passive: false
    }
  );

  window.addEventListener(
    "pointerup",
    finishRoutineDrag
  );

  window.addEventListener(
    "pointercancel",
    cancelRoutineDrag
  );
}

function handleRoutineDragMove(
  event
) {
  if (
    !routineDragState ||
    event.pointerId !==
      routineDragState.pointerId
  ) {
    return;
  }

  event.preventDefault();

  /*
   * 화면 가장자리에 가까워지면
   * 긴 루틴에서도 자동 스크롤합니다.
   */
  const scrollEdge = 90;
  const scrollSpeed = 13;

  if (event.clientY < scrollEdge) {
    window.scrollBy(
      0,
      -scrollSpeed
    );
  } else if (
    event.clientY >
    window.innerHeight -
      scrollEdge
  ) {
    window.scrollBy(
      0,
      scrollSpeed
    );
  }

  const elementBelow =
    document.elementFromPoint(
      event.clientX,
      event.clientY
    );

  const targetCard =
    elementBelow?.closest(
      "[data-routine-index]"
    );

  const draggedCard =
    routineDragState.card;

  if (
    !targetCard ||
    targetCard === draggedCard ||
    !routineListElement.contains(
      targetCard
    )
  ) {
    return;
  }

  const targetRectangle =
    targetCard.getBoundingClientRect();

  const insertAfter =
    event.clientY >
    targetRectangle.top +
      targetRectangle.height / 2;

  const referenceElement =
    insertAfter
      ? targetCard.nextElementSibling
      : targetCard;

  if (
    referenceElement ===
    draggedCard
  ) {
    return;
  }

  routineListElement.insertBefore(
    draggedCard,
    referenceElement
  );
}

async function finishRoutineDrag(
  event
) {
  if (
    !routineDragState ||
    event.pointerId !==
      routineDragState.pointerId
  ) {
    return;
  }

  const {
    card,
    fromIndex
  } = routineDragState;

  const orderedCards = [
    ...routineListElement
      .querySelectorAll(
        "[data-routine-index]"
      )
  ];

  const targetIndex =
    orderedCards.indexOf(card);

  cleanupRoutineDrag(false);

  if (
    targetIndex < 0 ||
    targetIndex === fromIndex
  ) {
    renderRoutine();
    return;
  }

  const routineApi =
    window.JYMLog.routines;

  if (!routineApi) {
    renderRoutine();

    toast(
      "루틴 기능을 불러오지 못했습니다."
    );

    return;
  }

  setRoutineOrderBusy(true);

  try {
    await routineApi
      .reorderActiveRoutineExercises(
        fromIndex,
        targetIndex
      );

    toast(
      "운동 순서가 저장되었습니다."
    );
  } catch (error) {
    console.error(
      "[JYM Log] 드래그 순서 저장 실패",
      error
    );

    toast(
      error.message ||
      "운동 순서를 저장하지 못했습니다."
    );
  } finally {
    routineOrderSaving = false;

    if (routineListElement) {
      routineListElement.setAttribute(
        "aria-busy",
        "false"
      );
    }

    renderRoutine();
  }
}

function cancelRoutineDrag(
  event
) {
  if (
    !routineDragState ||
    event.pointerId !==
      routineDragState.pointerId
  ) {
    return;
  }

  cleanupRoutineDrag(true);
}

function setExerciseEditorMessage(
  message,
  isError = false
) {
  if (!exerciseEditorMessage) {
    return;
  }

  exerciseEditorMessage.textContent =
    message;

  exerciseEditorMessage.classList.toggle(
    "error",
    isError
  );
}

function syncExerciseTypeFields() {
  if (
    !exerciseTypeInput ||
    !exerciseMinRepsInput ||
    !exerciseMaxRepsInput
  ) {
    return;
  }

  const isFixed =
    exerciseTypeInput.value ===
    "고정 반복형";

  exerciseMaxRepsInput.disabled =
    isFixed;

  if (isFixed) {
    exerciseMaxRepsInput.value =
      exerciseMinRepsInput.value;
  }
}

function openExerciseEditor(
  exerciseIndex
) {
  if (
    workout.state.started &&
    !workout.state.completed
  ) {
    toast(
      "운동 진행 중에는 루틴을 수정할 수 없습니다."
    );

    return;
  }

  const exercise =
    exercises[exerciseIndex];

  if (!exercise) {
    toast(
      "편집할 운동을 찾을 수 없습니다."
    );

    return;
  }

  editingExerciseIndex =
    exerciseIndex;

  exerciseEditorMode =
    "edit";

  exerciseEditorTitle.textContent =
    exercise.name;

  exerciseNameInput.value =
    exercise.name;

  exerciseTypeInput.value =
    exercise.type;

  exerciseWeightInput.value =
    exercise.weight;

  exerciseSetsInput.value =
    exercise.sets;

  exerciseMinRepsInput.value =
    exercise.min;

  exerciseMaxRepsInput.value =
    exercise.max;

  exerciseRestInput.value =
    exercise.rest;

  exerciseIncrementInput.value =
    exercise.increment;

  saveExerciseEditorBtn.textContent =
    "운동 설정 저장";

  deleteExerciseEditorBtn.classList.remove(
    "hidden"
  );

  setExerciseEditorMessage(
    "변경한 설정은 다음 운동부터 적용됩니다."
  );

  syncExerciseTypeFields();

  exerciseEditorModal.classList.remove(
    "hidden"
  );

  document.body.style.overflow =
    "hidden";

  window.setTimeout(
    () => {
      exerciseNameInput.focus();
    },
    50
  );
}

function openExerciseCreator() {
  if (
    workout.state.started &&
    !workout.state.completed
  ) {
    toast(
      "운동 진행 중에는 운동을 추가할 수 없습니다."
    );

    return;
  }

  exerciseEditorMode =
    "create";

  editingExerciseIndex =
    null;

  exerciseEditorTitle.textContent =
    "새 운동 추가";

  exerciseNameInput.value =
    "";

  exerciseTypeInput.value =
    "반복 범위형";

  exerciseWeightInput.value =
    0;

  exerciseSetsInput.value =
    3;

  exerciseMinRepsInput.value =
    8;

  exerciseMaxRepsInput.value =
    12;

  exerciseRestInput.value =
    90;

  exerciseIncrementInput.value =
    2.5;

  saveExerciseEditorBtn.textContent =
    "운동 추가";

  deleteExerciseEditorBtn.classList.add(
    "hidden"
  );

  setExerciseEditorMessage(
    "새 운동의 기본 설정을 입력해 주세요."
  );

  syncExerciseTypeFields();

  exerciseEditorModal.classList.remove(
    "hidden"
  );

  document.body.style.overflow =
    "hidden";

  window.setTimeout(
    () => {
      exerciseNameInput.focus();
    },
    50
  );
}

function closeExerciseEditor() {
  exerciseEditorModal.classList.add(
    "hidden"
  );

  document.body.style.overflow = "";

  editingExerciseIndex = null;
  exerciseEditorMode = "edit";

  deleteExerciseEditorBtn.classList.add(
    "hidden"
  );

  saveExerciseEditorBtn.textContent =
    "운동 설정 저장";
}

async function saveExerciseEditor(
  event
) {
  event.preventDefault();

  if (
    exerciseEditorMode === "edit" &&
    editingExerciseIndex === null
  ) {
    return;
  }

  const routineApi =
    window.JYMLog.routines;

  if (!routineApi) {
    setExerciseEditorMessage(
      "루틴 기능을 불러오지 못했습니다.",
      true
    );

    return;
  }

  const exerciseInput = {
    name:
      exerciseNameInput.value,

    type:
      exerciseTypeInput.value,

    weight:
      exerciseWeightInput.value,

    sets:
      Number(
        exerciseSetsInput.value
      ),

    min:
      Number(
        exerciseMinRepsInput.value
      ),

    max:
      Number(
        exerciseMaxRepsInput.value
      ),

    rest:
      Number(
        exerciseRestInput.value
      ),

    increment:
      exerciseIncrementInput.value
  };

  saveExerciseEditorBtn.disabled =
    true;

  deleteExerciseEditorBtn.disabled =
    true;

  saveExerciseEditorBtn.textContent =
    exerciseEditorMode === "create"
      ? "추가 중..."
      : "저장 중...";

  setExerciseEditorMessage(
    exerciseEditorMode === "create"
      ? "새 운동을 추가하고 있습니다."
      : "운동 설정을 저장하고 있습니다."
  );

  try {
    if (
      exerciseEditorMode === "create"
    ) {
      await routineApi
        .addActiveRoutineExercise(
          exerciseInput
        );

      toast(
        "새 운동이 추가되었습니다."
      );
    } else {
      await routineApi
        .updateActiveRoutineExercise(
          editingExerciseIndex,
          exerciseInput
        );

      toast(
        "운동 설정이 저장되었습니다."
      );
    }

    closeExerciseEditor();
  } catch (error) {
    console.error(
      "[JYM Log] 운동 설정 처리 실패",
      error
    );

    setExerciseEditorMessage(
      error.message ||
      "운동 설정을 처리하지 못했습니다.",
      true
    );
  } finally {
    saveExerciseEditorBtn.disabled =
      false;

    deleteExerciseEditorBtn.disabled =
      false;

    if (
      !exerciseEditorModal.classList
        .contains("hidden")
    ) {
      saveExerciseEditorBtn.textContent =
        exerciseEditorMode === "create"
          ? "운동 추가"
          : "운동 설정 저장";
    }
  }
}

async function deleteExerciseFromRoutine() {
  if (
    exerciseEditorMode !== "edit" ||
    editingExerciseIndex === null
  ) {
    return;
  }

  const exercise =
    exercises[editingExerciseIndex];

  if (!exercise) {
    setExerciseEditorMessage(
      "삭제할 운동을 찾을 수 없습니다.",
      true
    );

    return;
  }

  const confirmed =
    window.confirm(
      `"${exercise.name}" 운동을 루틴에서 삭제할까요?\n\n기존에 완료된 과거 운동 기록은 삭제되지 않습니다.`
    );

  if (!confirmed) {
    return;
  }

  const routineApi =
    window.JYMLog.routines;

  if (!routineApi) {
    setExerciseEditorMessage(
      "루틴 기능을 불러오지 못했습니다.",
      true
    );

    return;
  }

  deleteExerciseEditorBtn.disabled =
    true;

  saveExerciseEditorBtn.disabled =
    true;

  deleteExerciseEditorBtn.textContent =
    "삭제 중...";

  setExerciseEditorMessage(
    "운동을 삭제하고 있습니다."
  );

  try {
    await routineApi
      .deleteActiveRoutineExercise(
        editingExerciseIndex
      );

    toast(
      `"${exercise.name}" 운동이 삭제되었습니다.`
    );

    closeExerciseEditor();
  } catch (error) {
    console.error(
      "[JYM Log] 운동 삭제 실패",
      error
    );

    setExerciseEditorMessage(
      error.message ||
      "운동을 삭제하지 못했습니다.",
      true
    );
  } finally {
    deleteExerciseEditorBtn.disabled =
      false;

    saveExerciseEditorBtn.disabled =
      false;

    deleteExerciseEditorBtn.textContent =
      "이 운동 삭제";
  }
}



function handleRoutineListClick(
  event
) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const exerciseMoveButton =
    event.target.closest(
      "[data-move-exercise]"
    );

  if (exerciseMoveButton) {
    void moveExerciseByButton(
      Number(
        exerciseMoveButton.dataset
          .exerciseIndex
      ),
      exerciseMoveButton.dataset
        .moveExercise
    );

    return;
  }

  const exerciseEditButton =
    event.target.closest(
      "[data-edit-exercise-index]"
    );

  if (exerciseEditButton) {
    openExerciseEditor(
      Number(
        exerciseEditButton.dataset
          .editExerciseIndex
      )
    );
  }
}

function handleRoutinePointerDown(
  event
) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const dragHandle =
    event.target.closest(
      "[data-drag-exercise-index]"
    );

  if (!dragHandle) {
    return;
  }

  startRoutineDrag(
    event,
    dragHandle
  );
}

function refresh(
  routine =
    window.JYMLog.routines
      ?.activeRoutine
) {
  renderRoutineMetadata(
    routine
  );

  renderRoutine();
}

function initialize(options = {}) {
  if (initialized) {
    return;
  }

  initialized = true;

  if (
    typeof options.toast ===
    "function"
  ) {
    showToast = options.toast;
  }

  if (
    typeof options.onRoutineChanged ===
    "function"
  ) {
    onRoutineChanged =
      options.onRoutineChanged;
  }

  if (routineListElement) {
    routineListElement.addEventListener(
      "click",
      handleRoutineListClick
    );

    routineListElement.addEventListener(
      "pointerdown",
      handleRoutinePointerDown
    );
  }

  if (routineInfoForm) {
    routineInfoForm.addEventListener(
      "submit",
      saveRoutineInfo
    );
  }

  if (exerciseEditorForm) {
    exerciseEditorForm.addEventListener(
      "submit",
      saveExerciseEditor
    );
  }

  if (exerciseTypeInput) {
    exerciseTypeInput.addEventListener(
      "change",
      syncExerciseTypeFields
    );
  }

  if (exerciseMinRepsInput) {
    exerciseMinRepsInput.addEventListener(
      "input",
      () => {
        if (
          exerciseTypeInput.value ===
          "고정 반복형"
        ) {
          exerciseMaxRepsInput.value =
            exerciseMinRepsInput.value;
        }
      }
    );
  }

  if (cancelExerciseEditorBtn) {
    cancelExerciseEditorBtn.addEventListener(
      "click",
      closeExerciseEditor
    );
  }

  if (closeExerciseEditorBtn) {
    closeExerciseEditorBtn.addEventListener(
      "click",
      closeExerciseEditor
    );
  }

  if (exerciseEditorModal) {
    exerciseEditorModal.addEventListener(
      "click",
      (event) => {
        if (
          event.target ===
          exerciseEditorModal
        ) {
          closeExerciseEditor();
        }
      }
    );
  }

  if (addExerciseBtn) {
    addExerciseBtn.addEventListener(
      "click",
      openExerciseCreator
    );
  }

  if (deleteExerciseEditorBtn) {
    deleteExerciseEditorBtn.addEventListener(
      "click",
      deleteExerciseFromRoutine
    );
  }

  window.addEventListener(
    "jym-log:routine-ready",
    (event) => {
      const routine =
        event.detail?.routine;

      refresh(routine);
      onRoutineChanged(routine);

      console.info(
        "[JYM Log] 사용자 루틴 화면 반영 완료"
      );
    }
  );

  refresh();
}

window.JYMLog.routineUI = {
  initialize,
  refresh,
  render: renderRoutine,
  renderMetadata:
    renderRoutineMetadata
};
})();
