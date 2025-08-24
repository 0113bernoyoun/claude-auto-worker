import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppModule } from './app.module';
import { AppService } from './app.service';
import { ProjectConfigService } from './config/project-config.service';

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

  it('should have ConfigService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const configService = moduleRef.get<ProjectConfigService>(ProjectConfigService);
    expect(configService).toBeDefined();
  });
});
