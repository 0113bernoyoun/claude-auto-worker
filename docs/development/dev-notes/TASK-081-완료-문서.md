### ✅ TASK-081 완료 보고서 — Executor: Claude CLI 액션 매핑/실행 및 로깅

- 작업 ID: TASK-081
- 머지 PR: #21
- 완료일: 2025-08-20

### What (변경 요약)
- `type: "claude"` + `action(task|query|continue|-c|resume|-r|commit)` 매핑/실행 구현
- stdout/stderr 라인 스트리밍 캡처 → 파일(JSON Lines) 로그 저장(runId 기준)
- `policy.retry`/`policy.timeout`와 재시도/백오프/타임아웃 연동
- `run` 명령 실행 경로 안전화 및 인자 파싱 일관화(`CommandParserService` 재사용)
- `claude` 바이너리 미존재 시 사용자 가이드 메시지 제공

### Why (배경)
- TASK-080에서 확장한 DSL을 실제 실행 경로로 연결하여, CLI 기반 자동화가 동작하도록 함
- 후속 TASK-083(로그/상태 명령 보강), TASK-084(문서/가이드) 기반 마련

### Changes (주요 파일)
- `src/core/command-runner.service.ts`: 외부 프로세스 실행 유틸(spawn) + 라인 단위 스트림
- `src/core/workflow-executor.service.ts`: Claude 액션 매핑/실행, 파일 로그 컨텍스트(`workflow/stage/step`) 포함, `run` 파싱 재사용
- `src/core/core.module.ts`: `ParserModule`/서비스 DI 연결
- `tsconfig.json`: Nest 빌드 시 TSX 제외(`src/**/*.ts`)로 대시보드 충돌 제거
- 테스트: `src/test/unit/executor.spec.ts` DI 보완

### Tests (검증)
- `npm run build` 정상
- `npm test` 전체 통과: 7/7

### 영향/리스크
- 런타임 환경에 `claude` 미설치 시 실행 실패 가능 → 친화적 가이드 메시지 추가(설치/검증 안내)
- 로그 볼륨 증가 가능성(라인 단위 기록) → TASK-083에서 필터/lines 개선 예정

### Follow-ups
- TASK-082: 세션 이어가기/재개 최소 연동(-c/-r 옵션 경로 고도화)
- TASK-083: `logs/status` 개선(필터, 상태 추정 정확도)
- TASK-084: README/예제 업데이트(claude CLI 가이드/매핑 표)
- TASK-086~088: 상수화/정책/문서 업데이트


