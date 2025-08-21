import { Injectable } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { EnhancedLogParserService } from '../../core/enhanced-log-parser.service';
import { FileLoggerService } from '../../core/file-logger.service';
import { StageStateSnapshot, WorkflowStateSnapshot, WorkflowStateTrackerService } from '../../core/workflow-state-tracker.service';

@Injectable()
@Command({
  name: 'enhanced-status',
  description: 'Enhanced Claude workflow status with detailed state tracking and analysis',
})
export class EnhancedStatusCommand extends CommandRunner {
  constructor(
    private readonly fileLogger: FileLoggerService,
    private readonly stateTracker: WorkflowStateTrackerService,
    private readonly enhancedLogParser: EnhancedLogParserService
  ) {
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
    description: 'Output format (detailed, summary, json, table)',
  })
  parseFormat(val: string): string {
    return val || 'detailed';
  }

  @Option({
    flags: '-r, --run <id>',
    description: 'Run ID to show status for (defaults to latest)'
  })
  parseRun(val: string): string {
    return val;
  }

  @Option({
    flags: '--refresh',
    description: 'Refresh state analysis from logs',
  })
  parseRefresh(val: string): boolean {
    return val === undefined || val === 'true';
  }

  @Option({
    flags: '--history',
    description: 'Show execution history',
  })
  parseHistory(val: string): boolean {
    return val === undefined || val === 'true';
  }

  async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    console.log('📊 Enhanced Claude Workflow Status');
    console.log('==================================');

    if (options?.all) {
      await this.showAllWorkflowStatuses(options);
      return;
    }

    const runId: string | undefined = options?.run;
    if (!runId) {
      console.log('❌ Run ID is required. Use -r or --run option.');
      return;
    }

    await this.showWorkflowStatus(runId, options || {});
  }

  private async showAllWorkflowStatuses(options: Record<string, any>): Promise<void> {
    try {
      const states = await this.stateTracker.getAllWorkflowStates();
      
      if (states.length === 0) {
        console.log('📭 No workflow states found');
        return;
      }

      console.log(`📋 Found ${states.length} workflow executions\n`);

      if (options?.format === 'json') {
        console.log(JSON.stringify(states, null, 2));
        return;
      }

      if (options?.format === 'table') {
        this.printStatusTable(states);
        return;
      }

      // 기본 상세 형식
      for (const state of states) {
        await this.printWorkflowStatus(state, 'summary');
        console.log(''); // 구분선
      }

      if (options?.history) {
        console.log('\n📈 Execution History Summary');
        console.log('============================');
        this.printExecutionHistory(states);
      }

    } catch (error) {
      console.error('❌ Failed to retrieve workflow states:', error);
    }
  }

  private async showWorkflowStatus(runId: string, options: Record<string, any>): Promise<void> {
    try {
      let state = await this.stateTracker.getWorkflowState(runId);
      
      if (!state) {
        console.log(`❌ No workflow state found for run ID: ${runId}`);
        return;
      }

      // 상태 새로고침이 요청된 경우
      if (options?.refresh) {
        const filePath = this.fileLogger.getLogFilePath(runId);
        if (filePath) {
          const refreshedState = await this.stateTracker.analyzeWorkflowState(runId, filePath);
          if (refreshedState) {
            state = refreshedState;
            console.log('🔄 State refreshed from logs\n');
          }
        }
      }

      await this.printWorkflowStatus(state, options?.format || 'detailed');

    } catch (error) {
      console.error('❌ Failed to retrieve workflow status:', error);
    }
  }

  private async printWorkflowStatus(state: WorkflowStateSnapshot, format: string): Promise<void> {
    if (format === 'json') {
      console.log(JSON.stringify(state, null, 2));
      return;
    }

    if (format === 'summary') {
      this.printStatusSummary(state);
      return;
    }

    // 상세 형식
    console.log(`🏗️  Workflow: ${state.workflowName}`);
    console.log(`🆔 Run ID: ${state.runId}`);
    console.log(`📊 Status: ${this.getStatusIcon(state.status)} ${state.status.toUpperCase()}`);
    console.log(`📈 Progress: ${state.progress}%`);
    console.log(`⚡ Total Steps: ${state.totalSteps}`);
    console.log(`✅ Completed Steps: ${state.completedSteps}`);
    console.log(`❌ Failed Steps: ${state.failedSteps}`);
    
    if (state.startedAt) {
      console.log(`🚀 Started: ${state.startedAt}`);
    }
    if (state.updatedAt) {
      console.log(`🔄 Last Updated: ${state.updatedAt}`);
    }
    if (state.completedAt) {
      console.log(`🏁 Completed: ${state.completedAt}`);
    }
    if (state.error) {
      console.log(`💥 Error: ${state.error}`);
    }

    // 스테이지별 상세 정보
    if (Object.keys(state.stages).length > 0) {
      console.log('\n📋 Stage Details:');
      console.log('================');
      
      for (const [stageId, stage] of Object.entries(state.stages)) {
        this.printStageStatus(stageId, stage);
      }
    }

    // 진행률 바
    this.printProgressBar(state.progress);
  }

  private printStatusSummary(state: WorkflowStateSnapshot): void {
    const statusIcon = this.getStatusIcon(state.status);
    const progressBar = this.getProgressBar(state.progress, 20);
    
    console.log(`${statusIcon} ${state.workflowName} (${state.runId})`);
    console.log(`   ${progressBar} ${state.progress}%`);
    console.log(`   📊 ${state.completedSteps}/${state.totalSteps} steps completed`);
    
    if (state.failedSteps > 0) {
      console.log(`   ❌ ${state.failedSteps} steps failed`);
    }
    
    if (state.startedAt) {
      const duration = this.calculateDuration(state.startedAt, state.updatedAt || state.completedAt);
      if (duration) {
        console.log(`   ⏱️  Duration: ${duration}`);
      }
    }
  }

  private printStageStatus(stageId: string, stage: StageStateSnapshot): void {
    const statusIcon = this.getStatusIcon(stage.status);
    const progressBar = this.getProgressBar(stage.progress, 15);
    
    console.log(`  ${statusIcon} ${stageId}: ${progressBar} ${stage.progress}%`);
    console.log(`    📊 ${stage.completedSteps}/${stage.totalSteps} steps completed`);
    
    if (stage.failedSteps > 0) {
      console.log(`    ❌ ${stage.failedSteps} steps failed`);
    }
    
    if (stage.error) {
      console.log(`    💥 Error: ${stage.error}`);
    }

    // 단계별 상세 정보
    if (Object.keys(stage.steps).length > 0) {
      for (const [stepId, step] of Object.entries(stage.steps)) {
        const stepStatusIcon = this.getStatusIcon(step.status);
        console.log(`      ${stepStatusIcon} ${stepId}: ${step.status}`);
        
        if (step.error) {
          console.log(`        💥 ${step.error}`);
        }
        
        if (step.attempts > 1) {
          console.log(`        🔄 Attempts: ${step.attempts}`);
        }
      }
    }
  }

  private printStatusTable(states: WorkflowStateSnapshot[]): void {
    console.log('┌─────────────────────┬─────────────┬──────────┬──────────┬─────────────────────┐');
    console.log('│ Workflow            │ Status      │ Progress │ Steps    │ Started             │');
    console.log('├─────────────────────┼─────────────┼──────────┼──────────┼─────────────────────┤');
    
    for (const state of states) {
      const workflowName = state.workflowName.padEnd(19);
      const status = state.status.toUpperCase().padEnd(11);
      const progress = `${state.progress}%`.padEnd(8);
      const steps = `${state.completedSteps}/${state.totalSteps}`.padEnd(8);
      const started = state.startedAt ? new Date(state.startedAt).toLocaleString().padEnd(19) : 'N/A'.padEnd(19);
      
      console.log(`│ ${workflowName} │ ${status} │ ${progress} │ ${steps} │ ${started} │`);
    }
    
    console.log('└─────────────────────┴─────────────┴──────────┴──────────┴─────────────────────┘');
  }

  private printExecutionHistory(states: WorkflowStateSnapshot[]): void {
    const statusCounts = new Map<string, number>();
    const totalExecutions = states.length;
    
    for (const state of states) {
      const status = state.status;
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    }
    
    console.log(`Total Executions: ${totalExecutions}`);
    
    for (const [status, count] of statusCounts.entries()) {
      const percentage = ((count / totalExecutions) * 100).toFixed(1);
      const statusIcon = this.getStatusIcon(status as any);
      console.log(`${statusIcon} ${status.toUpperCase()}: ${count} (${percentage}%)`);
    }
    
    // 성공률 계산
    const successful = statusCounts.get('completed') || 0;
    const failed = statusCounts.get('failed') || 0;
    const successRate = totalExecutions > 0 ? ((successful / totalExecutions) * 100).toFixed(1) : '0.0';
    
    console.log(`\n🎯 Success Rate: ${successRate}%`);
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'cancelled': return '🚫';
      default: return '❓';
    }
  }

  private getProgressBar(progress: number, width: number): string {
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;
    
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    
    return filledBar + emptyBar;
  }

  private printProgressBar(progress: number): void {
    const bar = this.getProgressBar(progress, 30);
    console.log(`\n📊 Progress: [${bar}] ${progress}%`);
  }

  private calculateDuration(startTime: string, endTime?: string): string | null {
    try {
      const start = new Date(startTime);
      const end = endTime ? new Date(endTime) : new Date();
      
      const durationMs = end.getTime() - start.getTime();
      if (durationMs < 0) return null;
      
      const seconds = Math.floor(durationMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      } else {
        return `${seconds}s`;
      }
    } catch {
      return null;
    }
  }
}
