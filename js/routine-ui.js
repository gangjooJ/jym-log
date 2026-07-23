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

const routineSelector =
  document.getElementById(
    "routineSelector"
  );

const createRoutineBtn =
  document.getElementById(
    "createRoutineBtn"
  );

const duplicateRoutineBtn =
  document.getElementById(
    "duplicateRoutineBtn"
  );

const deleteRoutineBtn =
  document.getElementById(
    "deleteRoutineBtn"
  );

const routineLibraryMessage =
  document.getElementById(
    "routineLibraryMessage"
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

const exerciseProgressionHelp =
  document.getElementById(
    "exerciseProgressionHelp"
  );

const exerciseSuccessRuleField =
  document.getElementById(
    "exerciseSuccessRuleField"
  );

const exerciseRequiredSuccessesInput =
  document.getElementById(
    "exerciseRequiredSuccessesInput"
  );

const exerciseStageEditor =
  document.getElementById(
    "exerciseStageEditor"
  );

const exerciseStageList =
  document.getElementById(
    "exerciseStageList"
  );

const addExerciseStageBtn =
  document.getElementById(
    "addExerciseStageBtn"
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

const layerManager =
  window.JYMLog.layerManager;

let editingExerciseIndex = null;
let exerciseEditorMode = "edit";
let exerciseStageDrafts = [];

let routineOrderSaving = false;
let routineDragState = null;

let routineLibraryBusy =
  false;
let initialized = false;

let showToast = () => {};

let onRoutineChanged = () => {};

let exerciseEditorBusy =
  false;

function setExerciseEditorBusy(
  isBusy
) {
  exerciseEditorBusy =
    Boolean(isBusy);

  exerciseEditorModal
    ?.setAttribute(
      "aria-busy",
      String(
        exerciseEditorBusy
      )
    );
}

function syncNumericScrubbers() {
  window.JYMLog
    .numericScrubber
    ?.syncAll?.(
      exerciseEditorForm
    );
}

function showExerciseEditorLayer() {
  if (layerManager) {
    const opened =
      layerManager.open(
        "exercise-editor"
      );

    if (!opened) {
      toast(
        "열려 있는 창을 닫은 뒤 다시 시도해 주세요."
      );
    }

    return opened;
  }

  exerciseEditorModal
    ?.classList.remove(
      "hidden"
    );

  exerciseNameInput
    ?.focus();

  return true;
}

function toast(message) {
  showToast(message);
}

function setRoutineLibraryMessage(
  message,
  status = "default"
) {
  if (!routineLibraryMessage) {
    return;
  }

  routineLibraryMessage.textContent =
    message;

  routineLibraryMessage.classList.toggle(
    "success",
    status === "success"
  );

  routineLibraryMessage.classList.toggle(
    "error",
    status === "error"
  );
}

function setRoutineLibraryBusy(
  isBusy
) {
  routineLibraryBusy =
    isBusy;

  if (routineSelector) {
    routineSelector.disabled =
      isBusy;
  }

  if (createRoutineBtn) {
    createRoutineBtn.disabled =
      isBusy;
  }

  if (duplicateRoutineBtn) {
    duplicateRoutineBtn.disabled =
      isBusy;
  }

  if (deleteRoutineBtn) {
    deleteRoutineBtn.disabled =
      isBusy ||
      !window.JYMLog.routines
        ?.canDeleteActiveRoutine;
  }
}

function renderRoutineLibrary(
  routine =
    window.JYMLog.routines
      ?.activeRoutine,

  routines =
    window.JYMLog.routines
      ?.routines,

  updateMessage = true
) {
  if (!routineSelector) {
    return;
  }

  const routineList =
    Array.isArray(routines)
      ? routines
      : [];

  routineSelector.innerHTML =
    routineList
      .map(
        (item) => `
          <option
            value="${escapeHtml(
              item.id
            )}"
          >
            ${escapeHtml(
              item.name
            )}
          </option>
        `
      )
      .join("");

  if (routine?.id) {
    routineSelector.value =
      routine.id;
  }

  routineSelector.disabled =
    routineLibraryBusy ||
    routineList.length <= 1;

  if (duplicateRoutineBtn) {
    duplicateRoutineBtn.disabled =
      routineLibraryBusy ||
      !routine;
  }

  if (deleteRoutineBtn) {
    deleteRoutineBtn.disabled =
      routineLibraryBusy ||
      !window.JYMLog.routines
        ?.canDeleteActiveRoutine;
  }

  if (
    updateMessage &&
    routineList.length > 0
  ) {
    setRoutineLibraryMessage(
      `${routineList.length}개 루틴 중 "${routine?.name || "루틴"}"을 사용하고 있습니다.`
    );
  }
}

async function changeActiveRoutine() {
  if (
    routineLibraryBusy ||
    !routineSelector
  ) {
    return;
  }

  const routineApi =
    window.JYMLog.routines;

  const previousRoutineId =
    routineApi?.activeRoutineId ||
    "";

  const nextRoutineId =
    routineSelector.value;

  if (
    !routineApi ||
    nextRoutineId ===
      previousRoutineId
  ) {
    return;
  }

  setRoutineLibraryBusy(true);

  setRoutineLibraryMessage(
    "선택한 루틴으로 전환하고 있습니다."
  );

  let finalMessage = "";
  let finalStatus = "default";

  try {
    const routine =
      await routineApi
        .switchActiveRoutine(
          nextRoutineId
        );

    finalMessage =
      `"${routine.name}" 루틴으로 전환했습니다.`;

    finalStatus = "success";

    toast(
      finalMessage
    );
  } catch (error) {
    console.error(
      "[JYM Log] 루틴 전환 실패",
      error
    );

    routineSelector.value =
      previousRoutineId;

    finalMessage =
      error.message ||
      "루틴을 전환하지 못했습니다.";

    finalStatus = "error";

    toast(
      finalMessage
    );
  } finally {
    setRoutineLibraryBusy(false);

    /*
     * 목록과 선택값만 다시 그립니다.
     * 오류·성공 메시지는 덮어쓰지 않습니다.
     */
    renderRoutineLibrary(
      undefined,
      undefined,
      false
    );

    if (finalMessage) {
      setRoutineLibraryMessage(
        finalMessage,
        finalStatus
      );
    }
  }
}

async function createNewRoutine() {
  if (routineLibraryBusy) {
    return;
  }

  const routineApi =
    window.JYMLog.routines;

  if (!routineApi) {
    return;
  }

  const name =
    window.prompt(
      "새 루틴 이름을 입력해 주세요.",
      "새 운동 루틴"
    );

  if (name === null) {
    return;
  }

  setRoutineLibraryBusy(true);

  setRoutineLibraryMessage(
    "새 루틴을 만들고 있습니다."
  );

  try {
    const routine =
      await routineApi
        .createRoutine(
          name,
          "사용자 설정 루틴"
        );

    setRoutineLibraryMessage(
      `"${routine.name}" 루틴을 만들었습니다.`,
      "success"
    );

    toast(
      `"${routine.name}" 루틴이 생성되었습니다.`
    );
  } catch (error) {
    console.error(
      "[JYM Log] 새 루틴 생성 실패",
      error
    );

    setRoutineLibraryMessage(
      error.message ||
      "새 루틴을 만들지 못했습니다.",
      "error"
    );
  } finally {
    setRoutineLibraryBusy(false);

    renderRoutineLibrary(
      undefined,
      undefined,
      false
    );
  }
}

async function duplicateCurrentRoutine() {
  if (routineLibraryBusy) {
    return;
  }

  const routineApi =
    window.JYMLog.routines;

  const currentRoutine =
    routineApi?.activeRoutine;

  if (!currentRoutine) {
    return;
  }

  const rawSuggestedName =
    `${currentRoutine.name} 복사본`;

  const suggestedName =
    Array.from(
      rawSuggestedName
    )
      .slice(0, 30)
      .join("");

  const name =
    window.prompt(
      "복제할 루틴의 이름을 입력해 주세요.",
      suggestedName
    );

  if (name === null) {
    return;
  }

  setRoutineLibraryBusy(true);

  setRoutineLibraryMessage(
    "현재 루틴을 복제하고 있습니다."
  );

  try {
    const routine =
      await routineApi
        .duplicateActiveRoutine(
          name
        );

    setRoutineLibraryMessage(
      `"${routine.name}" 루틴을 만들었습니다.`,
      "success"
    );

    toast(
      `"${currentRoutine.name}" 루틴을 복제했습니다.`
    );
  } catch (error) {
    console.error(
      "[JYM Log] 루틴 복제 실패",
      error
    );

    setRoutineLibraryMessage(
      error.message ||
      "루틴을 복제하지 못했습니다.",
      "error"
    );
  } finally {
    setRoutineLibraryBusy(false);

    renderRoutineLibrary(
      undefined,
      undefined,
      false
    );
  }
}

async function deleteCurrentRoutine() {
  if (routineLibraryBusy) {
    return;
  }

  const routineApi =
    window.JYMLog.routines;

  const currentRoutine =
    routineApi?.activeRoutine;

  if (!currentRoutine) {
    return;
  }

  if (
    !routineApi
      .canDeleteActiveRoutine
  ) {
    const message =
      currentRoutine.id === "main"
        ? "기본 루틴은 삭제할 수 없습니다."
        : "마지막 남은 루틴은 삭제할 수 없습니다.";

    setRoutineLibraryMessage(
      message,
      "error"
    );

    toast(message);
    return;
  }

  const confirmed =
    window.confirm(
      [
        `"${currentRoutine.name}" 루틴을 삭제할까요?`,
        "",
        "루틴에 설정된 운동과 진행 단계가 삭제됩니다.",
        "완료된 과거 운동 기록은 유지됩니다."
      ].join("\n")
    );

  if (!confirmed) {
    return;
  }

  setRoutineLibraryBusy(true);

  setRoutineLibraryMessage(
    "루틴을 삭제하고 있습니다."
  );

  let finalMessage = "";
  let finalStatus = "default";

  try {
    const result =
      await routineApi
        .deleteActiveRoutine();

    finalMessage =
      `"${result.deletedRoutine.name}" 루틴을 삭제하고 "${result.activeRoutine.name}" 루틴으로 전환했습니다.`;

    finalStatus = "success";

    toast(
      `"${result.deletedRoutine.name}" 루틴을 삭제했습니다.`
    );
  } catch (error) {
    console.error(
      "[JYM Log] 루틴 삭제 실패",
      error
    );

    finalMessage =
      error.message ||
      "루틴을 삭제하지 못했습니다.";

    finalStatus = "error";

    toast(finalMessage);
  } finally {
    setRoutineLibraryBusy(false);

    renderRoutineLibrary(
      undefined,
      undefined,
      false
    );

    if (finalMessage) {
      setRoutineLibraryMessage(
        finalMessage,
        finalStatus
      );
    }
  }
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

          const catalog =
            window.JYMLog
              .exerciseCatalog;

          const equipmentLabel =
            catalog
              ?.getEquipmentLabel(
                exercise.equipment
              ) ||
            "기타";

          const increment =
            Number(
              exercise.increment
            ) || 0;

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
                  ${escapeHtml(
                    equipmentLabel
                  )} ·
                  ${exercise.weight}kg ·
                  ${exercise.sets}세트 ·
                  ${
                    exercise.min ===
                    exercise.max
                      ? exercise.min
                      : `${exercise.min}–${exercise.max}`
                  }회
                  · 조절 ${increment}kg
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

function getExerciseStrategy(exercise) {
  const strategy =
    exercise?.progressionPolicy
      ?.strategy;

  if (
    [
      "load",
      "rep-range",
      "stage",
      "manual"
    ].includes(strategy)
  ) {
    return strategy;
  }

  if (exercise?.type === "반복 단계형") {
    return "stage";
  }

  if (exercise?.type === "수동 관리형") {
    return "manual";
  }

  return exercise?.type ===
    "고정 반복형"
    ? "load"
    : "rep-range";
}

function formatStageTargets(targets) {
  return (Array.isArray(targets) ? targets : [])
    .join(" / ");
}

function parseStageTargets(value) {
  const parts = String(value || "")
    .trim()
    .split(/[\\s,\\/]+/)
    .filter(Boolean)
    .map(Number);

  if (
    parts.length < 1 ||
    parts.length > 20 ||
    parts.some(
      (part) =>
        !Number.isInteger(part) ||
        part < 1 ||
        part > 100
    )
  ) {
    throw new Error(
      "각 단계는 1~20개의 반복 수를 1~100 사이 정수로 입력해 주세요."
    );
  }

  return parts;
}

function createDefaultStageTargets() {
  const setCount = Math.max(
    1,
    Number(exerciseSetsInput?.value) || 3
  );
  const reps = Math.max(
    1,
    Number(exerciseMinRepsInput?.value) || 5
  );

  return Array.from(
    { length: setCount },
    () => reps
  );
}

function renderExerciseStages() {
  if (!exerciseStageList) {
    return;
  }

  exerciseStageList.innerHTML =
    exerciseStageDrafts
      .map(
        (stage, index) => `
          <div
            class="progression-stage-row"
            data-stage-index="${index}"
          >
            <span class="progression-stage-number">
              ${index + 1}
            </span>

            <input
              class="progression-stage-target-input"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              data-stage-target-index="${index}"
              aria-label="${index + 1}단계 세트별 반복 목표"
              value="${escapeHtml(
                formatStageTargets(
                  stage.setTargets
                )
              )}"
            >

            <div class="progression-stage-actions">
              <button
                class="progression-stage-action"
                type="button"
                data-stage-action="up"
                data-stage-index="${index}"
                aria-label="${index + 1}단계를 위로 이동"
                ${index === 0 ? "disabled" : ""}
              >↑</button>

              <button
                class="progression-stage-action"
                type="button"
                data-stage-action="down"
                data-stage-index="${index}"
                aria-label="${index + 1}단계를 아래로 이동"
                ${index === exerciseStageDrafts.length - 1 ? "disabled" : ""}
              >↓</button>

              <button
                class="progression-stage-action"
                type="button"
                data-stage-action="delete"
                data-stage-index="${index}"
                aria-label="${index + 1}단계 삭제"
                ${exerciseStageDrafts.length <= 1 ? "disabled" : ""}
              >×</button>
            </div>
          </div>
        `
      )
      .join("");
}

function syncStageDerivedFields() {
  if (exerciseStageDrafts.length === 0) {
    return;
  }

  const targets =
    exerciseStageDrafts.flatMap(
      (stage) => stage.setTargets
    );

  exerciseSetsInput.value =
    exerciseStageDrafts[0]
      .setTargets.length;
  exerciseMinRepsInput.value =
    Math.min(...targets);
  exerciseMaxRepsInput.value =
    Math.max(...targets);

  syncNumericScrubbers();
}

function syncExerciseTypeFields() {
  if (
    !exerciseTypeInput ||
    !exerciseMinRepsInput ||
    !exerciseMaxRepsInput
  ) {
    return;
  }

  const strategy =
    exerciseTypeInput.value;
  const isLoad = strategy === "load";
  const isStage = strategy === "stage";
  const isManual = strategy === "manual";

  exerciseStageEditor?.classList.toggle(
    "hidden",
    !isStage
  );

  if (exerciseSuccessRuleField) {
    exerciseSuccessRuleField.classList.toggle(
      "hidden",
      isManual
    );
  }

  exerciseRequiredSuccessesInput.disabled =
    isManual;
  exerciseIncrementInput.disabled =
    false;
  exerciseSetsInput.disabled =
    isStage;
  exerciseMinRepsInput.disabled =
    isStage;
  exerciseMaxRepsInput.disabled =
    isStage || isLoad;

  if (isLoad) {
    exerciseMaxRepsInput.value =
      exerciseMinRepsInput.value;
  }

  if (isStage) {
    if (exerciseStageDrafts.length === 0) {
      exerciseStageDrafts = [{
        id: "stage-1",
        label: "1단계",
        setTargets:
          createDefaultStageTargets()
      }];
    }

    renderExerciseStages();
    syncStageDerivedFields();
  }

  if (exerciseProgressionHelp) {
    const help = {
      load:
        "정해진 세트와 반복을 달성하면 설정한 중량만큼 증가합니다.",
      "rep-range":
        "모든 세트가 최대 반복에 도달하면 중량을 증가합니다.",
      stage:
        "현재 반복 단계를 달성하면 다음 단계로 이동하고, 최종 단계에서 중량을 증가합니다.",
      manual:
        "자동 증량 추천은 사용하지 않습니다. 중량 조절 간격은 운동 화면의 중량 변경 단위로 사용됩니다."
    };

    exerciseProgressionHelp.textContent =
      help[strategy] || help.load;
  }

  syncNumericScrubbers();
}

function readExerciseStageDrafts() {
  if (
    exerciseTypeInput.value !== "stage"
  ) {
    return [];
  }

  const inputs =
    exerciseStageList?.querySelectorAll(
      "[data-stage-target-index]"
    ) || [];

  const stages =
    [...inputs].map(
      (input, index) => ({
        id: `stage-${index + 1}`,
        label: `${index + 1}단계`,
        setTargets:
          parseStageTargets(
            input.value
          )
      })
    );

  const setCount =
    stages[0]?.setTargets.length;

  if (
    stages.some(
      (stage) =>
        stage.setTargets.length !==
        setCount
    )
  ) {
    throw new Error(
      "모든 반복 단계는 같은 세트 수를 사용해야 합니다."
    );
  }

  exerciseStageDrafts = stages;
  syncStageDerivedFields();
  return stages;
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

  const exerciseStrategy =
    getExerciseStrategy(exercise);

  exerciseTypeInput.value =
    exerciseStrategy;

  exerciseRequiredSuccessesInput.value =
    exercise.progressionPolicy
      ?.requiredSuccesses ||
    (exerciseStrategy === "stage" ? 1 : 2);

  exerciseStageDrafts =
    exerciseStrategy === "stage"
      ? exercise.progressionPolicy
          .stages.map(
            (stage, index) => ({
              id:
                stage.id ||
                `stage-${index + 1}`,
              label:
                stage.label ||
                `${index + 1}단계`,
              setTargets:
                [...stage.setTargets]
            })
          )
      : [{
          id: "stage-1",
          label: "1단계",
          setTargets:
            Array.from(
              { length: exercise.sets },
              () => exercise.min
            )
        }];

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

  window.JYMLog
    .exerciseCatalogUI
    ?.openForExercise?.(
      exercise
    );

  syncNumericScrubbers();

  saveExerciseEditorBtn.textContent =
    "운동 설정 저장";

  deleteExerciseEditorBtn.classList.remove(
    "hidden"
  );

  setExerciseEditorMessage(
    "변경한 설정은 다음 운동부터 적용됩니다."
  );

  syncExerciseTypeFields();

  showExerciseEditorLayer();
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
    "rep-range";

  exerciseRequiredSuccessesInput.value =
    2;

  exerciseStageDrafts = [{
    id: "stage-1",
    label: "1단계",
    setTargets: [5, 5, 5]
  }];

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

  window.JYMLog
    .exerciseCatalogUI
    ?.openForCreate?.();

  syncNumericScrubbers();

  saveExerciseEditorBtn.textContent =
    "운동 추가";

  deleteExerciseEditorBtn.classList.add(
    "hidden"
  );

  setExerciseEditorMessage(
    "새 운동의 기본 설정을 입력해 주세요."
  );

  syncExerciseTypeFields();

  showExerciseEditorLayer();
}

function closeExerciseEditor(
  options = {}
) {
  if (
    layerManager?.isOpen(
      "exercise-editor"
    )
  ) {
    layerManager.close(
      "exercise-editor",
      options
    );
  } else {
    exerciseEditorModal
      ?.classList.add(
        "hidden"
      );
  }

  editingExerciseIndex =
    null;

  exerciseEditorMode =
    "edit";

  exerciseStageDrafts =
    [];

  deleteExerciseEditorBtn
    ?.classList.add(
      "hidden"
    );

  if (
    saveExerciseEditorBtn
  ) {
    saveExerciseEditorBtn
      .textContent =
        "운동 설정 저장";
  }
}

function requestCloseExerciseEditor() {
  if (exerciseEditorBusy) {
    return false;
  }

  closeExerciseEditor();

  return true;
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

  let progressionStages;

  try {
    progressionStages =
      readExerciseStageDrafts();
  } catch (error) {
    setExerciseEditorMessage(
      error.message,
      true
    );
    return;
  }

  const strategy =
    exerciseTypeInput.value;

  const typeLabels = {
    load: "고정 반복형",
    "rep-range": "반복 범위형",
    stage: "반복 단계형",
    manual: "수동 관리형"
  };

  const catalogDraft =
    window.JYMLog
      .exerciseCatalogUI
      ?.getDraft?.() || {
        templateId: "",
        equipment: "other",
        primaryBodyPart:
          "other",
        source: "custom"
      };

  const exerciseInput = {
    templateId:
      catalogDraft
        .templateId,

    equipment:
      catalogDraft
        .equipment,

    primaryBodyPart:
      catalogDraft
        .primaryBodyPart,

    source:
      catalogDraft
        .source,

    name:
      exerciseNameInput.value,

    type:
      typeLabels[strategy],

    progressionStrategy:
      strategy,

    requiredSuccesses:
      Number(
        exerciseRequiredSuccessesInput
          .value
      ) || 1,

    progressionStages,

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
    setExerciseEditorBusy(
      false
    );

    saveExerciseEditorBtn.disabled =
      false;

    deleteExerciseEditorBtn.disabled =
      false;

    if (
      !exerciseEditorModal
        .classList
        .contains("hidden")
    ) {
      saveExerciseEditorBtn.textContent =
        exerciseEditorMode ===
        "create"
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

  setExerciseEditorBusy(
    true
  );

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

    setExerciseEditorBusy(
      false
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
      ?.activeRoutine,

  routines =
    window.JYMLog.routines
      ?.routines
) {
  renderRoutineLibrary(
    routine,
    routines
  );

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

  window.JYMLog
    .exerciseCatalogUI
    ?.initialize?.();

  window.JYMLog
    .numericScrubber
    ?.enhanceAll?.(
      exerciseEditorForm
    );

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

  if (routineSelector) {
    routineSelector.addEventListener(
      "change",
      () => {
        void changeActiveRoutine();
      }
    );
  }

  if (createRoutineBtn) {
    createRoutineBtn.addEventListener(
      "click",
      () => {
        void createNewRoutine();
      }
    );
  }

  if (duplicateRoutineBtn) {
    duplicateRoutineBtn.addEventListener(
      "click",
      () => {
        void duplicateCurrentRoutine();
      }
    );
  }

  if (deleteRoutineBtn) {
    deleteRoutineBtn.addEventListener(
      "click",
      () => {
        void deleteCurrentRoutine();
      }
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
          "load"
        ) {
          exerciseMaxRepsInput.value =
            exerciseMinRepsInput.value;
        }
      }
    );
  }

  if (exerciseStageList) {
    exerciseStageList.addEventListener(
      "input",
      (event) => {
        const input =
          event.target.closest(
            "[data-stage-target-index]"
          );

        if (!input) {
          return;
        }

        const stageIndex =
          Number(
            input.dataset
              .stageTargetIndex
          );

        try {
          exerciseStageDrafts[
            stageIndex
          ].setTargets =
            parseStageTargets(
              input.value
            );
          syncStageDerivedFields();
          setExerciseEditorMessage(
            "반복 단계 설정을 편집하고 있습니다."
          );
        } catch {
          // 입력 중에는 완성되지 않은 값을 허용하고 저장 시 검증합니다.
        }
      }
    );

    layerManager?.register({
      id: "exercise-editor",

      element:
        exerciseEditorModal,

      hiddenClass:
        "hidden",

      initialFocus:
        "#exerciseCatalogSearchInput",

      closeOnBackdrop:
        true,

      canClose:
        () =>
          !exerciseEditorBusy,

      onRequestClose:
        requestCloseExerciseEditor
    });

    exerciseStageList.addEventListener(
      "click",
      (event) => {
        const button =
          event.target.closest(
            "[data-stage-action]"
          );

        if (!button) {
          return;
        }

        const stageIndex = Number(
          button.dataset.stageIndex
        );
        const action =
          button.dataset.stageAction;

        if (action === "delete") {
          if (exerciseStageDrafts.length <= 1) {
            return;
          }
          exerciseStageDrafts.splice(
            stageIndex,
            1
          );
        } else {
          const targetIndex =
            action === "up"
              ? stageIndex - 1
              : stageIndex + 1;

          if (
            targetIndex < 0 ||
            targetIndex >=
              exerciseStageDrafts.length
          ) {
            return;
          }

          const [stage] =
            exerciseStageDrafts.splice(
              stageIndex,
              1
            );
          exerciseStageDrafts.splice(
            targetIndex,
            0,
            stage
          );
        }

        exerciseStageDrafts =
          exerciseStageDrafts.map(
            (stage, index) => ({
              ...stage,
              id: `stage-${index + 1}`,
              label: `${index + 1}단계`
            })
          );

        renderExerciseStages();
        syncStageDerivedFields();
      }
    );
  }

  if (addExerciseStageBtn) {
    addExerciseStageBtn.addEventListener(
      "click",
      () => {
        if (
          exerciseStageDrafts.length >= 12
        ) {
          setExerciseEditorMessage(
            "반복 단계는 최대 12개까지 추가할 수 있습니다.",
            true
          );
          return;
        }

        const previousTargets =
          exerciseStageDrafts[
            exerciseStageDrafts.length - 1
          ]?.setTargets ||
          createDefaultStageTargets();

        exerciseStageDrafts.push({
          id:
            `stage-${exerciseStageDrafts.length + 1}`,
          label:
            `${exerciseStageDrafts.length + 1}단계`,
          setTargets:
            previousTargets.map(
              (target) =>
                Math.min(100, target + 1)
            )
        });

        renderExerciseStages();
        syncStageDerivedFields();
      }
    );
  }

  if (cancelExerciseEditorBtn) {
    cancelExerciseEditorBtn.addEventListener(
      "click",
      requestCloseExerciseEditor
    );
  }

  if (closeExerciseEditorBtn) {
    closeExerciseEditorBtn.addEventListener(
      "click",
      requestCloseExerciseEditor
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

      const routines =
        event.detail?.routines;

      refresh(
        routine,
        routines
      );
      onRoutineChanged(routine);
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

