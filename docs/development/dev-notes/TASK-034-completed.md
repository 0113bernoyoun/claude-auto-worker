### TASK-034 완료 보고서 (Change validation & approval)

- PR: #32
- 범위: 변경 검증/승인/거부/만료 흐름 및 감사 로그 API
- 주요 내용:
  - `policy-validation.service.ts` 승인요청/승인/거부/만료 처리, 조회/통계/감사 로그
  - 컨트롤러 엔드포인트 추가, ValidationPipe/가드 적용
  - 단위 테스트 전 범위 추가 및 통과

검증:
- `npm test` 전체 그린 (102/102)


