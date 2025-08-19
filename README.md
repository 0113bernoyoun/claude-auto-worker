# 🤖 claude-auto-worker

> 차세대 Claude Code 자동화 도구 - 안전하고, 유연하고, 확장 가능한 워크플로우 엔진

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-red.svg)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14.x-black.svg)](https://nextjs.org/)

## 🎯 프로젝트 개요

`claude-auto-worker`는 개인 개발자가 Claude Code를 더 안전하고, 유연하고, 확장 가능하게 자동화할 수 있는 오픈소스 도구입니다. VS Code Autopilot의 한계를 보완하고, 에디터 종속성 없이 동작하며, 워크플로우 DSL·정책 기반 필터링·테스트/Git 연동 등 **실질적 개발 생산성** 기능을 제공합니다.

## ✨ 주요 기능

### 🚀 **안전한 자동화**
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

## 🏗️ 아키텍처

```
claude-auto-worker/
├── src/                    # 소스 코드
│   ├── cli/               # CLI 모듈 (🔄 개발 중)
│   ├── core/              # 핵심 엔진 (⏳ 대기 중)
│   ├── parser/            # DSL 파서 (⏳ 대기 중)
│   ├── git/               # Git 통합 (⏳ 대기 중)
│   ├── test/              # 테스트 러너 (⏳ 대기 중)
│   ├── dashboard/         # 웹 대시보드 (⏳ 대기 중)
│   ├── shared/            # 공통 모듈 (⏳ 대기 중)
│   └── config/            # 설정 관리 (✅ 완료)
├── docs/                  # 문서
│   ├── api/               # API 문서
│   ├── user-guide/        # 사용자 가이드
│   ├── developer/         # 개발자 문서
│   └── architecture/      # 아키텍처 문서
├── tests/                 # 테스트
│   ├── unit/              # 단위 테스트
│   ├── integration/       # 통합 테스트
│   ├── e2e/               # E2E 테스트
│   └── performance/       # 성능 테스트
├── scripts/               # 빌드/배포 스크립트
└── tools/                 # 개발 도구
```

> **📊 개발 상태**: 🔄 개발 중 | ⏳ 대기 중 | ✅ 완료

## 🚀 빠른 시작

### 🔧 핵심 설정
- **기본 포트**: 5849
- **API 엔드포인트**: http://localhost:5849/api
- **개발 서버**: http://localhost:5849

### 📊 개발 진행 상황

> **⚠️ 현재 개발 진행 중입니다!** 
> 
> 이 프로젝트는 활발히 개발되고 있으며, 아직 MVP 단계입니다. 프로덕션 환경에서 사용하지 마세요.

#### ✅ 완료된 작업 (TASK-001 ~ TASK-012)
- **TASK-001**: 프로젝트 초기화 및 디렉토리 구조 설정 ✅
- **TASK-002**: NestJS 프로젝트 생성 및 기본 설정 ✅  
- **TASK-003**: TypeScript 설정 및 개발 도구 구성 ✅
- **TASK-008**: NestJS Commander 모듈 통합 ✅
- **TASK-009**: CLI 명령어 기본 구조 설계 ✅
- **TASK-010**: 설정 파일 관리 시스템 구현 ✅
- **TASK-011**: CLI 에러 핸들링 및 사용자 피드백 시스템 ✅
- **TASK-012**: CLI 테스트 환경 구성 ✅

#### 🔄 현재 진행 중인 작업
- **스프린트 1**: 프로젝트 기반 구조 구축 (1-3주차)
- **다음 우선순위**: CLI 고도화 (TASK-009 ~ TASK-013)

#### 📋 전체 개발 계획
- **총 태스크**: 72개 (8개 스프린트)
- **예상 완료**: 16주 (640시간)
- **현재 진행률**: 약 17% (11/72 태스크 완료)

#### 🎯 다음 마일스톤
- **1단계 완료**: CLI 모듈 개발 완료 (4주차)
- **2단계 목표**: 핵심 엔진 및 Git 통합 (5-8주차)
- **3단계 목표**: 웹 대시보드 및 정책 엔진 (9-12주차)

### 필수 요구사항

- **Node.js** 18.x 이상
- **Git** 2.x 이상
- **Claude API Key** (Anthropic)

### 설치

```bash
# 저장소 클론
git clone https://github.com/your-username/claude-auto-worker.git
cd claude-auto-worker

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일에 CLAUDE_API_KEY 설정

# 개발 서버 실행
npm run start:dev
```

### 기본 사용법

```bash
# 워크플로우 실행
claude-auto-worker run workflow.yaml

# 상태 확인
claude-auto-worker status

# 개발 서버 실행 (포트 5849)
npm run start:dev

# API 서버 접속
curl http://localhost:5849/api/health
```
claude-auto-worker status

# 로그 보기
claude-auto-worker logs --tail

# 새 워크플로우 생성
claude-auto-worker create refactor
```

## 진행상황

- 2025-08-18: TASK-001 완료 - 프로젝트 초기화 및 디렉토리 구조 설정
- 2025-08-18: TASK-002 완료 - NestJS 프로젝트 생성 및 기본 설정

## 📝 워크플로우 예제

### 기본 워크플로우

```yaml
name: "Code Refactoring"
description: "Automated code refactoring workflow"

stages:
  - name: analyze
    type: prompt
    prompt: "Analyze the code and identify refactoring opportunities"
    apply_changes: false
    
  - name: refactor
    type: prompt
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

### 고급 워크플로우

```yaml
name: "Full Development Cycle"
description: "Complete development workflow with testing and deployment"

stages:
  - name: code_generation
    type: prompt
    prompt: "Generate production-ready code based on requirements"
    apply_changes: true
    branch: "feature/{{feature_name}}"
    
  - name: unit_tests
    type: run
    commands: ["npm run test:unit"]
    on_failure: "rollback"
    
  - name: integration_tests
    type: run
    commands: ["npm run test:integration"]
    on_failure: "rollback"
    
  - name: security_scan
    type: run
    commands: ["npm audit", "npm run security:scan"]
    
  - name: deploy
    type: run
    commands: ["npm run deploy:staging"]
    when: "all_tests_passed"
```

## 🛠️ 기술 스택

### Backend
- **NestJS** - 백엔드 프레임워크
- **TypeScript** - 타입 안전성
- **SQLite** - 임베디드 데이터베이스
- **Winston** - 로깅 시스템

### Frontend
- **Next.js 14** - React 프레임워크
- **TailwindCSS** - CSS 프레임워크
- **Chart.js** - 데이터 시각화
- **Framer Motion** - 애니메이션

### CLI & Tools
- **NestJS Commander** - CLI 프레임워크
- **js-yaml** - YAML 파싱
- **simple-git** - Git 작업 자동화

### Testing & Quality
- **Jest** - 테스트 프레임워크
- **ESLint** - 코드 품질 검사
- **Prettier** - 코드 포맷팅

## 📚 문서

- [📖 사용자 가이드](./docs/user-guide/) - 워크플로우 작성 및 실행
- [🔧 API 문서](./docs/api/) - REST API 및 CLI 명령어
- [🏗️ 아키텍처 문서](./docs/architecture/) - 시스템 설계 및 구조
- [👨‍💻 개발자 문서](./docs/developer/) - 기여 가이드 및 개발 환경

## 📈 개발 진행 상황 상세

### 🎯 현재 스프린트: 스프린트 1 (1-3주차)
**목표**: 프로젝트 기반 구조 구축

#### ✅ 완료된 작업
- **TASK-001**: 프로젝트 초기화 및 디렉토리 구조 설정
  - 프로젝트 스캐폴딩 완료
  - 기본 문서 및 설정 파일 생성
- **TASK-002**: NestJS 프로젝트 생성 및 기본 설정
  - NestJS 기본 애플리케이션 구성
  - 글로벌 프리픽스 /api 적용 및 CORS 활성화
  - 기본 포트 5849 설정
- **TASK-003**: TypeScript 설정 및 개발 도구 구성
  - tsconfig.json 설정 완료
  - ESLint 및 Prettier 설정
  - VS Code 설정 파일 생성

#### 🔄 진행 중인 작업
- **TASK-004**: Docker 개발 환경 설정
- **TASK-005**: CI/CD 파이프라인 기본 구조 구축
- **TASK-006**: 기본 로깅 시스템 구축

#### 📋 다음 우선순위
- **TASK-008**: NestJS Commander 모듈 통합
- **TASK-009**: CLI 명령어 기본 구조 설계
- **TASK-010**: 설정 파일 관리 시스템 구현

### 🗓️ 전체 개발 로드맵
- **1단계 (1-4주)**: 기반 인프라 및 CLI 모듈
- **2단계 (5-8주)**: 핵심 엔진 및 Git 통합
- **3단계 (9-12주)**: 웹 대시보드 및 정책 엔진
- **4단계 (13-16주)**: VS Code Extension 및 고급 기능

### 📊 진행률 통계
- **전체 태스크**: 72개
- **완료된 태스크**: 4개 (5.6%)
- **현재 스프린트**: 1/8 (12.5%)
- **예상 완료일**: 2024년 4월 (16주 후)

## 🤝 기여하기

프로젝트에 기여하고 싶으시다면 [기여 가이드](./docs/developer/CONTRIBUTING.md)를 참고해 주세요.

### 개발 환경 설정

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

## 📄 라이선스

이 프로젝트는 [MIT 라이선스](LICENSE) 하에 배포됩니다.

## 🙏 감사의 말

- [Anthropic](https://www.anthropic.com/) - Claude API 제공
- [NestJS](https://nestjs.com/) - 훌륭한 백엔드 프레임워크
- [Next.js](https://nextjs.org/) - 현대적인 React 프레임워크
- 모든 기여자들과 커뮤니티 멤버들

## 📞 연락처

- **GitHub Issues**: [프로젝트 이슈](https://github.com/your-username/claude-auto-worker/issues)
- **Discord**: [커뮤니티 채널](https://discord.gg/your-server)
- **Email**: [your-email@example.com](mailto:your-email@example.com)

---

⭐ 이 프로젝트가 도움이 되었다면 스타를 눌러주세요!
