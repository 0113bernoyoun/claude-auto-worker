import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    controller = module.get<AppController>(AppController);
    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHello', () => {
    it('should return hello message from service', () => {
      const expectedMessage = 'Claude Auto Worker API에 오신 것을 환영합니다! 🚀';
      jest.spyOn(service, 'getHello').mockReturnValue(expectedMessage);
      
      const result = controller.getHello();
      
      expect(service.getHello).toHaveBeenCalled();
      expect(result).toBe(expectedMessage);
    });
  });

  describe('getHealth', () => {
    it('should return health status from service', () => {
      const expectedHealth = {
        status: 'healthy',
        timestamp: '2025-08-17T14:49:06.242Z'
      };
      jest.spyOn(service, 'getHealth').mockReturnValue(expectedHealth);
      
      const result = controller.getHealth();
      
      expect(service.getHealth).toHaveBeenCalled();
      expect(result).toEqual(expectedHealth);
    });
  });
});
