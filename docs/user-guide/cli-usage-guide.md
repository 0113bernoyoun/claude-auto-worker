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
- Node.js 18.0.0 이상
- npm 또는 yarn
- Git (워크플로우에서 Git 연동 사용 시)

### 설치 방법

#### 1. 전역 설치 (권장)
```bash
npm install -g claude-auto-worker
```

#### 2. 소스에서 설치
```bash
git clone https://github.com/0113bernoyoun/claude-auto-worker.git
cd claude-auto-worker
npm install
npm run build
npm link
```

### 초기 설정

#### 1. 설정 파일 생성
```bash
claude-auto-worker config init
```

#### 2. 환경 변수 설정
```bash
# .env 파일 생성
export CLAUDE_API_KEY="your-claude-api-key"
export CLAUDE_MODEL="claude-3-sonnet-20240229"
export LOG_LEVEL="info"
```

#### 3. 설정 확인
```bash
claude-auto-worker config show
```

---

## 🚀 기본 사용법

### 첫 번째 워크플로우 실행

#### 1. 워크플로우 파일 생성
```yaml
# my-first-workflow.yaml
name: "첫 번째 워크플로우"
description: "Claude Auto Worker 테스트"

stages:
  - name: "인사하기"
    prompt: "안녕하세요! Claude Auto Worker에 오신 것을 환영합니다."
    run: "echo 'Hello from Claude Auto Worker!'"
```

#### 2. 워크플로우 실행
```bash
claude-auto-worker run my-first-workflow.yaml
```

#### 3. 결과 확인
```bash
claude-auto-worker status
claude-auto-worker logs
```

### 기본 명령어 구조
```bash
claude-auto-worker <command> [arguments] [options]
```

---

## 📚 명령어 상세 가이드

### 🚀 run - 워크플로우 실행

워크플로우 파일을 실행하여 Claude API와 상호작용하고 지정된 작업을 수행합니다.

#### 기본 사용법
```bash
claude-auto-worker run <workflow-file>
```

#### 옵션
- `-d, --debug`: 디버그 모드 활성화
- `-o, --output <path>`: 결과 출력 디렉토리 지정
- `--dry-run`: 실제 실행 없이 실행 계획만 표시

#### 사용 예제
```bash
# 기본 실행
claude-auto-worker run workflow.yaml

# 디버그 모드로 실행
claude-auto-worker run workflow.yaml --debug

# 출력 디렉토리 지정
claude-auto-worker run workflow.yaml -o ./results

# 드라이 런 (실행 계획만 확인)
claude-auto-worker run workflow.yaml --dry-run
```

### 📊 status - 워크플로우 상태 확인

실행 중이거나 완료된 워크플로우의 상태를 확인합니다.

#### 기본 사용법
```bash
claude-auto-worker status [options]
```

#### 옵션
- `-w, --workflow <id>`: 특정 워크플로우 ID의 상태 표시
- `-a, --all`: 모든 워크플로우 상태 표시
- `-f, --format <format>`: 출력 형식 지정 (json, table, simple)

#### 사용 예제
```bash
# 모든 워크플로우 상태 확인
claude-auto-worker status

# 특정 워크플로우 상태 확인
claude-auto-worker status -w workflow-123

# JSON 형식으로 출력
claude-auto-worker status --format json
```

### 📝 logs - 워크플로우 로그 확인

워크플로우 실행 로그를 확인합니다.

#### 기본 사용법
```bash
claude-auto-worker logs [workflow-id] [options]
```

#### 옵션
- `-f, --follow`: 실시간으로 로그 출력 추적
- `-n, --lines <number>`: 표시할 로그 라인 수
- `--since <time>`: 특정 시간 이후의 로그 표시
- `--level <level>`: 로그 레벨 필터

#### 사용 예제
```bash
# 모든 로그 확인
claude-auto-worker logs

# 특정 워크플로우 로그 확인
claude-auto-worker logs workflow-123

# 실시간 로그 추적
claude-auto-worker logs -f

# 최근 100줄 로그 확인
claude-auto-worker logs -n 100
```

### ⚙️ config - 설정 관리

Claude Auto Worker의 설정을 관리합니다.

#### 기본 사용법
```bash
claude-auto-worker config [show|path|init] [options]
```

#### 서브명령어
- `show`: 현재 설정 내용 표시
- `path`: 설정 파일 경로 표시
- `init`: 기본 설정 파일 생성

