import { Module } from '@nestjs/common';
import { LoggingConfigService } from '../config/logging-config.service';
import { ProjectConfigService } from '../config/project-config.service';
import { CoreModule } from '../core/core.module';
import { ConfigCommand } from './commands/config.command';
import { HelpCommand } from './commands/help.command';
import { LogsCommand } from './commands/logs.command';
import { RunCommand } from './commands/run.command';
import { StatusCommand } from './commands/status.command';
import { ErrorHandlerService } from './services/error-handler.service';

@Module({
  imports: [CoreModule],
  providers: [
    ConfigCommand,
    HelpCommand,
    LogsCommand,
    RunCommand,
    StatusCommand,
    ErrorHandlerService,
    LoggingConfigService,
    ProjectConfigService,
  ],
  exports: [LoggingConfigService, ProjectConfigService],
})
export class CliModule {}
