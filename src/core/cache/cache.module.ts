import { Module } from '@nestjs/common';
import { PolicyCacheService } from './policy-cache.service';
import { RollingBufferService } from './rolling-buffer.service';

@Module({
  providers: [PolicyCacheService, RollingBufferService],
  exports: [PolicyCacheService, RollingBufferService],
})
export class CacheModule {}

