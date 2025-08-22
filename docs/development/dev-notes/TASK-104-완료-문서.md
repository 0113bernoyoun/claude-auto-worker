# TASK-104 완료 문서 — 프로세스 가드(pm2/Node 옵션) 가이드 및 샘플 (G2)

## 요약
- pm2 샘플 설정과 Node 메모리 옵션 가이드 추가
- 워치독과 연계한 안전 재기동 전략 제공
- PR: #35, 완료일: 2025-08-22

## 상세 변경
- `tools/pm2-sample.config.cjs`: `max_memory_restart`, ENV 기반 워치독 설정 예시
- `tools/node-memory-flags.md`: `--max-old-space-size` 등 런타임 메모리 옵션 가이드

## 사용 가이드
- PM2 실행 예시
```bash
pm2 start tools/pm2-sample.config.cjs
```
- Node 메모리 플래그 예시
```bash
node --max-old-space-size=1536 dist/main.js
```

## 비고
- 프로세스 종료/재기동은 pm2 등 supervisor가 담당 (워치독과 조합 시 야간 안정성 강화)
