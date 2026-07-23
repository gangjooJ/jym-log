import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
  auth,
  db
} from "./firebase-client.js";

import {
  buildUserBackup,
  getSelectedBackup,
  validateBackupData
} from "./backup.js?v=dev0305";

import {
  initializeWorkoutSync,
  stopWorkoutSync
} from "./sync.js?v=dev0305";

window.JYMLog =
  window.JYMLog || {};

const MAX_RESTORE_WRITE_COUNT =
  450;

const RESTORE_CONFIRMATION_TEXT =
  "복원";

const RESTORE_NOTICE_KEY =
  "jym-log:restore-notice";

function cloneValue(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function isRecord(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function deserializeValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return value ?? null;
  }

  if (Array.isArray(value)) {
    return value.map(
      deserializeValue
    );
  }

  if (
    isRecord(value) &&
    value.__jymType ===
      "timestamp"
  ) {
    const millis =
      Number(value.millis);

    if (
      !Number.isFinite(
        millis
      ) ||
      millis < 0
    ) {
      throw new Error(
        "백업 파일에 잘못된 날짜 정보가 있습니다."
      );
    }

    return Timestamp
      .fromMillis(
        millis
      );
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(
        ([key, childValue]) => [
          key,
          deserializeValue(
            childValue
          )
        ]
      )
    );
  }

  return value;
}

function createEntryMap(
  entries,
  label
) {
  if (!Array.isArray(entries)) {
    throw new Error(
      `${label} 백업이 올바르지 않습니다.`
    );
  }

  const entryMap =
    new Map();

  entries.forEach(
    (entry) => {
      const documentId =
        String(
          entry?.id || ""
        ).trim();

      if (
        !documentId ||
        documentId.includes("/")
      ) {
        throw new Error(
          `${label} 문서 ID가 올바르지 않습니다.`
        );
      }

      if (!isRecord(entry.data)) {
        throw new Error(
          `${label} 데이터가 올바르지 않습니다.`
        );
      }

      if (
        entryMap.has(
          documentId
        )
      ) {
        throw new Error(
          `${label}에 중복된 문서가 있습니다.`
        );
      }

      entryMap.set(
        documentId,
        entry.data
      );
    }
  );

  return entryMap;
}

function getRestoredWorkoutState(
  backup
) {
  const cloudState =
    backup.cloud
      ?.currentWorkout
      ?.data
      ?.state;

  const localState =
    backup.local
      ?.workoutState;

  const state =
    isRecord(cloudState)
      ? cloudState
      : localState;

  if (!isRecord(state)) {
    throw new Error(
      "복원할 운동 상태를 찾을 수 없습니다."
    );
  }

  return cloneValue(
    state
  );
}

function resolveActiveRoutineId(
  backup,
  routineMap
) {
  const candidates = [
    backup.cloud
      ?.routinePreferences
      ?.data
      ?.activeRoutineId,

    backup.local
      ?.activeRoutineId,

    backup.cloud
      ?.currentWorkout
      ?.data
      ?.state
      ?.routineId
  ];

  const matchedId =
    candidates
      .map(
        (value) =>
          String(
            value || ""
          ).trim()
      )
      .find(
        (routineId) =>
          routineMap.has(
            routineId
          )
      );

  if (matchedId) {
    return matchedId;
  }

  return (
    routineMap.keys()
      .next()
      .value ||
    null
  );
}

function createSafetyBackupFilename() {
  const timestamp =
    new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        "-"
      );

  return (
    `jym-log-pre-restore-${timestamp}.json`
  );
}

function downloadJson(
  value,
  filename
) {
  const blob =
    new Blob(
      [
        JSON.stringify(
          value,
          null,
          2
        )
      ],
      {
        type:
          "application/json;charset=utf-8"
      }
    );

  const objectUrl =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href =
    objectUrl;

  link.download =
    filename;

  link.style.display =
    "none";

  document.body.appendChild(
    link
  );

  link.click();
  link.remove();

  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        objectUrl
      );
    },
    1000
  );
}

