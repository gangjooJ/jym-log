# Changelog

JYM Log의 버전별 주요 변경 사항을 기록합니다.

## [v0.1.1] - 2026-07-13

### Added

- 설정 화면에 앱 이름, 버전, 업데이트 날짜 표시
- 현재 날짜 자동 표시
- iPhone 홈 화면 아이콘 설정
- 수동 회귀 테스트 문서

### Changed

- 앱 표시명을 Progress Log에서 JYM Log로 변경
- CSS를 `css/style.css`로 분리
- 앱 설정을 `js/config.js`로 분리
- 로컬 저장 기능을 `js/storage.js`로 분리
- 운동 상태와 계산 기능을 `js/workout.js`로 분리
- 화면 렌더링과 버튼 동작을 `js/app.js`로 분리
- 운동 상태 변경을 workout API를 통해 처리하도록 통일
- PWA Manifest를 JYM Log 기준으로 수정

### Fixed

- 이전 운동 기록 필드명 불일치 수정
- 운동 완료 후 기존 타이머 변수를 참조하던 문제 수정
- 이전 서비스 워커 캐시가 계속 표시되던 문제 수정
- 새 JavaScript와 CSS 파일이 오프라인 캐시에 포함되지 않던 문제 수정

## [v0.1.0] - 2026-07-12

### Added

- 최초 운동 기록 클릭형 프로토타입
- 오늘의 운동 화면
- 세트 기록
- 휴식 타이머
- 운동 완료 요약
- 기록, 분석, 루틴, 설정 예시 화면
- GitHub Pages 첫 배포