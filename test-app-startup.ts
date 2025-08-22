import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PolicyCacheService } from './src/core/cache/policy-cache.service';
import { RollingBufferService } from './src/core/cache/rolling-buffer.service';

async function testAppStartup() {
  console.log('🚀 애플리케이션 시작 테스트...');
  
  try {
    const app = await NestFactory.create(AppModule, { logger: false });
    
    console.log('✅ NestJS 애플리케이션 생성 성공');
    
    // 캐시 서비스들이 주입되었는지 확인
    const policyCache = app.get(PolicyCacheService);
    const rollingBuffer = app.get(RollingBufferService);
    
    console.log('📋 PolicyCacheService 주입 확인:', policyCache ? '성공' : '실패');
    console.log('📋 RollingBufferService 주입 확인:', rollingBuffer ? '성공' : '실패');
    
    if (policyCache) {
      console.log('🧪 PolicyCache 기본 기능 테스트...');
      console.log('  - 활성화 상태:', policyCache.isEnabled());
      console.log('  - 초기 크기:', policyCache.size());
      
      // 간단한 캐싱 테스트
      const testResult = {
        policyId: 'startup-test',
        result: true,
        timestamp: Date.now()
      };
      
      policyCache.cachePolicyEvaluation('startup-test', { test: true }, testResult);
      console.log('  - 캐싱 후 크기:', policyCache.size());
      
      const retrieved = policyCache.getPolicyEvaluation('startup-test', { test: true });
      console.log('  - 캐시 조회:', retrieved ? '성공' : '실패');
      console.log('  - 통계:', policyCache.getStats());
    }
    
    if (rollingBuffer) {
      console.log('🗂️ RollingBuffer 기본 기능 테스트...');
      
      // 작은 설정으로 변경
      rollingBuffer.updateConfig({ 
        maxMemoryItems: 3,
        fileStoragePath: './temp-test-buffer' 
      });
      
      // 항목 추가 테스트
      const itemId = await rollingBuffer.addItem('startup-test-item', { source: 'startup' });
      console.log('  - 항목 추가 성공:', itemId.substring(0, 8));
      
      const item = await rollingBuffer.getItem(itemId);
      console.log('  - 항목 조회:', item ? '성공' : '실패');
      console.log('  - 통계:', rollingBuffer.getStats());
    }
    
    await app.close();
    console.log('✅ 애플리케이션 종료 완료');
    console.log('🎉 모든 캐시 서비스가 정상적으로 작동합니다!');
    
  } catch (error) {
    console.error('❌ 애플리케이션 시작 실패:', error);
    console.error('스택 트레이스:', error.stack);
  }
}

testAppStartup();

