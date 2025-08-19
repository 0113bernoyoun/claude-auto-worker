/**
 * CLI 에러들을 위한 기본 에러 클래스들
 */

// 에러 코드 상수 정의
export const ERROR_CODES = {
  CLI_VALIDATION: 'CLI_VALIDATION_ERROR',
  FILE_SYSTEM: 'FILE_SYSTEM_ERROR',
  WORKFLOW: 'WORKFLOW_ERROR',
  CONFIGURATION: 'CONFIGURATION_ERROR',
  NETWORK: 'NETWORK_ERROR',
  PERMISSION: 'PERMISSION_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

export abstract class CLIError extends Error {
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    isOperational: boolean = true,
    context?: Record<string, unknown>
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
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ERROR_CODES.CLI_VALIDATION, true, context);
  }
}

/**
 * 파일 시스템 에러
 */
export class FileSystemError extends CLIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ERROR_CODES.FILE_SYSTEM, true, context);
  }
}

/**
 * 워크플로우 실행 에러
 */
export class WorkflowError extends CLIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ERROR_CODES.WORKFLOW, true, context);
  }
}

/**
 * 설정 파일 에러
 */
export class ConfigurationError extends CLIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ERROR_CODES.CONFIGURATION, true, context);
  }
}

/**
 * 네트워크/API 에러
 */
export class NetworkError extends CLIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ERROR_CODES.NETWORK, true, context);
  }
}

/**
 * 권한 에러
 */
export class PermissionError extends CLIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ERROR_CODES.PERMISSION, true, context);
  }
}

/**
 * 알 수 없는 에러
 */
export class UnknownError extends CLIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ERROR_CODES.UNKNOWN, false, context);
  }
}
