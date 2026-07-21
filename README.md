# JYM Log

JYM Log는 개인의 운동 루틴과 세트 기록을 관리하고, 여러 기기에서 운동 기록을 이어서 사용할 수 있도록 만든 모바일 중심 운동 기록 PWA입니다.

## 배포 주소

https://gangjooj.github.io/jym-log/

## 현재 개발 상태

- 버전: `v0.2.0-rc.1`
- 앱 형태: 모바일 중심 PWA
- 프런트엔드 배포: GitHub Pages
- 인증: Firebase Authentication
- 로그인 방식: Google OAuth
- 클라우드 데이터베이스: Cloud Firestore
- 로컬 저장소: LocalStorage
- 주 개발·테스트 환경:
  - PC Chrome
  - Android Chrome
  - Android 홈 화면 PWA
- 호환성을 고려 중인 환경:
  - iPhone Safari
  - iOS 홈 화면 PWA
- iOS 실기기 테스트: 미완료

## 주요 기능

### 사용자 계정

- Google 계정으로 계속하기
- 최초 로그인 시 자동 회원가입
- 브라우저와 PWA 재실행 후 자동 로그인
- 로그아웃
- 사용자별 Firestore 프로필 생성
- JYM Log 닉네임 조회 및 수정
- 사용자별 데이터 접근 분리

### 운동 진행

- 운동 시작 및 종료
- 운동별 세트 목록 생성
- 세트별 중량과 반복 수 입력
- 중량·반복 수 증감 버튼
- 세트 완료 및 완료 취소
- 운동별 이전·다음 이동
- 휴식 타이머
- 휴식 시간 30초 추가
- 운동 경과 시간 표시
- 피로도 입력
- 운동 완료 요약
- 완료 세트 및 총 볼륨 계산

### 클라우드 동기화

- 사용자별 LocalStorage 분리
- 진행 중 운동 상태 Firestore 저장
- PC와 모바일 간 운동 상태 동기화
- 동기화 상태 표시
  - 확인 중
  - 저장 중
  - 동기화됨
  - 오프라인 저장
  - 동기화 오류
- Firestore 연결 실패 시 로컬 기록으로 앱 사용 가능

### 완료 운동 기록

- 완료한 운동을 별도 세션으로 저장
- 완료 날짜와 운동 시간 저장
- 완료 세트 수와 총 볼륨 저장
- 피로도 저장
- 운동별 세트 중량·반복·완료 여부 저장
- 최근 완료 세션 조회
- 주간 운동 달력
- 이전 주와 이번 주 이동
- 운동일 표시
- 완료 세션 상세 화면

### 운동 분석

- 이번 주 완료 운동 횟수
- 이번 주 완료 세트 수
- 이번 주 총 운동 볼륨
- 최근 벤치프레스 작업 중량 변화
- 첫 기록 대비 중량 증감 표시

### 루틴 관리

- 사용자별 Firestore 루틴 저장
- 루틴 이름과 설명 수정
- 운동 이름 수정
- 고정 반복형과 반복 범위형 설정
- 목표 중량 설정
- 세트 수 설정
- 최소·최대 반복 수 설정
- 휴식 시간 설정
- 증량 단위 설정
- 새 운동 추가
- 운동 삭제
- 위·아래 버튼을 이용한 순서 변경
- 마우스 및 터치 드래그 순서 변경
- PC와 모바일에서 동일한 루틴 사용
- 복수 루틴 생성·복제·전환·삭제
- 주간 요일별 루틴·휴식·직접 선택 일정
- 오늘 루틴 자동 선택
- 오늘만 루틴 변경
- 완료 기록의 예정 루틴과 실제 수행 비교

### PWA

- Android 홈 화면 설치
- 독립 앱 형태 실행
- 앱 셸 오프라인 캐시
- 새 버전 캐시 갱신
- 이전 캐시 자동 삭제
- Android 안전 영역 대응
- iOS 안전 영역과 터치 환경을 고려한 UI

## 프로젝트 구조

```text
jym-log/
├─ index.html
├─ css/
│  ├─ style.css
│  ├─ progression.css
│  ├─ progression-history.css
│  ├─ progression-editor.css
│  └─ routine-schedule.css
├─ js/
│  ├─ config.js
│  ├─ firebase-client.js
│  ├─ auth.js
│  ├─ profile.js
│  ├─ storage.js
│  ├─ workout.js
│  ├─ sync.js
│  ├─ routines.js
│  ├─ routine-ui.js
│  ├─ routine-schedule.js
│  ├─ routine-override.js
│  ├─ sessions.js
│  ├─ history.js
│  ├─ history-ui.js
│  ├─ analysis.js
│  ├─ analysis-ui.js
│  ├─ progression-policy.js
│  ├─ progression-engine.js
│  ├─ progression-history.js
│  ├─ workout-ui.js
│  ├─ sync-conflict-ui.js
│  └─ app.js
├─ docs/
│  ├─ firebase-data-model.md
│  ├─ firestore-rules-test-matrix.md
│  ├─ manual-test-checklist.md
│  ├─ stabilization-roadmap.md
│  ├─ v0.2.0-rc.1-regression.md
│  ├─ release-checklist.md
│  └─ known-issues.md
├─ firestore.rules
├─ manifest.webmanifest
├─ sw.js
├─ icon-192.png
├─ icon-512.png
├─ README.md
└─ CHANGELOG.md
```

