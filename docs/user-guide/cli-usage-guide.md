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
npm run cli:help

# 사용 가능한 명령어 확인
npm run cli:help run
```

2. **Hello World 워크플로우 실행**
```bash
# 기본 워크플로우 실행
npm run cli:run docs/examples/basic/hello-world.yaml
```

3. **결과 확인**
```bash
# 워크플로우 상태 확인
npm run cli:status

# 로그 확인
npm run cli:logs
```

---

## 📚 명령어 상세 가이드

### 🚀 `run` - 워크플로우 실행

**용도**: YAML/JSON 워크플로우 파일을 실행하여 Claude와 상호작용

**구문**:
```bash
npm run cli:run <workflow-file> [options]
```

**옵션**:
- `--debug`: 디버그 모드 활성화
- `--dry-run`: 실제 실행 없이 검증만 수행
- `--timeout <ms>`: 타임아웃 설정 (기본값: 30000ms)

**예제**:
```bash
# 기본 실행
npm run cli:run workflow.yaml

# 디버그 모드로 실행
npm run cli:run workflow.yaml --debug

# 타임아웃 설정
npm run cli:run workflow.yaml --timeout 60000
```

### 📊 `status` - 워크플로우 상태 확인

**용도**: 현재 실행 중이거나 완료된 워크플로우의 상태 정보 표시

**구문**:
```bash
npm run cli:status [workflow-id]
```

**예제**:
```bash
# 모든 워크플로우 상태 확인
npm run cli:status

# 특정 워크플로우 상태 확인
npm run cli:status workflow-123
```

**출력 예시**:
```
📊 워크플로우 상태
==================

ID: workflow-123
상태: ✅ 완료
시작 시간: 2024-08-19 15:30:00
완료 시간: 2024-08-19 15:32:15
소요 시간: 2분 15초
```

### 📝 `logs` - 워크플로우 로그 보기

**용도**: 워크플로우 실행 과정의 상세한 로그 정보 표시

**구문**:
```bash
npm run cli:logs [workflow-id] [options]
```

**옵션**:
- `--tail <n>`: 마지막 n줄만 표시
- `--follow`: 실시간 로그 모니터링
- `--level <level>`: 로그 레벨 필터링 (debug, info, warn, error)

**예제**:
```bash
# 모든 로그 보기
npm run cli:logs

# 특정 워크플로우 로그 보기
npm run cli:logs workflow-123

# 마지막 10줄만 보기
npm run cli:logs workflow-123 --tail 10

# 실시간 모니터링
npm run cli:logs workflow-123 --follow
```

### ⚙️ `config` - 설정 관리

**용도**: CLI 설정 정보 조회 및 관리

**구문**:
```bash
npm run cli:config [action] [options]
```

**액션**:
- `show`: 현재 설정 정보 표시
- `path`: 설정 파일 경로 표시
- `init`: 설정 파일 초기화

**예제**:
```bash
# 현재 설정 확인
npm run cli:config show

# 설정 파일 경로 확인
npm run cli:config path

# 설정 파일 초기화
npm run cli:config init
```

### ❓ `help` - 도움말 정보

**용도**: CLI 명령어에 대한 상세한 도움말 및 사용법 표시

**구문**:
```bash
npm run cli:help [command]
```

**예제**:
```bash
# 일반 도움말
npm run cli:help

# 특정 명령어 도움말
npm run cli:help run
npm run cli:help status
npm run cli:help logs
npm run cli:help config
```

---

## 📄 워크플로우 파일 작성법

### YAML 구조

워크플로우 파일은 YAML 형식으로 작성하며, 다음과 같은 기본 구조를 가집니다:

```yaml
name: "워크플로우 이름"
description: "워크플로우 설명"
version: "1.0.0"

variables:
  api_key: "${CLAUDE_API_KEY}"
  model: "claude-3-sonnet-20240229"

steps:
  - id: "step-1"
    name: "단계 1"
    type: "claude"
    prompt: "안녕하세요! 간단한 인사를 해주세요."
    
  - id: "step-2"
    name: "단계 2"
    type: "claude"
    prompt: "이전 응답을 바탕으로 더 자세한 설명을 해주세요."
    depends_on: "step-1"
    
  - id: "step-3"
    name: "단계 3"
    type: "output"
    format: "markdown"
    depends_on: "step-2"
