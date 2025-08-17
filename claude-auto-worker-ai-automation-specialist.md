# 🤖 AI Automation Specialist Agent - claude-auto-worker

## 🎯 역할 및 책임

### 주요 책임
- **Claude API 통합** 및 최적화
- **AI 워크플로우** 설계 및 구현
- **프롬프트 엔지니어링** 및 최적화
- **AI 응답 처리** 및 검증
- **AI 모델 성능** 모니터링 및 개선

### 전문 영역
- Claude API 및 Anthropic 기술
- 프롬프트 엔지니어링 및 최적화
- AI 워크플로우 자동화
- AI 응답 품질 관리
- AI 보안 및 윤리

---

## 🧠 Claude API 통합

### API 클라이언트 구현
```typescript
export class ClaudeAPIClient {
  private apiKey: string
  private baseURL: string
  private maxRetries: number
  
  constructor(apiKey: string, maxRetries: number = 3) {
    this.apiKey = apiKey
    this.baseURL = 'https://api.anthropic.com/v1'
    this.maxRetries = maxRetries
  }
  
  async generateCode(prompt: string, context?: string): Promise<string> {
    const messages = [
      {
        role: 'user',
        content: this.buildPrompt(prompt, context)
      }
    ]
    
    try {
      const response = await this.makeRequest('/messages', {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages,
        temperature: 0.1,
        system: this.getSystemPrompt()
      })
      
      return response.content[0].text
    } catch (error) {
      throw new ClaudeAPIError('Failed to generate code', error)
    }
  }
  
  private buildPrompt(prompt: string, context?: string): string {
    if (context) {
      return `Context:\n${context}\n\nRequest:\n${prompt}`
    }
    return prompt
  }
  
  private getSystemPrompt(): string {
    return `You are an expert software developer. 
    Generate clean, efficient, and well-documented code.
    Always follow best practices and coding standards.
    Provide explanations for complex logic when necessary.`
  }
  
  private async makeRequest(endpoint: string, data: any): Promise<any> {
    let lastError: Error
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(data)
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        return await response.json()
      } catch (error) {
        lastError = error as Error
        
        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError!
  }
}
```

### Usage Limit 관리
```typescript
export class UsageLimitManager {
  private requestCount: number = 0
  private resetTime: number
  private maxRequestsPerMinute: number = 50
  
  constructor() {
    this.resetTime = Date.now() + 60000 // 1 minute
  }
  
  async checkLimit(): Promise<boolean> {
    const now = Date.now()
    
    if (now > this.resetTime) {
      this.requestCount = 0
      this.resetTime = now + 60000
    }
    
    if (this.requestCount >= this.maxRequestsPerMinute) {
      const waitTime = this.resetTime - now
      await new Promise(resolve => setTimeout(resolve, waitTime))
      this.requestCount = 0
      this.resetTime = Date.now() + 60000
      return false
    }
    
    this.requestCount++
    return true
  }
  
  async executeWithLimit<T>(operation: () => Promise<T>): Promise<T> {
    await this.checkLimit()
    return operation()
  }
}
```

---

## 🔄 AI 워크플로우 설계

