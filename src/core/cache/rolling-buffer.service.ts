import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import * as zlib from 'zlib';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

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
  compressionRatio: number; // 압축 비율 추가
  compressedFiles: number;  // 압축된 파일 수 추가
  uncompressedFiles: number; // 압축되지 않은 파일 수 추가
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
      this.cleanupTimer = undefined; // 즉시 undefined로 설정
    }

    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
    
    // 타이머가 가비지 컬렉션되지 않도록 unref() 호출
    if (this.cleanupTimer && typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  /**
   * 정리 타이머 정지
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined; // 즉시 undefined로 설정
      this.logger.debug('Cleanup timer stopped');
    }
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
        if (file.endsWith('.json') || file.endsWith('.gz')) {
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

      const timestamp = Date.now();
      const filename = this.config.compressionEnabled ? 
        `buffer-${timestamp}.json.gz` : 
        `buffer-${timestamp}.json`;
      const filePath = join(this.config.fileStoragePath, filename);
      
      const fileContent = {
        items: itemsToRoll,
        timestamp,
        count: itemsToRoll.length,
        compressed: this.config.compressionEnabled,
      };

      if (this.config.compressionEnabled) {
        const compressedData = await this.compressData(fileContent);
        await fs.writeFile(filePath, compressedData);
      } else {
        await fs.writeFile(filePath, JSON.stringify(fileContent, null, 2));
      }
      
      this.stats.fileWrites++;
      this.logger.debug(`Rolled ${itemsToRoll.length} items to ${this.config.compressionEnabled ? 'compressed' : 'uncompressed'} file: ${filename}`);
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
        if (file.endsWith('.json') || file.endsWith('.gz')) {
          const filePath = join(this.config.fileStoragePath, file);
          
          if (file.endsWith('.gz')) {
            // 압축된 파일 처리
            return await this.getItemFromCompressedFile(id);
          } else {
            // 일반 JSON 파일 처리
            const content = await fs.readFile(filePath, 'utf-8');
            const fileData = JSON.parse(content);
            
            const item = fileData.items?.find((item: BufferItem<T>) => item.id === id);
            if (item) {
              return item;
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to read item from file', error);
    }

    return null;
  }

  /**
   * 데이터 압축
   */
  private async compressData(data: any): Promise<Buffer> {
    try {
      const jsonString = JSON.stringify(data);
      const compressed = await gzip(jsonString);
      this.logger.debug(`Data compressed: ${jsonString.length} -> ${compressed.length} bytes`);
      return compressed;
    } catch (error) {
      this.logger.warn('Failed to compress data, using uncompressed format:', error);
      return Buffer.from(JSON.stringify(data));
    }
  }

  /**
   * 데이터 압축 해제
   */
  private async decompressData(compressedData: Buffer): Promise<any> {
    try {
      const decompressed = await gunzip(compressedData);
      return JSON.parse(decompressed.toString());
    } catch (error) {
      this.logger.warn('Failed to decompress data, trying to parse as JSON:', error);
      try {
        return JSON.parse(compressedData.toString());
      } catch (parseError) {
        this.logger.error('Failed to parse data as JSON:', parseError);
        throw new Error('Data corruption detected');
      }
    }
  }

  /**
   * 압축된 파일에서 항목 조회
   */
  private async getItemFromCompressedFile(id: string): Promise<BufferItem<T> | null> {
    try {
      const files = await fs.readdir(this.config.fileStoragePath);
      
      for (const file of files) {
        if (file.endsWith('.gz')) {
          const filePath = join(this.config.fileStoragePath, file);
          const compressedContent = await fs.readFile(filePath);
          const fileData = await this.decompressData(compressedContent);
          
          const item = fileData.items?.find((item: BufferItem<T>) => item.id === id);
          if (item) {
            return item;
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to read item from compressed file:', error);
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
    try {
      // 설정 유효성 검사
      this.validateConfig(config);
      
      this.config = { ...this.config, ...config };
      
      if (this.config.enabled && !this.cleanupTimer) {
        this.initialize();
      } else if (!this.config.enabled && this.cleanupTimer) {
        this.stopCleanupTimer();
      }
      
      this.logger.log(`Rolling buffer config updated: ${JSON.stringify(this.config)}`);
    } catch (error) {
      this.logger.error('Failed to update rolling buffer config:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid rolling buffer configuration: ${errorMessage}`);
    }
  }

  /**
   * 설정 유효성 검사
   */
  private validateConfig(config: Partial<RollingBufferConfig>): void {
    if (config.maxMemoryItems !== undefined && config.maxMemoryItems <= 0) {
      throw new Error('maxMemoryItems must be greater than 0');
    }
    
    if (config.maxFileSize !== undefined && config.maxFileSize <= 0) {
      throw new Error('maxFileSize must be greater than 0');
    }
    
    if (config.cleanupInterval !== undefined && config.cleanupInterval <= 0) {
      throw new Error('cleanupInterval must be greater than 0');
    }
    
    if (config.maxMemoryItems !== undefined && config.maxMemoryItems > 10000) {
      this.logger.warn('maxMemoryItems is very high, this could cause memory issues');
    }
    
    if (config.maxFileSize !== undefined && config.maxFileSize > 100 * 1024 * 1024) { // 100MB
      this.logger.warn('maxFileSize is very high, this could cause disk space issues');
    }
  }

  /**
   * 통계 조회
   */
  async getStats(): Promise<RollingBufferStats> {
    const memorySize = this.calculateMemorySize();
    const fileStats = await this.calculateFileStats();
    
    return {
      memoryItems: this.memoryBuffer.length,
      fileItems: fileStats.itemCount,
      totalItems: this.memoryBuffer.length + fileStats.itemCount,
      memorySize,
      fileSize: fileStats.totalSize,
      totalSize: memorySize + fileStats.totalSize,
      evictions: this.stats.evictions,
      fileWrites: this.stats.fileWrites,
      fileReads: this.stats.fileReads,
      compressionRatio: fileStats.compressionRatio,
      compressedFiles: fileStats.compressedFiles,
      uncompressedFiles: fileStats.uncompressedFiles,
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
   * 파일 통계 계산
   */
  private async calculateFileStats(): Promise<{
    itemCount: number;
    totalSize: number;
    compressionRatio: number;
    compressedFiles: number;
    uncompressedFiles: number;
  }> {
    try {
      const files = await fs.readdir(this.config.fileStoragePath);
      let itemCount = 0;
      let totalSize = 0;
      let compressedFiles = 0;
      let uncompressedFiles = 0;
      let totalUncompressedSize = 0;

      for (const file of files) {
        if (file.endsWith('.json') || file.endsWith('.gz')) {
          const filePath = join(this.config.fileStoragePath, file);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;

          if (file.endsWith('.gz')) {
            compressedFiles++;
            // 압축된 파일의 경우 압축 해제하여 실제 크기 추정
            try {
              const compressedContent = await fs.readFile(filePath);
              const decompressed = await this.decompressData(compressedContent);
              totalUncompressedSize += JSON.stringify(decompressed).length;
            } catch {
              // 압축 해제 실패 시 파일 크기로 추정
              totalUncompressedSize += stats.size * 3; // 일반적으로 3:1 압축 비율 가정
            }
          } else {
            uncompressedFiles++;
            totalUncompressedSize += stats.size;
          }

          // 파일에서 항목 수 계산
          try {
            if (file.endsWith('.gz')) {
              const compressedContent = await fs.readFile(filePath);
              const fileData = await this.decompressData(compressedContent);
              itemCount += fileData.items?.length || 0;
            } else {
              const content = await fs.readFile(filePath, 'utf-8');
              const fileData = JSON.parse(content);
              itemCount += fileData.items?.length || 0;
            }
          } catch {
            // 파일 읽기 실패 시 무시
          }
        }
      }

      const compressionRatio = totalUncompressedSize > 0 ? 
        (totalUncompressedSize - totalSize) / totalUncompressedSize : 0;

      return {
        itemCount,
        totalSize,
        compressionRatio,
        compressedFiles,
        uncompressedFiles,
      };
    } catch (error) {
      this.logger.warn('Failed to calculate file stats:', error);
      return {
        itemCount: 0,
        totalSize: 0,
        compressionRatio: 0,
        compressedFiles: 0,
        uncompressedFiles: 0,
      };
    }
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
        if (file.endsWith('.json') || file.endsWith('.gz')) {
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
    // 타이머 정리 강화
    this.stopCleanupTimer();
    
    // 메모리 버퍼를 파일로 저장
    if (this.memoryBuffer.length > 0) {
      await this.rollToFile();
    }
    
    this.logger.log('RollingBufferService destroyed and cleaned up');
  }
}
