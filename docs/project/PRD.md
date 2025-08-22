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
  - **장기:** VS Code Extension + Web UI에서 본격 지원

### 4.6 VS Code Extension 통합
- **명령 팔레트**: 워크플로우 실행, 대시보드 열기, 정책 설정 등
- **사이드바 패널**: 워크플로우 상태, 실행 이력, 큐 관리
- **상태바**: 현재 실행 상태 (Idle/Running/Limit) 실시간 표시
- **실시간 모니터링**: WebSocket을 통한 상태 업데이트 및 로그 스트리밍
- **통합 워크플로우**: VS Code에서 직접 DSL 파일 편집 및 실행
- **Git 연동**: 브랜치 상태, 커밋 이력, PR 생성 링크 등 표시

---

## 5. 비기능 요구사항 (Non-Functional Requirements)
- 안정성: 장시간 실행 시 메모리 누수 최소화, 자동 자원 정리.  
- 보안: 환경변수 기반 API Key 관리, 웹 UI 비밀번호/토큰 보호, VS Code Extension 보안 모범 사례 적용.
- 호환성: Linux/WSL/macOS/Windows 지원. Dockerized 배포 옵션.  
- 확장성: 플러그인 SDK 제공.  
- 성능: VS Code Extension UI 응답성 보장, 대용량 로그 처리 최적화.
- 사용성: VS Code 재시작 시 상태 복구, 에러 복구 및 재연결 로직.

---

## 6. 타겟 사용자 (Target Users)
- 개인 개발자 (야간 자동화, 반복 리팩터링, 문서화 자동화).  
- 소규모 팀 (Git/테스트 통합으로 품질 관리).  
- VS Code 사용자 (IDE 통합을 통한 편리한 워크플로우 관리).
- 이후 확장: 오픈소스 커뮤니티, 스타트업 팀.  

---

## 7. 경쟁/차별화 요소

| 항목               | 기존 도구들 | claude-auto-worker |
|--------------------|-------------|-------------------|
| IDE 종속성         | 특정 IDE 한정 | 독립 실행 + IDE 통합 |
| 워크플로우 정의    | 수동 입력    | DSL 기반 자동화 |
| Git/테스트 통합    | 제한적      | 완전 통합 |
| 정책 필터링        | 없음        | O |
| 컨텍스트 요약 관리 | 없음        | O |
| 플러그인 아키텍처  | 없음        | O |
| UI                 | 단순 리스트  | CLI + Dashboard + VS Code Extension |
| 확장성             | 제한적      | 플러그인 + REST API + WebSocket |

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
- VS Code Extension 개발 및 배포.
- 큐잉/워크플로우 시각화 고도화.
- Kanban UI 고도화.  
- CI/CD 통합 API.  
- 조직 정책/시크릿 스캐너 내장.
- VS Code Extension 마켓플레이스 배포.
- 다국어 지원 및 접근성 개선.
