import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
  auth,
  db
} from "./firebase-client.js";

window.JYMLog =
  window.JYMLog || {};

let lastCloudDiagnostics =
  null;

function getElement(id) {
  return document
    .getElementById(id);
}

function getTimestampMillis(
  value
) {
  if (!value) {
    return 0;
  }

  if (
    typeof value.toMillis ===
      "function"
  ) {
    return value.toMillis();
  }

  if (
    typeof value ===
      "object" &&
    value.__jymType ===
      "timestamp"
  ) {
    return (
      Number(
        value.millis
      ) || 0
    );
  }

  return (
    Number(value) || 0
  );
}

function formatDateTime(
  value
) {
  const millis =
    getTimestampMillis(
      value
    );

  if (millis <= 0) {
    return "없음";
  }

  const date =
    new Date(millis);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "확인 불가";
  }

  return new Intl
    .DateTimeFormat(
      "ko-KR",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }
    )
    .format(date);
}

function maskIdentifier(
  value
) {
  const text =
    String(
      value ||
      ""
    );

  if (!text) {
    return "없음";
  }

  if (text.length <= 14) {
    return text;
  }

  return [
    text.slice(0, 8),
    "…",
    text.slice(-6)
  ].join("");
}

function setText(
  id,
  value
) {
  const element =
    getElement(id);

  if (element) {
    element.textContent =
      String(value);
  }
}

function getStatusLabel(
  status
) {
  const labels = {
    idle: "대기",
    loading: "확인 중",
    saving: "저장 중",
    synced: "동기화됨",
    offline: "오프라인",
    conflict: "충돌",
    error: "오류"
  };

  return (
    labels[status] ||
    status ||
    "확인 불가"
  );
}

async function readCloudDiagnostics() {
  const user =
    auth.currentUser;

  if (!user?.uid) {
    return {
      exists: false,
      reason: "로그인 사용자 없음"
    };
  }

  if (!navigator.onLine) {
    return {
      exists: false,
      reason: "오프라인"
    };
  }

  const snapshot =
    await getDoc(
      doc(
        db,
        "users",
        user.uid,
        "appData",
        "currentWorkout"
      )
    );

  if (!snapshot.exists()) {
    return {
      exists: false,
      reason: "클라우드 문서 없음"
    };
  }

  const data =
    snapshot.data();

  return {
    exists: true,

    revision:
      Number(
        data.revision
      ) || 0,

    clientUpdatedAt:
      Number(
        data.clientUpdatedAt
      ) || 0,

    serverUpdatedAt:
      getTimestampMillis(
        data.updatedAt
      ),

    lastDeviceId:
      String(
        data.lastDeviceId ||
        ""
      ),

    stateUpdatedAt:
      Number(
        data.state?.updatedAt
      ) || 0
  };
}

function createDiagnosticSnapshot() {
  const sync =
    window.JYMLog.sync
      ?.getDiagnostics?.() ||
    {};

  const localState =
    window.JYMLog.workout
      ?.state ||
    {};

  const cloud =
    lastCloudDiagnostics;

  const runtimeError =
    window.JYMLog
        .errorRecovery
        ?.getLastError?.() ||
    null;

  return {
    generatedAt:
      new Date()
        .toISOString(),

    appVersion:
      window.JYMLog.config
        ?.version ||
      "확인 불가",

    network: {
      online:
        navigator.onLine
    },

    runtimeError:
        runtimeError
            ? runtimeError
            : null,

    sync: {
      active:
        Boolean(
          sync.active
        ),

      status:
        sync.status ||
        null,

      currentCloudRevision:
        Number(
          sync.currentCloudRevision
        ) || 0,

      writeInProgress:
        Boolean(
          sync.writeInProgress
        ),

      retry:
        sync.retry ||
        null,

      pending:
        sync.pending ||
        null,

      conflict:
        sync.conflict ||
        null,

      lastError:
        sync.lastError ||
        null,

      deviceId:
        maskIdentifier(
          sync.deviceId
        )
    },

    local: {
      stateUpdatedAt:
        Number(
          localState.updatedAt
        ) || 0,

      started:
        Boolean(
          localState.started
        ),

      completed:
        Boolean(
          localState.completed
        ),

      routineId:
        String(
          localState.routineId ||
          ""
        )
    },

    cloud: cloud
      ? {
          ...cloud,

          lastDeviceId:
            maskIdentifier(
              cloud.lastDeviceId
            )
        }
      : null
  };
}

