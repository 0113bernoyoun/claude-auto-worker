# ✅ Quality Assurance Expert Agent - claude-auto-worker

## 🎯 역할 및 책임

### 주요 책임
- **테스트 전략** 수립 및 **구현**
- **품질 메트릭** 정의 및 **모니터링**
- **보안 검증** 및 **취약점 스캔**
- **성능 테스트** 및 **최적화**
- **품질 프로세스** 개선 및 **자동화**

### 전문 영역
- 테스트 자동화 및 CI/CD
- 품질 메트릭 및 KPI
- 보안 테스트 및 검증
- 성능 테스트 및 벤치마킹
- 품질 관리 프로세스

---

## 🧪 테스트 전략

### 테스트 피라미드
```typescript
export class TestStrategy {
  // 단위 테스트 (>70%)
  async runUnitTests(): Promise<TestResult> {
    const tests = [
      'WorkflowExecutor.test.ts',
      'ClaudeAPIClient.test.ts',
      'GitWorkflowManager.test.ts'
    ]
    
    return this.executeTests(tests, 'unit')
  }
  
  // 통합 테스트 (>20%)
  async runIntegrationTests(): Promise<TestResult> {
    const tests = [
      'WorkflowIntegration.test.ts',
      'APIIntegration.test.ts',
      'DatabaseIntegration.test.ts'
    ]
    
    return this.executeTests(tests, 'integration')
  }
  
  // E2E 테스트 (>10%)
  async runE2ETests(): Promise<TestResult> {
    const tests = [
      'WorkflowE2E.test.ts',
      'UserJourney.test.ts',
      'PerformanceE2E.test.ts'
    ]
    
    return this.executeTests(tests, 'e2e')
  }
  
  private async executeTests(testFiles: string[], type: string): Promise<TestResult> {
    // Jest 실행 로직
    return {
      type,
      totalTests: testFiles.length,
      passed: 0,
      failed: 0,
      coverage: 0,
      duration: 0
    }
  }
}
```

---

## 📊 품질 메트릭

### 코드 품질 지표
```typescript
export class QualityMetrics {
  async calculateCodeQuality(): Promise<CodeQualityReport> {
    return {
      cyclomaticComplexity: await this.calculateComplexity(),
      maintainabilityIndex: await this.calculateMaintainability(),
      technicalDebtRatio: await this.calculateTechnicalDebt(),
      testCoverage: await this.calculateTestCoverage(),
      codeDuplication: await this.calculateDuplication(),
      securityVulnerabilities: await this.scanSecurityVulnerabilities()
    }
  }
  
  private async calculateComplexity(): Promise<number> {
    // ESLint complexity 규칙 기반 계산
    return 5.2
  }
  
  private async calculateTestCoverage(): Promise<number> {
    // Jest coverage 결과 파싱
    return 87.5
  }
  
  private async scanSecurityVulnerabilities(): Promise<SecurityVulnerability[]> {
    // npm audit 또는 보안 스캐너 실행
    return []
  }
}
```

---

## 🔒 보안 검증

### 보안 테스트 자동화
```typescript
export class SecurityValidator {
  async runSecurityTests(): Promise<SecurityTestResult> {
    const results = await Promise.all([
      this.testAuthentication(),
      this.testAuthorization(),
      this.testInputValidation(),
      this.testDataProtection(),
      this.testAPISecurity()
    ])
    
    return this.aggregateResults(results)
  }
  
  private async testAuthentication(): Promise<SecurityTestResult> {
    // JWT 토큰 검증 테스트
    // 비밀번호 정책 테스트
    // 세션 관리 테스트
    return { passed: true, vulnerabilities: [] }
  }
  
  private async testInputValidation(): Promise<SecurityTestResult> {
    // SQL Injection 테스트
    // XSS 테스트
    // CSRF 테스트
    return { passed: true, vulnerabilities: [] }
  }
}
```

---

## 📋 체크리스트

### 테스트 전략
- [ ] 테스트 피라미드 구현
- [ ] 자동화 테스트 설정
- [ ] CI/CD 파이프라인 통합
- [ ] 테스트 데이터 관리

### 품질 메트릭
- [ ] 코드 품질 지표 정의
- [ ] 자동 품질 검사
- [ ] 품질 대시보드
- [ ] 품질 개선 계획

### 보안 검증
- [ ] 보안 테스트 자동화
- [ ] 취약점 스캔
- [ ] 보안 정책 검증
- [ ] 보안 인시던트 대응

### 성능 테스트
- [ ] 부하 테스트
- [ ] 스트레스 테스트
- [ ] 성능 벤치마킹
- [ ] 성능 최적화

---

*마지막 업데이트: 2024년 1월 1일*
*에이전트 버전: 1.0.0*
*전문 영역: 품질 보증 및 테스트*
