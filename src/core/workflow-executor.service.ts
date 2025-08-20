import { Injectable, Logger } from '@nestjs/common';
import { ParsedWorkflow, WorkflowDefinition, WorkflowStage, WorkflowStep } from '../parser/workflow.types';
import { ExecutionStateService } from './execution-state.service';
import { LoggerContextService } from './logger-context.service';
import {
    ExecutorOptions,
    StageExecutionStatus,
    StepExecutionStatus,
    WorkflowExecutionStatus
} from './execution.types';
import { FileLoggerService } from './file-logger.service';
import { CommandRunnerService } from './command-runner.service';

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);

  constructor(private readonly state: ExecutionStateService, private readonly ctxLogger: LoggerContextService, private readonly fileLogger: FileLoggerService, private readonly commandRunner: CommandRunnerService) {}

  async execute(parsed: ParsedWorkflow, options?: ExecutorOptions): Promise<void> {
    const workflow = parsed.workflow;
    const stageOrder = this.determineStageOrder(workflow);
    const stepIdsByStage = this.mapStageSteps(workflow);

    this.state.initialize(workflow.name, stageOrder, stepIdsByStage);
    const runId = `${workflow.name}-${Date.now()}`;
    this.fileLogger.setRun(runId);
    this.fileLogger.write('info', 'Workflow started', { workflow: workflow.name, meta: { runId } });
    this.state.setWorkflowStatus(WorkflowExecutionStatus.RUNNING);

    try {
      for (const stageId of stageOrder) {
        await this.executeStage(workflow, stageId, options);
      }
      this.state.setWorkflowStatus(WorkflowExecutionStatus.COMPLETED);
    } catch (error) {
      this.state.setWorkflowStatus(WorkflowExecutionStatus.FAILED);
      this.fileLogger.write('error', 'Workflow failed', { workflow: workflow.name, meta: { error: (error as Error)?.message } });
      throw error;
    }
  }

  private determineStageOrder(workflow: WorkflowDefinition): string[] {
    const stages = workflow.stages || [];
    const inDegree = new Map<string, number>();
    const graph = new Map<string, Set<string>>();

    for (const s of stages) {
      inDegree.set(s.id, 0);
      graph.set(s.id, new Set());
    }

    for (const s of stages) {
      const deps = Array.isArray(s.depends_on) ? s.depends_on : (s.depends_on ? [s.depends_on] : []);
      for (const d of deps) {
        if (!graph.has(d)) {
          // unknown dependency will be caught earlier by parser; ignore here
          continue;
        }
        graph.get(d)!.add(s.id);
        inDegree.set(s.id, (inDegree.get(s.id) || 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    const ordered: string[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      ordered.push(id);
      for (const nxt of graph.get(id) || []) {
        inDegree.set(nxt, (inDegree.get(nxt) || 0) - 1);
        if ((inDegree.get(nxt) || 0) === 0) queue.push(nxt);
      }
    }

    if (ordered.length !== stages.length) {
      throw new Error('Cycle detected in stage dependencies');
    }
    return ordered;
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
    this.ctxLogger.log('Stage started', { workflow: workflow.name, stage: stageId });
    this.fileLogger.write('info', 'Stage started', { workflow: workflow.name, stage: stageId });
    const stepRefs = stage.steps || [];

    // If stage.parallel is true, run steps with a simple worker-pool, else sequential
    if (stage.parallel) {
      const concurrency = Math.max(1, options?.concurrency ?? 2);
      await this.runInPool(stepRefs, concurrency, async (stepRef) => {
        const step = workflow.steps.find(s => s.id === stepRef);
        if (!step) return;
        await this.executeStep(stage, step, options);
      });
    } else {
      for (const stepRef of stepRefs) {
        const step = workflow.steps.find(s => s.id === stepRef);
        if (!step) continue;
        await this.executeStep(stage, step, options);
      }
    }

    this.state.setStageStatus(stageId, StageExecutionStatus.COMPLETED);
    this.ctxLogger.log('Stage completed', { workflow: workflow.name, stage: stageId });
    this.fileLogger.write('info', 'Stage completed', { workflow: workflow.name, stage: stageId });
  }

  private async executeStep(stage: WorkflowStage, step: WorkflowStep, options?: ExecutorOptions): Promise<void> {
    const stageId = stage.id;
    const stepId = step.id;
    this.state.setStepStatus(stageId, stepId, StepExecutionStatus.RUNNING);
    this.ctxLogger.log('Step started', { workflow: undefined, stage: stageId, step: stepId });
    this.fileLogger.write('info', 'Step started', { stage: stageId, step: stepId });

    const maxAttempts = step.policy?.retry?.max_attempts ?? 1;
    const baseDelay = step.policy?.retry?.delay_ms ?? 0;
    const backoff = step.policy?.retry?.backoff_multiplier ?? 1;
    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxAttempts) {
      try {
        if (options?.dryRun) {
          await this.delay(50, options?.signal);
        } else {
          await this.runStep(step, options);
        }
        this.state.setStepStatus(stageId, stepId, StepExecutionStatus.COMPLETED);
        this.ctxLogger.log('Step completed', { workflow: undefined, stage: stageId, step: stepId });
        this.fileLogger.write('info', 'Step completed', { stage: stageId, step: stepId });
        return;
      } catch (error) {
        lastError = error;
        attempt += 1;
        if (attempt >= maxAttempts) break;
        const delayMs = baseDelay * Math.pow(backoff, attempt - 1);
        this.ctxLogger.warn(`Step failed (attempt ${attempt}): ${(error as Error)?.message || error}`, { stage: stageId, step: stepId });
        this.fileLogger.write('warn', `Step failed (attempt ${attempt})`, { stage: stageId, step: stepId, meta: { error: (error as Error)?.message } });
        await this.delay(delayMs, options?.signal);
      }
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError);
    this.state.setStepStatus(stageId, stepId, StepExecutionStatus.FAILED, message);
    this.ctxLogger.error(`Step failed: ${message}`, { stage: stageId, step: stepId });
    this.fileLogger.write('error', `Step failed: ${message}`, { stage: stageId, step: stepId });
    throw lastError instanceof Error ? lastError : new Error(message);
  }

  private async runStep(step: WorkflowStep, options?: ExecutorOptions): Promise<void> {
    // Claude action mapping
    if (step.type === 'claude' && step.action) {
      const timeoutSec = step.policy?.timeout?.seconds ?? 0;
      const timeoutMs = timeoutSec > 0 ? timeoutSec * 1000 : options?.defaultStepTimeoutMs;
      const result = await this.commandRunner.runClaudeWithInput({
        action: step.action as any,
        prompt: step.prompt,
        cwd: step.cwd,
        env: step.env,
        timeoutMs,
        signal: options?.signal,
        onStdoutLine: (line) => this.fileLogger.write('info', line, { meta: { stream: 'stdout' } }),
        onStderrLine: (line) => this.fileLogger.write('warn', line, { meta: { stream: 'stderr' } }),
      });
      if (result.code !== 0) {
        throw new Error(`Claude CLI exited with code ${result.code}`);
      }
      return;
    }

    // Generic run commands
    if (step.run) {
      const commands = Array.isArray(step.run) ? step.run : [step.run];
      for (const cmd of commands) {
        const parts = cmd.trim().split(/\s+/).filter(Boolean);
        const bin = parts[0];
        const args = parts.slice(1);
        if (!bin) {
          throw new Error('Invalid run command: empty binary');
        }
        const result = await this.commandRunner.runShell(bin, args, {
          cwd: step.cwd,
          env: step.env,
          timeoutMs: step.policy?.timeout?.seconds ? step.policy.timeout.seconds * 1000 : options?.defaultStepTimeoutMs,
          signal: options?.signal,
          onStdoutLine: (line) => this.fileLogger.write('info', line, { meta: { stream: 'stdout' } }),
          onStderrLine: (line) => this.fileLogger.write('warn', line, { meta: { stream: 'stderr' } }),
        });
        if (result.code !== 0) {
          throw new Error(`Command failed (${bin}): exit code ${result.code}`);
        }
      }
      return;
    }

    // Fallback: small delay
    await this.delay(Math.min(options?.defaultStepTimeoutMs ?? 200, 200), options?.signal);
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

  private async runInPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
    const queue = items.slice();
    const workers: Promise<void>[] = [];
    for (let i = 0; i < concurrency; i++) {
      workers.push((async () => {
        while (queue.length > 0) {
          const item = queue.shift();
          if (item === undefined) break;
          await worker(item);
        }
      })());
    }
    await Promise.all(workers);
  }
}


