# TRD: claude-auto-worker (NestJS 기반)

## 1. 개요 (Overview)
- **목표**: PRD에서 정의된 요구사항을 기술적으로 어떻게 구현할지 상세히 규정.
- **범위**: MVP = CLI + 간단한 웹 대시보드 / 이후 = VS Code Extension, Web Terminal(xterm.js), 큐 관리 UI, 팀 협업 시스템, 엔터프라이즈급 기능.

---

## 2. 아키텍처 (Architecture)

### 2.1 시스템 구성도
- **CLI** → **Core Engine (NestJS Service Layer)** → **Claude API**
- **DSL 파서(YAML/JSON)** → **작업 큐 Executor**
- **Git/테스트 Runner 모듈**
- **DB/파일 기반 로깅**
- **웹 대시보드 (Next.js + NestJS API)**
- **VS Code Extension (TypeScript + Webview)**
- **팀 협업 시스템 (인증/권한/알림)**
- **크로스 플랫폼 API (REST/SDK/CI-CD)**
- **엔터프라이즈급 기능 (정책/보안/감사)**

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
10. **팀 협업 시스템**
    - JWT 기반 인증 및 권한 관리
    - 팀 멤버 관리 및 역할 제어
    - 실시간 알림 시스템 (Slack, Email)
    - 워크플로우 공유 및 협업 도구
11. **크로스 플랫폼 API**
    - REST API 및 OpenAPI 스펙
    - 다중 언어 SDK (Python, Node.js, Go)
    - CI/CD 파이프라인 통합
    - 플러그인 개발 가이드
12. **엔터프라이즈급 기능**
    - 고급 정책 엔진 및 규칙 관리
    - Git 워크플로우 자동화 (PR, 리뷰)
    - 보안 및 감사 시스템
    - 성능 모니터링 및 최적화
13. **품질 및 사용자 경험**
    - 포괄적인 테스트 스위트
    - UI/UX 최적화 및 접근성
    - 성능 최적화 및 스케일링
    - 보안 감사 및 취약점 검사

### 2.3 확장된 시스템 아키텍처
```
┌─────────────────────────────────────────────────────────────────┐
│                    클라이언트 레이어                              │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   CLI Client    │  Web Dashboard  │  VS Code Extension         │
│   (NestJS CLI)  │   (Next.js)     │   (TypeScript)             │
└─────────────────┴─────────────────┴─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API 게이트웨이 레이어                          │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   REST API      │  WebSocket API  │  GraphQL API (향후)        │
│   (NestJS)      │   (Socket.io)   │   (Apollo Server)          │
└─────────────────┴─────────────────┴─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    비즈니스 로직 레이어                          │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Workflow       │  Team           │  Enterprise                │
│  Engine         │  Collaboration  │  Features                  │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Policy Engine  │  Notification   │  Security & Audit          │
│  DSL Parser     │  System         │  Monitoring                │
└─────────────────┴─────────────────┴─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    데이터 레이어                                 │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   File System   │   SQLite DB     │   External APIs            │
│   (Logs, Config)│   (User Data)   │   (Claude, Git, CI/CD)     │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

### 2.4 팀 협업 시스템 아키텍처
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  VS Code Ext    │    │   Mobile App    │
│   (Next.js)     │    │   (Webview)     │    │   (React Native)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Team Service   │
                    │  (NestJS)       │
                    ├─────────────────┤
                    │ • Auth Service  │
                    │ • Team Service  │
                    │ • Notification  │
                    │ • Permission    │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Data Layer     │
                    ├─────────────────┤
                    │ • SQLite        │
                    │ • Redis Cache   │
                    │ • File System   │
                    └─────────────────┘
```

### 2.5 크로스 플랫폼 API 아키텍처
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Python SDK    │    │  Node.js SDK    │    │     Go SDK      │
│   (PyPI)        │    │   (npm)         │    │   (Go Modules)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  API Gateway    │
                    │  (NestJS)       │
                    ├─────────────────┤
                    │ • REST API      │
                    │ • OpenAPI Spec  │
                    │ • Rate Limiting │
                    │ • Authentication│
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Service Layer  │
                    ├─────────────────┤
                    │ • Core Engine   │
                    │ • Team Service  │
                    │ • Policy Engine │
                    │ • Notification  │
                    └─────────────────┘
