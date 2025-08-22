import { Injectable, Logger } from '@nestjs/common';
import {
    PolicyApproval,
    PolicyChangeRequest
} from './policy.types';

@Injectable()
export class PolicyValidationService {
  private readonly logger = new Logger(PolicyValidationService.name);
  private approvals: Map<string, PolicyApproval> = new Map();
  private changeRequests: Map<string, PolicyChangeRequest> = new Map();
  private auditLogs: Map<string, any> = new Map();

  constructor() {}

  /**
   * 워크플로우 변경사항에 대한 승인을 요청합니다.
   */
  async requestApproval(
    policyId: string,
    workflowId: string,
    stepId: string,
    requestedBy: string,
    changes: Record<string, unknown>,
    expiresInHours: number = 24
  ): Promise<PolicyApproval> {
    const approval: PolicyApproval = {
      id: `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      policyId,
      workflowId,
      stepId,
      status: 'pending',
      requestedBy,
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
    };

    this.approvals.set(approval.id, approval);
    
    // 감사 로그 기록
    this.logAuditEvent(requestedBy, 'request_approval', 'PolicyApproval', approval.id, {
      policyId,
      workflowId,
      stepId,
      changes,
      expiresInHours
    });

    this.logger.log(`Approval requested: ${approval.id} for workflow ${workflowId}`);
    return approval;
  }

  /**
   * 승인 요청을 승인합니다.
   */
  async approveRequest(
    approvalId: string,
    approvedBy: string,
    reason?: string
  ): Promise<PolicyApproval> {
    const approval = this.approvals.get(approvalId);
    
    if (!approval) {
      throw new Error(`Approval not found: ${approvalId}`);
    }

    if (approval.status !== 'pending') {
      throw new Error(`Approval is not pending: ${approval.status}`);
    }

    if (approval.expiresAt < new Date()) {
      approval.status = 'expired';
      this.approvals.set(approvalId, approval);
      throw new Error(`Approval has expired: ${approvalId}`);
    }

    approval.status = 'approved';
    approval.approvedBy = approvedBy;
    approval.approvedAt = new Date();

    // 감사 로그 기록
    this.logAuditEvent(approvedBy, 'approve_request', 'PolicyApproval', approvalId, {
      reason,
      previousStatus: 'pending'
    });

    this.logger.log(`Approval approved: ${approvalId} by ${approvedBy}`);
    return approval;
  }

  /**
   * 승인 요청을 거부합니다.
   */
  async rejectRequest(
    approvalId: string,
    rejectedBy: string,
    reason: string
  ): Promise<PolicyApproval> {
    const approval = this.approvals.get(approvalId);
    
    if (!approval) {
      throw new Error(`Approval not found: ${approvalId}`);
    }

    if (approval.status !== 'pending') {
      throw new Error(`Approval is not pending: ${approval.status}`);
    }

    approval.status = 'rejected';
    approval.rejectedBy = rejectedBy;
    approval.rejectedAt = new Date();
    approval.reason = reason;

    // 감사 로그 기록
    this.logAuditEvent(rejectedBy, 'reject_request', 'PolicyApproval', approvalId, {
      reason,
      previousStatus: 'pending'
    });

    this.logger.log(`Approval rejected: ${approvalId} by ${rejectedBy}`);
    return approval;
  }

  /**
   * 정책 변경 요청을 생성합니다.
   */
  async createChangeRequest(
    policyId: string,
    type: 'create' | 'update' | 'delete' | 'enable' | 'disable',
    changes: Record<string, unknown>,
    requestedBy: string
  ): Promise<PolicyChangeRequest> {
    const changeRequest: PolicyChangeRequest = {
      id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      policyId,
      type,
      changes,
      requestedBy,
      requestedAt: new Date(),
      status: 'pending'
    };

    this.changeRequests.set(changeRequest.id, changeRequest);
    
    // 감사 로그 기록
    this.logAuditEvent(requestedBy, 'create_change_request', 'PolicyChangeRequest', changeRequest.id, {
      policyId,
      type,
      changes
    });

    this.logger.log(`Change request created: ${changeRequest.id} for policy ${policyId}`);
    return changeRequest;
  }

  /**
   * 정책 변경 요청을 승인합니다.
   */
  async approveChangeRequest(
    requestId: string,
    approvedBy: string,
    reason?: string
  ): Promise<PolicyChangeRequest> {
    const changeRequest = this.changeRequests.get(requestId);
    
    if (!changeRequest) {
      throw new Error(`Change request not found: ${requestId}`);
    }

    if (changeRequest.status !== 'pending') {
      throw new Error(`Change request is not pending: ${changeRequest.status}`);
    }

    changeRequest.status = 'approved';
    changeRequest.approvedBy = approvedBy;
    changeRequest.approvedAt = new Date();

    // 감사 로그 기록
    this.logAuditEvent(approvedBy, 'approve_change_request', 'PolicyChangeRequest', requestId, {
      reason,
      previousStatus: 'pending'
    });

    this.logger.log(`Change request approved: ${requestId} by ${approvedBy}`);
    return changeRequest;
  }

  /**
   * 정책 변경 요청을 거부합니다.
   */
  async rejectChangeRequest(
    requestId: string,
    rejectedBy: string,
    reason: string
  ): Promise<PolicyChangeRequest> {
    const changeRequest = this.changeRequests.get(requestId);
    
    if (!changeRequest) {
      throw new Error(`Change request not found: ${requestId}`);
    }

    if (changeRequest.status !== 'pending') {
      throw new Error(`Change request is not pending: ${changeRequest.status}`);
    }

    changeRequest.status = 'rejected';
    changeRequest.rejectedBy = rejectedBy;
    changeRequest.rejectedAt = new Date();
    changeRequest.reason = reason;

    // 감사 로그 기록
    this.logAuditEvent(rejectedBy, 'reject_change_request', 'PolicyChangeRequest', requestId, {
      reason,
      previousStatus: 'pending'
    });

    this.logger.log(`Change request rejected: ${requestId} by ${rejectedBy}`);
    return changeRequest;
  }

  /**
   * 만료된 승인 요청들을 정리합니다.
   */
  async cleanupExpiredApprovals(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [id, approval] of this.approvals.entries()) {
      if (approval.status === 'pending' && approval.expiresAt < now) {
        approval.status = 'expired';
        this.approvals.set(id, approval);
        cleanedCount++;

        // 감사 로그 기록
        this.logAuditEvent('system', 'expire_approval', 'PolicyApproval', id, {
          reason: 'Automatic expiration',
          previousStatus: 'pending'
        });
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired approvals`);
    }

