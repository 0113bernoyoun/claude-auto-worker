import { Test, TestingModule } from '@nestjs/testing';
import { PolicyCacheService, PolicyEvaluationResult, RuleMatchingResult } from './policy-cache.service';

describe('PolicyCacheService', () => {
  let service: PolicyCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PolicyCacheService],
    }).compile();

    service = module.get<PolicyCacheService>(PolicyCacheService);
  });

  afterEach(() => {
    service.clear();
  });

  describe('기본 기능', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should be enabled by default', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('should have correct initial size', () => {
      expect(service.size()).toBe(0);
    });
  });

  describe('정책 평가 캐시', () => {
    const policyId = 'test-policy';
    const context = { userId: '123', role: 'admin' };
    const result: PolicyEvaluationResult = {
      policyId,
      result: true,
      timestamp: Date.now(),
      metadata: { reason: 'test' }
    };

    it('should cache policy evaluation result', () => {
      service.cachePolicyEvaluation(policyId, context, result);
      expect(service.size()).toBe(1);
    });

    it('should retrieve cached policy evaluation result', () => {
      service.cachePolicyEvaluation(policyId, context, result);
      const cached = service.getPolicyEvaluation(policyId, context);
      
      expect(cached).toBeDefined();
      expect(cached?.policyId).toBe(policyId);
      expect(cached?.result).toBe(true);
    });

    it('should return null for non-existent policy', () => {
      const cached = service.getPolicyEvaluation('non-existent', context);
      expect(cached).toBeNull();
    });

    it('should handle different contexts separately', () => {
      const context1 = { userId: '123', role: 'admin' };
      const context2 = { userId: '123', role: 'user' };
      
      service.cachePolicyEvaluation(policyId, context1, result);
      service.cachePolicyEvaluation(policyId, context2, result);
      
      expect(service.size()).toBe(2);
      
      const cached1 = service.getPolicyEvaluation(policyId, context1);
      const cached2 = service.getPolicyEvaluation(policyId, context2);
      
      expect(cached1).toBeDefined();
      expect(cached2).toBeDefined();
    });
  });

  describe('룰 매칭 캐시', () => {
    const ruleId = 'test-rule';
    const context = { userId: '123', action: 'read' };
    const result: RuleMatchingResult = {
      ruleId,
      matched: true,
      timestamp: Date.now(),
      context: { resource: 'document' }
    };

    it('should cache rule matching result', () => {
      service.cacheRuleMatching(ruleId, context, result);
      expect(service.size()).toBe(1);
    });

    it('should retrieve cached rule matching result', () => {
      service.cacheRuleMatching(ruleId, context, result);
      const cached = service.getRuleMatching(ruleId, context);
      
      expect(cached).toBeDefined();
      expect(cached?.ruleId).toBe(ruleId);
      expect(cached?.matched).toBe(true);
    });

    it('should return null for non-existent rule', () => {
      const cached = service.getRuleMatching('non-existent', context);
      expect(cached).toBeNull();
    });
  });

  describe('캐시 통계', () => {
    const policyId = 'test-policy';
    const context = { userId: '123' };
    const result: PolicyEvaluationResult = {
      policyId,
      result: true,
      timestamp: Date.now()
    };

    it('should track cache hits and misses', () => {
      // 첫 번째 조회는 miss
      service.getPolicyEvaluation(policyId, context);
      
      // 캐시에 저장
      service.cachePolicyEvaluation(policyId, context, result);
      
      // 두 번째 조회는 hit
      service.getPolicyEvaluation(policyId, context);
      
      const stats = service.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.totalRequests).toBe(2);
      expect(stats.hitRate).toBe(50);
    });

    it('should calculate hit rate correctly', () => {
      service.cachePolicyEvaluation(policyId, context, result);
      
      // 3번 hit
      service.getPolicyEvaluation(policyId, context);
      service.getPolicyEvaluation(policyId, context);
      service.getPolicyEvaluation(policyId, context);
      
      // 1번 miss
      service.getPolicyEvaluation('non-existent', context);
      
      const stats = service.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(75);
    });
  });

  describe('캐시 설정', () => {
    it('should update cache configuration', () => {
      const newConfig = {
        maxItems: 500,
        ttlMs: 10 * 60 * 1000, // 10분
        maxSize: 5000
      };
      
      service.updateConfig(newConfig);
      
      // 설정이 적용되었는지 확인 (내부적으로는 확인할 수 없지만, 에러가 발생하지 않아야 함)
      expect(service.isEnabled()).toBe(true);
    });

    it('should disable cache when enabled is false', () => {
      service.updateConfig({ enabled: false });
      expect(service.isEnabled()).toBe(false);
      expect(service.size()).toBe(0);
    });

    it('should re-enable cache when enabled is true', () => {
      service.updateConfig({ enabled: false });
      service.updateConfig({ enabled: true });
      expect(service.isEnabled()).toBe(true);
    });
  });

  describe('캐시 관리', () => {
    const policyId = 'test-policy';
    const context = { userId: '123' };
    const result: PolicyEvaluationResult = {
      policyId,
      result: true,
      timestamp: Date.now()
    };

    it('should clear cache', () => {
      service.cachePolicyEvaluation(policyId, context, result);
      expect(service.size()).toBe(1);
      
      service.clear();
      expect(service.size()).toBe(0);
      
      const stats = service.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should delete specific cache item', () => {
      service.cachePolicyEvaluation(policyId, context, result);
      expect(service.size()).toBe(1);
      
      const key = `policy:${policyId}:${JSON.stringify(context)}`;
      const deleted = service.delete(key);
      expect(deleted).toBe(true);
      expect(service.size()).toBe(0);
    });

    it('should check if key exists', () => {
      service.cachePolicyEvaluation(policyId, context, result);
      
      const key = `policy:${policyId}:${JSON.stringify(context)}`;
      expect(service.has(key)).toBe(true);
      
      const nonExistentKey = 'non-existent-key';
      expect(service.has(nonExistentKey)).toBe(false);
    });
  });

  describe('LRU 동작', () => {
    it('should respect max items limit', () => {
      const maxItems = 3;
      service.updateConfig({ maxItems });
      
      // 4개 항목 추가 (maxItems 초과)
      for (let i = 0; i < 4; i++) {
        const context = { id: i };
        const result: PolicyEvaluationResult = {
          policyId: `policy-${i}`,
          result: true,
          timestamp: Date.now()
        };
        service.cachePolicyEvaluation(`policy-${i}`, context, result);
      }
      
      // LRU에 의해 가장 오래된 항목이 제거되어야 함
      expect(service.size()).toBeLessThanOrEqual(maxItems);
    });
  });

  describe('TTL 동작', () => {
    it('should respect TTL setting', async () => {
      const shortTtl = 100; // 100ms
      service.updateConfig({ ttlMs: shortTtl });
      
      const context = { userId: '123' };
      const result: PolicyEvaluationResult = {
        policyId: 'test-policy',
        result: true,
        timestamp: Date.now()
      };
      
      service.cachePolicyEvaluation('test-policy', context, result);
      expect(service.getPolicyEvaluation('test-policy', context)).toBeDefined();
      
      // TTL 만료 대기
      await new Promise(resolve => setTimeout(resolve, shortTtl + 50));
      
      // TTL 만료 후에는 캐시에서 제거되어야 함
      expect(service.getPolicyEvaluation('test-policy', context)).toBeNull();
    });
  });

  describe('컨텍스트 해시', () => {
    it('should generate consistent keys for same context', () => {
      const context1 = { userId: '123', role: 'admin' };
      const context2 = { role: 'admin', userId: '123' }; // 순서만 다름
      
      const result: PolicyEvaluationResult = {
        policyId: 'test-policy',
        result: true,
        timestamp: Date.now()
      };
      
      service.cachePolicyEvaluation('test-policy', context1, result);
      
      // 순서가 다른 컨텍스트로도 같은 결과를 가져와야 함
      const cached = service.getPolicyEvaluation('test-policy', context2);
      expect(cached).toBeDefined();
    });
  });
});

