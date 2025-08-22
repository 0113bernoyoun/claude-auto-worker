### 🧾 Overall
- 상태: Ready to merge
- 범위: G1 즉효 안정화(보안 헤더, 전역 Validation, 전역 예외 처리, 대시보드 API 연결)
- 빌드/테스트: 모두 통과(12/12)

### 🌟 Highlights
- helmet 도입으로 기본 보안 헤더 강화
- `ValidationPipe` 전역 적용으로 입력 방어선 확보(whitelist/transform)
- 글로벌 예외 필터 추가로 에러 로깅/응답 일관성 개선
- 대시보드 API URL을 환경변수로 고정, `/api` 프리픽스 준수 확인

### 🧩 Changes Review
- `src/main.ts`
  - `helmet()` 적용, `ValidationPipe` 전역 등록, `GlobalHttpExceptionFilter` 등록
  - 글로벌 프리픽스 `api` 유지(문서 규칙 일치)
- `src/core/http-exception.filter.ts`
  - 모든 예외 @Catch() 처리, 상태코드/타임스탬프/요청 경로 포함 JSON 응답
  - 메타 정보 로깅으로 운영 관측성 향상
- `src/dashboard/.env.local`
  - `NEXT_PUBLIC_API_URL=http://localhost:5849/api` 명시

### 🧩 Minor suggestions (비차단)
1) 구성 일관성 제고 제안
- 현재 `main.ts`에서 프리픽스가 하드코딩(`'api'`)입니다. `ProjectConfigService`의 `apiPrefix`(`/api`)와 연동하면 환경별 구성 일관성이 향상됩니다.
  - 예: 구성 주입 또는 부트스트랩에서 서비스 인스턴스 생성 후 `app.setGlobalPrefix(projectConfig.apiPrefix)`

2) ValidationPipe 옵션 분기
- 운영 환경에서는 `forbidNonWhitelisted: true` 권장(화이트리스트 외 필드 차단). 개발/테스트는 현 설정 유지 가능.
  - 예: `process.env.NODE_ENV === 'production' ? true : false`

3) 예외 필터 로깅 개선(선택)
- 비-HTTP 예외 로깅 시 `String(exception)` 대신 stack 포함 로깅을 고려하면 트러블슈팅에 유리합니다.
  - 예: `this.logger.error(message, (exception as Error)?.stack)`

4) Helmet 세부 옵션 검토(선택)
- 대시보드가 동일 오리진이라면 기본값으로 충분하나, 추후 프록시/서브도메인 사용 시 `crossOriginResourcePolicy` 등 세부 옵션을 환경별 분기 고려.

### ✅ Checklist
- [x] 포트 5849 기본값 유지 및 `/api` 프리픽스 준수
- [x] 빌드/테스트 통과
- [x] 보안/안정화 기본선 강화(helmet, ValidationPipe, 예외 필터)
- [x] 대시보드 API 연결 확인
- [ ] (권장) `apiPrefix` 구성값 적용
- [ ] (권장) prod에서 `forbidNonWhitelisted` 활성화

### 🔗 References
- `docs/project/PRD.md`, `TRD.md`의 보안/안정성 지침과 부합
- `docs/project/DEVELOPMENT_TASKS.md`의 G1 항목과 직접 연관

---
요약: 변경은 간결하고 안전하며, 현재 기준 머지 가능 상태입니다. 제안사항은 모두 비차단이며 후속 PR에서 반영하면 좋겠습니다. 🚀
