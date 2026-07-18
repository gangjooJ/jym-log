# JYM Log Firestore 보안 규칙 테스트 매트릭스

## 1. 문서 목적

이 문서는 JYM Log의 `firestore.rules`가 사용자 데이터를 올바르게 허용하거나 차단하는지 검증하기 위한 테스트 기준을 기록한다.

검증 대상은 다음과 같다.

- 로그아웃 사용자의 접근 차단
- 로그인 사용자의 본인 데이터 접근 허용
- 다른 사용자의 데이터 접근 차단
- `userId` 위조 차단
- `uid` 변경 차단
- 지원하지 않는 스키마 버전 차단
- 정의되지 않은 Firestore 경로 접근 차단

---

## 2. 테스트 사용자

테스트에서는 아래 두 사용자를 가정한다.

```text
사용자 A UID: user-a
사용자 B UID: user-b
```

테스트 경로 예시:

```text
users/user-a
users/user-a/appData/currentWorkout
users/user-a/appData/routinePreferences
users/user-a/appData/routineSchedule
users/user-a/routines/main
users/user-a/workoutSessions/session-test-001
```

---

## 3. 결과 표기

| 표기 | 의미 |
|---|---|
| ALLOW | 요청이 허용되어야 함 |
| DENY | 요청이 차단되어야 함 |
| PASS | 실제 결과가 예상과 일치함 |
| FAIL | 실제 결과가 예상과 다름 |

---

## 4. 사용자 프로필 테스트

| ID | 인증 UID | 요청 | 경로 | 주요 데이터 | 예상 |
|---|---|---|---|---|---|
| PROFILE-001 | 로그아웃 | read | `users/user-a` | 없음 | DENY |
| PROFILE-002 | `user-a` | read | `users/user-a` | 없음 | ALLOW |
| PROFILE-003 | `user-a` | read | `users/user-b` | 없음 | DENY |
| PROFILE-004 | `user-a` | create | `users/user-a` | `uid: "user-a"` | ALLOW |
| PROFILE-005 | `user-a` | create | `users/user-a` | `uid: "user-b"` | DENY |
| PROFILE-006 | `user-a` | create | `users/user-b` | `uid: "user-a"` | DENY |
| PROFILE-007 | `user-a` | update | `users/user-a` | 기존 `uid` 유지 | ALLOW |
| PROFILE-008 | `user-a` | update | `users/user-a` | `uid`를 `user-b`로 변경 | DENY |
| PROFILE-009 | `user-a` | delete | `users/user-a` | 없음 | ALLOW |
| PROFILE-010 | `user-a` | delete | `users/user-b` | 없음 | DENY |

---

## 5. 진행 중 운동 상태 테스트

대상 경로:

```text
users/{userId}/appData/currentWorkout
```

정상 데이터 예시:

```javascript
{
  userId: "user-a",
  schemaVersion: 1,
  state: {
    activeExercise: 0,
    started: true,
    startedAt: 1784012400000,
    completedAt: null,
    sets: {},
    fatigue: 3,
    completed: false
  }
}
```

| ID | 인증 UID | 요청 | 경로 | 조건 | 예상 |
|---|---|---|---|---|---|
| WORKOUT-001 | 로그아웃 | read | `users/user-a/appData/currentWorkout` | 없음 | DENY |
| WORKOUT-002 | `user-a` | read | `users/user-a/appData/currentWorkout` | 없음 | ALLOW |
| WORKOUT-003 | `user-a` | read | `users/user-b/appData/currentWorkout` | 없음 | DENY |
| WORKOUT-004 | `user-a` | create | 본인 경로 | `userId: "user-a"`, 버전 1 | ALLOW |
| WORKOUT-005 | `user-a` | create | 본인 경로 | `userId: "user-b"` | DENY |
| WORKOUT-006 | `user-a` | create | 본인 경로 | `schemaVersion: 2` | DENY |
| WORKOUT-007 | `user-a` | update | 본인 경로 | UID와 버전 유지 | ALLOW |
| WORKOUT-008 | `user-a` | update | 본인 경로 | `userId` 변경 | DENY |
| WORKOUT-009 | `user-a` | delete | 본인 경로 | 없음 | ALLOW |
| WORKOUT-010 | `user-a` | delete | 다른 사용자 경로 | 없음 | DENY |

