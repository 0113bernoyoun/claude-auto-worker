import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CliModule } from './cli/cli.module';
import { ConfigModule } from './config/config.module';
import { CoreModule } from './core/core.module';
import { SnapshotModule } from './core/snapshot/snapshot.module';
import { LogsController } from './logs.controller';
import { ParserModule } from './parser/parser.module';
import { PolicyModule } from './policy/policy.module';
import { StatusController } from './status.controller';
import { WorkflowManagementModule } from './workflow-management/workflow-management.module';

@Module({
  imports: [
    ConfigModule,
    CoreModule,
    CliModule,
    ParserModule,
    PolicyModule,
    SnapshotModule,
    WorkflowManagementModule,
  ],
  controllers: [AppController, StatusController, LogsController],
  providers: [AppService],
})
export class AppModule {}
