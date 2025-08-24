# 📸 Long-term Snapshot 사용 가이드

## 🎯 개요

Long-term Snapshot 서비스는 claude-auto-worker에서 장기 보존이 필요한 데이터를 주기적으로 스냅샷으로 저장하고 관리하는 기능입니다. 이 서비스는 opt-in 방식으로 동작하며, 정책 감사 로그, 워크플로우 이력, 시스템 메트릭 등을 안전하게 보존합니다.

## 🚀 주요 기능

- **자동 스케줄링**: cron-like 스케줄에 따른 자동 스냅샷 생성
- **수동 스냅샷**: 필요 시 즉시 스냅샷 생성
- **데이터 타입별 관리**: 정책 감사, 워크플로우 이력, 시스템 메트릭 등
- **압축 지원**: 저장 공간 절약을 위한 데이터 압축
- **자동 정리**: 보존 기간이 지난 스냅샷 자동 삭제
- **복구 기능**: 필요 시 특정 스냅샷 복구
- **다양한 저장소**: 파일 기반 저장 및 SQLite 지원 (향후)

## ⚙️ 설정

### 환경변수 설정

```bash
# 스냅샷 서비스 활성화
SNAPSHOT_ENABLED=true

# 스케줄 설정 (cron-like)
SNAPSHOT_SCHEDULE=0 2 * * *  # 매일 오전 2시

# 보존 기간 (일)
SNAPSHOT_RETENTION_DAYS=90

# 저장 타입 (file 또는 sqlite)
SNAPSHOT_STORAGE_TYPE=file

# 저장 경로
SNAPSHOT_STORAGE_PATH=./data/snapshots

# 압축 사용 여부
SNAPSHOT_COMPRESSION=true

# 최대 스냅샷 수
SNAPSHOT_MAX_COUNT=100

# 메타데이터 포함 여부
SNAPSHOT_METADATA=true

# 개별 데이터 타입 설정
SNAPSHOT_POLICY_AUDIT=true
SNAPSHOT_WORKFLOW_HISTORY=true
SNAPSHOT_SYSTEM_METRICS=true
SNAPSHOT_USER_ACTIVITY=false
```

### 기본 설정값

- **스케줄**: `0 2 * * *` (매일 오전 2시)
- **보존 기간**: 90일
- **저장 타입**: file
- **저장 경로**: `./data/snapshots`
- **압축**: 활성화
- **최대 스냅샷 수**: 100개

## 🖥️ CLI 명령어

### 기본 사용법

```bash
# 스냅샷 서비스 상태 확인
claude snapshot --status

# 설정 확인
claude snapshot --config

# 스냅샷 목록 조회
claude snapshot --list

# 수동 스냅샷 생성
claude snapshot --manual

# 특정 스냅샷 복구
claude snapshot --restore <snapshot-id>

# 설정 업데이트
claude snapshot --update '{"retentionDays": 30}'
```

### 옵션 설명

| 옵션 | 설명 | 예시 |
|------|------|------|
| `-s, --status` | 서비스 상태 표시 | `claude snapshot --status` |
| `-c, --config` | 현재 설정 표시 | `claude snapshot --config` |
| `-l, --list` | 스냅샷 목록 조회 | `claude snapshot --list` |
| `-m, --manual` | 수동 스냅샷 생성 | `claude snapshot --manual` |
| `-r, --restore <id>` | 스냅샷 복구 | `claude snapshot --restore abc123` |
| `-u, --update <json>` | 설정 업데이트 | `claude snapshot --update '{"enabled": true}'` |

## 🌐 REST API

### 엔드포인트

#### 상태 확인
```http
GET /api/snapshots/status
```

#### 설정 조회
```http
GET /api/snapshots/config
```

#### 스냅샷 목록
```http
GET /api/snapshots?limit=50&offset=0
```

#### 특정 스냅샷 조회
```http
GET /api/snapshots/{id}
```

#### 수동 스냅샷 생성
```http
POST /api/snapshots/create
Content-Type: application/json

{
  "manual": true
}
```

#### 설정 업데이트
```http
POST /api/snapshots/config/update
Content-Type: application/json

{
  "retentionDays": 60,
  "compression": false
}
```

#### 헬스 체크
```http
GET /api/snapshots/health/check
```

### 응답 형식

```json
{
  "success": true,
  "data": {
    // 실제 데이터
  },
  "timestamp": "2025-08-22T15:30:00.000Z"
}
```

## 📊 스냅샷 데이터 구조

### 메타데이터

```json
{
  "id": "uuid-string",
  "timestamp": "2025-08-22T15:30:00.000Z",
  "version": "1.0.0",
  "dataTypes": [
    {
      "type": "policy_audit",
      "enabled": true
    }
  ],
  "recordCount": 150,
  "fileSize": 1024,
  "checksum": "sha256-hash",
  "compression": true,
  "storageType": "file",
  "storagePath": "./data/snapshots"
}
```

