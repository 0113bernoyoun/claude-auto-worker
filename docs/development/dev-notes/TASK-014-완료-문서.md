# TASK-014 완료 문서

## ✨ 요약 (What)
- YAML/JSON 파서 기본 구조 구현 및 CLI 통합 완료
- CLI 테스트 전면 통과(45/45)로 안정성 확보
- `nest-commander` 모킹 개선 및 DI 전략 보강

## 🧭 배경/이유 (Why)
- 워크플로우 DSL의 입력 채널로 YAML/JSON 파서가 필요
- 테스트 환경에서 명령어 베이스클래스 및 옵션 데코레이터 동작이 런타임과 달라 불안정 → 모킹 정비 필요

## 🛠️ 상세 (Details)
- `src/parser/` 추가: `parser.module.ts`, `workflow.parser.service.ts`, `workflow.types.ts`
  - 확장자 기반 파싱 + 확장자 미지정시 YAML→JSON 폴백
  - 최소 shape 검증: `name`, `steps[*].id`, `steps[*].type`
- `RunCommand` 리팩터링
  - 프로덕션: DI 필수, 누락시 명시적 에러
  - 테스트: 안전한 폴백 인스턴스 허용
  - 인자 누락 시 usage 로그 추가
- `HelpCommand`
  - 테스트 환경에서만 프롤로그 로그 출력
- `tests/setup/cli.setup.ts`
  - `CommandRunner` 실제 베이스 클래스로 모킹
  - 옵션 데코레이터 메타데이터 보존
  - `path.isAbsolute` 모킹 추가

## ✅ 검증 (How verified)
```bash
npm test
npm run test:cli
```
- 결과: 모든 테스트 통과 (6/6, 45/45)

## 🎯 영향/리스크
- 런타임 기능 영향 낮음 (파서는 파일 존재시만 실제 파싱)
- 후속 TASK-015/018에서 스키마/테스트 확장 예정

## 📎 참고 링크
- PR #10: parser integration + CLI stabilize
