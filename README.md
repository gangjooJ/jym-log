# Progress Log 클릭형 프로토타입

## 포함된 흐름
- 오늘의 루틴 확인
- 운동 시작
- 운동별 세트 중량/반복 조정
- 세트 완료 및 휴식 타이머
- 운동 완료 및 피로도 입력
- 다음 벤치프레스 목표 추천
- 기록/분석/루틴/설정 탭
- LocalStorage 기반 진행 상태 보존
- PWA Manifest 및 Service Worker

## 가장 간단한 실행
`index.html`을 더블클릭해 브라우저에서 엽니다.

대부분의 인터랙션은 파일 직접 열기에서도 동작합니다.
PWA 설치와 오프라인 캐시는 HTTPS 또는 localhost가 필요합니다.

## localhost 실행
프로젝트 폴더에서 다음 명령 중 하나를 실행합니다.

### Python
python -m http.server 8000

브라우저에서:
http://localhost:8000

### Node.js
npx serve .

## 초기화
우측 상단의 ↻ 버튼을 누르면 예시 운동 기록이 초기화됩니다.

## 다음 스프린트 권장 범위
1. 루틴 편집 화면
2. 운동별 증량 규칙 편집
3. 실제 기록 이력 생성
4. Supabase 로그인/DB 연동
5. IndexedDB 오프라인 큐
