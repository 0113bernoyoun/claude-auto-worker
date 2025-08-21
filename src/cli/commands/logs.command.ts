import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { Command, CommandRunner, Option } from 'nest-commander';
import * as path from 'path';
import * as readline from 'readline';
import { LoggingConfigService } from '../../config/logging-config.service';
import { FileLogEntry, FileLoggerService } from '../../core/file-logger.service';

@Injectable()
@Command({
  name: 'logs',
  description: 'Show Claude workflow logs (JSONL) filtered and optionally tailed',
  arguments: '[run-id]'
})
export class LogsCommand extends CommandRunner {
  private invalidJsonCount: number = 0;
  private totalLinesProcessed: number = 0;

  constructor(
    private readonly fileLogger: FileLoggerService,
    private readonly loggingConfig: LoggingConfigService
  ) {
    super();
  }

  @Option({
    flags: '-f, --follow',
    description: 'Follow log output in real-time',
  })
  parseFollow(val: string): boolean {
    return val === undefined || val === 'true';
  }

  @Option({
    flags: '-n, --lines <number>',
    description: 'Number of lines to show',
  })
  parseLines(val: string): string {
    return val;
  }

  @Option({
    flags: '--since <time>',
    description: 'Show logs since time (e.g., "2h", "1d", "2h30m")',
  })
  parseSince(val: string): string {
    return val;
  }

  @Option({
    flags: '--level <level>',
    description: 'Log level filter (debug, info, warn, error)',
  })
  parseLevel(val: string): string {
    return val;
  }

  @Option({
    flags: '-r, --run <id>',
    description: 'Run ID to read logs from (defaults to latest)'
  })
  parseRun(val: string): string {
    return val;
  }

  @Option({
    flags: '--show-invalid-json',
    description: 'Show invalid JSON lines with warnings',
  })
  parseShowInvalidJson(val: string): boolean {
    return val === undefined || val === 'true';
  }

  private parseCompoundTime(since?: string): Date | undefined {
    if (!since) return undefined;
    
    const config = this.loggingConfig.getConfig();
    if (!config.timeParsing.supportCompoundUnits) {
      // 기본 단일 단위 파싱
      return this.parseSimpleTime(since);
    }

    // 복합 단위 파싱 (예: "2h30m", "1d2h15m")
    const timeRegex = /(\d+)([smhd])/g;
    let totalMs = 0;
    let match;

    while ((match = timeRegex.exec(since)) !== null) {
      const value = Number(match[1]);
      const unit = match[2];
      if (unit) {
        const unitMs = this.getUnitMilliseconds(unit);
        totalMs += value * unitMs;
      }
    }

    if (totalMs === 0) {
      // 복합 파싱 실패 시 기본 파싱 시도
      return this.parseSimpleTime(since);
    }

    return new Date(Date.now() - totalMs);
  }

  private parseSimpleTime(since?: string): Date | undefined {
    if (!since) return undefined;
    const match = /^(\d+)([smhd])$/.exec(since.trim());
    if (!match || !match[1] || !match[2]) return undefined;
    const value = Number(match[1]);
    const unit = match[2];
    const unitMs = this.getUnitMilliseconds(unit);
    return new Date(Date.now() - value * unitMs);
  }

  private getUnitMilliseconds(unit: string): number {
    const units: Record<string, number> = {
      's': 1000,
      'm': 60_000,
      'h': 3_600_000,
      'd': 86_400_000,
    };
    return units[unit] || 1000;
  }

  private getLastLinesOptimized(filePath: string, numLines: number): string[] {
    try {
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const config = this.loggingConfig.getConfig();
      
      // 파일이 너무 큰 경우 최적화된 역탐색 사용
      if (fileSize > 10 * 1024 * 1024) { // 10MB 이상
        return this.getLastLinesFromLargeFile(filePath, numLines);
      }
      
      // 작은 파일은 기존 방식 사용
      return this.getLastLinesSimple(filePath, numLines);
    } catch {
      return [];
    }
  }

  private getLastLinesSimple(filePath: string, numLines: number): string[] {
    try {
      const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
      const lines = content.split(/\r?\n/).filter(Boolean);
      return lines.slice(-numLines);
    } catch {
      return [];
    }
  }

