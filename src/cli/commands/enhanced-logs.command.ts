import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { Command, CommandRunner, Option } from 'nest-commander';
import * as path from 'path';
import * as readline from 'readline';
import { LoggingConfigService } from '../../config/logging-config.service';
import { CLI_CONSTANTS } from '../../config/cli.constants';
import { EnhancedLogParserService, ParsedLogEntry } from '../../core/enhanced-log-parser.service';
import { FileLogEntry, FileLoggerService } from '../../core/file-logger.service';
import { WorkflowStateTrackerService } from '../../core/workflow-state-tracker.service';

@Injectable()
@Command({
  name: 'enhanced-logs',
  description: 'Enhanced Claude workflow logs with advanced state tracking and analysis',
  arguments: '[run-id]'
})
export class EnhancedLogsCommand extends CommandRunner {
  
  private readonly logger = new Logger(EnhancedLogsCommand.name);
  private invalidJsonCount: number = 0;
  private totalLinesProcessed: number = 0;

  constructor(
    private readonly fileLogger: FileLoggerService,
    private readonly loggingConfig: LoggingConfigService,
    private readonly enhancedLogParser: EnhancedLogParserService,
    private readonly stateTracker: WorkflowStateTrackerService
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

  @Option({
    flags: '--analysis',
    description: 'Show log analysis and execution summary',
  })
  parseAnalysis(val: string): boolean {
    return val === undefined || val === 'true';
  }

  @Option({
    flags: '--state',
    description: 'Show detailed workflow state information',
  })
  parseState(val: string): boolean {
    return val === undefined || val === 'true';
  }

  @Option({
    flags: '--format <format>',
    description: 'Output format (detailed, summary, json)',
  })
  parseFormat(val: string): string {
    return val || 'detailed';
  }

  private parseCompoundTime(since?: string): Date | undefined {
    if (!since) return undefined;
    
    const config = this.loggingConfig.getConfig();
    if (!config.timeParsing.supportCompoundUnits) {
      return this.parseSimpleTime(since);
    }

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
      
                   if (fileSize > CLI_CONSTANTS.LARGE_FILE_THRESHOLD) {
               return this.getLastLinesFromLargeFile(filePath, numLines);
             }
      
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
      const stats = fs.statSync(filePath);
      let position = stats.size;
      let remainingLines = numLines;

      while (remainingLines > 0 && position > 0) {
                     const chunkSize = Math.min(CLI_CONSTANTS.BUFFER_SIZE, position);
        const start = Math.max(0, position - chunkSize);
        
        const buffer = Buffer.alloc(chunkSize);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, chunkSize, start);
        fs.closeSync(fd);

        const chunk = buffer.toString('utf-8');
        const linesInChunk = chunk.split(/\r?\n/);
        
        for (let i = linesInChunk.length - 1; i > 0 && remainingLines > 0; i--) {
          const line = linesInChunk[i];
          if (line && line.trim()) {
            lines.unshift(line);
            remainingLines--;
          }
        }

        position = start;
        
        if (lines.length > numLines * 2) {
          break;
        }
      }

      return lines.slice(-numLines);
    } catch {
      return [];
    }
  }

  private filterEntries(entries: ParsedLogEntry[], opts: { level?: string; since?: Date }): ParsedLogEntry[] {
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

  private parseLogLine(line: string, showInvalidJson: boolean): ParsedLogEntry | null {
    try {
      const entry: FileLogEntry = JSON.parse(line);
      this.totalLinesProcessed++;
      return this.enhancedLogParser.parseLogEntry(entry);
    } catch (error) {
      this.invalidJsonCount++;
      if (showInvalidJson) {
        this.logger.warn(`⚠️  Invalid JSON at line ${this.totalLinesProcessed + 1}: ${line.substring(0, 100)}...`);
      }
      return null;
    }
  }

  private printEntries(entries: ParsedLogEntry[], format: string = 'detailed'): void {
    if (format === 'json') {
      console.log(JSON.stringify(entries, null, 2));
      return;
    }

    if (format === 'summary') {
      this.printSummaryFormat(entries);
      return;
    }

    // 기본 상세 형식
    for (const e of entries) {
      const context: string[] = [];
      if (e.workflow) context.push(`wf=${e.workflow}`);
      if (e.stage) context.push(`stage=${e.stage}`);
      if (e.step) context.push(`step=${e.step}`);
      const ctxStr = context.length > 0 ? ` [${context.join(' ')}]` : '';
      
      const statusIcon = this.getStatusIcon(e.parsedStatus);
      const typeIcon = this.getTypeIcon(e.parsedType);
      
      console.log(`${e.timestamp} ${statusIcon}${typeIcon} [${e.level.toUpperCase()}]${ctxStr} ${e.message}`);
      
      if (e.parsedProgress !== undefined) {
        console.log(`  📊 Progress: ${e.parsedProgress}%`);
      }
      
      if (e.parsedError) {
        console.log(`  ❌ Error: ${e.parsedError}`);
      }
    }
  }

  private printSummaryFormat(entries: ParsedLogEntry[]): void {
    const analysis = this.enhancedLogParser.analyzeLogs(entries);
    const summary = this.enhancedLogParser.generateExecutionSummary(entries);
    
    console.log('📊 Log Analysis Summary');
    console.log('========================');
    console.log(`Total Entries: ${analysis.totalEntries}`);
    console.log(`Valid Entries: ${analysis.validEntries}`);
    console.log(`Error Entries: ${analysis.errorEntries}`);
    console.log(`Time Range: ${analysis.timeRange.start} → ${analysis.timeRange.end}`);
    
    if (analysis.timeRange.duration) {
      const durationMs = analysis.timeRange.duration;
      const durationStr = this.formatDuration(durationMs);
      console.log(`Duration: ${durationStr}`);
    }
    
    console.log('\n🚀 Execution Summary');
    console.log('===================');
    console.log(`Workflow: ${summary.workflowName}`);
    console.log(`Overall Progress: ${summary.overallProgress}%`);
    console.log(`Stages: ${summary.completedStages}/${summary.totalStages} completed`);
    console.log(`Steps: ${summary.completedSteps}/${summary.totalSteps} completed`);
    
    if (summary.failedStages > 0) {
      console.log(`❌ Failed Stages: ${summary.failedStages}`);
    }
    
    if (summary.failedSteps > 0) {
      console.log(`❌ Failed Steps: ${summary.failedSteps}`);
    }
    
    if (summary.estimatedTimeRemaining) {
      const remainingStr = this.formatDuration(summary.estimatedTimeRemaining);
      console.log(`⏱️  Estimated Time Remaining: ${remainingStr}`);
    }
  }

  private getStatusIcon(status?: string): string {
    switch (status) {
      case 'started': return '🚀 ';
      case 'completed': return '✅ ';
      case 'failed': return '❌ ';
      case 'running': return '🔄 ';
      default: return '📝 ';
    }
  }

  private getTypeIcon(type?: string): string {
    switch (type) {
      case 'workflow': return '🏗️ ';
      case 'stage': return '📋 ';
      case 'step': return '⚡ ';
      case 'command': return '💻 ';
      case 'system': return '🔧 ';
      default: return '';
    }
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
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
    const showAnalysis = options?.analysis;
    const showState = options?.state;
    const format = options?.format || 'detailed';

    const maxLines = this.loggingConfig.getConfig().display.maxLines;
    const actualLinesNum = Math.min(linesNum, maxLines);

    console.log('📝 Enhanced Claude Workflow Logs');
    console.log('================================');

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

    // 워크플로우 상태 분석
    if (showState && runId) {
      const state = await this.stateTracker.analyzeWorkflowState(runId, filePath);
      if (state) {
        console.log('\n🏗️  Workflow State Analysis');
        console.log('===========================');
        console.log(`Status: ${state.status}`);
        console.log(`Progress: ${state.progress}%`);
        console.log(`Total Steps: ${state.totalSteps}`);
        console.log(`Completed Steps: ${state.completedSteps}`);
        console.log(`Failed Steps: ${state.failedSteps}`);
        
        if (state.startedAt) {
          console.log(`Started: ${state.startedAt}`);
        }
        if (state.completedAt) {
          console.log(`Completed: ${state.completedAt}`);
        }
        if (state.error) {
          console.log(`Error: ${state.error}`);
        }
      }
    }

    const initialLines = this.getLastLinesOptimized(filePath, actualLinesNum);
    const initialEntries: ParsedLogEntry[] = initialLines
      .map(l => this.parseLogLine(l, showInvalidJson))
      .filter(Boolean) as ParsedLogEntry[];
    
    const filtered = this.filterEntries(initialEntries, { 
      level: options?.level, 
      since: sinceDate 
    });
    
    this.printEntries(filtered, format);

    if (showAnalysis) {
      console.log('\n');
      this.printSummaryFormat(filtered);
    }

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
          position = 0;
        }
        if (stats.size > position) {
          const stream = fs.createReadStream(filePath, { start: position, end: stats.size });
          const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
          rl.on('line', (line: string) => {
            const entry = this.parseLogLine(line, showInvalidJson);
            if (entry) {
              const pass = this.filterEntries([entry], { level: options?.level, since: sinceDate });
              if (pass.length > 0) this.printEntries(pass, format);
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

    const interval = setInterval(onAppend, 1000);

    await new Promise<void>((resolve) => {
      const stop = () => {
        clearInterval(interval);
        try { watcher.close(); } catch {}
        this.printSummary();
        resolve();
      };
      
      if (process.env.JEST_WORKER_ID) {
        setTimeout(stop, 50);
      } else {
        process.on('SIGINT', stop);
      }
    });
  }
}
