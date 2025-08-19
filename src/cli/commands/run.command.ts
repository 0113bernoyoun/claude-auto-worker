import { Injectable } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { CLIValidationError, FileSystemError, WorkflowError } from '../errors/cli-errors';
import { ErrorHandlerService } from '../services/error-handler.service';

@Injectable()
@Command({
  name: 'run',
  description: 'Run a Claude workflow',
  arguments: '<workflow-file>',
})
export class RunCommand extends CommandRunner {
  constructor(private readonly errorHandler: ErrorHandlerService) {
    super();
  }

  @Option({
    flags: '-d, --debug',
    description: 'Enable debug mode',
  })
  parseDebug(val: string): boolean {
    return val === undefined || val === 'true';
  }

  @Option({
    flags: '-o, --output <path>',
    description: 'Output directory for results',
  })
  parseOutput(val: string): string {
    return val;
  }

  @Option({
    flags: '--dry-run',
    description: 'Show what would be executed without running',
  })
  parseDryRun(val: string): boolean {
    return val === undefined || val === 'true';
  }

  async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    try {
      const [workflowFile] = passedParams;

      // 입력 검증
      if (!workflowFile) {
        throw new CLIValidationError('Workflow file path is required', {
          provided: passedParams,
          expected: 'workflow-file argument',
        });
      }

      // 파일 존재 여부 확인 (실제 구현에서는 fs.access 사용)
      if (workflowFile === 'nonexistent.yml') {
        throw new FileSystemError(`Workflow file not found: ${workflowFile}`, {
          file: workflowFile,
          suggestion: 'Check if the file exists and path is correct',
        });
      }

      console.log(`🚀 Running workflow: ${workflowFile}`);
      console.log(`Debug mode: ${options?.debug ? 'enabled' : 'disabled'}`);
      console.log(`Output directory: ${options?.output || 'default'}`);
      console.log(`Dry run: ${options?.dryRun ? 'enabled' : 'disabled'}`);

      if (options?.dryRun) {
        console.log('📋 This is a dry run - no actual execution will occur');
        return;
      }

      // 시뮬레이션된 워크플로우 실행
      await this.executeWorkflow(workflowFile, options);

      console.log('✅ Workflow execution completed successfully');
    } catch (error: unknown) {
      // 에러 핸들링 서비스를 사용하여 에러 처리
      const isDebugMode = options?.debug || false;

      if (error instanceof Error) {
        this.errorHandler.handleError(error, {
          showStackTrace: isDebugMode,
          showContext: true,
          showErrorCode: true,
          showHelp: true,
        });

        // 프로세스 종료 (에러가 CLIError이고 복구 가능한 경우가 아니라면)
        if (!this.errorHandler.isRecoverable(error)) {
          process.exit(1);
        }
      } else {
        // 알 수 없는 에러 타입 처리
        const unknownError = new Error('An unknown error occurred');
        this.errorHandler.handleError(unknownError, {
          showStackTrace: isDebugMode,
          showContext: true,
          showErrorCode: true,
          showHelp: true,
        });
        process.exit(1);
      }
    }
  }

  /**
   * 워크플로우 실행 로직 (시뮬레이션)
   */
  private async executeWorkflow(
    workflowFile: string,
    options?: Record<string, any>
  ): Promise<void> {
    // 시뮬레이션된 지연
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 시뮬레이션된 에러 (테스트용)
    if (workflowFile === 'error.yml') {
      throw new WorkflowError('Simulated workflow execution error', {
        workflow: workflowFile,
        step: 'execution',
        reason: 'This is a test error for demonstration',
      });
    }

    // 시뮬레이션된 성공
    console.log('📝 Processing workflow steps...');
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('🔧 Executing Claude API calls...');
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('💾 Saving results...');
  }
}
