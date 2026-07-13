# JYM Log

JYM Log는 개인의 운동 계획과 운동 일지를 기록하고, 이전 운동 결과에 따라 다음 운동 목표를 관리하기 위한 모바일 중심 PWA입니다.

## 배포 주소

https://gangjooj.github.io/jym-log/

## 현재 버전

- 버전: `v0.1.1`
- 업데이트 날짜: `2026-07-13`
- 개발 환경: GitHub Pages
- 주요 테스트 환경:
  - Android Chrome
  - Android 홈 화면 PWA
  - iPhone Safari
  - iPhone 홈 화면 웹앱

## 현재 구현된 기능

- 오늘의 운동 화면
- 운동 시작
- 운동별 세트 기록
- 중량과 반복 수 변경
- 세트 완료 및 완료 취소
- 휴식 타이머
- 휴식 시간 30초 추가
- 운동별 이전·다음 이동
- 운동 완료 요약
- 완료 세트 수 계산
- 총 운동 볼륨 계산
- 벤치프레스 성공 여부 판정
- 피로도 기록
- 브라우저 LocalStorage 저장
- 홈 화면 설치형 PWA
- 오프라인 앱 셸 캐시

## 프로젝트 구조

```text
jym-log/
├─ index.html
├─ css/
│  └─ style.css
├─ js/
│  ├─ config.js
│  ├─ storage.js
│  ├─ workout.js
│  └─ app.js
├─ docs/
│  └─ manual-test-checklist.md
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
| `index.html` | 화면 구조 |
| `css/style.css` | 색상, 크기, 간격, 레이아웃 |
| `js/config.js` | 앱 이름, 버전, 저장 키, 시간대 |
| `js/storage.js` | LocalStorage 저장, 불러오기, 삭제 |
| `js/workout.js` | 운동 데이터, 상태, 계산, 타이머 |
| `js/app.js` | 화면 렌더링과 사용자 입력 처리 |
| `manifest.webmanifest` | PWA 설치 정보 |
| `sw.js` | 오프라인 캐시와 업데이트 처리 |
| `CHANGELOG.md` | 버전별 변경 기록 |
| `docs/manual-test-checklist.md` | 수동 회귀 테스트 기준 |

## 현재 데이터 저장 방식

운동 기록은 브라우저의 LocalStorage에 저장됩니다.

현재 제약:

- 같은 기기와 같은 브라우저에서만 기록 유지
- 다른 사용자와 데이터 구분 불가
- Android와 iPhone 간 자동 동기화 불가
- 브라우저 사이트 데이터를 삭제하면 기록도 삭제될 수 있음

향후 Supabase를 연결하여 로그인과 사용자별 데이터 저장을 구현할 예정입니다.

## 버전 관리 규칙

```text
v0.1.1
구조 개선과 오류 수정

v0.2.0
로그인 및 회원가입

v0.3.0
운동 계획과 분할 설정
```

Commit 메시지 예시:

```text
feat: 새로운 기능 추가
fix: 오류 수정
refactor: 기능 변화 없는 코드 구조 개선
docs: 문서 수정
```

## 다음 개발 목표

### v0.2.0

- 회원가입
- 로그인
- 로그인 상태 유지
- 로그아웃
- 사용자 프로필
- 사용자별 운동 기록 구분
- Supabase 연동