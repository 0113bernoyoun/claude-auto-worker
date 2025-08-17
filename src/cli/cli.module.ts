import { Module } from '@nestjs/common';
import { CommandRunnerModule } from 'nest-commander';

@Module({
  imports: [CommandRunnerModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class CliModule {}
