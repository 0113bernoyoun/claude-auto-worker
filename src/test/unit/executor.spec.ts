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

  it('should execute rollback steps when a step ultimately fails', async () => {
    const def: WorkflowDefinition = {
      name: 'wf-fail',
      steps: [
        { id: 'f1', type: 'run', run: ['false'], policy: { retry: { max_attempts: 1, delay_ms: 0 }, rollback: { enabled: true, steps: ['rb1'] } } },
        { id: 'rb1', type: 'run', run: ['echo', 'rollback'], policy: { retry: { max_attempts: 1, delay_ms: 0 } } },
      ],
      stages: [ { id: 'st1', steps: ['f1'] } ],
    };

    const writeMock = jest.fn();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ExecutionStateService,
        LoggerContextService,
        WorkflowExecutorService,
        { provide: (await import('../../parser/command.parser.service')).CommandParserService, useValue: { parseRunCommands: jest.fn().mockImplementation((run) => (Array.isArray(run) ? run.map((c) => ({ command: c, args: [] })) : [{ command: run, args: [] }])) } },
        { provide: (await import('../../core/file-logger.service')).FileLoggerService, useValue: { write: writeMock, setRun: jest.fn(), getLogFilePath: jest.fn() } },
        { provide: (await import('../../core/command-runner.service')).CommandRunnerService, useValue: { runShell: jest.fn().mockImplementation(async (bin: string) => ({ code: bin === 'false' ? 1 : 0 })), runClaudeWithInput: jest.fn().mockResolvedValue({ code: 0 }) } },
        { provide: (await import('../../git/git.service')).GitService, useValue: { ensureAndCheckoutBranch: jest.fn().mockResolvedValue(false), commitAll: jest.fn().mockResolvedValue(undefined), pushCurrentBranch: jest.fn().mockResolvedValue(false) } },
      ],
    }).compile();

    const ex = moduleRef.get(WorkflowExecutorService);
    await expect(executeWith(ex, def)).rejects.toBeTruthy();

    // 롤백 시퀀스 로그가 기록되었는지 확인
    expect(writeMock).toHaveBeenCalledWith(
      'warn',
      'Starting rollback sequence',
      expect.objectContaining({ workflow: 'wf-fail', stage: 'st1', step: 'f1' })
    );
    expect(writeMock).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('Rollback step succeeded: rb1'),
      expect.any(Object)
    );
  });

  it('should capture test outputs (PASS/Tests:) to logs for test-type steps', async () => {
    const def: WorkflowDefinition = {
      name: 'wf-test',
      steps: [
        { id: 't1', type: 'test', run: ['jest'] },
      ],
      stages: [ { id: 'st1', steps: ['t1'] } ],
    };

    const writeMock = jest.fn();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ExecutionStateService,
        LoggerContextService,
        WorkflowExecutorService,
        { provide: (await import('../../parser/command.parser.service')).CommandParserService, useValue: { parseRunCommands: jest.fn().mockReturnValue([{ command: 'jest', args: [] }]) } },
        { provide: (await import('../../core/file-logger.service')).FileLoggerService, useValue: { write: writeMock, setRun: jest.fn(), getLogFilePath: jest.fn() } },
        { provide: (await import('../../core/command-runner.service')).CommandRunnerService, useValue: {
          runShell: jest.fn().mockImplementation(async (_bin: string, _args: string[], opts?: any) => {
            // Simulate typical Jest output lines
            opts?.onStdoutLine?.('PASS src/foo.spec.ts');
            opts?.onStdoutLine?.('Tests:       0 failed, 1 passed, 1 total');
            return { code: 0 };
          }),
          runClaudeWithInput: jest.fn().mockResolvedValue({ code: 0 })
        } },
        { provide: (await import('../../git/git.service')).GitService, useValue: { ensureAndCheckoutBranch: jest.fn().mockResolvedValue(false), commitAll: jest.fn().mockResolvedValue(undefined), pushCurrentBranch: jest.fn().mockResolvedValue(false) } },
      ],
    }).compile();

    const ex = moduleRef.get(WorkflowExecutorService);
    await executeWith(ex, def);

    const calls = writeMock.mock.calls as Array<any[]>;
    const hasPASS = calls.some(([level, message]) => level === 'info' && typeof message === 'string' && message.includes('PASS'));
    const hasTestsLine = calls.some(([level, message]) => level === 'info' && typeof message === 'string' && /Tests:\s+\d+\s+failed,\s+\d+\s+passed,\s+\d+\s+total/i.test(message));
    expect(hasPASS && hasTestsLine).toBe(true);
  });
});

async function executeWith(executor: WorkflowExecutorService, def: WorkflowDefinition) {
  const parsed: ParsedWorkflow = { format: 'yaml', path: '<mem>', workflow: def };
  return executor.execute(parsed, { dryRun: false });
}


