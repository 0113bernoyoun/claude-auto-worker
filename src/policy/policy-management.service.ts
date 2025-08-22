import { Injectable, Logger } from '@nestjs/common';
import {
    PolicyContext,
    PolicyViolation,
    RuleAction,
    RuleCondition,
    SecurityPolicy,
    SecurityRule
} from './policy.types';

@Injectable()
export class PolicyManagementService {
  private readonly logger = new Logger(PolicyManagementService.name);
  private policies: Map<string, SecurityPolicy> = new Map();
  private policyTemplates: Map<string, SecurityPolicy> = new Map();

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * 새로운 보안 정책을 생성합니다.
   */
  async createPolicy(
    name: string,
    description: string,
    priority: 'low' | 'medium' | 'high' | 'critical',
    rules: SecurityRule[],
    createdBy: string
  ): Promise<SecurityPolicy> {
    const policy: SecurityPolicy = {
      id: `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      enabled: true,
      priority,
      rules,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy
    };

    this.policies.set(policy.id, policy);
    this.logger.log(`Policy created: ${name} (${policy.id}) by ${createdBy}`);
    
    return policy;
  }

  /**
   * 기존 정책을 업데이트합니다.
   */
  async updatePolicy(
    policyId: string,
    updates: Partial<Omit<SecurityPolicy, 'id' | 'createdAt' | 'createdBy'>>,
    updatedBy: string
  ): Promise<SecurityPolicy> {
    const policy = this.policies.get(policyId);
    
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const updatedPolicy: SecurityPolicy = {
      ...policy,
      ...updates,
      updatedAt: new Date()
    };

    this.policies.set(policyId, updatedPolicy);
    this.logger.log(`Policy updated: ${policy.name} (${policyId}) by ${updatedBy}`);
    
    return updatedPolicy;
  }

  /**
   * 정책을 삭제합니다.
   */
  async deletePolicy(policyId: string, deletedBy: string): Promise<boolean> {
    const policy = this.policies.get(policyId);
    
    if (!policy) {
      return false;
    }

    this.policies.delete(policyId);
    this.logger.log(`Policy deleted: ${policy.name} (${policyId}) by ${deletedBy}`);
    
    return true;
  }

  /**
   * 정책을 활성화/비활성화합니다.
   */
  async togglePolicy(policyId: string, enabled: boolean, updatedBy: string): Promise<SecurityPolicy> {
    const policy = this.policies.get(policyId);
    
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    policy.enabled = enabled;
    policy.updatedAt = new Date();

    this.policies.set(policyId, policy);
    this.logger.log(`Policy ${enabled ? 'enabled' : 'disabled'}: ${policy.name} (${policyId}) by ${updatedBy}`);
    
    return policy;
  }

  /**
   * 정책에 규칙을 추가합니다.
   */
  async addRuleToPolicy(
    policyId: string,
    rule: SecurityRule,
    addedBy: string
  ): Promise<SecurityPolicy> {
    const policy = this.policies.get(policyId);
    
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    policy.rules.push(rule);
    policy.updatedAt = new Date();

    this.policies.set(policyId, policy);
    this.logger.log(`Rule added to policy: ${policy.name} (${policyId}) by ${addedBy}`);
    
    return policy;
  }

  /**
   * 정책에서 규칙을 제거합니다.
   */
  async removeRuleFromPolicy(
    policyId: string,
    ruleId: string,
    removedBy: string
  ): Promise<SecurityPolicy> {
    const policy = this.policies.get(policyId);
    
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const initialRuleCount = policy.rules.length;
    policy.rules = policy.rules.filter(rule => rule.id !== ruleId);
    
    if (policy.rules.length === initialRuleCount) {
      throw new Error(`Rule not found: ${ruleId} in policy ${policyId}`);
    }

    policy.updatedAt = new Date();
    this.policies.set(policyId, policy);
    this.logger.log(`Rule removed from policy: ${policy.name} (${policyId}) by ${removedBy}`);
    
    return policy;
  }

  /**
   * 정책 규칙을 업데이트합니다.
   */
  async updateRuleInPolicy(
    policyId: string,
    ruleId: string,
    updates: Partial<Omit<SecurityRule, 'id'>>,
    updatedBy: string
  ): Promise<SecurityPolicy> {
    const policy = this.policies.get(policyId);
    
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const ruleIndex = policy.rules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex === -1) {
      throw new Error(`Rule not found: ${ruleId} in policy ${policyId}`);
    }

    const originalRule = policy.rules[ruleIndex]!; // ruleIndex가 -1이 아니므로 항상 존재
    const updatedRule: SecurityRule = {
      id: originalRule.id,
      name: updates.name ?? originalRule.name,
      type: updates.type ?? originalRule.type,
      enabled: updates.enabled ?? originalRule.enabled,
      conditions: updates.conditions ?? originalRule.conditions,
      actions: updates.actions ?? originalRule.actions,
      metadata: updates.metadata ?? originalRule.metadata
    };

    policy.rules[ruleIndex] = updatedRule;
    policy.updatedAt = new Date();
    this.policies.set(policyId, policy);
    this.logger.log(`Rule updated in policy: ${policy.name} (${policyId}) by ${updatedBy}`);
    
    return policy;
  }

  /**
   * 정책 템플릿을 생성합니다.
   */
  createPolicyTemplate(
    name: string,
    description: string,
    rules: SecurityRule[]
  ): SecurityPolicy {
    const template: SecurityPolicy = {
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      enabled: false,
      priority: 'medium',
      rules,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };

    this.policyTemplates.set(template.id, template);
    this.logger.log(`Policy template created: ${name} (${template.id})`);
    
    return template;
  }

  /**
   * 템플릿에서 정책을 생성합니다.
   */
  async createPolicyFromTemplate(
    templateId: string,
    name: string,
    description: string,
    priority: 'low' | 'medium' | 'high' | 'critical',
    createdBy: string
  ): Promise<SecurityPolicy> {
    const template = this.policyTemplates.get(templateId);
    
    if (!template) {
      throw new Error(`Policy template not found: ${templateId}`);
    }

    const policy: SecurityPolicy = {
      id: `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      enabled: true,
      priority,
      rules: JSON.parse(JSON.stringify(template.rules)), // Deep copy
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy
    };

    this.policies.set(policy.id, policy);
    this.logger.log(`Policy created from template: ${name} (${policy.id}) by ${createdBy}`);
    
    return policy;
  }

