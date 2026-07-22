(() => {
  "use strict";

  window.JYMLog =
    window.JYMLog || {};

  const LAYER_ID =
    "app-error-recovery";

  const STORAGE_KEY =
    "jym-log:runtime-error";

  const DEDUPE_WINDOW_MS =
    1500;

  const MAX_TEXT_LENGTH =
    1600;

  const MAX_STACK_LENGTH =
    3200;

  const layerManager =
    window.JYMLog.layerManager;

  const modal =
    document.getElementById(
      "appErrorModal"
    );

  const titleElement =
    document.getElementById(
      "appErrorTitle"
    );

  const messageElement =
    document.getElementById(
      "appErrorMessage"
    );

  const metaElement =
    document.getElementById(
      "appErrorMeta"
    );

  const detailsElement =
    document.getElementById(
      "appErrorDetails"
    );

  const statusElement =
    document.getElementById(
      "appErrorStatus"
    );

  const continueButton =
    document.getElementById(
      "continueAfterErrorBtn"
    );

  const copyButton =
    document.getElementById(
      "copyAppErrorBtn"
    );

  const reloadButton =
    document.getElementById(
      "reloadAppAfterErrorBtn"
    );

  let initialized =
    false;

  let pendingError =
    null;

  let currentError =
    loadStoredError();

  let lastFingerprint =
    "";

  let lastCapturedAt =
    0;

  let captureInProgress =
    false;

  function cloneValue(value) {
    if (!value) {
      return null;
    }

    return JSON.parse(
      JSON.stringify(value)
    );
  }

  function safeStringify(value) {
    try {
      return JSON.stringify(
        value
      );
    } catch (error) {
      return Object.prototype
        .toString
        .call(value);
    }
  }

  function sanitizeText(
    value,
    maxLength =
      MAX_TEXT_LENGTH
  ) {
    let text =
      String(
        value ??
        ""
      );

    /*
     * 오류 정보에 계정 이메일이나
     * 긴 사용자 식별자가 포함되지 않도록 가립니다.
     */
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

    if (
      window.location
        .origin
    ) {
      text =
        text.split(
          window.location
            .origin
        ).join("");
    }

    return text.slice(
      0,
      maxLength
    );
  }

  function sanitizeSource(
    value
  ) {
    const source =
      String(
        value ||
        ""
      );

    if (!source) {
      return "";
    }

    try {
      const url =
        new URL(
          source,
          window.location
            .href
        );

      const path =
        url.pathname ||
        "/";

      if (
        url.origin ===
        window.location
          .origin
      ) {
        return path;
      }

      return [
        url.hostname,
        path
      ].join("");
    } catch (error) {
      return sanitizeText(
        source,
        500
      );
    }
  }

  function extractErrorParts(
    value
  ) {
    if (
      value instanceof
      Error
    ) {
      return {
        name:
          sanitizeText(
            value.name ||
            "Error",
            100
          ),

        message:
          sanitizeText(
            value.message ||
            "알 수 없는 오류"
          ),

        stack:
          sanitizeText(
            value.stack ||
            "",
            MAX_STACK_LENGTH
          )
      };
    }

    if (
      value &&
      typeof value ===
        "object"
    ) {
      return {
        name:
          sanitizeText(
            value.name ||
            "Error",
            100
          ),

        message:
          sanitizeText(
            value.message ||
            safeStringify(
              value
            ) ||
            "알 수 없는 오류"
          ),

        stack:
          sanitizeText(
            value.stack ||
            "",
            MAX_STACK_LENGTH
          )
      };
    }

    return {
      name: "Error",

      message:
        sanitizeText(
          value ||
          "알 수 없는 오류"
        ),

      stack: ""
    };
  }

  function createErrorRecord({
    type,
    name,
    message,
    stack = "",
    source = "",
    line = 0,
    column = 0
  }) {
    return {
      schemaVersion: 1,

      type:
        String(
          type ||
          "runtime"
        ),

      name:
        sanitizeText(
          name ||
          "Error",
          100
        ),

      message:
        sanitizeText(
          message ||
          "앱 실행 중 오류가 발생했습니다."
        ),

      stack:
        sanitizeText(
          stack,
          MAX_STACK_LENGTH
        ),

      source:
        sanitizeSource(
          source
        ),

      line:
        Math.max(
          0,
          Number(line) || 0
        ),

      column:
        Math.max(
          0,
          Number(column) || 0
        ),

      occurredAt:
        Date.now(),

      appVersion:
        String(
          window.JYMLog
            .config
            ?.version ||
          "확인 불가"
        ),

      online:
        navigator.onLine,

      visibility:
        document
          .visibilityState,

      route:
        window.location
          .pathname ||
        "/"
    };
  }

  function createWindowErrorRecord(
    event
  ) {
    const parts =
      extractErrorParts(
        event.error ||
        event.message
      );

    return createErrorRecord({
      type: "runtime",
      name: parts.name,
      message:
        event.message ||
        parts.message,
      stack:
        parts.stack,
      source:
        event.filename ||
        "",
      line:
        event.lineno,
      column:
        event.colno
    });
  }

  function createRejectionRecord(
    event
  ) {
    const parts =
      extractErrorParts(
        event.reason
      );

    return createErrorRecord({
      type: "promise",
      name: parts.name,
      message:
        parts.message,
      stack:
        parts.stack
    });
  }

  function createResourceErrorRecord(
    target
  ) {
    const tagName =
      String(
        target?.tagName ||
        "RESOURCE"
      ).toUpperCase();

    const source =
      target?.src ||
      target?.href ||
      "";

    return createErrorRecord({
      type: "resource",

      name:
        `${tagName}LoadError`,

      message:
        `${tagName} 파일을 불러오지 못했습니다.`,

      source
    });
  }

  function shouldIgnoreError(
    record
  ) {
    const name =
      String(
        record?.name ||
        ""
      ).toLowerCase();

    const message =
      String(
        record?.message ||
        ""
      ).toLowerCase();

    if (
      name ===
      "aborterror"
    ) {
      return true;
    }

    if (
      message.includes(
        "resizeobserver loop"
      )
    ) {
      return true;
    }

    return false;
  }

  function createFingerprint(
    record
  ) {
    return [
      record.type,
      record.name,
      record.message,
      record.source,
      record.line,
      record.column
    ].join("|");
  }

  function loadStoredError() {
    try {
      const rawValue =
        sessionStorage
          .getItem(
            STORAGE_KEY
          );

      if (!rawValue) {
        return null;
      }

      const parsed =
        JSON.parse(
          rawValue
        );

      return parsed
        ?.message
        ? parsed
        : null;
    } catch (error) {
      return null;
    }
  }

  function saveStoredError(
    record
  ) {
    try {
      sessionStorage
        .setItem(
          STORAGE_KEY,
          JSON.stringify(
            record
          )
        );
    } catch (error) {
      console.warn(
        "[JYM Log] 앱 오류 정보 저장 실패",
        error
      );
    }
  }

  function formatOccurredAt(
    value
  ) {
    const date =
      new Date(
        Number(value) ||
        Date.now()
      );

    return new Intl
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
      .format(date);
  }

  function getTypeLabel(
    type
  ) {
    const labels = {
      runtime:
        "앱 실행 오류",

      promise:
        "비동기 작업 오류",

      resource:
        "파일 불러오기 오류"
    };

    return (
      labels[type] ||
      "앱 오류"
    );
  }

  function setStatus(
    message
  ) {
    if (statusElement) {
      statusElement
        .textContent =
          String(message);
    }
  }

  function renderError(
    record
  ) {
    if (!record) {
      return;
    }

    if (titleElement) {
      titleElement.textContent =
        record.type ===
          "resource"
          ? "앱 파일을 불러오지 못했습니다."
          : "앱에서 오류를 감지했습니다.";
    }

    if (messageElement) {
      messageElement
        .textContent =
          record.message ||
          "앱 실행 중 오류가 발생했습니다.";
    }

    if (metaElement) {
      metaElement.textContent =
        [
          getTypeLabel(
            record.type
          ),

          formatOccurredAt(
            record.occurredAt
          ),

          record.source ||
          "위치 정보 없음"
        ].join(" · ");
    }

    if (detailsElement) {
      detailsElement
        .textContent =
          JSON.stringify(
            record,
            null,
            2
          );
    }

    setStatus(
      "앱 데이터는 삭제하지 않고 화면만 다시 불러올 수 있습니다."
    );
  }

  function openPendingError() {
    if (
      !pendingError ||
      !modal
    ) {
      return false;
    }

    renderError(
      pendingError
    );

    if (layerManager) {
      const activeId =
        layerManager
          .activeLayerId;

      /*
       * 다른 편집창이 열려 있으면 겹쳐 표시하지 않고
       * 해당 창이 닫힐 때까지 오류 화면을 대기시킵니다.
       */
      if (
        activeId &&
        activeId !==
          LAYER_ID
      ) {
        return false;
      }

      return layerManager
        .open(
          LAYER_ID
        );
    }

    modal.classList
      .remove(
        "hidden"
      );

    modal.setAttribute(
      "aria-hidden",
      "false"
    );

    reloadButton
      ?.focus();

    return true;
  }

  function dispatchErrorEvent(
    record
  ) {
    window.dispatchEvent(
      new CustomEvent(
        "jym-log:runtime-error",
        {
          detail: {
            error:
              cloneValue(
                record
              )
          }
        }
      )
    );
  }

  function captureError(
    record
  ) {
    if (
      captureInProgress ||
      !record ||
      shouldIgnoreError(
        record
      )
    ) {
      return false;
    }

    const now =
      Date.now();

    const fingerprint =
      createFingerprint(
        record
      );

    if (
      fingerprint ===
        lastFingerprint &&
      now -
        lastCapturedAt <
        DEDUPE_WINDOW_MS
    ) {
      return false;
    }

    captureInProgress =
      true;

    try {
      lastFingerprint =
        fingerprint;

      lastCapturedAt =
        now;

      currentError =
        cloneValue(
          record
        );

      pendingError =
        cloneValue(
          record
        );

      saveStoredError(
        record
      );

      dispatchErrorEvent(
        record
      );

      openPendingError();

      return true;
    } finally {
      captureInProgress =
        false;
    }
  }

  function handleWindowError(
    event
  ) {
    /*
     * script 또는 stylesheet 자체가 로드되지 않은
     * 오류도 별도로 감지합니다.
     */
    if (
      event.target &&
      event.target !==
        window
    ) {
      const tagName =
        String(
          event.target
            .tagName ||
          ""
        ).toUpperCase();

      const relation =
        String(
          event.target
            ?.rel ||
          ""
        ).toLowerCase();

      const isCriticalResource =
        tagName === "SCRIPT" ||
        (
          tagName === "LINK" &&
          relation === "stylesheet"
        );

      if (!isCriticalResource) {
        return;
      }

      captureError(
        createResourceErrorRecord(
            event.target
        )
      );

      return;
    }

    captureError(
      createWindowErrorRecord(
        event
      )
    );
  }

  function handleUnhandledRejection(
    event
  ) {
    captureError(
      createRejectionRecord(
        event
      )
    );
  }

  function closeErrorScreen() {
    pendingError =
      null;

    if (
      layerManager
        ?.isOpen(
          LAYER_ID
        )
    ) {
      return layerManager
        .close(
          LAYER_ID
        );
    }

    if (modal) {
      modal.classList
        .add(
          "hidden"
        );

      modal.setAttribute(
        "aria-hidden",
        "true"
      );
    }

    return true;
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

  async function copyCurrentError() {
    if (!currentError) {
      setStatus(
        "복사할 오류 정보가 없습니다."
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
          currentError,
          null,
          2
        )
      );

      setStatus(
        "오류 정보를 클립보드에 복사했습니다."
      );
    } catch (error) {
      console.warn(
        "[JYM Log] 앱 오류 정보 복사 실패",
        error
      );

      setStatus(
        error?.message ||
        "오류 정보를 복사하지 못했습니다."
      );
    } finally {
      if (copyButton) {
        copyButton.disabled =
          false;

        copyButton.textContent =
          "오류 정보 복사";
      }
    }
  }

  function reloadApplication() {
    if (reloadButton) {
      reloadButton.disabled =
        true;

      reloadButton.setAttribute(
        "aria-busy",
        "true"
      );

      reloadButton.textContent =
        "다시 불러오는 중...";
    }

    if (continueButton) {
      continueButton.disabled =
        true;
    }

    if (copyButton) {
      copyButton.disabled =
        true;
    }

    setStatus(
      "저장소는 유지하고 앱 화면을 다시 불러오고 있습니다."
    );

    window.setTimeout(
      () => {
        window.location
          .reload();
      },
      150
    );
  }

  function openLastError() {
    if (!currentError) {
      return false;
    }

    pendingError =
      cloneValue(
        currentError
      );

    return openPendingError();
  }

  function clearLastError() {
    currentError =
      null;

    pendingError =
      null;

    try {
      sessionStorage
        .removeItem(
          STORAGE_KEY
        );
    } catch (error) {
      console.warn(
        "[JYM Log] 앱 오류 정보 삭제 실패",
        error
      );
    }
  }

  function initialize() {
    if (initialized) {
      return;
    }

    initialized =
      true;

    if (modal) {
      layerManager
        ?.register({
          id:
            LAYER_ID,

          element:
            modal,

          hiddenClass:
            "hidden",

          initialFocus:
            "#reloadAppAfterErrorBtn",

          /*
           * 오류 안내는 배경 터치나 Escape로
           * 실수로 닫히지 않도록 합니다.
           */
          closeOnBackdrop:
            false,

          canClose:
            () => false
        });
    } else {
      console.warn(
        "[JYM Log] 앱 오류 복구 화면 요소를 찾을 수 없습니다."
      );
    }

    continueButton
      ?.addEventListener(
        "click",
        closeErrorScreen
      );

    copyButton
      ?.addEventListener(
        "click",
        () => {
          void copyCurrentError();
        }
      );

    reloadButton
      ?.addEventListener(
        "click",
        reloadApplication
      );

    window.addEventListener(
      "error",
      handleWindowError,
      true
    );

    window.addEventListener(
      "unhandledrejection",
      handleUnhandledRejection
    );

    /*
     * 오류 발생 시 다른 모달이 열려 있었다면
     * 해당 모달이 닫힌 직후 복구 화면을 엽니다.
     */
    window.addEventListener(
      "jym-log:layer-close",
      () => {
        if (!pendingError) {
          return;
        }

        window.setTimeout(
          openPendingError,
          0
        );
      }
    );
  }

  initialize();

  window.JYMLog.errorRecovery =
    Object.freeze({
      openLastError,

      getLastError() {
        return cloneValue(
          currentError
        );
      },

      clearLastError
    });
})();