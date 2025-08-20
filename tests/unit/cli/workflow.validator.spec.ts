import { WorkflowValidatorService } from '../../../src/parser/workflow.validator.service';
import { CLIValidationError } from '../../../src/cli/errors/cli-errors';

describe('WorkflowValidatorService', () => {
  let validator: WorkflowValidatorService;

  beforeEach(() => {
    validator = new WorkflowValidatorService();
  });

  it('유효한 최소 워크플로우는 통과해야 함', () => {
    const valid = {
      name: 'sample',
      steps: [{ id: 's1', type: 'prompt' }],
    };
    expect(() => validator.validate(valid)).not.toThrow();
  });

  it('name 필드가 없으면 에러가 발생해야 함', () => {
    const invalid = {
      steps: [{ id: 's1', type: 'prompt' }],
    } as any;
    expect(() => validator.validate(invalid)).toThrow(CLIValidationError);
  });

  it('중복 step id가 있으면 에러가 발생해야 함', () => {
    const invalid = {
      name: 'dup',
      steps: [
        { id: 's1', type: 'prompt' },
        { id: 's1', type: 'run' },
      ],
    };
    expect(() => validator.validate(invalid)).toThrow(CLIValidationError);
  });

  describe('CLAUDE DSL 확장 검증 (TASK-080)', () => {
    it('type이 claude일 때 action이 없으면 에러', () => {
      const invalid = {
        name: 'wf',
        steps: [
          { id: 's1', type: 'claude', prompt: 'hello' }
        ],
      } as any;
      expect(() => validator.validate(invalid)).toThrow(CLIValidationError);
    });

    it('type이 claude가 아닌데 action이 있으면 에러', () => {
      const invalid = {
        name: 'wf',
        steps: [
          { id: 's1', type: 'run', action: 'task', run: 'echo ok' }
        ],
      } as any;
      expect(() => validator.validate(invalid)).toThrow(CLIValidationError);
    });

    it('action과 run을 동시에 지정하면 에러', () => {
      const invalid = {
        name: 'wf',
        steps: [
          { id: 's1', type: 'claude', action: 'task', prompt: 'hi', run: 'echo bad' }
        ],
      } as any;
      expect(() => validator.validate(invalid)).toThrow(CLIValidationError);
    });

    it('action이 commit이면 prompt가 있으면 에러', () => {
      const invalid = {
        name: 'wf',
        steps: [
          { id: 's1', type: 'claude', action: 'commit', prompt: 'should not exist' }
        ],
      } as any;
      expect(() => validator.validate(invalid)).toThrow(CLIValidationError);
    });

    it('claude task + prompt + env/cwd는 유효', () => {
      const valid = {
        name: 'wf',
        steps: [
          {
            id: 's1', type: 'claude', action: 'task', prompt: 'do something',
            cwd: './', env: { NODE_ENV: 'test' }
          }
        ],
      } as any;
      expect(() => validator.validate(valid)).not.toThrow();
    });

    it('action 값이 허용 enum 이외이면 에러', () => {
      const invalid = {
        name: 'wf',
        steps: [
          { id: 's1', type: 'claude', action: 'launch' }
        ],
      } as any;
      expect(() => validator.validate(invalid)).toThrow(CLIValidationError);
    });
  });
});


