/**
 * CLI 테스트를 위한 Jest 설정 파일
 * CLI 명령어 실행 환경을 모킹하고 설정합니다.
 */

import { jest } from '@jest/globals';
import 'reflect-metadata';

// process.argv 모킹 설정
const originalArgv = process.argv;

beforeEach(() => {
  // 각 테스트 전에 process.argv를 기본값으로 리셋
  process.argv = ['node', 'jest'];
});

afterEach(() => {
  // 각 테스트 후에 원래 process.argv 복원
  process.argv = originalArgv;
});

// console.log, console.error 모킹 설정
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// process.exit 모킹 (CLI 명령어에서 종료 방지)
const originalExit = process.exit;
beforeEach(() => {
  process.exit = jest.fn() as any;
});

afterEach(() => {
  process.exit = originalExit;
});

// process.cwd 모킹 (작업 디렉토리 고정)
const originalCwd = process.cwd;
beforeEach(() => {
  process.cwd = jest.fn(() => '/tmp/claude-auto-worker-test') as any;
});

afterEach(() => {
  process.cwd = originalCwd;
});

// 환경변수 모킹
const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    PORT: '5849',
  };
});

afterEach(() => {
  process.env = originalEnv;
});

// 파일 시스템 모킹을 위한 유틸리티 함수들
export const mockFileSystem = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  statSync: jest.fn(),
};

// CLI 테스트 헬퍼 함수들
export const cliTestHelpers = {
  // CLI 명령어 실행을 위한 process.argv 설정
  setCliArgs: (...args: string[]) => {
    process.argv = ['node', 'claude-auto-worker', ...args];
  },
  
  // 콘솔 출력 캡처
  captureConsoleOutput: () => {
    const outputs: { type: string; message: string }[] = [];
    
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log = jest.fn((...args) => {
      outputs.push({ type: 'log', message: args.join(' ') });
      originalLog(...args);
    });
    
    console.error = jest.fn((...args) => {
      outputs.push({ type: 'error', message: args.join(' ') });
      originalError(...args);
    });
    
    console.warn = jest.fn((...args) => {
      outputs.push({ type: 'warn', message: args.join(' ') });
      originalWarn(...args);
    });
    
    return {
      outputs,
      restore: () => {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
      }
    };
  },
  
  // 에러 캐치를 위한 래퍼
  catchErrors: async (fn: () => Promise<any>) => {
    try {
      return await fn();
    } catch (error) {
      return { error };
    }
  }
};

// 전역 모킹 설정
jest.mock('fs', () => mockFileSystem);
jest.mock('path', () => ({
  resolve: jest.fn((...args: string[]) => args.join('/')),
  join: jest.fn((...args: string[]) => args.join('/')),
  dirname: jest.fn((path: string) => path.split('/').slice(0, -1).join('/') || '.'),
  basename: jest.fn((path: string) => path.split('/').pop() || ''),
  extname: jest.fn((path: string) => {
    const parts = path.split('.');
    return parts.length > 1 ? `.${parts.pop()}` : '';
  }),
  sep: '/',
  delimiter: ':',
}));

// NestJS Commander 모킹 - 데코레이터 지원을 위해 수정
jest.mock('nest-commander', () => {
  const originalModule = jest.requireActual('nest-commander');
  return {
    Command: jest.fn().mockImplementation((options: any) => {
      return function(target: any) {
        // 데코레이터 메타데이터 설정
        Reflect.defineMetadata('command', options, target);
        return target;
      };
    }),
    CommandRunner: jest.fn().mockImplementation(() => {
      return class MockCommandRunner {
        run = jest.fn();
      };
    }),
    CommandFactory: {
      run: jest.fn(),
      runAsync: jest.fn(),
    },
    Option: jest.fn().mockImplementation((options: any) => {
      return function(target: any, propertyKey: string) {
        // 데코레이터 메타데이터 설정
        if (!Reflect.hasMetadata('options', target.constructor)) {
          Reflect.defineMetadata('options', [], target.constructor);
        }
        const options_ = Reflect.getMetadata('options', target.constructor);
        options_.push({ ...options, propertyKey });
        Reflect.defineMetadata('options', options_, target.constructor);
        return target;
      };
    }),
    Arguments: jest.fn(),
  };
});

// NestJS Common 모킹
jest.mock('@nestjs/common', () => {
  const originalModule = jest.requireActual('@nestjs/common');
  return {
    Injectable: jest.fn().mockImplementation(() => {
      return function(target: any) {
        // Injectable 데코레이터 메타데이터 설정
        Reflect.defineMetadata('injectable', true, target);
        return target;
      };
    }),
  };
});
