import { Injectable, Logger } from '@nestjs/common';
import { ParsedWorkflow, WorkflowDefinition, WorkflowStage, WorkflowStep } from '../parser/workflow.types';
import { ExecutionStateService } from './execution-state.service';
import {
    ExecutorOptions,
    StageExecutionStatus,
    StepExecutionStatus,
    WorkflowExecutionStatus
} from './execution.types';

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);

  constructor(private readonly state: ExecutionStateService) {}

  async execute(parsed: ParsedWorkflow, options?: ExecutorOptions): Promise<void> {
    const workflow = parsed.workflow;
    const stageOrder = this.determineStageOrder(workflow);
    const stepIdsByStage = this.mapStageSteps(workflow);

    this.state.initialize(workflow.name, stageOrder, stepIdsByStage);
    this.state.setWorkflowStatus(WorkflowExecutionStatus.RUNNING);

    try {
      for (const stageId of stageOrder) {
        await this.executeStage(workflow, stageId, options);
      }
      this.state.setWorkflowStatus(WorkflowExecutionStatus.COMPLETED);
    } catch (error) {
      this.state.setWorkflowStatus(WorkflowExecutionStatus.FAILED);
      throw error;
    }
  }

  private determineStageOrder(workflow: WorkflowDefinition): string[] {
    // Simple order: as defined. Later enhance for depends_on topological sort.
    return (workflow.stages || []).map(s => s.id);
  }

  private mapStageSteps(workflow: WorkflowDefinition): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const stage of workflow.stages || []) {
      result[stage.id] = stage.steps.slice();
    }
    return result;
  }

  private async executeStage(workflow: WorkflowDefinition, stageId: string, options?: ExecutorOptions): Promise<void> {
    const stage = (workflow.stages || []).find(s => s.id === stageId);
    if (!stage) return;

    this.state.setStageStatus(stageId, StageExecutionStatus.RUNNING);
    const stepRefs = stage.steps || [];

    // Sequential step execution for MVP (parallel=false or undefined)
    for (const stepRef of stepRefs) {
      const step = workflow.steps.find(s => s.id === stepRef);
      if (!step) continue;
      await this.executeStep(stage, step, options);
    }

    this.state.setStageStatus(stageId, StageExecutionStatus.COMPLETED);
  }

  private async executeStep(stage: WorkflowStage, step: WorkflowStep, options?: ExecutorOptions): Promise<void> {
    const stageId = stage.id;
    const stepId = step.id;
    this.state.setStepStatus(stageId, stepId, StepExecutionStatus.RUNNING);

    try {
      if (options?.dryRun) {
        // In dry-run, just simulate minor delay
        await this.delay(50, options?.signal);
      } else {
        // For TASK-020, we only simulate execution. Actual Claude and command runs belong to later tasks.
        await this.simulateWork(step, options);
      }

      this.state.setStepStatus(stageId, stepId, StepExecutionStatus.COMPLETED);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.state.setStepStatus(stageId, stepId, StepExecutionStatus.FAILED, message);
      throw error;
    }
  }

  private async simulateWork(step: WorkflowStep, options?: ExecutorOptions): Promise<void> {
    // Minimal simulation respecting a basic timeout policy if defined
    const timeoutSeconds = step.policy?.timeout?.seconds ?? 0;
    const maxDurationMs = timeoutSeconds > 0 ? timeoutSeconds * 1000 : 200;
    await this.delay(Math.min(200, maxDurationMs), options?.signal);
  }

  private delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Execution aborted'));
        });
      }
    });
  }
}


