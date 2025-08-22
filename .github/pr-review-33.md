### ✨ 요약(What)
- `TASK-109` 추가: Watchman recrawl 경고 재발 완화 태스크 정의
- `.watchmanconfig` 무시 경로 구성 및 운영 가이드(대규모 I/O, 절전/디스크) 포함

### 🧭 배경/이유(Why)
- 로컬 개발 중 watchman이 디렉토리 변경 이벤트를 드롭하거나 대량 변경으로 recrawl 발생 → 개발 체감 성능 저하, 경고 노이즈 증가

### 🛠 변경사항(Changes)
- `docs/project/DEVELOPMENT_TASKS.md`: `TASK-109` 문구 추가

### ✅ 테스트(How verified)
- 코드 영향 없음(문서 변경). 기존 빌드/유닛/E2E 테스트 PASS 확인

### 🎯 영향도/리스크(Impact/Risk)
- 런타임 무영향. 문서 변경만 존재

### 🚀 롤아웃/롤백(Rollout/Rollback)
- 병합 후 팀에 `.watchmanconfig` 기본 제외 목록 및 운영 팁 공유
- 필요 시 문서 롤백 가능

### ☑️ 체크리스트(Checklist)
- [x] 문서 빌드/테스트 무영향 확인
- [x] 태스크 설명/완료기준 포함
- [ ] 머지 후 `.watchmanconfig` 템플릿 PR 생성

### 🔗 참고(References)
- Watchman recrawl: https://facebook.github.io/watchman/docs/troubleshooting.html#recrawl
