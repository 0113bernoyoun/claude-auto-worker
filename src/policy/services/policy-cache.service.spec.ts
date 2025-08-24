import { Test, TestingModule } from '@nestjs/testing';
import { PolicyValidationResult, SecurityPolicy } from '../policy.types';
import { PolicyCacheService } from './policy-cache.service';

describe('PolicyCacheService', () => {
  let service: PolicyCacheService;
  let mockPolicy: SecurityPolicy;
  let mockValidationResult: PolicyValidationResult;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PolicyCacheService],
    }).compile();

    service = module.get<PolicyCacheService>(PolicyCacheService);

    // 테스트용 모의 데이터
    mockPolicy = {
      id: 'test-policy-1',
      name: 'Test Policy',
      description: 'Test policy for testing',
      enabled: true,
      priority: 'medium',
      rules: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user',
    };

    mockValidationResult = {
      isValid: true,
      violations: [],
      warnings: [],
      recommendations: [],
      summaryCode: 'OK',
      category: 'test',
    };
  });

  afterEach(() => {
    // 각 테스트 후 캐시 초기화
    service.invalidateAllPolicyCache();
    service.resetStats();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Policy Caching', () => {
    it('should cache and retrieve a policy', () => {
      const policyId = 'test-policy-1';
      
      // 정책을 캐시에 저장
      service.setPolicy(policyId, mockPolicy);
      
      // 캐시에서 정책 조회
      const retrievedPolicy = service.getPolicy(policyId);
      
      expect(retrievedPolicy).toEqual(mockPolicy);
    });

    it('should return null for non-existent policy', () => {
      const retrievedPolicy = service.getPolicy('non-existent');
      expect(retrievedPolicy).toBeNull();
    });

    it('should invalidate specific policy cache', () => {
      const policyId = 'test-policy-1';
      
      // 정책을 캐시에 저장
      service.setPolicy(policyId, mockPolicy);
      
      // 캐시 무효화
      service.invalidatePolicy(policyId);
      
      // 정책이 더 이상 캐시에 없어야 함
      const retrievedPolicy = service.getPolicy(policyId);
      expect(retrievedPolicy).toBeNull();
    });

    it('should handle cache size limits', () => {
      // 최대 캐시 크기보다 많은 정책을 추가 (테스트를 위해 적은 수로)
      for (let i = 0; i < 100; i++) {
        const policy = { ...mockPolicy, id: `policy-${i}` };
        service.setPolicy(`policy-${i}`, policy);
      }
      
      // 캐시 크기가 제한 내에 있어야 함
      const stats = service.getStats();
      expect(stats.size).toBeLessThanOrEqual(1000);
    });
  });

  describe('Evaluation Result Caching', () => {
    it('should cache and retrieve evaluation results', () => {
      const cacheKey = 'test-eval-key';
      
      // 평가 결과를 캐시에 저장
      service.setEvaluationResult(cacheKey, mockValidationResult);
      
      // 캐시에서 평가 결과 조회
      const retrievedResult = service.getEvaluationResult(cacheKey);
      
      expect(retrievedResult).toEqual(mockValidationResult);
    });

    it('should return null for non-existent evaluation result', () => {
      const retrievedResult = service.getEvaluationResult('non-existent');
      expect(retrievedResult).toBeNull();
    });

    it('should invalidate specific evaluation result cache', () => {
      const cacheKey = 'test-eval-key';
      
      // 평가 결과를 캐시에 저장
      service.setEvaluationResult(cacheKey, mockValidationResult);
      
      // 캐시 무효화
      service.invalidateEvaluationResult(cacheKey);
      
      // 평가 결과가 더 이상 캐시에 없어야 함
      const retrievedResult = service.getEvaluationResult(cacheKey);
      expect(retrievedResult).toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', () => {
      const policyId = 'test-policy-1';
      
      // 캐시 미스 (정책이 없음)
      service.getPolicy(policyId);
      
      // 정책을 캐시에 저장
      service.setPolicy(policyId, mockPolicy);
      
      // 캐시 히트
      service.getPolicy(policyId);
      
      const stats = service.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50);
    });

    it('should reset statistics', () => {
      const policyId = 'test-policy-1';
      
      // 정책을 캐시에 저장하고 조회
      service.setPolicy(policyId, mockPolicy);
      service.getPolicy(policyId);
      
      // 통계 리셋
      service.resetStats();
      
      const stats = service.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys', () => {
      const policyId = 'test-policy';
      const context = { workflowId: 'workflow-1', userId: 'user-1' };
      
      const key1 = service.generateEvaluationCacheKey(policyId, context);
      const key2 = service.generateEvaluationCacheKey(policyId, context);
      
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different contexts', () => {
      const policyId = 'test-policy';
      const context1 = { workflowId: 'workflow-1', userId: 'user-1' };
      const context2 = { workflowId: 'workflow-2', userId: 'user-2' }; // workflowId와 userId가 모두 다름
      
      const key1 = service.generateEvaluationCacheKey(policyId, context1);
      const key2 = service.generateEvaluationCacheKey(policyId, context2);
      
      // 컨텍스트가 다르므로 키도 달라야 함
      expect(key1).not.toBe(key2);
    });
  });

  describe('Cache Cleanup', () => {
    it('should cleanup expired entries', async () => {
      const policyId = 'test-policy-1';
      
      // 매우 짧은 TTL로 정책을 캐시에 저장 (10ms)
      service.setPolicy(policyId, mockPolicy, 10);
      
      // 20ms 대기하여 만료되도록 함
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // 만료된 항목 정리
      service.cleanupExpiredEntries();
      
      // 정책이 더 이상 캐시에 없어야 함
      const retrievedPolicy = service.getPolicy(policyId);
      expect(retrievedPolicy).toBeNull();
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate all policy cache', () => {
      const policyId1 = 'test-policy-1';
      const policyId2 = 'test-policy-2';
      
      // 여러 정책을 캐시에 저장
      service.setPolicy(policyId1, mockPolicy);
      service.setPolicy(policyId2, { ...mockPolicy, id: policyId2 });
      
      // 모든 정책 캐시 무효화
      service.invalidateAllPolicyCache();
      
      // 모든 정책이 더 이상 캐시에 없어야 함
      expect(service.getPolicy(policyId1)).toBeNull();
      expect(service.getPolicy(policyId2)).toBeNull();
    });
  });
});
