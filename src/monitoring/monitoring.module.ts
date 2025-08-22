import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { LogsController } from '../logs.controller';
import { StatusController } from '../status.controller';
import { MemoryWatchdogService } from './memory-watchdog.service';

@Module({
  imports: [CoreModule],
  controllers: [LogsController, StatusController],
  providers: [MemoryWatchdogService],
})
export class MonitoringModule {}



