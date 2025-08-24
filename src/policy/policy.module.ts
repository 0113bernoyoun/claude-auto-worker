import { Module } from '@nestjs/common';
import { PolicyEngineService } from './policy-engine.service';
import { PolicyManagementService } from './policy-management.service';
import { PolicyValidationService } from './policy-validation.service';
import { PolicyController } from './policy.controller';
import { PolicyCacheService } from './services/policy-cache.service';
import { PolicyRollbackService } from './services/policy-rollback.service';
import { PolicyVersionService } from './services/policy-version.service';

@Module({
  controllers: [PolicyController],
  providers: [
    PolicyEngineService,
    PolicyValidationService,
    PolicyManagementService,
    PolicyCacheService,
    PolicyVersionService,
    PolicyRollbackService,
  ],
  exports: [
    PolicyEngineService,
    PolicyValidationService,
    PolicyManagementService,
    PolicyCacheService,
    PolicyVersionService,
    PolicyRollbackService,
  ],
})
export class PolicyModule {}
