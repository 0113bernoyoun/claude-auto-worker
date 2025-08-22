import { Module } from '@nestjs/common';
import { LoggingConfigService } from './logging-config.service';
import { ProjectConfigService } from './project-config.service';
import { SnapshotConfigService } from './snapshot-config.service';

@Module({
  providers: [
    LoggingConfigService,
    ProjectConfigService,
    SnapshotConfigService,
  ],
  exports: [
    LoggingConfigService,
    ProjectConfigService,
    SnapshotConfigService,
  ],
})
export class ConfigModule {}
