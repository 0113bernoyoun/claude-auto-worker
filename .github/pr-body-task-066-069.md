### feat(local-run): 로컬(비-Docker) 실행 환경 그룹 완성 (TASK-066, TASK-067, TASK-068, TASK-069)

#### 요약(What) ✨
- **비-Docker 로컬 실행 파이프라인**을 구축하고, **설정 폴백**과 **로컬 검증 플로우**를 제공합니다.
- 개발자가 즉시 `npm run start:dev`와 `claude-auto-worker` CLI를 로컬에서 실행/검증할 수 있습니다.

#### 배경/이유(Why) 🧭
- 프로토타입 개발 속도를 높이기 위해 Docker 없이도 빠르게 실행/검증할 수 있는 경로가 필요했습니다.
- 환경변수/포트 기본값(5849) 및 셋업/검증 스크립트가 요구사항(TASK-066~069)에 명시되어 있습니다.

#### 변경사항(Changes) 🛠️
- `package.json`
  - scripts 추가: `setup:local`, `verify:local`, `env:example`
- `tools/setup-local.sh`
  - Node/Git 존재 확인, 의존성 설치, 빌드, CLI 빌드, 가이드 출력
- `tools/check-local.mjs`
  - 빌드 → 유닛테스트 → 서버 헬스체크(`GET /api/health`) → CLI 드라이런 순서 자동화
  - 실패 시 문제해결 가이드 안내
- `tools/generate-env-example.mjs`
  - `.env.example` 생성 스크립트 (기본 포트 5849 포함)

#### 스크린샷/로그 🖼️
```
$ npm run verify:local
==> 🔎 Local verify: build → test → smoke
==> 🧱 Build
==> 🧪 Unit tests (pass)
==> 🚀 Smoke: start server on :5849 (background)
==> ✅ Health OK: http://localhost:5849/api/health
==> 🧪 Smoke: CLI run basic example (dry-run)
==> ✅ Local verify completed
```

#### 테스트(How verified) ✅
- 로컬에서 `npm run setup:local` 및 `npm run verify:local` 성공 확인
- 서버 헬스체크 및 CLI 드라이런(예제 `docs/examples/basic/hello-world.yaml`) 동작 확인

#### 영향도/리스크 🎯
- 런타임/성능 영향도 낮음 (Dev 스크립트 추가)
- `.env.example`는 스크립트로 생성(커밋 대상 아님)

#### 롤아웃/롤백 🚀
- 롤아웃: 단순 스크립트 추가, 바로 사용 가능
- 롤백: 해당 파일/스크립트 제거로 복원 가능

#### 체크리스트 ☑️
- [x] 포트 5849 기본값 준수
- [x] 비-Docker 경로 실행 가능
- [x] verify 스크립트로 자동 검증 가능
- [x] 문서 갱신은 머지 후 규칙에 따라 별도 PR 진행

#### 참고 링크 🔗
- docs/project/DEVELOPMENT_TASKS.md – 스프린트 1A 로컬 실행 그룹 (TASK-066~069)

---

Ready to merge (✅). 코드 영향도가 낮고, Dev/Local 경로 향상에 초점이 맞춰져 있습니다.

