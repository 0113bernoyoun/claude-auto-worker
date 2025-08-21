import { Controller, Get, HttpException, HttpStatus, Query } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { WorkflowStateTrackerService, WorkflowStateSnapshot } from './core/workflow-state-tracker.service';
import { FileLoggerService } from './core/file-logger.service';

@Controller()
export class StatusController {
  constructor(
    private readonly stateTracker: WorkflowStateTrackerService,
    private readonly fileLogger: FileLoggerService,
  ) {}

  @Get('status')
  async getStatus(@Query('runId') runId?: string): Promise<WorkflowStateSnapshot> {
    // 1) runId가 주어지면 해당 상태 반환 시도
    if (runId) {
      const existing = await this.stateTracker.getWorkflowState(runId);
      if (existing) return existing;

      const logPath = this.fileLogger.getLogFilePath(runId);
      if (!logPath) {
        throw new HttpException('Log not found for provided runId', HttpStatus.NOT_FOUND);
      }
      const snapshot = await this.stateTracker.analyzeWorkflowState(runId, logPath);
      if (!snapshot) {
        throw new HttpException('Failed to analyze workflow state', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      return snapshot;
    }

    // 2) runId가 없으면 최신 로그 기준으로 상태 반환
    const latestPath = this.fileLogger.getLogFilePath();
    if (!latestPath) {
      throw new HttpException('No logs available', HttpStatus.NOT_FOUND);
    }

    const derivedRunId = this.deriveRunIdFromPathOrContent(latestPath);
    if (!derivedRunId) {
      throw new HttpException('Unable to determine runId from latest logs', HttpStatus.NOT_FOUND);
    }

    const existing = await this.stateTracker.getWorkflowState(derivedRunId);
    if (existing) return existing;

    const resolvedPath = this.resolveSymlink(latestPath);
    const snapshot = await this.stateTracker.analyzeWorkflowState(derivedRunId, resolvedPath);
    if (!snapshot) {
      throw new HttpException('Failed to analyze workflow state', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return snapshot;
  }

  @Get('states')
  async listStates(): Promise<WorkflowStateSnapshot[]> {
    return this.stateTracker.getAllWorkflowStates();
  }

  private resolveSymlink(p: string): string {
    try {
      const stat = fs.lstatSync(p);
      if (stat.isSymbolicLink()) {
        const target = fs.readlinkSync(p);
        if (path.isAbsolute(target)) return target;
        return path.resolve(path.dirname(p), target);
      }
    } catch {
      // ignore
    }
    return p;
  }

  private deriveRunIdFromPathOrContent(p: string): string | undefined {
    const base = path.basename(this.resolveSymlink(p));
    const m = base.match(/^run-(.+)\.log$/);
    if (m && m[1]) return m[1];

    // latest.log 파일에서 첫 유효 JSON 라인을 읽어 runId 추출
    try {
      const content = fs.readFileSync(this.resolveSymlink(p), { encoding: 'utf-8' });
      const line = content.split(/\r?\n/).find(Boolean);
      if (line) {
        const obj = JSON.parse(line);
        if (obj && typeof obj.runId === 'string' && obj.runId.length > 0) return obj.runId;
      }
    } catch {
      // ignore
    }
    return undefined;
  }
}


