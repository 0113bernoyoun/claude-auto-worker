### 🧾 Overall
**Ready to merge** — 변경 범위가 테스트/경량 API/대시보드 보완으로 제한적이며, 전반적으로 안정적입니다. 유닛 테스트가 보강되었고, 대시보드-백엔드 연계도 자연스럽습니다.

### 🌟 Highlights
- **테스트 보강**: 워크플로우 실패 시 롤백 실행 케이스, 테스트 출력(PASS/Tests:) 캡처 케이스 추가로 핵심 시나리오 커버리지 향상.
- **관측성 개선**: `StatusController`, `LogsController` 추가로 웹 대시보드에서 로그/상태 조회 경로 확보.
- **대시보드 연동**: `NEXT_PUBLIC_API_URL`(기본 5849) 사용으로 환경과의 정합성 유지, `/log` 페이지 제공.

### 🧩 Changes reviewed
- `src/test/unit/executor.spec.ts`: +2 tests (rollback on failure, test output capture)
- `src/logs.controller.ts`: 최근 N 라인 JSONL 파싱/레벨 필터 제공
- `src/status.controller.ts`: runId 기준 상태 조회/최신 로그 기반 스냅샷 분석
- `src/app.module.ts`: 컨트롤러 등록
- `src/dashboard/app/layout.tsx`, `src/dashboard/app/log/page.tsx`: 최소 로그 뷰 UI

### 🧩 Minor/Improvement (제안)
1) LogsController 성능/안정성 ⏱️ (Minor)
   - 현재 `readFileSync`로 파일 전체를 읽은 뒤 slice 합니다. 대용량 로그에서 부담이 될 수 있으므로, **파일 끝에서 역방향으로 라인 수만 읽는 방식**(stream + seek)으로 개선 제안.
   - invalid JSON 라인 카운팅/스킵에 대한 지표(옵션)도 고려 가능. (CLI `enhanced-logs`와 일관성)

2) 파라미터 검증/DTO 적용 🧰 (Minor)
   - `lines`, `level`, `runId`에 대해 **ValidationPipe/DTO(Class-validator)** 적용 시 안전성/가독성 향상.
   - 예: `@Query('lines', ParseIntPipe)` + 상한 체크는 서비스로 이동.

3) 상태 분석의 최신 파일 해석 🔎 (Minor)
   - `deriveRunIdFromPathOrContent`는 `latest.log` 첫 라인 JSON 파싱 시 runId를 추출합니다. 간헐적 partial write 상황에 대한 **재시도** 또는 **최초 유효 라인 탐색 범위 확장** 고려.

4) 모듈 구성 🧱 (Nit)
   - `logs/status` 컨트롤러를 전용 `MonitoringModule` 같은 경량 모듈로 묶으면 책임 경계가 선명해집니다. (현 구조도 기능상 문제는 없음)

5) 대시보드 로그 UX (Nit)
   - 간단한 **레벨 칩 필터**/검색박스, 자동 새로고침(toggle) 정도만 추가되어도 실용성이 커집니다.

### 🧪 Tests
- 로컬 `npm test` 기준 9/9 통과 확인.
- 제안: 컨트롤러 e2e 간단 케이스(`/api/logs`, `/api/status`)를 다음 PR에서 보강하면 신뢰성이 더 올라갑니다.

### 📝 Action items
- [ ] (Minor) LogsController: 큰 파일 tail-optimized 읽기 방식으로 개선
- [ ] (Minor) DTO/ValidationPipe 도입(특히 `lines`, `level`, `runId`)
- [ ] (Nit) 컨트롤러 전용 모듈 분리 검토
- [ ] (Nit) 대시보드 로그 페이지 필터/새로고침 옵션 추가 검토

---
요청 주시면 위 액션 아이템을 다음 PR로 분리해 진행하겠습니다. 현재 변경은 **머지에 충분**합니다. 👍
