import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
  db
} from "./firebase-client.js";

function normalizeNickname(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function getNicknameLength(value) {
  return Array.from(value).length;
}

function createDefaultNickname(user) {
  const source =
    normalizeNickname(
      user.displayName
    ) ||
    "JYM Log 사용자";

  return Array.from(source)
    .slice(0, 20)
    .join("");
}

function validateNickname(value) {
  const nickname =
    normalizeNickname(value);

  const length =
    getNicknameLength(nickname);

  if (length < 2) {
    throw new Error(
      "닉네임은 공백을 제외하고 2자 이상 입력해 주세요."
    );
  }

  if (length > 20) {
    throw new Error(
      "닉네임은 20자 이하로 입력해 주세요."
    );
  }

  return nickname;
}

/**
 * 로그인 사용자의 Firestore 프로필을 확인하고,
 * 없으면 기본 프로필을 생성합니다.
 */
async function ensureUserProfile(user) {
  if (!user?.uid) {
    throw new Error(
      "사용자 UID를 확인할 수 없습니다."
    );
  }

  const userDocument =
    doc(
      db,
      "users",
      user.uid
    );

  const userSnapshot =
    await getDoc(userDocument);

  const existingProfile =
    userSnapshot.exists()
      ? userSnapshot.data()
      : {};

  const provider =
    user.providerData?.[0]?.providerId ||
    "google.com";

  const nickname =
    normalizeNickname(
      existingProfile.nickname
    ) ||
    createDefaultNickname(user);

  const profileData = {
    uid:
      user.uid,

    displayName:
      user.displayName ||
      "JYM Log 사용자",

    email:
      user.email || "",

    photoURL:
      user.photoURL || "",

    provider,

    updatedAt:
      serverTimestamp()
  };

  if (!userSnapshot.exists()) {
    await setDoc(
      userDocument,
      {
        ...profileData,
        nickname,
        createdAt:
          serverTimestamp()
      }
    );

    console.info(
      "[JYM Log] 사용자 프로필 생성 완료"
    );

    return {
      created: true,

      profile: {
        ...profileData,
        nickname
      }
    };
  }

  await setDoc(
    userDocument,
    profileData,
    {
      merge: true
    }
  );

  console.info(
    "[JYM Log] 사용자 프로필 확인 완료"
  );

  return {
    created: false,

    profile: {
      ...existingProfile,
      ...profileData,
      nickname
    }
  };
}

/**
 * 로그인 사용자의 닉네임만 수정합니다.
 */
async function updateUserNickname(
  userId,
  nicknameValue
) {
  if (!userId) {
    throw new Error(
      "로그인 사용자를 확인할 수 없습니다."
    );
  }

  const nickname =
    validateNickname(
      nicknameValue
    );

  const userDocument =
    doc(
      db,
      "users",
      userId
    );

  await setDoc(
    userDocument,
    {
      uid:
        userId,

      nickname,

      updatedAt:
        serverTimestamp()
    },
    {
      merge: true
    }
  );

  console.info(
    "[JYM Log] 사용자 닉네임 저장 완료"
  );

  return nickname;
}

export {
  ensureUserProfile,
  updateUserNickname
};
