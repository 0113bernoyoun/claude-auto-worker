import { Module } from '@nestjs/common';
import { LoggingConfigService } from '../config/logging-config.service';
import { ProjectConfigService } from '../config/project-config.service';
import { CoreModule } from '../core/core.module';
import { EnhancedLogParserService } from '../core/enhanced-log-parser.service';
import { WorkflowStateTrackerService } from '../core/workflow-state-tracker.service';
import { ParserModule } from '../parser/parser.module';
import { ConfigCommand } from './commands/config.command';
import { EnhancedLogsCommand } from './commands/enhanced-logs.command';
import { EnhancedStatusCommand } from './commands/enhanced-status.command';
import { HelpCommand } from './commands/help.command';
import { LogsCommand } from './commands/logs.command';
import { RunCommand } from './commands/run.command';
import { StatusCommand } from './commands/status.command';
import { ErrorHandlerService } from './services/error-handler.service';

@Module({
  imports: [CoreModule, ParserModule],
  providers: [
    ConfigCommand,
    HelpCommand,
    LogsCommand,
    RunCommand,
    StatusCommand,
    EnhancedLogsCommand,
    EnhancedStatusCommand,
    ErrorHandlerService,
    LoggingConfigService,
    ProjectConfigService,
    WorkflowStateTrackerService,
    EnhancedLogParserService,
  ],
  exports: [LoggingConfigService, ProjectConfigService],
})
export class CliModule {}
