import { Module } from '@nestjs/common';
import { CommandRunnerModule } from 'nest-commander';
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
  ],
  exports: [
    RunCommand,
    StatusCommand,
    LogsCommand,
    HelpCommand,
  ],
})
export class CliModule {}
