import { Test, TestingModule } from '@nestjs/testing';
import { PolicyValidationService } from './policy-validation.service';
import { PolicyContext } from './policy.types';

describe('PolicyValidationService', () => {
  let service: PolicyValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PolicyValidationService],
    }).compile();

    service = module.get<PolicyValidationService>(PolicyValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('승인 요청 관리', () => {
    it('워크플로우 변경사항에 대한 승인을 요청할 수 있어야 한다', async () => {
      const context: PolicyContext = {
        workflowId: 'test-workflow',
        stepId: 'test-step',
        userId: 'test-user'
      };

      const approval = await service.requestApproval(
        'test-policy',
        'test-workflow',
        'test-step',
        'test-user',
        { field: 'value' },
        24
      );

      expect(approval.id).toBeDefined();
      expect(approval.status).toBe('pending');
      expect(approval.requestedBy).toBe('test-user');
      expect(approval.workflowId).toBe('test-workflow');
      expect(approval.stepId).toBe('test-step');
    });

    it('승인 요청을 승인할 수 있어야 한다', async () => {
      const context: PolicyContext = {
        workflowId: 'test-workflow',
        stepId: 'test-step',
        userId: 'test-user'
      };

      const approval = await service.requestApproval(
        'test-policy',
        'test-workflow',
        'test-step',
        'test-user',
        { field: 'value' }
      );

      const approvedApproval = await service.approveRequest(
        approval.id,
        'approver-user',
        'Looks good'
      );

      expect(approvedApproval.status).toBe('approved');
      expect(approvedApproval.approvedBy).toBe('approver-user');
      expect(approvedApproval.approvedAt).toBeDefined();
    });

    it('승인 요청을 거부할 수 있어야 한다', async () => {
      const context: PolicyContext = {
        workflowId: 'test-workflow',
        stepId: 'test-step',
        userId: 'test-user'
      };

      const approval = await service.requestApproval(
        'test-policy',
        'test-workflow',
        'test-step',
        'test-user',
        { field: 'value' }
      );

      const rejectedApproval = await service.rejectRequest(
        approval.id,
        'rejecter-user',
        'Security concerns'
      );

      expect(rejectedApproval.status).toBe('rejected');
      expect(rejectedApproval.rejectedBy).toBe('rejecter-user');
      expect(rejectedApproval.reason).toBe('Security concerns');
      expect(rejectedApproval.rejectedAt).toBeDefined();
    });

    it('만료된 승인 요청을 처리할 수 있어야 한다', async () => {
      const context: PolicyContext = {
        workflowId: 'test-workflow',
        stepId: 'test-step',
        userId: 'test-user'
      };

      const approval = await service.requestApproval(
        'test-policy',
        'test-workflow',
        'test-step',
        'test-user',
        { field: 'value' },
        0.001 // 3.6초 후 만료
      );

      // 만료 대기
      await new Promise(resolve => setTimeout(resolve, 4000));

      const cleanedCount = await service.cleanupExpiredApprovals();
      expect(cleanedCount).toBeGreaterThan(0);

      const updatedApproval = service.getApprovalStatus(approval.id);
      expect(updatedApproval?.status).toBe('expired');
    });
  });

  describe('정책 변경 요청 관리', () => {
    it('정책 변경 요청을 생성할 수 있어야 한다', async () => {
      const changeRequest = await service.createChangeRequest(
        'test-policy',
        'update',
        { enabled: false },
        'test-user'
      );

      expect(changeRequest.id).toBeDefined();
      expect(changeRequest.type).toBe('update');
      expect(changeRequest.status).toBe('pending');
      expect(changeRequest.requestedBy).toBe('test-user');
    });

    it('정책 변경 요청을 승인할 수 있어야 한다', async () => {
      const changeRequest = await service.createChangeRequest(
        'test-policy',
        'update',
        { enabled: false },
        'test-user'
      );

      const approvedRequest = await service.approveChangeRequest(
        changeRequest.id,
        'approver-user',
        'Approved after review'
      );

      expect(approvedRequest.status).toBe('approved');
      expect(approvedRequest.approvedBy).toBe('approver-user');
      expect(approvedRequest.approvedAt).toBeDefined();
    });

    it('정책 변경 요청을 거부할 수 있어야 한다', async () => {
      const changeRequest = await service.createChangeRequest(
        'test-policy',
        'update',
        { enabled: false },
        'test-user'
      );

      const rejectedRequest = await service.rejectChangeRequest(
        changeRequest.id,
        'rejecter-user',
        'Policy conflicts with existing rules'
      );

      expect(rejectedRequest.status).toBe('rejected');
      expect(rejectedRequest.rejectedBy).toBe('rejecter-user');
      expect(rejectedRequest.reason).toBe('Policy conflicts with existing rules');
      expect(rejectedRequest.rejectedAt).toBeDefined();
    });
  });

  describe('조회 기능', () => {
    beforeEach(async () => {
      // 테스트 데이터 준비
      await service.requestApproval(
        'policy-1',
        'workflow-1',
        'step-1',
        'user-1',
        { field: 'value1' }
      );

      await service.requestApproval(
        'policy-2',
        'workflow-2',
        'step-2',
        'user-2',
        { field: 'value2' }
      );

      await service.createChangeRequest(
        'policy-1',
        'update',
        { enabled: false },
        'user-1'
      );
    });

    it('워크플로우별 승인 요청을 조회할 수 있어야 한다', () => {
      const approvals = service.getApprovalsForWorkflow('workflow-1');
      expect(approvals.length).toBeGreaterThan(0);
      if (approvals.length > 0) {
        expect(approvals[0]?.workflowId).toBe('workflow-1');
      }
    });

    it('사용자별 승인 요청을 조회할 수 있어야 한다', () => {
      const approvals = service.getApprovalsByUser('user-1');
      expect(approvals.length).toBeGreaterThan(0);
      if (approvals.length > 0) {
        expect(approvals[0]?.requestedBy).toBe('user-1');
      }
    });

    it('대기 중인 승인 요청을 조회할 수 있어야 한다', () => {
      const pendingApprovals = service.getPendingApprovals();
      expect(pendingApprovals.length).toBeGreaterThan(0);
      expect(pendingApprovals.every(a => a.status === 'pending')).toBe(true);
    });

    it('정책별 변경 요청을 조회할 수 있어야 한다', () => {
      const changeRequests = service.getChangeRequestsForPolicy('policy-1');
      expect(changeRequests.length).toBeGreaterThan(0);
      if (changeRequests.length > 0) {
        expect(changeRequests[0]?.policyId).toBe('policy-1');
      }
    });

    it('사용자별 변경 요청을 조회할 수 있어야 한다', () => {
      const changeRequests = service.getChangeRequestsByUser('user-1');
      expect(changeRequests.length).toBeGreaterThan(0);
      if (changeRequests.length > 0) {
        expect(changeRequests[0]?.requestedBy).toBe('user-1');
      }
    });

    it('대기 중인 변경 요청을 조회할 수 있어야 한다', () => {
      const pendingRequests = service.getPendingChangeRequests();
      expect(pendingRequests.length).toBeGreaterThan(0);
      expect(pendingRequests.every(r => r.status === 'pending')).toBe(true);
    });
  });

  describe('통계 및 감사', () => {
    it('승인 요청 통계를 반환해야 한다', () => {
      const stats = service.getApprovalStats();
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('approved');
      expect(stats).toHaveProperty('rejected');
      expect(stats).toHaveProperty('expired');
      expect(typeof stats.total).toBe('number');
    });

    it('변경 요청 통계를 반환해야 한다', () => {
      const stats = service.getChangeRequestStats();
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('approved');
      expect(stats).toHaveProperty('rejected');
      expect(typeof stats.total).toBe('number');
    });

    it('감사 로그를 조회할 수 있어야 한다', () => {
      const logs = service.getAuditLogs();
      expect(Array.isArray(logs)).toBe(true);
    });

    it('필터링된 감사 로그를 조회할 수 있어야 한다', () => {
      const logs = service.getAuditLogs('user-1');
      expect(Array.isArray(logs)).toBe(true);
      if (logs.length > 0) {
        expect(logs.every(log => log.userId === 'user-1')).toBe(true);
      }
    });
  });

  describe('에러 처리', () => {
    it('존재하지 않는 승인 요청에 대해 에러를 반환해야 한다', async () => {
      await expect(
        service.approveRequest('non-existent-id', 'user', 'reason')
      ).rejects.toThrow('Approval not found');
    });

    it('이미 처리된 승인 요청에 대해 에러를 반환해야 한다', async () => {
      const approval = await service.requestApproval(
        'test-policy',
        'test-workflow',
        'test-step',
        'test-user',
        { field: 'value' }
      );

      await service.approveRequest(approval.id, 'approver', 'reason');

      await expect(
        service.approveRequest(approval.id, 'another-approver', 'reason')
      ).rejects.toThrow('Approval is not pending');
    });

    it('만료된 승인 요청에 대해 에러를 반환해야 한다', async () => {
      const approval = await service.requestApproval(
        'test-policy',
        'test-workflow',
        'test-step',
        'test-user',
        { field: 'value' },
        0.001 // 3.6초 후 만료
      );

      // 만료 대기
      await new Promise(resolve => setTimeout(resolve, 4000));

      await expect(
        service.approveRequest(approval.id, 'approver', 'reason')
      ).rejects.toThrow('Approval has expired');
    });
  });
});
