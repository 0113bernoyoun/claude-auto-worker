import { Test, TestingModule } from '@nestjs/testing';
import { PolicyManagementService } from './policy-management.service';
import {
    PolicyContext,
    SecurityPolicy,
    SecurityRule
} from './policy.types';

describe('PolicyManagementService', () => {
  let service: PolicyManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PolicyManagementService],
    }).compile();

    service = module.get<PolicyManagementService>(PolicyManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('정책 생성 및 관리', () => {
    it('새로운 보안 정책을 생성할 수 있어야 한다', async () => {
      const rules: SecurityRule[] = [
        {
          id: 'rule-1',
          name: 'Test Rule',
          type: 'command_filter',
          enabled: true,
          conditions: [
            {
              field: 'command',
              operator: 'contains',
              value: 'test',
              caseSensitive: false
            }
          ],
          actions: [
            {
              type: 'warn',
              severity: 'medium',
              message: 'Test command detected'
            }
          ]
        }
      ];

      const policy = await service.createPolicy(
        'Test Policy',
        'Test policy description',
        'medium',
        rules,
        'test-user'
      );

      expect(policy.id).toBeDefined();
      expect(policy.name).toBe('Test Policy');
      expect(policy.description).toBe('Test policy description');
      expect(policy.priority).toBe('medium');
      expect(policy.enabled).toBe(true);
      expect(policy.rules).toHaveLength(1);
      expect(policy.createdBy).toBe('test-user');
      expect(policy.createdAt).toBeDefined();
      expect(policy.updatedAt).toBeDefined();
    });

    it('기존 정책을 업데이트할 수 있어야 한다', async () => {
      const rules: SecurityRule[] = [];
      
      const policy = await service.createPolicy(
        'Original Policy',
        'Original description',
        'low',
        rules,
        'test-user'
      );

      const updatedPolicy = await service.updatePolicy(
        policy.id,
        {
          name: 'Updated Policy',
          description: 'Updated description',
          priority: 'high'
        },
        'update-user'
      );

      expect(updatedPolicy.name).toBe('Updated Policy');
      expect(updatedPolicy.description).toBe('Updated description');
      expect(updatedPolicy.priority).toBe('high');
      // 타임스탬프가 업데이트되었는지 확인
      expect(updatedPolicy.updatedAt.getTime()).toBeGreaterThanOrEqual(policy.updatedAt.getTime());
    });

    it('정책을 삭제할 수 있어야 한다', async () => {
      const rules: SecurityRule[] = [];
      
      const policy = await service.createPolicy(
        'Delete Policy',
        'Policy to delete',
        'low',
        rules,
        'test-user'
      );

      const deleted = await service.deletePolicy(policy.id, 'delete-user');
      expect(deleted).toBe(true);

      const policies = service.getAllPolicies();
      expect(policies.find(p => p.id === policy.id)).toBeUndefined();
    });

    it('존재하지 않는 정책 삭제 시 false를 반환해야 한다', async () => {
      const deleted = await service.deletePolicy('non-existent-id', 'delete-user');
      expect(deleted).toBe(false);
    });
  });

  describe('정책 활성화/비활성화', () => {
    it('정책을 활성화할 수 있어야 한다', async () => {
      const rules: SecurityRule[] = [];
      
      const policy = await service.createPolicy(
        'Toggle Policy',
        'Policy to toggle',
        'medium',
        rules,
        'test-user'
      );

      // 먼저 비활성화
      await service.togglePolicy(policy.id, false, 'toggle-user');
      let updatedPolicy = service.getPolicy(policy.id);
      expect(updatedPolicy?.enabled).toBe(false);

      // 다시 활성화
      updatedPolicy = await service.togglePolicy(policy.id, true, 'toggle-user');
      expect(updatedPolicy.enabled).toBe(true);
    });

    it('존재하지 않는 정책 토글 시 에러를 반환해야 한다', async () => {
      await expect(
        service.togglePolicy('non-existent-id', true, 'toggle-user')
      ).rejects.toThrow('Policy not found');
    });
  });

  describe('정책 규칙 관리', () => {
    let testPolicy: SecurityPolicy;

    beforeEach(async () => {
      const rules: SecurityRule[] = [];
      testPolicy = await service.createPolicy(
        'Rule Test Policy',
        'Policy for testing rules',
        'medium',
        rules,
        'test-user'
      );
    });

    it('정책에 규칙을 추가할 수 있어야 한다', async () => {
      const newRule: SecurityRule = {
        id: 'new-rule',
        name: 'New Rule',
        type: 'command_filter',
        enabled: true,
        conditions: [
          {
            field: 'command',
            operator: 'contains',
            value: 'new',
            caseSensitive: false
          }
        ],
        actions: [
          {
            type: 'block',
            severity: 'high',
            message: 'New command blocked'
          }
        ]
      };

      const updatedPolicy = await service.addRuleToPolicy(
        testPolicy.id,
        newRule,
        'rule-user'
      );

      expect(updatedPolicy.rules).toHaveLength(1);
      expect(updatedPolicy.rules[0]?.id).toBe('new-rule');
      // 타임스탬프가 업데이트되었는지 확인
      expect(updatedPolicy.updatedAt.getTime()).toBeGreaterThanOrEqual(testPolicy.updatedAt.getTime());
    });

    it('정책에서 규칙을 제거할 수 있어야 한다', async () => {
      const rule: SecurityRule = {
        id: 'remove-rule',
        name: 'Rule to Remove',
        type: 'command_filter',
        enabled: true,
        conditions: [],
        actions: []
      };

      await service.addRuleToPolicy(testPolicy.id, rule, 'rule-user');
      expect(service.getPolicy(testPolicy.id)?.rules).toHaveLength(1);

      const updatedPolicy = await service.removeRuleFromPolicy(
        testPolicy.id,
        'remove-rule',
        'rule-user'
      );

      expect(updatedPolicy.rules).toHaveLength(0);
    });

    it('존재하지 않는 규칙 제거 시 에러를 반환해야 한다', async () => {
      await expect(
        service.removeRuleFromPolicy(
          testPolicy.id,
          'non-existent-rule',
          'rule-user'
        )
      ).rejects.toThrow('Rule not found');
    });

    it('정책 규칙을 업데이트할 수 있어야 한다', async () => {
      const rule: SecurityRule = {
        id: 'update-rule',
        name: 'Rule to Update',
        type: 'command_filter',
        enabled: true,
        conditions: [],
        actions: []
      };

      await service.addRuleToPolicy(testPolicy.id, rule, 'rule-user');

      const updatedPolicy = await service.updateRuleInPolicy(
        testPolicy.id,
        'update-rule',
        {
          name: 'Updated Rule Name',
          enabled: false
        },
        'rule-user'
      );

      const updatedRule = updatedPolicy.rules.find(r => r.id === 'update-rule');
      expect(updatedRule?.name).toBe('Updated Rule Name');
      expect(updatedRule?.enabled).toBe(false);
    });
  });

  describe('정책 템플릿', () => {
    it('정책 템플릿을 생성할 수 있어야 한다', () => {
      const rules: SecurityRule[] = [
        {
          id: 'template-rule',
          name: 'Template Rule',
          type: 'command_filter',
          enabled: true,
          conditions: [],
          actions: []
        }
      ];

      const template = service.createPolicyTemplate(
        'Test Template',
        'Template description',
        rules
      );

      expect(template.id).toContain('template-');
      expect(template.name).toBe('Test Template');
      expect(template.enabled).toBe(false);
      expect(template.rules).toHaveLength(1);
    });

    it('템플릿에서 정책을 생성할 수 있어야 한다', async () => {
      const rules: SecurityRule[] = [
        {
          id: 'template-rule',
          name: 'Template Rule',
          type: 'command_filter',
          enabled: true,
          conditions: [],
          actions: []
        }
      ];

      const template = service.createPolicyTemplate(
        'Test Template',
        'Template description',
        rules
      );

      const policy = await service.createPolicyFromTemplate(
        template.id,
        'Policy from Template',
        'Policy created from template',
        'high',
        'template-user'
      );

      expect(policy.name).toBe('Policy from Template');
      expect(policy.description).toBe('Policy created from template');
      expect(policy.priority).toBe('high');
      expect(policy.enabled).toBe(true);
      expect(policy.rules).toHaveLength(1);
      expect(policy.rules[0]?.id).toBe('template-rule');
    });

    it('존재하지 않는 템플릿에서 정책 생성 시 에러를 반환해야 한다', async () => {
      await expect(
        service.createPolicyFromTemplate(
          'non-existent-template',
          'Policy Name',
          'Policy description',
          'medium',
          'template-user'
        )
      ).rejects.toThrow('Policy template not found');
    });
  });

  describe('정책 테스트', () => {
    let testPolicy: SecurityPolicy;

    beforeEach(async () => {
      const rules: SecurityRule[] = [
        {
          id: 'test-rule',
          name: 'Test Rule',
          type: 'command_filter',
          enabled: true,
          conditions: [
            {
              field: 'command',
              operator: 'contains',
              value: 'dangerous',
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
        }
      ];

      testPolicy = await service.createPolicy(
        'Test Policy',
        'Policy for testing',
        'high',
        rules,
        'test-user'
      );
    });

    it('정책을 테스트할 수 있어야 한다', async () => {
      const testContext: PolicyContext = {
        workflowId: 'test-workflow',
        stepId: 'test-step',
        userId: 'test-user'
      };

      const result = await service.testPolicy(
        testPolicy.id,
        testContext,
        'echo "dangerous command"',
        undefined
      );

      expect(result.policy.id).toBe(testPolicy.id);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.isValid).toBe(false);
    });

    it('안전한 명령어 테스트 시 위반이 없어야 한다', async () => {
      const testContext: PolicyContext = {
        workflowId: 'test-workflow',
        stepId: 'test-step',
        userId: 'test-user'
      };

      const result = await service.testPolicy(
        testPolicy.id,
        testContext,
        'echo "safe command"',
        undefined
      );

      expect(result.policy.id).toBe(testPolicy.id);
      expect(result.violations.length).toBe(0);
      expect(result.isValid).toBe(true);
    });

    it('존재하지 않는 정책 테스트 시 에러를 반환해야 한다', async () => {
      const testContext: PolicyContext = {
        workflowId: 'test-workflow',
        stepId: 'test-step',
        userId: 'test-user'
      };

      await expect(
        service.testPolicy(
          'non-existent-policy',
          testContext,
          'echo "test"',
          undefined
        )
      ).rejects.toThrow('Policy not found');
    });
  });

  describe('조회 및 통계', () => {
    beforeEach(async () => {
      // 테스트 데이터 준비
      const rules: SecurityRule[] = [];
      
      await service.createPolicy('Policy 1', 'Description 1', 'low', rules, 'user-1');
      await service.createPolicy('Policy 2', 'Description 2', 'medium', rules, 'user-2');
      await service.createPolicy('Policy 3', 'Description 3', 'high', rules, 'user-3');
    });

    it('모든 정책을 조회할 수 있어야 한다', () => {
      const policies = service.getAllPolicies();
      expect(policies.length).toBeGreaterThanOrEqual(3);
    });

    it('특정 정책을 조회할 수 있어야 한다', () => {
      const policies = service.getAllPolicies();
      const firstPolicy = policies[0];
      
      if (firstPolicy) {
        const foundPolicy = service.getPolicy(firstPolicy.id);
        expect(foundPolicy?.id).toBe(firstPolicy.id);
      }
    });

    it('존재하지 않는 정책 조회 시 undefined를 반환해야 한다', () => {
      const policy = service.getPolicy('non-existent-id');
      expect(policy).toBeUndefined();
    });

    it('활성화된 정책들을 조회할 수 있어야 한다', () => {
      const activePolicies = service.getActivePolicies();
      expect(activePolicies.length).toBeGreaterThan(0);
      expect(activePolicies.every(p => p.enabled)).toBe(true);
    });

    it('우선순위별 정책들을 조회할 수 있어야 한다', () => {
      const highPolicies = service.getPoliciesByPriority('high');
      expect(highPolicies.length).toBeGreaterThan(0);
      expect(highPolicies.every(p => p.priority === 'high')).toBe(true);
    });

    it('정책 템플릿들을 조회할 수 있어야 한다', () => {
      const templates = service.getPolicyTemplates();
      expect(Array.isArray(templates)).toBe(true);
    });

    it('정책 통계를 반환해야 한다', () => {
      const stats = service.getPolicyStats();
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('disabled');
      expect(stats).toHaveProperty('byPriority');
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.disabled).toBe('number');
      expect(stats.byPriority).toHaveProperty('low');
      expect(stats.byPriority).toHaveProperty('medium');
      expect(stats.byPriority).toHaveProperty('high');
      expect(stats.byPriority).toHaveProperty('critical');
    });
  });

  describe('기본 정책 초기화', () => {
    it('기본 정책들이 초기화되어야 한다', () => {
      const templates = service.getPolicyTemplates();
      expect(templates.length).toBeGreaterThan(0);
      
      const defaultTemplate = templates.find(t => t.name === 'Default Security Policy');
      expect(defaultTemplate).toBeDefined();
      expect(defaultTemplate?.rules.length).toBeGreaterThan(0);
    });
  });
});
