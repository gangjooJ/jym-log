# JYM Log Firebase 데이터 모델

## 1. 문서 목적

이 문서는 JYM Log가 Firebase Authentication과 Cloud Firestore에서 사용하는 데이터 구조를 기록한다.

다음 상황에서 기준 문서로 사용한다.

- 새로운 기능 추가
- Firestore 보안 규칙 검토
- 데이터 동기화 오류 확인
- 스키마 변경과 마이그레이션
- 사용자 데이터 삭제 기능 구현
- 다중 루틴과 주간 일정 기능 확장

---

## 2. 전체 구조

```text
Firebase Authentication
└─ 사용자 UID

users/{uid}
├─ 사용자 프로필 필드
│
├─ appData
│  └─ currentWorkout
│     └─ 진행 중인 운동 상태
│
├─ routines
│  └─ main
│     └─ 현재 사용자 운동 루틴
│
└─ workoutSessions
   ├─ session-{startedAtMillis}
   ├─ session-{startedAtMillis}
   └─ ...
```

모든 사용자 데이터는 Firebase Authentication에서 발급한 UID를 기준으로 구분한다.

---

## 3. 사용자 프로필

### 경로

```text
users/{uid}
```

### 목적

Google 로그인 사용자 정보와 JYM Log 전용 닉네임을 저장한다.

### 필드

| 필드 | 형식 | 필수 | 설명 |
|---|---|---:|---|
| `uid` | string | O | Firebase Authentication 사용자 UID |
| `displayName` | string | O | Google 계정 표시 이름 |
| `nickname` | string | O | JYM Log에서 사용할 사용자 닉네임 |
| `email` | string | O | Google 로그인 이메일 |
| `photoURL` | string |  | Google 프로필 이미지 URL |
| `provider` | string | O | 로그인 제공자. 현재 `google.com` |
| `createdAt` | timestamp | O | 프로필 최초 생성 시각 |
| `updatedAt` | timestamp | O | 프로필 최근 갱신 시각 |

### 예시

```javascript
{
  uid: "firebase-user-uid",
  displayName: "Google 사용자 이름",
  nickname: "JYM 사용자",
  email: "user@example.com",
  photoURL: "https://...",
  provider: "google.com",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 변경 규칙

- 문서 ID와 `uid` 필드는 같은 값을 사용한다.
- 사용자는 자신의 프로필만 읽고 수정할 수 있다.
- 닉네임은 2~20자로 제한한다.
- `uid`는 프로필 생성 이후 다른 값으로 바꿀 수 없다.

---

## 4. 진행 중인 운동 상태

### 경로

```text
users/{uid}/appData/currentWorkout
```

### 목적

현재 진행 중이거나 마지막으로 입력한 운동 상태를 PC와 모바일에서 공유한다.

### 최상위 필드

| 필드 | 형식 | 필수 | 설명 |
|---|---|---:|---|
| `userId` | string | O | 데이터 소유 사용자 UID |
| `schemaVersion` | number | O | 현재 스키마 버전. 현재 `1` |
| `state` | map | O | 현재 운동 상태 |
| `updatedAt` | timestamp | O | Firestore 서버 저장 시각 |
| `clientUpdatedAt` | number | O | 기기에서 현재 운동 상태가 마지막으로 변경된 시각의 밀리초 값 |

### `state` 필드

| 필드 | 형식 | 설명 |
|---|---|---|
| `activeExercise` | number | 현재 표시 중인 운동 순서 |
| `started` | boolean | 운동 시작 여부 |
| `startedAt` | number 또는 null | 운동 시작 시각의 밀리초 값 |
| `completedAt` | number 또는 null | 운동 완료 시각의 밀리초 값 |
| `sets` | map | 세트별 중량·반복·완료 상태 |
| `fatigue` | number | 사용자가 선택한 피로도 1~5 |
| `completed` | boolean | 운동 완료 여부 |
| `updatedAt` | number | 로컬 운동 상태가 마지막으로 변경된 시각의 밀리초 값 |

### 세트 키 형식

```text
{exerciseIndex}-{setIndex}
```

예시:

```text
0-0
0-1
1-0
```

### 세트 데이터 예시

```javascript
{
  weight: 80,
  reps: 5,
  done: true
}
```

### 전체 예시

```javascript
{
  userId: "firebase-user-uid",
  schemaVersion: 1,

  state: {
    activeExercise: 0,
    started: true,
    startedAt: 1784012400000,
    completedAt: null,

    sets: {
      "0-0": {
        weight: 80,
        reps: 5,
        done: true
      },

      "0-1": {
        weight: 80,
        reps: 5,
        done: false
      }
    },

    fatigue: 3,
    completed: false
  },

  updatedAt: Timestamp
}
```

### 현재 동기화 정책

```text
운동 상태 변경
→ state.updatedAt 갱신
→ 사용자별 LocalStorage 즉시 저장
→ 미전송 동기화 큐 별도 저장
→ 온라인이면 Firestore 업로드
→ 성공하면 미전송 큐 삭제

