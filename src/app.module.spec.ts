import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';

describe('AppModule', () => {
  let module: AppModule;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    module = moduleRef.get<AppModule>(AppModule);
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have AppController', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const controller = moduleRef.get<AppController>(AppController);
    expect(controller).toBeDefined();
  });

  it('should have AppService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const service = moduleRef.get<AppService>(AppService);
    expect(service).toBeDefined();
  });

  it('should import ConfigModule', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const configModule = moduleRef.get(ConfigModule);
    expect(configModule).toBeDefined();
  });
});
