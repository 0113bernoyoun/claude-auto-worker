# TASK-105 완료 문서 — 메모리 헬스 체크 워치독 (G2)

## 요약
- `MemoryWatchdogService` 구현 및 `MonitoringModule`에 등록
- RSS 임계값 경고/자동 종료(옵션) 지원, ENV/설정 연동
- PR: #35, 완료일: 2025-08-22

## 상세 변경
- `src/monitoring/memory-watchdog.service.ts`: 주기적 `process.memoryUsage()` 체크, warn/restart 임계 로직
- `src/monitoring/monitoring.module.ts`: 프로바이더 등록
- `src/config/project-config.service.ts`: `monitoring.memoryWatchdog` 스키마/기본값/ENV 연동

## 설정 가이드
- ENV 예시
```bash
export MEM_WATCH_INTERVAL_MS=15000
export MEM_WATCH_WARN_MB=800
export MEM_WATCH_RESTART_MB=1024
export MEM_WATCH_ACTION=exit # log|exit
```
- 설정 파일(`claude-auto-worker.config.yaml`)
```yaml
monitoring:
  memoryWatchdog:
    enabled: true
    intervalMs: 15000
    warnRssMb: 800
    restartRssMb: 1024
    action: exit
```

## 테스트/검증
- 기존 빌드/유닛/E2E 테스트 통과 (watchdog 기본 동작은 로그 경고)

## 비고
- 프로세스 재기동은 PM2 등 supervisor에 위임 (TASK-104와 연계)
