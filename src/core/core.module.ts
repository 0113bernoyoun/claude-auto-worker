import { Module } from '@nestjs/common';
import { ExecutionStateService } from './execution-state.service';
import { WorkflowExecutorService } from './workflow-executor.service';

@Module({
  imports: [],
  controllers: [],
  providers: [ExecutionStateService, WorkflowExecutorService],
  exports: [ExecutionStateService, WorkflowExecutorService],
})
export class CoreModule {}
