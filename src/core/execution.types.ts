export enum WorkflowExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum StageExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export enum StepExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export type ExecutionTimestamps = {
  startedAt?: Date;
  completedAt?: Date;
  updatedAt?: Date;
};

export type StepExecutionState = ExecutionTimestamps & {
  id: string;
  name?: string;
  status: StepExecutionStatus;
  attempts: number;
  error?: string;
};

export type StageExecutionState = ExecutionTimestamps & {
  id: string;
  name?: string;
  status: StageExecutionStatus;
  steps: Record<string, StepExecutionState>;
  error?: string;
};

export type WorkflowExecutionState = ExecutionTimestamps & {
  name: string;
  status: WorkflowExecutionStatus;
  stages: Record<string, StageExecutionState>;
  error?: string;
};

export type ExecutorOptions = {
  debug?: boolean;
  verbose?: boolean;
  outputDir?: string;
  dryRun?: boolean;
  signal?: AbortSignal;
  concurrency?: number;
  defaultStepTimeoutMs?: number;
};