### 데이터 타입

#### 정책 감사 로그 (policy_audit)
- 정책 위반 기록
- 승인 요청/처리 이력
- 정책 변경 이력

#### 워크플로우 이력 (workflow_history)
- 실행 상태 변경
- 단계별 진행 상황
- 에러 및 복구 정보

#### 시스템 메트릭 (system_metrics)
- 메모리 사용량
- CPU 사용량
- 업타임 정보
- Node.js 버전

#### 사용자 활동 (user_activity)
- 로그인/로그아웃
- API 호출 이력
- 권한 변경 이력

## 🔧 고급 설정

### 스케줄 설정

cron-like 스케줄 형식을 지원합니다:

```bash
# 형식: 분 시 일 월 요일
SNAPSHOT_SCHEDULE=0 2 * * *     # 매일 오전 2시
SNAPSHOT_SCHEDULE=0 */6 * * *   # 6시간마다
SNAPSHOT_SCHEDULE=0 2 * * 1     # 매주 월요일 오전 2시
SNAPSHOT_SCHEDULE=0 2 1 * *     # 매월 1일 오전 2시
```

### 압축 설정

압축을 활성화하면 저장 공간을 절약할 수 있습니다:

```bash
SNAPSHOT_COMPRESSION=true
```

### 보존 정책

```bash
# 보존 기간 설정
SNAPSHOT_RETENTION_DAYS=90

# 최대 스냅샷 수 제한
SNAPSHOT_MAX_COUNT=100
```

## 🚨 주의사항

### 성능 고려사항

- **대용량 데이터**: 대량의 데이터가 있는 경우 스냅샷 생성 시간이 오래 걸릴 수 있습니다
- **디스크 공간**: 스냅샷 파일들이 디스크 공간을 차지하므로 충분한 여유 공간을 확보하세요
- **메모리 사용량**: 스냅샷 생성 시 메모리 사용량이 일시적으로 증가할 수 있습니다

### 보안 고려사항

- **접근 권한**: 스냅샷 파일에 대한 적절한 파일 권한을 설정하세요
- **네트워크 보안**: 프로덕션 환경에서는 스냅샷 API에 대한 접근을 제한하세요
- **데이터 민감성**: 민감한 데이터가 포함된 스냅샷은 암호화를 고려하세요

## 🐛 문제 해결

### 일반적인 문제

#### 스냅샷이 생성되지 않음
```bash
# 서비스 상태 확인
claude snapshot --status

# 설정 확인
claude snapshot --config

# 로그 확인
claude logs --tail
```

#### 저장 공간 부족
```bash
# 오래된 스냅샷 정리
# 자동으로 정리되지만, 수동으로도 가능
rm -rf ./data/snapshots/snapshot_old_*

# 보존 기간 줄이기
claude snapshot --update '{"retentionDays": 30}'
```

#### 스케줄 문제
```bash
# 현재 스케줄 확인
claude snapshot --config

# 스케줄 수정
claude snapshot --update '{"schedule": "0 3 * * *"}'
```

### 로그 분석

```bash
# 스냅샷 관련 로그 필터링
claude logs --tail | grep -i snapshot

# 에러 로그 확인
claude logs --tail | grep -i error
```

## 📈 모니터링

### 메트릭 확인

```bash
# 헬스 체크
curl http://localhost:5849/api/snapshots/health/check

# 상태 확인
curl http://localhost:5849/api/snapshots/status
```

### 대시보드 연동

웹 대시보드에서 스냅샷 상태를 실시간으로 모니터링할 수 있습니다:

```
http://localhost:5849/dashboard
```

## 🔮 향후 계획

- **SQLite 지원**: 파일 기반 저장 외에 SQLite 데이터베이스 지원
- **압축 알고리즘**: 다양한 압축 알고리즘 지원 (gzip, lz4 등)
- **암호화**: 민감한 데이터를 위한 암호화 지원
- **클라우드 저장**: AWS S3, Google Cloud Storage 등 클라우드 저장소 지원
- **백업 및 복제**: 자동 백업 및 복제 기능

## 📚 관련 문서

- [CLI 사용 가이드](./cli-usage-guide.md)
- [정책 엔진 가이드](../policy/policy-guide.md)
- [워크플로우 실행 가이드](../workflow/workflow-guide.md)
- [API 문서](../api/api-reference.md)

## 🆘 지원

문제가 발생하거나 추가 도움이 필요한 경우:

1. **로그 확인**: `claude logs --tail`
2. **상태 확인**: `claude snapshot --status`
3. **설정 검증**: `claude snapshot --config`
4. **GitHub 이슈**: 프로젝트 저장소에 이슈 등록
