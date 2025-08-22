### Node.js 메모리 옵션 가이드 (G2 - TASK-104)

- 프로덕션 실행 시 권장 플래그 예시:

```bash
node --max-old-space-size=1536 dist/main.js
```

- PM2 사용 시 `max_memory_restart`와 함께 사용 권장:

```js
// tools/pm2-sample.config.cjs (발췌)
max_memory_restart: '1100M'
```

- 환경변수로 워치독 구성:

```bash
export MEM_WATCH_INTERVAL_MS=15000
export MEM_WATCH_WARN_MB=800
export MEM_WATCH_RESTART_MB=1024
export MEM_WATCH_ACTION=exit # log|exit
```

메모리 워치독은 `src/monitoring/memory-watchdog.service.ts`에 구현되어 있으며, RSS가 `MEM_WATCH_RESTART_MB` 이상일 때 `MEM_WATCH_ACTION=exit`이면 프로세스를 종료하여 PM2 등 Supervisor가 재기동하게 합니다.


