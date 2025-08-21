# 📄 PRD: 차세대 Claude Code 자동화 도구 (개정판)

## 1. 개요 (Overview)
- **제품명 (가칭):** claude-auto-worker  
- **목표:**  
  개인 개발자가 Claude Code를 더 안전하고, 유연하고, 확장 가능하게 자동화할 수 있는 오픈소스 도구 제공.  
  VS Code Autopilot의 한계를 보완하고, 에디터 종속성 없이 동작하며, 워크플로우 DSL·정책 기반 필터링·테스트/Git 연동 등 **실질적 개발 생산성** 기능을 제공.

---

## 2. 문제 정의 (Problem Statement)
기존 Claude Autopilot의 한계:
- VS Code 확장에 종속 → CLI/API 기반 자동화 부족.  
- 작업 큐 관리 단순 → DSL, 시각화 부족.  
- Git/테스트/CI 통합 없음.  
- 장시간 실행 안정성/로깅 부족.  
- 정책 기반 안전장치 미지원.  
- 플러그인 아키텍처 부재.  

이로 인해 개인 개발자는 야간·장시간 작업 자동화는 가능하지만, **안전성·투명성·품질 보증이 부족**한 상태.

---

## 3. 제품 목표 (Goals)
1. **안전한 자동화**  
   - Git 브랜치 격리 커밋, 테스트 실행/검증, 정책 필터링 제공.
2. **맥락 & 사용성 보완**  
   - DSL 기반 워크플로 정의, 자동 컨텍스트 요약·압축, 작업별 상세 로깅.
3. **확장성 확보**  
   - 플러그인 구조, CLI/API 모드, 외부 툴 연동.
4. **개발자 친화 UI/UX**  
   - CLI 우선 → Web Dashboard → VS Code Extension 단계적 확장.  

---

## 4. 주요 기능 (Key Features)

### 4.1 자동화 실행
- 작업 큐 관리 (기본).  
- Usage limit 감지 → 대기/재개.  
- Adaptive polling (ETA 기반 재시도).  

### 4.2 워크플로 정의 (DSL)
- YAML/JSON 기반 DSL 지원:
  ```yaml
  stages:
    - name: refactor
      prompt: refactor.md
      apply_changes: true
      branch: nightly-refactor
    - name: test
      run: ["pytest -q", "eslint ."]
    - name: docs
      prompt: "Update docs"
  ```

### 4.3 품질 보증 & 안전장치
- Git 브랜치 격리, 자동 커밋.  
- 테스트 자동 실행 → 실패 시 rollback/보류.  
- 정책 필터 (금지 명령, 경로 제한, 변경 라인수 제한).  
- 컨텍스트 자동 요약/압축 관리.  

### 4.4 확장성
- 플러그인 구조: 알림(Slack, Email), 정적분석, 배포전략 등.  
- CLI 모드 + REST API 지원 → CI/CD 파이프라인 통합.  

### 4.5 UI/UX 전략
- **📝 추천 전략 반영**
  - **MVP:** CLI + 간단한 웹 대시보드 (로그/상태 뷰어 정도)  
  - **로드맵 2단계:** 웹 터미널 에뮬레이터 (xterm.js 연동)  
  - **장기:** 브라우저 기반 풀 bash는 보안/인프라 과부하 → 필요 시 별도 프로젝트  

---

## 5. 비기능 요구사항 (Non-Functional Requirements)
- 안정성: 장시간 실행 시 메모리 누수 최소화, 자동 자원 정리.  
- 보안: 환경변수 기반 API Key 관리, 웹 UI 비밀번호/토큰 보호.  
- 호환성: Linux/WSL/macOS/Windows 지원. Dockerized 배포 옵션.  
- 확장성: 플러그인 SDK 제공.  

---

## 6. 타깃 사용자 (Target Users)
- 개인 개발자 (야간 자동화, 반복 리팩터링, 문서화 자동화).  
- 소규모 팀 (Git/테스트 통합으로 품질 관리).  
- 이후 확장: 오픈소스 커뮤니티, 스타트업 팀.  

---

## 7. 경쟁/차별화 요소

| 항목               | Claude Autopilot | claude-auto-worker |
|--------------------|------------------|-----------|
| IDE 종속성         | VS Code 한정     | 독립 실행, CLI/API |
| 워크플로우 정의       | 수동 큐 입력     | DSL 기반 자동화 |
| Git/테스트 통합     | 없음             | O |
| 정책 필터링        | 없음             | O |
| 컨텍스트 요약 관리 | 없음             | O |
| 플러그인 아키텍처  | 없음             | O |
| UI                 | 단순 리스트      | CLI + Dashboard → 확장 |

---

## 8. MVP 범위
- CLI 실행 + Usage limit 자동 감지/재개.  
- DSL 파서(YAML).  
- Git 브랜치 격리 커밋.  
- 테스트 자동 실행/로그 저장.  
- 간단한 웹 대시보드 (로그/상태 뷰어).  

---

## 9. 향후 로드맵
- 플러그인 시스템.  
- 컨텍스트 요약/압축 자동화.  
- 큐잉/워크플로 시각화: **VS Code Extension + Web UI에서 본격 지원**.  
- Kanban UI 고도화.  
- CI/CD 통합 API.  
- 조직 정책/시크릿 스캐너 내장.  
