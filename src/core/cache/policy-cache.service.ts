import { Injectable, Logger } from '@nestjs/common';
import { LRUCache } from 'lru-cache';

export interface PolicyCacheConfig {
  enabled: boolean;
  maxItems: number;
  ttlMs: number;
  maxSize: number;
  sizeCalculation?: (value: any, key: string) => number;
}

export interface PolicyCacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  currentSize: number;
  maxSize: number;
  evictions: number;
}

export interface PolicyEvaluationResult {
  policyId: string;
  result: boolean;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface RuleMatchingResult {
  ruleId: string;
  matched: boolean;
  timestamp: number;
  context?: Record<string, any>;
}

@Injectable()
export class PolicyCacheService {
  private readonly logger = new Logger(PolicyCacheService.name);
  private cache: LRUCache<string, PolicyEvaluationResult | RuleMatchingResult> | null = null;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };
  private config: PolicyCacheConfig;

  constructor() {
    // 기본 설정
    this.config = {
      enabled: true,
      maxItems: 1000,
      ttlMs: 5 * 60 * 1000, // 5분
      maxSize: 10000,
    };
    
    this.initializeCache();
  }

  /**
   * 캐시 초기화
   */
  private initializeCache(): void {
    if (!this.config.enabled) {
      this.logger.log('Policy cache is disabled');
      return;
    }

    this.cache = new LRUCache({
      max: this.config.maxItems,
      maxSize: this.config.maxSize,
      ttl: this.config.ttlMs,
      sizeCalculation: this.config.sizeCalculation || this.defaultSizeCalculation,
      dispose: (value, key, reason) => {
        if (reason === 'evict') {
          this.stats.evictions++;
          this.logger.debug(`Cache item evicted: ${key}`);
        }
      },
      onInsert: (value, key) => {
        this.logger.debug(`Cache item inserted: ${key}`);
      },
      // TTL 만료 시 즉시 제거
      updateAgeOnGet: false,
      updateAgeOnHas: false,
      allowStale: false,
    });

    this.logger.log(`Policy cache initialized with maxItems: ${this.config.maxItems}, TTL: ${this.config.ttlMs}ms`);
  }

  /**
   * 기본 크기 계산 함수
   */
  private defaultSizeCalculation(value: any, key: string): number {
    // 간단한 크기 계산: 문자열 길이 + 객체 속성 수
    let size = 0;
    if (typeof value === 'string') {
      size = value.length;
    } else if (typeof value === 'object' && value !== null) {
      size = JSON.stringify(value).length;
    }
    return size;
  }

  /**
   * 캐시 설정 업데이트
   */
  updateConfig(config: Partial<PolicyCacheConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.config.enabled && !this.cache) {
      this.initializeCache();
    } else if (!this.config.enabled && this.cache) {
      this.cache.clear();
      this.cache = null;
    } else if (this.config.enabled && this.cache) {
      // 기존 캐시 설정이 변경된 경우 캐시 재생성
      const oldCache = this.cache;
      this.initializeCache();
      
      // 기존 데이터를 새 캐시로 복사 (TTL이 만료되지 않은 항목만)
      if (this.cache) {
        for (const [key, value] of oldCache.entries()) {
          this.cache.set(key, value);
        }
      }
    }
    
    this.logger.log(`Policy cache config updated: ${JSON.stringify(this.config)}`);
  }

  /**
   * 정책 평가 결과 캐시
   */
  cachePolicyEvaluation(
    policyId: string,
    context: Record<string, any>,
    result: PolicyEvaluationResult
  ): void {
    if (!this.config.enabled || !this.cache) return;

    const key = this.generatePolicyKey(policyId, context);
    this.cache.set(key, result);
  }

  /**
   * 정책 평가 결과 조회
   */
  getPolicyEvaluation(
    policyId: string,
    context: Record<string, any>
  ): PolicyEvaluationResult | null {
    if (!this.config.enabled || !this.cache) return null;

    const key = this.generatePolicyKey(policyId, context);
    const result = this.cache.get(key);
    
    if (result) {
      this.stats.hits++;
      this.logger.debug(`Policy cache hit: ${policyId}`);
      return result as PolicyEvaluationResult;
    } else {
      this.stats.misses++;
      this.logger.debug(`Policy cache miss: ${policyId}`);
      return null;
    }
  }

  /**
   * 룰 매칭 결과 캐시
   */
  cacheRuleMatching(
    ruleId: string,
    context: Record<string, any>,
    result: RuleMatchingResult
  ): void {
    if (!this.config.enabled || !this.cache) return;

    const key = this.generateRuleKey(ruleId, context);
    this.cache.set(key, result);
  }

  /**
   * 룰 매칭 결과 조회
   */
  getRuleMatching(
    ruleId: string,
    context: Record<string, any>
  ): RuleMatchingResult | null {
    if (!this.config.enabled || !this.cache) return null;

    const key = this.generateRuleKey(ruleId, context);
    const result = this.cache.get(key);
    
    if (result) {
      this.stats.hits++;
      this.logger.debug(`Rule cache hit: ${ruleId}`);
      return result as RuleMatchingResult;
    } else {
      this.stats.misses++;
      this.logger.debug(`Rule cache miss: ${ruleId}`);
      return null;
    }
  }

  /**
   * 정책 키 생성
   */
  private generatePolicyKey(policyId: string, context: Record<string, any>): string {
    const contextHash = this.hashContext(context);
    return `policy:${policyId}:${contextHash}`;
  }

  /**
   * 룰 키 생성
   */
  private generateRuleKey(ruleId: string, context: Record<string, any>): string {
    const contextHash = this.hashContext(context);
    return `rule:${ruleId}:${contextHash}`;
  }

  /**
   * 컨텍스트 해시 생성
   */
  private hashContext(context: Record<string, any>): string {
    // 간단한 해시 함수: 컨텍스트를 정렬된 JSON 문자열로 변환
    const sortedKeys = Object.keys(context).sort();
    const sortedContext: Record<string, any> = {};
    
    for (const key of sortedKeys) {
      sortedContext[key] = context[key];
    }
    
    return JSON.stringify(sortedContext);
  }

  /**
   * 캐시 통계 조회
   */
  getStats(): PolicyCacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100, // 소수점 2자리
      totalRequests,
      currentSize: this.cache?.size || 0,
      maxSize: this.config.maxSize,
      evictions: this.stats.evictions,
    };
  }

  /**
   * 캐시 상태 확인
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * 캐시 비우기
   */
  clear(): void {
    if (this.cache) {
      this.cache.clear();
      this.stats.hits = 0;
      this.stats.misses = 0;
      this.stats.evictions = 0;
      this.logger.log('Policy cache cleared');
    }
  }

  /**
   * 특정 키로 캐시 항목 제거
   */
  delete(key: string): boolean {
    if (!this.cache) return false;
    return this.cache.delete(key);
  }

  /**
   * 캐시에 특정 키가 존재하는지 확인
   */
  has(key: string): boolean {
    if (!this.cache) return false;
    return this.cache.has(key);
  }

  /**
   * 캐시 크기 조회
   */
  size(): number {
    return this.cache?.size || 0;
  }
}
