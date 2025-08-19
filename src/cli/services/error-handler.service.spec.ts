import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
    CLIValidationError,
    ConfigurationError,
    ERROR_CODES,
    FileSystemError,
    NetworkError,
    PermissionError,
    UnknownError,
    WorkflowError
} from '../errors/cli-errors';
import { ErrorHandlerService } from './error-handler.service';

// Mock Logger to prevent error output during tests
const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErrorHandlerService,
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ErrorHandlerService>(ErrorHandlerService);
    
    // Clear mock calls before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
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
      expect(calls).toContain('❌ Error occurred:');
      expect(calls).toContain('Test error');
      expect(calls).toContain(`Code: ${ERROR_CODES.CLI_VALIDATION}`);
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
      expect(calls).toContain('❌ Error occurred:');
      expect(calls).toContain('Test error');
      expect(calls).not.toContain('Code:');
      expect(calls).not.toContain('Context:');
      expect(calls).not.toContain('💡 Suggestions:');
    });

    it('should handle generic errors', () => {
      const genericError = new Error('Test error');
      service.handleError(genericError);

      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('❌ Unexpected error occurred:');
      expect(calls).toContain('Test error');
    });
  });

  describe('createCLIError', () => {
    it('should create validation error', () => {
      const originalError = new Error('Validation failed');
      const cliError = service.createCLIError(originalError, 'validation', { field: 'test' });

      expect(cliError).toBeInstanceOf(CLIValidationError);
      expect(cliError.message).toBe('Validation failed');
      expect(cliError.context).toEqual({ field: 'test' });
    });

    it('should create file system error', () => {
      const originalError = new Error('File not found');
      const cliError = service.createCLIError(originalError, 'file', { path: '/test' });

      expect(cliError).toBeInstanceOf(FileSystemError);
      expect(cliError.message).toBe('File not found');
      expect(cliError.context).toEqual({ path: '/test' });
    });

    it('should create workflow error', () => {
      const originalError = new Error('Workflow failed');
      const cliError = service.createCLIError(originalError, 'workflow', { step: 'test' });

      expect(cliError).toBeInstanceOf(WorkflowError);
      expect(cliError.message).toBe('Workflow failed');
      expect(cliError.context).toEqual({ step: 'test' });
    });

    it('should create configuration error', () => {
      const originalError = new Error('Config invalid');
      const cliError = service.createCLIError(originalError, 'config', { file: 'config.json' });

      expect(cliError).toBeInstanceOf(ConfigurationError);
      expect(cliError.message).toBe('Config invalid');
      expect(cliError.context).toEqual({ file: 'config.json' });
    });

    it('should create network error', () => {
      const originalError = new Error('Network timeout');
      const cliError = service.createCLIError(originalError, 'network', { url: 'http://test.com' });

      expect(cliError).toBeInstanceOf(NetworkError);
      expect(cliError.message).toBe('Network timeout');
      expect(cliError.context).toEqual({ url: 'http://test.com' });
    });

    it('should create permission error', () => {
      const originalError = new Error('Access denied');
      const cliError = service.createCLIError(originalError, 'permission', { resource: '/test' });

      expect(cliError).toBeInstanceOf(PermissionError);
      expect(cliError.message).toBe('Access denied');
      expect(cliError.context).toEqual({ resource: '/test' });
    });

    it('should create unknown error by default', () => {
      const originalError = new Error('Unknown error');
      const cliError = service.createCLIError(originalError);

      expect(cliError).toBeInstanceOf(UnknownError);
      expect(cliError.message).toBe('Unknown error');
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
        code: ERROR_CODES.CLI_VALIDATION,
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
});
