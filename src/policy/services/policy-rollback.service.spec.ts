import { Test, TestingModule } from '@nestjs/testing';
import { SecurityPolicy } from '../policy.types';
import { PolicyCacheService } from './policy-cache.service';
import { PolicyRollbackService } from './policy-rollback.service';
import { PolicyVersionService } from './policy-version.service';

describe('PolicyRollbackService', () => {
  let service: PolicyRollbackService;
  let versionService: PolicyVersionService;
  let cacheService: PolicyCacheService;
  let mockPolicy: SecurityPolicy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyRollbackService,
        PolicyVersionService,
        PolicyCacheService,
      ],
    }).compile();

    service = module.get<PolicyRollbackService>(PolicyRollbackService);
    versionService = module.get<PolicyVersionService>(PolicyVersionService);
    cacheService = module.get<PolicyCacheService>(PolicyCacheService);

    // 테스트용 모의 정책
    mockPolicy = {
      id: 'test-policy-1',
      name: 'Test Policy',
      description: 'Test policy for testing',
      enabled: true,
      priority: 'medium',
      rules: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user',
    };
  });

  afterEach(() => {
    // 각 테스트 후 정리
    versionService.deleteAllVersions(mockPolicy.id);
    cacheService.invalidateAllPolicyCache();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Rollback Request Creation', () => {
    it('should create rollback request', () => {
      // 정책 버전 생성
      versionService.createVersion(mockPolicy, 'test-user', 'Initial');
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      versionService.createVersion(updatedPolicy, 'test-user', 'Update');

      const rollbackRequest = service.createRollbackRequest(
        mockPolicy.id,
        1,
        'Need to rollback due to issues',
        'admin-user'
      );

      expect(rollbackRequest).toBeDefined();
      expect(rollbackRequest.policyId).toBe(mockPolicy.id);
      expect(rollbackRequest.targetVersion).toBe(1);
      expect(rollbackRequest.reason).toBe('Need to rollback due to issues');
      expect(rollbackRequest.requestedBy).toBe('admin-user');
      expect(rollbackRequest.status).toBe('pending');
    });

    it('should throw error for non-existent version', () => {
      expect(() => {
        service.createRollbackRequest(
          mockPolicy.id,
          999,
          'Invalid version',
          'admin-user'
        );
      }).toThrow('Version 999 not found for policy test-policy-1');
    });

    it('should throw error for current version rollback', () => {
      // 정책 버전 생성
      versionService.createVersion(mockPolicy, 'test-user', 'Initial');

      expect(() => {
        service.createRollbackRequest(
          mockPolicy.id,
          1,
          'Cannot rollback to current',
          'admin-user'
        );
      }).toThrow('Cannot rollback to current version 1');
    });
  });

  describe('Rollback Request Approval', () => {
    it('should approve rollback request', () => {
      // 정책 버전 생성
      versionService.createVersion(mockPolicy, 'test-user', 'Initial');
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      versionService.createVersion(updatedPolicy, 'test-user', 'Update');

      // 롤백 요청 생성
      const rollbackRequest = service.createRollbackRequest(
        mockPolicy.id,
        1,
        'Need to rollback',
        'admin-user'
      );

      // 롤백 요청 승인
      const approvedRequest = service.approveRollbackRequest(
        rollbackRequest.id,
        'approver-user'
      );

      expect(approvedRequest.status).toBe('approved');
      expect(approvedRequest.approvedBy).toBe('approver-user');
      expect(approvedRequest.approvedAt).toBeDefined();
    });

    it('should throw error for non-existent rollback request', () => {
      expect(() => {
        service.approveRollbackRequest('non-existent', 'approver-user');
      }).toThrow('Rollback request non-existent not found');
    });

    it('should throw error for non-pending rollback request', () => {
      // 정책 버전 생성
      versionService.createVersion(mockPolicy, 'test-user', 'Initial');
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      versionService.createVersion(updatedPolicy, 'test-user', 'Update');

      // 롤백 요청 생성 및 승인
      const rollbackRequest = service.createRollbackRequest(
        mockPolicy.id,
        1,
        'Need to rollback',
        'admin-user'
      );
      service.approveRollbackRequest(rollbackRequest.id, 'approver-user');

      // 이미 승인된 요청을 다시 승인하려고 시도
      expect(() => {
        service.approveRollbackRequest(rollbackRequest.id, 'another-approver');
      }).toThrow('Rollback request rollback_1 is not pending');
    });
  });

  describe('Rollback Request Rejection', () => {
    it('should reject rollback request', () => {
      // 정책 버전 생성
      versionService.createVersion(mockPolicy, 'test-user', 'Initial');
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      versionService.createVersion(updatedPolicy, 'test-user', 'Update');

      // 롤백 요청 생성
      const rollbackRequest = service.createRollbackRequest(
        mockPolicy.id,
        1,
        'Need to rollback',
        'admin-user'
      );

      // 롤백 요청 거부
      const rejectedRequest = service.rejectRollbackRequest(
        rollbackRequest.id,
        'rejector-user',
        'Not needed'
      );

      expect(rejectedRequest.status).toBe('rejected');
      expect(rejectedRequest.metadata?.rejectionReason).toBe('Not needed');
    });

    it('should throw error for non-existent rollback request', () => {
      expect(() => {
        service.rejectRollbackRequest('non-existent', 'rejector-user', 'Not needed');
      }).toThrow('Rollback request non-existent not found');
    });
  });

  describe('Rollback Execution', () => {
    it('should execute approved rollback', () => {
      // 정책 버전 생성
      versionService.createVersion(mockPolicy, 'test-user', 'Initial');
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      versionService.createVersion(updatedPolicy, 'test-user', 'Update');

      // 롤백 요청 생성 및 승인
      const rollbackRequest = service.createRollbackRequest(
        mockPolicy.id,
        1,
        'Need to rollback',
        'admin-user'
      );
      service.approveRollbackRequest(rollbackRequest.id, 'approver-user');

      // 롤백 실행
      const rollbackResult = service.executeRollback(rollbackRequest.id);

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.policyId).toBe(mockPolicy.id);
      expect(rollbackResult.fromVersion).toBe(2);
      expect(rollbackResult.toVersion).toBe(1);
      expect(rollbackResult.restoredPolicy.name).toBe('Test Policy');
      expect(rollbackResult.rollbackId).toBe(rollbackRequest.id);

      // 롤백 요청 상태가 완료로 변경되었는지 확인
      const completedRequest = service.getRollbackRequest(rollbackRequest.id);
      expect(completedRequest?.status).toBe('completed');
    });

    it('should throw error for non-approved rollback request', () => {
      // 정책 버전 생성
      versionService.createVersion(mockPolicy, 'test-user', 'Initial');
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      versionService.createVersion(updatedPolicy, 'test-user', 'Update');

      // 롤백 요청 생성 (승인하지 않음)
      const rollbackRequest = service.createRollbackRequest(
        mockPolicy.id,
        1,
        'Need to rollback',
        'admin-user'
      );

      // 승인되지 않은 롤백 실행 시도
      expect(() => {
        service.executeRollback(rollbackRequest.id);
      }).toThrow('Rollback request rollback_1 is not approved');
    });

    it('should handle rollback execution failure', () => {
      // 정책 버전 생성
      versionService.createVersion(mockPolicy, 'test-user', 'Initial');
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      versionService.createVersion(updatedPolicy, 'test-user', 'Update');

      // 롤백 요청 생성 및 승인
      const rollbackRequest = service.createRollbackRequest(
        mockPolicy.id,
        1,
        'Need to rollback',
        'admin-user'
      );
      service.approveRollbackRequest(rollbackRequest.id, 'approver-user');

      // 버전 서비스에서 정책을 삭제하여 롤백 실패 시뮬레이션
      versionService.deleteAllVersions(mockPolicy.id);

      // 롤백 실행 시도 (실패해야 함)
      expect(() => {
        service.executeRollback(rollbackRequest.id);
      }).toThrow('Rollback execution failed: Current version not found for policy test-policy-1');

      // 롤백 요청 상태가 실패로 변경되었는지 확인
      const failedRequest = service.getRollbackRequest(rollbackRequest.id);
      expect(failedRequest?.status).toBe('failed');
      expect(failedRequest?.errorMessage).toBeDefined();
    });
  });

  describe('Rollback Request Retrieval', () => {
    it('should retrieve rollback request by ID', () => {
      // 정책 버전 생성
      versionService.createVersion(mockPolicy, 'test-user', 'Initial');
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      versionService.createVersion(updatedPolicy, 'test-user', 'Update');

      // 롤백 요청 생성
      const rollbackRequest = service.createRollbackRequest(
        mockPolicy.id,
        1,
        'Need to rollback',
        'admin-user'
      );

      // 롤백 요청 조회
      const retrievedRequest = service.getRollbackRequest(rollbackRequest.id);

      expect(retrievedRequest).toBeDefined();
      expect(retrievedRequest?.id).toBe(rollbackRequest.id);
      expect(retrievedRequest?.policyId).toBe(mockPolicy.id);
    });

    it('should return null for non-existent rollback request', () => {
      const retrievedRequest = service.getRollbackRequest('non-existent');
      expect(retrievedRequest).toBeNull();
    });

    it('should retrieve rollback requests by policy', () => {
      // 정책 버전 생성
      versionService.createVersion(mockPolicy, 'test-user', 'Initial');
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      versionService.createVersion(updatedPolicy, 'test-user', 'Update');

      // 여러 롤백 요청 생성
      service.createRollbackRequest(mockPolicy.id, 1, 'First rollback', 'admin-user');
      service.createRollbackRequest(mockPolicy.id, 1, 'Second rollback', 'admin-user');

      const rollbackRequests = service.getRollbackRequestsByPolicy(mockPolicy.id);

      expect(rollbackRequests).toHaveLength(2);
      
      expect(rollbackRequests[0]?.policyId).toBe(mockPolicy.id);
      expect(rollbackRequests[1]?.policyId).toBe(mockPolicy.id);
    });

    it('should retrieve all rollback requests', () => {
      // 정책 버전 생성
      versionService.createVersion(mockPolicy, 'test-user', 'Initial');
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      versionService.createVersion(updatedPolicy, 'test-user', 'Update');

      // 롤백 요청 생성
      service.createRollbackRequest(mockPolicy.id, 1, 'Need to rollback', 'admin-user');

      const allRequests = service.getAllRollbackRequests();

      expect(allRequests).toHaveLength(1);
      expect(allRequests[0]?.policyId).toBe(mockPolicy.id);
    });
  });

  describe('Rollback History', () => {
    it('should retrieve rollback history for policy', () => {
      // 정책 버전 생성
      versionService.createVersion(mockPolicy, 'test-user', 'Initial');
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      versionService.createVersion(updatedPolicy, 'test-user', 'Update');

      // 롤백 요청 생성, 승인, 실행
      const rollbackRequest = service.createRollbackRequest(
        mockPolicy.id,
        1,
        'Need to rollback',
        'admin-user'
      );
      service.approveRollbackRequest(rollbackRequest.id, 'approver-user');
      service.executeRollback(rollbackRequest.id);

      const rollbackHistory = service.getRollbackHistory(mockPolicy.id);

      expect(rollbackHistory).toHaveLength(1);
      expect(rollbackHistory[0]?.policyId).toBe(mockPolicy.id);
      expect(rollbackHistory[0]?.success).toBe(true);
    });

    it('should retrieve all rollback history', () => {
      // 정책 버전 생성
      versionService.createVersion(mockPolicy, 'test-user', 'Initial');
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      versionService.createVersion(updatedPolicy, 'test-user', 'Update');

      // 롤백 요청 생성, 승인, 실행
      const rollbackRequest = service.createRollbackRequest(
        mockPolicy.id,
        1,
        'Need to rollback',
        'admin-user'
      );
      service.approveRollbackRequest(rollbackRequest.id, 'approver-user');
      service.executeRollback(rollbackRequest.id);

      const allHistory = service.getAllRollbackHistory();

      expect(allHistory).toHaveLength(1);
      expect(allHistory[0]?.policyId).toBe(mockPolicy.id);
      expect(allHistory[0]?.totalRollbacks).toBe(1);
    });
  });

  describe('Rollback Statistics', () => {
    it('should provide rollback statistics', () => {
      // 정책 버전 생성
      versionService.createVersion(mockPolicy, 'test-user', 'Initial');
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      versionService.createVersion(updatedPolicy, 'test-user', 'Update');

      // 롤백 요청 생성
      service.createRollbackRequest(mockPolicy.id, 1, 'Need to rollback', 'admin-user');

      const stats = service.getRollbackStats();

      expect(stats.totalRequests).toBe(1);
      expect(stats.pendingRequests).toBe(1);
      expect(stats.approvedRequests).toBe(0);
      expect(stats.completedRollbacks).toBe(0);
      expect(stats.failedRollbacks).toBe(0);
      expect(stats.totalPoliciesWithRollbacks).toBe(0);
    });
  });

  describe('Rollbackable Versions', () => {
    it('should provide rollbackable versions', () => {
      // 정책 버전 생성
      versionService.createVersion(mockPolicy, 'test-user', 'Initial');
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      versionService.createVersion(updatedPolicy, 'test-user', 'Update');

      const rollbackableVersions = service.getRollbackableVersions(mockPolicy.id);

      expect(rollbackableVersions).toHaveLength(1);
      expect(rollbackableVersions[0]?.version).toBe(1);
      expect(rollbackableVersions[0]?.createdBy).toBe('test-user');
      expect(rollbackableVersions[0]?.changeReason).toBe('Initial');
    });

    it('should exclude current version from rollbackable versions', () => {
      // 정책 버전 생성
      versionService.createVersion(mockPolicy, 'test-user', 'Initial');

      const rollbackableVersions = service.getRollbackableVersions(mockPolicy.id);

      expect(rollbackableVersions).toHaveLength(0);
    });
  });

  describe('Rollback Request Deletion', () => {
    it('should delete rollback request', () => {
      // 정책 버전 생성
      versionService.createVersion(mockPolicy, 'test-user', 'Initial');
      const updatedPolicy = { ...mockPolicy, name: 'Updated Policy' };
      versionService.createVersion(updatedPolicy, 'test-user', 'Update');

      // 롤백 요청 생성
      const rollbackRequest = service.createRollbackRequest(
        mockPolicy.id,
        1,
        'Need to rollback',
        'admin-user'
      );

      // 롤백 요청 삭제
      const deleted = service.deleteRollbackRequest(rollbackRequest.id);

      expect(deleted).toBe(true);

      // 삭제된 롤백 요청은 더 이상 조회되지 않아야 함
      const retrievedRequest = service.getRollbackRequest(rollbackRequest.id);
      expect(retrievedRequest).toBeNull();
    });
  });
});
