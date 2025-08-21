import { Injectable, Logger } from '@nestjs/common';
import { FileLogEntry } from './file-logger.service';

export interface ParsedLogEntry extends FileLogEntry {
  parsedStatus?: 'started' | 'completed' | 'failed' | 'running' | 'unknown';
  parsedType?: 'workflow' | 'stage' | 'step' | 'command' | 'system';
  parsedProgress?: number;
  parsedDuration?: number;
  parsedError?: string;
}

export interface LogAnalysisResult {
  totalEntries: number;
  validEntries: number;
  invalidEntries: number;
  workflowEntries: number;
  stageEntries: number;
  stepEntries: number;
  errorEntries: number;
  statusDistribution: Record<string, number>;
  timeRange: {
    start: string | null;
    end: string | null;
    duration: number | null;
  };
}

@Injectable()
export class EnhancedLogParserService {
  private readonly logger = new Logger(EnhancedLogParserService.name);

  /**
   * 로그 엔트리를 향상된 형태로 파싱
   * 
   * @param entry - 원본 로그 엔트리
   * @returns 파싱된 로그 엔트리 (상태, 타입, 진행률, 에러 정보 포함)
   */
  parseLogEntry(entry: FileLogEntry): ParsedLogEntry {
    const parsed: ParsedLogEntry = { ...entry };

    // 상태 파싱
    parsed.parsedStatus = this.parseStatus(entry);
    
    // 타입 파싱
    parsed.parsedType = this.parseType(entry);
    
    // 진행률 파싱
    parsed.parsedProgress = this.parseProgress(entry);
    
    // 에러 정보 파싱
    parsed.parsedError = this.parseError(entry);

    return parsed;
  }

  /**
   * 로그 엔트리 배열을 일괄 파싱
   * 
   * @param entries - 원본 로그 엔트리 배열
   * @returns 파싱된 로그 엔트리 배열
   */
  parseLogEntries(entries: FileLogEntry[]): ParsedLogEntry[] {
    return entries.map(entry => this.parseLogEntry(entry));
  }

  /**
   * 로그 분석 결과 생성
   * 
   * @param entries - 분석할 로그 엔트리 배열
   * @returns 로그 분석 결과 (통계, 시간 범위, 상태 분포 등)
   */
  analyzeLogs(entries: FileLogEntry[]): LogAnalysisResult {
    const parsedEntries = this.parseLogEntries(entries);
    
    const result: LogAnalysisResult = {
      totalEntries: entries.length,
      validEntries: parsedEntries.filter(e => e.parsedStatus !== 'unknown').length,
      invalidEntries: parsedEntries.filter(e => e.parsedStatus === 'unknown').length,
      workflowEntries: parsedEntries.filter(e => e.parsedType === 'workflow').length,
      stageEntries: parsedEntries.filter(e => e.parsedType === 'stage').length,
      stepEntries: parsedEntries.filter(e => e.parsedType === 'step').length,
      errorEntries: parsedEntries.filter(e => e.level === 'error').length,
      statusDistribution: {},
      timeRange: {
        start: null,
        end: null,
        duration: null
      }
    };

    // 상태 분포 계산
    const statusCounts = new Map<string, number>();
    for (const entry of parsedEntries) {
      const status = entry.parsedStatus || 'unknown';
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    }
    result.statusDistribution = Object.fromEntries(statusCounts);

    // 시간 범위 계산
    if (entries.length > 0) {
      const timestamps = entries
        .map(e => new Date(e.timestamp))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
      
      if (timestamps.length > 0) {
        const firstTimestamp = timestamps[0];
        const lastTimestamp = timestamps[timestamps.length - 1];
        
        if (firstTimestamp && lastTimestamp) {
          result.timeRange.start = firstTimestamp.toISOString();
          result.timeRange.end = lastTimestamp.toISOString();
          result.timeRange.duration = lastTimestamp.getTime() - firstTimestamp.getTime();
        }
      }
    }

    return result;
  }

