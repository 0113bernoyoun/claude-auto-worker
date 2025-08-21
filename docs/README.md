# 📚 claude-auto-worker 문서

이 디렉토리는 claude-auto-worker 프로젝트의 모든 문서를 체계적으로 관리합니다.

## 📁 디렉토리 구조

```
docs/
├── README.md                    # 이 파일 (문서 구조 안내)
├── project/                     # 프로젝트 핵심 문서
│   ├── PRD.md                  # 제품 요구사항 (Product Requirements Document)
│   ├── TRD.md                  # 기술 요구사항 (Technical Requirements Document)
│   ├── DEVELOPMENT_TASKS.md    # 개발 태스크 목록 및 진행 상황
│   └── PROJECT_STATUS.md       # 프로젝트 전체 진행 상황 및 로드맵
├── user-guide/                 # 사용자 가이드
│   └── cli-usage-guide.md      # CLI 사용 가이드
├── examples/                    # 예시 파일들
│   ├── basic/                  # 기본 예시
│   │   ├── hello-world.yaml    # Hello World 예시
│   │   ├── file-processing.yaml # 파일 처리 예시
│   │   └── dsl-test.yaml       # DSL 테스트 예시
└── development/                 # 개발자 문서
    └── dev-notes/              # 개발 노트 (TASK 완료 문서들)
        ├── TASK-001-완료-문서.md
        ├── TASK-002-완료-문서.md
        └── ...                  # 기타 TASK 완료 문서들
```

## 🎯 문서별 역할

### 📋 프로젝트 핵심 문서 (`project/`)
- **PRD.md**: 제품의 목표, 기능 요구사항, 사용자 스토리
- **TRD.md**: 기술적 구현 방법, 아키텍처 설계, 시스템 구성
- **DEVELOPMENT_TASKS.md**: 개발 태스크 목록, 우선순위, 의존성 관계
- **PROJECT_STATUS.md**: 프로젝트 진행 상황, 완료된 작업, 다음 단계 계획

### 📖 사용자 가이드 (`user-guide/`)
- CLI 사용법, 워크플로우 정의 방법, 설정 가이드 등

### 💡 예시 (`examples/`)
- 다양한 워크플로우 예시 파일들로 사용법 학습 지원

### 🔧 개발자 문서 (`development/`)
- 개발 과정에서 생성된 노트, TASK 완료 문서, 기술적 결정 사항 등

## 🔗 문서 참조 규칙

AI 에이전트 및 개발자는 다음 규칙을 따라 문서를 참조해야 합니다:

1. **프로젝트 요구사항 확인**: `docs/project/PRD.md`
2. **기술적 구현 방법**: `docs/project/TRD.md`
3. **개발 태스크 및 우선순위**: `docs/project/DEVELOPMENT_TASKS.md`
4. **프로젝트 진행 상황**: `docs/project/PROJECT_STATUS.md`
5. **사용자 가이드**: `docs/user-guide/` 디렉토리
6. **개발 노트**: `docs/development/dev-notes/` 디렉토리

## 📝 문서 작성 규칙

- **새로운 프로젝트 문서**: `docs/project/` 디렉토리에 생성
- **사용자 가이드**: `docs/user-guide/` 디렉토리에 생성
- **개발 노트**: `docs/development/dev-notes/` 디렉토리에 생성
- **예시 파일**: `docs/examples/` 디렉토리에 생성
- **README.md**: 현재 상태 유지 (프로젝트 소개, 설치 방법, 사용법 등)

## 🔄 마이그레이션 상태

현재 문서 구조 개선이 진행 중입니다:
- ✅ 새 디렉토리 구조 생성
- ✅ 프로젝트 핵심 문서 복사
- ✅ 개발 노트 복사
- ⏳ 기존 코드의 참조 경로 점진적 변경 (진행 중)
- ⏳ 중복 문서 정리 (진행 중)

기존 문서들은 루트 디렉토리에 유지되어 참조 경로를 보호하고, 새로운 작업은 이 디렉토리 구조를 사용합니다.
