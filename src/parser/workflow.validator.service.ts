import { Injectable } from '@nestjs/common';
import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { workflowSchema } from './workflow.schema';
import { CLIValidationError } from '../cli/errors/cli-errors';

@Injectable()
export class WorkflowValidatorService {
  private readonly ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      allowUnionTypes: true,
      coerceTypes: false,
      strict: false,
      messages: true,
    });
    addFormats(this.ajv);

    // Custom keyword: uniqueStepIds
    const uniqueStepIdsValidate = function(schema: boolean, data: any[]): boolean {
      if (!schema) return true;
      const seen = new Set<string>();
      for (const item of data || []) {
        const id = (item as any)?.id;
        if (typeof id !== 'string') continue;
        if (seen.has(id)) {
          (uniqueStepIdsValidate as any).errors = [
            {
              keyword: 'uniqueStepIds',
              instancePath: '/steps',
              schemaPath: '#/properties/steps/uniqueStepIds',
              params: { duplicate: id },
              message: `duplicate step id: ${id}`,
            } as ErrorObject,
          ];
          return false;
        }
        seen.add(id);
      }
      return true;
    } as any;

    this.ajv.addKeyword({
      keyword: 'uniqueStepIds',
      type: 'array',
      errors: true,
      validate: uniqueStepIdsValidate,
    });

    // Attach keyword to schema at runtime
    (workflowSchema as any).properties.steps.uniqueStepIds = true;
  }

  validate(value: unknown, filePath?: string): void {
    const validate = this.ajv.compile(workflowSchema);
    const valid = validate(value);
    if (!valid) {
      const details = (validate.errors || []).map(e => this.formatAjvError(e)).join('\n');
      throw new CLIValidationError('Workflow schema validation failed', {
        file: filePath,
        errors: validate.errors,
        message: details,
      });
    }
  }

  private formatAjvError(error: ErrorObject): string {
    const path = error.instancePath || '(root)';
    const msg = error.message || 'invalid value';
    const params = error.params ? JSON.stringify(error.params) : '';
    return `${path} ${msg} ${params}`.trim();
  }
}


