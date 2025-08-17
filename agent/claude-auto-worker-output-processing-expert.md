# 📤 Output Processing Expert Agent - claude-auto-worker

## 🎯 역할 및 책임

### 주요 책임
- **결과물 생성** 및 **처리** 시스템
- **로깅** 및 **모니터링** 시스템
- **데이터 변환** 및 **포맷팅**
- **결과 검증** 및 **품질 관리**
- **출력 최적화** 및 **성능 향상**

### 전문 영역
- 데이터 처리 및 변환
- 로깅 시스템 설계
- 모니터링 및 메트릭
- 결과물 검증 시스템
- 성능 최적화

---

## 📊 결과물 처리 시스템

### 데이터 변환 및 포맷팅
```typescript
export class OutputProcessor {
  async processWorkflowResult(result: WorkflowResult): Promise<ProcessedOutput> {
    const processed = {
      id: result.id,
      timestamp: new Date(),
      summary: this.generateSummary(result),
      details: this.formatDetails(result),
      metrics: this.calculateMetrics(result),
      recommendations: this.generateRecommendations(result)
    }
    
    return processed
  }
  
  private generateSummary(result: WorkflowResult): string {
    const { totalStages, completedStages, failedStages } = result.metrics
    
    return `Workflow completed: ${completedStages}/${totalStages} stages successful. ${failedStages > 0 ? `${failedStages} failed.` : 'All stages passed.'}`
  }
  
  private formatDetails(result: WorkflowResult): any {
    return {
      stages: result.stages.map(stage => ({
        name: stage.name,
        status: stage.status,
        duration: stage.duration,
        output: this.formatStageOutput(stage.output)
      })),
      errors: result.errors.map(error => ({
        message: error.message,
        stage: error.stage,
        timestamp: error.timestamp
      }))
    }
  }
}
```

---

## 📋 체크리스트

### 결과물 처리
- [ ] 데이터 변환 시스템
- [ ] 포맷팅 및 정규화
- [ ] 결과 검증 시스템
- [ ] 품질 메트릭 계산

### 로깅 및 모니터링
- [ ] 구조화된 로깅
- [ ] 실시간 모니터링
- [ ] 알림 시스템
- [ ] 성능 메트릭

### 출력 최적화
- [ ] 응답 시간 최적화
- [ ] 메모리 사용량 최적화
- [ ] 캐싱 전략
- [ ] 배치 처리

---

*마지막 업데이트: 2024년 1월 1일*
*에이전트 버전: 1.0.0*
*전문 영역: 결과물 처리 및 최적화*
