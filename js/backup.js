import {
  collection,
  doc,
  getDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
  auth,
  db
} from "./firebase-client.js";

window.JYMLog =
  window.JYMLog || {};

const BACKUP_SCHEMA_VERSION = 1;

const BACKUP_TYPE =
  "jym-log-user-backup";

const MAX_BACKUP_FILE_SIZE_BYTES =
  25 * 1024 * 1024;

let selectedBackup = null;

function cloneValue(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return value ?? null;
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}

/**
 * Firestore Timestamp 등 JSON으로 직접
 * 저장할 수 없는 값을 백업 형식으로 변환합니다.
 */
function serializeValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return value ?? null;
  }

  if (
    typeof value?.toMillis ===
    "function"
  ) {
    return {
      __jymType: "timestamp",
      millis: value.toMillis()
    };
  }

  if (Array.isArray(value)) {
    return value.map(
      serializeValue
    );
  }

  if (
    typeof value === "object"
  ) {
    return Object.fromEntries(
      Object.entries(value).map(
        ([key, childValue]) => [
          key,
          serializeValue(
            childValue
          )
        ]
      )
    );
  }

  return value;
}

async function readDocument(
  documentReference
) {
  const snapshot =
    await getDoc(
      documentReference
    );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    data: serializeValue(
      snapshot.data()
    )
  };
}

async function readCollection(
  collectionReference
) {
  const snapshot =
    await getDocs(
      collectionReference
    );

  return snapshot.docs
    .map(
      (documentSnapshot) => ({
        id:
          documentSnapshot.id,

        data:
          serializeValue(
            documentSnapshot.data()
          )
      })
    )
    .sort(
      (first, second) =>
        String(first.id)
          .localeCompare(
            String(second.id)
          )
    );
}

function createBackupFilename() {
  const timestamp =
    new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        "-"
      );

  return (
    `jym-log-backup-${timestamp}.json`
  );
}

