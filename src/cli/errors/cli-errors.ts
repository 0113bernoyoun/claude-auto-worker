/**
 * CLI 에러들을 위한 기본 에러 클래스들
 */

export abstract class CLIError extends Error {
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.isOperational = isOperational;
    this.context = context;

    // 스택 트레이스 설정
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * CLI 명령어 검증 에러
 */
export class CLIValidationError extends CLIError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CLI_VALIDATION_ERROR', true, context);
  }
}

/**
 * 파일 시스템 에러
 */
export class FileSystemError extends CLIError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'FILE_SYSTEM_ERROR', true, context);
  }
}

/**
 * 워크플로우 실행 에러
 */
export class WorkflowError extends CLIError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'WORKFLOW_ERROR', true, context);
  }
}

/**
 * 설정 파일 에러
 */
export class ConfigurationError extends CLIError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CONFIGURATION_ERROR', true, context);
  }
}

/**
 * 네트워크/API 에러
 */
export class NetworkError extends CLIError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'NETWORK_ERROR', true, context);
  }
}

/**
 * 권한 에러
 */
export class PermissionError extends CLIError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'PERMISSION_ERROR', true, context);
  }
}

/**
 * 알 수 없는 에러
 */
export class UnknownError extends CLIError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'UNKNOWN_ERROR', false, context);
  }
}
