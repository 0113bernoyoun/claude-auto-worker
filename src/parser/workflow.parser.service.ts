import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { extname } from 'path';
import { CLIValidationError, FileSystemError } from '../cli/errors/cli-errors';
import { CommandParserService } from './command.parser.service';
import { GitPolicyService } from './git.policy.service';
import { TemplateEngineService } from './template.engine.service';
import { ParsedWorkflow, WorkflowDefinition, WorkflowStage, WorkflowStep } from './workflow.types';
import { WorkflowValidatorService } from './workflow.validator.service';

@Injectable()
export class WorkflowParserService {
  constructor(
    private readonly validator?: WorkflowValidatorService,
    private readonly templateEngine?: TemplateEngineService,
    private readonly commandParser?: CommandParserService,
    private readonly gitPolicy?: GitPolicyService
  ) {}

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

    // Shape and schema validation
    this.validateShape(parsed, filePath);
    
    // DSL 파싱 및 검증
    const parsedWorkflow = this.parseDSL(parsed, filePath);
    
    if (this.validator) {
      this.validator.validate(parsedWorkflow, filePath);
    }

    const workflow = parsedWorkflow as WorkflowDefinition;
    const format: ParsedWorkflow['format'] = (extension === '.json') ? 'json' : 'yaml';

