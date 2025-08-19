import { Injectable, Logger } from '@nestjs/common';
import chalk from 'chalk';
import {
    CLIError,
    CLIValidationError,
    ConfigurationError,
    ERROR_CODES,
    FileSystemError,
    NetworkError,
    PermissionError,
    UnknownError,
    WorkflowError,
} from '../errors/cli-errors';

export interface ErrorDisplayOptions {
  showStackTrace?: boolean;
  showContext?: boolean;
  showErrorCode?: boolean;
  showHelp?: boolean;
}

@Injectable()
export class ErrorHandlerService {
  constructor(private readonly logger: Logger) {}

  /**
   * 에러를 처리하고 사용자 친화적인 메시지를 출력
   */
  handleError(error: Error | CLIError, options: ErrorDisplayOptions = {}): void {
    const defaultOptions: Required<ErrorDisplayOptions> = {
      showStackTrace: false,
      showContext: true,
      showErrorCode: true,
      showHelp: true,
    };

    const finalOptions = { ...defaultOptions, ...options };

    // 에러 로깅
    this.logError(error);

    // 에러 타입별 처리
    if (this.isCLIError(error)) {
      this.displayCLIError(error, finalOptions);
    } else {
      this.displayGenericError(error, finalOptions);
    }

    // 에러 복구 제안
    if (finalOptions.showHelp) {
      this.suggestRecovery(error);
    }
  }

  /**
   * 에러를 로깅
   */
  private logError(error: Error | CLIError): void {
    if (this.isCLIError(error)) {
      this.logger.error(`CLI Error [${error.code}]: ${error.message}`, error.stack, 'CLI');
    } else {
      this.logger.error(`Generic Error: ${error.message}`, error.stack, 'CLI');
    }
  }

  /**
   * CLI 에러를 사용자 친화적으로 출력
   */
  private displayCLIError(error: CLIError, options: Required<ErrorDisplayOptions>): void {
    console.error('\n' + chalk.red('❌ Error occurred:'));

    // 에러 메시지
    console.error(chalk.white(`   ${error.message}`));

    // 에러 코드
    if (options.showErrorCode) {
      console.error(chalk.gray(`   Code: ${error.code}`));
    }

    // 컨텍스트 정보
    if (options.showContext && error.context) {
      console.error(chalk.yellow('   Context:'));
      Object.entries(error.context).forEach(([key, value]) => {
        console.error(chalk.gray(`     ${key}: ${value}`));
      });
    }

    // 스택 트레이스
    if (options.showStackTrace && error.stack) {
      console.error(chalk.gray('   Stack trace:'));
      console.error(chalk.gray(error.stack));
    }
  }

  /**
   * 일반 에러를 사용자 친화적으로 출력
   */
  private displayGenericError(error: Error, options: Required<ErrorDisplayOptions>): void {
    console.error('\n' + chalk.red('❌ Unexpected error occurred:'));
    console.error(chalk.white(`   ${error.message}`));

    if (options.showStackTrace && error.stack) {
      console.error(chalk.gray('   Stack trace:'));
      console.error(chalk.gray(error.stack));
    }
  }

  /**
   * 에러 복구 방법 제안
   */
  private suggestRecovery(error: Error | CLIError): void {
    console.error(chalk.blue('\n💡 Suggestions:'));

    if (this.isCLIError(error)) {
      switch (error.code) {
        case ERROR_CODES.CLI_VALIDATION:
          console.error(chalk.cyan('   • Check command syntax and options'));
          console.error(chalk.cyan('   • Use --help for command usage'));
          break;
        case ERROR_CODES.FILE_SYSTEM:
          console.error(chalk.cyan('   • Verify file paths and permissions'));
          console.error(chalk.cyan('   • Check disk space and file existence'));
          break;
        case ERROR_CODES.WORKFLOW:
          console.error(chalk.cyan('   • Validate workflow configuration'));
          console.error(chalk.cyan('   • Check required dependencies'));
          break;
        case ERROR_CODES.CONFIGURATION:
          console.error(chalk.cyan('   • Verify configuration file format'));
          console.error(chalk.cyan('   • Check environment variables'));
          break;
        case ERROR_CODES.NETWORK:
          console.error(chalk.cyan('   • Check internet connection'));
          console.error(chalk.cyan('   • Verify API endpoints and keys'));
          break;
        case ERROR_CODES.PERMISSION:
          console.error(chalk.cyan('   • Check file/directory permissions'));
          console.error(chalk.cyan('   • Run with appropriate privileges'));
          break;
        default:
          console.error(chalk.cyan('   • Review error details above'));
          console.error(chalk.cyan('   • Check logs for more information'));
      }
    } else {
      console.error(chalk.cyan('   • Review error details above'));
      console.error(chalk.cyan('   • Check logs for more information'));
      console.error(chalk.cyan('   • Try running with --debug flag'));
    }
  }

  /**
   * 에러가 CLIError 인스턴스인지 확인
   */
  private isCLIError(error: Error | CLIError): error is CLIError {
    return 'code' in error && 'isOperational' in error;
  }

  /**
   * 에러 타입별로 적절한 CLIError 생성
   */
  createCLIError(
    error: Error,
    type:
      | 'validation'
      | 'file'
      | 'workflow'
      | 'config'
      | 'network'
      | 'permission'
      | 'unknown' = 'unknown',
    context?: Record<string, unknown>
  ): CLIError {
    const message = error.message || 'An error occurred';

    switch (type) {
      case 'validation':
        return new CLIValidationError(message, context);
      case 'file':
        return new FileSystemError(message, context);
      case 'workflow':
        return new WorkflowError(message, context);
      case 'config':
        return new ConfigurationError(message, context);
      case 'network':
        return new NetworkError(message, context);
      case 'permission':
        return new PermissionError(message, context);
      case 'unknown':
      default:
        return new UnknownError(message, context);
    }
  }

  /**
   * 에러가 복구 가능한지 확인
   */
  isRecoverable(error: Error | CLIError): boolean {
    if (this.isCLIError(error)) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * 에러에 대한 상세 정보 반환
   */
  getErrorDetails(error: Error | CLIError): Record<string, unknown> {
    const base = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    if (this.isCLIError(error)) {
      return {
        ...base,
        code: error.code,
        isOperational: error.isOperational,
        context: error.context,
      };
    }

    return base;
  }
}