    return cleanedCount;
  }

  /**
   * 승인 요청 상태를 확인합니다.
   */
  getApprovalStatus(approvalId: string): PolicyApproval | undefined {
    return this.approvals.get(approvalId);
  }

  /**
   * 워크플로우에 대한 승인 요청들을 조회합니다.
   */
  getApprovalsForWorkflow(workflowId: string): PolicyApproval[] {
    return Array.from(this.approvals.values())
      .filter(approval => approval.workflowId === workflowId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  /**
   * 사용자의 승인 요청들을 조회합니다.
   */
  getApprovalsByUser(userId: string): PolicyApproval[] {
    return Array.from(this.approvals.values())
      .filter(approval => approval.requestedBy === userId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  /**
   * 정책 변경 요청 상태를 확인합니다.
   */
  getChangeRequestStatus(requestId: string): PolicyChangeRequest | undefined {
    return this.changeRequests.get(requestId);
  }

  /**
   * 정책에 대한 변경 요청들을 조회합니다.
   */
  getChangeRequestsForPolicy(policyId: string): PolicyChangeRequest[] {
    return Array.from(this.changeRequests.values())
      .filter(request => request.policyId === policyId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  /**
   * 사용자의 변경 요청들을 조회합니다.
   */
  getChangeRequestsByUser(userId: string): PolicyChangeRequest[] {
    return Array.from(this.changeRequests.values())
      .filter(request => request.requestedBy === userId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  /**
   * 대기 중인 승인 요청들을 조회합니다.
   */
  getPendingApprovals(): PolicyApproval[] {
    return Array.from(this.approvals.values())
      .filter(approval => approval.status === 'pending')
      .sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime());
  }

  /**
   * 대기 중인 변경 요청들을 조회합니다.
   */
  getPendingChangeRequests(): PolicyChangeRequest[] {
    return Array.from(this.changeRequests.values())
      .filter(request => request.status === 'pending')
      .sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime());
  }

  /**
   * 감사 로그를 기록합니다.
   */
  private logAuditEvent(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    details: Record<string, unknown>
  ): void {
    const auditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: 'localhost', // TODO: 실제 IP 주소 추출
      userAgent: 'system' // TODO: 실제 User-Agent 추출
    };

    this.auditLogs.set(auditLog.id, auditLog);
    this.logger.log(`Audit log: ${action} on ${resourceType} ${resourceId} by ${userId}`);
  }

  /**
   * 감사 로그를 조회합니다.
   */
  getAuditLogs(
    userId?: string,
    resourceType?: string,
    resourceId?: string,
    startDate?: Date,
    endDate?: Date
  ): any[] {
    let logs = Array.from(this.auditLogs.values());

    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }

    if (resourceType) {
      logs = logs.filter(log => log.resourceType === resourceType);
    }

    if (resourceId) {
      logs = logs.filter(log => log.resourceId === resourceId);
    }

    if (startDate) {
      logs = logs.filter(log => log.timestamp >= startDate);
    }

    if (endDate) {
      logs = logs.filter(log => log.timestamp <= endDate);
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 승인 요청 통계를 반환합니다.
   */
  getApprovalStats(): {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    expired: number;
  } {
    const approvals = Array.from(this.approvals.values());
    
    return {
      total: approvals.length,
      pending: approvals.filter(a => a.status === 'pending').length,
      approved: approvals.filter(a => a.status === 'approved').length,
      rejected: approvals.filter(a => a.status === 'rejected').length,
      expired: approvals.filter(a => a.status === 'expired').length
    };
  }

  /**
   * 변경 요청 통계를 반환합니다.
   */
  getChangeRequestStats(): {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  } {
    const requests = Array.from(this.changeRequests.values());
    
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length
    };
  }
}

