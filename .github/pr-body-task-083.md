### ✨ 요약 (What)
- **CLI logs/status 정비 (TASK-083)**
- `logs`: JSONL 기반 실제 로그 읽기/필터링/팔로우 구현
- `status`: run 로그로 워크플로 상태/진행률 추정 구현
- `executor`: 최종 완료 마커(`Workflow completed`) 기록 추가

### 🧭 배경/이유 (Why)
- 스펙 상 runId 기반 상태 추정 고도화 및 tail 기본값/필터 개선 필요
- 운영중 실행 상태 확인과 디버깅을 위해 실사용 가능한 `logs`/`status`가 필요

### 🛠️ 변경사항 (Changes)
- `src/cli/commands/logs.command.ts`: JSONL 파싱, `-n/--lines` 기본 50, `--level`, `--since`, `-f/--follow`, `-r/--run` 지원
- `src/cli/commands/status.command.ts`: `--run`, `--format json`, `--all` 지원, 로그 기반 상태 추정(완료/실패/진행률)
- `src/core/workflow-executor.service.ts`: 최종 완료 로그(`Workflow completed`) 기록

### 🖼️ 스크린샷/로그
```bash
npm test
# 모든 테스트 그린
```

### ✅ 테스트 (How verified)
- 단위 테스트 전체 실행: 그린
- 수동 검증: 더미 로그 파일에서 `logs --level`, `--since`, `--follow` 확인

### 🎯 영향도/리스크
- 기존 CLI 인터페이스와 호환성 유지(옵션 확장)
- 로그 파일(JSONL) 접근 경로는 `FileLoggerService`의 규칙과 일치

### 🚀 롤아웃/롤백
- 롤아웃: 머지 후 배포 없음, 다음 릴리스에 포함
- 롤백: 해당 커밋 되돌리기

### ☑️ 체크리스트
- [x] 빌드/테스트 그린
- [x] 프로젝트 규칙 준수(포트/문서 정책 등)
- [x] 보안 이슈 없음

### 🔗 참고
- DEVELOPMENT_TASKS: TASK-083 완료기준 반영