---

## 5. 사용자 운동 루틴

### 현재 경로

```text
users/{uid}/routines/main
```

현재는 사용자당 하나의 기본 활성 루틴을 사용한다.

향후 다중 루틴을 구현하면 다음과 같이 확장한다.

```text
users/{uid}/routines/chest-arms
users/{uid}/routines/back-shoulders
users/{uid}/routines/shoulders-arms
```

### 루틴 필드

| 필드 | 형식 | 필수 | 설명 |
|---|---|---:|---|
| `id` | string | O | 루틴 문서 ID |
| `userId` | string | O | 루틴 소유 사용자 UID |
| `schemaVersion` | number | O | 현재 스키마 버전. 현재 `1` |
| `name` | string | O | 사용자에게 표시할 루틴 이름 |
| `code` | string | O | 루틴 내부 식별 코드 |
| `description` | string | O | 루틴 설명 |
| `isActive` | boolean | O | 현재 활성 루틴 여부 |
| `exercises` | array | O | 운동 설정 배열 |
| `createdAt` | timestamp | O | 최초 생성 시각 |
| `updatedAt` | timestamp | O | 최근 수정 시각 |

### 운동 객체

| 필드 | 형식 | 필수 | 설명 |
|---|---|---:|---|
| `id` | string | O | 운동 고유 식별자 |
| `order` | number | O | 루틴 안의 표시 순서 |
| `name` | string | O | 운동 이름 |
| `icon` | string | O | 운동 카드 아이콘 문자 |
| `type` | string | O | `고정 반복형` 또는 `반복 범위형` |
| `weight` | number | O | 기본 목표 중량 |
| `sets` | number | O | 목표 세트 수 |
| `min` | number | O | 최소 반복 수 |
| `max` | number | O | 최대 반복 수 |
| `rest` | number | O | 세트 간 휴식 시간(초) |
| `increment` | number | O | 목표 중량 증량 단위 |
| `previous` | string |  | 이전 기록 안내 문구 |

### 운동 객체 예시

```javascript
{
  id: "exercise-bench-press",
  order: 0,
  name: "벤치프레스",
  icon: "B",
  type: "고정 반복형",
  weight: 80,
  sets: 5,
  min: 5,
  max: 5,
  rest: 180,
  increment: 2.5,
  previous: "80kg · 5 / 5 / 5 / 5 / 4"
}
```

### 입력 제한

| 항목 | 제한 |
|---|---|
| 루틴 이름 | 2~30자 |
| 루틴 설명 | 최대 60자 |
| 루틴당 운동 | 1~30개 |
| 운동 이름 | 2~30자 |
| 중량 | 0~1000kg |
| 세트 수 | 1~20세트 |
| 반복 수 | 1~100회 |
| 휴식 시간 | 0~1800초 |
| 증량 단위 | 0 초과, 100kg 이하 |

### 순서 변경

운동 배열의 위치와 각 운동의 `order` 값을 함께 갱신한다.

```text
첫 번째 운동 order: 0
두 번째 운동 order: 1
세 번째 운동 order: 2
```

화살표 또는 드래그 순서 변경이 끝난 후 Firestore에는 재정렬된 배열 전체를 저장한다.

---

## 6. 완료 운동 세션

### 경로

```text
users/{uid}/workoutSessions/{sessionId}
```

### 세션 ID

```text
session-{startedAtMillis}
```

운동 시작 시각을 문서 ID로 사용한다.

예시:

```text
session-1784012400000
```

동일한 운동 완료 요청이 재실행돼도 같은 문서 ID를 사용하므로 새로운 중복 문서 대신 기존 문서를 갱신한다.

### 세션 필드

| 필드 | 형식 | 설명 |
|---|---|---|
| `userId` | string | 사용자 UID |
| `schemaVersion` | number | 현재 스키마 버전 |
| `routineId` | string | 운동에 사용한 루틴 ID |
| `routineName` | string | 완료 당시 루틴 이름 |
| `routineCode` | string | 완료 당시 루틴 코드 |
| `startedAt` | timestamp | 운동 시작 시각 |
| `completedAt` | timestamp | 운동 완료 시각 |
| `startedAtMillis` | number | 시작 시각 밀리초 |
| `completedAtMillis` | number | 완료 시각 밀리초 |
| `durationSeconds` | number | 전체 운동 시간(초) |
| `completedSets` | number | 완료 처리한 세트 수 |
| `totalVolume` | number | 완료 세트의 중량 × 반복 합계 |
| `fatigue` | number | 운동 후 피로도 1~5 |
| `benchPressSuccess` | boolean | 현재 벤치프레스 성공 판정 |
| `exercises` | array | 완료 당시 운동과 세트 스냅샷 |
| `savedAt` | timestamp | Firestore 저장 시각 |

