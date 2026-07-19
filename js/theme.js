(function initializeTheme() {
  "use strict";

  const STORAGE_KEY = "jym-log-theme-preference";
  const VALID_PREFERENCES = new Set(["system", "light", "dark"]);
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function readPreference() {
    try {
      const savedPreference = window.localStorage.getItem(STORAGE_KEY);
      return VALID_PREFERENCES.has(savedPreference)
        ? savedPreference
        : "system";
    } catch (error) {
      console.warn("[JYM Log] 테마 설정을 불러오지 못했습니다.", error);
      return "system";
    }
  }

  function resolveTheme(preference) {
    return preference === "system"
      ? (mediaQuery.matches ? "dark" : "light")
      : preference;
  }

  function updateThemeColor(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", theme === "dark" ? "#0d1117" : "#f4f7fb");
  }

  function applyPreference(preference) {
    const safePreference = VALID_PREFERENCES.has(preference)
      ? preference
      : "system";
    const theme = resolveTheme(safePreference);

    document.documentElement.dataset.themePreference = safePreference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    updateThemeColor(theme);

    document.querySelectorAll('input[name="theme"]').forEach((input) => {
      input.checked = input.value === safePreference;
    });
  }

  function savePreference(preference) {
    try {
      window.localStorage.setItem(STORAGE_KEY, preference);
    } catch (error) {
      console.warn("[JYM Log] 테마 설정을 저장하지 못했습니다.", error);
    }

    applyPreference(preference);
  }

  applyPreference(readPreference());

  mediaQuery.addEventListener?.("change", () => {
    if (readPreference() === "system") {
      applyPreference("system");
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    applyPreference(readPreference());

    document.getElementById("themeOptions")?.addEventListener("change", (event) => {
      const input = event.target.closest('input[name="theme"]');
      if (input) {
        savePreference(input.value);
      }
    });
  });

  window.JYMLog = window.JYMLog || {};
  window.JYMLog.theme = Object.freeze({
    get preference() {
      return readPreference();
    },
    setPreference: savePreference
  });
})();
