import { Test, TestingModule } from '@nestjs/testing';
import { PolicyEngineService } from './policy-engine.service';
import {
    PolicyContext,
    SecurityPolicy
} from './policy.types';

describe('PolicyEngineService', () => {
  let service: PolicyEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PolicyEngineService],
    }).compile();

    service = module.get<PolicyEngineService>(PolicyEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('정책 등록 및 관리', () => {
    it('정책을 등록할 수 있어야 한다', () => {
      // 기본 정책 제거
      service.unregisterPolicy('default-security-policy');
      
      const policy: SecurityPolicy = {
        id: 'test-policy-1',
        name: 'Test Policy',
        description: 'Test policy for testing',
        enabled: true,
        priority: 'medium',
        rules: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-user'
      };

      service.registerPolicy(policy);
      const policies = service.getPolicies();
      
      expect(policies).toHaveLength(1);
      expect(policies[0]?.id).toBe('test-policy-1');
    });

    it('정책을 제거할 수 있어야 한다', () => {
      // 기본 정책 제거
      service.unregisterPolicy('default-security-policy');
      
      const policy: SecurityPolicy = {
        id: 'test-policy-2',
        name: 'Test Policy 2',
        description: 'Test policy for testing',
        enabled: true,
        priority: 'medium',
        rules: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-user'
      };

      service.registerPolicy(policy);
      expect(service.getPolicies()).toHaveLength(1);

      const removed = service.unregisterPolicy('test-policy-2');
      expect(removed).toBe(true);
      expect(service.getPolicies()).toHaveLength(0);
    });
  });

  describe('워크플로우 실행 검증', () => {
    beforeEach(() => {
      // 기본 정책 제거
      service.unregisterPolicy('default-security-policy');
    });

    it('위험한 명령어를 차단해야 한다', async () => {
      // 테스트용 위험 명령어 차단 정책 등록
      const dangerousCommandPolicy: SecurityPolicy = {
        id: 'dangerous-command-policy',
        name: 'Dangerous Command Policy',
        description: 'Test policy for blocking dangerous commands',
        enabled: true,
        priority: 'high',
        rules: [
          {
            id: 'dangerous-cmd-rule',
            name: 'Dangerous Command Rule',
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
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-user'
      };
      service.registerPolicy(dangerousCommandPolicy);

      const context: PolicyContext = {
        workflowId: 'test-workflow',
        stepId: 'test-step',
        userId: 'test-user'
      };

      const result = await service.validateWorkflowExecution(
        context,
        'rm -rf /tmp/test',
        undefined
      );

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]?.message).toContain('Dangerous command detected');
    });

    it('제한된 경로 접근을 차단해야 한다', async () => {
      // 기본 정책 제거
      service.unregisterPolicy('default-security-policy');
      
      // 테스트용 경로 제한 정책 등록
      const pathRestrictionPolicy: SecurityPolicy = {
        id: 'path-restriction-policy',
        name: 'Path Restriction Policy',
        description: 'Test policy for restricting path access',
        enabled: true,
        priority: 'high',
        rules: [
          {
            id: 'path-restriction-rule',
            name: 'Path Restriction Rule',
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
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-user'
      };
      service.registerPolicy(pathRestrictionPolicy);

      const context: PolicyContext = {
        workflowId: 'test-workflow',
        stepId: 'test-step',
        userId: 'test-user'
      };

      const result = await service.validateWorkflowExecution(
        context,
        undefined,
        '/etc/passwd'
      );

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]?.message).toContain('Restricted path access');
    });

    it('민감한 데이터를 감지해야 한다', async () => {
      // 기본 정책 제거
      service.unregisterPolicy('default-security-policy');
      
      // 테스트용 민감 데이터 감지 정책 등록
      const sensitiveDataPolicy: SecurityPolicy = {
        id: 'sensitive-data-policy',
        name: 'Sensitive Data Policy',
        description: 'Test policy for detecting sensitive data',
        enabled: true,
        priority: 'high',
        rules: [
          {
            id: 'sensitive-data-rule',
            name: 'Sensitive Data Rule',
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
        createdBy: 'test-user'
      };
      service.registerPolicy(sensitiveDataPolicy);

      const context: PolicyContext = {
        workflowId: 'test-workflow',
        stepId: 'test-step',
        userId: 'test-user'
      };

      const result = await service.validateWorkflowExecution(
        context,
        'echo "api_key=secret123"',
        undefined
      );

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]?.message).toContain('Sensitive data detected');
    });

    it('안전한 명령어는 허용해야 한다', async () => {
      // 정책이 없으면 모든 명령어가 허용되어야 함
      const context: PolicyContext = {
        workflowId: 'test-workflow',
        stepId: 'test-step',
        userId: 'test-user'
      };

      const result = await service.validateWorkflowExecution(
        context,
        'ls -la',
        undefined
      );

      expect(result.isValid).toBe(true);
      expect(result.violations.length).toBe(0);
    });
  });

  describe('정책 규칙 평가', () => {
    it('사용자 정의 정책을 평가할 수 있어야 한다', async () => {
      // 기본 정책 제거
      service.unregisterPolicy('default-security-policy');
      
      const customPolicy: SecurityPolicy = {
        id: 'custom-policy',
        name: 'Custom Policy',
        description: 'Custom policy for testing',
        enabled: true,
        priority: 'high',
        rules: [
          {
            id: 'custom-rule',
            name: 'Custom Rule',
            type: 'custom', // 조건 기반 평가를 위한 타입
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
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-user'
      };

      service.registerPolicy(customPolicy);

      const context: PolicyContext = {
        workflowId: 'test-workflow',
        stepId: 'test-step',
        userId: 'test-user'
      };

      const result = await service.validateWorkflowExecution(
        context,
        'echo "test message"',
        undefined
      );

      // test 명령어가 포함되어 있고 조건에 맞으므로 경고가 발생해야 함
      // warn 액션이므로 isValid는 true여야 하고, warnings에 항목이 있어야 함
      expect(result.isValid).toBe(true);
      expect(result.violations.length).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]?.message).toContain('Test command detected');
    });
  });

  describe('에러 처리', () => {
    it('규칙 평가 오류를 적절히 처리해야 한다', async () => {
      // 기본 정책 제거
      service.unregisterPolicy('default-security-policy');
      
      const invalidPolicy: SecurityPolicy = {
        id: 'invalid-policy',
        name: 'Invalid Policy',
        description: 'Policy with invalid rule',
        enabled: true,
        priority: 'medium',
        rules: [
          {
            id: 'invalid-rule',
            name: 'Invalid Rule',
            type: 'command_filter',
            enabled: true,
            conditions: [],
            actions: [] // 액션이 없어서 에러 발생
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-user'
      };

      service.registerPolicy(invalidPolicy);

      const context: PolicyContext = {
        workflowId: 'test-workflow',
        stepId: 'test-step',
        userId: 'test-user'
      };

      const result = await service.validateWorkflowExecution(
        context,
        'ls -la',
        undefined
      );

      // 액션이 없는 규칙은 에러를 발생시켜야 함
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]?.message).toContain('Rule has no actions defined');
    });
  });
});