### 워크플로우 단계 정의
```typescript
export interface AIWorkflowStage {
  id: string
  name: string
  type: 'prompt' | 'validation' | 'execution' | 'review'
  prompt?: string
  validationRules?: ValidationRule[]
  executionScript?: string
  reviewCriteria?: ReviewCriteria[]
}

export class AIWorkflowEngine {
  constructor(
    private claudeClient: ClaudeAPIClient,
    private validator: AIResponseValidator,
    private executor: CodeExecutor
  ) {}
  
  async executeWorkflow(workflow: AIWorkflow): Promise<WorkflowResult> {
    const result: WorkflowResult = {
      stages: [],
      finalOutput: null,
      errors: [],
      metadata: {}
    }
    
    for (const stage of workflow.stages) {
      try {
        const stageResult = await this.executeStage(stage, result)
        result.stages.push(stageResult)
        
        if (stageResult.status === 'failed') {
          result.errors.push(new Error(`Stage ${stage.name} failed`))
          break
        }
      } catch (error) {
        result.errors.push(error as Error)
        break
      }
    }
    
    return result
  }
  
  private async executeStage(stage: AIWorkflowStage, context: WorkflowResult): Promise<StageResult> {
    switch (stage.type) {
      case 'prompt':
        return await this.executePromptStage(stage, context)
      case 'validation':
        return await this.executeValidationStage(stage, context)
      case 'execution':
        return await this.executeExecutionStage(stage, context)
      case 'review':
        return await this.executeReviewStage(stage, context)
      default:
        throw new Error(`Unknown stage type: ${stage.type}`)
    }
  }
  
  private async executePromptStage(stage: AIWorkflowStage, context: WorkflowResult): Promise<StageResult> {
    const prompt = this.buildContextualPrompt(stage.prompt!, context)
    const response = await this.claudeClient.generateCode(prompt)
    
    return {
      id: stage.id,
      name: stage.name,
      type: stage.type,
      status: 'completed',
      output: response,
      metadata: { prompt, response }
    }
  }
}
```

---

## 📝 프롬프트 엔지니어링

### 프롬프트 템플릿 시스템
```typescript
export class PromptTemplateEngine {
  private templates: Map<string, PromptTemplate> = new Map()
  
  registerTemplate(name: string, template: PromptTemplate): void {
    this.templates.set(name, template)
  }
  
  renderTemplate(name: string, variables: Record<string, any>): string {
    const template = this.templates.get(name)
    if (!template) {
      throw new Error(`Template not found: ${name}`)
    }
    
    return template.render(variables)
  }
  
  // 코드 리팩토링 프롬프트
  static createRefactorPrompt(): PromptTemplate {
    return new PromptTemplate(`
You are an expert software developer tasked with refactoring code.

Context:
- Original code: {{originalCode}}
- Refactoring goals: {{goals}}
- Target language: {{language}}
- Performance requirements: {{performanceRequirements}}

Requirements:
1. Maintain the same functionality
2. Improve code readability and maintainability
3. Follow {{language}} best practices
4. Add appropriate comments and documentation
5. Ensure performance meets requirements

Please provide:
1. Refactored code
2. Explanation of changes made
3. Performance improvements (if any)
4. Testing recommendations
`)
  }
  
  // 테스트 생성 프롬프트
  static createTestGenerationPrompt(): PromptTemplate {
    return new PromptTemplate(`
You are an expert software tester. Generate comprehensive tests for the following code:

Code to test:
{{code}}

Requirements:
1. Generate unit tests covering all functions/methods
2. Include edge cases and error scenarios
3. Use {{testingFramework}} testing framework
4. Follow testing best practices
5. Ensure high test coverage

Please provide:
1. Complete test suite
2. Test data and fixtures
3. Mocking strategies (if needed)
4. Coverage analysis
`)
  }
}

export class PromptTemplate {
  constructor(private template: string) {}
  
  render(variables: Record<string, any>): string {
    let result = this.template
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`
      result = result.replace(new RegExp(placeholder, 'g'), String(value))
    }
    
    return result
  }
}
```

---

## ✅ AI 응답 검증

### 응답 품질 검증
```typescript
export class AIResponseValidator {
  private validators: ResponseValidator[] = []
  
  addValidator(validator: ResponseValidator): void {
    this.validators.push(validator)
  }
  
  async validateResponse(response: string, context: ValidationContext): Promise<ValidationResult> {
    const results: ValidationResult[] = []
    
    for (const validator of this.validators) {
      try {
        const result = await validator.validate(response, context)
        results.push(result)
      } catch (error) {
        results.push({
          isValid: false,
          errors: [error.message],
          warnings: []
        })
      }
    }
    
    return this.aggregateResults(results)
  }
  
