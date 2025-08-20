import { Injectable } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { FileLoggerService, FileLogEntry } from '../../core/file-logger.service';

@Injectable()
@Command({
  name: 'logs',
  description: 'Show Claude workflow logs (JSONL) filtered and optionally tailed',
  arguments: '[run-id]'
})
export class LogsCommand extends CommandRunner {
  constructor(private readonly fileLogger: FileLoggerService) {
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
    description: 'Show logs since time (e.g., "2h", "1d")',
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

  private parseSinceToDate(since?: string): Date | undefined {
    if (!since) return undefined;
    const match = /^(\d+)([smhd])$/.exec(since.trim());
    if (!match) return undefined;
    const value = Number(match[1]);
    const unit = match[2];
    const now = Date.now();
    const unitMs = unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
    return new Date(now - value * unitMs);
  }

  private getLastLines(filePath: string, numLines: number): string[] {
    try {
      const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
      const lines = content.split(/\r?\n/).filter(Boolean);
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

  async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    const [positionalRunId] = passedParams;
    const runId: string | undefined = options?.run || positionalRunId;
    const sinceDate = this.parseSinceToDate(options?.since);
    const linesNum: number = Number(options?.lines ?? 50);

    console.log('📝 Claude Workflow Logs');
    console.log('=======================');

    const filePath = this.fileLogger.getLogFilePath(runId);
    if (!filePath) {
      console.log(runId ? `No log file found for run: ${runId}` : 'No logs found');
      return;
    }

    const initialLines = this.getLastLines(filePath, isNaN(linesNum) ? 50 : linesNum);
    const initialEntries: FileLogEntry[] = initialLines.map(l => {
      try { return JSON.parse(l); } catch { return undefined as any; }
    }).filter(Boolean);
    const filtered = this.filterEntries(initialEntries, { level: options?.level, since: sinceDate });
    this.printEntries(filtered);

    if (!options?.follow) return;

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
            try {
              const entry: FileLogEntry = JSON.parse(line);
              const pass = this.filterEntries([entry], { level: options?.level, since: sinceDate });
              if (pass.length > 0) this.printEntries(pass);
            } catch {
              // ignore non-JSON line
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
