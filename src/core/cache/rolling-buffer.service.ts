import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface RollingBufferConfig {
  enabled: boolean;
  maxMemoryItems: number;
  fileStoragePath: string;
  maxFileSize: number; // bytes
  cleanupInterval: number; // ms
  compressionEnabled: boolean;
}

export interface BufferItem<T = any> {
  id: string;
  data: T;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface RollingBufferStats {
  memoryItems: number;
  fileItems: number;
  totalItems: number;
  memorySize: number;
  fileSize: number;
  totalSize: number;
  evictions: number;
  fileWrites: number;
  fileReads: number;
}

@Injectable()
export class RollingBufferService<T = any> {
  private readonly logger = new Logger(RollingBufferService.name);
  private memoryBuffer: BufferItem<T>[] = [];
  private config: RollingBufferConfig;
  private stats = {
    evictions: 0,
    fileWrites: 0,
    fileReads: 0,
  };
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    // 기본 설정
    this.config = {
      enabled: true,
      maxMemoryItems: 100,
      fileStoragePath: './data/rolling-buffer',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      cleanupInterval: 5 * 60 * 1000, // 5분
      compressionEnabled: false,
    };

    this.initialize();
  }

  /**
   * 서비스 초기화
   */
  private async initialize(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.log('Rolling buffer is disabled');
      return;
    }