```

### 2.6 VS Code Extension 아키텍처
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

### 3.1 Backend & Core
- **Backend**: NestJS (TypeScript)
- **CLI**: NestJS CLI/Commander
- **Parser**: js-yaml
- **Logging**: Winston
- **DB**: SQLite (MVP), PostgreSQL (향후)
- **Cache**: Redis (팀 협업, 세션 관리)
- **Queue**: Bull (작업 큐, 알림 처리)

### 3.2 Frontend & UI
- **Frontend (Dashboard)**: Next.js 14, TailwindCSS, Chart.js
- **Terminal**: xterm.js (웹 터미널 에뮬레이션)
- **Real-time**: Socket.io (WebSocket), Server-Sent Events (SSE)
- **Mobile**: React Native (향후)

### 3.3 Integration & DevOps
- **Git**: simple-git
- **Testing Runner**: child_process spawn
- **CI/CD**: GitHub Actions, GitLab CI, Jenkins
- **Container**: Docker, Docker Compose
- **Monitoring**: Prometheus, Grafana
- **Process Management**: PM2

### 3.4 Security & Enterprise
- **Authentication**: JWT, Passport.js
- **Authorization**: RBAC (Role-Based Access Control)
- **Security**: Helmet, rate-limiter, bcrypt
- **Audit**: Winston audit logger, audit trail
- **Encryption**: Node.js crypto module

### 3.5 VS Code Extension
- **Extension**: TypeScript, VS Code Extension API
- **Webview**: React, TailwindCSS
- **Communication**: WebSocket, REST API

---

## 4. API / CLI 명세

### 4.1 CLI 명세
```bash
# 기본 워크플로우 실행
claude-auto-worker run workflow.yaml [options]

# 옵션
--dry-run          # 변경사항 적용 안함
--verbose          # 상세 로그 출력
--branch <name>    # 특정 브랜치에서 실행
--team <id>        # 팀 컨텍스트에서 실행
--policy <level>   # 정책 강도 설정 (strict/medium/loose)

# 상태 및 모니터링
claude-auto-worker status [options]
claude-auto-worker enhanced-status -r <run-id> [options]
claude-auto-worker logs --tail [options]
claude-auto-worker enhanced-logs -r <run-id> [options]

# 팀 관리
claude-auto-worker team create <name> [options]
claude-auto-worker team invite <email> --role <role>
claude-auto-worker team list
claude-auto-worker team workflow <team-id>

# 설정 관리
claude-auto-worker config [options]
claude-auto-worker config set <key> <value>
claude-auto-worker config get <key>
```

### 4.2 REST API 명세

#### **인증 및 권한**
```typescript
// POST /api/auth/login
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  teams: Team[];
}

// POST /api/auth/refresh
interface RefreshRequest {
  refreshToken: string;
}

// POST /api/auth/logout
interface LogoutRequest {
  refreshToken: string;
}
```

#### **팀 관리 API**
```typescript
// GET /api/teams
interface TeamsResponse {
  teams: Team[];
  pagination: Pagination;
}

// POST /api/teams
interface CreateTeamRequest {
  name: string;
  description?: string;
  settings?: TeamSettings;
}

// GET /api/teams/:id
interface TeamResponse {
  team: Team;
  members: TeamMember[];
  workflows: Workflow[];
  statistics: TeamStatistics;
}

// POST /api/teams/:id/members
interface AddMemberRequest {
  email: string;
  role: 'admin' | 'member' | 'viewer';
}
```

#### **워크플로우 관리 API**
```typescript
// GET /api/workflows
interface WorkflowsResponse {
  workflows: Workflow[];
  pagination: Pagination;
  filters: WorkflowFilters;
}

// POST /api/workflows
interface CreateWorkflowRequest {
  name: string;
  description?: string;
  stages: WorkflowStage[];
  teamId?: string;
  isPublic: boolean;
}

// GET /api/workflows/:id
interface WorkflowResponse {
  workflow: Workflow;
  executions: WorkflowExecution[];
  statistics: WorkflowStatistics;
  permissions: WorkflowPermissions;
}

// POST /api/workflows/:id/run
interface RunWorkflowRequest {
  branch?: string;
  variables?: Record<string, any>;
  policyLevel?: 'strict' | 'medium' | 'loose';
}
```

#### **실행 모니터링 API**
```typescript
// GET /api/runs
interface RunsResponse {
  runs: WorkflowRun[];
  pagination: Pagination;
  filters: RunFilters;
}

