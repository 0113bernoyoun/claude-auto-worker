import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('should return welcome message', () => {
      const result = service.getHello();
      expect(result).toBe('Claude Auto Worker API에 오신 것을 환영합니다! 🚀');
    });
  });

  describe('getHealth', () => {
    it('should return health status with timestamp', () => {
      const result = service.getHealth();
      
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result.status).toBe('healthy');
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });

    it('should return current timestamp', () => {
      const before = new Date();
      const result = service.getHealth();
      const after = new Date();
      
      const resultTime = new Date(result.timestamp);
      expect(resultTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(resultTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
