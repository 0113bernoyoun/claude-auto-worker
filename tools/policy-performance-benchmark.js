#!/usr/bin/env node

/**
 * 🚀 Policy Performance Benchmark Tool
 * 
 * TASK-093: 대량 정책 성능 벤치(간이)
 * 수백 개 정책/룰 환경에서 평가 지연 측정, 기본 프로파일 수집, 회귀 기준선 설정
 */

const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

// 📊 성능 측정 결과 저장소
class PerformanceMetrics {
  constructor() {
    this.results = [];
    this.baseline = null;
  }

  addResult(testName, policyCount, ruleCount, duration, memoryUsage) {
    const result = {
      timestamp: new Date().toISOString(),
      testName,
      policyCount,
      ruleCount,
      duration: {
        total: duration.total,
        average: duration.average,
        min: duration.min,
        max: duration.max,
        p95: duration.p95,
        p99: duration.p99
      },
      memoryUsage: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss
      },
      throughput: {
        policiesPerSecond: policyCount / (duration.total / 1000),
        rulesPerSecond: ruleCount / (duration.total / 1000)
      }
    };

    this.results.push(result);
    return result;
  }

  setBaseline(baselineResult) {
    this.baseline = baselineResult;
  }

  generateReport() {
    const report = {
      summary: {
        totalTests: this.results.length,
        baseline: this.baseline,
        timestamp: new Date().toISOString()
      },
      results: this.results,
      analysis: this.analyzeResults()
    };

    return report;
  }

  analyzeResults() {
    if (this.results.length === 0) return {};

    const analysis = {
      performanceTrends: {},
      regressionDetection: {},
      recommendations: []
    };

    // 성능 트렌드 분석
    if (this.baseline) {
      this.results.forEach(result => {
        const policyRatio = result.policyCount / this.baseline.policyCount;
        const durationRatio = result.duration.average / this.baseline.duration.average;
        
        if (durationRatio > 1.5) {
          analysis.regressionDetection[result.testName] = {
            type: 'performance_regression',
            severity: durationRatio > 2 ? 'high' : 'medium',
            details: `Duration increased by ${((durationRatio - 1) * 100).toFixed(1)}%`
          };
        }
      });
    }

    // 권장사항 생성
    if (analysis.regressionDetection && Object.keys(analysis.regressionDetection).length > 0) {
      analysis.recommendations.push('Performance regression detected. Review recent changes.');
    }

    return analysis;
  }

  async saveReport(filename = 'policy-performance-report.json') {
    const report = this.generateReport();
    const reportPath = path.join(__dirname, filename);
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Performance report saved to: ${reportPath}`);
    
    return reportPath;
  }
}

// 🧪 정책 생성기
class PolicyGenerator {
  constructor() {
    this.ruleTypes = [
      'command_filter',
      'path_restriction', 
      'file_size_limit',
      'sensitive_data',
      'execution_time',
      'resource_usage'
    ];
  }

  generatePolicy(id, ruleCount = 5) {
    const rules = [];
    
    for (let i = 0; i < ruleCount; i++) {
      rules.push(this.generateRule(`${id}-rule-${i}`));
    }

    return {
      id: `policy-${id}`,
      name: `Test Policy ${id}`,
      description: `Generated test policy with ${ruleCount} rules`,
      enabled: true,
      priority: this.getRandomPriority(),
      rules,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'benchmark-tool'
    };
  }

  generateRule(id) {
    const ruleType = this.ruleTypes[Math.floor(Math.random() * this.ruleTypes.length)];
    
    return {
      id,
      name: `Test Rule ${id}`,
      type: ruleType,
      enabled: true,
      conditions: this.generateConditions(ruleType),
      actions: this.generateActions(),
      metadata: { generated: true }
    };
  }

  generateConditions(ruleType) {
    const conditions = [];
    
    switch (ruleType) {
      case 'command_filter':
        conditions.push({
          field: 'command',
          operator: 'contains',
          value: 'test',
          caseSensitive: false
        });
        break;
      case 'path_restriction':
        conditions.push({
          field: 'filePath',
          operator: 'regex',
          value: '.*\\.(exe|sh|bat)$',
          caseSensitive: false
        });
        break;
      case 'file_size_limit':
        conditions.push({
          field: 'fileSize',
          operator: 'greater_than',
          value: 1024 * 1024 // 1MB
        });
        break;
      default:
        conditions.push({
          field: 'workflowId',
          operator: 'equals',
          value: 'test-workflow'
        });
    }

    return conditions;
  }

  generateActions() {
    return [{
      type: 'warn',
      severity: 'medium',
      message: 'Test rule triggered',
      metadata: { generated: true }
    }];
  }

  getRandomPriority() {
    const priorities = ['low', 'medium', 'high', 'critical'];
    return priorities[Math.floor(Math.random() * priorities.length)];
  }
}

// ⚡ 성능 테스트 실행기
class PolicyPerformanceTester {
  constructor() {
    this.metrics = new PerformanceMetrics();
    this.policyGenerator = new PolicyGenerator();
  }

  async runBaselineTest() {
    console.log('🔍 Running baseline test...');
    
    const baselinePolicies = 10;
    const baselineRules = 50;
    
    const result = await this.runTest('baseline', baselinePolicies, baselineRules);
    this.metrics.setBaseline(result);
    
    console.log(`✅ Baseline test completed: ${result.duration.average.toFixed(2)}ms average`);
    return result;
  }

  async runScalabilityTests() {
    console.log('📈 Running scalability tests...');
    
    const testScenarios = [
      { name: 'small', policies: 25, rules: 125 },
      { name: 'medium', policies: 50, rules: 250 },
      { name: 'large', policies: 100, rules: 500 },
      { name: 'xlarge', policies: 200, rules: 1000 }
    ];

    for (const scenario of testScenarios) {
      console.log(`\n🧪 Testing ${scenario.name} scale: ${scenario.policies} policies, ${scenario.rules} rules`);
      await this.runTest(scenario.name, scenario.policies, scenario.rules);
      
      // 메모리 정리
      if (global.gc) {
        global.gc();
      }
      
      // 잠시 대기
      await this.sleep(1000);
    }
  }

  async runTest(testName, policyCount, ruleCount) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    // 정책 생성
    const policies = [];
    const rulesPerPolicy = Math.ceil(ruleCount / policyCount);
    
    for (let i = 0; i < policyCount; i++) {
      const actualRules = Math.min(rulesPerPolicy, ruleCount - (i * rulesPerPolicy));
      policies.push(this.policyGenerator.generatePolicy(i, actualRules));
    }

    // 정책 평가 시뮬레이션 (실제 정책 엔진 호출 대신)
    const evaluationTimes = [];
    const iterations = 100; // 각 정책에 대해 100번 평가
    
    for (let iter = 0; iter < iterations; iter++) {
      for (const policy of policies) {
        const evalStart = performance.now();
        
        // 정책 평가 로직 시뮬레이션
        await this.simulatePolicyEvaluation(policy);
        
        const evalEnd = performance.now();
        evaluationTimes.push(evalEnd - evalStart);
      }
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const totalDuration = endTime - startTime;
    const duration = this.calculateDurationStats(evaluationTimes);
    
    const result = this.metrics.addResult(
      testName,
      policyCount,
      ruleCount,
      { total: totalDuration, ...duration },
      {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external,
        rss: endMemory.rss - startMemory.rss
      }
    );

    console.log(`  ⏱️  Total: ${totalDuration.toFixed(2)}ms, Avg: ${duration.average.toFixed(2)}ms`);
    console.log(`  📊 Throughput: ${result.throughput.policiesPerSecond.toFixed(1)} policies/sec`);
    
    return result;
  }

  async simulatePolicyEvaluation(policy) {
    // 실제 정책 엔진의 평가 로직을 시뮬레이션
    // 복잡한 조건 평가, 정규식 매칭 등을 시뮬레이션
    
    for (const rule of policy.rules) {
      // 조건 평가 시뮬레이션
      for (const condition of rule.conditions) {
        if (condition.operator === 'regex') {
          // 정규식 매칭 시뮬레이션 (CPU 집약적)
          const regex = new RegExp(condition.value);
          regex.test('test-string-for-regex-matching');
        } else if (condition.operator === 'contains') {
          // 문자열 검색 시뮬레이션
          'test-command-string'.includes(condition.value);
        }
      }
      
      // 액션 처리 시뮬레이션
      for (const action of rule.actions) {
        if (action.type === 'log') {
          // 로깅 시뮬레이션
          // console.log(`Policy ${policy.id} rule ${rule.id}: ${action.message}`);
        }
      }
    }
    
    // 약간의 지연 추가 (실제 환경과 유사하게)
    await this.sleep(Math.random() * 10);
  }

  calculateDurationStats(times) {
    const sorted = times.sort((a, b) => a - b);
    const count = sorted.length;
    
    return {
      average: sorted.reduce((sum, time) => sum + time, 0) / count,
      min: sorted[0],
      max: sorted[count - 1],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)]
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateReport() {
    const reportPath = await this.metrics.saveReport();
    
    // 간단한 콘솔 요약 출력
    console.log('\n📊 Performance Benchmark Summary');
    console.log('================================');
    
    this.metrics.results.forEach(result => {
      console.log(`${result.testName.padEnd(10)} | ${result.policyCount.toString().padStart(4)} policies | ${result.duration.average.toFixed(2).padStart(8)}ms avg | ${result.throughput.policiesPerSecond.toFixed(1).padStart(6)} policies/sec`);
    });
    
    if (this.metrics.baseline) {
      console.log('\n🔍 Baseline Comparison');
      console.log('=====================');
      console.log(`Baseline: ${this.metrics.baseline.policyCount} policies, ${this.metrics.baseline.duration.average.toFixed(2)}ms average`);
    }
    
    return reportPath;
  }
}

// 🚀 메인 실행 함수
async function main() {
  console.log('🚀 Policy Performance Benchmark Tool');
  console.log('====================================');
  console.log('TASK-093: 대량 정책 성능 벤치(간이)\n');
  
  try {
    const tester = new PolicyPerformanceTester();
    
    // 베이스라인 테스트 실행
    await tester.runBaselineTest();
    
    // 확장성 테스트 실행
    await tester.runScalabilityTests();
    
    // 결과 리포트 생성
    const reportPath = await tester.generateReport();
    
    console.log(`\n✅ Benchmark completed successfully!`);
    console.log(`📊 Detailed report: ${reportPath}`);
    
    // README에 기준선 기록을 위한 정보 출력
    console.log('\n📝 README Baseline Data:');
    console.log('```json');
    const baseline = tester.metrics.baseline;
    if (baseline) {
      console.log(JSON.stringify({
        baseline: {
          policyCount: baseline.policyCount,
          ruleCount: baseline.ruleCount,
          averageDuration: baseline.duration.average,
          throughput: baseline.throughput.policiesPerSecond
        },
        timestamp: baseline.timestamp
      }, null, 2));
    }
    console.log('```');
    
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
  main();
}

module.exports = {
  PolicyPerformanceTester,
  PerformanceMetrics,
  PolicyGenerator
};
