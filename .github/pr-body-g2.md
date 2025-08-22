### ✨ 요약(What)
- 관측/자동회복 패키지(G2) 1차 반영: 메모리 워치독 + 재기동 가이드
- `MemoryWatchdogService` 추가 및 `MonitoringModule` 연결
- 설정 스키마 `monitoring.memoryWatchdog`/ENV 연동, pm2 샘플/Node 메모리 가이드 추가

### 🧭 배경/이유(Why)
- 장시간 실행 시 메모리 급증 상황 관측/경고 및(옵션) 안전 재기동을 통해 안정성 강화

### 🛠 변경사항(Changes)
- `src/monitoring/memory-watchdog.service.ts`
- `src/monitoring/monitoring.module.ts`
- `src/config/project-config.service.ts`
- `tools/pm2-sample.config.cjs`, `tools/node-memory-flags.md`

### ✅ 테스트(How verified)
- 로컬 빌드/유닛/E2E 테스트 PASS 확인

### 🎯 영향도/리스크(Impact/Risk)
- 런타임: 워치독 활성 시 로그 경고/프로세스 종료(옵션) 동작. 기본값은 안전(warn/log)

### 🚀 롤아웃/롤백(Rollout/Rollback)
- ENV로 단계적 적용, 임계/액션 조정 가능. 문제 시 서비스 비활성화(`enabled=false`)

### ☑️ 체크리스트(Checklist)
- [x] 코드/테스트 그린
- [x] 포트 5849 유지
- [x] 문서/README 변경은 머지 후 PR로 별도 반영 규칙 준수

### 🔗 참고(References)
- Watchman recrawl 대응 TASK-109 별도 PR 병합 완료