  /**
   * 상태 파싱
   */
  private parseStatus(entry: FileLogEntry): 'started' | 'completed' | 'failed' | 'running' | 'unknown' {
    const message = entry.message?.toLowerCase() || '';
    const level = entry.level?.toLowerCase() || '';

    // 시작 상태
    if (message.includes('started') || message.includes('begin') || message.includes('init')) {
      return 'started';
    }

    // 완료 상태
    if (message.includes('completed') || message.includes('finished') || message.includes('done') || message.includes('success')) {
      return 'completed';
    }

    // 실패 상태
    if (level === 'error' || message.includes('failed') || message.includes('error') || message.includes('exception')) {
      return 'failed';
    }

    // 실행 중 상태
    if (message.includes('running') || message.includes('executing') || message.includes('processing')) {
      return 'running';
    }

    return 'unknown';
  }

  /**
   * 타입 파싱
   */
  private parseType(entry: FileLogEntry): 'workflow' | 'stage' | 'step' | 'command' | 'system' {
    const message = entry.message?.toLowerCase() || '';
    const context = entry.workflow || entry.stage || entry.step;

    if (message.includes('workflow') || (entry.workflow && !entry.stage && !entry.step)) {
      return 'workflow';
    }

    if (message.includes('stage') || (entry.stage && !entry.step)) {
      return 'stage';
    }

    if (message.includes('step') || entry.step) {
      return 'step';
    }

    if (message.includes('command') || message.includes('exec') || message.includes('run')) {
      return 'command';
    }

    return 'system';
  }

  /**
   * 진행률 파싱
   */
  private parseProgress(entry: FileLogEntry): number | undefined {
    const message = entry.message?.toLowerCase() || '';
    
    // 퍼센트 기반 진행률
    const percentMatch = message.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentMatch && percentMatch[1]) {
      return parseFloat(percentMatch[1]);
    }

    // 분수 기반 진행률 (예: "3/10 steps completed")
    const fractionMatch = message.match(/(\d+)\s*\/\s*(\d+)/);
    if (fractionMatch && fractionMatch[1] && fractionMatch[2]) {
      const current = parseInt(fractionMatch[1]);
      const total = parseInt(fractionMatch[2]);
      if (total > 0) {
        return Math.round((current / total) * 100);
      }
    }

    // 단계 기반 진행률
    if (message.includes('step') && entry.step) {
      // 단계 번호가 있는 경우 (예: "Step 3 of 5")
      const stepMatch = message.match(/step\s+(\d+)\s+of\s+(\d+)/i);
      if (stepMatch && stepMatch[1] && stepMatch[2]) {
        const current = parseInt(stepMatch[1]);
        const total = parseInt(stepMatch[2]);
        if (total > 0) {
          return Math.round((current / total) * 100);
        }
      }
    }