```

### 변수 사용법

워크플로우에서 변수를 사용하여 동적인 값을 설정할 수 있습니다:

```yaml
variables:
  # 환경변수에서 가져오기
  api_key: "${CLAUDE_API_KEY}"
  
  # 직접 값 설정
  model: "claude-3-sonnet-20240229"
  temperature: 0.7
  
  # 계산된 값
  max_tokens: 4000

steps:
  - id: "dynamic-prompt"
    name: "동적 프롬프트"
    type: "claude"
    prompt: |
      모델: ${model}
      온도: ${temperature}
      최대 토큰: ${max_tokens}
      
      위 설정으로 코드를 생성해주세요.
```

### 의존성 관리

`depends_on` 필드를 사용하여 단계 간의 의존성을 정의할 수 있습니다:

```yaml
steps:
  - id: "step-1"
    name: "데이터 수집"
    type: "input"
    
  - id: "step-2"
    name: "데이터 처리"
    type: "claude"
    depends_on: "step-1"
    
  - id: "step-3"
    name: "결과 출력"
    type: "output"
    depends_on: ["step-1", "step-2"]
```

---

## 🔧 문제 해결

### 일반적인 문제와 해결 방법

#### 1. API 키 오류

**증상**: `Claude API key not found` 오류

**실제 오류 메시지 예시**:
```bash
❌ Error occurred:
   Claude API key not found
   Code: CLAUDE_API_KEY_MISSING
   Context:
     environment: development
     config_file: ~/.claude-auto-worker/config.json

💡 해결 방법:
   환경변수 CLAUDE_API_KEY를 설정하거나 설정 파일을 초기화하세요.
```

**해결 방법**:
```bash
# 환경변수 확인
echo $CLAUDE_API_KEY

# 환경변수 설정
export CLAUDE_API_KEY="your-api-key-here"

# 설정 파일에 저장
npm run cli:config init
```

#### 2. 워크플로우 파일 오류

**증상**: `Invalid workflow file` 오류

**실제 오류 메시지 예시**:
```bash
❌ Error occurred:
   Invalid workflow file: workflow.yaml
   Code: INVALID_WORKFLOW_FILE
   Context:
     file_path: ./workflow.yaml
     error_type: YAML_PARSE_ERROR
     line: 15
     column: 5

💡 해결 방법:
   YAML 문법을 확인하고 파일 구조를 검증하세요.
```

**해결 방법**:
```bash
# YAML 문법 검증
npm run cli:run workflow.yaml --dry-run

# 파일 경로 확인
ls -la workflow.yaml

# 파일 권한 확인
chmod 644 workflow.yaml
```

#### 3. 타임아웃 오류

**증상**: `Request timeout` 오류

**해결 방법**:
```bash
# 타임아웃 증가
npm run cli:run workflow.yaml --timeout 120000

# 네트워크 상태 확인
ping api.anthropic.com

# API 상태 확인
curl -I https://api.anthropic.com/health
```

#### 4. 메모리 부족 오류

**증상**: `Out of memory` 오류

**해결 방법**:
```bash
# Node.js 메모리 제한 증가
NODE_OPTIONS="--max-old-space-size=4096" npm run cli:run workflow.yaml

# 워크플로우 최적화
# - 단계 수 줄이기
# - 프롬프트 길이 줄이기
# - 배치 크기 줄이기
```

### 디버깅 팁

#### 1. 디버그 모드 사용

```bash
# 상세한 로그 출력
npm run cli:run workflow.yaml --debug

# 로그 레벨 조정
npm run cli:logs workflow-id --level debug
```

#### 2. 단계별 실행

```yaml
# 워크플로우를 작은 단위로 분할
steps:
  - id: "test-step"
    name: "테스트 단계"
    type: "claude"
    prompt: "간단한 테스트"
```

#### 3. 로그 분석

```bash
# 로그 파일 저장
npm run cli:logs workflow-id > debug.log

# 특정 패턴 검색
grep "ERROR" debug.log
grep "WARN" debug.log
```

---

## 🚀 고급 사용법

### 배치 실행

여러 워크플로우를 순차적으로 실행할 수 있습니다:

```bash
# 스크립트 파일 생성
cat > batch-run.sh << 'EOF'
#!/bin/bash
workflows=(
  "workflow1.yaml"
  "workflow2.yaml"
  "workflow3.yaml"
)

for workflow in "${workflows[@]}"; do
  echo "실행 중: $workflow"
  npm run cli:run "$workflow"
  
  if [ $? -eq 0 ]; then
    echo "✅ 성공: $workflow"
  else
    echo "❌ 실패: $workflow"
    break
  fi
done
EOF

