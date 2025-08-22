import { Injectable, Logger } from '@nestjs/common';
import {
    PolicyContext,
    PolicyValidationResult,
    PolicyViolation,
    RuleAction,
    RuleCondition,
    SecurityPolicy,
    SecurityRule
} from './policy.types';

@Injectable()
export class PolicyEngineService {
  private readonly logger = new Logger(PolicyEngineService.name);
  private policies: Map<string, SecurityPolicy> = new Map();
  private ruleEvaluators: Map<string, RuleEvaluator> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * 정책을 등록합니다.
   */
  registerPolicy(policy: SecurityPolicy): void {
    this.policies.set(policy.id, policy);
    this.logger.log(`Policy registered: ${policy.name} (${policy.id})`);
  }

  /**
   * 정책을 제거합니다.
   */
  unregisterPolicy(policyId: string): boolean {
    const removed = this.policies.delete(policyId);
    if (removed) {
      this.logger.log(`Policy unregistered: ${policyId}`);
    }
    return removed;
  }

  /**
   * 워크플로우 실행을 검증합니다.
   */
  async validateWorkflowExecution(
    context: PolicyContext,
    command?: string,
    filePath?: string
  ): Promise<PolicyValidationResult> {
    const violations: PolicyViolation[] = [];
    const warnings: PolicyViolation[] = [];
    const recommendations: string[] = [];

    this.logger.debug(`Validating workflow execution with ${this.policies.size} policies`);
    this.logger.debug(`Command: ${command}, FilePath: ${filePath}`);

    // 활성화된 정책들에 대해 검증 수행
    for (const policy of this.policies.values()) {
      if (!policy.enabled) {
        this.logger.debug(`Policy ${policy.id} is disabled, skipping...`);
        continue;
      }

      this.logger.debug(`Processing policy: ${policy.id} with ${policy.rules.length} rules`);

      for (const rule of policy.rules) {
        if (!rule.enabled) {
          this.logger.debug(`Rule ${rule.id} is disabled, skipping...`);
          continue;
        }

        this.logger.debug(`Evaluating rule: ${rule.id} (${rule.type})`);

        try {
          const ruleViolations = await this.evaluateRule(rule, context, command, filePath);
          
          this.logger.debug(`Rule ${rule.id} returned ${ruleViolations.length} violations`);
          
          // 위반 사항을 심각도에 따라 분류
          for (const violation of ruleViolations) {
            if (violation.severity === 'low') {
              warnings.push(violation);
            } else {
              violations.push(violation);
            }
          }
        } catch (error) {
          this.logger.error(`Error evaluating rule ${rule.id}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          warnings.push({
            id: `error-${Date.now()}`,
            policyId: policy.id,
            ruleId: rule.id,
            severity: 'low',
            message: `Rule evaluation error: ${errorMessage}`,
            context,
            timestamp: new Date(),
            resolved: false
          });
        }
      }
    }

    this.logger.debug(`Validation complete: ${violations.length} violations, ${warnings.length} warnings`);

    // 권장사항 생성
    if (violations.length > 0) {
      recommendations.push('Review and resolve policy violations before proceeding');
    }
    if (warnings.length > 0) {
      recommendations.push('Consider addressing policy warnings for better compliance');
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings,
      recommendations
    };
  }

  /**
   * 개별 규칙을 평가합니다.
   */
  private async evaluateRule(
    rule: SecurityRule,
    context: PolicyContext,
    command?: string,
    filePath?: string
  ): Promise<PolicyViolation[]> {
    const violations: PolicyViolation[] = [];
    
    const conditionsMet = this.evaluateConditions(rule.conditions, context, command, filePath);
    
    if (!conditionsMet) {
      this.logger.debug(`Rule ${rule.id} (${rule.type}) conditions not met, skipping...`);
      return violations;
    }

    this.logger.debug(`Rule ${rule.id} (${rule.type}) conditions met, evaluating...`);

    const evaluator = this.ruleEvaluators.get(rule.type);
    let hasSpecialEvaluator = false;
    
    this.logger.debug(`Looking for evaluator for rule type: ${rule.type}`);
    this.logger.debug(`Available evaluators: ${Array.from(this.ruleEvaluators.keys()).join(', ')}`);
    
    if (evaluator && rule.type !== 'custom') {
      hasSpecialEvaluator = true;
      this.logger.debug(`Using special evaluator for rule type: ${rule.type}`);
      try {
        const evaluatorViolations = await evaluator.evaluate(rule, context, command, filePath);
        this.logger.debug(`Evaluator returned ${evaluatorViolations.length} violations`);
        violations.push(...evaluatorViolations);
      } catch (error) {
        this.logger.error(`Error in rule evaluator: ${error}`);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        violations.push({
          id: `evaluator-error-${Date.now()}`,
          policyId: context.workflowId || 'unknown',
          ruleId: rule.id,
          severity: 'low',
          message: `Rule evaluation error: ${errorMessage}`,
          context,
          timestamp: new Date(),
          resolved: false
        });
      }
    } else {
      this.logger.debug(`No special evaluator for rule type: ${rule.type}`);
    }

    // custom 타입이거나 특별한 평가자가 없는 경우 액션 실행
    if (rule.type === 'custom' || !hasSpecialEvaluator) {
      this.logger.debug(`Executing actions for rule type: ${rule.type}`);
      if (rule.actions.length > 0) {
        for (const action of rule.actions) {
          const violation = await this.executeAction(action, rule, context);
          if (violation) {
            violations.push(violation);
          }
        }
      }
    }

    // 액션이 전혀 정의되지 않은 규칙은 경고로 처리 (전용 평가자가 있더라도 위반이 없을 때)
    if (rule.actions.length === 0 && !violations.some(v => v.message === 'Rule has no actions defined')) {
      violations.push({
        id: `no-action-error-${Date.now()}`,
        policyId: context.workflowId || 'unknown',
        ruleId: rule.id,
        severity: 'low',
        message: 'Rule has no actions defined',
        context,
        timestamp: new Date(),
        resolved: false
      });
    }

    this.logger.debug(`Rule ${rule.id} evaluation complete, total violations: ${violations.length}`);
    return violations;
  }

  /**
   * 규칙 조건을 평가합니다.
   */
  private evaluateConditions(
    conditions: RuleCondition[],
    context: PolicyContext,
    command?: string,
    filePath?: string
  ): boolean {
    this.logger.debug(`Evaluating ${conditions.length} conditions`);
    
    return conditions.every(condition => {
      const fieldValue = this.getFieldValue(condition.field, context, command, filePath);
      const result = this.evaluateCondition(condition, fieldValue);
      
      this.logger.debug(`Condition ${condition.field} ${condition.operator} ${condition.value}: ${result} (fieldValue: ${fieldValue})`);
      
      return result;
    });
  }

  /**
   * 필드 값을 가져옵니다.
   */
  private getFieldValue(field: string, context: PolicyContext, command?: string, filePath?: string): unknown {
    switch (field) {
      case 'command':
        return command;
      case 'filePath':
        return filePath;
      case 'workflowId':
        return context.workflowId;
      case 'stepId':
        return context.stepId;
      case 'userId':
        return context.userId;
      default:
        return context.metadata?.[field];
    }
  }

  /**
   * 개별 조건을 평가합니다.
   */
  private evaluateCondition(condition: RuleCondition, fieldValue: unknown): boolean {
    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }

    const { operator, value, caseSensitive = true } = condition;
    const fieldStr = String(fieldValue);
    const compareValue = typeof value === 'string' && !caseSensitive ? value.toLowerCase() : value;
    const fieldStrLower = typeof fieldValue === 'string' && !caseSensitive ? fieldStr.toLowerCase() : fieldStr;

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'contains':
        return fieldStrLower.includes(String(compareValue));
      case 'regex':
        try {
          const regex = new RegExp(String(value), caseSensitive ? '' : 'i');
          return regex.test(fieldStr);
        } catch {
          return false;
        }
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'in':
        return Array.isArray(value) && value.some(v => v === fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.some(v => v === fieldValue);
      default:
        return false;
    }
  }

  /**
   * 규칙 액션을 실행합니다.
   */
  private async executeAction(
    action: RuleAction,
    rule: SecurityRule,
    context: PolicyContext
  ): Promise<PolicyViolation | null> {
    switch (action.type) {
      case 'block':
        return this.createViolation(action, rule, context, 'Policy violation blocked execution');
      case 'warn': {
        // Warn은 항상 경고로 집계되도록 severity를 low로 고정
        const violation: PolicyViolation = {
          id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          policyId: context.workflowId || 'unknown',
          ruleId: rule.id,
          severity: 'low',
          message: `Policy warning issued: ${action.message}`,
          context,
          timestamp: new Date(),
          resolved: false
        };
        return violation;
      }
      case 'log':
        this.logger.log(`Policy log: ${action.message}`, { rule: rule.id, context });
        return null;
      case 'notify':
        await this.sendNotification(action, rule, context);
        return null;
      case 'rollback':
        await this.triggerRollback(action, rule, context);
        return null;
      default:
        this.logger.warn(`Unknown action type: ${action.type}`);
        return null;
    }
  }

  /**
   * 정책 위반을 생성합니다.
   */
  private createViolation(
    action: RuleAction,
    rule: SecurityRule,
    context: PolicyContext,
    message: string
  ): PolicyViolation {
    return {
      id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      policyId: context.workflowId || 'unknown',
      ruleId: rule.id,
      severity: action.severity,
      message: `${message}: ${action.message}`,
      context,
      timestamp: new Date(),
      resolved: false
    };
  }

  /**
   * 알림을 전송합니다.
   */
  private async sendNotification(action: RuleAction, rule: SecurityRule, context: PolicyContext): Promise<void> {
    // TODO: 알림 시스템 구현 (Slack, Email, Webhook 등)
    this.logger.log(`Notification sent: ${action.message}`, { rule: rule.id, context });
  }

  /**
   * 롤백을 트리거합니다.
   */
  private async triggerRollback(action: RuleAction, rule: SecurityRule, context: PolicyContext): Promise<void> {
    // TODO: 롤백 시스템 구현
    this.logger.log(`Rollback triggered: ${action.message}`, { rule: rule.id, context });
  }

  /**
   * 기본 규칙들을 초기화합니다.
   */
  private initializeDefaultRules(): void {
    // 규칙 평가자 등록
    this.ruleEvaluators.set('command_filter', {
      name: 'Command Filter',
      description: 'Filters dangerous commands',
      evaluate: this.evaluateCommandFilter.bind(this)
    });

    this.ruleEvaluators.set('path_restriction', {
      name: 'Path Restriction',
      description: 'Restricts file system access',
      evaluate: this.evaluatePathRestriction.bind(this)
    });

    this.ruleEvaluators.set('sensitive_data', {
      name: 'Sensitive Data',
      description: 'Detects sensitive information',
      evaluate: this.evaluateSensitiveData.bind(this)
    });

    // custom 타입은 특별한 평가자 없이 일반적인 액션 실행 로직 사용
    // this.ruleEvaluators.set('custom', { ... }); // 제거

    // 기본 보안 정책 등록
    this.initializeDefaultPolicies();
  }

  /**
   * 기본 보안 정책을 등록합니다.
   */
  private initializeDefaultPolicies(): void {
    const defaultPolicy: SecurityPolicy = {
      id: 'default-security-policy',
      name: 'Default Security Policy',
      description: '기본 보안 정책 - 위험한 명령어, 제한된 경로, 민감 데이터 감지',
      enabled: true,
      priority: 'high',
      rules: [
        {
          id: 'cmd-filter-rule',
          name: 'Dangerous Command Filter',
          type: 'command_filter',
          enabled: true,
          conditions: [],
          actions: [
            {
              type: 'block',
              severity: 'critical',
              message: 'Dangerous command detected'
            }
          ]
        },
        {
          id: 'path-restriction-rule',
          name: 'Path Restriction',
          type: 'path_restriction',
          enabled: true,
          conditions: [],
          actions: [
            {
              type: 'block',
              severity: 'high',
              message: 'Restricted path access'
            }
          ]
        },
        {
          id: 'sensitive-data-rule',
          name: 'Sensitive Data Detection',
          type: 'sensitive_data',
          enabled: true,
          conditions: [],
          actions: [
            {
              type: 'block',
              severity: 'high',
              message: 'Sensitive data detected'
            }
          ]
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };

    this.registerPolicy(defaultPolicy);
  }

  /**
   * 명령어 필터 규칙 평가기
   */
  private evaluateCommandFilter(
    rule: SecurityRule,
    context: PolicyContext,
    command?: string
  ): Promise<PolicyViolation[]> {
    const violations: PolicyViolation[] = [];
    
    if (!command) return Promise.resolve(violations);

    const dangerousCommands = [
      'rm -rf /',
      'format c:',
      'del /s /q c:\\',
      'sudo',
      'chmod 777',
      'chown root',
      'dd if=/dev/zero',
      'mkfs',
      'fdisk'
    ];

    for (const dangerousCmd of dangerousCommands) {
      if (command.toLowerCase().includes(dangerousCmd.toLowerCase())) {
        violations.push({
          id: `cmd-violation-${Date.now()}`,
          policyId: context.workflowId || 'unknown',
          ruleId: rule.id,
          severity: 'critical',
          message: `Dangerous command detected: ${dangerousCmd}`,
          context,
          timestamp: new Date(),
          resolved: false
        });
      }
    }

    return Promise.resolve(violations);
  }

  /**
   * 경로 제한 규칙 평가기
   */
  private evaluatePathRestriction(
    rule: SecurityRule,
    context: PolicyContext,
    command?: string,
    filePath?: string
  ): Promise<PolicyViolation[]> {
    const violations: PolicyViolation[] = [];
    
    this.logger.debug(`evaluatePathRestriction called with filePath: ${filePath}`);
    
    if (!filePath) {
      this.logger.debug(`No filePath provided, returning empty violations`);
      return Promise.resolve(violations);
    }

    const restrictedPaths = [
      '/etc/',
      '/var/log/',
      '/root/',
      'C:\\Windows\\',
      'C:\\System32\\'
    ];

    this.logger.debug(`Checking against restricted paths: ${restrictedPaths.join(', ')}`);

    for (const restrictedPath of restrictedPaths) {
      this.logger.debug(`Checking if '${filePath}' contains '${restrictedPath}'`);
      if (filePath.includes(restrictedPath)) {
        this.logger.debug(`MATCH FOUND! '${filePath}' contains '${restrictedPath}'`);
        violations.push({
          id: `path-violation-${Date.now()}`,
          policyId: context.workflowId || 'unknown',
          ruleId: rule.id,
          severity: 'high',
          message: `Restricted path access: ${restrictedPath}`,
          context,
          timestamp: new Date(),
          resolved: false
        });
      } else {
        this.logger.debug(`No match for '${restrictedPath}'`);
      }
    }

    this.logger.debug(`evaluatePathRestriction returning ${violations.length} violations`);
    return Promise.resolve(violations);
  }

  /**
   * 민감 데이터 규칙 평가기
   */
  private evaluateSensitiveData(
    rule: SecurityRule,
    context: PolicyContext,
    command?: string,
    filePath?: string
  ): Promise<PolicyViolation[]> {
    const violations: PolicyViolation[] = [];
    
    this.logger.debug(`evaluateSensitiveData called with command: ${command}`);
    
    if (!command) {
      this.logger.debug(`No command provided, returning empty violations`);
      return Promise.resolve(violations);
    }

    // 인용부호 유무와 공백을 모두 허용하는 패턴들 (대소문자 무시)
    const sensitivePatterns = [
      /(api[_-]?key)\s*[:=]\s*(["']?)([^"'\s]+)\2/i,
      /(password)\s*[:=]\s*(["']?)([^"'\s]+)\2/i,
      /(secret)\s*[:=]\s*(["']?)([^"'\s]+)\2/i,
      /(token)\s*[:=]\s*(["']?)([^"'\s]+)\2/i,
      /(private[_-]?key)\s*[:=]\s*(["']?)([^"'\s]+)\2/i
    ];

    this.logger.debug(`Checking command against ${sensitivePatterns.length} sensitive patterns`);

    for (const pattern of sensitivePatterns) {
      this.logger.debug(`Testing pattern: ${pattern}`);
      if (pattern.test(command)) {
        this.logger.debug(`MATCH FOUND! Command matches pattern: ${pattern}`);
        violations.push({
          id: `sensitive-violation-${Date.now()}`,
          policyId: context.workflowId || 'unknown',
          ruleId: rule.id,
          severity: 'high',
          message: 'Sensitive data detected in command',
          context,
          timestamp: new Date(),
          resolved: false
        });
      }
    }

    this.logger.debug(`evaluateSensitiveData returning ${violations.length} violations`);
    return Promise.resolve(violations);
  }

  /**
   * 등록된 정책 목록을 반환합니다.
   */
  getPolicies(): SecurityPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * 특정 정책을 반환합니다.
   */
  getPolicy(policyId: string): SecurityPolicy | undefined {
    return this.policies.get(policyId);
  }
}

interface RuleEvaluator {
  name: string;
  description: string;
  evaluate: (
    rule: SecurityRule,
    context: PolicyContext,
    command?: string,
    filePath?: string
  ) => Promise<PolicyViolation[]>;
}
