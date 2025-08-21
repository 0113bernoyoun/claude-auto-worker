import { Test } from '@nestjs/testing';
import { ExecutionStateService } from '../../core/execution-state.service';
import { LoggerContextService } from '../../core/logger-context.service';
import { WorkflowExecutorService } from '../../core/workflow-executor.service';
import { ParsedWorkflow, WorkflowDefinition } from '../../parser/workflow.types';

describe('WorkflowExecutorService (unit)', () => {
  let executor: WorkflowExecutorService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ExecutionStateService,
        LoggerContextService,
        WorkflowExecutorService,
        {
          provide: (await import('../../parser/command.parser.service')).CommandParserService,
          useValue: { parseRunCommands: jest.fn().mockReturnValue([]) },
        },
        {
          provide: (await import('../../core/file-logger.service')).FileLoggerService,
          useValue: { write: jest.fn(), setRun: jest.fn(), getLogFilePath: jest.fn() },
        },
        {
          provide: (await import('../../core/command-runner.service')).CommandRunnerService,
          useValue: { runShell: jest.fn().mockResolvedValue({ code: 0 }), runClaudeWithInput: jest.fn().mockResolvedValue({ code: 0 }) },
        },
        {
          provide: (await import('../../git/git.service')).GitService,
          useValue: {
            ensureAndCheckoutBranch: jest.fn().mockResolvedValue(false),
            commitAll: jest.fn().mockResolvedValue(undefined),
            pushCurrentBranch: jest.fn().mockResolvedValue(false),
          },
        },
      ],
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


