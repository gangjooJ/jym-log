import {
  browserLocalPersistence,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  auth
} from "./firebase-client.js";

import {
  ensureUserProfile,
  updateUserNickname
} from "./profile.js";

import {
  initializeWorkoutSync,
  stopWorkoutSync
} from "./sync.js";

import {
  ensureActiveRoutine
} from "./routines.js?v=rc1-1";

import "./sessions.js";
import "./history.js";
import "./analysis.js";

const workout =
  window.JYMLog.workout;

const authScreen =
  document.getElementById("authScreen");

const mainApp =
  document.getElementById("mainApp");

const googleLoginBtn =
  document.getElementById("googleLoginBtn");

const logoutBtn =
  document.getElementById("logoutBtn");

const authMessage =
  document.getElementById("authMessage");

const userName =
  document.getElementById("userName");

const userEmail =
  document.getElementById("userEmail");

const userInitial =
  document.getElementById("userInitial");

const nicknameInput =
  document.getElementById(
    "nicknameInput"
  );

const saveNicknameBtn =
  document.getElementById(
    "saveNicknameBtn"
  );

const nicknameMessage =
  document.getElementById(
    "nicknameMessage"
  );

let signedInUser = null;

const googleProvider =
  new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account"
});

function setAuthMessage(
  message,
  isError = false
) {
  authMessage.textContent = message;

  authMessage.classList.toggle(
    "error",
    isError
  );
}

function setNicknameMessage(
  message,
  status = "default"
) {
  nicknameMessage.textContent =
    message;

  nicknameMessage.classList.toggle(
    "success",
    status === "success"
  );

  nicknameMessage.classList.toggle(
    "error",
    status === "error"
  );
}

function setLoginLoading(isLoading) {
  googleLoginBtn.disabled = isLoading;

  googleLoginBtn.querySelector(
    "span:last-child"
  ).textContent = isLoading
    ? "Google 계정 확인 중..."
    : "Google로 계속하기";
}

function getUserInitial(sourceValue) {
  const source =
    typeof sourceValue === "string"
      ? sourceValue
      : (
          sourceValue?.displayName ||
          sourceValue?.email ||
          "J"
        );

  return source
    .trim()
    .charAt(0)
    .toUpperCase();
}

function showSignedOut() {
  signedInUser = null;

  mainApp.classList.add("hidden");
  authScreen.classList.remove("hidden");

  userName.textContent =
    "로그인 사용자";

  userEmail.textContent = "";

  userInitial.textContent = "J";

  nicknameInput.value = "";

  setNicknameMessage(
    "공백을 제외하고 2자 이상 입력해 주세요."
  );

  setLoginLoading(false);

  setAuthMessage(
    "Google 계정으로 로그인해 주세요."
  );
}

function showSignedIn(
  user,
  profile = {}
) {
  signedInUser = user;

  const nickname =
    profile.nickname ||
    user.displayName ||
    "JYM Log 사용자";

  authScreen.classList.add("hidden");
  mainApp.classList.remove("hidden");

  userName.textContent =
    nickname;

  userEmail.textContent =
    user.email || "";

  userInitial.textContent =
    getUserInitial(nickname);

  nicknameInput.value =
    nickname;

  setNicknameMessage(
    "PC와 모바일에서 동일한 닉네임이 사용됩니다."
  );

  setLoginLoading(false);

  console.info(
    `[JYM Log] 로그인 사용자 확인: ${user.uid}`
  );
}