#### 옵션
- `-e, --env <name>`: 미리보기할 환경 이름
- `-o, --output <path>`: 템플릿 출력 경로
- `-f, --force`: 기존 파일 덮어쓰기

#### 사용 예제
```bash
# 현재 설정 확인
claude-auto-worker config show

# 설정 파일 경로 확인
claude-auto-worker config path

# 기본 설정 파일 생성
claude-auto-worker config init

# 특정 경로에 설정 파일 생성
claude-auto-worker config init -o ./config.yaml
```

---

## 📄 워크플로우 파일 작성법

### 기본 구조
```yaml
name: "워크플로우 이름"
description: "워크플로우 설명"

stages:
  - name: "스테이지 이름"
    prompt: "Claude에게 전달할 프롬프트"
    run: "실행할 명령어"
```

### 고급 구조
```yaml
name: "고급 워크플로우"
description: "복잡한 워크플로우 예제"

variables:
  output_dir: "./output"
  model: "claude-3-sonnet-20240229"

stages:
  - name: "데이터 준비"
    prompt: "다음 데이터를 분석해주세요: {{input_data}}"
    run: "mkdir -p {{output_dir}}"
    
  - name: "Claude 분석"
    prompt: |
      다음 데이터를 분석하여 JSON 형식으로 결과를 제공해주세요:
      {{input_data}}
    run: "echo '{{claude_response}}' > {{output_dir}}/analysis.json"
    
  - name: "결과 정리"
    prompt: "분석 결과를 요약해주세요"
    run: "cat {{output_dir}}/analysis.json"
```

### 변수 사용법
- `{{variable_name}}`: 설정된 변수 값으로 치환
- `{{input_data}}`: 입력 데이터
- `{{claude_response}}`: Claude의 응답

---

## 🔧 문제 해결

### 일반적인 문제들

#### 1. "Workflow file not found" 에러
```bash
# 해결 방법
ls -la workflow.yaml  # 파일 존재 확인
claude-auto-worker run ./workflow.yaml  # 절대 경로 사용
```

#### 2. "Claude API key not found" 에러
```bash
# 해결 방법
claude-auto-worker config show  # 설정 확인
export CLAUDE_API_KEY="your-api-key"  # 환경 변수 설정
```

#### 3. 권한 문제
```bash
# 해결 방법
chmod +x workflow.yaml  # 실행 권한 부여
sudo claude-auto-worker run workflow.yaml  # 관리자 권한으로 실행
```

### 디버그 모드 사용
```bash
claude-auto-worker run workflow.yaml --debug
```

### 로그 확인
```bash
claude-auto-worker logs --level debug
```

---

## 🚀 고급 사용법

### 배치 워크플로우 실행
```bash
# 여러 워크플로우 순차 실행
for workflow in *.yaml; do
  claude-auto-worker run "$workflow"
done
```

### 자동화 스크립트
```bash
#!/bin/bash
# auto-run.sh

WORKFLOW_DIR="./workflows"
OUTPUT_DIR="./output"

for workflow in "$WORKFLOW_DIR"/*.yaml; do
  echo "Running: $workflow"
  claude-auto-worker run "$workflow" -o "$OUTPUT_DIR"
done
```

### 모니터링 및 알림
```bash
# 실시간 상태 모니터링
watch -n 5 'claude-auto-worker status'

# 로그 실시간 추적
claude-auto-worker logs -f | grep -E "(ERROR|WARN|SUCCESS)"
```

---

## 📖 추가 리소스

### 공식 문서
- [GitHub 저장소](https://github.com/0113bernoyoun/claude-auto-worker)
- [API 문서](./api/)
- [아키텍처 가이드](../architecture/)

### 커뮤니티
- [이슈 트래커](https://github.com/0113bernoyoun/claude-auto-worker/issues)
- [토론](https://github.com/0113bernoyoun/claude-auto-worker/discussions)

### 예제 워크플로우
- [기본 예제](../examples/basic/)
- [고급 예제](../examples/advanced/)
- [통합 예제](../examples/integration/)

---

## 🆘 도움말

### 명령어 도움말
```bash
claude-auto-worker help
claude-auto-worker help <command>
```

### 버전 정보
```bash
claude-auto-worker --version
```

### 지원 채널
- GitHub Issues: 버그 리포트 및 기능 요청
- GitHub Discussions: 일반적인 질문 및 토론
- 문서: 이 가이드 및 API 문서

---

**📝 참고**: 이 가이드는 프로토타입 버전을 기준으로 작성되었습니다. 최신 기능과 변경사항은 공식 문서를 참조하세요.
