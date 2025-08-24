import { Injectable } from '@nestjs/common';
import { SnapshotConfig, SnapshotDataType } from './snapshot-config.interface';

@Injectable()
export class SnapshotConfigService {
  private config: SnapshotConfig;

  constructor() {
    this.config = this.createDefaultConfig();
    this.loadFromEnvironment();
  }

  private createDefaultConfig(): SnapshotConfig {
    return {
      enabled: process.env.SNAPSHOT_ENABLED === 'true',
      schedule: process.env.SNAPSHOT_SCHEDULE || '0 2 * * *', // daily at 2 AM
      retentionDays: Number(process.env.SNAPSHOT_RETENTION_DAYS) || 90,
      storageType: (process.env.SNAPSHOT_STORAGE_TYPE as 'file' | 'sqlite') || 'file',
      storagePath: process.env.SNAPSHOT_STORAGE_PATH || './data/snapshots',
      compression: process.env.SNAPSHOT_COMPRESSION !== 'false',
      maxSnapshots: Number(process.env.SNAPSHOT_MAX_COUNT) || 100,
      dataTypes: this.createDefaultDataTypes(),
      metadata: process.env.SNAPSHOT_METADATA !== 'false',
    };
  }

  private createDefaultDataTypes(): SnapshotDataType[] {
    return [
      { type: 'policy_audit', enabled: true },
      { type: 'workflow_history', enabled: true },
      { type: 'system_metrics', enabled: true },
      { type: 'user_activity', enabled: false },
    ];
  }

  private loadFromEnvironment(): void {
    // 개별 데이터 타입 설정 로드
    const policyAuditEnabled = process.env.SNAPSHOT_POLICY_AUDIT;
    const workflowHistoryEnabled = process.env.SNAPSHOT_WORKFLOW_HISTORY;
    const systemMetricsEnabled = process.env.SNAPSHOT_SYSTEM_METRICS;
    const userActivityEnabled = process.env.SNAPSHOT_USER_ACTIVITY;

    if (policyAuditEnabled !== undefined) {
      this.config.dataTypes.find(dt => dt.type === 'policy_audit')!.enabled = 
        policyAuditEnabled === 'true';
    }
    if (workflowHistoryEnabled !== undefined) {
      this.config.dataTypes.find(dt => dt.type === 'workflow_history')!.enabled = 
        workflowHistoryEnabled === 'true';
    }
    if (systemMetricsEnabled !== undefined) {
      this.config.dataTypes.find(dt => dt.type === 'system_metrics')!.enabled = 
        systemMetricsEnabled === 'true';
    }
    if (userActivityEnabled !== undefined) {
      this.config.dataTypes.find(dt => dt.type === 'user_activity')!.enabled = 
        userActivityEnabled === 'true';
    }
  }

  getConfig(): SnapshotConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getSchedule(): string {
    return this.config.schedule;
  }

  getRetentionDays(): number {
    return this.config.retentionDays;
  }

  getStorageType(): 'file' | 'sqlite' {
    return this.config.storageType;
  }

  getStoragePath(): string {
    return this.config.storagePath;
  }

  isCompressionEnabled(): boolean {
    return this.config.compression;
  }

  getMaxSnapshots(): number {
    return this.config.maxSnapshots;
  }

  getEnabledDataTypes(): SnapshotDataType[] {
    return this.config.dataTypes.filter(dt => dt.enabled);
  }

  isMetadataEnabled(): boolean {
    return this.config.metadata;
  }

  updateConfig(updates: Partial<SnapshotConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.config.retentionDays < 1) {
      errors.push('retentionDays must be at least 1 day');
    }

    if (this.config.maxSnapshots < 1) {
      errors.push('maxSnapshots must be at least 1');
    }

    if (!this.config.storagePath.trim()) {
      errors.push('storagePath cannot be empty');
    }

    if (this.config.enabled && this.getEnabledDataTypes().length === 0) {
      errors.push('at least one data type must be enabled when snapshots are enabled');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
