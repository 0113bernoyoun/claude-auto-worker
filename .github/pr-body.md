### ✨ What
- 정책 엔진 그룹 완성: Policy Engine/Management/Validation 서비스 및 REST API 제공 (TASK-032, TASK-033, TASK-034)
- 평가기 구현: command_filter, path_restriction, sensitive_data
- 사용자 정의 규칙(custom): 조건 충족 시 액션 경로 통해 경고/차단 처리
- 안전장치: 액션 미정의 규칙 경고, 에러 핸들링 보강
- 민감데이터 탐지 패턴 확장, warn 액션은 경고로만 집계되어 실행 허용
- 단위 테스트 추가/보강: 정책 관련 테스트 전체 통과(55/55)

### 🧭 Why
- PRD/TRD의 정책 기반 보안 실행 요구 충족
- 워크플로 실행 전/중 정책 검증 및 승인/거부 흐름 제공

### 🛠 Changes
- `src/policy/` 신규: `policy.types.ts`, `policy-engine.service.ts`, `policy-management.service.ts`, `policy-validation.service.ts`, `policy.controller.ts`, `policy.module.ts`
- 테스트: `*.spec.ts` 3종 추가, 전부 통과
- `src/app.module.ts`에 `PolicyModule` 통합

### 🖼 Logs/CLI
```bash
npm test -- --testPathPattern=policy
# Test Suites: 3 passed, 3 total
# Tests:       55 passed, 55 total
```

### ✅ How verified
- Jest 단위 테스트 전부 그린
- 경계 케이스: 경로제한, 민감데이터, 위험명령, custom warn 동작 확인

### 🎯 Impact/Risks
- 런타임 정책 평가 경로 추가: 성능 영향은 경미(캐싱 여지 있음)
- default policy 존재: 테스트 격리 완료

### 🚀 Rollout/Rollback
- 배포: 일반 릴리즈
- 롤백: 모듈 비활성 또는 이전 태그 체크아웃

### ☑️ Checklist
- [x] 빌드/테스트/린트 통과
- [x] 포트 5849 설정 유지
- [x] /api 프리픽스 준수
- [x] 문서 갱신은 머지 후 수행(.rules 참조)

### 🔗 References
- TASK-032, TASK-033, TASK-034
- docs/project/PRD.md, TRD.md, DEVELOPMENT_TASKS.md
