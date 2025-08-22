import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { SnapshotModule } from '../core/snapshot/snapshot.module';
import { ParserModule } from '../parser/parser.module';
import { ConfigCommand } from './commands/config.command';
import { EnhancedLogsCommand } from './commands/enhanced-logs.command';
import { EnhancedStatusCommand } from './commands/enhanced-status.command';
import { HelpCommand } from './commands/help.command';
import { LogsCommand } from './commands/logs.command';
import { RunCommand } from './commands/run.command';
import { SnapshotCommand } from './commands/snapshot.command';
import { StatusCommand } from './commands/status.command';
import { ErrorHandlerService } from './services/error-handler.service';

@Module({
  imports: [CoreModule, ParserModule, SnapshotModule],
  providers: [
    HelpCommand,
    RunCommand,
    StatusCommand,
    LogsCommand,
    ConfigCommand,
    EnhancedStatusCommand,
    EnhancedLogsCommand,
    SnapshotCommand,
    ErrorHandlerService,
  ],
})
export class CliModule {}
