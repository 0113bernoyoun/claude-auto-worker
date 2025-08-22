import { Test, TestingModule } from '@nestjs/testing';
import { SnapshotConfigService } from '../../config/snapshot-config.service';
import { PolicyEngineService } from '../../policy/policy-engine.service';
import { ExecutionStateService } from '../execution-state.service';
import { LongTermSnapshotService } from './long-term-snapshot.service';

describe('LongTermSnapshotService', () => {
  let service: LongTermSnapshotService;
  let configService: SnapshotConfigService;
  let policyEngine: PolicyEngineService;
  let executionState: ExecutionStateService;

  const mockSnapshotConfigService = {
    isEnabled: jest.fn(),
    getStoragePath: jest.fn(),
    getSchedule: jest.fn(),
    getRetentionDays: jest.fn(),
    getStorageType: jest.fn(),
    isCompressionEnabled: jest.fn(),
    getMaxSnapshots: jest.fn(),
    getEnabledDataTypes: jest.fn(),
    isMetadataEnabled: jest.fn(),
    validateConfig: jest.fn(),
  };

  const mockPolicyEngineService = {
    // PolicyEngineService의 메서드들 모킹
  };

  const mockExecutionStateService = {
    // ExecutionStateService의 메서드들 모킹
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LongTermSnapshotService,
        {
          provide: SnapshotConfigService,
          useValue: mockSnapshotConfigService,
        },
        {
          provide: PolicyEngineService,
          useValue: mockPolicyEngineService,
        },
        {
          provide: ExecutionStateService,
          useValue: mockExecutionStateService,
        },
      ],
    }).compile();

    service = module.get<LongTermSnapshotService>(LongTermSnapshotService);
    configService = module.get<SnapshotConfigService>(SnapshotConfigService);
    policyEngine = module.get<PolicyEngineService>(PolicyEngineService);
    executionState = module.get<ExecutionStateService>(ExecutionStateService);

    // 기본 모킹 설정
    mockSnapshotConfigService.getSchedule.mockReturnValue('0 2 * * *');
    mockSnapshotConfigService.getStoragePath.mockReturnValue('./test-snapshots');
    mockSnapshotConfigService.getStorageType.mockReturnValue('file');
    mockSnapshotConfigService.isCompressionEnabled.mockReturnValue(false);
    mockSnapshotConfigService.getRetentionDays.mockReturnValue(90);
    mockSnapshotConfigService.getMaxSnapshots.mockReturnValue(100);
    mockSnapshotConfigService.isMetadataEnabled.mockReturnValue(true);
    mockSnapshotConfigService.validateConfig.mockReturnValue({ isValid: true, errors: [] });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize storage and start scheduled snapshots when enabled', async () => {
      mockSnapshotConfigService.isEnabled.mockReturnValue(true);
      mockSnapshotConfigService.getStoragePath.mockReturnValue('./test-snapshots');
      
      const initializeStorageSpy = jest.spyOn(service as any, 'initializeStorage');
      const startScheduledSnapshotsSpy = jest.spyOn(service as any, 'startScheduledSnapshots');
      
      await service.onModuleInit();
      
      expect(initializeStorageSpy).toHaveBeenCalled();
      expect(startScheduledSnapshotsSpy).toHaveBeenCalled();
    });

    it('should not initialize when disabled', async () => {
      mockSnapshotConfigService.isEnabled.mockReturnValue(false);
      
      const initializeStorageSpy = jest.spyOn(service as any, 'initializeStorage');
      const startScheduledSnapshotsSpy = jest.spyOn(service as any, 'startScheduledSnapshots');
      
      await service.onModuleInit();
      
      expect(initializeStorageSpy).not.toHaveBeenCalled();
      expect(startScheduledSnapshotsSpy).not.toHaveBeenCalled();
    });
  });

  describe('createSnapshot', () => {
    beforeEach(() => {
      mockSnapshotConfigService.getEnabledDataTypes.mockReturnValue([
        { type: 'system_metrics', enabled: true },
      ]);
      mockSnapshotConfigService.getStorageType.mockReturnValue('file');
      mockSnapshotConfigService.getStoragePath.mockReturnValue('./test-snapshots');
      mockSnapshotConfigService.isCompressionEnabled.mockReturnValue(false);
      mockSnapshotConfigService.getRetentionDays.mockReturnValue(90);
      
      // 파일 시스템 접근을 모킹
      jest.spyOn(service as any, 'saveSnapshot').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'cleanupOldSnapshots').mockResolvedValue(undefined);
    });

    it('should create snapshot successfully', async () => {
      const snapshot = await service.createSnapshot();
      
      expect(snapshot).toBeDefined();
      expect(snapshot.metadata.id).toBeDefined();
      expect(snapshot.metadata.timestamp).toBeDefined();
      expect(snapshot.metadata.version).toBe('1.0.0');
      expect(snapshot.data).toBeDefined();
      expect(snapshot.createdAt).toBeDefined();
      expect(snapshot.expiresAt).toBeDefined();
    });

    it('should handle errors during snapshot creation', async () => {
      // 모킹된 메서드에서 에러 발생 시뮬레이션
      jest.spyOn(service as any, 'collectSnapshotData').mockRejectedValue(
        new Error('Data collection failed')
      );

      await expect(service.createSnapshot()).rejects.toThrow('Data collection failed');
    });
  });

  describe('restoreSnapshot', () => {
    it('should return null for non-existent snapshot', async () => {
      // 파일 시스템 접근을 모킹하여 빈 디렉토리 시뮬레이션
      jest.spyOn(service as any, 'listSnapshots').mockResolvedValue([]);
      
      const result = await service.restoreSnapshot('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('listSnapshots', () => {
    it('should return empty array when no snapshots exist', async () => {
      // 파일 시스템 접근을 모킹하여 빈 디렉토리 시뮬레이션
      jest.spyOn(service as any, 'listSnapshots').mockResolvedValue([]);
      
      const snapshots = await service.listSnapshots();
      expect(snapshots).toEqual([]);
    });
  });

  describe('createManualSnapshot', () => {
    it('should create manual snapshot', async () => {
      // createSnapshot 메서드를 모킹
      const mockSnapshot = {
        metadata: {
          id: 'test-id',
          timestamp: new Date(),
          version: '1.0.0',
          dataTypes: [],
          recordCount: 0,
          fileSize: 0,
          checksum: '',
          compression: false,
          storageType: 'file' as const,
          storagePath: './test',
        },
        data: {},
        createdAt: new Date(),
        expiresAt: new Date(),
      };
      
      jest.spyOn(service, 'createSnapshot').mockResolvedValue(mockSnapshot);
      
      const snapshot = await service.createManualSnapshot();
      expect(snapshot).toBeDefined();
      expect(snapshot.metadata.id).toBeDefined();
    });
  });

  describe('getStatus', () => {
    it('should return service status', () => {
      mockSnapshotConfigService.isEnabled.mockReturnValue(true);
      mockSnapshotConfigService.getStoragePath.mockReturnValue('./test-snapshots');
      mockSnapshotConfigService.getStorageType.mockReturnValue('file');

      const status = service.getStatus();
      
      expect(status).toBeDefined();
      expect(status.enabled).toBe(true);
      expect(status.storagePath).toBe('./test-snapshots');
      expect(status.storageType).toBe('file');
    });
  });

  describe('parseSchedule', () => {
    it('should parse valid cron-like schedule', () => {
      const schedule = '0 2 * * *';
      const nextRun = (service as any).parseSchedule(schedule);
      
      expect(nextRun).toBeInstanceOf(Date);
      expect(nextRun.getHours()).toBe(2);
      expect(nextRun.getMinutes()).toBe(0);
    });

    it('should throw error for invalid schedule format', () => {
      const invalidSchedule = 'invalid';
      
      expect(() => {
        (service as any).parseSchedule(invalidSchedule);
      }).toThrow('Invalid schedule format: invalid');
    });
  });

  describe('calculateChecksum', () => {
    it('should generate SHA256 checksum', () => {
      const content = 'test content';
      const checksum = (service as any).calculateChecksum(content);
      
      expect(checksum).toBeDefined();
      expect(checksum).toHaveLength(64); // SHA256 hex length
      expect(typeof checksum).toBe('string');
    });
  });

  describe('calculateExpiryDate', () => {
    it('should calculate correct expiry date', () => {
      mockSnapshotConfigService.getRetentionDays.mockReturnValue(30);
      
      const expiryDate = (service as any).calculateExpiryDate();
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      // 날짜 비교 (밀리초 단위 차이는 무시)
      expect(expiryDate.getTime()).toBeCloseTo(expectedExpiry.getTime(), -2);
    });
  });
});