  private getLastLinesFromLargeFile(filePath: string, numLines: number): string[] {
    try {
      const lines: string[] = [];
      const bufferSize = 8192; // 8KB 버퍼
      const stats = fs.statSync(filePath);
      let position = stats.size;
      let remainingLines = numLines;

      while (remainingLines > 0 && position > 0) {
        const chunkSize = Math.min(bufferSize, position);
        const start = Math.max(0, position - chunkSize);
        
        const buffer = Buffer.alloc(chunkSize);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, chunkSize, start);
        fs.closeSync(fd);

        const chunk = buffer.toString('utf-8');
        const linesInChunk = chunk.split(/\r?\n/);
        
        // 첫 번째 라인은 불완전할 수 있으므로 제외
        for (let i = linesInChunk.length - 1; i > 0 && remainingLines > 0; i--) {
          const line = linesInChunk[i];
          if (line && line.trim()) {
            lines.unshift(line);
            remainingLines--;
          }
        }

        position = start;
        
        // 스캔 중단 조건 (너무 오래 걸리는 경우)
        if (lines.length > numLines * 2) {
          break;
        }
      }

      return lines.slice(-numLines);
    } catch {
      return [];
    }
  }

  private filterEntries(entries: FileLogEntry[], opts: { level?: string; since?: Date }): FileLogEntry[] {
    let filtered = entries;
    if (opts.level) {
      const wanted = String(opts.level).toLowerCase();
      filtered = filtered.filter(e => e.level === wanted);
    }
    if (opts.since) {
      filtered = filtered.filter(e => new Date(e.timestamp) >= opts.since!);
    }
    return filtered;
  }

  private parseLogLine(line: string, showInvalidJson: boolean): FileLogEntry | null {
    try {
      const entry: FileLogEntry = JSON.parse(line);
      this.totalLinesProcessed++;
      return entry;
    } catch (error) {
      this.invalidJsonCount++;
      if (showInvalidJson) {
        console.warn(`⚠️  Invalid JSON at line ${this.totalLinesProcessed + 1}: ${line.substring(0, 100)}...`);
      }
      return null;
    }
  }

  private printEntries(entries: FileLogEntry[]): void {
    for (const e of entries) {
      const context: string[] = [];
      if (e.workflow) context.push(`wf=${e.workflow}`);
      if (e.stage) context.push(`stage=${e.stage}`);
      if (e.step) context.push(`step=${e.step}`);
      const ctxStr = context.length > 0 ? ` [${context.join(' ')}]` : '';
      console.log(`${e.timestamp} [${e.level.toUpperCase()}]${ctxStr} ${e.message}`);
    }
  }

  private printSummary(): void {
    const config = this.loggingConfig.getConfig();
    
    if (config.display.invalidJsonWarning && this.invalidJsonCount > 0) {
      console.log(`\n⚠️  Warning: ${this.invalidJsonCount} invalid JSON lines found out of ${this.totalLinesProcessed} total lines`);
    }
    
    console.log(`\n📊 Processed ${this.totalLinesProcessed} lines total`);
  }

  async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    const [positionalRunId] = passedParams;
    const runId: string | undefined = options?.run || positionalRunId;
    const sinceDate = this.parseCompoundTime(options?.since);
    const linesNum: number = Number(options?.lines ?? this.loggingConfig.getConfig().display.defaultLines);
    const showInvalidJson = options?.showInvalidJson || this.loggingConfig.getConfig().display.showInvalidJson;

    // 최대 라인 수 제한
    const maxLines = this.loggingConfig.getConfig().display.maxLines;
    const actualLinesNum = Math.min(linesNum, maxLines);

    console.log('📝 Claude Workflow Logs');
    console.log('=======================');

    const filePath = this.fileLogger.getLogFilePath(runId);
    if (!filePath) {
      console.log(runId ? `No log file found for run: ${runId}` : 'No logs found');
      return;
    }

    // 파일 크기 정보 표시
    try {
      const stats = fs.statSync(filePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`📁 Log file: ${path.basename(filePath)} (${fileSizeMB} MB)`);
    } catch {
      // 파일 정보를 가져올 수 없는 경우 무시
    }

    const initialLines = this.getLastLinesOptimized(filePath, actualLinesNum);
    const initialEntries: FileLogEntry[] = initialLines
      .map(l => this.parseLogLine(l, showInvalidJson))
      .filter(Boolean) as FileLogEntry[];
    
    const filtered = this.filterEntries(initialEntries, { 
      level: options?.level, 
      since: sinceDate 
    });
    
    this.printEntries(filtered);

    if (!options?.follow) {
      this.printSummary();
      return;
    }

    console.log('--- following ---');
    let position = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;

    const onAppend = () => {
      try {
        const stats = fs.statSync(filePath);
        if (stats.size < position) {
          // file rotated; reset
          position = 0;
        }
        if (stats.size > position) {
          const stream = fs.createReadStream(filePath, { start: position, end: stats.size });
          const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
          rl.on('line', (line: string) => {
            const entry = this.parseLogLine(line, showInvalidJson);
            if (entry) {
              const pass = this.filterEntries([entry], { level: options?.level, since: sinceDate });
              if (pass.length > 0) this.printEntries(pass);
            }
          });
          rl.on('close', () => { position = stats.size; });
        }
      } catch {
        // ignore transient errors
      }
    };

    const watcher = fs.watch(path.dirname(filePath), (eventType, filename) => {
      if (!filename) return;
      if (path.join(path.dirname(filePath), filename) === filePath && (eventType === 'change' || eventType === 'rename')) {
        onAppend();
      }
    });

    // also poll as fallback
    const interval = setInterval(onAppend, 1000);

    // keep process alive until SIGINT
    await new Promise<void>((resolve) => {
      const stop = () => {
        clearInterval(interval);
        try { watcher.close(); } catch {}
        this.printSummary();
        resolve();
      };
      // In testing environments there may be no SIGINT; auto stop after small delay
      if (process.env.JEST_WORKER_ID) {
        setTimeout(stop, 50);
      } else {
        process.on('SIGINT', stop);
      }
    });
  }
}
