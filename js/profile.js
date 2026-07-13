import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
  db
} from "./firebase-client.js";

/**
 * Google 로그인 사용자의 기본 프로필을
 * Firestore users/{uid} 문서에 저장합니다.
 */
async function ensureUserProfile(user) {
  if (!user?.uid) {
    throw new Error(
      "사용자 UID를 확인할 수 없습니다."
    );
  }

  const userDocument =
    doc(db, "users", user.uid);

  const userSnapshot =
    await getDoc(userDocument);

  const provider =
    user.providerData?.[0]?.providerId ||
    "google.com";

  const profileData = {
    uid: user.uid,
    displayName:
      user.displayName || "JYM Log 사용자",
    email:
      user.email || "",
    photoURL:
      user.photoURL || "",
    provider,
    updatedAt:
      serverTimestamp()
  };

  if (!userSnapshot.exists()) {
    await setDoc(userDocument, {
      ...profileData,

      nickname:
        user.displayName || "JYM Log 사용자",

      createdAt:
        serverTimestamp()
    });

    console.info(
      "[JYM Log] 사용자 프로필 생성 완료"
    );

    return {
      created: true
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
    created: false
  };
}

export {
  ensureUserProfile
};