async function restoreSelectedBackup() {
  const user =
    auth.currentUser;

  if (!user?.uid) {
    throw new Error(
      "로그인 사용자 정보를 확인할 수 없습니다."
    );
  }

  if (!navigator.onLine) {
    throw new Error(
      "데이터 복원은 인터넷에 연결된 상태에서 진행해 주세요."
    );
  }

  const currentWorkout =
    window.JYMLog
      .workout
      ?.state;

  if (
    currentWorkout?.started &&
    !currentWorkout.completed
  ) {
    throw new Error(
      "진행 중인 운동을 완료하거나 종료한 뒤 복원해 주세요."
    );
  }

  const selectedBackup =
    getSelectedBackup();

  if (!selectedBackup) {
    throw new Error(
      "검증된 백업 파일을 먼저 선택해 주세요."
    );
  }

  /*
   * 선택 후 파일이나 메모리가 변경됐을 가능성에
   * 대비해 실제 복원 직전에 다시 검증합니다.
   */
  const validation =
    validateBackupData(
      selectedBackup
    );

  const backup =
    validation.backup;

  const routineMap =
    createEntryMap(
      backup.cloud.routines,
      "루틴"
    );

  const sessionMap =
    createEntryMap(
      backup.cloud
        .workoutSessions,
      "운동 기록"
    );

  if (
    routineMap.size === 0
  ) {
    throw new Error(
      "백업 파일에 복원할 루틴이 없습니다."
    );
  }

  const restoredState =
    getRestoredWorkoutState(
      backup
    );

  const activeRoutineId =
    resolveActiveRoutineId(
      backup,
      routineMap
    );

  if (!activeRoutineId) {
    throw new Error(
      "복원할 활성 루틴을 결정할 수 없습니다."
    );
  }

  if (
    restoredState.started &&
    !restoredState.completed &&
    !routineMap.has(
      String(
        restoredState.routineId ||
        ""
      )
    )
  ) {
    throw new Error(
      "진행 중 운동에 사용된 루틴이 백업 파일에 없습니다."
    );
  }

  /*
   * 복원 직전 현재 데이터를 별도 파일로 보관합니다.
   */
  const safetyBackup =
    await buildUserBackup();

  downloadJson(
    safetyBackup,
    createSafetyBackupFilename()
  );

  const userId =
    user.uid;

  const routineCollection =
    collection(
      db,
      "users",
      userId,
      "routines"
    );

  const sessionCollection =
    collection(
      db,
      "users",
      userId,
      "workoutSessions"
    );

  const currentWorkoutDocument =
    doc(
      db,
      "users",
      userId,
      "appData",
      "currentWorkout"
    );

  const [
    currentRoutineSnapshot,
    currentSessionSnapshot,
    currentWorkoutSnapshot
  ] =
    await Promise.all([
      getDocs(
        routineCollection
      ),

      getDocs(
        sessionCollection
      ),

      getDoc(
        currentWorkoutDocument
      )
    ]);

  const routineDeletes =
    currentRoutineSnapshot
      .docs
      .filter(
        (snapshot) =>
          !routineMap.has(
            snapshot.id
          )
      );

  const sessionDeletes =
    currentSessionSnapshot
      .docs
      .filter(
        (snapshot) =>
          !sessionMap.has(
            snapshot.id
          )
      );

  const operationCount =
    routineDeletes.length +
    sessionDeletes.length +
    routineMap.size +
    sessionMap.size +
    3;

  if (
    operationCount >
    MAX_RESTORE_WRITE_COUNT
  ) {
    throw new Error(
      "복원할 데이터가 너무 많습니다. 현재 버전은 한 번에 450개 이하의 문서만 복원할 수 있습니다."
    );
  }

  const now =
    Date.now();

  restoredState.updatedAt =
    now;

  const currentRevision =
    Number(
      currentWorkoutSnapshot
        .data()
        ?.revision
    ) || 0;

  const backupRevision =
    Number(
      backup.cloud
        ?.currentWorkout
        ?.data
        ?.revision
    ) || 0;

  const nextRevision =
    Math.max(
      currentRevision,
      backupRevision
    ) + 1;

  let syncStopped =
    false;

  try {
    /*
     * 기존 로컬 상태가 복원 중 다시 업로드되는 것을
     * 막기 위해 동기화를 먼저 중지합니다.
     */
    stopWorkoutSync();

    syncStopped =
      true;

    const batch =
      writeBatch(db);

    const backupProfile =
      deserializeValue(
        backup.cloud
          ?.profile
          ?.data ||
        {}
      );

    batch.set(
      doc(
        db,
        "users",
        userId
      ),
      {
        ...backupProfile,

        uid:
          userId,

        email:
          user.email || "",

        displayName:
          user.displayName ||
          "JYM Log 사용자",

        photoURL:
          user.photoURL || "",

        provider:
          user.providerData
            ?.[0]
            ?.providerId ||
          "google.com",

        updatedAt:
          serverTimestamp()
      },
      {
        merge: true
      }
    );

    routineDeletes.forEach(
      (snapshot) => {
        batch.delete(
          snapshot.ref
        );
      }
    );

    routineMap.forEach(
      (
        routineData,
        routineId
      ) => {
        batch.set(
          doc(
            routineCollection,
            routineId
          ),
          {
            ...deserializeValue(
              routineData
            ),

            id:
              routineId,

            userId
          }
        );
      }
    );

    sessionDeletes.forEach(
      (snapshot) => {
        batch.delete(
          snapshot.ref
        );
      }
    );

    sessionMap.forEach(
      (
        sessionData,
        sessionId
      ) => {
        batch.set(
          doc(
            sessionCollection,
            sessionId
          ),
          {
            ...deserializeValue(
              sessionData
            ),

            userId
          }
        );
      }
    );

    const backupWorkoutDocument =
      deserializeValue(
        backup.cloud
          ?.currentWorkout
          ?.data ||
        {}
      );

    batch.set(
      currentWorkoutDocument,
      {
        ...backupWorkoutDocument,

        userId,

        schemaVersion:
          Number(
            backupWorkoutDocument
              .schemaVersion
          ) || 1,

        state:
          restoredState,

        revision:
          nextRevision,

        lastDeviceId:
          window.JYMLog
            .storage
            .getDeviceId(),

        clientUpdatedAt:
          now,

        updatedAt:
          serverTimestamp()
      }
    );

    const backupPreferences =
      deserializeValue(
        backup.cloud
          ?.routinePreferences
          ?.data ||
        {}
      );

    batch.set(
      doc(
        db,
        "users",
        userId,
        "appData",
        "routinePreferences"
      ),
      {
        ...backupPreferences,

        userId,

        schemaVersion:
          Number(
            backupPreferences
              .schemaVersion
          ) || 1,

        activeRoutineId,

        updatedAt:
          serverTimestamp()
      }
    );

    /*
     * 단일 batch이므로 성공 시 전체 적용,
     * 실패 시 전체 취소됩니다.
     */
    await batch.commit();

    const storage =
      window.JYMLog.storage;

    storage.clearPendingSync(
      userId
    );

    storage.clearSyncConflict(
      userId
    );

    storage.save(
      restoredState
    );

    try {
      localStorage.setItem(
        `jym-log:active-routine:${userId}`,
        activeRoutineId
      );
    } catch (error) {
      console.warn(
        "[JYM Log] 복원 활성 루틴 로컬 저장 실패",
        error
      );
    }

    const themePreference =
      String(
        backup.local
          ?.themePreference ||
        ""
      );

    if (
      [
        "system",
        "light",
        "dark"
      ].includes(
        themePreference
      )
    ) {
      window.JYMLog
        .theme
        ?.setPreference(
          themePreference
        );
    }

    try {
      sessionStorage.setItem(
        RESTORE_NOTICE_KEY,
        [
          "백업 복원 완료",
          `루틴 ${routineMap.size}개`,
          `운동 기록 ${sessionMap.size}개`
        ].join(" · ")
      );
    } catch (error) {
      console.warn(
        "[JYM Log] 복원 완료 안내 저장 실패",
        error
      );
    }

    window.setTimeout(
      () => {
        window.location.reload();
      },
      700
    );

    return {
      routineCount:
        routineMap.size,

      workoutSessionCount:
        sessionMap.size,

      activeRoutineId
    };
  } catch (error) {
    /*
     * batch 저장이 실패했다면 기존 동기화를
     * 다시 시작해 앱을 정상 상태로 복구합니다.
     */
    if (syncStopped) {
      try {
        await initializeWorkoutSync(
          userId
        );
      } catch (
        syncError
      ) {
        console.error(
          "[JYM Log] 복원 실패 후 동기화 재시작 실패",
          syncError
        );
      }
    }

    throw error;
  }
}

