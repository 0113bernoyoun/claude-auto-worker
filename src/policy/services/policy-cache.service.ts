import { Injectable, Logger } from '@nestjs/common';
import { PolicyValidationResult, SecurityPolicy } from '../policy.types';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

@Injectable()
export class PolicyCacheService {
  private readonly logger = new Logger(PolicyCacheService.name);
  
  // 정책 조회 캐시
  private readonly policyCache = new Map<string, CacheEntry<SecurityPolicy>>();
  
  // 정책 평가 결과 캐시
  private readonly evaluationCache = new Map<string, CacheEntry<PolicyValidationResult>>();
  
  // 정책 목록 캐시
  private readonly policyListCache = new Map<string, CacheEntry<SecurityPolicy[]>>();
  
  // 캐시 통계
  private stats = {
    hits: 0,
    misses: 0,
  };

  // 기본 TTL 설정 (5분)
  private readonly defaultTTL = 5 * 60 * 1000;
  
  // 최대 캐시 크기
  private readonly maxCacheSize = 1000;

  /**
   * 정책을 캐시에서 조회
   */
  getPolicy(policyId: string): SecurityPolicy | null {
    const entry = this.policyCache.get(policyId);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.policyCache.delete(policyId);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * 정책 목록을 캐시에서 조회
   */
  getPolicyList(cacheKey: string): SecurityPolicy[] | null {
    const entry = this.policyListCache.get(cacheKey);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.policyListCache.delete(cacheKey);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * 정책 목록을 캐시에 저장
   */
  setPolicyList(cacheKey: string, policies: SecurityPolicy[], ttl?: number): void {
    const entry: CacheEntry<SecurityPolicy[]> = {
      data: policies,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };

    // 캐시 크기 제한 확인
    if (this.policyListCache.size >= this.maxCacheSize) {
      this.evictOldestEntry(this.policyListCache);
    }

    this.policyListCache.set(cacheKey, entry);
    this.logger.debug(`Policy list cached: ${cacheKey}`);
  }

  /**
   * 정책을 캐시에 저장
   */
  setPolicy(policyId: string, policy: SecurityPolicy, ttl?: number): void {
    const entry: CacheEntry<SecurityPolicy> = {
      data: policy,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };

    // 캐시 크기 제한 확인
    if (this.policyCache.size >= this.maxCacheSize) {
      this.evictOldestEntry(this.policyCache);
    }

    this.policyCache.set(policyId, entry);
    this.logger.debug(`Policy cached: ${policyId}`);
  }

  /**
   * 정책 평가 결과를 캐시에서 조회
   */
  getEvaluationResult(cacheKey: string): PolicyValidationResult | null {
    const entry = this.evaluationCache.get(cacheKey);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.evaluationCache.delete(cacheKey);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * 정책 평가 결과를 캐시에 저장
   */
  setEvaluationResult(cacheKey: string, result: PolicyValidationResult, ttl?: number): void {
    const entry: CacheEntry<PolicyValidationResult> = {
      data: result,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };

    // 캐시 크기 제한 확인
    if (this.evaluationCache.size >= this.maxCacheSize) {
      this.evictOldestEntry(this.evaluationCache);
    }

    this.evaluationCache.set(cacheKey, entry);
    this.logger.debug(`Evaluation result cached: ${cacheKey}`);
  }

  /**
   * 정책 캐시 무효화
   */
  invalidatePolicy(policyId: string): void {
    this.policyCache.delete(policyId);
    this.logger.debug(`Policy cache invalidated: ${policyId}`);
  }

  /**
   * 정책 평가 결과 캐시 무효화
   */
  invalidateEvaluationResult(cacheKey: string): void {
    this.evaluationCache.delete(cacheKey);
    this.logger.debug(`Evaluation result cache invalidated: ${cacheKey}`);
  }

  /**
   * 정책 목록 캐시 무효화
   */
  invalidatePolicyList(cacheKey: string): void {
    this.policyListCache.delete(cacheKey);
    this.logger.debug(`Policy list cache invalidated: ${cacheKey}`);
  }

  /**
   * 모든 정책 관련 캐시 무효화
   */
  invalidateAllPolicyCache(): void {
    this.policyCache.clear();
    this.evaluationCache.clear();
    this.policyListCache.clear();
    this.logger.debug('All policy cache invalidated');
  }

  /**
   * 만료된 캐시 항목 정리
   */
  cleanupExpiredEntries(): void {
    let cleanedCount = 0;

    // 정책 캐시 정리
    for (const [key, entry] of this.policyCache.entries()) {
      if (this.isExpired(entry)) {
        this.policyCache.delete(key);
        cleanedCount++;
      }
    }

    // 평가 결과 캐시 정리
    for (const [key, entry] of this.evaluationCache.entries()) {
      if (this.isExpired(entry)) {
        this.evaluationCache.delete(key);
        cleanedCount++;
      }
    }

    // 정책 목록 캐시 정리
    for (const [key, entry] of this.policyListCache.entries()) {
      if (this.isExpired(entry)) {
        this.policyListCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * 캐시 통계 조회
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.policyCache.size + this.evaluationCache.size + this.policyListCache.size,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * 캐시 상태 리셋
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.logger.debug('Cache stats reset');
  }

  /**
   * 캐시 키 생성 (정책 평가용)
   */
  generateEvaluationCacheKey(
    policyId: string, 
    context: Record<string, unknown>
  ): string {
    // 객체의 속성을 정렬하여 안정적인 해시 생성
    const sortedContext = Object.keys(context)
      .sort()
      .reduce((result, key) => {
        result[key] = context[key];
        return result;
      }, {} as Record<string, unknown>);
    
    const contextHash = JSON.stringify(sortedContext);
    // 더 긴 해시를 사용하여 충돌 방지
    return `eval:${policyId}:${Buffer.from(contextHash).toString('base64').substring(0, 32)}`;
  }

  /**
   * 캐시 키 생성 (정책 목록용)
   */
  generatePolicyListCacheKey(
    policyIds: string[]
  ): string {
    const sortedPolicyIds = [...policyIds].sort();
    const policyIdsHash = JSON.stringify(sortedPolicyIds);
    return `policyList:${Buffer.from(policyIdsHash).toString('base64').substring(0, 16)}`;
  }

  /**
   * 캐시 항목 만료 여부 확인
   */
  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * 가장 오래된 캐시 항목 제거
   */
  private evictOldestEntry<T>(cache: Map<string, CacheEntry<T>>): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
      this.logger.debug(`Evicted oldest cache entry: ${oldestKey}`);
    }
  }
}
