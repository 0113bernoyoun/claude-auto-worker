import { Controller, Get, HttpException, HttpStatus, ParseIntPipe, Query } from '@nestjs/common';
import * as fs from 'fs';
import { FileLogEntry, FileLoggerService } from './core/file-logger.service';

@Controller('logs')
export class LogsController {
  constructor(private readonly fileLogger: FileLoggerService) {}

  @Get()
  async getLogs(
    @Query('runId') runId?: string,
    @Query('lines', new ParseIntPipe({ optional: true })) lines?: number,
    @Query('level') level?: string,
  ): Promise<FileLogEntry[]> {
    const requestedLines = Number.isFinite(lines) ? (lines as number) : 500;
    const maxLines = Math.max(1, Math.min(5000, requestedLines));

    const logPath = this.fileLogger.getLogFilePath(runId);
    if (!logPath) {
      throw new HttpException('Log file not found', HttpStatus.NOT_FOUND);
    }

    try {
      const entries = this.getLastLinesOptimized(logPath, maxLines)
        .map(line => {
          try { return JSON.parse(line) as FileLogEntry; } catch { return null; }
        })
        .filter(Boolean) as FileLogEntry[];

      if (level) {
        const target = String(level).toLowerCase();
        return entries.filter(e => String(e.level).toLowerCase() === target);
      }
      return entries;
    } catch (e) {
      throw new HttpException('Failed to read logs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Tail-optimized last N lines reader (synchronous, bounded memory)
   */
  private getLastLinesOptimized(filePath: string, maxLines: number): string[] {
    const fd = fs.openSync(filePath, 'r');
    try {
      const stats = fs.fstatSync(fd);
      let position = Math.max(0, stats.size - 8192);
      const chunks: string[] = [];
      let linesCollected = 0;

      while (position >= 0 && linesCollected < maxLines) {
        const size = Math.min(8192, stats.size - position);
        const buf = Buffer.alloc(size);
        fs.readSync(fd, buf, 0, size, position);
        chunks.unshift(buf.toString('utf-8'));
        const text = chunks.join('');
        const lines = text.split(/\r?\n/).filter(Boolean);
        linesCollected = lines.length;
        if (linesCollected >= maxLines || position === 0) {
          return lines.slice(-maxLines);
        }
        position = Math.max(0, position - 8192);
      }
      const text = chunks.join('');
      return text ? text.split(/\r?\n/).filter(Boolean).slice(-maxLines) : [];
    } finally {
      try { fs.closeSync(fd); } catch {}
    }
  }
}


