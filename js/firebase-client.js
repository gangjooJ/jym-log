import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

window.JYMLog = window.JYMLog || {};

const firebaseConfig =
  window.JYMLog.config.firebase;

if (!firebaseConfig) {
  throw new Error(
    "Firebase 설정을 찾을 수 없습니다. config.js를 확인하세요."
  );
}

const firebaseApp =
  initializeApp(firebaseConfig);

const auth =
  getAuth(firebaseApp);

const db =
  getFirestore(firebaseApp);

window.JYMLog.firebase = Object.freeze({
  app: firebaseApp,
  auth,
  db
});

console.info(
  `[${window.JYMLog.config.appName}] Firebase 연결 완료`
);

export {
  firebaseApp,
  auth,
  db
};
