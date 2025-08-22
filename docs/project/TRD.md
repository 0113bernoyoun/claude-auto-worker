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
- **VS Code Extension (TypeScript + Webview)**

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
9. **VS Code Extension**
   - TypeScript 기반 확장
   - Webview 기반 로그 및 상태 표시
   - WebSocket을 통한 실시간 업데이트

### 2.3 VS Code Extension 아키텍처
```
+-------------------------+          +---------------------------+
|      VS Code Ext        |  REST    |     NestJS (auto-worker)  |
|  (TypeScript, Webview)  | <------> |  REST / WS / Runner / DSL |
|   TreeView / StatusBar  |   WS     |  Git / Policy / Tests     |
+-----------+-------------+          +-------------+-------------+
            |                                        |
            | open dashboard                         | child_process / SDK
            v                                        v
      http://localhost:5849                     claude CLI / SDK
```

**주요 구성 요소:**
- **명령 팔레트**: 워크플로우 실행, 대시보드 열기 등
- **사이드바 패널**: 워크플로우 상태, 실행 이력 트리뷰
- **상태바**: 현재 실행 상태 실시간 표시
- **Webview 패널**: 로그, 아티팩트, Diff 등 상세 정보
- **WebSocket 클라이언트**: 실시간 상태 업데이트 구독

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
- **VS Code Extension**: TypeScript, VS Code Extension API
- **Real-time Communication**: WebSocket (ws), Server-Sent Events (SSE)

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
- `GET /api/workflows` → 워크플로우 목록
- `GET /api/runs/:id` → 실행 상세 정보

### WebSocket API (실시간 업데이트용)
- `ws://localhost:5849/ws` → 실시간 이벤트 스트림
- 이벤트 타입: `runStatus`, `stageUpdate`, `logStream`, `error`

### VS Code Extension API
- `autoWorker.runWorkflow` → 워크플로우 실행
- `autoWorker.openDashboard` → 웹 대시보드 열기
- `autoWorker.viewLogs` → 로그 뷰어 열기
- `autoWorker.togglePolicy` → 정책 강도 토글

---

## 5. 보안 설계
- **Claude API Key**: 환경변수(`CLAUDE_API_KEY`)
- **웹 대시보드**: 토큰 기반 인증
- **로그**: 민감 데이터 마스킹
- **VS Code Extension**: localhost 연결 제한, 보안 모범 사례 적용
- **WebSocket**: 인증 토큰 기반 접근 제어
- **파일 시스템**: 워크플로우 파일 검증 및 샌드박싱

---

## 6. Non-Functional
- **안정성**: 장시간 실행 → 메모리 누수 모니터링
- **호환성**: macOS/Linux/Windows 지원
- **확장성**: 플러그인 시스템 설계 (2차 로드맵)
- **성능**: VS Code Extension UI 응답성 보장, 대용량 로그 처리 최적화
- **사용성**: VS Code 재시작 시 상태 복구, 에러 복구 및 재연결 로직
- **보안**: VS Code Extension 보안 모범 사례, 네트워크 보안 강화

---

## 7. MVP 범위
- CLI 실행 + DSL 파서
- Usage limit 감지/재개
- Git 브랜치 격리
- 테스트 실행 및 로그
- 웹 대시보드 (상태 뷰어)

---

## 8. 향후 로드맵
- VS Code Extension 개발 및 배포
- 실시간 이벤트 파이프라인 고도화
- 큐 관리 및 시각화 UI
- xterm.js 기반 웹 터미널
- 플러그인 시스템 및 마켓플레이스
