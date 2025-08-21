import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_LOGGING_CONFIG } from '../../../src/config/logging-config.interface';
import { LoggingConfigService } from '../../../src/config/logging-config.service';

// fs 모듈 모킹
jest.mock('fs');
jest.mock('path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('LoggingConfigService', () => {
  let service: LoggingConfigService;
  let mockConfigPath: string;

  beforeEach(async () => {
    // 기본 모킹 설정
    mockConfigPath = '/test/config/logging-config.yaml';
    mockPath.join.mockReturnValue(mockConfigPath);
    mockPath.dirname.mockReturnValue('/test/config');
    
    // fs.existsSync 기본값
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockImplementation(() => undefined);
    mockFs.writeFileSync.mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingConfigService],
    }).compile();

    service = module.get<LoggingConfigService>(LoggingConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('기본 설정 로드', () => {
    it('should load default config when no config file exists', () => {
      const config = service.getConfig();
      expect(config).toEqual(DEFAULT_LOGGING_CONFIG);
    });

    it('should create config directory and save default config', () => {
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/config', { recursive: true });
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        mockConfigPath,
        expect.any(String),
        'utf-8'
      );
    });
  });

  describe('설정 파일 로드', () => {
    it('should load config from existing file', () => {
      const customConfig = {
        levels: { debug: false, info: true, warn: true, error: true },
        display: { defaultLines: 100 }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(`
        levels:
          debug: false
          info: true
          warn: true
          error: true
        display:
          defaultLines: 100
      `);

      // 서비스 재생성
      const module: TestingModule = Test.createTestingModule({
        providers: [LoggingConfigService],
      }).compile();
      const newService = module.get<LoggingConfigService>(LoggingConfigService);

      const config = newService.getConfig();
      expect(config.levels.debug).toBe(false);
      expect(config.levels.info).toBe(true);
      expect(config.display.defaultLines).toBe(100);
      expect(config.storage.enabled).toBe(true); // 기본값 유지
    });
  });

  describe('설정 업데이트', () => {
    it('should update config and save to file', () => {
      const updates = {
        levels: { debug: false },
        display: { defaultLines: 200 }
      };

      service.updateConfig(updates);
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        mockConfigPath,
        expect.any(String),
        'utf-8'
      );

      const config = service.getConfig();
      expect(config.levels.debug).toBe(false);
      expect(config.display.defaultLines).toBe(200);
    });
  });

  describe('로그 레벨 확인', () => {
    it('should check if specific log level is enabled', () => {
      expect(service.isLevelEnabled('debug')).toBe(true);
      expect(service.isLevelEnabled('info')).toBe(true);
      expect(service.isLevelEnabled('warn')).toBe(true);
      expect(service.isLevelEnabled('error')).toBe(true);
    });

    it('should handle case-insensitive level names', () => {
      expect(service.isLevelEnabled('DEBUG')).toBe(true);
      expect(service.isLevelEnabled('Info')).toBe(true);
    });
  });

  describe('저장 활성화 확인', () => {
    it('should check if storage is enabled', () => {
      expect(service.isStorageEnabled()).toBe(true);
    });
  });

  describe('설정 파일 경로', () => {
    it('should return config file path', () => {
      const configPath = service.getConfigPath();
      expect(configPath).toBe(mockConfigPath);
    });
  });

  describe('에러 처리', () => {
    it('should handle file read errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      // 에러가 발생해도 서비스는 정상 동작해야 함
      const config = service.getConfig();
      expect(config).toEqual(DEFAULT_LOGGING_CONFIG);
    });

    it('should handle file write errors gracefully', () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('File write error');
      });

      // 에러가 발생해도 서비스는 정상 동작해야 함
      expect(() => {
        service.updateConfig({ levels: { debug: false } });
      }).not.toThrow();
    });
  });
});