function renderDiagnostics() {
  const snapshot =
    createDiagnosticSnapshot();

  const sync =
    snapshot.sync;

  const status =
    sync.status ||
    {};

  setText(
    "diagnosticNetwork",
    navigator.onLine
      ? "온라인"
      : "오프라인"
  );

  setText(
    "diagnosticStatus",
    [
      getStatusLabel(
        status.status
      ),
      status.message
        ? `· ${status.message}`
        : ""
    ].join(" ")
  );

  setText(
    "diagnosticStatusChanged",
    formatDateTime(
      status.changedAt
    )
  );

  setText(
    "diagnosticRevision",
    sync.currentCloudRevision
  );

  setText(
    "diagnosticLocalUpdated",
    formatDateTime(
      snapshot.local
        .stateUpdatedAt
    )
  );

  setText(
    "diagnosticCloudUpdated",
    lastCloudDiagnostics
      ?.exists
      ? formatDateTime(
          lastCloudDiagnostics
            .stateUpdatedAt ||
          lastCloudDiagnostics
            .clientUpdatedAt ||
          lastCloudDiagnostics
            .serverUpdatedAt
        )
      : (
          lastCloudDiagnostics
            ?.reason ||
          "새로고침 필요"
        )
  );

  setText(
    "diagnosticPending",
    sync.pending?.exists
      ? [
          "있음",
          `기준 revision ${sync.pending.baseRevision}`
        ].join(" · ")
      : "없음"
  );

  setText(
    "diagnosticConflict",
    sync.conflict?.exists
      ? [
          "있음",
          `클라우드 revision ${sync.conflict.cloudRevision}`
        ].join(" · ")
      : "없음"
  );

  setText(
    "diagnosticRetry",
    sync.retry?.scheduled
      ? `예약됨 · ${sync.retry.attempt}회`
      : "없음"
  );

  setText(
    "diagnosticDevice",
    maskIdentifier(
      sync.deviceId
    )
  );

  setText(
    "diagnosticCloudDevice",
    lastCloudDiagnostics
      ?.exists
      ? maskIdentifier(
          lastCloudDiagnostics
            .lastDeviceId
        )
      : "확인 전"
  );

  setText(
    "diagnosticLastError",
    sync.lastError
      ? [
          sync.lastError.context,
          sync.lastError.message
        ].join(" · ")
      : "없음"
  );

  setText(
    "diagnosticRuntimeError",
    snapshot.runtimeError
      ? [
          snapshot
            .runtimeError
            .name,

          snapshot
            .runtimeError
            .message
        ]
          .filter(Boolean)
          .join(" · ")
      : "없음"
  );

  return snapshot;
}