    try {
      // 파일 저장 디렉토리 생성
      await this.ensureDirectoryExists(this.config.fileStoragePath);
      
      // 정리 작업 시작
      this.startCleanupTimer();
      
      this.logger.log(`Rolling buffer initialized with maxMemoryItems: ${this.config.maxMemoryItems}`);
    } catch (error) {
      this.logger.error('Failed to initialize rolling buffer', error);
    }
  }

  /**
   * 디렉토리 존재 확인 및 생성
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * 정리 타이머 시작
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(async () => {
      await this.performCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 정리 작업 수행
   */
  private async performCleanup(): Promise<void> {
    try {
      this.logger.debug('Performing rolling buffer cleanup');
      
      // 오래된 파일 정리
      await this.cleanupOldFiles();
      
      // 메모리 버퍼 크기 조정
      this.adjustMemoryBuffer();
      
    } catch (error) {
      this.logger.error('Cleanup failed', error);
    }
  }

  /**
   * 오래된 파일 정리
   */
  private async cleanupOldFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.fileStoragePath);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24시간

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = join(this.config.fileStoragePath, file);
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtime.getTime() > maxAge) {
            await fs.unlink(filePath);
            this.logger.debug(`Cleaned up old file: ${file}`);
          }
        }
      }
    } catch (error) {
      this.logger.error('File cleanup failed', error);
    }
  }

  /**
   * 메모리 버퍼 크기 조정
   */
  private adjustMemoryBuffer(): void {
    if (this.memoryBuffer.length > this.config.maxMemoryItems) {
      const itemsToRemove = this.memoryBuffer.length - this.config.maxMemoryItems;
      const removedItems = this.memoryBuffer.splice(0, itemsToRemove);
      
      this.stats.evictions += removedItems.length;
      this.logger.debug(`Adjusted memory buffer, removed ${itemsToRemove} items`);
    }
  }

  /**
   * 항목 추가
   */
  async addItem(data: T, metadata?: Record<string, any>): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Rolling buffer is disabled');
    }

    const item: BufferItem<T> = {
      id: this.generateItemId(data, metadata),
      data,
      timestamp: Date.now(),
      metadata,
    };

    // 메모리 버퍼에 추가
    this.memoryBuffer.push(item);

    // 메모리 버퍼 크기 초과 시 파일로 롤링
    if (this.memoryBuffer.length > this.config.maxMemoryItems) {
      await this.rollToFile();
    }

    this.logger.debug(`Added item to rolling buffer: ${item.id}`);
    return item.id;
  }

  /**
   * 항목 ID 생성
   */
  private generateItemId(data: T, metadata?: Record<string, any>): string {
    const content = JSON.stringify({ data, metadata, timestamp: Date.now() });
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * 메모리에서 파일로 롤링
   */
  private async rollToFile(): Promise<void> {
    try {
      // 가장 오래된 항목들을 파일로 저장
      const itemsToRoll = this.memoryBuffer.splice(0, Math.floor(this.config.maxMemoryItems / 2));
      
      if (itemsToRoll.length === 0) return;

      const filename = `buffer-${Date.now()}.json`;
      const filePath = join(this.config.fileStoragePath, filename);
      
      const fileContent = {
        items: itemsToRoll,
        timestamp: Date.now(),
        count: itemsToRoll.length,
      };

      await fs.writeFile(filePath, JSON.stringify(fileContent, null, 2));
      this.stats.fileWrites++;
      
      this.logger.debug(`Rolled ${itemsToRoll.length} items to file: ${filename}`);
    } catch (error) {
      this.logger.error('Failed to roll items to file', error);
      // 롤링 실패 시 메모리 버퍼에 다시 추가
      const itemsToRoll = this.memoryBuffer.splice(0, Math.floor(this.config.maxMemoryItems / 2));
      this.memoryBuffer.unshift(...itemsToRoll);
      this.logger.debug(`Rollback ${itemsToRoll.length} items to memory buffer due to file write failure`);
    }
  }

  /**
   * 항목 조회
   */
  async getItem(id: string): Promise<BufferItem<T> | null> {
    if (!this.config.enabled) {
      return null;
    }

    // 메모리 버퍼에서 검색
    const memoryItem = this.memoryBuffer.find(item => item.id === id);
    if (memoryItem) {
      return memoryItem;
    }

    // 파일에서 검색
    const fileItem = await this.getItemFromFile(id);
    if (fileItem) {
      this.stats.fileReads++;
      return fileItem;
    }

    return null;
  }

  /**
   * 파일에서 항목 조회
   */
  private async getItemFromFile(id: string): Promise<BufferItem<T> | null> {
    try {
      const files = await fs.readdir(this.config.fileStoragePath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = join(this.config.fileStoragePath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const fileData = JSON.parse(content);
          
          const item = fileData.items?.find((item: BufferItem<T>) => item.id === id);
          if (item) {
            return item;
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to read item from file', error);
    }

    return null;
  }

  /**
   * 최근 항목들 조회
   */
  async getRecentItems(limit: number = 10): Promise<BufferItem<T>[]> {
    if (!this.config.enabled) {
      return [];
    }

    // 메모리 버퍼에서 최근 항목들 반환 (시간순 정렬)
    return this.memoryBuffer
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * 특정 시간 범위의 항목들 조회
   */
  async getItemsByTimeRange(startTime: number, endTime: number): Promise<BufferItem<T>[]> {
    if (!this.config.enabled) {
      return [];
    }

    const items: BufferItem<T>[] = [];

    // 메모리 버퍼에서 검색
    const memoryItems = this.memoryBuffer.filter(
      item => item.timestamp >= startTime && item.timestamp <= endTime
    );
    items.push(...memoryItems);

    // 파일에서도 검색 (간단한 구현)
    try {
      const files = await fs.readdir(this.config.fileStoragePath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = join(this.config.fileStoragePath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const fileData = JSON.parse(content);
          
          const fileItems = fileData.items?.filter(
            (item: BufferItem<T>) => item.timestamp >= startTime && item.timestamp <= endTime
          ) || [];
          
          items.push(...fileItems);
        }
      }
    } catch (error) {
      this.logger.error('Failed to read items from files', error);
    }

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config: Partial<RollingBufferConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.config.enabled && !this.cleanupTimer) {
      this.initialize();
    } else if (!this.config.enabled && this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    this.logger.log(`Rolling buffer config updated: ${JSON.stringify(this.config)}`);
  }

  /**
   * 통계 조회
   */
  getStats(): RollingBufferStats {
    const memorySize = this.calculateMemorySize();
    const fileSize = this.calculateFileSize();
    
    return {
      memoryItems: this.memoryBuffer.length,
      fileItems: 0, // 파일 항목 수는 동적으로 계산해야 함
      totalItems: this.memoryBuffer.length,
      memorySize,
      fileSize,
      totalSize: memorySize + fileSize,
      evictions: this.stats.evictions,
      fileWrites: this.stats.fileWrites,
      fileReads: this.stats.fileReads,
    };
  }

  /**
   * 메모리 크기 계산
   */
  private calculateMemorySize(): number {
    return this.memoryBuffer.reduce((size, item) => {
      return size + JSON.stringify(item).length;
    }, 0);
  }

  /**
   * 파일 크기 계산
   */
  private calculateFileSize(): number {
    // 간단한 구현: 실제로는 파일 시스템에서 계산해야 함
    return 0;
  }

  /**
   * 메모리 버퍼 비우기
   */
  clearMemory(): void {
    this.memoryBuffer = [];
    this.stats.evictions = 0;
    this.logger.log('Memory buffer cleared');
  }

  /**
   * 모든 데이터 비우기
   */
  async clearAll(): Promise<void> {
    this.clearMemory();
    
    try {
      const files = await fs.readdir(this.config.fileStoragePath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = join(this.config.fileStoragePath, file);
          await fs.unlink(filePath);
        }
      }
      this.logger.log('All rolling buffer data cleared');
    } catch (error) {
      this.logger.error('Failed to clear file data', error);
    }
  }

  /**
   * 서비스 정리
   */
  async onModuleDestroy(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    // 메모리 버퍼를 파일로 저장
    if (this.memoryBuffer.length > 0) {
      await this.rollToFile();
    }
  }
}
