# 🤖 claude-auto-worker

> 차세대 Claude Code 자동화 도구 - 안전하고, 유연하고, 확장 가능한 워크플로우 엔진

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-red.svg)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14.x-black.svg)](https://nextjs.org/)

## 🎯 프로젝트 개요

`claude-auto-worker`는 개인 개발자가 Claude Code를 더 안전하고, 유연하고, 확장 가능하게 자동화할 수 있는 오픈소스 도구입니다. VS Code Autopilot의 한계를 보완하고, 에디터 종속성 없이 동작하며, 워크플로우 DSL·정책 기반 필터링·테스트/Git 연동 등 **실질적 개발 생산성** 기능을 제공합니다.

## ✨ 핵심 가치

### 🛡️ **안전한 자동화**
- Git 브랜치 격리 커밋
- 테스트 실행/검증
- 정책 기반 필터링
- 자동 롤백 시스템

### 🔧 **개발자 친화적**
- DSL 기반 워크플로우 정의
- CLI 우선 설계
- 직관적인 웹 대시보드
- VS Code Extension 지원

### 🌐 **확장 가능**
- 플러그인 아키텍처
- API 기반 통합
- 외부 도구 연동
- CI/CD 파이프라인 통합

### 📊 **투명성 & 모니터링**
- 실시간 상태 모니터링
- 상세한 실행 로그
- 성능 메트릭 수집
- 워크플로우 시각화

### 👥 **팀 협업 지원**
- 팀 멤버 관리 및 권한 시스템
- 실시간 알림 및 협업 도구
- 워크플로우 공유 및 템플릿
- 협업 로그 및 성과 분석

### 🏢 **엔터프라이즈급 기능**
- 고급 보안 정책 및 감사 시스템
- Git 워크플로우 자동화
- 성능 최적화 및 스케일링
- 크로스 플랫폼 호환성

### 🎯 **품질 중심 개발**
- 포괄적인 테스트 스위트
- 보안 감사 및 취약점 검사
- 사용자 경험 최적화
- 지속적인 품질 개선

## 🚀 주요 기능

### 🔄 **워크플로우 실행**
- YAML/JSON 기반 DSL 워크플로우 정의
- Claude API 자동 호출 및 관리
- Usage limit 감지 및 자동 재시도
- 작업 큐 관리 및 스케줄링

### 🧪 **품질 보증**
- 자동 테스트 실행 및 검증
- Git 브랜치 격리 및 자동 커밋
- 정책 기반 안전장치
- 실패 시 자동 롤백

### 📱 **다양한 인터페이스**
- CLI 우선 설계
- 웹 대시보드 (Next.js)
- VS Code Extension (계획)
- REST API 지원

### 👥 **팀 협업 기능**
- 팀 멤버 관리 및 권한 제어
- 실시간 알림 시스템 (Slack, Email)
- 워크플로우 공유 및 협업
- 팀별 템플릿 및 성과 분석

### 🌐 **크로스 플랫폼 지원**
- REST API 및 OpenAPI 스펙
- 다중 언어 SDK (Python, Node.js, Go)
- CI/CD 파이프라인 통합
- 플러그인 개발 가이드

### 🏢 **엔터프라이즈급 기능**
- 고급 정책 엔진 및 규칙 관리
- Git 워크플로우 자동화 (PR, 리뷰)
- 보안 및 감사 시스템
- 성능 모니터링 및 최적화

### 🎯 **품질 및 사용자 경험**
- 포괄적인 테스트 스위트 (95% 커버리지)
- UI/UX 최적화 및 접근성
- 성능 최적화 및 스케일링
- 보안 감사 및 취약점 검사

## 🏗️ 아키텍처

```
claude-auto-worker/
├── src/                    # 소스 코드
│   ├── cli/               # CLI 모듈 (✅ 완료)
│   ├── core/              # 핵심 엔진 (✅ Executor MVP 완료)
│   ├── parser/            # DSL 파서 (✅ 완료)
│   ├── dashboard/         # 웹 대시보드 (✅ MVP 스켈레톤 완료)
│   ├── config/            # 설정 관리 (✅ 완료)
│   └── shared/            # 공통 모듈 (⏳ 개발 중)
├── docs/                  # 문서
├── tests/                 # 테스트
└── tools/                 # 개발 도구
```

## 🚀 빠른 시작

### 🔧 필수 요구사항

- **Node.js** 20.x 이상
- **Git** 2.x 이상
- **Claude API Key** (Anthropic)

### 📦 설치

```bash
# 저장소 클론
git clone https://github.com/your-username/claude-auto-worker.git
cd claude-auto-worker

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일에 CLAUDE_API_KEY 설정
```

### 🎯 기본 사용법

```bash
# 워크플로우 실행
claude-auto-worker run workflow.yaml

# 상태 확인 (기본)
claude-auto-worker status

# 향상된 상태 확인 (상세 정보)
claude-auto-worker enhanced-status -r <run-id>

# 로그 보기 (기본)
claude-auto-worker logs --tail

# 향상된 로그 보기 (분석 포함)
claude-auto-worker enhanced-logs --analysis --state

# 개발 서버 실행 (포트 5849)
npm run start:dev
```

### 🤖 **Claude CLI 상세 사용법**

#### 📋 Essential Commands 테이블

| 명령어 | 설명 | 옵션 | 예시 |
|--------|------|------|------|
| `run` | 워크플로우 실행 | `--dry-run`, `--verbose`, `--branch` | `claude-auto-worker run workflow.yaml --dry-run` |
| `status` | 실행 상태 확인 | `--json`, `--since`, `--all` | `claude-auto-worker status --json` |
| `logs` | 로그 확인 | `--follow`, `--since`, `--limit`, `--analysis` | `claude-auto-worker logs --follow` |
| `config` | 설정 확인 | `--show-secrets` | `claude-auto-worker config` |
| `help` | 도움말 | `[command]` | `claude-auto-worker help run` |

#### 🔧 DSL Action 매핑

| Action | 설명 | 사용 예시 |
|--------|------|-----------|
| `task` | 일반적인 작업 수행 | 코드 분석, 문서 작성, 리뷰 등 |
| `query` | 질의 및 조회 | 정보 검색, 상태 확인, 데이터 분석 등 |
| `continue` | 이어가기 | 이전 작업 계속, 세션 재개 등 |
| `resume` | 재개 | 중단된 작업 재시작, 복구 등 |
| `commit` | 커밋 관련 | 변경사항 커밋, 브랜치 관리 등 |

**참고**: 현재 스키마에서는 위 5가지 Action 값이 공식적으로 지원됩니다. 향후 `analyze`, `review`, `improve` 등의 확장 Action 값도 지원 예정입니다.

#### 🚀 Claude CLI 설치 및 로그인

##### 1. Claude CLI 설치
```bash
# macOS (Homebrew)
brew install claude

# Linux (Snap)
sudo snap install claude

# Windows (Chocolatey)
choco install claude

# 직접 설치
curl -fsSL https://claude.ai/install.sh | sh
```

##### 2. Claude CLI 로그인
```bash
# 대화형 로그인
claude auth login

# 또는 환경변수로 설정
export CLAUDE_API_KEY="your-api-key-here"
```

##### 3. 인증 확인
```bash
# 로그인 상태 확인
claude auth status

# API 키 테스트
claude chat "Hello, test message"
```

#### **워크플로우 실행**
```bash
# 기본 실행
claude-auto-worker run workflow.yaml

# 특정 브랜치에서 실행
claude-auto-worker run workflow.yaml --branch feature/new-feature

# 드라이런 (변경사항 적용 안함)
claude-auto-worker run workflow.yaml --dry-run

# 상세 로그와 함께 실행
claude-auto-worker run workflow.yaml --verbose
```

#### **상태 모니터링**
```bash
# 현재 실행 상태 확인
claude-auto-worker status

# 특정 실행 ID의 상세 상태
claude-auto-worker enhanced-status -r <run-id>

# 모든 실행 상태 목록
claude-auto-worker enhanced-status --all

# 상태를 JSON 형식으로 출력
claude-auto-worker enhanced-status -r <run-id> --format json
```

#### **로그 분석**
```bash
# 실시간 로그 스트리밍
claude-auto-worker logs --tail

# 특정 실행 ID의 로그
claude-auto-worker enhanced-logs -r <run-id>

# 로그 분석 포함
claude-auto-worker enhanced-logs -r <run-id> --analysis

# 상태 정보와 함께 로그
claude-auto-worker enhanced-logs -r <run-id> --state

# 특정 로그 레벨만 필터링
claude-auto-worker enhanced-logs -r <run-id> --level error
```

#### **설정 및 구성**
```bash
# 설정 확인
claude-auto-worker config

# 환경 변수 설정
export CLAUDE_API_KEY="your-api-key"
export GITHUB_TOKEN="your-github-token"

# 로컬 개발 환경 설정
npm run setup:local

# 로컬 환경 검증
npm run verify:local
```

### 🌐 API 서버 / 대시보드

- **기본 포트**: 5849
- **API 엔드포인트**: http://localhost:5849/api
  - `GET /api/health`: 서버 헬스체크
  - `GET /api/status`: 최신 실행 상태(메타 `source` 포함)
  - `GET /api/states`: 실행 상태 목록
  - `GET /api/logs?runId&level&lines`: 로그 tail(JSONL) + 메타 `{count, limit}`
- **개발 서버**: http://localhost:5849
 - **대시보드(Next.js)**: 개발용 `npm run dashboard:start` → http://localhost:5850

### 🧭 관측/자동회복(G2) 설정 가이드

- 메모리 워치독 ENV 예시:
```bash
export MEM_WATCH_INTERVAL_MS=15000
export MEM_WATCH_WARN_MB=800
export MEM_WATCH_RESTART_MB=1024
export MEM_WATCH_ACTION=exit # log|exit
```

- 설정 파일(`claude-auto-worker.config.yaml`) 예시:
```yaml
monitoring:
  memoryWatchdog:
    enabled: true
    intervalMs: 15000
    warnRssMb: 800
    restartRssMb: 1024
    action: exit
```

- PM2 샘플: `tools/pm2-sample.config.cjs`
- Node 메모리 옵션: `tools/node-memory-flags.md`

## 📊 개발 진행 상황

> **⚠️ 현재 개발 진행 중입니다!** 
> 
> 이 프로젝트는 활발히 개발되고 있으며, 아직 MVP 단계입니다. 프로덕션 환경에서 사용하지 마세요.

### 📈 전체 현황
- **총 태스크**: 110개 (15개 스프린트)
- **완료된 태스크**: 31개 (약 28%)
- **예상 완료**: 23주 (925시간)
- **현재 스프린트**: 4A/15 (Claude CLI 모드 통합 - CLI 기능 대폭 향상 완료)

### 🆕 **새로 추가된 기능 영역**

#### **👥 팀 협업 기능 (TASK-090~095)**
- 팀 멤버 관리 및 권한 시스템
- 실시간 알림 시스템 (Slack, Email)
- 워크플로우 공유 및 협업
- 팀별 템플릿 및 성과 분석

#### **🌐 크로스 플랫폼 API (TASK-096~100)**
- REST API 문서화 및 OpenAPI 스펙
- 다중 언어 SDK 개발 (Python, Node.js, Go)
- CI/CD 파이프라인 통합 가이드
- 플러그인 개발 가이드 및 예제

#### **🏢 엔터프라이즈급 기능 (TASK-101~105)**
- 고급 정책 엔진 및 규칙 관리
- Git 워크플로우 고도화 (PR 자동화, 리뷰 시스템)
- 테스트 자동화 고도화 (커버리지, 성능 테스트)
- 보안 및 감사 시스템 강화

#### **🎯 품질 및 사용자 경험 (TASK-106~110)**
- 포괄적인 테스트 스위트 및 CI/CD 통합
- 사용자 경험 최적화 및 UI/UX 개선
- 성능 최적화 및 스케일링 테스트
- 보안 감사 및 취약점 검사

### ✅ 완료된 주요 작업

#### 🏗️ **프로젝트 기반 구조** (TASK-001 ~ TASK-003)
- 프로젝트 초기화 및 디렉토리 구조 설정
- NestJS 프로젝트 생성 및 기본 설정
- TypeScript 설정 및 개발 도구 구성

#### 🔧 **CLI 모듈** (TASK-008 ~ TASK-013)
- NestJS Commander 모듈 통합
- CLI 명령어 기본 구조 설계
- 설정 파일 관리 시스템 구현
- CLI 에러 핸들링 및 사용자 피드백 시스템
- CLI 테스트 환경 구성 및 문서화

#### 📝 **DSL 파서** (TASK-014 ~ TASK-016)
- YAML/JSON 파서 기본 구조 구현
- 워크플로우 스키마 검증 시스템
- DSL 문법 파싱 엔진 개발

#### 🔄 **핵심 엔진** (TASK-020)
- Workflow Executor 핵심 구조 설계

#### 🧵 **Claude CLI 통합** (TASK-080 ~ TASK-083)
- Claude CLI 액션 매핑/실행 및 로깅 ✅
- 세션 이어가기/재개 최소 연동 ✅
- CLI logs/status 정비 (runId 기반 상태 추정 고도화) ✅
  - 새로운 enhanced-logs, enhanced-status 명령어 추가
  - 워크플로우 상태 추적 시스템 구현
  - 진행률 시각화 및 다양한 출력 형식 지원

#### 🏠 **로컬 실행 환경** (TASK-066 ~ TASK-069) ✅
- 비-Docker 로컬 실행 파이프라인 구성
- .env.example 자동 생성 및 설정 폴백
- 로컬 셋업/검증 도구 제공
- 일괄 검증 스크립트로 빌드→테스트→헬스체크→CLI 드라이런 자동화
- **PR #30**: 로컬 실행 환경 그룹 완료

#### 📚 **문서 정리 그룹** (TASK-084, TASK-088) ✅
- README/예제 업데이트 - claude CLI 가이드 보강 ✅
- 문서/예제 업데이트 - `action` 필수 안내 보강 ✅
- Essential Commands 테이블 및 DSL Action 매핑 추가
- Claude CLI 설치/로그인 가이드 보강
- 모든 예제 파일의 스키마 정합성 확보
- 마이그레이션 노트 섹션 추가
- **PR #31**: 문서 정리 그룹 완료

#### 🛡️ **즉효 안정화 패키지 (G1)** ✅
- **PR #33**: 보안 헤더(helmet) 적용, 전역 `ValidationPipe` 도입, 전역 예외 필터 추가, 대시보드 API 연결성 정비(기본 `http://localhost:5849/api`). 환경 구성값(`apiPrefix`)과 운영 환경 밸리데이션 강화 반영.

#### 🔍 **관측/자동회복 패키지 (G2)** ✅
- **PR #35**: 메모리 워치독(TASK-105), pm2/Node 가이드(TASK-104) - 메모리 임계 감시 및 자동 재기동 가드로 야간 안정성 강화

#### ⚡ **성능·메모리 효율 패키지 (G3)** ✅
- **PR #36**: 정책 평가 캐시(TASK-103), 롤링 버퍼(TASK-107) - TTL/LRU 캐시, 메모리→파일 롤링, 압축 지원, Timer 정리 로직으로 성능 및 메모리 효율성 대폭 향상

### 🔄 현재 진행 중인 작업
- **스프린트 4A**: Claude CLI 모드 통합 및 로깅 시스템 최적화
- **다음 우선순위**: 
  - TASK-084: README/예제 업데이트 (claude CLI 가이드)
  - TASK-089: CLI 로깅 시스템 최적화 및 optional 설정

### 🗓️ 개발 로드맵
- **1단계 (1-4주)**: 기반 인프라 및 CLI 모듈 ✅
- **2단계 (5-8주)**: 핵심 엔진 및 Git 통합 🔄 (TASK-022 일부 완료)
- **3단계 (9-12주)**: 웹 대시보드 및 정책 엔진 🔄 (정책 엔진 백엔드 완료)
- **4단계 (13-16주)**: 팀 협업 기능 및 실시간 모니터링 ⏳
- **5단계 (17-20주)**: 크로스 플랫폼 API 및 SDK 개발 ⏳
- **6단계 (21-24주)**: 엔터프라이즈급 기능 고도화 ⏳
- **7단계 (25-28주)**: 품질 및 사용자 경험 최적화 ⏳
- **8단계 (29-32주)**: VS Code Extension 개발 및 배포 ⏳
- **9단계 (33-36주)**: 플러그인 시스템 및 생태계 구축 ⏳
- **10단계 (37-40주)**: 최적화 및 프로덕션 배포 준비 ⏳

## 📝 워크플로우 예제

### 기본 워크플로우

```yaml
name: "Code Refactoring"
description: "Automated code refactoring workflow"

stages:
  - name: analyze
    type: claude
    action: "analyze"
    prompt: "Analyze the code and identify refactoring opportunities"
    apply_changes: false
    
  - name: refactor
    type: claude
    action: "refactor"
    prompt: "Refactor the code to improve readability and maintainability"
    apply_changes: true
    branch: "refactor/{{timestamp}}"
    
  - name: test
    type: run
    commands: ["npm test", "npm run lint"]
    
  - name: commit
    type: git
    message: "Refactor: {{stage.analyze.summary}}"
    push: true
```

### 고급 워크플로우 예제

#### **AI 코드 리뷰 및 개선**
```yaml
name: "AI Code Review"
description: "Automated code review and improvement workflow"

stages:
  - name: review
    type: claude
    action: "review"
    prompt: |
      Review the code for:
      - Code quality and best practices
      - Performance optimizations
      - Security vulnerabilities
      - Documentation improvements
    apply_changes: false
    
  - name: improve
    type: claude
    action: "improve"
    prompt: "Apply the suggested improvements from the review"
    apply_changes: true
    branch: "improve/{{timestamp}}"
    
  - name: validate
    type: run
    commands: ["npm test", "npm run lint", "npm run build"]
    
  - name: document
    type: claude
    action: "document"
    prompt: "Update documentation based on the code changes"
    apply_changes: true
```

#### **자동화된 버그 수정**
```yaml
name: "Bug Fix Automation"
description: "Automated bug detection and fixing"

stages:
  - name: detect
    type: claude
    action: "detect"
    prompt: "Analyze the code and identify potential bugs or issues"
    apply_changes: false
    
  - name: fix
    type: claude
    action: "fix"
    prompt: "Fix the identified bugs and issues"
    apply_changes: true
    branch: "fix/{{timestamp}}"
    
  - name: test
    type: run
    commands: ["npm test", "npm run test:integration"]
    
  - name: verify
    type: claude
    action: "verify"
    prompt: "Verify that all bugs are fixed and no new issues introduced"
    apply_changes: false
```

#### **팀 협업 워크플로우**
```yaml
name: "Team Collaboration Workflow"
description: "Automated team collaboration and code review workflow"

stages:
  - name: analyze
    type: claude
    action: "analyze"
    prompt: "Analyze the codebase and identify areas for improvement"
    apply_changes: false
    
  - name: refactor
    type: claude
    action: "refactor"
    prompt: "Refactor the code to improve maintainability and performance"
    apply_changes: true
    branch: "team-refactor/{{timestamp}}"
    
  - name: test
    type: run
    commands: ["npm test", "npm run lint", "npm run build"]
    
  - name: review
    type: claude
    action: "review"
    prompt: "Perform a comprehensive code review and suggest improvements"
    apply_changes: false
    
  - name: finalize
    type: claude
    action: "improve"
    prompt: "Apply final improvements based on the review"
    apply_changes: true
    
  - name: deploy
    type: run
    commands: ["npm run deploy:staging"]
    
  - name: notify
    type: notification
    channels: ["slack", "email"]
    message: "Team collaboration workflow completed successfully"
```

#### **엔터프라이즈급 보안 워크플로우**
```yaml
name: "Enterprise Security Workflow"
description: "Comprehensive security audit and compliance workflow"

stages:
  - name: security_scan
    type: run
    commands: ["npm audit", "npm run security:scan"]
    
  - name: code_analysis
    type: claude
    action: "analyze"
    prompt: |
      Analyze the code for:
      - Security vulnerabilities (OWASP Top 10)
      - Authentication and authorization issues
      - Data encryption and protection
      - Input validation and sanitization
    apply_changes: false
    
  - name: security_fixes
    type: claude
    action: "fix"
    prompt: "Apply security fixes and improvements"
    apply_changes: true
    branch: "security-fixes/{{timestamp}}"
    
  - name: compliance_check
    type: run
    commands: ["npm run compliance:check", "npm run license:audit"]
    
  - name: security_test
    type: run
    commands: ["npm run test:security", "npm run test:penetration"]
    
  - name: audit_report
    type: claude
    action: "document"
    prompt: "Generate comprehensive security audit report"
    apply_changes: true
```

## 🛠️ 기술 스택

### Backend
- **NestJS** - 백엔드 프레임워크
- **TypeScript** - 타입 안전성
- **Winston** - 로깅 시스템
- **JWT** - 인증 및 권한 관리
- **WebSocket** - 실시간 통신

### Frontend
- **Next.js 14** - React 프레임워크
- **TailwindCSS** - CSS 프레임워크
- **Chart.js** - 데이터 시각화
- **xterm.js** - 터미널 에뮬레이션

### CLI & Tools
- **NestJS Commander** - CLI 프레임워크
- **js-yaml** - YAML 파싱
- **simple-git** - Git 연동

### Testing & Quality
- **Jest** - 테스트 프레임워크
- **ESLint** - 코드 품질 검사
- **Prettier** - 코드 포맷팅
- **SonarQube** - 코드 품질 분석
- **OWASP ZAP** - 보안 테스트

### DevOps & Integration
- **Docker** - 컨테이너화
- **GitHub Actions** - CI/CD
- **PM2** - 프로세스 관리
- **Prometheus** - 모니터링
- **Grafana** - 대시보드

### Security & Compliance
- **Helmet** - 보안 헤더
- **bcrypt** - 비밀번호 해싱
- **rate-limiter** - 요청 제한
- **audit-log** - 감사 로그

## 📚 문서

- [📖 PRD](./docs/project/PRD.md) - 제품 요구사항 및 기능 명세
- [🔧 TRD](./docs/project/TRD.md) - 기술적 구현 방법 및 아키텍처
- [📋 개발 태스크](./docs/project/DEVELOPMENT_TASKS.md) - 상세 개발 계획 및 진행 상황
- [📊 프로젝트 상태](./docs/project/PROJECT_STATUS.md) - 전체 진행 상황 및 로드맵
- [👥 팀 협업 가이드](./docs/user-guide/team-collaboration.md) - 팀 협업 기능 사용법
- [🌐 API 문서](./docs/api/README.md) - REST API 및 SDK 사용법
- [🏢 엔터프라이즈 가이드](./docs/user-guide/enterprise.md) - 엔터프라이즈급 기능 설정
- [🎯 품질 관리 가이드](./docs/user-guide/quality.md) - 테스트 및 품질 보증 방법

## 🔄 마이그레이션 노트

### v0.2.0 → v0.3.0 (2025년 8월 21일)
- **중요 변경사항**: `type: "claude"` 스텝에 `action` 필드가 **필수**가 되었습니다
- **기존 워크플로우**: `action` 필드가 없는 경우 실행 시 오류가 발생합니다
- **업데이트 방법**: 모든 `type: "claude"` 스텝에 적절한 `action` 값을 추가하세요

#### 마이그레이션 예시
```yaml
# 이전 버전 (v0.2.0)
- name: "코드 분석"
  type: "claude"
  prompt: "코드를 분석해주세요"

# 새 버전 (v0.3.0) - action 필드 추가 필요
- name: "코드 분석"
  type: "claude"
  action: "analyze"  # ← 이 필드가 필수
  prompt: "코드를 분석해주세요"
```

#### 지원되는 Action 값
**실제 스키마 기준 (권장):**
- `task`: 일반적인 작업 수행
- `query`: 질의 및 조회
- `continue`: 이어가기
- `resume`: 재개
- `commit`: 커밋 관련

**확장 Action 값 (향후 지원 예정):**
- `analyze`: 코드/내용 분석
- `review`: 코드 리뷰 및 품질 검사
- `improve`: 코드 개선 및 최적화
- `fix`: 버그 수정 및 문제 해결
- `document`: 문서화 및 주석 추가
- `test`: 테스트 생성 및 실행
- `deploy`: 배포 및 배포 스크립트

## 🛠️ 개발 환경 설정

```bash
# 개발 의존성 설치
npm install -D

# 테스트 실행
npm test

# 코드 품질 검사
npm run lint
npm run format

# 빌드
npm run build
```

### 🔧 GitHub 통합 옵션

- 환경변수
  - `USE_GITHUB`: `true|false` (기본 true) — 전체 GitHub 통합 사용 여부
  - `GITHUB_MODE`: `auto|cli|token|manual` (기본 `auto`) — 사용 모드 지정
  - `GITHUB_TOKEN`: token 모드에서 사용되는 GitHub Personal Access Token
  - `GITHUB_API_BASE`: GitHub Enterprise 등 API base override (옵션)

- 설정 파일(`claude-auto-worker.config.yaml`) 예시
```yaml
github:
  enabled: true
  mode: auto # or cli|token|manual
```

## 📄 라이선스

이 프로젝트는 [MIT 라이선스](LICENSE) 하에 배포됩니다.

---

## 🌟 **프로젝트 비전: 세계적인 품질의 오픈소스 자동화 도구**

### 🎯 **"Claude-Autopilot의 단순함 + 엔터프라이즈급 기능"**
- **즉시 사용 가능한 CLI 도구**: Claude-Autopilot처럼 간단하게 시작
- **고급 정책 엔진**: 엔터프라이즈급 보안 및 안전장치
- **팀 협업 지원**: 팀 단위 워크플로우 관리 및 협업

### 🚀 **"개인 자동화를 넘어선 팀 협업 자동화"**
- **실시간 웹 대시보드**: 팀 상태 공유 및 모니터링
- **워크플로우 공유**: 팀별 템플릿 및 협업 도구
- **성과 분석**: 자동화 ROI 및 팀 효율성 측정

### 🌐 **"VS Code 종속성을 벗어난 크로스 플랫폼 자동화"**
- **다양한 인터페이스**: CLI, 웹, API, VS Code Extension
- **외부 도구 연동**: CI/CD 파이프라인, 다중 언어 SDK
- **플러그인 생태계**: 확장 가능한 아키텍처

### 🏆 **품질 중심 개발 접근법**
- **포괄적인 테스트**: 95% 커버리지, 성능 테스트, 보안 감사
- **사용자 경험**: 직관적인 UI/UX, 접근성, 온보딩 시스템
- **지속적 개선**: 사용자 피드백, 성능 모니터링, 정기 업데이트

---

⭐ 이 프로젝트가 도움이 되었다면 스타를 눌러주세요!
