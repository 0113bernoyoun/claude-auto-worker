export interface SnapshotConfig {
  enabled: boolean;
  schedule: string; // cron-like schedule (e.g., "0 2 * * *" for daily at 2 AM)
  retentionDays: number; // 스냅샷 보존 기간 (일)
  storageType: 'file' | 'sqlite'; // 저장 타입
  storagePath: string; // 저장 경로
  compression: boolean; // 압축 사용 여부
  maxSnapshots: number; // 최대 스냅샷 수
  dataTypes: SnapshotDataType[]; // 스냅샷 대상 데이터 타입
  metadata: boolean; // 메타데이터 포함 여부
}

export interface SnapshotDataType {
  type: 'policy_audit' | 'workflow_history' | 'system_metrics' | 'user_activity';
  enabled: boolean;
  retentionDays?: number; // 개별 데이터 타입별 보존 기간 (기본값 사용 시 생략)
}

export interface SnapshotMetadata {
  id: string;
  timestamp: Date;
  version: string;
  dataTypes: SnapshotDataType[];
  recordCount: number;
  fileSize: number;
  checksum: string;
  compression: boolean;
  storageType: 'file' | 'sqlite';
  storagePath: string;
}

export interface SnapshotData {
  metadata: SnapshotMetadata;
  data: Record<string, unknown[]>;
  createdAt: Date;
  expiresAt: Date;
}
