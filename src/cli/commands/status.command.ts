import { Injectable } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import * as fs from 'fs';
import { FileLoggerService, FileLogEntry, FileLogLevel } from '../../core/file-logger.service';

@Injectable()
@Command({
  name: 'status',
  description: 'Show Claude workflow status inferred from latest run logs',
})
export class StatusCommand extends CommandRunner {
  constructor(private readonly fileLogger: FileLoggerService) {
    super();
  }
  @Option({
    flags: '-w, --workflow <id>',
    description: 'Show status for specific workflow ID',
  })
  parseWorkflow(val: string): string {
    return val;
  }

  @Option({
    flags: '-a, --all',
    description: 'Show status for all workflows',
  })
  parseAll(val: string): boolean {
    return val === undefined || val === 'true';
  }

  @Option({
    flags: '-f, --format <format>',
    description: 'Output format (json, table, simple)',
  })
  parseFormat(val: string): string {
    return val;
  }

  @Option({
    flags: '-r, --run <id>',
    description: 'Run ID to infer status from (defaults to latest)'
  })
  parseRun(val: string): string {
    return val;
  }

  private readAllEntries(filePath: string): FileLogEntry[] {
    try {
      const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
      return content
        .split(/\r?\n/)
        .filter(Boolean)
        .map(line => { try { return JSON.parse(line); } catch { return undefined as any; } })
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  private inferStatus(entries: FileLogEntry[], opts?: { workflow?: string }): { workflow?: string; status: 'running' | 'completed' | 'failed' | 'unknown'; progress: number; startedAt?: string; updatedAt?: string; lastLevel?: FileLogLevel; lastMessage?: string } {
    const filtered = opts?.workflow ? entries.filter(e => e.workflow === opts.workflow) : entries;
    if (filtered.length === 0) {
      return { status: 'unknown', progress: 0 };
    }
    // Determine workflow name and steps
    const workflow = filtered.find(e => !!e.workflow)?.workflow;
    const stepStarts = new Set(filtered.filter(e => e.message === 'Step started').map(e => `${e.stage}:${e.step}`));
    const stepCompletes = new Set(filtered.filter(e => e.message === 'Step completed').map(e => `${e.stage}:${e.step}`));
    const stepFails = filtered.filter(e => (e.level === 'error' || (e.message || '').toLowerCase().startsWith('step failed')));
    const wfFailed = filtered.some(e => e.level === 'error' && (e.message || '').toLowerCase().includes('workflow failed'));
    const wfCompleted = filtered.some(e => (e.message || '').toLowerCase().includes('workflow completed'));
    let status: 'running' | 'completed' | 'failed' | 'unknown' = 'running';
    if (wfCompleted) status = 'completed';
    else if (wfFailed || stepFails.length > 0) status = 'failed';

    let total = stepStarts.size;
    if (total === 0) {
      // fallback to unique seen steps in entries
      const uniqueSteps = new Set(filtered.filter(e => e.step).map(e => `${e.stage}:${e.step}`));
      total = uniqueSteps.size;
    }
    const done = stepCompletes.size;
    const progress = total > 0 ? Math.round((done / total) * 100) : (status === 'completed' ? 100 : 0);
    const last = filtered[filtered.length - 1];
    const startedAt = filtered.find(e => (e.message || '').toLowerCase().includes('workflow started'))?.timestamp;
    const result = {
      workflow,
      status,
      progress,
      startedAt,
      updatedAt: last?.timestamp,
      lastLevel: last?.level,
      lastMessage: last?.message,
    };
    return result;
  }

  async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    console.log('📊 Claude Workflow Status');
    console.log('========================');

    const runId: string | undefined = options?.run;
    const filePath = this.fileLogger.getLogFilePath(runId);
    if (!filePath) {
      console.log(runId ? `No log file found for run: ${runId}` : 'No logs found');
      return;
    }

    const entries = this.readAllEntries(filePath);
    if (options?.all) {
      // Group by workflow and infer each
      const byWf = new Map<string, FileLogEntry[]>();
      for (const e of entries) {
        const key = e.workflow || 'unknown';
        const arr = byWf.get(key) || [];
        arr.push(e);
        byWf.set(key, arr);
      }
      for (const [wf, list] of byWf.entries()) {
        const s = this.inferStatus(list, { workflow: wf !== 'unknown' ? wf : undefined });
        console.log(`- ${wf}: ${s.status} (${s.progress}%)`);
      }
      console.log(`Output format: ${options?.format || 'table'}`);
      return;
    }

    const status = this.inferStatus(entries, { workflow: options?.workflow });
    if ((options?.format || 'table') === 'json') {
      console.log(JSON.stringify(status));
      return;
    }
    if (status.workflow) console.log(`Workflow: ${status.workflow}`);
    console.log(`Status: ${status.status}`);
    console.log(`Progress: ${status.progress}%`);
    if (status.startedAt) console.log(`Started: ${status.startedAt}`);
    if (status.updatedAt) console.log(`Updated: ${status.updatedAt}`);
    if (status.lastLevel && status.lastMessage) {
      console.log(`Last: [${String(status.lastLevel).toUpperCase()}] ${status.lastMessage}`);
    }
    console.log(`Output format: ${options?.format || 'table'}`);
  }
}
