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
      "jym-log-user-backup",

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

      hasCurrentWorkout:
        Boolean(
          currentWorkout?.data
            ?.state
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
  const button =
    document.getElementById(
      "exportBackupBtn"
    );

  const message =
    document.getElementById(
      "backupMessage"
    );

  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    async () => {
      if (button.disabled) {
        return;
      }

      const originalText =
        button.textContent;

      button.disabled =
        true;

      button.setAttribute(
        "aria-busy",
        "true"
      );

      button.textContent =
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
        button.disabled =
          false;

        button.removeAttribute(
          "aria-busy"
        );

        button.textContent =
          originalText;
      }
    }
  );
}

initializeBackupUI();

window.JYMLog.backup =
  Object.freeze({
    buildUserBackup,
    exportUserBackup
  });

export {
  buildUserBackup,
  exportUserBackup
};