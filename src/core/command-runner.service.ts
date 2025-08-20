import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';

export type RunResult = {
  code: number;
};

export type RunOptions = {
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  onStdoutLine?: (line: string) => void;
  onStderrLine?: (line: string) => void;
  signal?: AbortSignal;
};

@Injectable()
export class CommandRunnerService {
  async runShell(command: string, args: string[] = [], options?: RunOptions): Promise<RunResult> {
    return new Promise<RunResult>((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options?.cwd ?? process.cwd(),
        env: { ...process.env, ...(options?.env ?? {}) },
        shell: false,
      });

      let stdoutBuffer = '';
      let stderrBuffer = '';

      const flushLines = (buffer: string, emit: (line: string) => void): string => {
        const lines = buffer.split(/\r?\n/);
        for (let i = 0; i < lines.length - 1; i++) emit(lines[i]!);
        return lines.length > 0 ? lines[lines.length - 1]! : '';
      };

      child.stdout.on('data', (chunk: Buffer) => {
        stdoutBuffer += chunk.toString('utf-8');
        if (options?.onStdoutLine) {
          stdoutBuffer = flushLines(stdoutBuffer, options.onStdoutLine);
        }
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderrBuffer += chunk.toString('utf-8');
        if (options?.onStderrLine) {
          stderrBuffer = flushLines(stderrBuffer, options.onStderrLine);
        }
      });

      const onExit = (code: number | null) => {
        // flush remaining partial lines
        if (options?.onStdoutLine && stdoutBuffer.length > 0) options.onStdoutLine(stdoutBuffer);
        if (options?.onStderrLine && stderrBuffer.length > 0) options.onStderrLine(stderrBuffer);
        resolve({ code: code ?? -1 });
      };

      child.on('error', (err) => reject(err));
      child.on('close', onExit);

      if (options?.signal) {
        options.signal.addEventListener('abort', () => {
          try { child.kill('SIGTERM'); } catch {}
        });
      }

      if (options?.timeoutMs && options.timeoutMs > 0) {
        setTimeout(() => {
          try { child.kill('SIGKILL'); } catch {}
          reject(new Error('Process timeout exceeded'));
        }, options.timeoutMs);
      }
    });
  }

  async runClaudeWithInput(params: {
    action: 'task' | 'query' | 'continue' | 'resume' | 'commit';
    prompt?: string;
    cwd?: string;
    env?: Record<string, string>;
    timeoutMs?: number;
    signal?: AbortSignal;
    onStdoutLine?: (line: string) => void;
    onStderrLine?: (line: string) => void;
  }): Promise<RunResult> {
    const { action, prompt, cwd, env, timeoutMs, signal, onStdoutLine, onStderrLine } = params;

    const cli = 'claude';
    // 빠른 가이드: 바이너리 미존재 시 사용자 친화 메시지
    const args: string[] = [];

    switch (action) {
      case 'task':
        args.push('task');
        if (prompt) args.push('-p', prompt);
        break;
      case 'query':
        args.push('query');
        if (prompt) args.push('-p', prompt);
        break;
      case 'continue':
        args.push('-c');
        if (prompt) args.push('-p', prompt);
        break;
      case 'resume':
        args.push('-r');
        if (prompt) args.push('-p', prompt);
        break;
      case 'commit':
        args.push('commit');
        break;
      default:
        throw new Error(`Unsupported Claude action: ${action}`);
    }

    try {
      return await this.runShell(cli, args, { cwd, env, timeoutMs, signal, onStdoutLine, onStderrLine });
    } catch (err: any) {
      if (err && /ENOENT/i.test(String(err.code))) {
        throw new Error(
          'Claude CLI not found. Please install and login first.\n' +
          '- Install: see README (TASK-084)\n' +
          '- Verify: `which claude` and `claude --help`'
        );
      }
      throw err;
    }
  }
}


