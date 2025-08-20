### ✨ 요약 (What)
- **DSL 확장: `type: "claude"` + `action` 스키마/검증 추가 (TASK-080)**
- `action` 허용값: `task | query | continue | resume | commit`
- `cwd`, `env` 옵션 스키마 추가 및 충돌 규칙 정의
- Ajv 스키마 컴파일 및 단위 테스트 추가/보강 → CLI/전체 테스트 그린

### 🧭 배경/이유 (Why)
- PRD/TRD에서 정의된 Claude CLI 연동을 DSL로 선언적으로 지원하기 위함
- 후속 TASK-081(Executor에서 액션 매핑/실행) 구현을 위한 선행 스키마/검증 기반 마련

### 🛠 변경사항 (Changes)
- `src/parser/workflow.schema.ts`: `claude` 액션 스키마 및 규칙 추가
  - `type: claude`인 경우 `action` 필수
  - `type !== claude`인데 `action` 존재 → 금지
  - `action` 존재 시 `run`과 동시 사용 금지
  - `action = commit`이면 `prompt` 금지
  - 실행 옵션 `cwd`, `env` 속성 추가
- `src/parser/workflow.types.ts`: `action`, `cwd`, `env` 타입 반영
- 테스트 보강
  - `tests/unit/cli/workflow.validator.spec.ts`: TASK-080 검증 케이스 추가
  - `tests/setup/cli.setup.ts`: fs 모킹(`readdirSync`) 추가
  - `src/test/unit/executor.spec.ts`: 의존성(FileLoggerService/CommandRunnerService) 모킹 주입
- `src/core/file-logger.service.ts`: 타입 안정성 보강(빈 디렉토리 대응)

### ✅ 테스트 (How verified)
- CLI 테스트: `npm run test:cli` → 8/8 통과
- 전체 테스트: `npm test` → 7/7 통과

### 🎯 영향도/리스크
- 기존 DSL 중 `type: "claude"`를 사용하는 경우 이제 `action`이 필수입니다.
  - 예제/문서(`docs/examples/*`)는 후속 PR(TASK-084)에서 일괄 정리 예정
- Executor 매핑은 본 PR 범위 아님(TASK-081)

### 🚀 롤아웃/롤백
- 배포: 일반 릴리스 경로
- 롤백: 이 PR revert 시 기존 DSL 검증으로 복귀

### ☑️ 체크리스트
- [x] 스키마/타입/파서 검증 규칙 정합성
- [x] 단위 테스트 추가 및 그린
- [x] 프로젝트 규칙(포트 5849, CLI 중심) 준수
- [x] 문서/상태 파일 변경 없음 (머지 후 갱신 원칙 준수)

### 🔗 관련 작업
- (선행) TASK-080 — 본 PR
- (후속) TASK-081 — Executor에 Claude CLI 액션 매핑/실행


