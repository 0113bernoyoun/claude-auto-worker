import { Module } from '@nestjs/common';
import { CommandRunnerModule } from 'nest-commander';
import { ProjectConfigService } from '../config/project-config.service';
import { ConfigCommand } from './commands/config.command';
import { HelpCommand } from './commands/help.command';
import { LogsCommand } from './commands/logs.command';
import { RunCommand } from './commands/run.command';
import { StatusCommand } from './commands/status.command';

@Module({
  imports: [CommandRunnerModule],
  controllers: [],
  providers: [
    RunCommand,
    StatusCommand,
    LogsCommand,
    HelpCommand,
    ConfigCommand,
    ProjectConfigService,
  ],
  exports: [
    RunCommand,
    StatusCommand,
    LogsCommand,
    HelpCommand,
    ConfigCommand,
    ProjectConfigService,
  ],
})
export class CliModule {}
