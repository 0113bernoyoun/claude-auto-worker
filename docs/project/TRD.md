# TRD: claude-auto-worker (NestJS 기반)

## 1. 개요 (Overview)
- **목표**: PRD에서 정의된 요구사항을 기술적으로 어떻게 구현할지 상세히 규정.
- **범위**: MVP = CLI + 간단한 웹 대시보드 / 이후 = VS Code Extension, Web Terminal(xterm.js), 큐 관리 UI.

---

## 2. 아키텍처 (Architecture)

### 2.1 시스템 구성도
- **CLI** → **Core Engine (NestJS Service Layer)** → **Claude API**
- **DSL 파서(YAML/JSON)** → **작업 큐 Executor**
- **Git/테스트 Runner 모듈**
- **DB/파일 기반 로깅**
- **웹 대시보드 (Next.js + NestJS API)**

### 2.2 주요 컴포넌트
1. **CLI 모듈**
   - NestJS Commander 모듈 기반 CLI 엔트리포인트
   - DSL 워크플로우 파일 로드 및 실행
2. **Workflow Executor**
   - 각 stage 실행 스케줄링
   - Claude API 호출 관리
   - Usage limit 감지 후 sleep/retry
3. **DSL Parser**
   - YAML/JSON schema 기반
   - stages, prompt, run, branch, policy 파라미터 지원
4. **Git Integration**
   - SimpleGit 라이브러리 사용
   - 브랜치 격리 + 자동 커밋
5. **Test Runner**
   - Shell command 실행 (e.g., pytest, npm test)
   - 실패 시 rollback/보류 처리
6. **Policy Engine**
   - 금지 명령어 필터링
   - 변경 라인 수 제한
   - 특정 경로 수정 제한
7. **Logging**
   - Winston 기반 파일 로깅
   - JSON structured logs
8. **Web Dashboard**
   - Next.js + Tailwind
   - NestJS REST API 연결
   - 상태 보기 (진행률, 로그, 작업 결과)

---

## 3. 기술 스택 (Tech Stack)
- **Backend**: NestJS (TypeScript)
- **CLI**: NestJS CLI/Commander
- **Parser**: js-yaml
- **Logging**: Winston
- **DB (옵션)**: SQLite (MVP는 파일 기반 로그)
- **Frontend (Dashboard)**: Next.js, TailwindCSS, Chart.js
- **Git**: simple-git
- **Testing Runner**: child_process spawn

---

## 4. API / CLI 명세

### CLI
- `claude run workflow.yaml` → 워크플로 실행
- `claude status` → 현재 실행 상태
- `claude logs --tail` → 로그 출력

### REST API (대시보드용)
- `GET /api/status` → 실행 상태
- `GET /api/logs` → 로그 조회
- `POST /api/run` → 워크플로 실행

---

## 5. 보안 설계
- **Claude API Key**: 환경변수(`CLAUDE_API_KEY`)
- **웹 대시보드**: 토큰 기반 인증
- **로그**: 민감 데이터 마스킹

---

## 6. Non-Functional
- **안정성**: 장시간 실행 → 메모리 누수 모니터링
- **호환성**: macOS/Linux/Windows 지원
- **확장성**: 플러그인 시스템 설계 (2차 로드맵)

---

## 7. MVP 범위
- CLI 실행 + DSL 파서
- Usage limit 감지/재개
- Git 브랜치 격리
- 테스트 실행 및 로그
- 웹 대시보드 (상태 뷰어)

---

## 8. 향후 로드맵
- VS Code Extension → 시각적 큐 관리
- xterm.js 기반 웹 터미널
- 플러그인 아키텍처
- CI/CD 통합 API
- 보안 정책 스캐너
