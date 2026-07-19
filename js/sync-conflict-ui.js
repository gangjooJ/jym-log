(() => {
  const workout =
    window.JYMLog.workout;

  const exercises =
    workout.exercises;

  const syncStatus =
    document.getElementById(
      "syncStatus"
    );

  const syncStatusText =
    document.getElementById(
      "syncStatusText"
    );

  const syncConflictModal =
    document.getElementById(
      "syncConflictModal"
    );

  const closeSyncConflictBtn =
    document.getElementById(
      "closeSyncConflictBtn"
    );

  const syncConflictLocalStatus =
    document.getElementById(
      "syncConflictLocalStatus"
    );

  const syncConflictLocalDetail =
    document.getElementById(
      "syncConflictLocalDetail"
    );

  const syncConflictLocalDifference =
    document.getElementById(
      "syncConflictLocalDifference"
    );

  const syncConflictCloudStatus =
    document.getElementById(
      "syncConflictCloudStatus"
    );

  const syncConflictCloudDetail =
    document.getElementById(
      "syncConflictCloudDetail"
    );

  const syncConflictCloudDifference =
    document.getElementById(
      "syncConflictCloudDifference"
    );

  const syncConflictMessage =
    document.getElementById(
      "syncConflictMessage"
    );

  const useCloudConflictBtn =
    document.getElementById(
      "useCloudConflictBtn"
    );

  const useLocalConflictBtn =
    document.getElementById(
      "useLocalConflictBtn"
    );

  let initialized = false;

  let resolutionInProgress =
    false;

  let previousFocus =
    null;

  let showToast =
    () => {};

  let handleResolved =
    () => {};

  function updateStatus(
    status,
    message
  ) {
    if (
      !syncStatus ||
      !syncStatusText
    ) {
      return;
    }

    syncStatus.dataset.state =
      status;

    syncStatusText.textContent =
      message;

    syncStatus.setAttribute(
      "aria-label",
      `클라우드 동기화 상태: ${message}`
    );

    const canOpenConflict =
      status === "conflict";

    syncStatus.classList.toggle(
      "is-actionable",
      canOpenConflict
    );

    if (canOpenConflict) {
      syncStatus.setAttribute(
        "role",
        "button"
      );

      syncStatus.setAttribute(
        "tabindex",
        "0"
      );

      syncStatus.setAttribute(
        "title",
        "동기화 충돌 기록 선택 열기"
      );

      return;
    }

    syncStatus.setAttribute(
      "role",
      "status"
    );

    syncStatus.removeAttribute(
      "tabindex"
    );

    syncStatus.removeAttribute(
      "title"
    );
  }

  function formatConflictTime(
    timestamp
  ) {
    const timestampNumber =
      Number(timestamp);

    if (
      !Number.isFinite(
        timestampNumber
      ) ||
      timestampNumber <= 0
    ) {
      return "수정 시각 정보 없음";
    }

    return new Intl.DateTimeFormat(
      window.JYMLog.config.locale,
      {
        timeZone:
          window.JYMLog.config
            .timezone,

        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }
    ).format(
      new Date(timestampNumber)
    );
  }

  function getConflictSummary(
    conflictState,
    updatedAt
  ) {
    if (!conflictState) {
      return {
        status:
          "저장된 운동 기록 없음",

        detail:
          "이 위치에는 사용할 수 있는 운동 상태가 없습니다."
      };
    }

    const completedSets =
      Object.values(
        conflictState.sets || {}
      ).filter(
        (set) => set?.done
      ).length;

    let status =
      "운동 시작 전 기록";

    if (conflictState.completed) {
      status =
        "완료된 운동 기록";
    } else if (
      conflictState.started
    ) {
      status =
        "진행 중인 운동 기록";
    }

    return {
      status,

      detail: [
        `${completedSets}세트 완료`,
        formatConflictTime(
          updatedAt ||
          conflictState.updatedAt
        )
      ].join(" · ")
    };
  }

  function parseSetKey(
    key
  ) {
    const matched =
      String(key).match(
        /^(\d+)-(\d+)$/
      );

    if (!matched) {
      return null;
    }

    return {
      key:
        String(key),

      exerciseIndex:
        Number(matched[1]),

      setIndex:
        Number(matched[2])
    };
  }

  function normalizeSet(
    set
  ) {
    if (!set) {
      return null;
    }

    return {
      weight:
        Number(set.weight) || 0,

      reps:
        Number(set.reps) || 0,

      done:
        Boolean(set.done)
    };
  }

  function areSetsEqual(
    firstSet,
    secondSet
  ) {
    if (
      firstSet === null &&
      secondSet === null
    ) {
      return true;
    }

    if (
      firstSet === null ||
      secondSet === null
    ) {
      return false;
    }

    return (
      firstSet.weight ===
        secondSet.weight &&
      firstSet.reps ===
        secondSet.reps &&
      firstSet.done ===
        secondSet.done
    );
  }

  function formatSet(
    set
  ) {
    if (!set) {
      return "기록 없음";
    }

    return [
      `${set.weight}kg × ${set.reps}회`,
      set.done
        ? "완료"
        : "미완료"
    ].join(" · ");
  }

  function getDifference(
    localState,
    cloudState
  ) {
    const localSets =
      localState?.sets || {};

    const cloudSets =
      cloudState?.sets || {};

    const parsedKeys = [
      ...new Set([
        ...Object.keys(localSets),
        ...Object.keys(cloudSets)
      ])
    ]
      .map(parseSetKey)
      .filter(Boolean)
      .sort(
        (first, second) =>
          (
            first.exerciseIndex -
            second.exerciseIndex
          ) ||
          (
            first.setIndex -
            second.setIndex
          )
      );

    const differences =
      parsedKeys
        .map(
          (parsedKey) => {
            const localSet =
              normalizeSet(
                localSets[
                  parsedKey.key
                ]
              );

            const cloudSet =
              normalizeSet(
                cloudSets[
                  parsedKey.key
                ]
              );

            if (
              areSetsEqual(
                localSet,
                cloudSet
              )
            ) {
              return null;
            }

            const exercise =
              exercises[
                parsedKey.exerciseIndex
              ];

            return {
              label:
                `${
                  exercise?.name ||
                  `운동 ${
                    parsedKey.exerciseIndex +
                    1
                  }`
                } ${
                  parsedKey.setIndex + 1
                }세트`,

              localText:
                formatSet(
                  localSet
                ),

              cloudText:
                formatSet(
                  cloudSet
                )
            };
          }
        )
        .filter(Boolean);

    if (
      differences.length === 0
    ) {
      return null;
    }

    const firstDifference =
      differences[0];

    return {
      ...firstDifference,

      additionalCount:
        Math.max(
          0,
          differences.length - 1
        )
    };
  }

  function setMessage(
    message,
    isError = false
  ) {
    if (!syncConflictMessage) {
      return;
    }

    syncConflictMessage.textContent =
      message;

    syncConflictMessage.classList.toggle(
      "error",
      isError
    );
  }

  function renderConflict(
    conflict
  ) {
    if (
      !syncConflictLocalStatus ||
      !syncConflictLocalDetail ||
      !syncConflictCloudStatus ||
      !syncConflictCloudDetail
    ) {
      console.warn(
        "[JYM Log] 충돌 비교 UI 요소를 찾을 수 없습니다."
      );

      return;
    }

    const localState =
      conflict?.localState;

    const cloudState =
      conflict?.cloudState;

    const localSummary =
      getConflictSummary(
        localState,
        conflict?.localUpdatedAt
      );

    const cloudSummary =
      getConflictSummary(
        cloudState,
        conflict?.cloudUpdatedAt
      );

    const difference =
      getDifference(
        localState,
        cloudState
      );

    syncConflictLocalStatus.textContent =
      localSummary.status;

    syncConflictLocalDetail.textContent =
      localSummary.detail;

    syncConflictCloudStatus.textContent =
      cloudSummary.status;

    syncConflictCloudDetail.textContent =
      cloudSummary.detail;

    if (
      !syncConflictLocalDifference ||
      !syncConflictCloudDifference
    ) {
      return;
    }

    if (!difference) {
      syncConflictLocalDifference
        .textContent =
          "세트 입력값의 차이는 없습니다.";

      syncConflictCloudDifference
        .textContent =
          "세트 입력값의 차이는 없습니다.";

      return;
    }

    const additionalText =
      difference.additionalCount > 0
        ? ` 외 ${difference.additionalCount}곳`
        : "";

    syncConflictLocalDifference
      .textContent =
        `${difference.label}: ` +
        `${difference.localText}` +
        additionalText;

    syncConflictCloudDifference
      .textContent =
        `${difference.label}: ` +
        `${difference.cloudText}` +
        additionalText;
  }

  function open(
    conflict
  ) {
    if (
      !syncConflictModal ||
      !closeSyncConflictBtn
    ) {
      console.warn(
        "[JYM Log] 동기화 충돌 선택창 요소를 찾을 수 없습니다."
      );

      showToast(
        "동기화 충돌 화면을 불러오지 못했습니다."
      );

      return;
    }

    const syncApi =
      window.JYMLog.sync;

    const resolvedConflict =
      conflict ||
      syncApi?.getConflict?.();

    if (!resolvedConflict) {
      updateStatus(
        "synced",
        "동기화됨"
      );

      showToast(
        "보관된 동기화 충돌 기록이 없습니다."
      );

      return;
    }

    previousFocus =
      document.activeElement instanceof
        HTMLElement
        ? document.activeElement
        : null;

    renderConflict(
      resolvedConflict
    );

    setMessage(
      "기록을 선택하기 전까지 양쪽 데이터는 모두 보관됩니다."
    );

    syncConflictModal.classList.remove(
      "hidden"
    );

    document.body.style.overflow =
      "hidden";

    window.setTimeout(
      () => {
        closeSyncConflictBtn.focus();
      },
      50
    );
  }

  function close(
    restoreFocus = true
  ) {
    if (resolutionInProgress) {
      return;
    }

    if (!syncConflictModal) {
      return;
    }

    const focusTarget =
      previousFocus;

    syncConflictModal.classList.add(
      "hidden"
    );

    document.body.style.overflow =
      "";

    previousFocus =
      null;

    if (
      restoreFocus &&
      focusTarget?.isConnected &&
      typeof focusTarget.focus ===
        "function"
    ) {
      window.setTimeout(
        () => {
          focusTarget.focus();
        },
        0
      );
    }
  }

  function setBusy(
    isBusy,
    strategy = null
  ) {
    resolutionInProgress =
      isBusy;

    if (syncConflictModal) {
      syncConflictModal.setAttribute(
        "aria-busy",
        String(isBusy)
      );
    }

    if (useCloudConflictBtn) {
      useCloudConflictBtn.disabled =
        isBusy;

      useCloudConflictBtn.textContent =
        isBusy &&
        strategy === "cloud"
          ? "불러오는 중..."
          : "클라우드 기록 사용";
    }

    if (useLocalConflictBtn) {
      useLocalConflictBtn.disabled =
        isBusy;

      useLocalConflictBtn.textContent =
        isBusy &&
        strategy === "local"
          ? "저장하는 중..."
          : "이 기기 기록 사용";
    }

    if (closeSyncConflictBtn) {
      closeSyncConflictBtn.disabled =
        isBusy;
    }
  }

  async function resolveChoice(
    strategy
  ) {
    if (resolutionInProgress) {
      return;
    }

    const syncApi =
      window.JYMLog.sync;

    if (
      !syncApi?.resolveConflict
    ) {
      setMessage(
        "동기화 충돌 해결 기능을 불러오지 못했습니다.",
        true
      );

      return;
    }

    const storedConflict =
      syncApi.getConflict?.();

    if (!storedConflict) {
      setMessage(
        "보관된 충돌 기록이 없습니다. 화면을 새로고침해 주세요.",
        true
      );

      updateStatus(
        "synced",
        "동기화됨"
      );

      return;
    }

    setBusy(
      true,
      strategy
    );

    setMessage(
      strategy === "local"
        ? "이 기기 기록을 클라우드에 저장하고 있습니다."
        : "최신 클라우드 기록을 불러오고 있습니다."
    );

    try {
      await syncApi.resolveConflict(
        strategy
      );

      showToast(
        strategy === "local"
          ? "이 기기 기록을 유지했습니다."
          : "클라우드 기록을 적용했습니다."
      );
    } catch (error) {
      console.error(
        "[JYM Log] 동기화 충돌 해결 실패",
        error
      );

      setMessage(
        error.message ||
        "동기화 충돌을 해결하지 못했습니다.",
        true
      );
    } finally {
      setBusy(false);
    }
  }

  function attachEventHandlers() {
    closeSyncConflictBtn
      ?.addEventListener(
        "click",
        close
      );

    useCloudConflictBtn
      ?.addEventListener(
        "click",
        () => {
          void resolveChoice(
            "cloud"
          );
        }
      );

    useLocalConflictBtn
      ?.addEventListener(
        "click",
        () => {
          void resolveChoice(
            "local"
          );
        }
      );

    syncStatus
      ?.addEventListener(
        "click",
        () => {
          if (
            syncStatus.dataset.state !==
            "conflict"
          ) {
            return;
          }

          open();
        }
      );

    syncStatus
      ?.addEventListener(
        "keydown",
        (event) => {
          if (
            syncStatus.dataset.state !==
              "conflict" ||
            (
              event.key !== "Enter" &&
              event.key !== " "
            )
          ) {
            return;
          }

          event.preventDefault();

          open();
        }
      );

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key !== "Escape" ||
          !syncConflictModal ||
          syncConflictModal.classList
            .contains("hidden") ||
          resolutionInProgress
        ) {
          return;
        }

        event.preventDefault();

        close();
      }
    );

    window.addEventListener(
      "jym-log:sync-status",
      (event) => {
        const detail =
          event.detail || {};

        updateStatus(
          detail.status || "loading",
          detail.message || "확인 중"
        );
      }
    );

    window.addEventListener(
      "jym-log:sync-conflict",
      (event) => {
        const conflict =
          event.detail?.conflict;

        updateStatus(
          "conflict",
          "동기화 충돌"
        );

        console.warn(
          "[JYM Log] 동기화 충돌 안내",
          conflict
        );

        open(
          conflict
        );

        showToast(
          "다른 기기의 변경이 감지되었습니다."
        );
      }
    );

    window.addEventListener(
      "jym-log:sync-conflict-resolved",
      (event) => {
        updateStatus(
          "synced",
          "동기화됨"
        );

        setBusy(false);

        close(false);

        handleResolved(
          event.detail || {}
        );
      }
    );
  }

  function initialize(
    options = {}
  ) {
    if (
      typeof options.toast ===
      "function"
    ) {
      showToast =
        options.toast;
    }

    if (
      typeof options.onResolved ===
      "function"
    ) {
      handleResolved =
        options.onResolved;
    }

    if (initialized) {
      return;
    }

    initialized = true;

    attachEventHandlers();
  }

  window.JYMLog =
    window.JYMLog || {};

  window.JYMLog.syncConflictUI =
    Object.freeze({
      initialize,
      open,
      close,
      updateStatus,

      get isInitialized() {
        return initialized;
      },

      get isBusy() {
        return resolutionInProgress;
      }
    });
})();