---

## 6. 활성 루틴 설정과 주간 일정 테스트

대상 경로:

```text
users/{userId}/appData/routinePreferences
users/{userId}/appData/routineSchedule
```

두 문서는 모두 경로의 사용자 UID와 같은 `userId`, 그리고 `schemaVersion: 1`을 저장해야 한다.

| ID | 인증 UID | 요청 | 경로 | 조건 | 예상 |
|---|---|---|---|---|---|
| SCHEDULE-001 | 로그아웃 | read | 본인 설정 경로 | 없음 | DENY |
| SCHEDULE-002 | `user-a` | read | `users/user-a/appData/routinePreferences` | 없음 | ALLOW |
| SCHEDULE-003 | `user-a` | read | `users/user-a/appData/routineSchedule` | 없음 | ALLOW |
| SCHEDULE-004 | `user-a` | read | `users/user-b/appData/routineSchedule` | 없음 | DENY |
| SCHEDULE-005 | `user-a` | create | 본인 설정 경로 | 본인 `userId`, 버전 1 | ALLOW |
| SCHEDULE-006 | `user-a` | create | 본인 설정 경로 | 다른 `userId` | DENY |
| SCHEDULE-007 | `user-a` | create | 본인 설정 경로 | 버전 2 또는 버전 누락 | DENY |
| SCHEDULE-008 | `user-a` | update | 본인 설정 경로 | UID와 버전 유지 | ALLOW |
| SCHEDULE-009 | `user-a` | update | 본인 설정 경로 | `userId` 변경 | DENY |
| SCHEDULE-010 | `user-a` | delete | 본인 설정 경로 | 없음 | ALLOW |
| SCHEDULE-011 | `user-a` | delete | 다른 사용자 설정 경로 | 없음 | DENY |

---

## 7. 루틴 테스트

대상 경로:

```text
users/{userId}/routines/{routineId}
```

정상 데이터 예시:

```javascript
{
  id: "main",
  userId: "user-a",
  schemaVersion: 1,
  name: "가슴 · 팔 A",
  code: "upper-a",
  description: "벤치프레스 중심",
  isActive: true,
  exercises: []
}
```

| ID | 인증 UID | 요청 | 경로 | 조건 | 예상 |
|---|---|---|---|---|---|
| ROUTINE-001 | 로그아웃 | read | `users/user-a/routines/main` | 없음 | DENY |
| ROUTINE-002 | `user-a` | read | `users/user-a/routines/main` | 없음 | ALLOW |
| ROUTINE-003 | `user-a` | read | `users/user-b/routines/main` | 없음 | DENY |
| ROUTINE-004 | `user-a` | create | 본인 경로 | 본인 `userId`, 버전 1 | ALLOW |
| ROUTINE-005 | `user-a` | create | 본인 경로 | 다른 `userId` | DENY |
| ROUTINE-006 | `user-a` | create | 본인 경로 | 버전 2 | DENY |
| ROUTINE-007 | `user-a` | update | 본인 경로 | UID와 버전 유지 | ALLOW |
| ROUTINE-008 | `user-a` | update | 본인 경로 | `userId` 변경 | DENY |
| ROUTINE-009 | `user-a` | delete | 본인 경로 | 없음 | ALLOW |
| ROUTINE-010 | `user-a` | delete | 다른 사용자 경로 | 없음 | DENY |

---

## 8. 완료 운동 세션 테스트

대상 경로:

```text
users/{userId}/workoutSessions/{sessionId}
```

정상 데이터 예시:

```javascript
{
  userId: "user-a",
  schemaVersion: 1,
  routineId: "main",
  routineName: "가슴 · 팔 A",
  startedAtMillis: 1784012400000,
  completedAtMillis: 1784016000000,
  durationSeconds: 3600,
  completedSets: 17,
  totalVolume: 8400,
  fatigue: 3,
  exercises: []
}
```

