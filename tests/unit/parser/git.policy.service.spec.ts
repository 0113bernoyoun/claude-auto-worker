import { Test, TestingModule } from '@nestjs/testing';
import { GitPolicyService } from '../../../src/parser/git.policy.service';
import { WorkflowPolicy } from '../../../src/parser/workflow.types';

describe('GitPolicyService', () => {
  let service: GitPolicyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GitPolicyService],
    }).compile();

    service = module.get<GitPolicyService>(GitPolicyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateBranchName', () => {
    it('should generate valid branch name', () => {
      const baseBranch = 'main';
      const workflowName = 'Test Workflow';
      const stepId = 'step-1';
      
      const result = service.generateBranchName(baseBranch, workflowName, stepId);
      
      expect(result).toMatch(/^main-test-workflow-step-1-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/);
    });

    it('should sanitize special characters', () => {
      const baseBranch = 'main';
      const workflowName = 'Test@Workflow#123';
      const stepId = 'step_1!';
      
      const result = service.generateBranchName(baseBranch, workflowName, stepId);
      
      expect(result).toMatch(/^main-test-workflow-123-step-1-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/);
    });

    it('should handle Korean characters', () => {
      const baseBranch = 'main';
      const workflowName = '테스트 워크플로우';
      const stepId = '단계-1';
      
      const result = service.generateBranchName(baseBranch, workflowName, stepId);
      
      expect(result).toMatch(/^main-테스트-워크플로우-단계-1-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/);
    });
  });

  describe('validateBranchName', () => {
    it('should validate valid branch name', () => {
      const branchName = 'feature/new-feature';
      const result = service.validateBranchName(branchName);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect empty branch name', () => {
      const result = service.validateBranchName('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Branch name cannot be empty');
    });

    it('should detect too long branch name', () => {
      const longName = 'a'.repeat(251);
      const result = service.validateBranchName(longName);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Branch name is too long (max 250 characters)');
    });

    it('should detect Git reserved names', () => {
      const result = service.validateBranchName('HEAD');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Branch name cannot be a Git reserved name: HEAD');
    });

    it('should detect dangerous patterns', () => {
      const dangerousPatterns = ['..', '~', '^', ':', '?', '*', '[', '\\'];
      
      for (const pattern of dangerousPatterns) {
        const branchName = `feature${pattern}test`;
        const result = service.validateBranchName(branchName);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(`Branch name contains invalid character: ${pattern}`);
      }
    });

    it('should detect spaces in branch name', () => {
      const result = service.validateBranchName('feature with spaces');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Branch name cannot contain spaces');
    });

    it('should detect control characters', () => {
      const result = service.validateBranchName('feature\x00test');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Branch name contains control characters');
    });
  });

  describe('validatePolicy', () => {
    it('should validate valid policy', () => {
      const policy: WorkflowPolicy = {
        retry: {
          max_attempts: 3,
          delay_ms: 1000,
          backoff_multiplier: 2
        },
        timeout: {
          seconds: 300
        },
        rollback: {
          enabled: true,
          steps: ['step1', 'step2']
        }
      };
      
      const result = service.validatePolicy(policy);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate retry policy', () => {
      const policy: WorkflowPolicy = {
        retry: {
          max_attempts: 0, // Invalid
          delay_ms: 1000
        }
      };
      
      const result = service.validatePolicy(policy);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Retry max_attempts must be between 1 and 100');
    });

    it('should validate timeout policy', () => {
      const policy: WorkflowPolicy = {
        timeout: {
          seconds: 0 // Invalid
        }
      };
      
      const result = service.validatePolicy(policy);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timeout seconds must be between 1 and 86400 (24 hours)');
    });

    it('should validate rollback policy', () => {
      const policy: WorkflowPolicy = {
        rollback: {
          enabled: true,
          steps: [''] // Invalid empty string
        }
      };
      
      const result = service.validatePolicy(policy);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Rollback step must be a non-empty string');
    });
  });

  describe('initializePolicy', () => {
    it('should initialize policy with defaults', () => {
      const partialPolicy: Partial<WorkflowPolicy> = {
        retry: {
          max_attempts: 5
        }
      };
      
      const result = service.initializePolicy(partialPolicy);
      
      expect(result.retry?.max_attempts).toBe(5);
      expect(result.retry?.delay_ms).toBe(1000); // Default
      expect(result.retry?.backoff_multiplier).toBe(2); // Default
      expect(result.timeout?.seconds).toBe(300); // Default
      expect(result.rollback?.enabled).toBe(false); // Default
    });

    it('should initialize empty policy with all defaults', () => {
      const result = service.initializePolicy();
      
      expect(result.retry?.max_attempts).toBe(3);
      expect(result.retry?.delay_ms).toBe(1000);
      expect(result.retry?.backoff_multiplier).toBe(2);
      expect(result.timeout?.seconds).toBe(300);
      expect(result.rollback?.enabled).toBe(false);
    });
  });

  describe('getActivePolicies', () => {
    it('should detect active policies', () => {
      const policy: WorkflowPolicy = {
        retry: {
          max_attempts: 3,
          delay_ms: 1000
        },
        timeout: {
          seconds: 300
        },
        rollback: {
          enabled: true,
          steps: []
        }
      };
      
      const result = service.getActivePolicies(policy);
      
      expect(result.hasRetry).toBe(true);
      expect(result.hasTimeout).toBe(true);
      expect(result.hasRollback).toBe(true);
    });

    it('should detect inactive policies', () => {
      const policy: WorkflowPolicy = {
        rollback: {
          enabled: false
        }
      };
      
      const result = service.getActivePolicies(policy);
      
      expect(result.hasRetry).toBe(false);
      expect(result.hasTimeout).toBe(false);
      expect(result.hasRollback).toBe(false);
    });
  });

  describe('formatPolicyDescription', () => {
    it('should format policy description', () => {
      const policy: WorkflowPolicy = {
        retry: {
          max_attempts: 3,
          delay_ms: 1000
        },
        timeout: {
          seconds: 300
        }
      };
      
      const result = service.formatPolicyDescription(policy);
      
      expect(result).toContain('재시도: 최대 3회, 대기 1000ms');
      expect(result).toContain('타임아웃: 300초');
    });

    it('should handle empty policy', () => {
      const result = service.formatPolicyDescription({});
      
      expect(result).toBe('기본 정책 사용');
    });
  });
});
