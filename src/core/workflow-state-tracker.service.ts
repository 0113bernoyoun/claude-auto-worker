import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
    StageExecutionStatus,
    StepExecutionStatus,
    WorkflowExecutionStatus
} from './execution.types';
import { FileLogEntry } from './file-logger.service';

export interface WorkflowStateSnapshot {
  runId: string;
  workflowName: string;
  status: WorkflowExecutionStatus;
  progress: number;
  startedAt?: string;
  updatedAt?: string;
  completedAt?: string;
  error?: string;
  stages: Record<string, StageStateSnapshot>;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
}

export interface StageStateSnapshot {
  id: string;
  name?: string;
  status: StageExecutionStatus;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  steps: Record<string, StepStateSnapshot>;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
}

export interface StepStateSnapshot {
  id: string;
  name?: string;
  status: StepExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  attempts: number;
}

@Injectable()
export class WorkflowStateTrackerService {
  private readonly logger = new Logger(WorkflowStateTrackerService.name);
  private readonly stateCache = new Map<string, WorkflowStateSnapshot>();
  private readonly stateDir = '.workflow-states';
  private readonly MAX_CACHE_SIZE = 100; // 최대 캐시 크기 제한

  constructor() {
    this.ensureStateDirectory();
  }

  private ensureStateDirectory(): void {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  /**
   * 로그 파일에서 워크플로우 상태를 분석하여 스냅샷 생성
   * 
   * @param runId - 워크플로우 실행 ID
   * @param logFilePath - 로그 파일 경로
   * @returns 워크플로우 상태 스냅샷 또는 null (분석 실패 시)
   * @throws Error - 상태 저장 실패 시
   */
  async analyzeWorkflowState(runId: string, logFilePath: string): Promise<WorkflowStateSnapshot | null> {
    try {
      if (!fs.existsSync(logFilePath)) {
        return null;
      }

      const entries = this.readLogEntries(logFilePath);
      if (entries.length === 0) {
        return null;
      }

      const snapshot = this.buildStateSnapshot(runId, entries);
      
      // 상태 캐시에 저장
      this.addToCache(runId, snapshot);
      
      // 파일에 상태 저장
      await this.saveStateSnapshot(runId, snapshot);
      
      return snapshot;
    } catch (error) {
      this.logger.error(`Failed to analyze workflow state for runId: ${runId}`, error);
      return null;
    }
  }

  /**
   * runId로 워크플로우 상태 조회
   * 
   * @param runId - 워크플로우 실행 ID
   * @returns 워크플로우 상태 스냅샷 또는 null (상태를 찾을 수 없는 경우)
   */
  async getWorkflowState(runId: string): Promise<WorkflowStateSnapshot | null> {
    // 캐시에서 먼저 확인
    if (this.stateCache.has(runId)) {
      return this.stateCache.get(runId)!;
    }

    // 파일에서 로드 시도
    const snapshot = await this.loadStateSnapshot(runId);
    if (snapshot) {
      this.stateCache.set(runId, snapshot);
      return snapshot;
    }

    return null;
  }

  /**
   * 모든 워크플로우 상태 목록 조회
   * 
   * @returns 워크플로우 상태 스냅샷 배열 (최신 순으로 정렬됨)
   */
  async getAllWorkflowStates(): Promise<WorkflowStateSnapshot[]> {
    const states: WorkflowStateSnapshot[] = [];
    
    try {
      const files = fs.readdirSync(this.stateDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const runId = file.replace('.json', '');
          const state = await this.getWorkflowState(runId);
          if (state) {
            states.push(state);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to read workflow states directory', error);
    }

    // 최신 순으로 정렬
    return states.sort((a, b) => {
      const timeA = new Date(b.updatedAt || b.startedAt || '0').getTime();
      const timeB = new Date(a.updatedAt || a.startedAt || '0').getTime();
      return timeA - timeB;
    });
  }

  /**
   * 로그 엔트리 읽기
   */
  private readLogEntries(logFilePath: string): FileLogEntry[] {
    try {
      const content = fs.readFileSync(logFilePath, { encoding: 'utf-8' });
      return content
        .split(/\r?\n/)
        .filter(Boolean)
        .map(line => {
          try {
            return JSON.parse(line) as FileLogEntry;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as FileLogEntry[];
    } catch {
      return [];
    }
  }

  /**
   * 로그 엔트리로부터 상태 스냅샷 생성
   */
  private buildStateSnapshot(runId: string, entries: FileLogEntry[]): WorkflowStateSnapshot {
    const workflowName = entries.find(e => e.workflow)?.workflow || 'unknown';
    
    // 워크플로우 레벨 상태 분석
    const workflowStarted = entries.find(e => 
      e.message?.toLowerCase().includes('workflow started') ||
      e.message?.toLowerCase().includes('workflow execution started')
    );
    
    const workflowCompleted = entries.find(e => 
      e.message?.toLowerCase().includes('workflow completed') ||
      e.message?.toLowerCase().includes('workflow execution completed')
    );
    
    const workflowFailed = entries.find(e => 
      e.level === 'error' && (
        e.message?.toLowerCase().includes('workflow failed') ||
        e.message?.toLowerCase().includes('workflow execution failed')
      )
    );

    // 스테이지 및 단계 분석
    const stages = this.analyzeStages(entries);
    
    // 전체 진행률 계산
    const totalSteps = Object.values(stages).reduce((sum, stage) => sum + stage.totalSteps, 0);
    const completedSteps = Object.values(stages).reduce((sum, stage) => sum + stage.completedSteps, 0);
    const failedSteps = Object.values(stages).reduce((sum, stage) => sum + stage.failedSteps, 0);
    
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    // 상태 결정
    let status: WorkflowExecutionStatus = WorkflowExecutionStatus.RUNNING;
    if (workflowCompleted) {
      status = WorkflowExecutionStatus.COMPLETED;
    } else if (workflowFailed) {
      status = WorkflowExecutionStatus.FAILED;
    }

    return {
      runId,
      workflowName,
      status,
      progress,
      startedAt: workflowStarted?.timestamp,
      updatedAt: entries[entries.length - 1]?.timestamp,
      completedAt: workflowCompleted?.timestamp,
      error: workflowFailed?.message,
      stages,
      totalSteps,
      completedSteps,
      failedSteps
    };
  }

  /**
   * 스테이지 분석
   */
  private analyzeStages(entries: FileLogEntry[]): Record<string, StageStateSnapshot> {
    const stages: Record<string, StageStateSnapshot> = {};
    
    // 스테이지별 엔트리 그룹화
    const stageEntries = new Map<string, FileLogEntry[]>();
    
    for (const entry of entries) {
      if (entry.stage) {
        const stageId = entry.stage;
        if (!stageEntries.has(stageId)) {
          stageEntries.set(stageId, []);
        }
        stageEntries.get(stageId)!.push(entry);
      }
    }

    // 각 스테이지 분석
    for (const [stageId, stageEntriesList] of stageEntries.entries()) {
      stages[stageId] = this.analyzeStage(stageId, stageEntriesList);
    }

    return stages;
  }

  /**
   * 개별 스테이지 분석
   */
  private analyzeStage(stageId: string, entries: FileLogEntry[]): StageStateSnapshot {
    const stageName = entries.find(e => e.stage === stageId)?.stage || stageId;
    
    // 스테이지 시작/완료/실패 분석
    const stageStarted = entries.find(e => 
      e.message?.toLowerCase().includes('stage started') ||
      e.message?.toLowerCase().includes('stage execution started')
    );
    
    const stageCompleted = entries.find(e => 
      e.message?.toLowerCase().includes('stage completed') ||
      e.message?.toLowerCase().includes('stage execution completed')
    );
    
    const stageFailed = entries.find(e => 
      e.level === 'error' && (
        e.message?.toLowerCase().includes('stage failed') ||
        e.message?.toLowerCase().includes('stage execution failed')
      )
    );

    // 단계 분석
    const steps = this.analyzeSteps(entries);
    
    const totalSteps = Object.keys(steps).length;
    const completedSteps = Object.values(steps).filter(s => s.status === StepExecutionStatus.COMPLETED).length;
    const failedSteps = Object.values(steps).filter(s => s.status === StepExecutionStatus.FAILED).length;
    
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    // 상태 결정
    let status: StageExecutionStatus = StageExecutionStatus.RUNNING;
    if (stageCompleted) {
      status = StageExecutionStatus.COMPLETED;
    } else if (stageFailed) {
      status = StageExecutionStatus.FAILED;
    }

    return {
      id: stageId,
      name: stageName,
      status,
      progress,
      startedAt: stageStarted?.timestamp,
      completedAt: stageCompleted?.timestamp,
      error: stageFailed?.message,
      steps,
      totalSteps,
      completedSteps,
      failedSteps
    };
  }

  /**
   * 단계 분석
   */
  private analyzeSteps(entries: FileLogEntry[]): Record<string, StepStateSnapshot> {
    const steps: Record<string, StepStateSnapshot> = {};
    
    // 단계별 엔트리 그룹화
    const stepEntries = new Map<string, FileLogEntry[]>();
    
    for (const entry of entries) {
      if (entry.step) {
        const stepId = entry.step;
        if (!stepEntries.has(stepId)) {
          stepEntries.set(stepId, []);
        }
        stepEntries.get(stepId)!.push(entry);
      }
    }

    // 각 단계 분석
    for (const [stepId, stepEntriesList] of stepEntries.entries()) {
      steps[stepId] = this.analyzeStep(stepId, stepEntriesList);
    }

    return steps;
  }

  /**
   * 개별 단계 분석
   */
  private analyzeStep(stepId: string, entries: FileLogEntry[]): StepStateSnapshot {
    const stepName = entries.find(e => e.step === stepId)?.step || stepId;
    
    // 단계 시작/완료/실패 분석
    const stepStarted = entries.find(e => 
      e.message?.toLowerCase().includes('step started') ||
      e.message?.toLowerCase().includes('step execution started')
    );
    
    const stepCompleted = entries.find(e => 
      e.message?.toLowerCase().includes('step completed') ||
      e.message?.toLowerCase().includes('step execution completed')
    );
    
    const stepFailed = entries.find(e => 
      e.level === 'error' && (
        e.message?.toLowerCase().includes('step failed') ||
        e.message?.toLowerCase().includes('step execution failed')
      )
    );

    // 시도 횟수 계산 (재시도 로그 기반)
    const attempts = entries.filter(e => 
      e.message?.toLowerCase().includes('retry') ||
      e.message?.toLowerCase().includes('attempt')
    ).length + 1;

    // 상태 결정
    let status: StepExecutionStatus = StepExecutionStatus.RUNNING;
    if (stepCompleted) {
      status = StepExecutionStatus.COMPLETED;
    } else if (stepFailed) {
      status = StepExecutionStatus.FAILED;
    }

    return {
      id: stepId,
      name: stepName,
      status,
      startedAt: stepStarted?.timestamp,
      completedAt: stepCompleted?.timestamp,
      error: stepFailed?.message,
      attempts
    };
  }

  /**
   * 상태 스냅샷을 파일에 저장
   */
  private async saveStateSnapshot(runId: string, snapshot: WorkflowStateSnapshot): Promise<void> {
    try {
      const filePath = path.join(this.stateDir, `${runId}.json`);
      await fs.promises.writeFile(filePath, JSON.stringify(snapshot, null, 2));
    } catch (error) {
      this.logger.error(`Failed to save state snapshot for runId: ${runId}`, error);
      throw new Error(`Failed to save workflow state: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 파일에서 상태 스냅샷 로드
   */
  private async loadStateSnapshot(runId: string): Promise<WorkflowStateSnapshot | null> {
    try {
      const filePath = path.join(this.stateDir, `${runId}.json`);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const content = await fs.promises.readFile(filePath, { encoding: 'utf-8' });
      return JSON.parse(content) as WorkflowStateSnapshot;
    } catch (error) {
      this.logger.error(`Failed to load state snapshot for runId: ${runId}`, error);
      return null;
    }
  }

  /**
   * 캐시에 상태 스냅샷 추가 (LRU 정책 적용)
   */
  private addToCache(runId: string, snapshot: WorkflowStateSnapshot): void {
    if (this.stateCache.size >= this.MAX_CACHE_SIZE) {
      // LRU 정책: 가장 오래된 항목 제거
      const oldestKey = this.stateCache.keys().next().value;
      if (oldestKey) {
        this.stateCache.delete(oldestKey);
        this.logger.debug(`Removed oldest cache entry: ${oldestKey}`);
      }
    }
    this.stateCache.set(runId, snapshot);
  }

  /**
   * 캐시 정리
   */
  clearCache(): void {
    this.stateCache.clear();
  }

  /**
   * 특정 runId 캐시 제거
   */
  removeFromCache(runId: string): void {
    this.stateCache.delete(runId);
  }
}
