import { Module } from '@nestjs/common';
import { CommandRunnerModule } from 'nest-commander';
import { ProjectConfigService } from '../config/project-config.service';
import { CoreModule } from '../core/core.module';
import { ParserModule } from '../parser/parser.module';
import { ConfigCommand } from './commands/config.command';
import { HelpCommand } from './commands/help.command';
import { LogsCommand } from './commands/logs.command';
import { RunCommand } from './commands/run.command';
import { StatusCommand } from './commands/status.command';
import { ErrorHandlerService } from './services/error-handler.service';

@Module({
  imports: [CommandRunnerModule, ParserModule, CoreModule],
  controllers: [],
  providers: [
    RunCommand,
    StatusCommand,
    LogsCommand,
    HelpCommand,
    ConfigCommand,
    ProjectConfigService,
    ErrorHandlerService,
  ],
  exports: [
    RunCommand,
    StatusCommand,
    LogsCommand,
    HelpCommand,
    ConfigCommand,
    ProjectConfigService,
    ErrorHandlerService,
  ],
})
export class CliModule {}