// GET /api/runs/:id
interface RunResponse {
  run: WorkflowRun;
  stages: RunStage[];
  logs: RunLog[];
  artifacts: RunArtifact[];
  metrics: RunMetrics;
}

// GET /api/runs/:id/logs
interface LogsResponse {
  logs: RunLog[];
  pagination: Pagination;
  filters: LogFilters;
}

// GET /api/runs/:id/status
interface StatusResponse {
  status: RunStatus;
  progress: number;
  currentStage: string;
  estimatedTime: number;
}
```

### 4.3 WebSocket API 명세

#### **연결 및 인증**
```typescript
// WebSocket 연결
ws://localhost:5849/ws?token=<access_token>

// 연결 이벤트
interface ConnectionEvent {
  type: 'connected' | 'disconnected' | 'error';
  timestamp: string;
  message?: string;
}
```

#### **실시간 이벤트**
```typescript
// 워크플로우 실행 상태 업데이트
interface WorkflowStatusEvent {
  type: 'workflowStatus';
  runId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  currentStage: string;
  timestamp: string;
}

// 스테이지 업데이트
interface StageUpdateEvent {
  type: 'stageUpdate';
  runId: string;
  stageId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  timestamp: string;
}

// 로그 스트림
interface LogStreamEvent {
  type: 'logStream';
  runId: string;
  stageId: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
}

// 알림 이벤트
interface NotificationEvent {
  type: 'notification';
  userId: string;
  title: string;
  message: string;
  level: 'info' | 'warn' | 'error';
  timestamp: string;
  actions?: NotificationAction[];
}
```

### 4.4 VS Code Extension API
```typescript
// 워크플로우 실행
vscode.commands.executeCommand('autoWorker.runWorkflow', {
  filePath: string;
  options?: RunOptions;
});

// 대시보드 열기
vscode.commands.executeCommand('autoWorker.openDashboard');

// 로그 뷰어 열기
vscode.commands.executeCommand('autoWorker.viewLogs', {
  runId: string;
});

// 정책 설정
vscode.commands.executeCommand('autoWorker.setPolicy', {
  level: 'strict' | 'medium' | 'loose';
});

// 팀 컨텍스트 전환
vscode.commands.executeCommand('autoWorker.switchTeam', {
  teamId: string;
});
```

---

## 5. 데이터 모델 및 스키마

### 5.1 사용자 및 팀 모델
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  preferences: UserPreferences;
  teams: TeamMembership[];
}

interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  settings: TeamSettings;
  members: TeamMember[];
  workflows: Workflow[];
}

interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'admin' | 'member' | 'viewer';
  joinedAt: Date;
  permissions: Permission[];
}

interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
}
```

### 5.2 워크플로우 모델
```typescript
interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  teamId?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  stages: WorkflowStage[];
  variables: WorkflowVariable[];
  policies: WorkflowPolicy[];
  metadata: WorkflowMetadata;
}

interface WorkflowStage {
  id: string;
  name: string;
  type: 'claude' | 'run' | 'git' | 'notification';
  action?: string;
  prompt?: string;
  commands?: string[];
  applyChanges?: boolean;
  branch?: string;
  dependencies?: string[];
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  branch: string;
  variables: Record<string, any>;
  stages: ExecutionStage[];
  logs: ExecutionLog[];
  artifacts: ExecutionArtifact[];
  metrics: ExecutionMetrics;
}
```

### 5.3 정책 및 보안 모델
```typescript
interface Policy {
  id: string;
  name: string;
  description: string;
  type: 'security' | 'quality' | 'compliance';
  rules: PolicyRule[];
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  appliedTo: PolicyScope;
}

interface PolicyRule {
  id: string;
  name: string;
  type: 'command' | 'path' | 'lineCount' | 'fileType' | 'custom';
  condition: PolicyCondition;
  action: 'allow' | 'deny' | 'warn' | 'require_approval';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface PolicyCondition {
  field: string;
  operator: 'equals' | 'contains' | 'regex' | 'in' | 'not_in';
  value: any;
  additionalParams?: Record<string, any>;
}
```

---

## 6. 보안 설계