function getFriendlyAuthError(error) {
  switch (error.code) {
    case "auth/popup-closed-by-user":
      return "로그인 창이 닫혔습니다. 다시 시도해 주세요.";

    case "auth/cancelled-popup-request":
      return "이미 로그인 요청을 처리하고 있습니다.";

    case "auth/popup-blocked":
      return "로그인 창이 차단되었습니다. 브라우저의 팝업을 허용해 주세요.";

    case "auth/unauthorized-domain":
      return "현재 주소가 Firebase 승인 도메인에 등록되지 않았습니다.";

    case "auth/network-request-failed":
      return "네트워크 연결을 확인한 뒤 다시 시도해 주세요.";

    case "auth/operation-not-supported-in-this-environment":
      return "현재 실행 환경에서는 Google 로그인을 시작할 수 없습니다.";

    default:
      return "로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }
}

async function loginWithGoogle() {
  setLoginLoading(true);

  setAuthMessage(
    "Google 로그인 창을 여는 중입니다."
  );

  try {
    await signInWithPopup(
      auth,
      googleProvider
    );
  } catch (error) {
    console.error(
      "[JYM Log] Google 로그인 실패",
      error
    );

    setLoginLoading(false);

    setAuthMessage(
      getFriendlyAuthError(error),
      true
    );
  }
}

async function logout() {
  const confirmed = window.confirm(
    "JYM Log에서 로그아웃할까요?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await signOut(auth);
  } catch (error) {
    console.error(
      "[JYM Log] 로그아웃 실패",
      error
    );

    window.alert(
      "로그아웃하지 못했습니다. 다시 시도해 주세요."
    );
  }
}

async function saveNickname() {
  if (!signedInUser?.uid) {
    setNicknameMessage(
      "로그인 사용자를 확인할 수 없습니다.",
      "error"
    );

    return;
  }

  saveNicknameBtn.disabled = true;
  nicknameInput.disabled = true;

  setNicknameMessage(
    "닉네임을 저장하고 있습니다."
  );

  try {
    const nickname =
      await updateUserNickname(
        signedInUser.uid,
        nicknameInput.value
      );

    nicknameInput.value =
      nickname;

    userName.textContent =
      nickname;

    userInitial.textContent =
      getUserInitial(nickname);

    setNicknameMessage(
      "닉네임이 저장되었습니다.",
      "success"
    );
  } catch (error) {
    console.error(
      "[JYM Log] 닉네임 저장 실패",
      error
    );

    setNicknameMessage(
      error.message ||
      "닉네임을 저장하지 못했습니다.",
      "error"
    );
  } finally {
    saveNicknameBtn.disabled = false;
    nicknameInput.disabled = false;
    nicknameInput.focus();
  }
}

async function initializeAuth() {
  if (
    !authScreen ||
    !mainApp ||
    !googleLoginBtn ||
    !logoutBtn ||
    !nicknameInput ||
    !saveNicknameBtn ||
    !nicknameMessage
  ) {
    throw new Error(
      "인증 화면 요소를 찾을 수 없습니다. index.html의 ID를 확인하세요."
    );
  }

  googleLoginBtn.addEventListener(
    "click",
    loginWithGoogle
  );

  logoutBtn.addEventListener(
    "click",
    logout
  );

  saveNicknameBtn.addEventListener(
    "click",
    saveNickname
  );

  nicknameInput.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();

      void saveNickname();
    }
  );

  try {
    await setPersistence(
      auth,
      browserLocalPersistence
    );
  } catch (error) {
    console.warn(
      "[JYM Log] 로그인 상태 저장 설정 실패",
      error
    );
  }

  onAuthStateChanged(
  auth,
  async (user) => {
    if (!user) {
      stopWorkoutSync();
      workout.deactivateUser();

      showSignedOut();
      return;
    }

    setAuthMessage(
      "사용자 운동 기록을 준비하고 있습니다."
    );

    /**
     * 먼저 이 기기의 사용자별
     * LocalStorage 공간을 활성화합니다.
     */
    workout.activateUser(
      user.uid
    );

    let userProfile = null;

    try {
      const profileResult =
        await ensureUserProfile(user);

      userProfile =
        profileResult.profile;
    } catch (error) {
      console.error(
        "[JYM Log] 사용자 프로필 저장 실패",
        error
      );
    }

    try {
      await ensureActiveRoutine(
        user.uid
      );
    } catch (error) {
      console.error(
        "[JYM Log] 사용자 루틴 준비 실패",
        error
      );
    }

    try {
      await initializeWorkoutSync(
        user.uid
      );
    } catch (error) {
      console.error(
        "[JYM Log] 운동 기록 동기화 초기화 실패",
        error
      );
    }

    window.dispatchEvent(
      new CustomEvent(
        "jym-log:user-state-ready"
      )
    );

    showSignedIn(
      user,
      userProfile || {}
    );
  }
);
}

initializeAuth().catch((error) => {
  console.error(
    "[JYM Log] 인증 초기화 실패",
    error
  );

  setLoginLoading(false);

  setAuthMessage(
    "로그인 기능을 불러오지 못했습니다. 페이지를 새로고침해 주세요.",
    true
  );
});
