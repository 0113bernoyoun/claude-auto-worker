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
});


