export interface TokenHealthStatus {
  isAvailable: boolean;
  lastChecked: Date;
  errorMessage?: string;
  estimatedRecoveryTime?: Date;
  retryCount: number;
}

export interface RecoveryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  healthCheckIntervalMs: number;
}

export interface TokenExhaustionInfo {
  timestamp: Date;
  errorMessage: string;
  exitCode: number;
  stderr: string;
}

export interface HealthCheckResult {
  success: boolean;
  responseTime: number;
  errorMessage?: string;
  timestamp: Date;
}

export const DEFAULT_RECOVERY_OPTIONS: RecoveryOptions = {
  maxRetries: 10,
  initialDelayMs: 5000, // 5초
  maxDelayMs: 300000,   // 5분
  backoffMultiplier: 2,
  healthCheckIntervalMs: 60000, // 1분
};

export const CLAUDE_TOKEN_EXHAUSTED_PATTERNS = [
  /Claude AI usage limit reached/i,
  /usage limit reached/i,
  /rate limit exceeded/i,
  /quota exceeded/i,
];
