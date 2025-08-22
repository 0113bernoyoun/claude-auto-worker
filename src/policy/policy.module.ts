import { Module } from '@nestjs/common';
import { PolicyEngineService } from './policy-engine.service';
import { PolicyManagementService } from './policy-management.service';
import { PolicyValidationService } from './policy-validation.service';
import { PolicyController } from './policy.controller';

@Module({
  controllers: [PolicyController],
  providers: [
    PolicyEngineService,
    PolicyValidationService,
    PolicyManagementService,
  ],
  exports: [
    PolicyEngineService,
    PolicyValidationService,
    PolicyManagementService,
  ],
})
export class PolicyModule {}
