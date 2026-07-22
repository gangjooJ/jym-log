(() => {
  "use strict";

  window.JYMLog =
    window.JYMLog || {};

  const TARGET_VERSION =
    "v0.2.1";

  const VALID_STATES =
    new Set([
      "pending",
      "pass",
      "fail"
    ]);

  const CHECKLIST = [
    {
      id: "startup-auth",
      group: "기본 실행",
      title:
        "앱 실행 및 로그인",
      description:
        "앱 시작, 자동 로그인 유지, 로그아웃과 재로그인을 확인합니다."
    },
    {
      id: "routine-management",
      group: "루틴",
      title:
        "루틴 생성·수정·복제·삭제",
      description:
        "루틴과 운동 편집, 운동 순서 변경 및 활성 루틴 전환을 확인합니다."
    },
    {
      id: "workout-flow",
      group: "운동",
      title:
        "운동 시작부터 완료",
      description:
        "운동 시작, 세트 입력, 휴식 타이머, 피로도 입력과 완료 저장을 확인합니다."
    },
    {
      id: "workout-recovery",
      group: "운동",
      title:
        "진행 중 운동 복원",
      description:
        "운동 중 새로고침 후 세트와 타이머 상태가 정상 복원되는지 확인합니다."
    },
    {
      id: "history-analysis",
      group: "기록",
      title:
        "운동 기록과 분석",
      description:
        "달력, 최근 세션, 상세 기록, 분석 수치와 증량 이력을 확인합니다."
    },
    {
      id: "multi-device-sync",
      group: "동기화",
      title:
        "PC·모바일 동기화",
      description:
        "한 기기의 수정 내용이 다른 기기에 반영되는지 확인합니다."
    },
    {
      id: "offline-reconnect",
      group: "동기화",
      title:
        "오프라인 저장과 재연결",
      description:
        "오프라인 변경이 보관되고 재연결 후 클라우드에 자동 반영되는지 확인합니다."
    },
    {
      id: "sync-conflict",
      group: "동기화",
      title:
        "기기 간 충돌 해결",
      description:
        "클라우드 기록과 이 기기 기록 선택이 각각 정상 동작하는지 확인합니다."
    },
    {
      id: "backup-export",
      group: "데이터",
      title:
        "백업 내보내기와 검사",
      description:
        "JSON 백업 생성, 정상 파일 검사 및 잘못된 파일 차단을 확인합니다."
    },
    {
      id: "backup-restore",
      group: "데이터",
      title:
        "백업 복원",
      description:
        "자동 안전 백업, 실제 복원, 새로고침 후 데이터 일치를 확인합니다."
    },
    {
      id: "pwa-update",
      group: "PWA",
      title:
        "설치·캐시·업데이트",
      description:
        "PWA 설치, 새 버전 알림, 업데이트 후 버전 변경과 데이터 유지를 확인합니다."
    },
    {
      id: "responsive-accessibility",
      group: "UI",
      title:
        "모바일 UI와 접근성",
      description:
        "Android 화면, 키보드 포커스, Escape 동작과 터치 영역을 확인합니다."
    },
    {
      id: "diagnostics-recovery",
      group: "안정성",
      title:
        "진단과 오류 복구",
      description:
        "동기화 진단, 앱 자가진단, 전역 오류 복구 화면을 확인합니다."
    },
    {
      id: "console-clean",
      group: "안정성",
      title:
        "콘솔 오류 최종 점검",
      description:
        "의도적으로 만든 테스트 오류를 제외한 빨간 오류가 없는지 확인합니다."
    }
  ];

  const STORAGE_KEY = [
    "jym-log:release-readiness:",
    window.JYMLog
      .config
      ?.version ||
    "unknown"
  ].join("");

  const detailsElement =
    document.getElementById(
      "releaseReadinessDetails"
    );

  const summaryElement =
    document.getElementById(
      "releaseReadinessSummary"
    );

  const badgeElement =
    document.getElementById(
      "releaseReadinessBadge"
    );

  const targetElement =
    document.getElementById(
      "releaseTargetVersion"
    );

  const progressElement =
    document.getElementById(
      "releaseReadinessProgress"
    );

  const progressTextElement =
    document.getElementById(
      "releaseReadinessProgressText"
    );

  const healthElement =
    document.getElementById(
      "releaseHealthStatus"
    );

  const checklistElement =
    document.getElementById(
      "releaseChecklist"
    );

  const runHealthButton =
    document.getElementById(
      "runReleaseHealthBtn"
    );

  const exportButton =
    document.getElementById(
      "exportReleaseReportBtn"
    );

  const resetButton =
    document.getElementById(
      "resetReleaseChecklistBtn"
    );

  const messageElement =
    document.getElementById(
      "releaseReadinessMessage"
    );

  let checklistState =
    loadChecklistState();

  let runningHealthCheck =
    false;

  function cloneValue(
    value
  ) {
    return JSON.parse(
      JSON.stringify(
        value
      )
    );
  }

  function createDefaultState() {
    return Object.fromEntries(
      CHECKLIST.map(
        (item) => [
          item.id,
          "pending"
        ]
      )
    );
  }

  function loadChecklistState() {
    const defaultState =
      createDefaultState();

    try {
      const rawValue =
        localStorage
          .getItem(
            STORAGE_KEY
          );

      if (!rawValue) {
        return defaultState;
      }

      const parsed =
        JSON.parse(
          rawValue
        );

      const storedItems =
        parsed?.items || {};

      CHECKLIST.forEach(
        (item) => {
          const storedState =
            String(
              storedItems[
                item.id
              ] ||
              ""
            );

          if (
            VALID_STATES.has(
              storedState
            )
          ) {
            defaultState[
              item.id
            ] =
              storedState;
          }
        }
      );

      return defaultState;
    } catch (error) {
      console.warn(
        "[JYM Log] 릴리스 체크리스트 불러오기 실패",
        error
      );

      return defaultState;
    }
  }

  function saveChecklistState() {
    try {
      localStorage
        .setItem(
          STORAGE_KEY,
          JSON.stringify({
            schemaVersion: 1,

            appVersion:
              window.JYMLog
                .config
                ?.version ||
              "확인 불가",

            targetVersion:
              TARGET_VERSION,

            updatedAt:
              Date.now(),

            items:
              checklistState
          })
        );

      return true;
    } catch (error) {
      console.warn(
        "[JYM Log] 릴리스 체크리스트 저장 실패",
        error
      );

      return false;
    }
  }

  function getHealthReport() {
    return (
      window.JYMLog
        .appHealth
        ?.getLastReport?.() ||
      null
    );
  }

  function createManualSummary() {
    const summary = {
      total:
        CHECKLIST.length,

      pending: 0,
      pass: 0,
      fail: 0
    };

    CHECKLIST.forEach(
      (item) => {
        const state =
          checklistState[
            item.id
          ] ||
          "pending";

        summary[state] += 1;
      }
    );

    summary.percent =
      summary.total > 0
        ? Math.round(
            (
              summary.pass /
              summary.total
            ) * 100
          )
        : 0;

    return summary;
  }

  function evaluateReadiness() {
    const manual =
      createManualSummary();

    const health =
      getHealthReport();

    const healthOverall =
      health
        ?.summary
        ?.overall ||
      "pending";

    const ready =
      manual.pass ===
        manual.total &&
      healthOverall ===
        "pass";

    let overall =
      ready
        ? "pass"
        : "warn";

    if (
      manual.fail > 0 ||
      healthOverall ===
        "fail"
    ) {
      overall =
        "fail";
    }

    return {
      ready,
      overall,
      manual,
      health,
      healthOverall
    };
  }

  function getStateLabel(
    state
  ) {
    const labels = {
      pending: "미확인",
      pass: "통과",
      fail: "실패"
    };

    return (
      labels[state] ||
      "미확인"
    );
  }

  function getHealthLabel(
    state
  ) {
    const labels = {
      pass: "전체 정상",
      warn: "주의 항목 있음",
      fail: "실패 항목 있음",
      pending: "실행 전"
    };

    return (
      labels[state] ||
      "확인 전"
    );
  }

  function setMessage(
    message
  ) {
    if (messageElement) {
      messageElement
        .textContent =
          String(message);
    }
  }

  function renderChecklist() {
    if (!checklistElement) {
      return;
    }

    checklistElement
      .replaceChildren();

    CHECKLIST.forEach(
      (item, index) => {
        const row =
          document.createElement(
            "div"
          );

        row.className =
          "release-check-item";

        row.dataset.state =
          checklistState[
            item.id
          ];

        const content =
          document.createElement(
            "div"
          );

        content.className =
          "release-check-copy";

        const group =
          document.createElement(
            "span"
          );

        group.className =
          "release-check-group";

        group.textContent =
          item.group;

        const title =
          document.createElement(
            "strong"
          );

        title.textContent = [
          index + 1,
          ". ",
          item.title
        ].join("");

        const description =
          document.createElement(
            "p"
          );

        description.textContent =
          item.description;

        content.append(
          group,
          title,
          description
        );

        const select =
          document.createElement(
            "select"
          );

        select.className =
          "release-check-select";

        select.setAttribute(
          "aria-label",
          `${item.title} 테스트 결과`
        );

        [
          "pending",
          "pass",
          "fail"
        ].forEach(
          (state) => {
            const option =
              document.createElement(
                "option"
              );

            option.value =
              state;

            option.textContent =
              getStateLabel(
                state
              );

            select.appendChild(
              option
            );
          }
        );

        select.value =
          checklistState[
            item.id
          ];

        select.addEventListener(
          "change",
          () => {
            const nextState =
              VALID_STATES.has(
                select.value
              )
                ? select.value
                : "pending";

            checklistState[
              item.id
            ] =
              nextState;

            row.dataset.state =
              nextState;

            saveChecklistState();
            renderOverview();
          }
        );

        row.append(
          content,
          select
        );

        checklistElement
          .appendChild(
            row
          );
      }
    );
  }

  function renderOverview() {
    const readiness =
      evaluateReadiness();

    const {
      manual,
      healthOverall,
      ready,
      overall
    } = readiness;

    if (targetElement) {
      targetElement.textContent =
        TARGET_VERSION;
    }

    if (summaryElement) {
      summaryElement.textContent =
        [
          `통과 ${manual.pass}`,
          `실패 ${manual.fail}`,
          `미확인 ${manual.pending}`
        ].join(" · ");
    }

    if (badgeElement) {
      badgeElement.dataset.state =
        overall;

      badgeElement.textContent =
        ready
          ? "배포 준비 완료"
          : overall === "fail"
            ? "수정 필요"
            : "점검 진행 중";
    }

    if (progressElement) {
      progressElement.style.width =
        `${manual.percent}%`;

      progressElement
        .setAttribute(
          "aria-valuenow",
          String(
            manual.percent
          )
        );
    }

    if (progressTextElement) {
      progressTextElement
        .textContent =
          `${manual.percent}%`;
    }

    if (healthElement) {
      healthElement.dataset.state =
        healthOverall;

      healthElement.textContent =
        getHealthLabel(
          healthOverall
        );
    }

    if (ready) {
      setMessage(
        `${TARGET_VERSION} 전환 조건을 모두 충족했습니다.`
      );
    } else if (
      overall === "fail"
    ) {
      setMessage(
        "실패한 회귀 테스트나 자가진단 항목을 먼저 해결해 주세요."
      );
    } else if (
      healthOverall ===
      "pending"
    ) {
      setMessage(
        "자가진단을 실행하고 수동 회귀 테스트를 완료해 주세요."
      );
    } else {
      setMessage(
        "미확인 회귀 테스트를 계속 진행해 주세요."
      );
    }

    if (exportButton) {
      exportButton.disabled =
        false;
    }
  }

  function createReleaseReport() {
    const readiness =
      evaluateReadiness();

    return {
      schemaVersion: 1,

      reportType:
        "jym-log-release-readiness",

      generatedAt:
        new Date()
          .toISOString(),

      sourceVersion:
        window.JYMLog
          .config
          ?.version ||
        "확인 불가",

      targetVersion:
        TARGET_VERSION,

      ready:
        readiness.ready,

      overall:
        readiness.overall,

      manualSummary:
        readiness.manual,

      checklist:
        CHECKLIST.map(
          (item) => ({
            id:
              item.id,

            group:
              item.group,

            title:
              item.title,

            status:
              checklistState[
                item.id
              ] ||
              "pending"
          })
        ),

      healthReport:
        readiness.health
          ? cloneValue(
              readiness.health
            )
          : null,

      environment: {
        online:
          navigator.onLine,

        secureContext:
          window.isSecureContext,

        serviceWorkerSupported:
          "serviceWorker" in
          navigator
      }
    };
  }

  function createFilename() {
    const timestamp =
      new Date()
        .toISOString()
        .replace(
          /[:.]/g,
          "-"
        );

    return [
      "jym-log-release-readiness-",
      TARGET_VERSION
        .replace(
          /\./g,
          "-"
        ),
      "-",
      timestamp,
      ".json"
    ].join("");
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

    document.body
      .appendChild(
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

  function exportReport() {
    const report =
      createReleaseReport();

    downloadJson(
      report,
      createFilename()
    );

    setMessage(
      report.ready
        ? "정식 배포 준비 완료 보고서를 저장했습니다."
        : "현재 진행 상태의 릴리스 점검 보고서를 저장했습니다."
    );

    return report;
  }

  async function runHealthCheck() {
    const healthApi =
      window.JYMLog
        .appHealth;

    if (
      typeof healthApi
        ?.run !==
      "function"
    ) {
      setMessage(
        "앱 자가진단 기능을 불러오지 못했습니다."
      );

      return null;
    }

    if (runningHealthCheck) {
      return healthApi
        .getLastReport?.() ||
        null;
    }

    runningHealthCheck =
      true;

    if (runHealthButton) {
      runHealthButton.disabled =
        true;

      runHealthButton.setAttribute(
        "aria-busy",
        "true"
      );

      runHealthButton.textContent =
        "자가진단 중...";
    }

    try {
      const report =
        await healthApi.run();

      renderOverview();

      return report;
    } catch (error) {
      console.warn(
        "[JYM Log] 정식 배포 준 자가진단 실행 실패",
        error
      );

      setMessage(
        error?.message ||
        "앱 자가진단을 실행하지 못했습니다."
      );

      return null;
    } finally {
      runningHealthCheck =
        false;

      if (runHealthButton) {
        runHealthButton.disabled =
          false;

        runHealthButton
          .removeAttribute(
            "aria-busy"
          );

        runHealthButton.textContent =
          "자가진단 다시 실행";
      }
    }
  }

  function resetChecklist() {
    const confirmed =
      window.confirm(
        "수동 회귀 테스트 결과를 모두 미확인 상태로 초기화할까요?"
      );

    if (!confirmed) {
      return;
    }

    checklistState =
      createDefaultState();

    saveChecklistState();
    renderChecklist();
    renderOverview();

    setMessage(
      "수동 회귀 테스트 결과를 초기화했습니다."
    );
  }

  function initialize() {
    renderChecklist();
    renderOverview();

    runHealthButton
      ?.addEventListener(
        "click",
        () => {
          void runHealthCheck();
        }
      );

    exportButton
      ?.addEventListener(
        "click",
        exportReport
      );

    resetButton
      ?.addEventListener(
        "click",
        resetChecklist
      );

    detailsElement
      ?.addEventListener(
        "toggle",
        () => {
          if (
            detailsElement.open
          ) {
            renderOverview();
          }
        }
      );

    window.addEventListener(
      "jym-log:health-check-complete",
      renderOverview
    );

    window.addEventListener(
      "online",
      renderOverview
    );

    window.addEventListener(
      "offline",
      renderOverview
    );
  }

  initialize();

  window.JYMLog
    .releaseReadiness =
      Object.freeze({
        runHealthCheck,
        exportReport,

        getReport:
          createReleaseReport,

        get targetVersion() {
          return TARGET_VERSION;
        },

        get isReady() {
          return evaluateReadiness()
            .ready;
        }
      });
})();