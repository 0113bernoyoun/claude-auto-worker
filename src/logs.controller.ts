import { Controller, Get, HttpException, HttpStatus, Query } from '@nestjs/common';
import * as fs from 'fs';
import { FileLoggerService, FileLogEntry } from './core/file-logger.service';

@Controller('logs')
export class LogsController {
  constructor(private readonly fileLogger: FileLoggerService) {}

  @Get()
  async getLogs(
    @Query('runId') runId?: string,
    @Query('lines') lines?: string,
    @Query('level') level?: string,
  ): Promise<FileLogEntry[]> {
    const maxLines = Math.max(1, Math.min(5000, parseInt(lines || '500', 10)));

    const logPath = this.fileLogger.getLogFilePath(runId);
    if (!logPath) {
      throw new HttpException('Log file not found', HttpStatus.NOT_FOUND);
    }

    try {
      const content = fs.readFileSync(logPath, { encoding: 'utf-8' });
      const allLines = content.split(/\r?\n/).filter(Boolean);
      const slice = allLines.slice(-maxLines);
      const entries = slice
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
}


