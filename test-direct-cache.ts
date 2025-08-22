// 직접적인 캐시 서비스 테스트
import { PolicyCacheService } from './src/core/cache/policy-cache.service';
import { RollingBufferService } from './src/core/cache/rolling-buffer.service';

async function testDirectCache() {
  console.log('🚀 직접 캐시 서비스 테스트 시작\n');

  // PolicyCacheService 직접 테스트
  console.log('🧪 PolicyCacheService 테스트...');
  try {
    const policyCache = new PolicyCacheService();
    console.log('✅ PolicyCacheService 인스턴스 생성 성공');
    console.log('📊 활성화 상태:', policyCache.isEnabled());
    console.log('📏 초기 크기:', policyCache.size());
    
    // 정책 평가 결과 캐싱
    const policyResult = {
      policyId: 'direct-test',
      result: true,
      timestamp: Date.now(),
      metadata: { source: 'direct-test' }
    };
    
    policyCache.cachePolicyEvaluation('direct-test', { userId: 'test' }, policyResult);
    console.log('📝 정책 평가 결과 캐싱 완료, 크기:', policyCache.size());
    
    // 캐시된 결과 조회
    const cached = policyCache.getPolicyEvaluation('direct-test', { userId: 'test' });
    console.log('🔍 캐시 조회 결과:', cached ? '성공' : '실패');
    
    if (cached) {
      console.log('  - 정책 ID:', cached.policyId);
      console.log('  - 결과:', cached.result);
      console.log('  - 타임스탬프:', new Date(cached.timestamp).toISOString());
    }
    
    // 룰 매칭 결과 캐싱
    const ruleResult = {
      ruleId: 'direct-rule-test',
      matched: true,
      timestamp: Date.now(),
      context: { action: 'read' }
    };
    
    policyCache.cacheRuleMatching('direct-rule-test', { resource: 'document' }, ruleResult);
    console.log('📝 룰 매칭 결과 캐싱 완료, 크기:', policyCache.size());
    
    // 캐시 통계
    const stats = policyCache.getStats();
    console.log('📈 캐시 통계:');
    console.log('  - 히트:', stats.hits);
    console.log('  - 미스:', stats.misses);
    console.log('  - 히트율:', stats.hitRate + '%');
    console.log('  - 총 요청:', stats.totalRequests);
    console.log('  - 현재 크기:', stats.currentSize);
    
    policyCache.clear();
    console.log('🧹 캐시 정리 완료');
    console.log('✅ PolicyCacheService 테스트 완료\n');
    
  } catch (error) {
    console.error('❌ PolicyCacheService 테스트 실패:', error.message);
  }

  // RollingBufferService 직접 테스트
  console.log('🗂️ RollingBufferService 테스트...');
  try {
    const rollingBuffer = new RollingBufferService();
    console.log('✅ RollingBufferService 인스턴스 생성 성공');
    
    // 테스트용 설정
    rollingBuffer.updateConfig({ 
      maxMemoryItems: 3,
      fileStoragePath: './temp-direct-test',
      enabled: true
    });
    console.log('⚙️ 설정 업데이트 완료');
    
    // 항목 추가
    const itemIds = [];
    for (let i = 1; i <= 5; i++) {
      const id = await rollingBuffer.addItem(`direct-test-item-${i}`, { 
        index: i, 
        timestamp: Date.now() 
      });
      itemIds.push(id);
      console.log(`📝 항목 ${i} 추가: ${id.substring(0, 8)}...`);
    }
    
    // 최근 항목 조회
    const recentItems = await rollingBuffer.getRecentItems(3);
    console.log(`🔍 최근 ${recentItems.length}개 항목 조회:`);
    recentItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.data} (${item.id.substring(0, 8)}...)`);
    });
    
    // 특정 항목 조회
    const firstItem = await rollingBuffer.getItem(itemIds[0]);
    console.log('🔍 첫 번째 항목 조회:', firstItem ? '성공' : '실패');
    
    if (firstItem) {
      console.log('  - 데이터:', firstItem.data);
      console.log('  - 메타데이터:', firstItem.metadata);
    }
    
    // 통계 조회
    const bufferStats = rollingBuffer.getStats();
    console.log('📈 롤링 버퍼 통계:');
    console.log('  - 메모리 항목:', bufferStats.memoryItems);
    console.log('  - 파일 쓰기:', bufferStats.fileWrites);
    console.log('  - 파일 읽기:', bufferStats.fileReads);
    console.log('  - 제거된 항목:', bufferStats.evictions);
    console.log('  - 메모리 크기:', bufferStats.memorySize, 'bytes');
    
    await rollingBuffer.clearAll();
    console.log('🧹 롤링 버퍼 정리 완료');
    console.log('✅ RollingBufferService 테스트 완료\n');
    
  } catch (error) {
    console.error('❌ RollingBufferService 테스트 실패:', error.message);
    console.error('스택:', error.stack);
  }

  console.log('🎉 G3. 성능·메모리 효율 패키지 직접 테스트 완료!');
}

testDirectCache();

