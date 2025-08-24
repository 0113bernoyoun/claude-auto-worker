import { Injectable } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { SnapshotConfigService } from '../../config/snapshot-config.service';
import { LongTermSnapshotService } from '../../core/snapshot/long-term-snapshot.service';

interface SnapshotCommandOptions {
  manual?: boolean;
  status?: boolean;
  config?: boolean;
  list?: boolean;
  restore?: string;
  update?: string;
}

@Injectable()
@Command({
  name: 'snapshot',
  description: 'Long-term snapshot management commands',
  options: { isDefault: true },
})
export class SnapshotCommand extends CommandRunner {
  constructor(
    private readonly snapshotService: LongTermSnapshotService,
    private readonly configService: SnapshotConfigService,
  ) {
    super();
  }

  async run(passedParams: string[], options?: SnapshotCommandOptions): Promise<void> {
    try {
      if (options?.status) {
        await this.showStatus();
      } else if (options?.config) {
        await this.showConfig();
      } else if (options?.list) {
        await this.listSnapshots();
      } else if (options?.restore) {
        await this.restoreSnapshot(options.restore);
      } else if (options?.update) {
        await this.updateConfig(options.update);
      } else if (options?.manual) {
        await this.createManualSnapshot();
      } else {
        // 기본 동작: 상태 표시
        await this.showStatus();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Snapshot command failed: ${errorMessage}`);
      process.exit(1);
    }
  }

  @Option({
    flags: '-s, --status',
    description: 'Show snapshot service status',
  })
  parseStatus(): boolean {
    return true;
  }

  @Option({
    flags: '-c, --config',
    description: 'Show snapshot configuration',
  })
  parseConfig(): boolean {
    return true;
  }

  @Option({
    flags: '-l, --list',
    description: 'List available snapshots',
  })
  parseList(): boolean {
    return true;
  }

  @Option({
    flags: '-r, --restore <id>',
    description: 'Restore snapshot by ID',
  })
  parseRestore(val: string): string {
    return val;
  }

  @Option({
    flags: '-u, --update <json>',
    description: 'Update configuration (JSON string)',
  })
  parseUpdate(val: string): string {
    return val;
  }

  @Option({
    flags: '-m, --manual',
    description: 'Create manual snapshot',
  })
  parseManual(): boolean {
    return true;
  }

  private async showStatus(): Promise<void> {
    console.log('📊 Long-term Snapshot Service Status');
    console.log('=====================================');
    
    const status = this.snapshotService.getStatus();
    
    console.log(`Status: ${status.enabled ? '🟢 Enabled' : '🔴 Disabled'}`);
    console.log(`Storage Type: ${status.storageType}`);
    console.log(`Storage Path: ${status.storagePath}`);
    console.log(`Total Snapshots: ${status.totalSnapshots}`);
    
    if (status.lastSnapshot) {
      console.log(`Last Snapshot: ${status.lastSnapshot.toISOString()}`);
    }
    
    if (status.nextScheduledSnapshot) {
      console.log(`Next Scheduled: ${status.nextScheduledSnapshot.toISOString()}`);
    }
  }

  private async showConfig(): Promise<void> {
    console.log('⚙️  Snapshot Configuration');
    console.log('==========================');
    
    const config = this.configService.getConfig();
    const validation = this.configService.validateConfig();
    
    console.log(`Enabled: ${config.enabled ? 'Yes' : 'No'}`);
    console.log(`Schedule: ${config.schedule}`);
    console.log(`Retention Days: ${config.retentionDays}`);
    console.log(`Storage Type: ${config.storageType}`);
    console.log(`Storage Path: ${config.storagePath}`);
    console.log(`Compression: ${config.compression ? 'Enabled' : 'Disabled'}`);
    console.log(`Max Snapshots: ${config.maxSnapshots}`);
    console.log(`Metadata: ${config.metadata ? 'Enabled' : 'Disabled'}`);
    
    console.log('\nData Types:');
    config.dataTypes.forEach(dataType => {
      const status = dataType.enabled ? '🟢' : '🔴';
      console.log(`  ${status} ${dataType.type}`);
    });
    
    console.log(`\nConfiguration Valid: ${validation.isValid ? '✅ Yes' : '❌ No'}`);
    if (!validation.isValid) {
      console.log('Errors:');
      validation.errors.forEach(error => console.log(`   - ${error}`));
    }
  }

  private async listSnapshots(): Promise<void> {
    console.log('📋 Available Snapshots');
    console.log('=======================');
    
    const snapshots = await this.snapshotService.listSnapshots();
    
    if (snapshots.length === 0) {
      console.log('No snapshots found.');
      return;
    }
    
    snapshots.forEach((snapshot, index) => {
      console.log(`\n${index + 1}. Snapshot ID: ${snapshot.id}`);
      console.log(`   Created: ${snapshot.timestamp.toISOString()}`);
      console.log(`   Version: ${snapshot.version}`);
      console.log(`   Records: ${snapshot.recordCount}`);
      console.log(`   File Size: ${this.formatFileSize(snapshot.fileSize)}`);
      console.log(`   Compression: ${snapshot.compression ? 'Yes' : 'No'}`);
      console.log(`   Data Types: ${snapshot.dataTypes.map(dt => dt.type).join(', ')}`);
    });
  }

  private async restoreSnapshot(snapshotId: string): Promise<void> {
    console.log(`🔄 Restoring snapshot: ${snapshotId}`);
    
    const snapshot = await this.snapshotService.restoreSnapshot(snapshotId);
    
    if (!snapshot) {
      console.log('❌ Snapshot not found');
      return;
    }
    
    console.log('✅ Snapshot restored successfully');
    console.log(`   ID: ${snapshot.metadata.id}`);
    console.log(`   Created: ${snapshot.metadata.timestamp.toISOString()}`);
    console.log(`   Records: ${snapshot.metadata.recordCount}`);
    console.log(`   Data Types: ${Object.keys(snapshot.data).join(', ')}`);
  }

  private async updateConfig(configJson: string): Promise<void> {
    console.log('🔧 Updating configuration...');
    
    try {
      const updates = JSON.parse(configJson);
      this.configService.updateConfig(updates);
      
      const validation = this.configService.validateConfig();
      if (!validation.isValid) {
        console.log('❌ Invalid configuration:');
        validation.errors.forEach(error => console.log(`   - ${error}`));
        return;
      }
      
      console.log('✅ Configuration updated successfully');
      console.log('Updated values:');
      Object.entries(updates).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('❌ Failed to update configuration:');
      console.log(`   ${errorMessage}`);
    }
  }

  private async createManualSnapshot(): Promise<void> {
    console.log('📸 Creating manual snapshot...');
    
    const snapshot = await this.snapshotService.createManualSnapshot();
    
    console.log('✅ Manual snapshot created successfully');
    console.log(`   ID: ${snapshot.metadata.id}`);
    console.log(`   Created: ${snapshot.metadata.timestamp.toISOString()}`);
    console.log(`   Records: ${snapshot.metadata.recordCount}`);
    console.log(`   File Size: ${this.formatFileSize(snapshot.metadata.fileSize)}`);
    console.log(`   Storage: ${snapshot.metadata.storagePath}`);
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