    return undefined;
  }

  /**
   * 에러 정보 파싱
   */
  private parseError(entry: FileLogEntry): string | undefined {
    if (entry.level !== 'error') {
      return undefined;
    }

    const message = entry.message || '';
    
    // 에러 메시지에서 핵심 정보 추출
    if (message.includes('Error:')) {
      return message.split('Error:')[1]?.trim();
    }
    
    if (message.includes('Exception:')) {
      return message.split('Exception:')[1]?.trim();
    }
    
    if (message.includes('Failed:')) {
      return message.split('Failed:')[1]?.trim();
    }

    return message;
  }

  /**
   * 특정 상태의 엔트리 필터링
   */
  filterByStatus(entries: ParsedLogEntry[], status: string): ParsedLogEntry[] {
    return entries.filter(entry => entry.parsedStatus === status);
  }

  /**
   * 특정 타입의 엔트리 필터링
   */
  filterByType(entries: ParsedLogEntry[], type: string): ParsedLogEntry[] {
    return entries.filter(entry => entry.parsedType === type);
  }

  /**
   * 시간 범위로 엔트리 필터링
   */
  filterByTimeRange(entries: ParsedLogEntry[], startTime: Date, endTime: Date): ParsedLogEntry[] {
    return entries.filter(entry => {
      const entryTime = new Date(entry.timestamp);
      return entryTime >= startTime && entryTime <= endTime;
    });
  }

  /**
   * 워크플로우별로 엔트리 그룹화
   */
  groupByWorkflow(entries: ParsedLogEntry[]): Map<string, ParsedLogEntry[]> {
    const groups = new Map<string, ParsedLogEntry[]>();
    
    for (const entry of entries) {
      const workflowId = entry.workflow || 'unknown';
      if (!groups.has(workflowId)) {
        groups.set(workflowId, []);
      }
      groups.get(workflowId)!.push(entry);
    }
    
    return groups;
  }

  /**
   * 스테이지별로 엔트리 그룹화
   */
  groupByStage(entries: ParsedLogEntry[]): Map<string, ParsedLogEntry[]> {
    const groups = new Map<string, ParsedLogEntry[]>();
    
    for (const entry of entries) {
      const stageId = entry.stage || 'unknown';
      if (!groups.has(stageId)) {
        groups.set(stageId, []);
      }
      groups.get(stageId)!.push(entry);
    }
    
    return groups;
  }

  /**
   * 단계별로 엔트리 그룹화
   */
  groupByStep(entries: ParsedLogEntry[]): Map<string, ParsedLogEntry[]> {
    const groups = new Map<string, ParsedLogEntry[]>();
    
    for (const entry of entries) {
      const stepId = entry.step || 'unknown';
      if (!groups.has(stepId)) {
        groups.set(stepId, []);
      }
      groups.get(stepId)!.push(entry);
    }
    
    return groups;
  }

  /**
   * 로그 엔트리에서 워크플로우 실행 요약 생성
   */
  generateExecutionSummary(entries: ParsedLogEntry[]): {
    workflowName: string;
    totalStages: number;
    totalSteps: number;
    completedStages: number;
    completedSteps: number;
    failedStages: number;
    failedSteps: number;
    overallProgress: number;
    estimatedTimeRemaining?: number;
  } {
    const workflowEntries = entries.filter(e => e.parsedType === 'workflow');
    const stageEntries = entries.filter(e => e.parsedType === 'stage');
    const stepEntries = entries.filter(e => e.parsedType === 'step');

    const workflowName = workflowEntries[0]?.workflow || 'unknown';
    
    const totalStages = new Set(stageEntries.map(e => e.stage)).size;
    const totalSteps = new Set(stepEntries.map(e => e.step)).size;
    
    const completedStages = stageEntries.filter(e => e.parsedStatus === 'completed').length;
    const completedSteps = stepEntries.filter(e => e.parsedStatus === 'completed').length;
    
    const failedStages = stageEntries.filter(e => e.parsedStatus === 'failed').length;
    const failedSteps = stepEntries.filter(e => e.parsedStatus === 'failed').length;
    
    const overallProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    // 예상 시간 계산 (간단한 추정)
    let estimatedTimeRemaining: number | undefined;
    if (entries.length > 1 && overallProgress > 0) {
      const firstEntry = entries[0];
      const lastEntry = entries[entries.length - 1];
      
      if (firstEntry && lastEntry) {
        const elapsedTime = new Date(lastEntry.timestamp).getTime() - new Date(firstEntry.timestamp).getTime();
        const progressRatio = overallProgress / 100;
        if (progressRatio > 0) {
          const estimatedTotalTime = elapsedTime / progressRatio;
          estimatedTimeRemaining = estimatedTotalTime - elapsedTime;
        }
      }
    }

    return {
      workflowName,
      totalStages,
      totalSteps,
      completedStages,
      completedSteps,
      failedStages,
      failedSteps,
      overallProgress,
      estimatedTimeRemaining
    };
  }
}
