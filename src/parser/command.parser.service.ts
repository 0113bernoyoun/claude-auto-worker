import { Injectable } from '@nestjs/common';
import { RunCommand } from './workflow.types';

@Injectable()
export class CommandParserService {
  // 상수 정의로 매직 넘버와 문자열 제거
  private static readonly ENV_VAR_SEPARATOR = '=';
  private static readonly OPTION_PREFIX = '-';
  private static readonly CWD_OPTION = '--cwd';
  private static readonly CWD_OPTION_SHORT = '-d';
  private static readonly TIMEOUT_OPTION = '--timeout';
  private static readonly TIMEOUT_OPTION_SHORT = '-t';
  private static readonly MIN_TIMEOUT_VALUE = 1;
  private static readonly BASE_10_RADIX = 10;

  /**
   * run 명령어를 파싱합니다.
   * @param runValue run 필드의 값 (문자열 또는 문자열 배열)
   * @returns 파싱된 명령어 객체들
   */
  parseRunCommands(runValue: string | string[]): RunCommand[] {
    if (typeof runValue === 'string') {
      return [this.parseSingleCommand(runValue)];
    }
    
    if (Array.isArray(runValue)) {
      return runValue.map(cmd => this.parseSingleCommand(cmd));
    }
    
    throw new Error('Invalid run command format');
  }

  /**
   * 단일 명령어를 파싱합니다.
   * @param commandStr 명령어 문자열
   * @returns 파싱된 명령어 객체
   */
  private parseSingleCommand(commandStr: string): RunCommand {
    // 명령어와 인수를 분리
    const parts = this.splitCommand(commandStr);
    const command = parts[0];
    const args = parts.slice(1);

    // 환경변수 추출
    const envVars: Record<string, string> = {};
    const filteredArgs: string[] = [];
    
    for (const arg of args) {
      if (arg.includes(CommandParserService.ENV_VAR_SEPARATOR) && !arg.startsWith(CommandParserService.OPTION_PREFIX)) {
        const [key, value] = arg.split(CommandParserService.ENV_VAR_SEPARATOR, 2);
        if (key && value !== undefined) {
          envVars[key] = value;
        }
      } else {
        filteredArgs.push(arg);
      }
    }

    // 작업 디렉토리 추출
    let cwd: string | undefined;
    const cwdIndex = filteredArgs.findIndex(arg => arg === CommandParserService.CWD_OPTION || arg === CommandParserService.CWD_OPTION_SHORT);
    if (cwdIndex !== -1 && cwdIndex + 1 < filteredArgs.length) {
      cwd = filteredArgs[cwdIndex + 1];
      filteredArgs.splice(cwdIndex, 2);
    }

    // 타임아웃 추출
    let timeout: number | undefined;
    const timeoutIndex = filteredArgs.findIndex(arg => arg === CommandParserService.TIMEOUT_OPTION || arg === CommandParserService.TIMEOUT_OPTION_SHORT);
    if (timeoutIndex !== -1 && timeoutIndex + 1 < filteredArgs.length) {
      const timeoutStr = filteredArgs[timeoutIndex + 1];
      if (timeoutStr) {
        timeout = parseInt(timeoutStr, CommandParserService.BASE_10_RADIX);
        if (isNaN(timeout) || timeout <= CommandParserService.MIN_TIMEOUT_VALUE) {
          throw new Error(`Invalid timeout value: ${timeoutStr}`);
        }
      }
      filteredArgs.splice(timeoutIndex, 2);
    }

    // command가 undefined가 아닌지 확인
    if (!command) {
      throw new Error('Command cannot be undefined');
    }

    return {
      command,
      args: filteredArgs.length > 0 ? filteredArgs : undefined,
      cwd,
      env: Object.keys(envVars).length > 0 ? envVars : undefined,
      timeout
    };
  }

  /**
   * 명령어 문자열을 명령어와 인수로 분리합니다.
   * 따옴표를 고려하여 분리
   */
  private splitCommand(commandStr: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < commandStr.length; i++) {
      const char = commandStr[i];
      
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
        continue;
      }
      