# 실행 권한 부여
chmod +x batch-run.sh

# 배치 실행
./batch-run.sh
```

### 자동화 스크립트

cron을 사용하여 정기적인 워크플로우 실행:

```bash
# crontab 편집
crontab -e

# 매일 오전 9시에 실행
0 9 * * * cd /path/to/claude-auto-worker && npm run cli:run daily-workflow.yaml

# 매주 월요일 오전 8시에 실행
0 8 * * 1 cd /path/to/claude-auto-worker && npm run cli:run weekly-report.yaml
```

**실제 cron 설정 예시**:

```bash
# crontab -e로 편집기 열기
crontab -e

# 다음 내용을 추가:
# ┌───────────── 분 (0-59)
# │ ┌─────────── 시 (0-23)
# │ │ ┌───────── 일 (1-31)
# │ │ │ ┌─────── 월 (1-12)
# │ │ │ │ ┌───── 요일 (0-7, 0과 7은 일요일)
# │ │ │ │ │
# │ │ │ │ │
# * * * * * 명령어

# 매일 오전 9시에 일일 보고서 생성
0 9 * * * cd /home/user/claude-auto-worker && \
  npm run cli:run workflows/daily-report.yaml >> /var/log/claude-daily.log 2>&1

# 매주 월요일 오전 8시에 주간 분석 실행
0 8 * * 1 cd /home/user/claude-auto-worker && \
  npm run cli:run workflows/weekly-analysis.yaml >> /var/log/claude-weekly.log 2>&1

# 매월 1일 오전 7시에 월간 요약 생성
0 7 1 * * cd /home/user/claude-auto-worker && \
  npm run cli:run workflows/monthly-summary.yaml >> /var/log/claude-monthly.log 2>&1

# 매시간마다 모니터링 체크 (테스트용)
0 * * * * cd /home/user/claude-auto-worker && \
  npm run cli:run workflows/health-check.yaml >> /var/log/claude-health.log 2>&1
```

**cron 설정 팁**:
- `>> /var/log/파일명.log 2>&1`: 로그 파일에 출력과 에러 저장
- `cd /path/to/project`: 프로젝트 디렉토리로 이동
- `&&`: 이전 명령어가 성공했을 때만 다음 명령어 실행
- 로그 파일 경로는 시스템에 맞게 조정

### 워크플로우 템플릿

자주 사용하는 워크플로우 패턴을 템플릿으로 만들어 재사용:

```yaml
# templates/code-review.yaml
name: "코드 리뷰 템플릿"
description: "코드 품질 검토 및 개선 제안"

variables:
  language: "${LANGUAGE}"
  framework: "${FRAMEWORK}"

steps:
  - id: "analyze"
    name: "코드 분석"
    type: "claude"
    prompt: |
      다음 ${language} 코드를 분석해주세요:
      ${code}
      
      다음 관점에서 검토해주세요:
      1. 코드 품질
      2. 성능 최적화
      3. 보안 취약점
      4. 가독성 개선
```

### 통합 및 확장

#### Git 연동

```bash
# 워크플로우 실행 후 자동 커밋
npm run cli:run workflow.yaml && \
git add . && \
git commit -m "워크플로우 실행 결과: $(date)" && \
git push
```

#### CI/CD 파이프라인

```yaml
# .github/workflows/claude-workflow.yml
name: Claude Workflow

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  claude-workflow:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run cli:build
      - run: npm run cli:run ci-workflow.yaml
```

---

## 📚 추가 자료

### 유용한 링크

- **공식 문서**: [Claude Auto Worker 문서](https://github.com/0113bernoyoun/claude-auto-worker)
- **예제 워크플로우**: `docs/examples/` 디렉토리
- **API 문서**: [Anthropic Claude API](https://docs.anthropic.com/)
- **커뮤니티**: [GitHub Discussions](https://github.com/0113bernoyoun/claude-auto-worker/discussions)

### 지원 및 피드백

문제가 발생하거나 개선 제안이 있으시면:

1. **GitHub Issues**: [이슈 등록](https://github.com/0113bernoyoun/claude-auto-worker/issues)
2. **GitHub Discussions**: [토론 참여](https://github.com/0113bernoyoun/claude-auto-worker/discussions)
3. **Pull Request**: [기여하기](https://github.com/0113bernoyoun/claude-auto-worker/pulls)

---

**📅 최종 업데이트**: 2024년 8월 19일  
**✍️ 작성자**: Claude Auto Worker Team  
**🔗 버전**: 1.0.0
