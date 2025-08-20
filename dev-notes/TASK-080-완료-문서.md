### ✅ TASK-080 완료 보고서 — DSL 확장: Claude CLI 액션 스키마/검증

- 작업 ID: TASK-080
- 머지 PR: #19
- 완료일: 2025-08-20

### What (변경 요약)
- DSL에 `type: "claude"` + `action` 스키마/검증 추가
- `action` 허용값: `task | query | continue | resume | commit`
- 충돌 규칙: `action` ↔ `run` 상호 배타, `commit` 시 `prompt` 금지
- 실행 옵션: `cwd`, `env` 스키마 추가

### Why (배경)
- PRD/TRD의 Claude CLI 연동을 DSL로 선언적으로 지원하기 위함
- 후속 TASK-081(Executor 액션 매핑/실행) 구현의 기반 확보

### Changes (주요 파일)
- `src/parser/workflow.schema.ts`: 스키마/규칙 추가
- `src/parser/workflow.types.ts`: `action`/`cwd`/`env` 타입 반영
- 테스트 보강: `tests/unit/cli/workflow.validator.spec.ts` 등
- 안정성: `src/core/file-logger.service.ts` 가드 추가

### Tests (검증)
- CLI 테스트: 8/8 통과 (`npm run test:cli`)
- 전체 테스트: 7/7 통과 (`npm test`)

### 영향/리스크
- `type: "claude"` 사용 시 `action` 필수로 변경 (후속 문서/예제 업데이트 예정: TASK-088)

### Follow-ups
- TASK-081: Executor 액션 매핑/실행 및 로깅
- TASK-086~088: 상수화/정책/문서 업데이트(낮은 우선순위)


