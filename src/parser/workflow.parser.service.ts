import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { extname } from 'path';
import { CLIValidationError, FileSystemError } from '../cli/errors/cli-errors';
import { ParsedWorkflow, WorkflowDefinition } from './workflow.types';

@Injectable()
export class WorkflowParserService {
  parseFromFile(filePath: string): ParsedWorkflow {
    const extension = (extname(filePath) || '').toLowerCase();

    let rawContent: string;
    try {
      rawContent = readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new FileSystemError(`Workflow file not found: ${filePath}`, {
        file: filePath,
        cause: error instanceof Error ? error.message : String(error),
      });
    }

    if (!rawContent || rawContent.trim().length === 0) {
      throw new CLIValidationError('Workflow file is empty', { file: filePath });
    }

    let parsed: unknown;
    try {
      if (extension === '.yaml' || extension === '.yml') {
        parsed = yaml.load(rawContent);
      } else if (extension === '.json') {
        parsed = JSON.parse(rawContent);
      } else {
        // Try YAML first, then JSON as fallback when no/unknown extension
        try {
          parsed = yaml.load(rawContent);
        } catch {
          parsed = JSON.parse(rawContent);
        }
      }
    } catch (parseError) {
      throw new CLIValidationError('Failed to parse workflow file', {
        file: filePath,
        extension,
        cause: parseError instanceof Error ? parseError.message : String(parseError),
      });
    }

    this.validateShape(parsed, filePath);

    const workflow = parsed as WorkflowDefinition;
    const format: ParsedWorkflow['format'] = (extension === '.json') ? 'json' : 'yaml';

    return {
      format,
      path: filePath,
      workflow,
    };
  }

  private validateShape(value: unknown, filePath: string): void {
    if (!value || typeof value !== 'object') {
      throw new CLIValidationError('Workflow must be an object', { file: filePath });
    }

    const obj = value as Record<string, unknown>;
    if (typeof obj.name !== 'string' || obj.name.trim().length === 0) {
      throw new CLIValidationError('Workflow "name" is required', { file: filePath });
    }

    if (!Array.isArray(obj.steps)) {
      throw new CLIValidationError('Workflow "steps" must be an array', { file: filePath });
    }

    for (const [index, step] of (obj.steps as unknown[]).entries()) {
      if (!step || typeof step !== 'object') {
        throw new CLIValidationError('Each step must be an object', { file: filePath, index });
      }
      const s = step as Record<string, unknown>;
      if (typeof s.id !== 'string' || s.id.trim().length === 0) {
        throw new CLIValidationError('Each step requires an "id"', { file: filePath, index });
      }
      if (typeof s.type !== 'string' || s.type.trim().length === 0) {
        throw new CLIValidationError('Each step requires a "type"', { file: filePath, index, stepId: s.id });
      }
    }
  }
}