  /**
   * 정책을 테스트합니다.
   */
  async testPolicy(
    policyId: string,
    testContext: PolicyContext,
    testCommand?: string,
    testFilePath?: string
  ): Promise<{
    policy: SecurityPolicy;
    violations: PolicyViolation[];
    warnings: PolicyViolation[];
    isValid: boolean;
  }> {
    const policy = this.policies.get(policyId);
    
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const violations: PolicyViolation[] = [];
    const warnings: PolicyViolation[] = [];

    // 각 규칙을 테스트
    for (const rule of policy.rules) {
      if (!rule.enabled) continue;

      try {
        const ruleViolations = await this.evaluateRule(rule, testContext, testCommand, testFilePath);
        
        for (const violation of ruleViolations) {
          if (violation.severity === 'low') {
            warnings.push(violation);
          } else {
            violations.push(violation);
          }
        }
      } catch (error) {
        this.logger.error(`Error testing rule ${rule.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        warnings.push({
          id: `test-error-${Date.now()}`,
          policyId: policy.id,
          ruleId: rule.id,
          severity: 'low',
          message: `Rule test error: ${errorMessage}`,
          context: testContext,
          timestamp: new Date(),
          resolved: false
        });
      }
    }

    return {
      policy,
      violations,
      warnings,
      isValid: violations.length === 0
    };
  }

  /**
   * 정책 규칙을 평가합니다.
   */
  private async evaluateRule(
    rule: SecurityRule,
    context: PolicyContext,
    command?: string,
    filePath?: string
  ): Promise<PolicyViolation[]> {
    const violations: PolicyViolation[] = [];

    // 규칙 조건 평가
    const conditionsMet = this.evaluateConditions(rule.conditions, context, command, filePath);
    
    if (conditionsMet) {
      // 조건이 충족되면 액션 실행
      for (const action of rule.actions) {
        const violation = await this.executeAction(action, rule, context);
        if (violation) {
          violations.push(violation);
        }
      }
    }

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
    return conditions.every(condition => {
      const fieldValue = this.getFieldValue(condition.field, context, command, filePath);
      return this.evaluateCondition(condition, fieldValue);
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
      case 'warn':
        return this.createViolation(action, rule, context, 'Policy warning issued');
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
   * 기본 정책들을 초기화합니다.
   */
  private initializeDefaultPolicies(): void {
    // 기본 보안 정책
    const defaultSecurityPolicy = this.createPolicyTemplate(
      'Default Security Policy',
      '기본 보안 정책 - 위험한 명령어 및 경로 제한',
      [
        {
          id: 'rule-001',
          name: 'Dangerous Commands Filter',
          type: 'command_filter',
          enabled: true,
          conditions: [
            {
              field: 'command',
              operator: 'contains',
              value: 'rm -rf',
              caseSensitive: false
            }
          ],
          actions: [
            {
              type: 'block',
              severity: 'critical',
              message: 'Dangerous command detected'
            }
          ]
        },
        {
          id: 'rule-002',
          name: 'System Path Restriction',
          type: 'path_restriction',
          enabled: true,
          conditions: [
            {
              field: 'filePath',
              operator: 'contains',
              value: '/etc/',
              caseSensitive: false
            }
          ],
          actions: [
            {
              type: 'block',
              severity: 'high',
              message: 'Restricted system path access'
            }
          ]
        }
      ]
    );

    this.logger.log('Default policies initialized');
  }

  /**
   * 모든 정책을 반환합니다.
   */
  getAllPolicies(): SecurityPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * 특정 정책을 반환합니다.
   */
  getPolicy(policyId: string): SecurityPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * 활성화된 정책들을 반환합니다.
   */
  getActivePolicies(): SecurityPolicy[] {
    return Array.from(this.policies.values()).filter(policy => policy.enabled);
  }

  /**
   * 우선순위별 정책들을 반환합니다.
   */
  getPoliciesByPriority(priority: 'low' | 'medium' | 'high' | 'critical'): SecurityPolicy[] {
    return Array.from(this.policies.values()).filter(policy => policy.priority === priority);
  }

  /**
   * 정책 템플릿들을 반환합니다.
   */
  getPolicyTemplates(): SecurityPolicy[] {
    return Array.from(this.policyTemplates.values());
  }

  /**
   * 정책 통계를 반환합니다.
   */
  getPolicyStats(): {
    total: number;
    active: number;
    disabled: number;
    byPriority: Record<string, number>;
  } {
    const policies = Array.from(this.policies.values());
    
    const byPriority = {
      low: policies.filter(p => p.priority === 'low').length,
      medium: policies.filter(p => p.priority === 'medium').length,
      high: policies.filter(p => p.priority === 'high').length,
      critical: policies.filter(p => p.priority === 'critical').length
    };

    return {
      total: policies.length,
      active: policies.filter(p => p.enabled).length,
      disabled: policies.filter(p => !p.enabled).length,
      byPriority
    };
  }
}
