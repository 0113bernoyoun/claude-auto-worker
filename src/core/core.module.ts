import { Module } from '@nestjs/common';
import { ParserModule } from '../parser/parser.module';
import { CommandRunnerService } from './command-runner.service';
import { ExecutionStateService } from './execution-state.service';
import { FileLoggerService } from './file-logger.service';
import { LoggerContextService } from './logger-context.service';
import { WorkflowExecutorService } from './workflow-executor.service';

@Module({
  imports: [ParserModule],
  controllers: [],
  providers: [ExecutionStateService, WorkflowExecutorService, LoggerContextService, FileLoggerService, CommandRunnerService],
  exports: [ExecutionStateService, WorkflowExecutorService, LoggerContextService, FileLoggerService, CommandRunnerService],
})
export class CoreModule {}
