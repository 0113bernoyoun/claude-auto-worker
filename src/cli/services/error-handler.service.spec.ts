import { Test, TestingModule } from '@nestjs/testing';
import {
    CLIValidationError,
    ConfigurationError,
    FileSystemError,
    NetworkError,
    PermissionError,
    UnknownError,
    WorkflowError,
} from '../errors/cli-errors';
import { ErrorHandlerService } from './error-handler.service';

// chalk 모듈 모킹
jest.mock('chalk', () => ({
  red: (text: string) => `RED:${text}`,
  white: (text: string) => `WHITE:${text}`,
  gray: (text: string) => `GRAY:${text}`,
  yellow: (text: string) => `YELLOW:${text}`,
  blue: (text: string) => `BLUE:${text}`,
  cyan: (text: string) => `CYAN:${text}`,
}));

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ErrorHandlerService],
    }).compile();

    service = module.get<ErrorHandlerService>(ErrorHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCLIError', () => {
    it('should create CLIValidationError', () => {
      const originalError = new Error('Validation failed');
      const cliError = service.createCLIError(originalError, 'validation', {
        field: 'workflow-file',
        value: undefined,
      });

      expect(cliError).toBeInstanceOf(CLIValidationError);
      expect(cliError.code).toBe('CLI_VALIDATION_ERROR');
      expect(cliError.message).toBe('Validation failed');
      expect(cliError.context).toEqual({
        field: 'workflow-file',
        value: undefined,
      });
    });

    it('should create FileSystemError', () => {
      const originalError = new Error('File not found');
      const cliError = service.createCLIError(originalError, 'file', {
        file: 'test.yml',
        path: '/path/to/file',
      });

      expect(cliError).toBeInstanceOf(FileSystemError);
      expect(cliError.code).toBe('FILE_SYSTEM_ERROR');
    });

    it('should create WorkflowError', () => {
      const originalError = new Error('Workflow execution failed');
      const cliError = service.createCLIError(originalError, 'workflow', {
        workflow: 'test.yml',
        step: 'execution',
      });

      expect(cliError).toBeInstanceOf(WorkflowError);
      expect(cliError.code).toBe('WORKFLOW_ERROR');
    });

    it('should create ConfigurationError', () => {
      const originalError = new Error('Invalid configuration');
      const cliError = service.createCLIError(originalError, 'config', {
        configFile: 'config.yml',
        line: 10,
      });

      expect(cliError).toBeInstanceOf(ConfigurationError);
      expect(cliError.code).toBe('CONFIGURATION_ERROR');
    });

    it('should create NetworkError', () => {
      const originalError = new Error('API call failed');
      const cliError = service.createCLIError(originalError, 'network', {
        endpoint: 'https://api.anthropic.com',
        statusCode: 500,
      });

      expect(cliError).toBeInstanceOf(NetworkError);
      expect(cliError.code).toBe('NETWORK_ERROR');
    });

    it('should create PermissionError', () => {
      const originalError = new Error('Access denied');
      const cliError = service.createCLIError(originalError, 'permission', {
        file: 'output.txt',
        permission: 'write',
      });

      expect(cliError).toBeInstanceOf(PermissionError);
      expect(cliError.code).toBe('PERMISSION_ERROR');
    });

    it('should create UnknownError by default', () => {
      const originalError = new Error('Unknown error');
      const cliError = service.createCLIError(originalError);

      expect(cliError).toBeInstanceOf(UnknownError);
      expect(cliError.code).toBe('UNKNOWN_ERROR');
      expect(cliError.isOperational).toBe(false);
    });
  });

  describe('isRecoverable', () => {
    it('should return true for operational CLI errors', () => {
      const cliError = new CLIValidationError('Test error');
      expect(service.isRecoverable(cliError)).toBe(true);
    });

    it('should return false for non-operational CLI errors', () => {
      const cliError = new UnknownError('Test error');
      expect(service.isRecoverable(cliError)).toBe(false);
    });

    it('should return false for generic errors', () => {
      const genericError = new Error('Test error');
      expect(service.isRecoverable(genericError)).toBe(false);
    });
  });

  describe('getErrorDetails', () => {
    it('should return error details for CLI errors', () => {
      const cliError = new CLIValidationError('Test error', { field: 'test' });
      const details = service.getErrorDetails(cliError);

      expect(details).toMatchObject({
        name: 'CLIValidationError',
        message: 'Test error',
        code: 'CLI_VALIDATION_ERROR',
        isOperational: true,
        context: { field: 'test' },
      });
      expect(details.timestamp).toBeDefined();
    });

    it('should return error details for generic errors', () => {
      const genericError = new Error('Test error');
      const details = service.getErrorDetails(genericError);

      expect(details).toMatchObject({
        name: 'Error',
        message: 'Test error',
      });
      expect(details.code).toBeUndefined();
      expect(details.isOperational).toBeUndefined();
      expect(details.context).toBeUndefined();
    });
  });

  describe('handleError', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should handle CLI errors with default options', () => {
      const cliError = new CLIValidationError('Test error', { field: 'test' });
      service.handleError(cliError);

      expect(consoleSpy).toHaveBeenCalled();
      // 에러 메시지, 코드, 컨텍스트, 도움말이 출력되었는지 확인
      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('RED:❌ Error occurred:');
      expect(calls).toContain('WHITE:   Test error');
      expect(calls).toContain('GRAY:   Code: CLI_VALIDATION_ERROR');
      expect(calls).toContain('💡 Suggestions:');
      expect(calls).toContain('Check command syntax and options');
    });

    it('should handle CLI errors with custom options', () => {
      const cliError = new CLIValidationError('Test error');
      service.handleError(cliError, {
        showStackTrace: true,
        showContext: false,
        showErrorCode: false,
        showHelp: false,
      });

      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('RED:❌ Error occurred:');
      expect(calls).toContain('WHITE:   Test error');
      expect(calls).not.toContain('Code:');
      expect(calls).not.toContain('Context:');
      expect(calls).not.toContain('💡 Suggestions:');
    });

    it('should handle generic errors', () => {
      const genericError = new Error('Test error');
      service.handleError(genericError);

      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('RED:❌ Unexpected error occurred:');
      expect(calls).toContain('WHITE:   Test error');
    });
  });
});
