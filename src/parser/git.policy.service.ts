import { Injectable } from '@nestjs/common';
import { WorkflowPolicy } from './workflow.types';

@Injectable()
export class GitPolicyService {
  /**
   * 브랜치 이름을 생성하고 검증합니다.
   * @param baseBranch 기본 브랜치명
   * @param workflowName 워크플로우 이름
   * @param stepId 단계 ID
   * @returns 생성된 브랜치명
   */
  generateBranchName(
    baseBranch: string,
    workflowName: string,
    stepId: string
  ): string {
    // 브랜치명에서 사용할 수 없는 문자 제거
    const sanitizedWorkflowName = this.sanitizeBranchName(workflowName);
    const sanitizedStepId = this.sanitizeBranchName(stepId);
    
    // 타임스탬프 추가로 고유성 보장
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    
    return `${baseBranch}-${sanitizedWorkflowName}-${sanitizedStepId}-${timestamp}`;
  }

  /**
   * 브랜치명을 Git 규칙에 맞게 정리합니다.
   * @param name 원본 이름
   * @returns 정리된 이름
   */
  private sanitizeBranchName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '-') // 영문, 숫자, 한글, 하이픈만 허용
      .replace(/-+/g, '-') // 연속된 하이픈을 하나로
      .replace(/^-|-$/g, '') // 앞뒤 하이픈 제거
      .substring(0, 50); // 길이 제한
  }

  /**
   * 브랜치명이 유효한지 검증합니다.
   * @param branchName 브랜치명
   * @returns 검증 결과
   */
  validateBranchName(branchName: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 길이 검증
    if (branchName.length === 0) {
      errors.push('Branch name cannot be empty');
    } else if (branchName.length > 250) {
      errors.push('Branch name is too long (max 250 characters)');
    }

    // Git 예약어 확인
    const reservedNames = ['HEAD', 'ORIG_HEAD', 'FETCH_HEAD', 'MERGE_HEAD'];
    if (reservedNames.includes(branchName.toUpperCase())) {
      errors.push(`Branch name cannot be a Git reserved name: ${branchName}`);
    }

    // 위험한 패턴 확인
    const dangerousPatterns = [
      '..',
      '~',
      '^',
      ':',
      '?',
      '*',
      '[',
      '\\'
    ];
    
    for (const pattern of dangerousPatterns) {
      if (branchName.includes(pattern)) {
        errors.push(`Branch name contains invalid character: ${pattern}`);
      }
    }

    // 공백 확인
    if (branchName.includes(' ')) {
      errors.push('Branch name cannot contain spaces');
    }

    // 제어 문자 확인
    if (/[\x00-\x1F\x7F]/.test(branchName)) {
      errors.push('Branch name contains control characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 워크플로우 정책을 검증합니다.
   * @param policy 정책 객체
   * @returns 검증 결과
   */
  validatePolicy(policy: WorkflowPolicy): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (policy.retry) {
      const retryErrors = this.validateRetryPolicy(policy.retry);
      errors.push(...retryErrors);
    }

    if (policy.timeout) {
      const timeoutErrors = this.validateTimeoutPolicy(policy.timeout);
      errors.push(...timeoutErrors);
    }

    if (policy.rollback) {
      const rollbackErrors = this.validateRollbackPolicy(policy.rollback);
      errors.push(...rollbackErrors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 재시도 정책을 검증합니다.
   */
  private validateRetryPolicy(retry: NonNullable<WorkflowPolicy['retry']>): string[] {
    const errors: string[] = [];

    if (retry.max_attempts < 1 || retry.max_attempts > 100) {
      errors.push('Retry max_attempts must be between 1 and 100');
    }

    if (retry.delay_ms < 0 || retry.delay_ms > 300000) { // 5분
      errors.push('Retry delay_ms must be between 0 and 300000 (5 minutes)');
    }

    if (retry.backoff_multiplier !== undefined) {
      if (retry.backoff_multiplier < 1 || retry.backoff_multiplier > 10) {
        errors.push('Retry backoff_multiplier must be between 1 and 10');
      }
    }

    return errors;
  }

  /**
   * 타임아웃 정책을 검증합니다.
   */
  private validateTimeoutPolicy(timeout: NonNullable<WorkflowPolicy['timeout']>): string[] {
    const errors: string[] = [];

    if (timeout.seconds < 1 || timeout.seconds > 86400) { // 24시간
      errors.push('Timeout seconds must be between 1 and 86400 (24 hours)');
    }

    return errors;
  }

  /**
   * 롤백 정책을 검증합니다.
   */
  private validateRollbackPolicy(rollback: NonNullable<WorkflowPolicy['rollback']>): string[] {
    const errors: string[] = [];

    if (rollback.steps && !Array.isArray(rollback.steps)) {
      errors.push('Rollback steps must be an array');
    }

    if (rollback.steps && rollback.steps.length > 0) {
      for (const step of rollback.steps) {
        if (typeof step !== 'string' || step.trim().length === 0) {
          errors.push('Rollback step must be a non-empty string');
        }
      }
    }

    return errors;
  }

  /**
   * 정책을 기본값으로 초기화합니다.
   * @param policy 부분 정책 객체
   * @returns 완성된 정책 객체
   */
  initializePolicy(policy: Partial<WorkflowPolicy> = {}): WorkflowPolicy {
    return {
      retry: {
        max_attempts: policy.retry?.max_attempts ?? 3,
        delay_ms: policy.retry?.delay_ms ?? 1000,
        backoff_multiplier: policy.retry?.backoff_multiplier ?? 2,
        ...policy.retry
      },
      timeout: {
        seconds: policy.timeout?.seconds ?? 300, // 5분
        ...policy.timeout
      },
      rollback: {
        enabled: policy.rollback?.enabled ?? false,
        steps: policy.rollback?.steps ?? [],
        ...policy.rollback
      },
      ...policy
    };
  }

  /**
   * 정책이 활성화되어 있는지 확인합니다.
   * @param policy 정책 객체
   * @returns 활성화된 정책들
   */
  getActivePolicies(policy: WorkflowPolicy): {
    hasRetry: boolean;
    hasTimeout: boolean;
    hasRollback: boolean;
  } {
    return {
      hasRetry: policy.retry !== undefined,
      hasTimeout: policy.timeout !== undefined,
      hasRollback: policy.rollback?.enabled === true
    };
  }

  /**
   * 정책을 사람이 읽기 쉬운 형태로 변환합니다.
   * @param policy 정책 객체
   * @returns 읽기 쉬운 설명
   */
  formatPolicyDescription(policy: WorkflowPolicy): string {
    const parts: string[] = [];

    if (policy.retry) {
      parts.push(`재시도: 최대 ${policy.retry.max_attempts}회, 대기 ${policy.retry.delay_ms}ms`);
    }

    if (policy.timeout) {
      parts.push(`타임아웃: ${policy.timeout.seconds}초`);
    }

    if (policy.rollback?.enabled) {
      parts.push(`롤백: 활성화`);
    }

    return parts.length > 0 ? parts.join(', ') : '기본 정책 사용';
  }
}