## 파일별 역할

| 파일 | 역할 |
|---|---|
| `index.html` | 앱 화면의 HTML 구조 |
| `css/style.css` | 화면 디자인, 반응형 UI, 안전 영역 처리 |
| `js/config.js` | 앱 이름, 버전, 저장 키, Firebase 설정 |
| `js/firebase-client.js` | Firebase 앱, Authentication, Firestore 초기화 |
| `js/auth.js` | Google 로그인, 자동 로그인, 로그아웃 |
| `js/profile.js` | 사용자 프로필 및 닉네임 관리 |
| `js/storage.js` | 사용자별 LocalStorage 저장 및 이전 기록 마이그레이션 |
| `js/workout.js` | 운동 상태, 세트 입력, 타이머, 계산 로직 |
| `js/sync.js` | 진행 중 운동 상태의 Firestore 동기화 |
| `js/routines.js` | 사용자별 루틴 생성·수정·추가·삭제·정렬 |
| `js/routine-schedule.js` | 주간 루틴 일정 저장과 오늘 루틴 자동 선택 |
| `js/routine-override.js` | 오늘만 루틴 변경과 일정 스냅샷 생성 |
| `js/sessions.js` | 완료한 운동 세션 저장 |
| `js/history.js` | 완료 운동 목록과 상세 기록 조회 |
| `js/analysis.js` | 완료 기록 기반 주간 운동 분석 |
| `js/app.js` | 화면 렌더링, 화면 이동, 사용자 입력 이벤트 |
| `manifest.webmanifest` | 설치형 PWA 정보 |
| `sw.js` | 앱 셸 캐시, 오프라인 실행, 캐시 갱신 |
| `firestore.rules` | 사용자별 Firestore 접근 권한 규칙 |
| `docs/firebase-data-model.md` | Firebase 데이터 경로와 필드 구조 문서 |
| `docs/manual-test-checklist.md` | 수동 회귀 테스트 기준 |
| `docs/stabilization-roadmap.md` | v0.2.0 안정화 계획 |
| `docs/firestore-rules-test-matrix.md` | Firestore 허용·차단 보안 테스트 기준 |

## 데이터 구조 개요

```text
Firebase Authentication
└─ 사용자 UID

users/{uid}
├─ 사용자 프로필
├─ appData/currentWorkout
│  └─ 진행 중인 운동 상태
├─ appData/routineSchedule
│  └─ 주간 일정과 날짜별 오늘만 변경
├─ routines/{routineId}
│  └─ 사용자 운동 루틴
└─ workoutSessions/{sessionId}
   └─ 완료한 운동 기록
```

모든 Firestore 데이터는 Firebase Authentication의 사용자 UID를 기준으로 구분합니다.

## 저장 방식

JYM Log는 로컬 저장과 클라우드 저장을 함께 사용합니다.

```text
LocalStorage
→ 현재 기기에서 빠르게 상태 저장
→ 일시적인 네트워크 문제에도 운동 입력 유지

Cloud Firestore
→ 동일 계정의 PC와 모바일 간 데이터 공유
→ 사용자 프로필, 루틴, 운동 상태, 완료 기록 저장
```

## 현재 제한 사항

- iPhone Safari와 iOS 홈 화면 PWA 실기기 테스트 미완료
- 설정 화면의 운동 환경 스위치는 아직 실제 기능과 연결되지 않음
- PC와 모바일에서 같은 운동을 동시에 수정할 경우 충돌 선택이 필요함
- 운동 분석은 기초 주간 통계와 일부 중량 변화만 제공

## 개발 원칙

- Android에서 우선 실제 테스트
- 모든 UI와 기능에서 iOS Safari 호환성 고려
- 입력창 글자 크기 최소 16px
- 주요 터치 대상 최소 약 44px
- `safe-area-inset` 적용
- Pointer Events 기반 터치·마우스 입력
- 사용자 데이터는 UID 기준으로 분리
- 새 기능 추가 전 기존 기능 회귀 테스트
- 기능 단위 Commit 유지

## Commit 메시지 규칙

```text
feat: 새로운 기능 추가
fix: 오류 수정
refactor: 기능 변화 없는 코드 구조 개선
docs: 문서 수정
test: 테스트 기준 또는 결과 추가
chore: 설정과 개발 환경 변경
```

## 향후 개발 순서

### v0.2.0 안정화

- 완료 버튼 중복 실행 방지
- 로컬·클라우드 수정 시각 비교
- 오프라인 업로드 대기열 영구 저장
- 동기화 충돌 처리
- Firestore 보안 규칙 저장소 관리
- Android 전체 회귀 테스트
- iOS 호환성 사전 점검

### v0.3.0 운동 계획 안정화

- 복수 루틴과 주간 일정 전체 회귀 테스트
- 날짜 경계와 기기 시간대 변경 테스트
- 오늘만 변경과 완료 세션 스냅샷 검증
- 이전 버전 데이터 호환성 검증
- Android 설치형 PWA 실기기 안정화

### 후속 버전

- 운동별 성공·실패 판정
- 연속 성공 횟수
- 자동 증량 및 중량 유지
- 실패 누적과 디로드 권고
- 다음 운동 목표와 추천 이유 표시