function downloadJson(
  value,
  filename
) {
  const json =
    JSON.stringify(
      value,
      null,
      2
    );

  const blob =
    new Blob(
      [json],
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

function isRecord(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function validateDocumentEntry(
  value,
  label,
  allowNull = false
) {
  if (
    value === null &&
    allowNull
  ) {
    return null;
  }

  if (!isRecord(value)) {
    throw new Error(
      `${label} 정보가 올바르지 않습니다.`
    );
  }

  const documentId =
    String(
      value.id || ""
    ).trim();

  if (!documentId) {
    throw new Error(
      `${label} 문서 ID가 없습니다.`
    );
  }

  if (!isRecord(value.data)) {
    throw new Error(
      `${label} 데이터가 올바르지 않습니다.`
    );
  }

  return value;
}

function validateDocumentCollection(
  value,
  label
) {
  if (!Array.isArray(value)) {
    throw new Error(
      `${label} 목록이 올바르지 않습니다.`
    );
  }

  const documentIds =
    new Set();

  value.forEach(
    (entry, index) => {
      validateDocumentEntry(
        entry,
        `${label} ${index + 1}번`
      );

      const documentId =
        String(entry.id);

      if (
        documentIds.has(
          documentId
        )
      ) {
        throw new Error(
          `${label}에 중복된 문서가 있습니다: ${documentId}`
        );
      }

      documentIds.add(
        documentId
      );
    }
  );

  return value;
}

function getBackupExportedAtMillis(
  backup
) {
  const directValue =
    Number(
      backup?.exportedAtMillis
    );

  if (
    Number.isFinite(
      directValue
    ) &&
    directValue > 0
  ) {
    return directValue;
  }

  const parsedValue =
    Date.parse(
      String(
        backup?.exportedAt ||
        ""
      )
    );

  if (
    Number.isFinite(
      parsedValue
    ) &&
    parsedValue > 0
  ) {
    return parsedValue;
  }

  throw new Error(
    "백업 생성 날짜를 확인할 수 없습니다."
  );
}

function validateBackupData(
  input
) {
  if (!isRecord(input)) {
    throw new Error(
      "백업 파일의 최상위 구조가 올바르지 않습니다."
    );
  }

  if (
    input.backupType !==
      BACKUP_TYPE
  ) {
    throw new Error(
      "JYM Log 백업 파일이 아닙니다."
    );
  }

  if (
    Number(
      input.schemaVersion
    ) !==
      BACKUP_SCHEMA_VERSION
  ) {
    throw new Error(
      "현재 앱에서 지원하지 않는 백업 파일 버전입니다."
    );
  }

  const currentUser =
    auth.currentUser;

  if (!currentUser?.uid) {
    throw new Error(
      "로그인 사용자 정보를 확인할 수 없습니다."
    );
  }

  if (!isRecord(input.user)) {
    throw new Error(
      "백업 사용자 정보가 없습니다."
    );
  }

  const backupUserId =
    String(
      input.user.uid || ""
    ).trim();

  if (!backupUserId) {
    throw new Error(
      "백업 사용자 UID가 없습니다."
    );
  }

  if (
    backupUserId !==
      currentUser.uid
  ) {
    throw new Error(
      "현재 로그인한 계정과 다른 계정의 백업 파일입니다."
    );
  }

  if (!isRecord(input.cloud)) {
    throw new Error(
      "클라우드 백업 데이터가 없습니다."
    );
  }

  validateDocumentEntry(
    input.cloud.profile,
    "사용자 프로필",
    true
  );

  validateDocumentEntry(
    input.cloud.currentWorkout,
    "현재 운동 상태",
    true
  );

  validateDocumentEntry(
    input.cloud.routinePreferences,
    "루틴 선택 정보",
    true
  );

  const routines =
    validateDocumentCollection(
      input.cloud.routines,
      "루틴"
    );

  const workoutSessions =
    validateDocumentCollection(
      input.cloud.workoutSessions,
      "완료 운동 기록"
    );

  if (
    input.local !== null &&
    input.local !== undefined &&
    !isRecord(input.local)
  ) {
    throw new Error(
      "기기 백업 데이터가 올바르지 않습니다."
    );
  }

  const localWorkoutState =
    input.local?.workoutState;

  if (
    localWorkoutState !== null &&
    localWorkoutState !==
      undefined &&
    !isRecord(
      localWorkoutState
    )
  ) {
    throw new Error(
      "기기의 운동 상태가 올바르지 않습니다."
    );
  }

  const cloudWorkoutState =
    input.cloud
      .currentWorkout
      ?.data
      ?.state;

  const workoutState =
    isRecord(
      cloudWorkoutState
    )
      ? cloudWorkoutState
      : localWorkoutState;

  const exportedAtMillis =
    getBackupExportedAtMillis(
      input
    );

  return {
    backup:
      cloneValue(input),

    summary: {
      exportedAtMillis,

      appVersion:
        String(
          input.app?.version ||
          "버전 정보 없음"
        ),

      routineCount:
        routines.length,

      workoutSessionCount:
        workoutSessions.length,

      hasCurrentWorkoutState:
        Boolean(
          isRecord(
            workoutState
          )
        ),

      hasWorkoutInProgress:
        Boolean(
          workoutState?.started &&
          !workoutState
            ?.completed
        )
    }
  };
}

function formatFileSize(
  size
) {
  const numericSize =
    Number(size) || 0;

  if (
    numericSize <
    1024
  ) {
    return `${numericSize} B`;
  }

  if (
    numericSize <
    1024 * 1024
  ) {
    return (
      `${(
        numericSize /
        1024
      ).toFixed(1)} KB`
    );
  }

  return (
    `${(
      numericSize /
      1024 /
      1024
    ).toFixed(1)} MB`
  );
}

function formatBackupDate(
  timestamp
) {
  const date =
    new Date(
      Number(timestamp)
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "날짜 확인 불가";
  }

  return new Intl
    .DateTimeFormat(
      window.JYMLog
        .config.locale,
      {
        timeZone:
          window.JYMLog
            .config.timezone,

        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }
    )
    .format(date);
}

async function inspectBackupFile(
  file
) {
  if (
    !file ||
    typeof file.text !==
      "function"
  ) {
    throw new Error(
      "검사할 백업 파일을 선택해 주세요."
    );
  }

  if (
    Number(file.size) <= 0
  ) {
    throw new Error(
      "선택한 파일이 비어 있습니다."
    );
  }

  if (
    Number(file.size) >
      MAX_BACKUP_FILE_SIZE_BYTES
  ) {
    throw new Error(
      "백업 파일은 25MB 이하만 사용할 수 있습니다."
    );
  }

  const filename =
    String(
      file.name || ""
    );

  const lowercaseFilename =
    filename.toLowerCase();

  if (
    !lowercaseFilename
      .endsWith(".json")
  ) {
    throw new Error(
      "JSON 백업 파일을 선택해 주세요."
    );
  }

  let text;

  try {
    text =
      await file.text();
  } catch (error) {
    throw new Error(
      "선택한 파일을 읽지 못했습니다."
    );
  }

  /*
   * Windows 편집기에서 저장한 JSON은
   * 파일 앞에 BOM 문자가 포함될 수 있습니다.
   */
  const normalizedText =
    text.replace(
      /^\uFEFF/,
      ""
    );

  let parsedBackup;

  try {
    parsedBackup =
      JSON.parse(
        normalizedText
      );
  } catch (error) {
    throw new Error(
      "JSON 형식이 올바르지 않습니다."
    );
  }

  const validation =
    validateBackupData(
      parsedBackup
    );

  return {
    ...validation,

    file: {
      name:
        filename,

      size:
        Number(file.size) || 0,

      type:
        String(
          file.type || ""
        )
    }
  };
}

async function buildUserBackup() {
  const user =
    auth.currentUser;

  if (!user?.uid) {
    throw new Error(
      "로그인 사용자 정보를 확인할 수 없습니다."
    );
  }

  if (!navigator.onLine) {
    throw new Error(
      "전체 백업은 인터넷에 연결된 상태에서 진행해 주세요."
    );
  }

  const userId =
    user.uid;

  const [
    profile,
    currentWorkout,
    routinePreferences,
    routines,
    workoutSessions
  ] =
    await Promise.all([
      readDocument(
        doc(
          db,
          "users",
          userId
        )
      ),

      readDocument(
        doc(
          db,
          "users",
          userId,
          "appData",
          "currentWorkout"
        )
      ),

      readDocument(
        doc(
          db,
          "users",
          userId,
          "appData",
          "routinePreferences"
        )
      ),

      readCollection(
        collection(
          db,
          "users",
          userId,
          "routines"
        )
      ),

      readCollection(
        collection(
          db,
          "users",
          userId,
          "workoutSessions"
        )
      )
    ]);

  const exportedAt =
    new Date();

  return {
    schemaVersion:
      BACKUP_SCHEMA_VERSION,

    backupType:
      BACKUP_TYPE,

    exportedAt:
      exportedAt.toISOString(),

    exportedAtMillis:
      exportedAt.getTime(),

    app: {
      name:
        window.JYMLog
          .config.appName,

      version:
        window.JYMLog
          .config.version,

      locale:
        window.JYMLog
          .config.locale,

      timezone:
        window.JYMLog
          .config.timezone
    },

    user: {
      uid: userId,

      email:
        user.email || "",

      displayName:
        user.displayName || ""
    },

    local: {
      workoutState:
        cloneValue(
          window.JYMLog
            .workout?.state
        ),

      activeRoutineId:
        window.JYMLog
          .routines
          ?.activeRoutineId ||
        null,

      loadedRoutines:
        cloneValue(
          window.JYMLog
            .routines
            ?.routines ||
          []
        ),

      themePreference:
        window.JYMLog
          .theme
          ?.preference ||
        "system"
    },

    cloud: {
      profile,
      currentWorkout,
      routinePreferences,
      routines,
      workoutSessions
    },

    summary: {
        routineCount:
            routines.length,

        workoutSessionCount:
            workoutSessions.length,

        hasCurrentWorkoutState:
            Boolean(
            currentWorkout?.data
                ?.state
            ),

        hasWorkoutInProgress:
            Boolean(
            currentWorkout?.data
                ?.state
                ?.started &&
            !currentWorkout?.data
                ?.state
                ?.completed
            )
    }
  };
}

async function exportUserBackup() {
  const backup =
    await buildUserBackup();

  const filename =
    createBackupFilename();

  downloadJson(
    backup,
    filename
  );

  return {
    filename,

    routineCount:
      backup.summary
        .routineCount,

    workoutSessionCount:
      backup.summary
        .workoutSessionCount
  };
}

function initializeBackupUI() {
  const exportButton =
    document.getElementById(
      "exportBackupBtn"
    );

  const selectButton =
    document.getElementById(
      "selectBackupFileBtn"
    );

  const fileInput =
    document.getElementById(
      "backupFileInput"
    );

  const message =
    document.getElementById(
      "backupMessage"
    );

  const inspection =
    document.getElementById(
      "backupInspection"
    );

  const inspectionTitle =
    document.getElementById(
      "backupInspectionTitle"
    );

  const inspectionMeta =
    document.getElementById(
      "backupInspectionMeta"
    );

  const inspectionStatus =
    document.getElementById(
      "backupInspectionStatus"
    );

  function showInspection(
    title,
    meta,
    status,
    state
  ) {
    if (!inspection) {
      return;
    }

    inspection.hidden =
      false;

    inspection.dataset.state =
      state;

    if (inspectionTitle) {
      inspectionTitle.textContent =
        title;
    }

    if (inspectionMeta) {
      inspectionMeta.textContent =
        meta;
    }

    if (inspectionStatus) {
      inspectionStatus.textContent =
        status;
    }
  }

  exportButton
    ?.addEventListener(
      "click",
      async () => {
        if (
          exportButton.disabled
        ) {
          return;
        }

        const originalText =
          exportButton.textContent;

        exportButton.disabled =
          true;

        exportButton.setAttribute(
          "aria-busy",
          "true"
        );

        exportButton.textContent =
          "백업 중...";

        if (message) {
          message.textContent =
            "클라우드 기록을 확인하고 있습니다.";
        }

        try {
          const result =
            await exportUserBackup();

          if (message) {
            message.textContent =
              [
                "백업 파일 저장 완료",
                `루틴 ${result.routineCount}개`,
                `운동 기록 ${result.workoutSessionCount}개`
              ].join(" · ");
          }
        } catch (error) {
          console.error(
            "[JYM Log] 백업 내보내기 실패",
            error
          );

          if (message) {
            message.textContent =
              error?.message ||
              "백업 파일을 만들지 못했습니다.";
          }
        } finally {
          exportButton.disabled =
            false;

          exportButton.removeAttribute(
            "aria-busy"
          );

          exportButton.textContent =
            originalText;
        }
      }
    );

  selectButton
    ?.addEventListener(
      "click",
      () => {
        if (
          selectButton.disabled ||
          !fileInput
        ) {
          return;
        }

        /*
         * 같은 파일도 연속해서 다시
         * 선택할 수 있도록 값을 비웁니다.
         */
        fileInput.value =
          "";

        fileInput.click();
      }
    );

  fileInput
    ?.addEventListener(
      "change",
      async () => {
        const file =
          fileInput.files?.[0];

        if (!file) {
          return;
        }

        const originalText =
          selectButton
            ?.textContent ||
          "파일 선택";

        selectedBackup =
          null;

        if (selectButton) {
          selectButton.disabled =
            true;

          selectButton.setAttribute(
            "aria-busy",
            "true"
          );

          selectButton.textContent =
            "검사 중...";
        }

        if (inspection) {
          inspection.hidden =
            true;
        }

        if (message) {
          message.textContent =
            "백업 파일의 형식과 사용자 정보를 검사하고 있습니다.";
        }

        try {
          const result =
            await inspectBackupFile(
              file
            );

          selectedBackup =
            result.backup;

          const stateLabel =
            result.summary
              .hasWorkoutInProgress
              ? "진행 중 운동 포함"
              : "진행 중 운동 없음";

          showInspection(
            result.file.name,

            [
              formatBackupDate(
                result.summary
                  .exportedAtMillis
              ),
              `앱 ${result.summary.appVersion}`,
              `루틴 ${result.summary.routineCount}개`,
              `운동 기록 ${result.summary.workoutSessionCount}개`,
              stateLabel,
              formatFileSize(
                result.file.size
              )
            ].join(" · "),

            "검증 완료",
            "valid"
          );

          if (message) {
            message.textContent =
              "백업 파일 검증이 완료됐습니다. 아직 앱 데이터는 변경되지 않았습니다.";
          }
        } catch (error) {
          selectedBackup =
            null;

          console.warn(
            "[JYM Log] 백업 파일 검증 실패",
            error
          );

          showInspection(
            file.name,

            error?.message ||
              "백업 파일을 검사하지 못했습니다.",

            "검증 실패",
            "invalid"
          );

          if (message) {
            message.textContent =
              "이 파일은 복원에 사용할 수 없습니다. 기존 앱 데이터는 변경되지 않았습니다.";
          }
        } finally {
          if (selectButton) {
            selectButton.disabled =
              false;

            selectButton
              .removeAttribute(
                "aria-busy"
              );

            selectButton.textContent =
              originalText;
          }
        }
      }
    );
}

initializeBackupUI();

window.JYMLog.backup =
  Object.freeze({
    buildUserBackup,
    exportUserBackup,
    validateBackupData,
    inspectBackupFile,

    get hasSelectedBackup() {
      return Boolean(
        selectedBackup
      );
    }
  });

export {
  buildUserBackup,
  exportUserBackup,
  validateBackupData,
  inspectBackupFile
};