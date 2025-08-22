# TASK-027 완료 문서: 실시간 상태 모니터링 대시보드(기본)

## ✅ What
- `/api/status`, `/api/states` 구현(최신/지정 runId 스냅샷)
- 응답에 `source: 'latest'|'runId'` 메타 추가
- 대시보드 홈에 최신 실행 상태 카드 표기(progress/steps)

## 🛠 Changes
- `src/status.controller.ts`: 상태 분석/캐시/파일 폴백, source 메타 추가
- `src/dashboard/app/page.tsx`: 상태 카드 렌더링 및 source 표시

## 🧪 Verification
- 유닛/E2E/CLI 테스트 그린
- 대시보드 빌드 성공, 홈에서 상태 표시 확인

## 🔗 PR
- PR #29 (follow-up commits 포함)




