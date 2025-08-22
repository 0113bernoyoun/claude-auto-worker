### TASK-032 완료 보고서 (Policy-based filtering)

- PR: #32 (feat(policy): complete Policy Engine Group)
- 범위: 정책 기반 필터링 시스템 구현 (`command_filter`, `path_restriction`, `sensitive_data`) 및 기본 정책 등록
- 주요 내용:
  - 규칙 타입/조건/액션 모델 정의 (`policy.types.ts`)
  - 전용 evaluator 구현(위험 명령, 경로 제한, 민감데이터)
  - `warn` 액션은 경고로만 집계(실행 차단 안 함)
  - 액션 미정의 규칙에 대한 안전 경고 처리
  - 민감정보 정규식 캐시/확장, 제한 경로/위험 명령 env 외부화
  - 테스트: 정책 관련 단위 테스트 포함, 전체 102/102 통과

검증:
- `npm test` 전체 그린
- 경계 케이스(경로, 민감데이터, 위험명령, custom warn) 확인


