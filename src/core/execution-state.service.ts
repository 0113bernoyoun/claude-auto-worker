import { Injectable } from '@nestjs/common';
import {
    StageExecutionState,
    StageExecutionStatus,
    StepExecutionState,
    StepExecutionStatus,
    WorkflowExecutionState,
    WorkflowExecutionStatus
} from './execution.types';

@Injectable()
export class ExecutionStateService {
  private state?: WorkflowExecutionState;

  initialize(workflowName: string, stageIds: string[], stepIdsByStage: Record<string, string[]>): void {
    const stages: Record<string, StageExecutionState> = {};
    for (const stageId of stageIds) {
      const stepStates: Record<string, StepExecutionState> = {};
      for (const stepId of stepIdsByStage[stageId] || []) {
        stepStates[stepId] = {
          id: stepId,
          status: StepExecutionStatus.PENDING,
          attempts: 0,
        };
      }

      stages[stageId] = {
        id: stageId,
        status: StageExecutionStatus.PENDING,
        steps: stepStates,
      };
    }

    this.state = {
      name: workflowName,
      status: WorkflowExecutionStatus.PENDING,
      stages,
    };
  }

  getState(): WorkflowExecutionState | undefined {
    return this.state;
  }

  setWorkflowStatus(status: WorkflowExecutionStatus): void {
    if (!this.state) return;
    this.state.status = status;
    this.state.updatedAt = new Date();
    if (status === WorkflowExecutionStatus.RUNNING) {
      this.state.startedAt = this.state.startedAt ?? new Date();
    }
    if (status === WorkflowExecutionStatus.COMPLETED || status === WorkflowExecutionStatus.FAILED || status === WorkflowExecutionStatus.CANCELLED) {
      this.state.completedAt = new Date();
    }
  }

  setStageStatus(stageId: string, status: StageExecutionStatus, error?: string): void {
    if (!this.state) return;
    const stage = this.state.stages[stageId];
    if (!stage) return;
    stage.status = status;
    stage.updatedAt = new Date();
    if (error) stage.error = error;
    if (status === StageExecutionStatus.RUNNING) {
      stage.startedAt = stage.startedAt ?? new Date();
    }
    if (status === StageExecutionStatus.COMPLETED || status === StageExecutionStatus.FAILED || status === StageExecutionStatus.SKIPPED) {
      stage.completedAt = new Date();
    }
  }

  setStepStatus(stageId: string, stepId: string, status: StepExecutionStatus, error?: string): void {
    if (!this.state) return;
    const stage = this.state.stages[stageId];
    if (!stage) return;
    const step = stage.steps[stepId];
    if (!step) return;
    step.status = status;
    step.updatedAt = new Date();
    if (error) step.error = error;
    if (status === StepExecutionStatus.RUNNING) {
      step.attempts += 1;
      step.startedAt = step.startedAt ?? new Date();
    }
    if (status === StepExecutionStatus.COMPLETED || status === StepExecutionStatus.FAILED || status === StepExecutionStatus.SKIPPED) {
      step.completedAt = new Date();
    }
  }
}