async function refreshDiagnostics() {
  const button =
    getElement(
      "refreshSyncDiagnosticsBtn"
    );

  const message =
    getElement(
      "syncDiagnosticsMessage"
    );

  if (button?.disabled) {
    return;
  }

  if (button) {
    button.disabled =
      true;

    button.setAttribute(
      "aria-busy",
      "true"
    );

    button.textContent =
      "확인 중...";
  }

  if (message) {
    message.textContent =
      "로컬 상태와 클라우드 운동 문서를 확인하고 있습니다.";
  }

  try {
    lastCloudDiagnostics =
      await readCloudDiagnostics();

    renderDiagnostics();

    if (message) {
      message.textContent =
        lastCloudDiagnostics
          .exists
          ? "동기화 진단 정보를 갱신했습니다."
          : (
              lastCloudDiagnostics
                .reason ||
              "클라우드 상태를 확인하지 못했습니다."
            );
    }
  } catch (error) {
    console.warn(
      "[JYM Log] 동기화 진단 갱신 실패",
      error
    );

    lastCloudDiagnostics = {
      exists: false,
      reason:
        error?.message ||
        "클라우드 확인 실패"
    };

    renderDiagnostics();

    if (message) {
      message.textContent =
        "클라우드 정보를 확인하지 못했습니다. 네트워크 상태를 확인해 주세요.";
    }
  } finally {
    if (button) {
      button.disabled =
        false;

      button.removeAttribute(
        "aria-busy"
      );

      button.textContent =
        "새로고침";
    }
  }
}

async function copyText(
  text
) {
  if (
    navigator.clipboard
      ?.writeText
  ) {
    await navigator
      .clipboard
      .writeText(text);

    return;
  }

  const textarea =
    document.createElement(
      "textarea"
    );

  textarea.value =
    text;

  textarea.style.position =
    "fixed";

  textarea.style.opacity =
    "0";

  document.body.appendChild(
    textarea
  );

  textarea.select();

  const copied =
    document.execCommand(
      "copy"
    );

  textarea.remove();

  if (!copied) {
    throw new Error(
      "클립보드 복사에 실패했습니다."
    );
  }
}

async function copyDiagnostics() {
  const button =
    getElement(
      "copySyncDiagnosticsBtn"
    );

  const message =
    getElement(
      "syncDiagnosticsMessage"
    );

  if (button?.disabled) {
    return;
  }

  if (button) {
    button.disabled =
      true;
  }

  try {
    const snapshot =
      renderDiagnostics();

    await copyText(
      JSON.stringify(
        snapshot,
        null,
        2
      )
    );

    if (message) {
      message.textContent =
        "동기화 진단 정보를 클립보드에 복사했습니다.";
    }
  } catch (error) {
    console.warn(
      "[JYM Log] 동기화 진단 정보 복사 실패",
      error
    );

    if (message) {
      message.textContent =
        error?.message ||
        "진단 정보를 복사하지 못했습니다.";
    }
  } finally {
    if (button) {
      button.disabled =
        false;
    }
  }
}

function initialize() {
  const details =
    getElement(
      "syncDiagnosticsDetails"
    );

  getElement(
    "refreshSyncDiagnosticsBtn"
  )?.addEventListener(
    "click",
    () => {
      void refreshDiagnostics();
    }
  );

  getElement(
    "copySyncDiagnosticsBtn"
  )?.addEventListener(
    "click",
    () => {
      void copyDiagnostics();
    }
  );

  details?.addEventListener(
    "toggle",
    () => {
      if (details.open) {
        void refreshDiagnostics();
      }
    }
  );

  [
    "jym-log:sync-status",
    "jym-log:sync-conflict",
    "jym-log:sync-conflict-resolved",
    "jym-log:runtime-error"
  ].forEach(
    (eventName) => {
      window.addEventListener(
        eventName,
        renderDiagnostics
      );
    }
  );

  window.addEventListener(
    "jym-log:user-state-ready",
    () => {
      renderDiagnostics();

      if (details?.open) {
        void refreshDiagnostics();
      }
    }
  );

  window.addEventListener(
    "online",
    renderDiagnostics
  );

  window.addEventListener(
    "offline",
    renderDiagnostics
  );

  renderDiagnostics();
}

initialize();

window.JYMLog.syncDiagnostics =
  Object.freeze({
    refresh:
      refreshDiagnostics,

    getSnapshot:
      createDiagnosticSnapshot
  });

export {
  refreshDiagnostics,
  createDiagnosticSnapshot
};