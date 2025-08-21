import { Module } from '@nestjs/common';
import { LoggingConfigService } from '../config/logging-config.service';
import { ProjectConfigService } from '../config/project-config.service';
import { ParserModule } from '../parser/parser.module';
import { CommandRunnerService } from './command-runner.service';
import { EnhancedLogParserService } from './enhanced-log-parser.service';
import { ExecutionStateService } from './execution-state.service';
import { FileLoggerService } from './file-logger.service';
import { LoggerContextService } from './logger-context.service';
import { WorkflowExecutorService } from './workflow-executor.service';
import { WorkflowStateTrackerService } from './workflow-state-tracker.service';

@Module({
  imports: [ParserModule],
  providers: [
    ExecutionStateService,
    FileLoggerService,
    LoggerContextService,
    WorkflowExecutorService,
    CommandRunnerService,
    WorkflowStateTrackerService,
    EnhancedLogParserService,
    LoggingConfigService,
    ProjectConfigService,
  ],
  exports: [
    ExecutionStateService,
    FileLoggerService,
    LoggerContextService,
    WorkflowExecutorService,
    CommandRunnerService,
    WorkflowStateTrackerService,
    EnhancedLogParserService,
    LoggingConfigService,
    ProjectConfigService,
  ],
})
export class CoreModule {}
