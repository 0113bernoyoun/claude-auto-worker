# TASK-002: NestJS 프로젝트 생성 및 기본 설정 (완료)

## 작업 개요
- NestJS 기본 애플리케이션 구성 (main.ts, app.module.ts, app.controller.ts, app.service.ts)
- 글로벌 프리픽스 /api 적용 및 CORS 활성화
- 기본 포트 5849 설정 및 문서 반영

## 변경 사항 요약
- package.json 스크립트에 포트 반영
- nest-commander 의존성 정정 및 버전 고정
- E2E/유닛 테스트 추가 및 통과 확인

## 검증
- npm run build 성공
- npm test 및 E2E 테스트 통과
- curl http://localhost:5849/api/health 응답 확인

## 비고
- 수동 머지 후 문서화 절차에 따라 본 노트가 생성되었습니다.
