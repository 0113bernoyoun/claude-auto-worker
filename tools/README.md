# 🚀 Policy Performance Benchmark Tools

> TASK-093: 대량 정책 성능 벤치(간이) - 정책 시스템 성능 벤치마킹 도구

## 📋 개요

이 디렉토리는 claude-auto-worker의 정책 시스템 성능을 측정하고 벤치마킹하기 위한 도구들을 포함합니다.

## 🛠️ 사용 가능한 도구

### 1. 기본 성능 벤치마크
**파일**: `policy-performance-benchmark.js`
**목적**: 정책 시스템의 기본 성능 측정 및 확장성 테스트

**실행 방법**:
```bash
# 직접 실행
node policy-performance-benchmark.js

# 가비지 컬렉션 활성화하여 실행
node --expose-gc policy-performance-benchmark.js
```

**테스트 시나리오**:
- **Baseline**: 10 policies, 50 rules
- **Small**: 25 policies, 125 rules  
- **Medium**: 50 policies, 250 rules
- **Large**: 100 policies, 500 rules
- **XLarge**: 200 policies, 1000 rules

### 2. 통합 정책 엔진 벤치마크
**파일**: `policy-engine-benchmark.js`
**목적**: 실제 정책 엔진과 유사한 환경에서의 성능 측정

**실행 방법**:
```bash
node policy-engine-benchmark.js
```

**추가 기능**:
- 컨텍스트별 성능 테스트
- 다양한 워크플로우 시나리오
- 정책 평가 시뮬레이션

### 3. 통합 실행 스크립트
**파일**: `run-policy-benchmark.sh`
**목적**: 모든 벤치마크를 순차적으로 실행

**실행 방법**:
```bash
# 실행 권한 부여
chmod +x run-policy-benchmark.sh

# 실행
./run-policy-benchmark.sh
```

## 📊 결과 해석

### 성능 메트릭
- **Duration**: 정책 평가 소요 시간 (밀리초)
- **Throughput**: 초당 처리 가능한 정책 수
- **Memory Usage**: 메모리 사용량 변화
- **Scalability Factor**: 정책 수 증가에 따른 성능 변화율

### 기준선 (Baseline)
- **기본 벤치마크**: 10 policies, 50 rules → 5.42ms 평균
- **통합 벤치마크**: 10 policies, 50 rules → 2.77ms 평균

### 성능 회귀 감지
- **경고 임계값**: 1.5x 성능 저하
- **심각 임계값**: 2.0x 성능 저하

## 🔧 환경 설정

### Node.js 요구사항
- **버전**: 18.x 이상
- **메모리**: 최소 4GB RAM 권장
- **가비지 컬렉션**: `--expose-gc` 플래그 권장

### 환경변수
```bash
# 메모리 제한 설정
export NODE_OPTIONS="--max-old-space-size=4096 --expose-gc"

# 정책 디버그 모드 (선택사항)
export POLICY_DEBUG=1
```

## 📈 성능 최적화 팁

### 1. 정책 구조 최적화
- 복잡한 정규식 패턴 최소화
- 조건 평가 순서 최적화 (빠른 실패 우선)
- 불필요한 정책 비활성화

### 2. 캐싱 전략
- 정책 평가 결과 캐싱
- 조건 매칭 결과 캐싱
- TTL 기반 캐시 무효화

### 3. 병렬 처리
- 독립적인 정책 병렬 평가
- 워커 스레드 활용
- 비동기 정책 평가

## 🚨 주의사항

### 테스트 환경
- 프로덕션 환경에서 실행 금지
- 충분한 메모리 확보 필요
- 다른 프로세스와의 리소스 경합 고려

### 결과 해석
- 단일 실행 결과보다는 평균값 활용
- 환경별 차이 고려 (CPU, 메모리, OS)
- 정책 복잡도에 따른 성능 변화 분석

## 📝 리포트 형식

### 기본 리포트 (`policy-performance-report.json`)
```json
{
  "summary": {
    "totalTests": 5,
    "baseline": { ... },
    "timestamp": "2025-08-24T07:09:31.616Z"
  },
  "results": [ ... ],
  "analysis": {
    "performanceTrends": { ... },
    "regressionDetection": { ... }
  }
}
```

### 통합 리포트 (`policy-engine-benchmark-report.json`)
```json
{
  "summary": {
    "totalTests": 9,
    "baseline": { ... },
    "testContexts": [ ... ],
    "timestamp": "2025-08-24T07:12:46.551Z"
  },
  "results": [ ... ],
  "analysis": {
    "performanceTrends": { ... },
    "regressionDetection": { ... },
    "scalabilityAnalysis": { ... },
    "contextImpact": { ... }
  },
  "recommendations": [ ... ]
}
```

## 🔄 지속적 모니터링

### CI/CD 통합
```yaml
# GitHub Actions 예시
- name: Run Policy Performance Tests
  run: |
    cd tools
    node policy-performance-benchmark.js
    node policy-engine-benchmark.js
```

### 성능 트렌드 추적
- 정기적인 벤치마크 실행
- 성능 회귀 자동 감지
- 리포트 아카이빙 및 비교 분석

## 📚 추가 자료

- [TASK-093 상세 명세](../docs/project/DEVELOPMENT_TASKS.md)
- [정책 시스템 아키텍처](../src/policy/)
- [성능 최적화 가이드](../docs/development/)

---

## 🎯 다음 단계

1. **실제 정책 엔진과의 통합**: 현재는 시뮬레이션, 실제 PolicyEngineService 연동 필요
2. **실시간 모니터링**: 프로덕션 환경에서의 성능 지표 수집
3. **자동화된 성능 테스트**: CI/CD 파이프라인에 통합
4. **성능 대시보드**: 웹 대시보드에 성능 메트릭 표시

---

⭐ 이 도구가 도움이 되었다면 프로젝트에 스타를 눌러주세요!