| ID | 인증 UID | 요청 | 경로 | 조건 | 예상 |
|---|---|---|---|---|---|
| SESSION-001 | 로그아웃 | read | 본인 세션 경로 | 없음 | DENY |
| SESSION-002 | `user-a` | read | `users/user-a/...` | 없음 | ALLOW |
| SESSION-003 | `user-a` | read | `users/user-b/...` | 없음 | DENY |
| SESSION-004 | `user-a` | create | 본인 경로 | 본인 `userId`, 버전 1 | ALLOW |
| SESSION-005 | `user-a` | create | 본인 경로 | 다른 `userId` | DENY |
| SESSION-006 | `user-a` | create | 본인 경로 | 버전 2 | DENY |
| SESSION-007 | `user-a` | update | 본인 경로 | UID와 버전 유지 | ALLOW |
| SESSION-008 | `user-a` | update | 본인 경로 | `userId` 변경 | DENY |
| SESSION-009 | `user-a` | delete | 본인 경로 | 없음 | ALLOW |
| SESSION-010 | `user-a` | delete | 다른 사용자 경로 | 없음 | DENY |

---

## 9. 정의되지 않은 경로 테스트

| ID | 인증 UID | 요청 | 경로 | 예상 |
|---|---|---|---|---|
| PATH-001 | 로그아웃 | read | `public/test` | DENY |
| PATH-002 | `user-a` | read | `public/test` | DENY |
| PATH-003 | `user-a` | create | `users/user-a/private/test` | DENY |
| PATH-004 | `user-a` | create | `admin/settings` | DENY |

명시적인 `allow` 조건이 없는 경로는 기본적으로 차단되어야 한다.

---

## 10. Firebase Rules Playground 검사 절차

```text
Firebase Console
→ Firestore Database
→ 규칙
→ Rules Playground
```

각 테스트에서 다음 값을 입력한다.

1. 요청 종류를 선택한다.
   - get
   - list
   - create
   - update
   - delete

2. 문서 경로를 입력한다.

3. 인증 사용 여부를 선택한다.

4. 로그인 테스트에서는 UID를 입력한다.

5. 쓰기 테스트에서는 요청 데이터를 입력한다.

6. 실행 후 ALLOW 또는 DENY 결과를 예상 결과와 비교한다.

7. 테스트 결과와 날짜를 아래 실행 기록에 남긴다.

---

## 11. 핵심 수동 테스트 실행 기록

| 날짜 | 환경 | 테스트 범위 | 결과 | 담당 |
|---|---|---|---|---|
| 미실행 | Rules Playground | 본인 데이터 읽기·쓰기 | 대기 |  |
| 미실행 | Rules Playground | 다른 사용자 접근 차단 | 대기 |  |
| 미실행 | Rules Playground | 잘못된 `userId` 차단 | 대기 |  |
| 미실행 | Rules Playground | 잘못된 스키마 차단 | 대기 |  |
| 미실행 | Rules Playground | 활성 루틴 설정·주간 일정 허용 및 사용자 분리 | 대기 |  |
| 미실행 | 실제 앱 | Google 로그인 후 정상 사용 | 대기 |  |
| 미실행 | 실제 앱 | 로그아웃 후 접근 차단 | 대기 |  |

---

## 12. 자동 테스트 전환 계획

Rules Playground는 빠른 수동 확인에 사용한다.

외부 베타 전에는 Firebase Emulator Suite와 다음 라이브러리를 이용해 자동화한다.

```text
@firebase/rules-unit-testing
```

자동 테스트에서는 다음을 사용한다.

```javascript
assertSucceeds(...)
assertFails(...)
authenticatedContext(...)
unauthenticatedContext(...)
```

우선 자동화 대상:

1. 로그아웃 접근 차단
2. 본인 데이터 접근 허용
3. 다른 사용자 경로 접근 차단
4. `userId` 위조 차단
5. `uid` 변경 차단
6. 잘못된 `schemaVersion` 차단
7. 정의되지 않은 경로 차단

---

## 13. 테스트 완료 조건

다음 조건을 만족하면 Firestore 보안 규칙 검토를 완료한 것으로 판단한다.

- 모든 ALLOW 테스트가 정상 허용됨
- 모든 DENY 테스트가 정상 차단됨
- 사용자 A가 사용자 B의 데이터를 읽거나 수정할 수 없음
- 로그아웃 사용자가 Firestore 데이터에 접근할 수 없음
- 잘못된 `userId`와 스키마 버전이 차단됨
- 실제 앱의 로그인·루틴·운동 기록 기능이 정상 작동함
- 테스트 결과와 실행 날짜가 문서에 기록됨
