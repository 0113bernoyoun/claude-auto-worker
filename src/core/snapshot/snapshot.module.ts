import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SnapshotConfigService } from '../../config/snapshot-config.service';
import { PolicyModule } from '../../policy/policy.module';
import { CoreModule } from '../core.module';
import { LongTermSnapshotService } from './long-term-snapshot.service';
import { SnapshotController } from './snapshot.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PolicyModule,
    CoreModule,
  ],
  controllers: [SnapshotController],
  providers: [
    LongTermSnapshotService,
    SnapshotConfigService,
  ],
  exports: [
    LongTermSnapshotService,
    SnapshotConfigService,
  ],
})
export class SnapshotModule {}