### 6.1 인증 및 권한 관리
- **JWT 기반 인증**: access token (15분) + refresh token (7일)
- **역할 기반 접근 제어 (RBAC)**: Admin, Member, Viewer
- **팀별 권한 격리**: 팀 간 데이터 접근 제한
- **API 키 관리**: Claude API 키 암호화 저장
- **세션 관리**: Redis 기반 세션 저장 및 만료 관리

### 6.2 데이터 보안
- **민감 데이터 마스킹**: 로그에서 API 키, 비밀번호 등 마스킹
- **데이터 암호화**: 민감한 설정 파일 암호화 저장
- **접근 로그**: 모든 API 접근 및 데이터 변경 로그 기록
- **감사 추적**: 사용자 행동 및 시스템 변경 이력 추적

### 6.3 네트워크 보안
- **HTTPS 강제**: 모든 웹 통신 HTTPS 사용
- **CORS 설정**: 허용된 도메인에서만 API 접근
- **Rate Limiting**: API 호출 빈도 제한 (DDoS 방지)
- **IP 화이트리스트**: 관리자 API 접근 IP 제한

### 6.4 VS Code Extension 보안
- **localhost 연결 제한**: 로컬 환경에서만 API 접근
- **토큰 검증**: 모든 API 요청에 유효한 토큰 필요
- **보안 모범 사례**: VS Code Extension 보안 가이드라인 준수
- **자동 토큰 갱신**: 토큰 만료 시 자동 갱신

---

## 7. 성능 및 확장성

### 7.1 성능 최적화
- **캐싱 전략**: Redis를 통한 자주 사용되는 데이터 캐싱
- **데이터베이스 최적화**: 인덱싱, 쿼리 최적화, 연결 풀링
- **비동기 처리**: WebSocket, 큐 시스템을 통한 비동기 작업 처리
- **로드 밸런싱**: 수평 확장을 위한 로드 밸런서 지원

### 7.2 확장성 설계
- **마이크로서비스 아키텍처**: 모듈별 독립적인 서비스 구성
- **플러그인 시스템**: 확장 가능한 플러그인 아키텍처
- **API 버전 관리**: 하위 호환성을 위한 API 버전 관리
- **설정 기반 동작**: 설정 파일을 통한 동적 기능 활성화/비활성화

### 7.3 모니터링 및 로깅
- **성능 메트릭**: API 응답 시간, 처리량, 오류율 모니터링
- **리소스 모니터링**: CPU, 메모리, 디스크 사용량 모니터링
- **알림 시스템**: 임계값 초과 시 자동 알림 (Slack, Email)
- **로그 집계**: 중앙화된 로그 수집 및 분석

---

## 8. Non-Functional Requirements

### 8.1 안정성
- **장시간 실행**: 메모리 누수 모니터링 및 자동 정리
- **오류 복구**: 자동 재시도, 롤백, 장애 복구 메커니즘
- **데이터 백업**: 정기적인 데이터 백업 및 복구 테스트
- **헬스체크**: 시스템 상태 모니터링 및 자동 복구

### 8.2 호환성
- **크로스 플랫폼**: macOS/Linux/Windows 지원
- **Node.js 버전**: Node.js 18.x, 20.x, 22.x 지원
- **브라우저 지원**: Chrome, Firefox, Safari, Edge 최신 버전
- **VS Code 호환성**: VS Code 1.74.0+ 지원

### 8.3 확장성
- **플러그인 시스템**: 2차 로드맵에서 플러그인 아키텍처 구현
- **API 확장**: GraphQL, gRPC 등 추가 프로토콜 지원
- **데이터베이스**: SQLite → PostgreSQL → MongoDB 확장 지원
- **클라우드 배포**: Docker, Kubernetes 배포 지원

### 8.4 성능
- **VS Code Extension UI 응답성**: 100ms 이하 응답 시간 보장
- **대용량 로그 처리**: GB 단위 로그 파일 처리 최적화
- **실시간 업데이트**: WebSocket을 통한 100ms 이하 지연 시간
- **API 응답 시간**: 95% 요청이 200ms 이하 응답

### 8.5 사용성
- **VS Code 재시작 시 상태 복구**: 자동 상태 복구 및 재연결
- **에러 복구 및 재연결**: 네트워크 오류 시 자동 재연결
- **사용자 온보딩**: 단계별 가이드 및 튜토리얼 제공
- **접근성**: WCAG 2.1 AA 준수, 키보드 네비게이션 지원

