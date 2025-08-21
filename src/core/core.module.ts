import { Module } from '@nestjs/common';
import { LoggingConfigService } from '../config/logging-config.service';
import { ProjectConfigService } from '../config/project-config.service';
import { GitService } from '../git/git.service';
import { GIT_BASE_DIR } from '../git/git.tokens';
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
    GitService,
    {
      provide: GIT_BASE_DIR,
      useFactory: () => process.env.GIT_BASE_DIR || process.cwd(),
    },
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
    GitService,
  ],
})
export class CoreModule {}
