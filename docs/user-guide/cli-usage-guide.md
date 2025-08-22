# 🚀 Claude Auto Worker CLI 사용 가이드

## 📋 목차

1. [설치 및 설정](#설치-및-설정)
2. [기본 사용법](#기본-사용법)
3. [명령어 상세 가이드](#명령어-상세-가이드)
4. [워크플로우 파일 작성법](#워크플로우-파일-작성법)
5. [문제 해결](#문제-해결)
6. [고급 사용법](#고급-사용법)

---

## 🛠️ 설치 및 설정

### 필수 요구사항

- **Node.js**: 18.0.0 이상
- **npm**: 8.0.0 이상
- **Git**: 2.0.0 이상

### 설치 방법

```bash
# 저장소 클론
git clone https://github.com/0113bernoyoun/claude-auto-worker.git
cd claude-auto-worker

# 의존성 설치
npm install

# CLI 빌드
npm run cli:build
```

### 초기 설정

```bash
# 환경변수 설정
export CLAUDE_API_KEY="your-api-key-here"
export CLAUDE_MODEL="claude-3-sonnet-20240229"

# 설정 파일 초기화
npm run cli:config init
```

---

## 🚀 기본 사용법

### 첫 번째 워크플로우 실행

1. **예제 워크플로우 파일 확인**
```bash
# 도움말 보기
./bin/claude-auto-worker --help

# 사용 가능한 명령어 확인
./bin/claude-auto-worker run --help
```

2. **Hello World 워크플로우 실행**
```bash
# 기본 워크플로우 실행
./bin/claude-auto-worker run docs/examples/basic/hello-world.yaml

# Dry-run 모드로 실행 (실제 실행 없음)
./bin/claude-auto-worker run docs/examples/basic/hello-world.yaml --dry-run
```

3. **결과 확인**
```bash
# 워크플로우 상태 확인
./bin/claude-auto-worker status

# 로그 확인
./bin/claude-auto-worker logs
```

---

## 📚 명령어 상세 가이드

### 🚀 `run` - 워크플로우 실행

**용도**: YAML/JSON 워크플로우 파일을 실행하여 Claude와 상호작용

**구문**:
```bash
./bin/claude-auto-worker run <workflow-file> [options]
```

**옵션**:
- `--debug`: 디버그 모드 활성화
- `--dry-run`: 실제 실행 없이 검증만 수행
- `--timeout <ms>`: 타임아웃 설정 (기본값: 30000ms)

**예제**:
```bash
# 기본 실행
./bin/claude-auto-worker run workflow.yaml

# 디버그 모드로 실행
./bin/claude-auto-worker run workflow.yaml --debug

# Dry-run 모드로 실행
./bin/claude-auto-worker run workflow.yaml --dry-run
```

### 📊 `status` - 워크플로우 상태 확인

**용도**: 현재 실행 중이거나 완료된 워크플로우의 상태 정보 확인

**구문**:
```bash
./bin/claude-auto-worker status [options]
```

**옵션**:
- `--run <id>`: 특정 run ID의 상태 확인
- `--format <format>`: 출력 형식 지정 (table, json)

**예제**:
```bash
# 최신 워크플로우 상태 확인
./bin/claude-auto-worker status

# 특정 run ID의 상태 확인
./bin/claude-auto-worker status --run test-workflow-123

# JSON 형식으로 출력
./bin/claude-auto-worker status --format json
```

### 📝 `logs` - 워크플로우 로그 확인

**용도**: 워크플로우 실행 로그를 확인하고 필터링

**구문**:
```bash
./bin/claude-auto-worker logs [options] [run-id]
```

**옵션**:
- `-f, --follow`: 실시간 로그 추적
- `-n, --lines <number>`: 표시할 로그 라인 수 (기본값: 500, 최대: 5000)
- `--since <time>`: 특정 시간 이후의 로그만 표시 (예: "2h", "1d", "2h30m")
- `--level <level>`: 로그 레벨 필터 (debug, info, warn, error)
- `-r, --run <id>`: 특정 run ID의 로그 확인
- `--show-invalid-json`: 잘못된 JSON 라인을 경고와 함께 표시

**예제**:
```bash
# 최신 로그 10줄 확인
./bin/claude-auto-worker logs -n 10

# 실시간 로그 추적
./bin/claude-auto-worker logs -f

# 특정 run ID의 로그 확인
./bin/claude-auto-worker logs -r test-workflow-123

# 에러 로그만 확인
./bin/claude-auto-worker logs --level error

# 2시간 전부터의 로그 확인
./bin/claude-auto-worker logs --since 2h
```

### 🔍 `enhanced-status` - 향상된 상태 정보

**용도**: 워크플로우 상태에 대한 상세한 분석 및 시각화

**구문**:
```bash
./bin/claude-auto-worker enhanced-status [options]
```

**옵션**:
- `-r, --run <id>`: 특정 run ID의 상세 상태 확인 (필수)

**예제**:
```bash
# 특정 run ID의 상세 상태 확인
./bin/claude-auto-worker enhanced-status -r test-workflow-123
```

### 📊 `enhanced-logs` - 향상된 로그 분석

**용도**: 로그에 대한 고급 분석 및 상태 추적

**구문**:
```bash
./bin/claude-auto-worker enhanced-logs [options] [run-id]
```

**옵션**:
- `-r, --run <id>`: 특정 run ID의 로그 분석 (필수)
- `--format <format>`: 출력 형식 지정

**예제**:
```bash
# 특정 run ID의 로그 분석
./bin/claude-auto-worker enhanced-logs -r test-workflow-123
```

### ⚙️ `config` - 설정 관리

**용도**: CLI 설정 파일 관리 및 환경 설정

**구문**:
```bash
./bin/claude-auto-worker config [action] [path]
```

**액션**:
- `init`: 설정 파일 초기화
- `show`: 현재 설정 표시
- `set`: 설정 값 변경
- `validate`: 설정 파일 유효성 검사

**예제**:
```bash
# 설정 파일 초기화
./bin/claude-auto-worker config init

# 현재 설정 표시
./bin/claude-auto-worker config show

# 설정 값 변경
./bin/claude-auto-worker config set api_key "your-api-key"
```

---

## 📝 워크플로우 파일 작성법

### 기본 구조

```yaml
name: "워크플로우 이름"
description: "워크플로우 설명"
version: "1.0.0"

variables:
  api_key: "${CLAUDE_API_KEY}"
  model: "claude-3-sonnet-20240229"

steps:
  - id: "step1"
    name: "단계 1"
    type: "claude"
    action: "task"  # 필수: task, query, continue, resume, commit 중 하나
    prompt: "프롬프트 내용"
    
  - id: "step2"
    name: "단계 2"
    type: "claude"
    action: "query"
    prompt: "두 번째 단계 프롬프트"
    depends_on: "step1"  # 의존성 설정
```

### 필수 필드

- **`id`**: 각 단계의 고유 식별자
- **`type`**: 단계 유형 (claude, output 등)
- **`action`**: Claude 액션 유형 (task, query, continue, resume, commit)

### 선택적 필드

- **`depends_on`**: 이 단계가 의존하는 단계 ID
- **`branch`**: Git 브랜치 이름 (자동 커밋 시 사용)
- **`policy`**: 재시도, 타임아웃, 롤백 정책

---

## 🚨 문제 해결

### 일반적인 문제들

#### 1. **워크플로우 스키마 검증 실패**
```bash
# 에러 메시지 예시
CLI Error [CLI_VALIDATION_ERROR]: Workflow schema validation failed

# 해결 방법
# - action 필드가 누락되지 않았는지 확인
# - 필수 필드(id, type)가 있는지 확인
# - YAML 문법이 올바른지 확인
```

#### 2. **포트 충돌**
```bash
# 에러 메시지 예시
Error: listen EADDRINUSE: address already in use :::5849

# 해결 방법
lsof -i :5849  # 포트 사용 프로세스 확인
kill <PID>     # 해당 프로세스 종료
```

#### 3. **API 키 설정 문제**
```bash
# 환경변수 설정 확인
echo $CLAUDE_API_KEY

# 설정 파일 확인
./bin/claude-auto-worker config show
```

---

## 🎯 고급 사용법

### 워크플로우 정책 설정

```yaml
steps:
  - id: "advanced_step"
    name: "고급 단계"
    type: "claude"
    action: "task"
    prompt: "프롬프트 내용"
    policy:
      retry:
        max_attempts: 3
        delay_ms: 1000
        backoff_multiplier: 2
      timeout:
        seconds: 60
      rollback:
        enabled: true
        steps: ["cleanup_step"]
```

### Git 통합 활용

```yaml
steps:
  - id: "git_step"
    name: "Git 작업"
    type: "claude"
    action: "task"
    prompt: "코드 수정 작업"
    branch: "feature/auto-update"  # 자동으로 브랜치 생성 및 커밋
```

### 병렬 실행

```yaml
stages:
  - id: "parallel_stage"
    name: "병렬 실행 단계"
    steps: ["step1", "step2", "step3"]
    parallel: true  # 동시에 실행
```

---

## 📚 추가 리소스

- **프로젝트 문서**: `docs/` 디렉토리
- **예시 파일**: `docs/examples/` 디렉토리
- **GitHub 저장소**: https://github.com/0113bernoyoun/claude-auto-worker

---

## 🔄 최근 변경사항

### v0.1.0 (2025-08-22)
- **CLI 옵션 변경**: `--tail` → `-n, --lines` 옵션으로 변경
- **스키마 업데이트**: `action` 필드가 필수로 변경
- **API 엔드포인트**: `/api/status`, `/api/logs` 정상 작동
- **예시 파일**: 스키마에 맞게 업데이트

### 주요 변경사항
- **로그 명령어**: `--tail <number>` → `-n <number>` 또는 `--lines <number>`
- **워크플로우 스키마**: 모든 step에 `action` 필드 필수
- **API 서버**: 포트 5849에서 정상 작동
