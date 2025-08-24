import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SnapshotData, SnapshotMetadata } from '../../config/snapshot-config.interface';
import { SnapshotConfigService } from '../../config/snapshot-config.service';
import { PolicyEngineService } from '../../policy/policy-engine.service';
import { ExecutionStateService } from '../execution-state.service';

@Injectable()
export class LongTermSnapshotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LongTermSnapshotService.name);
  private readonly version = '1.0.0';
  private cronJob: NodeJS.Timeout | null = null;

  constructor(
    private readonly snapshotConfig: SnapshotConfigService,
    private readonly policyEngine: PolicyEngineService,
    private readonly executionState: ExecutionStateService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.snapshotConfig.isEnabled()) {
      await this.initializeStorage();
      this.startScheduledSnapshots();
      this.logger.log('Long-term snapshot service initialized and scheduled');
    } else {
      this.logger.log('Long-term snapshot service disabled');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.cronJob) {
      clearTimeout(this.cronJob);
      this.cronJob = null;
    }
    this.logger.log('Long-term snapshot service stopped');
  }

  /**
   * 스냅샷 저장소 디렉토리 초기화
   * @throws 스토리지 초기화 실패 시 에러
   */
  private async initializeStorage(): Promise<void> {
    try {
      const storagePath = this.snapshotConfig.getStoragePath();
      await fs.mkdir(storagePath, { recursive: true });
      this.logger.log(`Storage directory initialized: ${storagePath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Storage directory initialization failed: ${errorMessage}`);
      throw new Error(`Failed to initialize storage directory: ${errorMessage}`);
    }
  }

  private startScheduledSnapshots(): void {
    const schedule = this.snapshotConfig.getSchedule();
    this.logger.log(`Starting scheduled snapshots with schedule: ${schedule}`);
    
    // 간단한 스케줄링 구현 (cron-like)
    this.scheduleNextSnapshot();
  }

  private scheduleNextSnapshot(): void {
    const schedule = this.snapshotConfig.getSchedule();
    const nextRun = this.parseSchedule(schedule);
    const delay = nextRun.getTime() - Date.now();
    
    if (delay > 0) {
      this.cronJob = setTimeout(async () => {
        try {
          await this.createSnapshot();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`Scheduled snapshot failed: ${errorMessage}`);
        } finally {
          this.scheduleNextSnapshot(); // 다음 스케줄 설정
        }
      }, delay);
      
      this.logger.log(`Next snapshot scheduled for: ${nextRun.toISOString()}`);
    }
  }

  /**
   * 개선된 cron-like 스케줄 파서
   * 형식: "분 시 일 월 요일" (예: "0 2 * * *" -> 매일 오전 2시)
   */
  private parseSchedule(schedule: string): Date {
    const parts = schedule.trim().split(/\s+/);
    
    if (parts.length !== 5) {
      throw new Error(`Invalid schedule format: expected 5 parts, got ${parts.length}. Format: "분 시 일 월 요일"`);
    }

    const [minuteStr, hourStr, dayStr, monthStr, weekdayStr] = parts;
    
    // 각 부분의 유효성 검사 및 파싱
    const minute = this.parseCronPart(minuteStr!, 0, 59, 'minute');
    const hour = this.parseCronPart(hourStr!, 0, 23, 'hour');
    
    // 현재 시간 기준으로 다음 실행 시간 계산
    const now = new Date();
    const next = new Date(now);
    
    // 다음 실행 시간 설정
    next.setMinutes(minute, 0, 0);
    next.setHours(hour);
    
    // 이미 지난 시간이면 다음날로 설정
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    
    return next;
  }

  /**
   * cron 표현식의 각 부분을 파싱하고 유효성 검사
   */
  private parseCronPart(part: string, min: number, max: number, fieldName: string): number {
    // "*"는 기본값 사용
    if (part === '*') {
      return fieldName === 'minute' ? 0 : (fieldName === 'hour' ? 2 : 1);
    }
    
    // 숫자 파싱
    const num = parseInt(part, 10);
    if (isNaN(num) || num < min || num > max) {
      throw new Error(`Invalid ${fieldName} value: ${part}. Must be between ${min} and ${max}`);
    }
    
    return num;
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async createScheduledSnapshot(): Promise<void> {
    if (this.snapshotConfig.isEnabled()) {
      try {
        await this.createSnapshot();
        this.logger.log('Scheduled snapshot completed successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Scheduled snapshot failed: ${errorMessage}`);
      }
    }
  }

  async createSnapshot(): Promise<SnapshotData> {
    this.logger.log('Creating long-term snapshot...');
    
    const startTime = Date.now();
    const snapshotId = this.generateSnapshotId();
    const timestamp = new Date();
    
    try {
      // 데이터 수집
      const data = await this.collectSnapshotData();
      
      // 메타데이터 생성
      const metadata: SnapshotMetadata = {
        id: snapshotId,
        timestamp,
        version: this.version,
        dataTypes: this.snapshotConfig.getEnabledDataTypes(),
        recordCount: this.calculateTotalRecordCount(data),
        fileSize: 0, // 저장 후 업데이트
        checksum: '',
        compression: this.snapshotConfig.isCompressionEnabled(),
        storageType: this.snapshotConfig.getStorageType(),
        storagePath: this.snapshotConfig.getStoragePath(),
      };

      const snapshotData: SnapshotData = {
        metadata,
        data,
        createdAt: timestamp,
        expiresAt: this.calculateExpiryDate(),
      };

      // 저장
      await this.saveSnapshot(snapshotData);
      
      // 오래된 스냅샷 정리
      await this.cleanupOldSnapshots();
      
      const duration = Date.now() - startTime;
      this.logger.log(`Snapshot created successfully in ${duration}ms: ${snapshotId}`);
      
      return snapshotData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create snapshot: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 활성화된 데이터 타입별로 스냅샷 데이터 수집
   * @returns 수집된 데이터 객체 (데이터 타입별로 분류)
   */
  private async collectSnapshotData(): Promise<Record<string, unknown[]>> {
    const collectedData: Record<string, unknown[]> = {};
    const enabledDataTypes = this.snapshotConfig.getEnabledDataTypes();

    for (const dataType of enabledDataTypes) {
      try {
        switch (dataType.type) {
          case 'policy_audit':
            collectedData.policy_audit = await this.collectPolicyAuditData();
            break;
          case 'workflow_history':
            collectedData.workflow_history = await this.collectWorkflowHistoryData();
            break;
          case 'system_metrics':
            collectedData.system_metrics = await this.collectSystemMetricsData();
            break;
          case 'user_activity':
            collectedData.user_activity = await this.collectUserActivityData();
            break;
        }
      } catch (error) {
        // 에러 발생 시 빈 배열로 설정하고 계속 진행
        collectedData[dataType.type] = [];
      }
    }

    return collectedData;
  }

  /**
   * 공통 에러 처리 헬퍼 메서드
   */
  private handleDataCollectionError(error: unknown, dataType: string): unknown[] {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Failed to collect ${dataType} data: ${errorMessage}`);
    return [];
  }

  private async collectPolicyAuditData(): Promise<unknown[]> {
    // 정책 엔진에서 감사 로그 수집
    try {
      // 실제 구현에서는 PolicyEngineService에서 감사 로그를 가져와야 함
      return [];
    } catch (error) {
      return this.handleDataCollectionError(error, 'policy audit');
    }
  }

  private async collectWorkflowHistoryData(): Promise<unknown[]> {
    // 실행 상태 서비스에서 워크플로우 이력 수집
    try {
      // 실제 구현에서는 ExecutionStateService에서 워크플로우 이력을 가져와야 함
      return [];
    } catch (error) {
      return this.handleDataCollectionError(error, 'workflow history');
    }
  }

  private async collectSystemMetricsData(): Promise<unknown[]> {
    // 시스템 메트릭 수집
    try {
      const metrics = {
        timestamp: new Date(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
      };
      return [metrics];
    } catch (error) {
      return this.handleDataCollectionError(error, 'system metrics');
    }
  }

  private async collectUserActivityData(): Promise<unknown[]> {
    // 사용자 활동 데이터 수집 (현재는 빈 배열 반환)
    return [];
  }

  private async saveSnapshot(snapshotData: SnapshotData): Promise<void> {
    const storageType = this.snapshotConfig.getStorageType();
    
    if (storageType === 'file') {
      await this.saveToFile(snapshotData);
    } else if (storageType === 'sqlite') {
      await this.saveToSqlite(snapshotData);
    }
  }

  private async saveToFile(snapshotData: SnapshotData): Promise<void> {
    const storagePath = this.snapshotConfig.getStoragePath();
    const filename = `snapshot_${snapshotData.metadata.id}_${snapshotData.metadata.timestamp.getTime()}.json`;
    const filepath = path.join(storagePath, filename);

    try {
      let content = JSON.stringify(snapshotData, null, 2);
      
      // 압축이 활성화된 경우
      if (this.snapshotConfig.isCompressionEnabled()) {
        content = this.compressContent(content);
      }

      await fs.writeFile(filepath, content, 'utf8');
      
      // 파일 크기와 체크섬 업데이트
      const stats = await fs.stat(filepath);
      snapshotData.metadata.fileSize = stats.size;
      snapshotData.metadata.checksum = this.calculateChecksum(content);
      
      this.logger.log(`Snapshot saved to file: ${filepath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to save snapshot to file: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * SQLite 저장소 구현
   * 향후 확장을 위한 구조 설계
   */
  private async saveToSqlite(snapshotData: SnapshotData): Promise<void> {
    try {
      // TODO: SQLite 구현 시 고려사항
      // 1. 데이터베이스 스키마 설계
      // 2. 인덱싱 전략 (timestamp, dataType 등)
      // 3. 트랜잭션 처리
      // 4. 데이터 압축 및 압축 해제
      // 5. 백업 및 복구 전략
      
      this.logger.warn('SQLite storage not yet implemented, falling back to file storage');
      await this.saveToFile(snapshotData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`SQLite storage failed, falling back to file storage: ${errorMessage}`);
      await this.saveToFile(snapshotData);
    }
  }

  private async cleanupOldSnapshots(): Promise<void> {
    try {
      const storagePath = this.snapshotConfig.getStoragePath();
      const maxSnapshots = this.snapshotConfig.getMaxSnapshots();
      const retentionDays = this.snapshotConfig.getRetentionDays();

      const files = await fs.readdir(storagePath);
      const snapshotFiles = files.filter(file => file.startsWith('snapshot_'));
      
      if (snapshotFiles.length <= maxSnapshots) {
        return; // 정리 불필요
      }

      // 파일들을 수정 시간순으로 정렬
      const fileStats = await Promise.all(
        snapshotFiles.map(async (file) => {
          const filepath = path.join(storagePath, file);
          const stats = await fs.stat(filepath);
          return { file, stats, filepath };
        })
      );

      fileStats.sort((a, b) => a.stats.mtime.getTime() - b.stats.mtime.getTime());

      // 오래된 파일들 삭제
      const filesToDelete = fileStats.slice(0, fileStats.length - maxSnapshots);
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      for (const { file, stats, filepath } of filesToDelete) {
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filepath);
          this.logger.log(`Deleted old snapshot: ${file}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to cleanup old snapshots: ${errorMessage}`);
    }
  }

  async restoreSnapshot(snapshotId: string): Promise<SnapshotData | null> {
    try {
      const storagePath = this.snapshotConfig.getStoragePath();
      const files = await fs.readdir(storagePath);
      const snapshotFile = files.find(file => file.includes(snapshotId));

      if (!snapshotFile) {
        this.logger.warn(`Snapshot not found: ${snapshotId}`);
        return null;
      }

      const filepath = path.join(storagePath, snapshotFile);
      const content = await fs.readFile(filepath, 'utf8');
      const snapshotData: SnapshotData = JSON.parse(content, (key, value) => {
        // Date 문자열을 Date 객체로 변환
        if (key === 'timestamp' || key === 'createdAt' || key === 'expiresAt') {
          return new Date(value);
        }
        return value;
      });

      this.logger.log(`Snapshot restored: ${snapshotId}`);
      return snapshotData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to restore snapshot: ${errorMessage}`);
      return null;
    }
  }

  async listSnapshots(): Promise<SnapshotMetadata[]> {
    try {
      const storagePath = this.snapshotConfig.getStoragePath();
      const files = await fs.readdir(storagePath);
      const snapshotFiles = files.filter(file => file.startsWith('snapshot_'));

      const snapshots: SnapshotMetadata[] = [];

      for (const file of snapshotFiles) {
        try {
          const filepath = path.join(storagePath, file);
          const content = await fs.readFile(filepath, 'utf8');
          const snapshotData: SnapshotData = JSON.parse(content, (key, value) => {
            // Date 문자열을 Date 객체로 변환
            if (key === 'timestamp' || key === 'createdAt' || key === 'expiresAt') {
              return new Date(value);
            }
            return value;
          });
          snapshots.push(snapshotData.metadata);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Failed to read snapshot file ${file}: ${errorMessage}`);
        }
      }

      // 최신 순으로 정렬
      snapshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return snapshots;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to list snapshots: ${errorMessage}`);
      return [];
    }
  }

  private generateSnapshotId(): string {
    return crypto.randomUUID();
  }

  private calculateTotalRecordCount(data: Record<string, unknown[]>): number {
    return Object.values(data).reduce((total, records) => total + records.length, 0);
  }

  private calculateExpiryDate(): Date {
    const retentionDays = this.snapshotConfig.getRetentionDays();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + retentionDays);
    return expiryDate;
  }

  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * 콘텐츠 압축 처리
   * 향후 zlib 등을 사용한 실제 압축으로 확장 가능
   */
  private compressContent(content: string): string {
    // 현재는 공백 정리만 수행
    // TODO: zlib 압축 옵션 추가 고려
    return content.replace(/\s+/g, ' ').trim();
  }

  // 수동 스냅샷 생성 (테스트용)
  async createManualSnapshot(): Promise<SnapshotData> {
    this.logger.log('Creating manual snapshot...');
    return this.createSnapshot();
  }

  // 스냅샷 상태 확인
  getStatus(): {
    enabled: boolean;
    lastSnapshot?: Date;
    nextScheduledSnapshot?: Date;
    totalSnapshots: number;
    storagePath: string;
    storageType: 'file' | 'sqlite';
  } {
    return {
      enabled: this.snapshotConfig.isEnabled(),
      storagePath: this.snapshotConfig.getStoragePath(),
      storageType: this.snapshotConfig.getStorageType(),
      totalSnapshots: 0, // 실제로는 파일 시스템에서 계산해야 함
    };
  }
}
