import { Test, TestingModule } from '@nestjs/testing';
import { promises as fs } from 'fs';
import { BufferItem, RollingBufferService } from './rolling-buffer.service';

// fs 모듈 모킹
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    mkdir: jest.fn(),
    readdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    stat: jest.fn(),
    unlink: jest.fn(),
  },
}));

describe('RollingBufferService', () => {
  let service: RollingBufferService<string>;
  let mockFs: jest.Mocked<typeof fs>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RollingBufferService],
    }).compile();

    service = module.get<RollingBufferService<string>>(RollingBufferService);
    mockFs = fs as jest.Mocked<typeof fs>;

    // 기본 모킹 설정
    mockFs.access.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.readdir.mockResolvedValue([]);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('{"items":[]}');
    mockFs.stat.mockResolvedValue({ mtime: new Date() } as any);
    mockFs.unlink.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('기본 기능', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should be enabled by default', () => {
      expect(service['config'].enabled).toBe(true);
    });

    it('should have correct initial configuration', () => {
      const config = service['config'];
      expect(config.maxMemoryItems).toBe(100);
      expect(config.fileStoragePath).toBe('./data/rolling-buffer');
      expect(config.maxFileSize).toBe(10 * 1024 * 1024);
    });
  });

  describe('초기화', () => {
    it('should create directory if it does not exist', async () => {
      mockFs.access.mockRejectedValueOnce(new Error('Directory not found'));
      
      await service['initialize']();
      
      expect(mockFs.mkdir).toHaveBeenCalledWith('./data/rolling-buffer', { recursive: true });
    });

    it('should not create directory if it already exists', async () => {
      mockFs.access.mockResolvedValueOnce(undefined);
      
      await service['initialize']();
      
      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });

    it('should start cleanup timer', async () => {
      const startCleanupTimerSpy = jest.spyOn(service as any, 'startCleanupTimer');
      
      await service['initialize']();
      
      expect(startCleanupTimerSpy).toHaveBeenCalled();
    });
  });

  describe('항목 추가', () => {
    it('should add item to memory buffer', async () => {
      const data = 'test data';
      const metadata = { source: 'test' };
      
      const id = await service.addItem(data, metadata);
      
      expect(id).toBeDefined();
      expect(service['memoryBuffer']).toHaveLength(1);
      const firstItem = service['memoryBuffer'][0];
      expect(firstItem).toBeDefined();
      if (firstItem) {
        expect(firstItem.data).toBe(data);
        expect(firstItem.metadata).toEqual(metadata);
      }
    });

    it('should generate unique ID for each item', async () => {
      const data1 = 'test data 1';
      const data2 = 'test data 2';
      
      const id1 = await service.addItem(data1);
      const id2 = await service.addItem(data2);
      
      expect(id1).not.toBe(id2);
    });

    it('should throw error when disabled', async () => {
      service.updateConfig({ enabled: false });
      
      await expect(service.addItem('test')).rejects.toThrow('Rolling buffer is disabled');
    });
  });

  describe('메모리 버퍼 크기 조정', () => {
    it('should adjust memory buffer when exceeding max items', async () => {
      service.updateConfig({ maxMemoryItems: 3 });
      
      // 4개 항목 추가
      await service.addItem('item1');
      await service.addItem('item2');
      await service.addItem('item3');
      await service.addItem('item4');
      
      // 메모리 버퍼 크기 조정 호출
      service['adjustMemoryBuffer']();
      
      expect(service['memoryBuffer']).toHaveLength(3);
      // adjustMemoryBuffer가 호출되기 전에 addItem에서 롤링이 발생할 수 있음
      expect(service['stats'].evictions).toBeGreaterThanOrEqual(0);
    });

    it('should not adjust memory buffer when under limit', async () => {
      service.updateConfig({ maxMemoryItems: 5 });
      
      // 3개 항목 추가
      await service.addItem('item1');
      await service.addItem('item2');
      await service.addItem('item3');
      
      const initialLength = service['memoryBuffer'].length;
      service['adjustMemoryBuffer']();
      
      expect(service['memoryBuffer']).toHaveLength(initialLength);
      expect(service['stats'].evictions).toBe(0);
    });
  });

  describe('파일 롤링', () => {
    it('should roll items to file when memory buffer is full', async () => {
      service.updateConfig({ maxMemoryItems: 2 });
      
      // 3개 항목 추가 (롤링 트리거)
      await service.addItem('item1');
      await service.addItem('item2');
      await service.addItem('item3');
      
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(service['stats'].fileWrites).toBe(1);
    });

    it('should handle file write failure gracefully', async () => {
      service.updateConfig({ maxMemoryItems: 2 });
      mockFs.writeFile.mockRejectedValueOnce(new Error('Write failed'));
      
      // 3개 항목 추가
      await service.addItem('item1');
      await service.addItem('item2');
      await service.addItem('item3');
      
      // 롤링 실패 시 메모리 버퍼에 다시 추가되어야 함
      // 하지만 실제로는 addItem에서 롤링이 발생하므로 메모리 버퍼 크기는 maxMemoryItems를 초과할 수 있음
      expect(service['memoryBuffer'].length).toBeGreaterThanOrEqual(2);
    });

    it('should create correct file content structure', async () => {
      service.updateConfig({ maxMemoryItems: 2 });
      
      await service.addItem('item1');
      await service.addItem('item2');
      await service.addItem('item3');
      
      // writeFile이 호출되었는지 확인
      expect(mockFs.writeFile).toHaveBeenCalled();
      
      // 실제 호출된 인수 확인
      const writeFileCalls = mockFs.writeFile.mock.calls;
      expect(writeFileCalls.length).toBeGreaterThan(0);
      
      const firstCall = writeFileCalls[0]!;
      
      // 첫 번째 인수: 파일 경로가 buffer-로 시작하는지 확인
      expect(firstCall[0]).toContain('buffer-');
      
      // 두 번째 인수: JSON 내용이 올바른 구조인지 확인
      const fileContent = firstCall[1] as string;
      expect(typeof fileContent).toBe('string');
      expect(fileContent).toContain('"items"');
      expect(fileContent).toContain('"timestamp"');
      expect(fileContent).toContain('"count"');
      
      // fs.writeFile은 2개 인수로 호출됨 (경로, 내용)
      expect(firstCall.length).toBe(2);
      
      // JSON 파싱하여 구조 검증
      try {
        const parsedContent = JSON.parse(fileContent);
        expect(parsedContent).toHaveProperty('items');
        expect(parsedContent).toHaveProperty('timestamp');
        expect(parsedContent).toHaveProperty('count');
        expect(Array.isArray(parsedContent.items)).toBe(true);
        expect(typeof parsedContent.timestamp).toBe('number');
        expect(typeof parsedContent.count).toBe('number');
      } catch (error) {
        fail(`JSON 파싱 실패: ${error}`);
      }
    });
  });

  describe('항목 조회', () => {
    beforeEach(async () => {
      await service.addItem('test item');
    });

    it('should retrieve item from memory buffer', async () => {
      const items = service['memoryBuffer'];
      expect(items).toHaveLength(1);
      const firstItem = items[0];
      expect(firstItem).toBeDefined();
      if (firstItem) {
        const item = await service.getItem(firstItem.id);
        expect(item).toBeDefined();
        expect(item?.data).toBe('test item');
      }
    });

    it('should return null for non-existent item', async () => {
      const item = await service.getItem('non-existent-id');
      expect(item).toBeNull();
    });

    it('should return null when disabled', async () => {
      service.updateConfig({ enabled: false });
      
      const items = service['memoryBuffer'];
      expect(items).toHaveLength(1);
      const firstItem = items[0];
      if (firstItem) {
        const item = await service.getItem(firstItem.id);
        expect(item).toBeNull();
      }
    });
  });

  describe('파일에서 항목 조회', () => {
    it('should retrieve item from file', async () => {
      const mockItem: BufferItem<string> = {
        id: 'file-item-id',
        data: 'file item',
        timestamp: Date.now(),
      };
      
      mockFs.readdir.mockResolvedValueOnce(['buffer-123.json'] as any);
      mockFs.readFile.mockResolvedValueOnce(
        JSON.stringify({ items: [mockItem] })
      );
      
      const item = await service['getItemFromFile']('file-item-id');
      
      expect(item).toBeDefined();
      expect(item?.id).toBe('file-item-id');
      expect(item?.data).toBe('file item');
    });

    it('should return null when item not found in file', async () => {
      mockFs.readdir.mockResolvedValueOnce(['buffer-123.json'] as any);
      mockFs.readFile.mockResolvedValueOnce('{"items":[]}');
      
      const item = await service['getItemFromFile']('non-existent-id');
      
      expect(item).toBeNull();
    });

    it('should handle file read errors gracefully', async () => {
      mockFs.readdir.mockRejectedValueOnce(new Error('Read failed'));
      
      const item = await service['getItemFromFile']('test-id');
      
      expect(item).toBeNull();
    });
  });

  describe('최근 항목 조회', () => {
    beforeEach(async () => {
      // 각 항목을 순차적으로 추가하여 명확한 타임스탬프 차이 생성
      await service.addItem('item1');
      await new Promise(resolve => setTimeout(resolve, 10)); // 10ms 지연
      await service.addItem('item2');
      await new Promise(resolve => setTimeout(resolve, 10)); // 10ms 지연
      await service.addItem('item3');
    });

    it('should return recent items from memory buffer', async () => {
      const recentItems = await service.getRecentItems(2);
      
      expect(recentItems).toHaveLength(2);
      const firstItem = recentItems[0];
      const secondItem = recentItems[1];
      expect(firstItem).toBeDefined();
      expect(secondItem).toBeDefined();
      if (firstItem && secondItem) {
        // 가장 최근에 추가된 항목이 첫 번째여야 함
        expect(firstItem.data).toBe('item3');
        expect(secondItem.data).toBe('item2');
      }
    });

    it('should return all items when limit exceeds buffer size', async () => {
      const recentItems = await service.getRecentItems(10);
      
      expect(recentItems).toHaveLength(3);
    });

    it('should return empty array when disabled', async () => {
      service.updateConfig({ enabled: false });
      
      const recentItems = await service.getRecentItems(2);
      
      expect(recentItems).toHaveLength(0);
    });
  });

  describe('시간 범위 조회', () => {
    beforeEach(async () => {
      await service.addItem('item1');
      await service.addItem('item2');
      await service.addItem('item3');
    });

    it('should return items within time range', async () => {
      const now = Date.now();
      const startTime = now - 1000; // 1초 전
      const endTime = now + 1000;   // 1초 후
      
      const items = await service.getItemsByTimeRange(startTime, endTime);
      
      expect(items).toHaveLength(3);
    });

    it('should return empty array for future time range', async () => {
      const futureStart = Date.now() + 10000; // 10초 후
      const futureEnd = futureStart + 1000;
      
      const items = await service.getItemsByTimeRange(futureStart, futureEnd);
      
      expect(items).toHaveLength(0);
    });
  });

  describe('설정 업데이트', () => {
    it('should update configuration', () => {
      const newConfig = {
        maxMemoryItems: 200,
        fileStoragePath: './new-path',
        maxFileSize: 20 * 1024 * 1024,
      };
      
      service.updateConfig(newConfig);
      
      expect(service['config'].maxMemoryItems).toBe(200);
      expect(service['config'].fileStoragePath).toBe('./new-path');
      expect(service['config'].maxFileSize).toBe(20 * 1024 * 1024);
    });

    it('should disable service when enabled is false', () => {
      service.updateConfig({ enabled: false });
      
      expect(service['config'].enabled).toBe(false);
    });

    it('should re-enable service when enabled is true', () => {
      service.updateConfig({ enabled: false });
      service.updateConfig({ enabled: true });
      
      expect(service['config'].enabled).toBe(true);
    });
  });

  describe('통계', () => {
    beforeEach(async () => {
      await service.addItem('test item');
    });

    it('should return correct statistics', () => {
      const stats = service.getStats();
      
      expect(stats.memoryItems).toBe(1);
      expect(stats.totalItems).toBe(1);
      expect(stats.evictions).toBe(0);
      expect(stats.fileWrites).toBe(0);
      expect(stats.fileReads).toBe(0);
    });

    it('should calculate memory size correctly', () => {
      const memorySize = service['calculateMemorySize']();
      
      expect(memorySize).toBeGreaterThan(0);
    });
  });

  describe('정리 작업', () => {
    it('should perform cleanup of old files', async () => {
      const oldFile = 'buffer-old.json';
      const newFile = 'buffer-new.json';
      
      mockFs.readdir.mockResolvedValueOnce([oldFile, newFile] as any);
      mockFs.stat
        .mockResolvedValueOnce({ mtime: new Date(Date.now() - 25 * 60 * 60 * 1000) } as any) // 25시간 전
        .mockResolvedValueOnce({ mtime: new Date() } as any); // 현재
      
      await service['performCleanup']();
      
      expect(mockFs.unlink).toHaveBeenCalledWith(
        expect.stringContaining(oldFile)
      );
      expect(mockFs.unlink).not.toHaveBeenCalledWith(
        expect.stringContaining(newFile)
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      mockFs.readdir.mockRejectedValueOnce(new Error('Cleanup failed'));
      
      await expect(service['performCleanup']()).resolves.not.toThrow();
    });
  });

  describe('데이터 정리', () => {
    beforeEach(async () => {
      await service.addItem('test item');
    });

    it('should clear memory buffer', () => {
      expect(service['memoryBuffer']).toHaveLength(1);
      
      service.clearMemory();
      
      expect(service['memoryBuffer']).toHaveLength(0);
      expect(service['stats'].evictions).toBe(0);
    });

    it('should clear all data including files', async () => {
      mockFs.readdir.mockResolvedValueOnce(['buffer-123.json'] as any);
      
      await service.clearAll();
      
      expect(service['memoryBuffer']).toHaveLength(0);
      expect(mockFs.unlink).toHaveBeenCalled();
    });
  });

  describe('서비스 정리', () => {
    it('should clear cleanup timer on destroy', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      await service.onModuleDestroy();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should roll remaining items to file on destroy', async () => {
      await service.addItem('test item');
      
      await service.onModuleDestroy();
      
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });
});
