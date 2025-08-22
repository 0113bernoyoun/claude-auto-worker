import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { LogsController } from '../logs.controller';
import { StatusController } from '../status.controller';

@Module({
  imports: [CoreModule],
  controllers: [LogsController, StatusController],
})
export class MonitoringModule {}



