# 자동 실행(워크플로우) 테스트 시나리오

본 문서는 자동 실행(워크플로우) 기능의 정상/에러/관측/스트레스 경로를 포괄적으로 검증하기 위한 테스트 계획입니다.

## 🎯 목적
- 자동 실행 기능을 준비 → 실행 → 검증 → 장애/예외 → 회복까지 일관되게 확인
- 포트 충돌 방지: 3000/3001 미사용, 백엔드 5849 / 대시보드 5850 고정

## 🧰 사전 준비
- Node 18+ / npm
- 의존성 설치
```bash
npm install
```
- 포트 가용성 확인: 5849/5850 비어있는지 확인 (선택)
```bash
lsof -nP -iTCP:5849,5850 -sTCP:LISTEN
```
- 백엔드 기동 및 헬스 체크
```bash
npm run start:dev
curl http://localhost:5849/api/health
# {"status":"healthy","timestamp":"..."}
```
- (선택) 대시보드 기동 및 접속
```bash
npm run dashboard:dev
# 브라우저에서 http://localhost:5850
```

---

## ✅ 시나리오 A. Hello World 워크플로우 성공 실행 (정상 경로)
- 목적: 최소 happy-path 검증
- 입력: `docs/examples/basic/hello-world.yaml`
- 절차
```bash
# 백엔드 헬스
curl http://localhost:5849/api/health

# CLI 실행 (예시)
npx ts-node src/cli/main.ts run docs/examples/basic/hello-world.yaml

# 상태/로그 확인
npx ts-node src/cli/main.ts status
npx ts-node src/cli/main.ts logs --tail
```
- 기대 결과
  - 단계가 순차 진행되고 실패 없이 종료
  - `status`에 최근 실행 기록과 상태 표시
  - `logs`에 단계별 로그 시간순 출력

## 🧪 시나리오 B. 스키마 검증 실패 (입력 유효성)
- 목적: 스키마/필수 필드 검증 동작 확인
- 입력: 필수 필드 누락/오타가 있는 YAML (예: `stages` → `stage`)
- 절차
```bash
npx ts-node src/cli/main.ts run path/to/invalid-schema.yaml
npx ts-node src/cli/main.ts status
npx ts-node src/cli/main.ts logs --tail
```
- 기대 결과
  - 실행 시작 전 “스키마 검증 실패” 메시지
  - 어떤 필드가 잘못되었는지 원인 로그 포함

## 🧩 시나리오 C. DSL 파싱 오류 (문법/타입 에러)
- 목적: DSL 파서 레벨 에러 처리 확인
- 입력: YAML 문법 오류(들여쓰기/콜론/따옴표 누락 등)
- 절차
```bash
npx ts-node src/cli/main.ts run path/to/broken.yaml
npx ts-node src/cli/main.ts status
npx ts-node src/cli/main.ts logs --tail
```
- 기대 결과
  - 파서 단계에서 즉시 실패, 오류 라인/토큰 정보 로그 포함

## 💥 시나리오 D. 실행 단계 실패 (명령 실패)
- 목적: 런타임 실행 단계 실패 처리/전파 확인
- 입력: 정상 DSL에 실패 커맨드 삽입(예: `exit 1` 또는 존재하지 않는 명령)
- 절차
```bash
npx ts-node src/cli/main.ts run path/to/failing.yaml
npx ts-node src/cli/main.ts status
npx ts-node src/cli/main.ts logs --tail
```
- 기대 결과
  - 해당 단계에서 실패로 표시, 이후 단계 중단(또는 정책에 따라 스킵)
  - 표준출력/표준에러, 종료코드가 로그에 남음

## 📡 시나리오 E. 상태/로그 관측(관찰성)
- 목적: 실행 중/후 상태 조회 일관성 확인
- 절차
```bash
# 장시간 또는 스텝 많은 워크플로우 실행
npx ts-node src/cli/main.ts run path/to/long-running.yaml

# 병렬 관찰(예: 2초 간격 상태 확인)
npx ts-node src/cli/main.ts status
npx ts-node src/cli/main.ts logs --tail
```
- (선택) 대시보드에서 백엔드 Health 확인: http://localhost:5850
- 기대 결과
  - 상태 전이가 실시간 반영
  - 로그 tail에서 단계별 출력 순서대로 확인

## 🧷 시나리오 F. 포트/환경 충돌 회피 검증
- 목적: 3000/3001 점유 여부와 무관하게 동작 확인
- 절차
  - 3000/3001 임의 서버를 띄워도, 본 시스템은 5849/5850만 사용
- 기대 결과
  - 모든 기능이 5849/5850에서 문제 없이 동작

## 🔁 시나리오 G. 동시/연속 실행(기본 스트레스)
- 목적: 연속/다중 실행 안정성
- 절차
```bash
# 다양한 워크플로우를 연속 실행 (3~5회)
npx ts-node src/cli/main.ts run docs/examples/basic/hello-world.yaml
npx ts-node src/cli/main.ts run docs/examples/basic/file-processing.yaml
npx ts-node src/cli/main.ts run docs/examples/basic/dsl-test.yaml

npx ts-node src/cli/main.ts status
npx ts-node src/cli/main.ts logs --tail
```
- 기대 결과
  - 리소스 누수/좀비 프로세스 없음
  - 누적 실행 이력 조회 시 혼선 없음

## 🧪 시나리오 H. CLI 테스트 스위트(회귀)
- 목적: 기존 테스트 커버리지 확인
- 절차
```bash
npm run test:cli
# 또는 e2e가 준비된 경우
npm run test:e2e
```
- 기대 결과
  - 통과율 유지(문서 KPI 참고), 실패 시 원인/모듈 확인

## 🧭 시나리오 I. 오류 메시지/UX 검증
- 목적: 문제 인지/해결 가이드의 명확성
- 절차
  - B/C/D 실패 케이스에서 메시지/코드/가이드 확인
  - CLI 도움말(`--help`) 및 옵션 설명 가독성 확인
- 기대 결과
  - “무엇이/왜/어떻게 해결”이 메시지로 드러남
  - 도움말/옵션 설명이 명확함

## 🧹 시나리오 J. 정리/회복
- 목적: 테스트 후 환경 원복
- 절차
```bash
# macOS: 포트 점유 종료
lsof -ti tcp:5850,5849 | xargs -r kill -9
```
  - 임시 파일/로그 정리(필요 시)
- 기대 결과
  - 포트 점유 클린업, 다음 실행을 위한 깨끗한 상태 유지

---

## 🔂 권장 실행 순서(요약)
1) 사전 준비 → 백엔드 헬스 → (선택) 대시보드 확인
2) A(정상) → B/C/D(에러) → E(관측) → F(포트) → G(스트레스) → H(회귀) → I(UX) → J(정리)

## 🧩 비고
- API 기본 주소: `http://localhost:5849/api`
- 대시보드: `http://localhost:5850`
- 필요 시 위 시나리오를 CI(GitHub Actions)로 자동화 가능합니다.