### 8.6 보안
- **VS Code Extension 보안 모범 사례**: 보안 가이드라인 준수
- **네트워크 보안 강화**: HTTPS, CORS, Rate Limiting
- **정기 보안 감사**: OWASP Top 10 취약점 정기 검사
- **의존성 보안**: 정기적인 보안 취약점 스캔 및 업데이트

---

## 9. MVP 범위
- CLI 실행 + DSL 파서
- Usage limit 감지/재개
- Git 브랜치 격리
- 테스트 실행 및 로그
- 웹 대시보드 (상태 뷰어)
- 기본 정책 엔진
- 팀 멤버 관리 (기본)

---

## 10. 향후 로드맵

### **Phase 1: 기반 인프라 및 CLI (1-4주)**
- 프로젝트 초기화 및 NestJS 설정 ✅
- CLI 모듈 개발 및 기본 명령어 ✅
- DSL 파서 기본 구조 ✅

### **Phase 2: 핵심 엔진 및 Git 통합 (5-8주)**
- 워크플로우 실행 엔진 ✅
- Git 통합 및 테스트 자동화 ✅
- 웹 대시보드 MVP ✅

### **Phase 3: 정책 엔진 및 보안 (9-12주)**
- 정책 기반 안전장치 ✅
- 보안 및 감사 시스템 ✅
- 실시간 모니터링 ✅

### **Phase 4: 팀 협업 기능 (13-16주)**
- 팀 멤버 관리 및 권한 시스템
- 실시간 알림 및 협업 도구
- 워크플로우 공유 및 템플릿

### **Phase 5: 크로스 플랫폼 API (17-20주)**
- REST API 완성 및 OpenAPI 스펙
- 다중 언어 SDK 개발
- CI/CD 파이프라인 통합

### **Phase 6: 엔터프라이즈급 기능 (21-24주)**
- 고급 정책 엔진 및 규칙 관리
- Git 워크플로우 고도화
- 보안 및 감사 시스템 강화

### **Phase 7: 품질 및 사용자 경험 (25-28주)**
- 포괄적인 테스트 스위트
- UI/UX 최적화 및 성능 개선
- 보안 감사 및 취약점 검사

### **Phase 8: VS Code Extension (29-32주)**
- VS Code Extension 개발 및 배포
- IDE 통합 및 워크플로우 관리
- 마켓플레이스 배포 준비

### **Phase 9: 플러그인 시스템 (33-36주)**
- 플러그인 아키텍처 완성
- 기본 플러그인 개발
- 플러그인 생태계 구축

### **Phase 10: 최적화 및 배포 (37-40주)**
- 성능 최적화 및 스케일링
- 모노레포 전환 및 통합
- 프로덕션 배포 준비

---

## 11. 기술적 구현 세부사항

### 11.1 팀 협업 시스템 구현
- **JWT 토큰 관리**: Redis를 통한 토큰 저장 및 만료 관리
- **실시간 알림**: Socket.io를 통한 실시간 알림 전송
- **권한 검증**: 미들웨어를 통한 API별 권한 검증
- **팀 격리**: 데이터베이스 쿼리 시 팀 ID 기반 필터링

### 11.2 크로스 플랫폼 API 구현
- **OpenAPI 스펙**: Swagger UI를 통한 API 문서 자동 생성
- **SDK 생성**: OpenAPI 스펙 기반 자동 SDK 생성
- **버전 관리**: API 버전별 호환성 보장 및 마이그레이션 가이드
- **CI/CD 통합**: GitHub Actions, GitLab CI 등 자동화 파이프라인

### 11.3 엔터프라이즈급 기능 구현
- **정책 엔진**: 규칙 기반 정책 평가 및 실행
- **감사 시스템**: 모든 사용자 행동 및 시스템 변경 로그 기록
- **보안 스캔**: 정기적인 보안 취약점 검사 및 보고서 생성
- **성능 모니터링**: Prometheus + Grafana를 통한 실시간 모니터링

### 11.4 품질 및 사용자 경험 구현
- **테스트 자동화**: Jest, Cypress를 통한 포괄적인 테스트
- **UI/UX 최적화**: 사용자 피드백 기반 지속적 개선
- **접근성**: WCAG 2.1 AA 준수를 위한 컴포넌트 설계
- **성능 최적화**: 코드 스플리팅, 지연 로딩, 캐싱 전략