function initializeRestoreUI() {
  const restoreButton =
    document.getElementById(
      "restoreBackupBtn"
    );

  const message =
    document.getElementById(
      "backupMessage"
    );

  if (!restoreButton) {
    return;
  }

  restoreButton.disabled =
    !getSelectedBackup();

  window.addEventListener(
    "jym-log:backup-selected",
    () => {
      restoreButton.disabled =
        false;
    }
  );

  window.addEventListener(
    "jym-log:backup-cleared",
    () => {
      restoreButton.disabled =
        true;
    }
  );

  try {
    const restoreNotice =
      sessionStorage.getItem(
        RESTORE_NOTICE_KEY
      );

    if (
      restoreNotice &&
      message
    ) {
      message.textContent =
        restoreNotice;

      sessionStorage.removeItem(
        RESTORE_NOTICE_KEY
      );
    }
  } catch (error) {
    console.warn(
      "[JYM Log] 복원 완료 안내 확인 실패",
      error
    );
  }

  restoreButton.addEventListener(
    "click",
    async () => {
      const backup =
        getSelectedBackup();

      if (!backup) {
        if (message) {
          message.textContent =
            "검증된 백업 파일을 먼저 선택해 주세요.";
        }

        restoreButton.disabled =
          true;

        return;
      }

      const routineCount =
        backup.cloud
          ?.routines
          ?.length || 0;

      const sessionCount =
        backup.cloud
          ?.workoutSessions
          ?.length || 0;

      const confirmed =
        window.confirm(
          [
            "선택한 백업 파일로 데이터를 복원합니다.",
            "",
            `루틴 ${routineCount}개`,
            `운동 기록 ${sessionCount}개`,
            "",
            "현재 백업에 없는 루틴과 운동 기록은 삭제됩니다.",
            "복원 직전 현재 데이터는 자동으로 JSON 파일에 저장됩니다.",
            "",
            "계속할까요?"
          ].join("\n")
        );

      if (!confirmed) {
        return;
      }

      const confirmationText =
        window.prompt(
          '실제 복원을 진행하려면 "복원"을 입력하세요.'
        );

      if (
        confirmationText !==
        RESTORE_CONFIRMATION_TEXT
      ) {
        if (message) {
          message.textContent =
            "복원이 취소됐습니다.";
        }

        return;
      }

      const originalText =
        restoreButton.textContent;

      restoreButton.disabled =
        true;

      restoreButton.setAttribute(
        "aria-busy",
        "true"
      );

      restoreButton.textContent =
        "복원 중...";

      if (message) {
        message.textContent =
          "현재 기록을 안전 백업한 뒤 클라우드 데이터를 복원하고 있습니다.";
      }

      try {
        await restoreSelectedBackup();

        restoreButton.textContent =
          "재시작 중...";

        if (message) {
          message.textContent =
            "복원이 완료됐습니다. 앱을 다시 불러오고 있습니다.";
        }
      } catch (error) {
        console.error(
          "[JYM Log] 백업 복원 실패",
          error
        );

        restoreButton.disabled =
          false;

        restoreButton.removeAttribute(
          "aria-busy"
        );

        restoreButton.textContent =
          originalText;

        if (message) {
          message.textContent =
            error?.message ||
            "백업 데이터를 복원하지 못했습니다.";
        }
      }
    }
  );
}

initializeRestoreUI();

window.JYMLog.restore =
  Object.freeze({
    restoreSelectedBackup
  });

export {
  restoreSelectedBackup
};