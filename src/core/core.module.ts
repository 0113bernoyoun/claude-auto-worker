import { Module } from '@nestjs/common';
import { LoggingConfigService } from '../config/logging-config.service';
import { ParserModule } from '../parser/parser.module';
import { CommandRunnerService } from './command-runner.service';
import { ExecutionStateService } from './execution-state.service';
import { FileLoggerService } from './file-logger.service';
import { LoggerContextService } from './logger-context.service';
import { WorkflowExecutorService } from './workflow-executor.service';

@Module({
  imports: [ParserModule],
  providers: [
    CommandRunnerService,
    ExecutionStateService,
    FileLoggerService,
    LoggerContextService,
    WorkflowExecutorService,
    LoggingConfigService,
  ],
  exports: [
    CommandRunnerService,
    ExecutionStateService,
    FileLoggerService,
    LoggerContextService,
    WorkflowExecutorService,
    LoggingConfigService,
  ],
})
export class CoreModule {}
