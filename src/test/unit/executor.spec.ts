import { Test } from '@nestjs/testing';
import { WorkflowExecutorService } from '../../core/workflow-executor.service';
import { ExecutionStateService } from '../../core/execution-state.service';
import { LoggerContextService } from '../../core/logger-context.service';
import { ParsedWorkflow, WorkflowDefinition } from '../../parser/workflow.types';

describe('WorkflowExecutorService (unit)', () => {
  let executor: WorkflowExecutorService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [ExecutionStateService, LoggerContextService, WorkflowExecutorService],
    }).compile();
    executor = moduleRef.get(WorkflowExecutorService);
  });

  function buildParsed(def: WorkflowDefinition): ParsedWorkflow {
    return { format: 'yaml', path: '<memory>', workflow: def };
  }

  it('should handle retry/backoff policy and eventually succeed', async () => {
    const def: WorkflowDefinition = {
      name: 'wf',
      steps: [
        { id: 's1', type: 'noop', policy: { retry: { max_attempts: 2, delay_ms: 1 } } },
      ],
      stages: [ { id: 'st1', steps: ['s1'] } ],
    };
    await executor.execute(buildParsed(def), { dryRun: true });
  });
});