    return {
      format,
      path: filePath,
      workflow,
    };
  }

  /**
   * DSL을 파싱하고 검증합니다.
   * TASK-016의 핵심 기능: stages, prompt, run, branch, policy 파싱
   */
  private parseDSL(parsed: unknown, filePath: string): WorkflowDefinition {
    const obj = parsed as Record<string, unknown>;
    
    // 기본 워크플로우 정보
    const workflow: WorkflowDefinition = {
      name: obj.name as string,
      description: obj.description as string,
      version: obj.version as string,
      variables: obj.variables as Record<string, unknown>,
      steps: [],
      stages: []
    };

    // Stages 파싱 및 검증
    if (obj.stages && Array.isArray(obj.stages)) {
      workflow.stages = this.parseStages(obj.stages as unknown[], filePath);
    }

    // Steps 파싱 및 검증
    if (obj.steps && Array.isArray(obj.steps)) {
      workflow.steps = this.parseSteps(obj.steps as unknown[], filePath);
    }

    // 의존성 검증
    this.validateDependencies(workflow, filePath);

    return workflow;
  }

  /**
   * Stages를 파싱하고 검증합니다.
   */
  private parseStages(stagesData: unknown[], filePath: string): WorkflowStage[] {
    const stages: WorkflowStage[] = [];

    for (const [index, stageData] of stagesData.entries()) {
      if (!stageData || typeof stageData !== 'object') {
        throw new CLIValidationError('Each stage must be an object', { file: filePath, index });
      }

      const stage = stageData as Record<string, unknown>;
      
      // 필수 필드 검증
      if (typeof stage.id !== 'string' || stage.id.trim().length === 0) {
        throw new CLIValidationError('Each stage requires an "id"', { file: filePath, index });
      }

      if (!Array.isArray(stage.steps)) {
        throw new CLIValidationError('Each stage must have "steps" array', { file: filePath, index, stageId: stage.id });
      }

      // steps 배열의 각 요소가 문자열인지 검증
      for (const [stepIndex, stepRef] of stage.steps.entries()) {
        if (typeof stepRef !== 'string' || stepRef.trim().length === 0) {
          throw new CLIValidationError('Stage step reference must be a string', { 
            file: filePath, 
            index, 
            stageId: stage.id,
            stepIndex 
          });
        }
      }

      stages.push({
        id: stage.id as string,
        name: stage.name as string,
        description: stage.description as string,
        steps: stage.steps as string[],
        depends_on: stage.depends_on as string | string[],
        parallel: stage.parallel as boolean
      });
    }

    return stages;
  }

  /**
   * Steps를 파싱하고 검증합니다.
   */
  private parseSteps(stepsData: unknown[], filePath: string): WorkflowStep[] {
    const steps: WorkflowStep[] = [];

    for (const [index, stepData] of stepsData.entries()) {
      if (!stepData || typeof stepData !== 'object') {
        throw new CLIValidationError('Each step must be an object', { file: filePath, index });
      }

      const step = stepData as Record<string, unknown>;
      
      // 기본 필드 검증
      if (typeof step.id !== 'string' || step.id.trim().length === 0) {
        throw new CLIValidationError('Each step requires an "id"', { file: filePath, index });
      }

      if (typeof step.type !== 'string' || step.type.trim().length === 0) {
        throw new CLIValidationError('Each step requires a "type"', { file: filePath, index, stepId: step.id });
      }

      // Prompt 템플릿 검증
      if (step.prompt && typeof step.prompt === 'string') {
        if (this.templateEngine) {
          const validation = this.templateEngine.validateTemplate(step.prompt);
          if (!validation.isValid) {
            throw new CLIValidationError('Invalid prompt template', { 
              file: filePath, 
              index, 
              stepId: step.id,
              errors: validation.errors 
            });
          }
        }
      }

      // Run 명령어 파싱 및 검증
      let parsedRunCommands: any[] = [];
      if (step.run && this.commandParser) {
        try {
          // step.run이 string | string[] 타입인지 확인
          if (typeof step.run === 'string' || Array.isArray(step.run)) {
            parsedRunCommands = this.commandParser.parseRunCommands(step.run);
            // 각 명령어 검증
            for (const cmd of parsedRunCommands) {
              const validation = this.commandParser.validateCommand(cmd);
              if (!validation.isValid) {
                throw new CLIValidationError('Invalid run command', { 
                  file: filePath, 
                  index, 
                  stepId: step.id,
                  errors: validation.errors 
                });
              }
            }
          }
        } catch (error) {
          throw new CLIValidationError('Failed to parse run command', { 
            file: filePath, 
            index, 
            stepId: step.id,
            cause: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Branch 검증
      if (step.branch && typeof step.branch === 'string') {
        if (this.gitPolicy) {
          const validation = this.gitPolicy.validateBranchName(step.branch);
          if (!validation.isValid) {
            throw new CLIValidationError('Invalid branch name', { 
              file: filePath, 
              index, 
              stepId: step.id,
              errors: validation.errors 
            });
          }
        }
      }

      // Policy 검증
      let parsedPolicy: any = undefined;
      if (step.policy && typeof step.policy === 'object') {
        if (this.gitPolicy) {
          const validation = this.gitPolicy.validatePolicy(step.policy as any);
          if (!validation.isValid) {
            throw new CLIValidationError('Invalid policy configuration', { 
              file: filePath, 
              index, 
              stepId: step.id,
              errors: validation.errors 
            });
          }
          parsedPolicy = this.gitPolicy.initializePolicy(step.policy as any);
        }
      }

      steps.push({
        id: step.id as string,
        name: step.name as string,
        type: step.type as string,
        depends_on: step.depends_on as string | string[],
        prompt: step.prompt as string,
        run: step.run as string | string[],
        branch: step.branch as string,
        policy: parsedPolicy,
        ...step
      });
    }

    return steps;
  }

  /**
   * 의존성 관계를 검증합니다.
   */
  private validateDependencies(workflow: WorkflowDefinition, filePath: string): void {
    const stepIds = new Set(workflow.steps.map(step => step.id));
    const stageIds = new Set(workflow.stages?.map(stage => stage.id) || []);

    // Steps의 의존성 검증
    for (const step of workflow.steps) {
      if (step.depends_on) {
        this.validateDependency(step.depends_on, stepIds, filePath, `step ${step.id}`);
      }
    }

    // Stages의 의존성 검증
    if (workflow.stages) {
      for (const stage of workflow.stages) {
        if (stage.depends_on) {
          this.validateDependency(stage.depends_on, stageIds, filePath, `stage ${stage.id}`);
        }

        // Stage의 steps가 실제로 존재하는지 검증
        for (const stepRef of stage.steps) {
          if (!stepIds.has(stepRef)) {
            throw new CLIValidationError(`Stage references non-existent step: ${stepRef}`, { 
              file: filePath, 
              stageId: stage.id 
            });
          }
        }
      }
    }
  }

  /**
   * 단일 의존성을 검증합니다.
   */
  private validateDependency(
    dependsOn: string | string[], 
    availableIds: Set<string>, 
    filePath: string, 
    context: string
  ): void {
    const dependencies = Array.isArray(dependsOn) ? dependsOn : [dependsOn];
    
    for (const dep of dependencies) {
      if (!availableIds.has(dep)) {
        throw new CLIValidationError(`Dependency not found: ${dep}`, { 
          file: filePath, 
          context 
        });
      }
    }
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



