import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

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
  private logsDir: string;
  private currentRunId?: string;
  private currentLogPath?: string;

  constructor() {
    const base = process.env.LOG_DIR || path.resolve(process.cwd(), 'logs');
    this.logsDir = base;
    this.ensureDir(this.logsDir);
  }

  setRun(runId: string): void {
    this.currentRunId = runId;
    const fileName = `run-${runId}.log`;
    this.currentLogPath = path.join(this.logsDir, fileName);
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
    fs.appendFileSync(target, line + '\n', { encoding: 'utf-8' });
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}