      if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
        continue;
      }
      
      if (char === ' ' && !inQuotes) {
        if (current.trim()) {
          parts.push(current.trim());
          current = '';
        }
        continue;
      }
      
      current += char;
    }
    
    if (current.trim()) {
      parts.push(current.trim());
    }
    
    return parts;
  }

  /**
   * 명령어의 유효성을 검사합니다.
   * @param command 파싱된 명령어 객체
   * @returns 검증 결과
   */
  validateCommand(command: RunCommand): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 명령어가 비어있지 않은지 확인
    if (!command.command || command.command.trim().length === 0) {
      errors.push('Command cannot be empty');
    }

    // 명령어에 위험한 패턴이 포함되어 있지 않은지 확인
    if (this.containsDangerousPattern(command.command)) {
      errors.push('Command contains potentially dangerous patterns');
    }

    // 작업 디렉토리가 유효한지 확인
    if (command.cwd && !this.isValidPath(command.cwd)) {
      errors.push('Invalid working directory path');
    }

    // 타임아웃이 유효한지 확인
    if (command.timeout !== undefined && (command.timeout <= CommandParserService.MIN_TIMEOUT_VALUE || command.timeout > 3600)) {
      errors.push('Timeout must be between 1 and 3600 seconds');
    }

    // 환경변수 이름이 유효한지 확인
    if (command.env) {
      for (const key of Object.keys(command.env)) {
        if (!this.isValidEnvVarName(key)) {
          errors.push(`Invalid environment variable name: ${key}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 위험한 패턴이 포함되어 있는지 확인합니다.
   */
  private containsDangerousPattern(command: string): boolean {
    const dangerousPatterns = [
      'rm -rf',
      'rm -rf /',
      'dd if=',
      '> /dev/',
      '| bash',
      '| sh',
      '&& rm',
      '; rm',
      'eval ',
      'exec ',
      'system(',
      'child_process'
    ];

    return dangerousPatterns.some(pattern => 
      command.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * 경로가 유효한지 확인합니다.
   */
  private isValidPath(path: string): boolean {
    // 상대 경로나 절대 경로가 유효한지 확인
    const normalizedPath = path.replace(/\\/g, '/');
    
    // 위험한 경로 패턴 확인
    const dangerousPaths = [
      '/etc/',
      '/var/',
      '/usr/',
      '/bin/',
      '/sbin/',
      '/dev/',
      '/proc/',
      '/sys/'
    ];
    
    return !dangerousPaths.some(dangerousPath => 
      normalizedPath.startsWith(dangerousPath)
    );
  }

  /**
   * 환경변수 이름이 유효한지 확인합니다.
   */
  private isValidEnvVarName(name: string): boolean {
    // 환경변수 이름 규칙: 알파벳, 숫자, 언더스코어만 허용, 숫자로 시작 불가
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  /**
   * 명령어를 실행 가능한 형태로 변환합니다.
   * @param command 파싱된 명령어 객체
   * @returns 실행 가능한 명령어 문자열
   */
  formatCommand(command: RunCommand): string {
    let result = command.command;
    
    if (command.args && command.args.length > 0) {
      result += ' ' + command.args.map(arg => {
        // 공백이나 특수문자가 포함된 인수는 따옴표로 감싸기
        if (arg.includes(' ') || arg.includes('"') || arg.includes("'")) {
          return `"${arg.replace(/"/g, '\\"')}"`;
        }
        return arg;
      }).join(' ');
    }
    
    return result;
  }

  /**
   * 여러 명령어를 순차적으로 실행할 수 있는 형태로 변환합니다.
   * @param commands 명령어 배열
   * @returns 순차 실행 명령어
   */
  formatSequentialCommands(commands: RunCommand[]): string {
    return commands.map(cmd => this.formatCommand(cmd)).join(' && ');
  }
}
