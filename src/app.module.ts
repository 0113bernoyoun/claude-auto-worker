import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from './core/core.module';
import { StatusController } from './status.controller';
import { LogsController } from './logs.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    CoreModule,
  ],
  controllers: [AppController, StatusController, LogsController],
  providers: [AppService],
})
export class AppModule {}
