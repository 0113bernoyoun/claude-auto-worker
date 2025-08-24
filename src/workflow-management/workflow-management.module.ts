import { Module } from '@nestjs/common';
import { WorkflowRepositoryService } from './services/workflow-repository.service';
import { WorkflowSharingService } from './services/workflow-sharing.service';
import { WorkflowCollaborationService } from './services/workflow-collaboration.service';
import { WorkflowManagementController } from './workflow-management.controller';

@Module({
  providers: [
    WorkflowRepositoryService,
    WorkflowSharingService,
    WorkflowCollaborationService,
  ],
  controllers: [WorkflowManagementController],
  exports: [
    WorkflowRepositoryService,
    WorkflowSharingService,
    WorkflowCollaborationService,
  ],
})
export class WorkflowManagementModule {}