  private aggregateResults(results: ValidationResult[]): ValidationResult {
    const allErrors = results.flatMap(r => r.errors)
    const allWarnings = results.flatMap(r => r.warnings)
    const isValid = results.every(r => r.isValid)
    
    return {
      isValid,
      errors: allErrors,
      warnings: allWarnings
    }
  }
}

// 코드 품질 검증기
export class CodeQualityValidator implements ResponseValidator {
  async validate(response: string, context: ValidationContext): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    
    // 코드 구문 검증
    if (!this.isValidSyntax(response, context.language)) {
      errors.push('Invalid code syntax')
    }
    
    // 보안 취약점 검사
    const securityIssues = this.checkSecurityVulnerabilities(response)
    if (securityIssues.length > 0) {
      errors.push(...securityIssues)
    }
    
    // 코드 복잡도 검사
    const complexity = this.calculateComplexity(response)
    if (complexity > 10) {
      warnings.push(`High cyclomatic complexity: ${complexity}`)
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  private isValidSyntax(code: string, language: string): boolean {
    // 언어별 구문 검증 로직
    try {
      switch (language) {
        case 'typescript':
        case 'javascript':
          new Function(code)
          return true
        case 'python':
          // Python 구문 검증
          return true
        default:
          return true
      }
    } catch {
      return false
    }
  }
  
  private checkSecurityVulnerabilities(code: string): string[] {
    const vulnerabilities: string[] = []
    
    // SQL Injection 검사
    if (code.includes('eval(') || code.includes('Function(')) {
      vulnerabilities.push('Potential code injection vulnerability')
    }
    
    // 하드코딩된 비밀번호 검사
    if (code.includes('password') && code.includes('"123456"')) {
      vulnerabilities.push('Hardcoded password detected')
    }
    
    return vulnerabilities
  }
  
  private calculateComplexity(code: string): number {
    // 간단한 복잡도 계산 (실제로는 더 정교한 알고리즘 사용)
    const complexityKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch']
    return complexityKeywords.reduce((count, keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g')
      const matches = code.match(regex)
      return count + (matches ? matches.length : 0)
    }, 0)
  }
}
```

---

## 📊 AI 성능 모니터링

### 성능 메트릭 수집
```typescript
export class AIPerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map()
  
  recordMetric(name: string, value: number, metadata?: Record<string, any>): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    this.metrics.get(name)!.push({
      timestamp: Date.now(),
      value,
      metadata
    })
  }
  
  getMetrics(name: string, timeRange?: TimeRange): PerformanceMetric[] {
    const metrics = this.metrics.get(name) || []
    
    if (timeRange) {
      return metrics.filter(m => 
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      )
    }
    
    return metrics
  }
  
  getAverageResponseTime(timeRange?: TimeRange): number {
    const responseTimes = this.getMetrics('response_time', timeRange)
    if (responseTimes.length === 0) return 0
    
    const sum = responseTimes.reduce((acc, m) => acc + m.value, 0)
    return sum / responseTimes.length
  }
  
  getSuccessRate(timeRange?: TimeRange): number {
    const totalRequests = this.getMetrics('total_requests', timeRange)
    const successfulRequests = this.getMetrics('successful_requests', timeRange)
    
    if (totalRequests.length === 0) return 0
    
    const total = totalRequests[totalRequests.length - 1]?.value || 0
    const successful = successfulRequests[successfulRequests.length - 1]?.value || 0
    
    return total > 0 ? (successful / total) * 100 : 0
  }
  
  generateReport(timeRange?: TimeRange): PerformanceReport {
    return {
      averageResponseTime: this.getAverageResponseTime(timeRange),
      successRate: this.getSuccessRate(timeRange),
      totalRequests: this.getMetrics('total_requests', timeRange).pop()?.value || 0,
      errorRate: 100 - this.getSuccessRate(timeRange),
      timestamp: Date.now()
    }
  }
}

interface PerformanceMetric {
  timestamp: number
  value: number
  metadata?: Record<string, any>
}

