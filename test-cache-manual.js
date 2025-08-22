// 간단한 캐시 기능 테스트 스크립트
const { Test } = require('@nestjs/testing');

async function testPolicyCache() {
  console.log('🧪 PolicyCache 기능 테스트 시작...');
  
  try {
    // 동적 import 사용
    const { PolicyCacheService } = await import('./src/core/cache/policy-cache.service.ts');
    
    // 간단한 테스트 모듈 생성
    const module = await Test.createTestingModule({
      providers: [PolicyCacheService],
    }).compile();

    const service = module.get(PolicyCacheService);
    
    // 기본 기능 테스트
    console.log('✅ PolicyCacheService 인스턴스 생성 성공');
    console.log('📊 활성화 상태:', service.isEnabled());
    console.log('📏 초기 크기:', service.size());
    
    // 정책 평가 결과 캐싱 테스트
    const policyId = 'test-policy';
    const context = { userId: '123', role: 'admin' };
    const result = {
      policyId,
      result: true,
      timestamp: Date.now(),
      metadata: { reason: 'test' }
    };
    
    service.cachePolicyEvaluation(policyId, context, result);
    console.log('📝 정책 평가 결과 캐싱 완료');
    console.log('📏 캐시 크기:', service.size());
    
    // 캐시된 결과 조회 테스트
    const cached = service.getPolicyEvaluation(policyId, context);
    console.log('🔍 캐시된 결과 조회:', cached ? '성공' : '실패');
    
    // 통계 조회 테스트
    const stats = service.getStats();
    console.log('📈 캐시 통계:', stats);
    
    await module.close();
    console.log('✅ PolicyCache 테스트 완료\n');
    
  } catch (error) {
    console.error('❌ PolicyCache 테스트 실패:', error.message);
  }
}

async function testRollingBuffer() {
  console.log('🗂️ RollingBuffer 기능 테스트 시작...');
  
  try {
    // 동적 import 사용
    const { RollingBufferService } = await import('./src/core/cache/rolling-buffer.service.ts');
    
    // 간단한 테스트 모듈 생성
    const module = await Test.createTestingModule({
      providers: [RollingBufferService],
    }).compile();

    const service = module.get(RollingBufferService);
    
    // 기본 기능 테스트
    console.log('✅ RollingBufferService 인스턴스 생성 성공');
    
    // 설정을 작은 값으로 조정
    service.updateConfig({ 
      maxMemoryItems: 5,
      fileStoragePath: './test-data/rolling-buffer'
    });
    console.log('⚙️ 설정 업데이트 완료');
    
    // 항목 추가 테스트
    const itemIds = [];
    for (let i = 1; i <= 3; i++) {
      const id = await service.addItem(`test-item-${i}`, { index: i });
      itemIds.push(id);
      console.log(`📝 항목 ${i} 추가: ${id}`);
    }
    
    // 최근 항목 조회 테스트
    const recentItems = await service.getRecentItems(2);
    console.log(`🔍 최근 항목 ${recentItems.length}개 조회 완료`);
    
    // 통계 조회 테스트
    const stats = service.getStats();
    console.log('📈 롤링 버퍼 통계:', stats);
    
    await module.close();
    console.log('✅ RollingBuffer 테스트 완료\n');
    
  } catch (error) {
    console.error('❌ RollingBuffer 테스트 실패:', error.message);
  }
}

async function runTests() {
  console.log('🚀 G3. 성능·메모리 효율 패키지 수동 테스트 시작\n');
  
  await testPolicyCache();
  await testRollingBuffer();
  
  console.log('🎉 모든 테스트 완료!');
}

// 테스트 실행
runTests().catch(console.error);