### 완료 운동의 운동 객체

```javascript
{
  exerciseId: "exercise-bench-press",
  exerciseIndex: 0,
  order: 0,
  name: "벤치프레스",
  type: "고정 반복형",

  target: {
    weight: 80,
    sets: 5,
    minReps: 5,
    maxReps: 5
  },

  sets: [
    {
      setNumber: 1,
      weight: 80,
      reps: 5,
      done: true
    }
  ]
}
```

### 스냅샷 원칙

완료 세션은 루틴 문서를 참조만 하지 않고 완료 당시의 운동 정보를 복사해 저장한다.

따라서 사용자가 나중에:

- 운동 이름을 변경하거나
- 운동을 삭제하거나
- 목표 중량을 수정하거나
- 운동 순서를 변경해도

과거 완료 세션의 기록은 변경되지 않는다.

---

## 7. LocalStorage 구조

### 기본 키

```text
jym-log-prototype-state
```

### 사용자 전용 키

```text
jym-log-prototype-state:user:{uid}
```

### 기존 데이터 이전 소유자

```text
jym-log-prototype-state:migration-owner
```

기존 로그인 전 기록은 최초로 로그인한 사용자 계정에 한 번만 귀속한다.

---

## 8. 보안 원칙

- 모든 사용자 데이터 경로는 `users/{uid}` 아래에 둔다.
- 로그인하지 않은 사용자의 Firestore 접근은 허용하지 않는다.
- 로그인 사용자는 자신의 UID 경로만 읽고 수정할 수 있다.
- 클라이언트가 저장하는 `userId`와 경로의 `{uid}`는 같아야 한다.
- `schemaVersion`이 현재 지원 버전과 일치해야 한다.
- 부모 문서 규칙과 하위 컬렉션 규칙을 각각 명시한다.
- 관리자용 비밀 키와 서비스 계정 키는 브라우저 코드에 넣지 않는다.

실제 규칙 원본은 저장소 루트의 다음 파일에서 관리한다.

```text
firestore.rules
```

---

## 9. 스키마 버전

현재 데이터 스키마 버전:

```text
1
```

적용 경로:

```text
appData/currentWorkout
routines/{routineId}
workoutSessions/{sessionId}
```

데이터 구조가 변경될 때 기존 필드의 의미를 조용히 바꾸지 않는다.

권장 변경 절차:

```text
1. 새로운 구조 설계
2. schemaVersion 증가
3. 이전 버전 읽기 호환 코드 작성
4. 데이터 마이그레이션
5. 보안 규칙 갱신
6. PC·Android 회귀 테스트
7. 기존 호환 코드 제거 여부 결정
```

---

## 10. 현재 알려진 제한 사항

- 활성 루틴이 현재 `main` 하나로 고정돼 있다.
- `currentWorkout`은 로컬·클라우드 수정 시각 비교가 없다.
- 오프라인 업로드 대기 상태가 메모리에만 존재한다.
- PC와 모바일의 동시 수정 충돌 정책이 없다.
- 벤치프레스 분석이 일부 운동 이름과 첫 번째 운동 위치에 의존한다.
- 계정 삭제 시 하위 컬렉션 자동 삭제 기능이 없다.
- iOS 실기기 동기화 검증이 완료되지 않았다.

---

## 11. 향후 확장 구조

### 다중 루틴

```text
users/{uid}/routines/{routineId}
```

별도 사용자 설정 문서에 활성 루틴 ID를 저장한다.

```text
users/{uid}/appData/preferences
└─ activeRoutineId
```

### 주간 일정

```text
users/{uid}/appData/weeklySchedule
```

예시:

```javascript
{
  monday: {
    type: "routine",
    routineId: "chest-arms"
  },

  tuesday: {
    type: "rest"
  },

  wednesday: {
    type: "routine",
    routineId: "back-shoulders"
  }
}
```

### 동기화 메타데이터

```javascript
{
  revision: 12,
  localUpdatedAt: 1784012400000,
  updatedAt: Timestamp,
  deviceId: "device-id"
}
```

이를 이용해 로컬·클라우드 최신 상태와 기기 간 충돌을 판단한다.