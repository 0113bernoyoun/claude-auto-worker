import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { LoggingConfigService } from '../config/logging-config.service';

export type FileLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface FileLogEntry {
  timestamp: string;
  level: FileLogLevel;
  message: string;
  runId?: string;
  workflow?: string;
  stage?: string;
  step?: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class FileLoggerService {
  private readonly logger = new Logger(FileLoggerService.name);
  private logsDir: string;
  private currentRunId?: string;
  private currentLogPath?: string;
  private currentFileSize: number = 0;
  private readonly maxFileSize: number;

  constructor(private readonly loggingConfig: LoggingConfigService) {
    const base = process.env.LOG_DIR || path.resolve(process.cwd(), 'logs');
    this.logsDir = base;
    this.maxFileSize = this.parseFileSize(this.loggingConfig.getConfig().storage.maxFileSize);
    this.ensureDir(this.logsDir);
    this.cleanupOldLogs();
  }

  setRun(runId: string): void {
    this.currentRunId = runId;
    const fileName = `run-${runId}.log`;
    this.currentLogPath = path.join(this.logsDir, fileName);
    this.currentFileSize = 0;
    
    // touch file
    fs.closeSync(fs.openSync(this.currentLogPath, 'a'));
    
    // update latest symlink/pointer
    const latest = path.join(this.logsDir, 'latest.log');
    try {
      // remove if exists
      if (fs.existsSync(latest)) fs.unlinkSync(latest);
      fs.symlinkSync(this.currentLogPath, latest);
    } catch {
      // fallback: copy on non-symlink environments
      try {
        fs.copyFileSync(this.currentLogPath, latest);
      } catch {
        // ignore
      }
    }
  }

  getLogFilePath(runId?: string): string | undefined {
    if (runId) {
      const p = path.join(this.logsDir, `run-${runId}.log`);
      return fs.existsSync(p) ? p : undefined;
    }
    const latest = path.join(this.logsDir, 'latest.log');
    if (fs.existsSync(latest)) return latest;
    // fallback: pick newest run-*.log
    const files = fs.readdirSync(this.logsDir).filter(f => f.startsWith('run-') && f.endsWith('.log'));
    if (files.length === 0) return undefined;
    files.sort((a, b) => fs.statSync(path.join(this.logsDir, b)).mtimeMs - fs.statSync(path.join(this.logsDir, a)).mtimeMs);
    const first = files[0];
    if (!first) return undefined;
    return path.join(this.logsDir, first);
  }

  write(level: FileLogLevel, message: string, meta?: Omit<FileLogEntry, 'timestamp' | 'level' | 'message'>): void {
    // 로그 레벨별 저장 제어 확인
    if (!this.loggingConfig.isLevelEnabled(level)) {
      return;
    }

    // 로그 저장이 비활성화된 경우
    if (!this.loggingConfig.isStorageEnabled()) {
      return;
    }

    const entry: FileLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      runId: meta?.runId ?? this.currentRunId,
      workflow: meta?.workflow,
      stage: meta?.stage,
      step: meta?.step,
      meta: meta?.meta,
    };
    
    const line = JSON.stringify(entry);
    const target: string =
      this.currentLogPath ??
      this.getLogFilePath(this.currentRunId) ??
      path.join(this.logsDir, 'latest.log');

    // 파일 크기 체크 및 로테이션
    if (this.shouldRotate(target)) {
      this.rotateLogFile(target);
    }

    fs.appendFileSync(target, line + '\n', { encoding: 'utf-8' });
    this.currentFileSize += line.length + 1; // +1 for newline
  }

  private shouldRotate(filePath: string): boolean {
    if (!this.loggingConfig.getConfig().storage.rotation.enabled) {
      return false;
    }

    try {
      const stats = fs.statSync(filePath);
      return stats.size >= this.maxFileSize;
    } catch {
      return false;
    }
  }

  private rotateLogFile(filePath: string): void {
    try {
      const dir = path.dirname(filePath);
      const ext = path.extname(filePath);
      const base = path.basename(filePath, ext);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const newPath = path.join(dir, `${base}-${timestamp}${ext}`);

      // 기존 파일을 새 이름으로 이동
      if (fs.existsSync(filePath)) {
        fs.renameSync(filePath, newPath);
        
        // 압축이 활성화된 경우 압축
        if (this.loggingConfig.getConfig().storage.compression) {
          this.compressLogFile(newPath);
        }
      }

      // 새 로그 파일 생성
      fs.closeSync(fs.openSync(filePath, 'a'));
      this.currentFileSize = 0;
    } catch (error) {
      this.logger.warn('Failed to rotate log file:', error);
    }
  }

  private compressLogFile(filePath: string): void {
    try {
      const compressedPath = filePath + '.gz';
      const input = fs.createReadStream(filePath);
      const output = fs.createWriteStream(compressedPath);
      const gzip = zlib.createGzip();

      input.pipe(gzip).pipe(output);

      output.on('finish', () => {
        // 압축 완료 후 원본 파일 삭제
        fs.unlinkSync(filePath);
      });

      output.on('error', (error) => {
        this.logger.warn('Failed to compress log file:', error);
      });
    } catch (error) {
      this.logger.warn('Failed to compress log file:', error);
    }
  }

  private cleanupOldLogs(): void {
    try {
      const config = this.loggingConfig.getConfig();
      if (!config.storage.rotation.enabled) return;

      const files = fs.readdirSync(this.logsDir)
        .filter(f => f.startsWith('run-') && (f.endsWith('.log') || f.endsWith('.log.gz')))
        .map(f => ({
          name: f,
          path: path.join(this.logsDir, f),
          mtime: fs.statSync(path.join(this.logsDir, f)).mtimeMs
        }))
        .sort((a, b) => b.mtime - a.mtime);

      // 최대 파일 수를 초과하는 오래된 파일들 삭제
      if (files.length > config.storage.maxFiles) {
        const filesToDelete = files.slice(config.storage.maxFiles);
        for (const file of filesToDelete) {
          try {
            fs.unlinkSync(file.path);
          } catch (error) {
            this.logger.warn(`Failed to delete old log file ${file.name}:`, error);
          }
        }
      }
    } catch (error) {
      this.logger.warn('Failed to cleanup old logs:', error);
    }
  }

  private parseFileSize(sizeStr: string): number {
    const units: Record<string, number> = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
    };

    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([KMGT]?B)$/i);
    if (!match || !match[1] || !match[2]) return 100 * 1024 * 1024; // 기본값: 100MB

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    return value * (units[unit] || 1);
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}


