### TASK-015 완료 문서

- 작업명: 워크플로우 스키마 검증 시스템
- 브랜치: `feature/task-015-workflow-schema-validation`
- PR: #11
- 머지일: 2025-08-19

#### 주요 변경사항
- JSON Schema 정의(`src/parser/workflow.schema.ts`)
- Ajv 기반 `WorkflowValidatorService` 추가 및 커스텀 `uniqueStepIds` 규칙 적용
- `WorkflowParserService`에 스키마 검증 통합
- 단위/CLI 테스트 추가 및 통과

#### 완료 기준 충족 항목
- 워크플로우 스키마 정의
- JSON Schema 검증 규칙 적용 (Ajv)
- 필수 필드/타입 검증
- 커스텀 검증 규칙(중복 step id 금지)

#### 추후 작업(선택)
- 실제 FS 파싱 경로 활성화 시, duplicate-id 등 부정 경로 e2e 테스트 추가

