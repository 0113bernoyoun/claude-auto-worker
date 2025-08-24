import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { GitService } from '../git/git.service';
import { CommandParserService } from '../parser/command.parser.service';
import { ClaudeTokenHealthService } from './claude-token-health.service';
import { CommandRunnerService } from './command-runner.service';
import { EnhancedLogParserService } from './enhanced-log-parser.service';
import { ExecutionStateService } from './execution-state.service';
import { FileLoggerService } from './file-logger.service';
import { LoggerContextService } from './logger-context.service';
import { WorkflowExecutorService } from './workflow-executor.service';
import { WorkflowStateTrackerService } from './workflow-state-tracker.service';

@Module({
  imports: [ConfigModule],
  providers: [
    WorkflowExecutorService,
    ExecutionStateService,
    CommandRunnerService,
    FileLoggerService,
    LoggerContextService,
    GitService,
    CommandParserService,
    ClaudeTokenHealthService,
    WorkflowStateTrackerService,
    EnhancedLogParserService,
  ],
  exports: [
    WorkflowExecutorService,
    ExecutionStateService,
    CommandRunnerService,
    FileLoggerService,
    LoggerContextService,
    ClaudeTokenHealthService,
    WorkflowStateTrackerService,
    EnhancedLogParserService,
    ConfigModule, // ConfigModule을 export하여 하위 모듈에서 사용할 수 있도록 함
  ],
})
export class CoreModule {}
