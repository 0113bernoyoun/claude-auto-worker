import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import {
    CLAUDE_TOKEN_EXHAUSTED_PATTERNS,
    DEFAULT_RECOVERY_OPTIONS,
    HealthCheckResult,
    RecoveryOptions,
    TokenExhaustionInfo,
    TokenHealthStatus,
} from './claude-token-health.types';

@Injectable()
export class ClaudeTokenHealthService {
  private readonly logger = new Logger(ClaudeTokenHealthService.name);
  private healthStatus: TokenHealthStatus = {
    isAvailable: true,
    lastChecked: new Date(),
    retryCount: 0,
  };

  constructor() {}

  /**
   * 토큰 소진 에러인지 확인
   */
  isTokenExhaustedError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.stderr || String(error);
    return CLAUDE_TOKEN_EXHAUSTED_PATTERNS.some(pattern => pattern.test(errorMessage));
  }

  /**
   * 직접 claude CLI 실행
   */
  private async runClaudeDirectly(action: string, prompt?: string, timeoutMs: number = 10000): Promise<{ code: number; stderr: string }> {
    return new Promise((resolve, reject) => {
      const args: string[] = [];
      
      switch (action) {
        case 'query':
          args.push('query');
          if (prompt) args.push('-p', prompt);
          break;
        default:
          args.push('query');
          if (prompt) args.push('-p', prompt);
      }

      const child = spawn('claude', args, {
        shell: false,
      });

      let stderrBuffer = '';

      child.stderr.on('data', (chunk: Buffer) => {
        stderrBuffer += chunk.toString('utf-8');
      });

      const onExit = (code: number | null) => {
        resolve({ code: code ?? -1, stderr: stderrBuffer });
      };

      child.on('error', (err) => reject(err));
      child.on('close', onExit);

      if (timeoutMs > 0) {
        setTimeout(() => {
          try { child.kill('SIGKILL'); } catch {}
          reject(new Error('Process timeout exceeded'));
        }, timeoutMs);
      }
    });
  }

  /**
   * 토큰 상태 확인
   */
  async checkTokenHealth(): Promise<TokenHealthStatus> {
    try {
      this.logger.debug('Checking Claude token health...');
      
      const startTime = Date.now();
      const result = await this.runClaudeDirectly('query', 'Are you available now?', 10000);

      const responseTime = Date.now() - startTime;
      
      if (result.code === 0) {
        this.healthStatus = {
          isAvailable: true,
          lastChecked: new Date(),
          retryCount: 0,
        };
        this.logger.debug('Claude token is available');
      } else {
        this.healthStatus = {
          isAvailable: false,
          lastChecked: new Date(),
          errorMessage: `Claude CLI exited with code ${result.code}`,
          retryCount: this.healthStatus.retryCount + 1,
        };
        this.logger.warn('Claude token is not available');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.healthStatus = {
        isAvailable: false,
        lastChecked: new Date(),
        errorMessage,
        retryCount: this.healthStatus.retryCount + 1,
      };
      this.logger.warn('Failed to check Claude token health', errorMessage);
    }

    return this.healthStatus;
  }

  /**
   * 토큰 복구 대기
   */
  async waitForTokenRecovery(options: Partial<RecoveryOptions> = {}): Promise<void> {
    const config = { ...DEFAULT_RECOVERY_OPTIONS, ...options };
    let currentDelay = config.initialDelayMs;
    let attempt = 0;

    this.logger.log(`Waiting for Claude token recovery... (max retries: ${config.maxRetries})`);

    while (attempt < config.maxRetries) {
      attempt++;
      
      // 현재 상태 확인
      const status = await this.checkTokenHealth();
      
      if (status.isAvailable) {
        this.logger.log('Claude token is now available!');
        return;
      }

      if (attempt >= config.maxRetries) {
        this.logger.error(`Max retries reached. Claude token is still not available.`);
        throw new Error('Claude token recovery timeout exceeded');
      }

      // 지수 백오프로 대기
      const delay = Math.min(currentDelay, config.maxDelayMs);
      this.logger.log(`Token not available. Retrying in ${delay / 1000} seconds... (attempt ${attempt}/${config.maxRetries})`);
      
      await this.delay(delay);
      currentDelay = Math.min(currentDelay * config.backoffMultiplier, config.maxDelayMs);
    }
  }

  /**
   * 간단한 생존 확인 요청 전송
   */
  async sendHealthCheckRequest(): Promise<HealthCheckResult> {
    try {
      this.logger.debug('Sending health check request...');
      
      const startTime = Date.now();
      const result = await this.runClaudeDirectly('query', 'Are you available now?', 5000);

      const responseTime = Date.now() - startTime;
      
      if (result.code === 0) {
        return {
          success: true,
          responseTime,
          timestamp: new Date(),
        };
      } else {
        return {
          success: false,
          responseTime,
          errorMessage: `Exit code: ${result.code}`,
          timestamp: new Date(),
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        responseTime: 0,
        errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 토큰 소진 정보 기록
   */
  recordTokenExhaustion(info: TokenExhaustionInfo): void {
    this.logger.warn('Claude token exhaustion detected', {
      errorMessage: info.errorMessage,
      exitCode: info.exitCode,
      timestamp: info.timestamp,
    });

    this.healthStatus = {
      isAvailable: false,
      lastChecked: info.timestamp,
      errorMessage: info.errorMessage,
      retryCount: this.healthStatus.retryCount + 1,
    };
  }

  /**
   * 현재 토큰 상태 반환
   */
  getCurrentStatus(): TokenHealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * 토큰 상태 리셋
   */
  resetStatus(): void {
    this.healthStatus = {
      isAvailable: true,
      lastChecked: new Date(),
      retryCount: 0,
    };
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
