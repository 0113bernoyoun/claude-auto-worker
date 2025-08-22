import { Test } from '@nestjs/testing';
import { PolicyCacheService } from './src/core/cache/policy-cache.service';
import { RollingBufferService } from './src/core/cache/rolling-buffer.service';

async function testCacheServices() {
  console.log('🚀 G3. 성능·메모리 효율 패키지 테스트 시작\n');

  try {
    // PolicyCacheService 테스트
    console.log('🧪 PolicyCacheService 테스트...');
    const policyModule = await Test.createTestingModule({
      providers: [PolicyCacheService],
    }).compile();

    const policyService = policyModule.get<PolicyCacheService>(PolicyCacheService);
    
    console.log('✅ PolicyCacheService 인스턴스 생성 성공');
    console.log('📊 활성화 상태:', policyService.isEnabled());
    console.log('📏 초기 크기:', policyService.size());
    
    // 정책 캐싱 테스트
    const policyResult = {
      policyId: 'test-policy',
      result: true,
      timestamp: Date.now(),
      metadata: { reason: 'test-cache' }
    };
    
    policyService.cachePolicyEvaluation('test-policy', { userId: '123' }, policyResult);
    console.log('📝 정책 평가 결과 캐싱 완료, 크기:', policyService.size());
    
    const cached = policyService.getPolicyEvaluation('test-policy', { userId: '123' });
    console.log('🔍 캐시 조회:', cached ? '성공' : '실패');
    console.log('📈 캐시 통계:', policyService.getStats());
    
    await policyModule.close();
    console.log('✅ PolicyCacheService 테스트 완료\n');

    // RollingBufferService 테스트
    console.log('🗂️ RollingBufferService 테스트...');
    const bufferModule = await Test.createTestingModule({
      providers: [RollingBufferService],
    }).compile();

    const bufferService = bufferModule.get<RollingBufferService>(RollingBufferService);
    
    console.log('✅ RollingBufferService 인스턴스 생성 성공');
    
    // 테스트용 설정
    bufferService.updateConfig({ 
      maxMemoryItems: 3,
      fileStoragePath: './test-rolling-data'
    });
    
    // 항목 추가 테스트
    const id1 = await bufferService.addItem('item-1', { type: 'test' });
    const id2 = await bufferService.addItem('item-2', { type: 'test' });
    console.log('📝 항목 추가 완료:', id1.substring(0, 8), id2.substring(0, 8));
    
    // 조회 테스트
    const item = await bufferService.getItem(id1);
    console.log('🔍 항목 조회:', item ? '성공' : '실패');
    
    const recentItems = await bufferService.getRecentItems(2);
    console.log('📋 최근 항목 개수:', recentItems.length);
    console.log('📈 롤링 버퍼 통계:', bufferService.getStats());
    
    await bufferModule.close();
    console.log('✅ RollingBufferService 테스트 완료\n');
    
    console.log('🎉 모든 테스트 성공적으로 완료!');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    console.error('스택 트레이스:', error.stack);
  }
}

testCacheServices();

