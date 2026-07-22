(() => {
  "use strict";

  window.JYMLog =
    window.JYMLog || {};

  const TEMP_STORAGE_PREFIX =
    "jym-log:health-check:";

  const REPORT_STORAGE_KEY =
    "jym-log:health-check:last-report";  

  const REQUIRED_DOM_IDS = [
    "authScreen",
    "mainApp",
    "bottomNav",
    "syncStatus",
    "screen-home",
    "screen-history",
    "screen-analysis",
    "screen-routine",
    "screen-settings",
    "exportBackupBtn",
    "selectBackupFileBtn",
    "restoreBackupBtn",
    "syncDiagnosticsDetails",
    "appHealthDetails",
    "releaseReadinessDetails",
    "releaseChecklist",
    "settingsVersion"
  ];

  const REQUIRED_MODULES = [
    ["설정", "config"],
    ["레이어 관리자", "layerManager"],
    ["로컬 저장소", "storage"],
    ["운동 상태", "workout"],
    ["Firebase", "firebase"],
    ["동기화", "sync"],
    ["백업", "backup"],
    ["복원", "restore"],
    ["오류 복구", "errorRecovery"],
    ["동기화 진단", "syncDiagnostics"],
    ["PWA 업데이트", "pwaUpdate"]
  ];

  const detailsElement =
    document.getElementById(
      "appHealthDetails"
    );

  const summaryElement =
    document.getElementById(
      "appHealthSummary"
    );

  const badgeElement =
    document.getElementById(
      "appHealthBadge"
    );

  const generatedElement =
    document.getElementById(
      "appHealthGenerated"
    );

  const resultsElement =
    document.getElementById(
      "appHealthResults"
    );

  const runButton =
    document.getElementById(
      "runAppHealthBtn"
    );

  const copyButton =
    document.getElementById(
      "copyAppHealthBtn"
    );

  const messageElement =
    document.getElementById(
      "appHealthMessage"
    );

  function loadStoredReport() {
    try {
      const rawValue =
        sessionStorage
          .getItem(
            REPORT_STORAGE_KEY
          );

      if (!rawValue) {
        return null;
      }

      const parsed =
        JSON.parse(
            rawValue
      );

      if (
        !parsed ||
        typeof parsed !==
            "object" ||
        !parsed.summary ||
        !Array.isArray(
            parsed.checks
        )
      ) {
        return null;
      }

        return parsed;
    } catch (error) {
        console.warn(
          "[JYM Log] 이전 자가진단 결과 불러오기 실패",
          error
        );

        return null;
    }
  }

  function saveStoredReport(
    report
    ) {
    try {
        sessionStorage
        .setItem(
            REPORT_STORAGE_KEY,
            JSON.stringify(
            report
            )
        );

        return true;
    } catch (error) {
        console.warn(
        "[JYM Log] 자가진단 결과 저장 실패",
        error
        );

        return false;
    }
  }  

  let running =
    false;

  let lastReport =
    loadStoredReport();

  function sanitizeText(
    value,
    maxLength = 500
  ) {
    let text =
      String(
        value ??
        ""
      );

    text =
      text.replace(
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
        "[email]"
      );

    text =
      text.replace(
        /\bdevice-[A-Za-z0-9-]{12,}\b/g,
        "device-[masked]"
      );

    text =
      text.replace(
        /\b[A-Za-z0-9_-]{28,}\b/g,
        "[identifier]"
      );

    return text.slice(
      0,
      maxLength
    );
  }

  function createCheck(
    id,
    label,
    status,
    message
  ) {
    return {
      id:
        String(id),

      label:
        String(label),

      status:
        String(status),

      message:
        sanitizeText(
          message
        )
    };
  }

  function addCheck(
    checks,
    id,
    label,
    status,
    message
  ) {
    checks.push(
      createCheck(
        id,
        label,
        status,
        message
      )
    );
  }

  function getStatusLabel(
    status
  ) {
    const labels = {
      pass: "정상",
      warn: "주의",
      fail: "실패",
      skip: "건너뜀"
    };

    return (
      labels[status] ||
      "확인"
    );
  }

  function createSummary(
    checks
  ) {
    const summary = {
      total:
        checks.length,

      pass: 0,
      warn: 0,
      fail: 0,
      skip: 0,

      overall:
        "pass"
    };

    checks.forEach(
      (check) => {
        if (
          Object.prototype
            .hasOwnProperty
            .call(
              summary,
              check.status
            )
        ) {
          summary[
            check.status
          ] += 1;
        }
      }
    );

    if (
      summary.fail > 0
    ) {
      summary.overall =
        "fail";
    } else if (
      summary.warn > 0
    ) {
      summary.overall =
        "warn";
    }

    return summary;
  }

  function setMessage(
    message
  ) {
    if (messageElement) {
      messageElement.textContent =
        String(message);
    }
  }

  function setBusy(
    isBusy
  ) {
    running =
      isBusy;

    if (runButton) {
      runButton.disabled =
        isBusy;

      runButton.setAttribute(
        "aria-busy",
        String(isBusy)
      );

      runButton.textContent =
        isBusy
          ? "점검 중..."
          : "전체 진단 실행";
    }

    if (copyButton) {
      copyButton.disabled =
        isBusy ||
        !lastReport;
    }
  }

  function renderReport(
    report
  ) {
    if (!report) {
      return;
    }

    const {
      summary,
      checks
    } = report;

    if (summaryElement) {
      summaryElement.textContent =
        [
          `정상 ${summary.pass}`,
          `주의 ${summary.warn}`,
          `실패 ${summary.fail}`
        ].join(" · ");
    }

    if (badgeElement) {
      badgeElement.dataset.state =
        summary.overall;

      badgeElement.textContent =
        summary.overall ===
          "pass"
          ? "전체 정상"
          : summary.overall ===
              "warn"
            ? "확인 필요"
            : "오류 발견";
    }

    if (generatedElement) {
      generatedElement.textContent =
        new Intl
          .DateTimeFormat(
            "ko-KR",
            {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit"
            }
          )
          .format(
            new Date(
              report.generatedAt
            )
          );
    }

    if (resultsElement) {
      resultsElement
        .replaceChildren();

      checks.forEach(
        (check) => {
          const item =
            document.createElement(
              "div"
            );

          item.className =
            "app-health-result";

          item.dataset.status =
            check.status;

          const status =
            document.createElement(
              "span"
            );

          status.className =
            "app-health-result-status";

          status.textContent =
            getStatusLabel(
              check.status
            );

          const content =
            document.createElement(
              "div"
            );

          const title =
            document.createElement(
              "strong"
            );

          title.textContent =
            check.label;

          const description =
            document.createElement(
              "p"
            );

          description.textContent =
            check.message;

          content.append(
            title,
            description
          );

          item.append(
            status,
            content
          );

          resultsElement
            .appendChild(
              item
            );
        }
      );
    }

    if (copyButton) {
      copyButton.disabled =
        false;
    }

    if (
      summary.overall ===
      "pass"
    ) {
      setMessage(
        "핵심 기능 점검을 통과했습니다."
      );
    } else if (
      summary.overall ===
      "warn"
    ) {
      setMessage(
        "앱은 실행 가능하지만 주의 항목을 확인해 주세요."
      );
    } else {
      setMessage(
        "실패 항목이 있습니다. 배포 전에 원인을 확인해 주세요."
      );
    }
  }

  function checkCoreModules(
    checks
  ) {
    const missingModules =
      REQUIRED_MODULES
        .filter(
          (
            [
              ,
              moduleKey
            ]
          ) =>
            !window.JYMLog[
              moduleKey
            ]
        )
        .map(
          ([label]) =>
            label
        );

    if (
      missingModules.length ===
      0
    ) {
      addCheck(
        checks,
        "core-modules",
        "핵심 모듈",
        "pass",
        `${REQUIRED_MODULES.length}개 모듈을 모두 불러왔습니다.`
      );

      return;
    }

    addCheck(
      checks,
      "core-modules",
      "핵심 모듈",
      "fail",
      `불러오지 못한 모듈: ${missingModules.join(", ")}`
    );
  }

  function checkCoreApis(
    checks
  ) {
    const app =
      window.JYMLog;

    const apiChecks = [
      [
        "storage.load",
        app.storage?.load
      ],
      [
        "storage.save",
        app.storage?.save
      ],
      [
        "storage.getDeviceId",
        app.storage
          ?.getDeviceId
      ],
      [
        "workout.replaceState",
        app.workout
          ?.replaceState
      ],
      [
        "sync.getDiagnostics",
        app.sync
          ?.getDiagnostics
      ],
      [
        "backup.buildUserBackup",
        app.backup
          ?.buildUserBackup
      ],
      [
        "backup.validateBackupData",
        app.backup
          ?.validateBackupData
      ],
      [
        "restore.restoreSelectedBackup",
        app.restore
          ?.restoreSelectedBackup
      ],
      [
        "errorRecovery.getLastError",
        app.errorRecovery
          ?.getLastError
      ],
      [
        "syncDiagnostics.getSnapshot",
        app.syncDiagnostics
          ?.getSnapshot
      ],
      [
        "pwaUpdate.checkForUpdate",
        app.pwaUpdate
          ?.checkForUpdate
      ]
    ];

    const missingApis =
      apiChecks
        .filter(
          (
            [
              ,
              target
            ]
          ) =>
            typeof target !==
            "function"
        )
        .map(
          ([name]) =>
            name
        );

    if (
      missingApis.length ===
      0
    ) {
      addCheck(
        checks,
        "core-apis",
        "핵심 API",
        "pass",
        `${apiChecks.length}개 핵심 API가 준비됐습니다.`
      );

      return;
    }

    addCheck(
      checks,
      "core-apis",
      "핵심 API",
      "fail",
      `사용할 수 없는 API: ${missingApis.join(", ")}`
    );
  }

  function checkRequiredDom(
    checks
  ) {
    const missingIds =
      REQUIRED_DOM_IDS
        .filter(
          (id) =>
            !document
              .getElementById(
                id
              )
        );

    if (
      missingIds.length ===
      0
    ) {
      addCheck(
        checks,
        "required-dom",
        "필수 화면 요소",
        "pass",
        `${REQUIRED_DOM_IDS.length}개 필수 요소를 확인했습니다.`
      );

      return;
    }

    addCheck(
      checks,
      "required-dom",
      "필수 화면 요소",
      "fail",
      `누락된 ID: ${missingIds.join(", ")}`
    );
  }

  function checkDuplicateIds(
    checks
  ) {
    const idCounts =
      new Map();

    document
      .querySelectorAll(
        "[id]"
      )
      .forEach(
        (element) => {
          const id =
            element.id;

          idCounts.set(
            id,
            (
              idCounts.get(
                id
              ) || 0
            ) + 1
          );
        }
      );

    const duplicates =
      [
        ...idCounts
          .entries()
      ]
        .filter(
          (
            [
              ,
              count
            ]
          ) =>
            count > 1
        )
        .map(
          ([id]) =>
            id
        );

    if (
      duplicates.length ===
      0
    ) {
      addCheck(
        checks,
        "duplicate-dom-ids",
        "HTML ID 중복",
        "pass",
        "중복된 HTML ID가 없습니다."
      );

      return;
    }

    addCheck(
      checks,
      "duplicate-dom-ids",
      "HTML ID 중복",
      "fail",
      `중복된 ID: ${duplicates.join(", ")}`
    );
  }

  function checkFirebase(
    checks
  ) {
    const firebase =
      window.JYMLog
        .firebase;

    if (
      firebase?.app &&
      firebase?.auth &&
      firebase?.db
    ) {
      addCheck(
        checks,
        "firebase",
        "Firebase 연결",
        "pass",
        "Firebase 앱, 인증 및 Firestore 객체가 준비됐습니다."
      );

      return;
    }

    addCheck(
      checks,
      "firebase",
      "Firebase 연결",
      "fail",
      "Firebase 초기화 객체가 완전하지 않습니다."
    );
  }

  function checkSignedInUser(
    checks
  ) {
    const user =
      window.JYMLog
        .firebase
        ?.auth
        ?.currentUser;

    if (user) {
      addCheck(
        checks,
        "signed-in-user",
        "로그인 상태",
        "pass",
        "로그인 사용자 세션이 유지되고 있습니다."
      );

      return;
    }

    addCheck(
      checks,
      "signed-in-user",
      "로그인 상태",
      "warn",
      "현재 로그인 사용자를 확인하지 못했습니다."
    );
  }

  function checkStorageUserLink(
    checks
  ) {
    const user =
      window.JYMLog
        .firebase
        ?.auth
        ?.currentUser;

    const storage =
      window.JYMLog
        .storage;

    if (
      !user ||
      !storage
    ) {
      addCheck(
        checks,
        "storage-user-link",
        "계정별 로컬 저장소",
        "skip",
        "로그인 또는 저장소 준비 후 확인할 수 있습니다."
      );

      return;
    }

    if (
      storage.activeUserId ===
      user.uid
    ) {
      addCheck(
        checks,
        "storage-user-link",
        "계정별 로컬 저장소",
        "pass",
        "현재 로그인 계정의 로컬 저장소가 활성화돼 있습니다."
      );

      return;
    }

    addCheck(
      checks,
      "storage-user-link",
      "계정별 로컬 저장소",
      "fail",
      "로그인 계정과 활성 로컬 저장소가 일치하지 않습니다."
    );
  }

  function checkWorkoutState(
    checks
  ) {
    const workout =
      window.JYMLog
        .workout;

    const state =
      workout?.state;

    if (
      state &&
      typeof state ===
        "object" &&
      Array.isArray(
        workout.exercises
      ) &&
      typeof workout
        .saveState ===
        "function" &&
      typeof workout
        .replaceState ===
        "function"
    ) {
      addCheck(
        checks,
        "workout-state",
        "운동 상태",
        "pass",
        `운동 상태와 운동 ${workout.exercises.length}개를 확인했습니다.`
      );

      return;
    }

    addCheck(
      checks,
      "workout-state",
      "운동 상태",
      "fail",
      "운동 상태 또는 운동 API 구조가 올바르지 않습니다."
    );
  }

  function checkSyncState(
    checks
  ) {
    const getDiagnostics =
      window.JYMLog
        .sync
        ?.getDiagnostics;

    if (
      typeof getDiagnostics !==
      "function"
    ) {
      addCheck(
        checks,
        "sync-state",
        "동기화 상태",
        "fail",
        "동기화 진단 API를 찾을 수 없습니다."
      );

      return;
    }

    try {
      const diagnostics =
        getDiagnostics();

      if (
        diagnostics
          ?.conflict
          ?.exists
      ) {
        addCheck(
          checks,
          "sync-state",
          "동기화 상태",
          "warn",
          "해결되지 않은 동기화 충돌이 있습니다."
        );

        return;
      }

      if (
        diagnostics
          ?.pending
          ?.exists
      ) {
        addCheck(
          checks,
          "sync-state",
          "동기화 상태",
          "warn",
          "아직 클라우드에 전송되지 않은 운동 상태가 있습니다."
        );

        return;
      }

      if (
        !diagnostics
          ?.active
      ) {
        addCheck(
          checks,
          "sync-state",
          "동기화 상태",
          "warn",
          "현재 사용자 동기화가 활성 상태가 아닙니다."
        );

        return;
      }

      addCheck(
        checks,
        "sync-state",
        "동기화 상태",
        "pass",
        `동기화 활성 · revision ${Number(
          diagnostics
            .currentCloudRevision
        ) || 0}`
      );
    } catch (error) {
      addCheck(
        checks,
        "sync-state",
        "동기화 상태",
        "fail",
        error?.message ||
        "동기화 상태를 읽지 못했습니다."
      );
    }
  }

  function checkLocalStorage(
    checks
  ) {
    const testKey = [
      TEMP_STORAGE_PREFIX,
      Date.now(),
      Math.random()
        .toString(36)
        .slice(2, 8)
    ].join("");

    const testValue =
      `health-${Date.now()}`;

    try {
      localStorage.setItem(
        testKey,
        testValue
      );

      const restoredValue =
        localStorage.getItem(
          testKey
        );

      if (
        restoredValue !==
        testValue
      ) {
        throw new Error(
          "저장한 임시 값을 다시 읽지 못했습니다."
        );
      }

      addCheck(
        checks,
        "local-storage",
        "브라우저 로컬 저장소",
        "pass",
        "임시 값 읽기와 쓰기를 정상적으로 완료했습니다."
      );
    } catch (error) {
      addCheck(
        checks,
        "local-storage",
        "브라우저 로컬 저장소",
        "fail",
        error?.message ||
        "로컬 저장소를 사용할 수 없습니다."
      );
    } finally {
      try {
        localStorage.removeItem(
          testKey
        );
      } catch (error) {
        console.warn(
          "[JYM Log] 자가진단 임시 저장값 삭제 실패",
          error
        );
      }
    }
  }

  function checkNetwork(
    checks
  ) {
    addCheck(
      checks,
      "network",
      "네트워크",
      navigator.onLine
        ? "pass"
        : "warn",

      navigator.onLine
        ? "브라우저가 온라인 상태입니다."
        : "현재 오프라인 상태입니다. 로컬 기록은 가능하지만 클라우드 검사는 제한됩니다."
    );
  }

  function checkSecureContext(
    checks
  ) {
    addCheck(
      checks,
      "secure-context",
      "보안 연결",
      window.isSecureContext
        ? "pass"
        : "warn",

      window.isSecureContext
        ? "HTTPS 보안 환경에서 실행 중입니다."
        : "보안 연결이 아니어서 일부 PWA 기능이 제한될 수 있습니다."
    );
  }

  function checkRuntimeError(
    checks
  ) {
    const runtimeError =
      window.JYMLog
        .errorRecovery
        ?.getLastError?.();

    if (!runtimeError) {
      addCheck(
        checks,
        "runtime-error",
        "최근 앱 오류",
        "pass",
        "현재 탭에 저장된 앱 실행 오류가 없습니다."
      );

      return;
    }

    addCheck(
      checks,
      "runtime-error",
      "최근 앱 오류",
      "warn",
      [
        runtimeError.name ||
        "Error",
        runtimeError.message ||
        "오류 정보 있음"
      ].join(" · ")
    );
  }

  async function checkServiceWorker(
    checks
  ) {
    if (
      !(
        "serviceWorker" in
        navigator
      )
    ) {
      addCheck(
        checks,
        "service-worker",
        "서비스워커",
        "warn",
        "현재 브라우저가 서비스워커를 지원하지 않습니다."
      );

      return;
    }

    try {
      const registration =
        await navigator
          .serviceWorker
          .getRegistration();

      if (
        registration
          ?.active
      ) {
        addCheck(
          checks,
          "service-worker",
          "서비스워커",
          "pass",
          "활성 서비스워커가 앱을 관리하고 있습니다."
        );

        return;
      }

      if (
        registration
          ?.waiting ||
        registration
          ?.installing
      ) {
        addCheck(
          checks,
          "service-worker",
          "서비스워커",
          "warn",
          "서비스워커를 설치하거나 업데이트하는 중입니다."
        );

        return;
      }

      addCheck(
        checks,
        "service-worker",
        "서비스워커",
        "warn",
        "현재 페이지를 관리하는 서비스워커가 없습니다."
      );
    } catch (error) {
      addCheck(
        checks,
        "service-worker",
        "서비스워커",
        "warn",
        error?.message ||
        "서비스워커 상태를 확인하지 못했습니다."
      );
    }
  }

  async function checkManifest(
    checks
  ) {
    if (!navigator.onLine) {
      addCheck(
        checks,
        "manifest",
        "PWA manifest",
        "skip",
        "오프라인 상태에서는 manifest 네트워크 검사를 건너뜁니다."
      );

      return;
    }

    try {
      const response =
        await fetch(
          "./manifest.webmanifest",
          {
            method: "GET",
            cache: "no-store",
            credentials:
              "include"
          }
        );

      if (!response.ok) {
        throw new Error(
          `manifest 요청 실패 · HTTP ${response.status}`
        );
      }

      const manifest =
        await response.json();

      const hasMinimumFields =
        Boolean(
          manifest.name &&
          manifest.start_url &&
          Array.isArray(
            manifest.icons
          ) &&
          manifest.icons.length > 0
        );

      if (!hasMinimumFields) {
        addCheck(
          checks,
          "manifest",
          "PWA manifest",
          "warn",
          "manifest는 열렸지만 필수 PWA 정보가 일부 부족합니다."
        );

        return;
      }

      addCheck(
        checks,
        "manifest",
        "PWA manifest",
        "pass",
        "manifest 접근과 필수 필드를 확인했습니다."
      );
    } catch (error) {
      addCheck(
        checks,
        "manifest",
        "PWA manifest",
        "fail",
        error?.message ||
        "manifest 파일을 불러오지 못했습니다."
      );
    }
  }

  async function runHealthCheck() {
    if (running) {
      return lastReport;
    }

    setBusy(true);

    setMessage(
      "앱 모듈과 저장소, PWA 상태를 점검하고 있습니다."
    );

    const checks = [];

    try {
      checkCoreModules(
        checks
      );

      checkCoreApis(
        checks
      );

      checkRequiredDom(
        checks
      );

      checkDuplicateIds(
        checks
      );

      checkFirebase(
        checks
      );

      checkSignedInUser(
        checks
      );

      checkStorageUserLink(
        checks
      );

      checkWorkoutState(
        checks
      );

      checkSyncState(
        checks
      );

      checkLocalStorage(
        checks
      );

      checkNetwork(
        checks
      );

      checkSecureContext(
        checks
      );

      checkRuntimeError(
        checks
      );

      await checkServiceWorker(
        checks
      );

      await checkManifest(
        checks
      );
    } catch (error) {
      addCheck(
        checks,
        "health-check-internal",
        "자가진단 실행",
        "fail",
        error?.message ||
        "자가진단 실행 중 예상하지 못한 오류가 발생했습니다."
      );
    }

    const report = {
      schemaVersion: 1,

      generatedAt:
        Date.now(),

      appVersion:
        String(
          window.JYMLog
            .config
            ?.version ||
          "확인 불가"
        ),

      summary:
        createSummary(
          checks
        ),

      checks
    };

    lastReport =
      report;

    saveStoredReport(
      report
    );  

    renderReport(
      report
    );

    window.dispatchEvent(
      new CustomEvent(
        "jym-log:health-check-complete",
        {
          detail: {
            report:
              JSON.parse(
                JSON.stringify(
                  report
                )
              )
          }
        }
      )
    );

    setBusy(false);

    return report;
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
        .writeText(
          text
        );

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

    document.body
      .appendChild(
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

  async function copyLastReport() {
    if (!lastReport) {
      setMessage(
        "먼저 전체 진단을 실행해 주세요."
      );

      return;
    }

    if (copyButton) {
      copyButton.disabled =
        true;

      copyButton.textContent =
        "복사 중...";
    }

    try {
      await copyText(
        JSON.stringify(
          lastReport,
          null,
          2
        )
      );

      setMessage(
        "자가진단 결과를 클립보드에 복사했습니다."
      );
    } catch (error) {
      console.warn(
        "[JYM Log] 자가진단 결과 복사 실패",
        error
      );

      setMessage(
        error?.message ||
        "자가진단 결과를 복사하지 못했습니다."
      );
    } finally {
      if (copyButton) {
        copyButton.disabled =
          false;

        copyButton.textContent =
          "결과 복사";
      }
    }
  }

  function initialize() {
    runButton
      ?.addEventListener(
        "click",
        () => {
          void runHealthCheck();
        }
      );

    copyButton
      ?.addEventListener(
        "click",
        () => {
          void copyLastReport();
        }
      );

    detailsElement
      ?.addEventListener(
        "toggle",
        () => {
          if (
            detailsElement.open &&
            !lastReport
          ) {
            void runHealthCheck();
          }
        }
      );

    window.addEventListener(
      "jym-log:user-state-ready",
      () => {
        if (
          detailsElement
            ?.open
        ) {
          void runHealthCheck();
        }
      }
    );

    if (lastReport) {
      renderReport(
        lastReport
      );
    } else if (copyButton) {
      copyButton.disabled =
        true;
    }
  }

  initialize();

  window.JYMLog.appHealth =
    Object.freeze({
      run:
        runHealthCheck,

      getLastReport() {
        return lastReport
          ? JSON.parse(
              JSON.stringify(
                lastReport
              )
            )
          : null;
      }
    });
})();