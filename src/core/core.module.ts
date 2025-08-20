import { Module } from '@nestjs/common';
import { ExecutionStateService } from './execution-state.service';
import { WorkflowExecutorService } from './workflow-executor.service';
import { LoggerContextService } from './logger-context.service';
import { FileLoggerService } from './file-logger.service';
import { CommandRunnerService } from './command-runner.service';

@Module({
  imports: [],
  controllers: [],
  providers: [ExecutionStateService, WorkflowExecutorService, LoggerContextService, FileLoggerService, CommandRunnerService],
  exports: [ExecutionStateService, WorkflowExecutorService, LoggerContextService, FileLoggerService, CommandRunnerService],
})
export class CoreModule {}