interface PerformanceReport {
  averageResponseTime: number
  successRate: number
  totalRequests: number
  errorRate: number
  timestamp: number
}
```

---

## 🔒 AI 보안 및 윤리

### 보안 검증 및 필터링
```typescript
export class AISecurityValidator {
  private securityRules: SecurityRule[] = []
  
  addRule(rule: SecurityRule): void {
    this.securityRules.push(rule)
  }
  
  async validateRequest(prompt: string, context: SecurityContext): Promise<SecurityValidationResult> {
    const violations: SecurityViolation[] = []
    
    for (const rule of this.securityRules) {
      const ruleViolations = await rule.validate(prompt, context)
      violations.push(...ruleViolations)
    }
    
    return {
      isSecure: violations.length === 0,
      violations,
      riskLevel: this.calculateRiskLevel(violations)
    }
  }
  
  private calculateRiskLevel(violations: SecurityViolation[]): RiskLevel {
    const highRiskCount = violations.filter(v => v.severity === 'high').length
    const mediumRiskCount = violations.filter(v => v.severity === 'medium').length
    
    if (highRiskCount > 0) return 'high'
    if (mediumRiskCount > 2) return 'medium'
    return 'low'
  }
}

// 금지된 명령어 검사
export class ForbiddenCommandsRule implements SecurityRule {
  private forbiddenCommands = [
    'rm -rf /',
    'format c:',
    'del /s /q c:\\',
    'sudo',
    'chmod 777',
    'chown root'
  ]
  
  async validate(prompt: string, context: SecurityContext): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = []
    
    for (const command of this.forbiddenCommands) {
      if (prompt.toLowerCase().includes(command.toLowerCase())) {
        violations.push({
          type: 'forbidden_command',
          severity: 'high',
          description: `Forbidden command detected: ${command}`,
          suggestion: 'Use safe alternatives or remove dangerous commands'
        })
      }
    }
    
    return violations
  }
}

// 민감한 정보 검사
export class SensitiveDataRule implements SecurityRule {
  private sensitivePatterns = [
    /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
    /password\s*[:=]\s*['"][^'"]+['"]/gi,
    /secret\s*[:=]\s*['"][^'"]+['"]/gi,
    /token\s*[:=]\s*['"][^'"]+['"]/gi
  ]
  
  async validate(prompt: string, context: SecurityContext): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = []
    
    for (const pattern of this.sensitivePatterns) {
      if (pattern.test(prompt)) {
        violations.push({
          type: 'sensitive_data',
          severity: 'medium',
          description: 'Sensitive data detected in prompt',
          suggestion: 'Remove or mask sensitive information before processing'
        })
      }
    }
    
    return violations
  }
}
```

---

## 📋 체크리스트

### Claude API 통합
- [ ] API 클라이언트 구현
- [ ] Usage limit 관리
- [ ] 에러 처리 및 재시도
- [ ] 응답 캐싱

### AI 워크플로우
- [ ] 워크플로우 엔진 설계
- [ ] 단계별 실행 관리
- [ ] 에러 처리 및 복구
- [ ] 결과 검증

### 프롬프트 엔지니어링
- [ ] 프롬프트 템플릿 시스템
- [ ] 컨텍스트 기반 프롬프트
- [ ] 프롬프트 최적화
- [ ] A/B 테스트

### 응답 검증
- [ ] 품질 검증 시스템
- [ ] 보안 검증
- [ ] 코드 품질 검사
- [ ] 자동 수정 제안

### 성능 모니터링
- [ ] 메트릭 수집
- [ ] 성능 대시보드
- [ ] 알림 시스템
- [ ] 성능 최적화

### 보안 및 윤리
- [ ] 보안 규칙 정의
- [ ] 민감 정보 필터링
- [ ] 윤리 가이드라인
- [ ] 감사 로그

---

*마지막 업데이트: 2024년 1월 1일*
*에이전트 버전: 1.0.0*
*전문 영역: AI 자동화 및 Claude API*
