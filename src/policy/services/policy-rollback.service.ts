import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SecurityPolicy } from '../policy.types';
import { PolicyCacheService } from './policy-cache.service';
import { PolicyVersionService } from './policy-version.service';

export interface RollbackRequest {
  id: string;
  policyId: string;
  targetVersion: number;
  reason: string;
  requestedBy: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  approvedBy?: string;
  approvedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface RollbackResult {
  success: boolean;
  policyId: string;
  fromVersion: number;
  toVersion: number;
  restoredPolicy: SecurityPolicy;
  rollbackId: string;
  timestamp: Date;
  message: string;
}

@Injectable()
export class PolicyRollbackService {
  private readonly logger = new Logger(PolicyRollbackService.name);
  
  // 롤백 요청 저장소
  private readonly rollbackRequests = new Map<string, RollbackRequest>();
  
  // 롤백 이력 저장소
  private readonly rollbackHistory = new Map<string, RollbackResult[]>();
  
  // 롤백 요청 ID 생성기
  private rollbackRequestCounter = 0;

  constructor(
    private readonly versionService: PolicyVersionService,
    private readonly cacheService: PolicyCacheService,
  ) {}

  /**
   * 롤백 요청 생성
   */
  createRollbackRequest(
    policyId: string,
    targetVersion: number,
    reason: string,
    requestedBy: string,
    metadata?: Record<string, unknown>
  ): RollbackRequest {
    // 대상 버전 존재 여부 확인
    const targetVersionData = this.versionService.getVersion(policyId, targetVersion);
    if (!targetVersionData) {
      throw new NotFoundException(`Version ${targetVersion} not found for policy ${policyId}`);
    }

    // 현재 버전과 동일한지 확인
    const currentVersion = this.versionService.getLatestVersion(policyId);
    if (currentVersion && currentVersion.version === targetVersion) {
      throw new BadRequestException(`Cannot rollback to current version ${targetVersion}`);
    }

    const rollbackId = `rollback_${++this.rollbackRequestCounter}`;
    
    const request: RollbackRequest = {
      id: rollbackId,
      policyId,
      targetVersion,
      reason,
      requestedBy,
      requestedAt: new Date(),
      status: 'pending',
      metadata,
    };

    this.rollbackRequests.set(rollbackId, request);
    this.logger.debug(`Created rollback request ${rollbackId} for policy ${policyId} to version ${targetVersion}`);
    
    return request;
  }

  /**
   * 롤백 요청 승인
   */
  approveRollbackRequest(
    rollbackId: string, 
    approvedBy: string
  ): RollbackRequest {
    const request = this.rollbackRequests.get(rollbackId);
    if (!request) {
      throw new NotFoundException(`Rollback request ${rollbackId} not found`);
    }

    if (request.status !== 'pending') {
      throw new BadRequestException(`Rollback request ${rollbackId} is not pending`);
    }

    request.status = 'approved';
    request.approvedBy = approvedBy;
    request.approvedAt = new Date();

    this.logger.debug(`Approved rollback request ${rollbackId}`);
    return request;
  }

  /**
   * 롤백 요청 거부
   */
  rejectRollbackRequest(
    rollbackId: string, 
    rejectedBy: string,
    reason?: string
  ): RollbackRequest {
    const request = this.rollbackRequests.get(rollbackId);
    if (!request) {
      throw new NotFoundException(`Rollback request ${rollbackId} not found`);
    }

    if (request.status !== 'pending') {
      throw new BadRequestException(`Rollback request ${rollbackId} is not pending`);
    }

    request.status = 'rejected';
    request.metadata = { ...request.metadata, rejectionReason: reason };

    this.logger.debug(`Rejected rollback request ${rollbackId}`);
    return request;
  }

  /**
   * 롤백 실행
   */
  executeRollback(rollbackId: string): RollbackResult {
    const request = this.rollbackRequests.get(rollbackId);
    if (!request) {
      throw new NotFoundException(`Rollback request ${rollbackId} not found`);
    }

    if (request.status !== 'approved') {
      throw new BadRequestException(`Rollback request ${rollbackId} is not approved`);
    }

    try {
      // 현재 버전 조회
      const currentVersion = this.versionService.getLatestVersion(request.policyId);
      if (!currentVersion) {
        throw new Error(`Current version not found for policy ${request.policyId}`);
      }

      // 대상 버전으로 정책 복원
      const restoredPolicy = this.versionService.restoreVersion(
        request.policyId, 
        request.targetVersion
      );

      if (!restoredPolicy) {
        throw new Error(`Failed to restore policy ${request.policyId} to version ${request.targetVersion}`);
      }

      // 캐시 무효화
      this.cacheService.invalidatePolicy(request.policyId);
      this.cacheService.invalidateAllPolicyCache();

      // 롤백 요청 상태 업데이트
      request.status = 'completed';
      request.completedAt = new Date();

      // 롤백 결과 생성
      const result: RollbackResult = {
        success: true,
        policyId: request.policyId,
        fromVersion: currentVersion.version,
        toVersion: request.targetVersion,
        restoredPolicy,
        rollbackId: request.id,
        timestamp: new Date(),
        message: `Successfully rolled back policy ${request.policyId} from version ${currentVersion.version} to version ${request.targetVersion}`,
      };

      // 롤백 이력에 추가
      if (!this.rollbackHistory.has(request.policyId)) {
        this.rollbackHistory.set(request.policyId, []);
      }
      this.rollbackHistory.get(request.policyId)!.push(result);

      this.logger.debug(`Executed rollback ${rollbackId}: ${result.message}`);
      return result;

    } catch (error) {
      // 롤백 실패 처리
      request.status = 'failed';
      request.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error(`Rollback execution failed for ${rollbackId}: ${request.errorMessage}`);
      
      throw new Error(`Rollback execution failed: ${request.errorMessage}`);
    }
  }

  /**
   * 롤백 요청 조회
   */
  getRollbackRequest(rollbackId: string): RollbackRequest | null {
    return this.rollbackRequests.get(rollbackId) || null;
  }

  /**
   * 정책의 모든 롤백 요청 조회
   */
  getRollbackRequestsByPolicy(policyId: string): RollbackRequest[] {
    return Array.from(this.rollbackRequests.values())
      .filter(request => request.policyId === policyId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  /**
   * 모든 롤백 요청 조회
   */
  getAllRollbackRequests(): RollbackRequest[] {
    return Array.from(this.rollbackRequests.values())
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  /**
   * 정책의 롤백 이력 조회
   */
  getRollbackHistory(policyId: string): RollbackResult[] {
    return this.rollbackHistory.get(policyId) || [];
  }

  /**
   * 모든 롤백 이력 조회
   */
  getAllRollbackHistory(): Array<{
    policyId: string;
    rollbacks: RollbackResult[];
    totalRollbacks: number;
    lastRollback?: Date;
  }> {
    const history: Array<{
      policyId: string;
      rollbacks: RollbackResult[];
      totalRollbacks: number;
      lastRollback?: Date;
    }> = [];

    for (const [policyId, rollbacks] of this.rollbackHistory.entries()) {
      const sortedRollbacks = rollbacks.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      const lastRollback = sortedRollbacks.length > 0 ? sortedRollbacks[0]?.timestamp : undefined;

      history.push({
        policyId,
        rollbacks: sortedRollbacks,
        totalRollbacks: rollbacks.length,
        lastRollback,
      });
    }

    return history.sort((a, b) => {
      if (!a.lastRollback && !b.lastRollback) return 0;
      if (!a.lastRollback) return 1;
      if (!b.lastRollback) return -1;
      return b.lastRollback.getTime() - a.lastRollback.getTime();
    });
  }

  /**
   * 롤백 요청 삭제
   */
  deleteRollbackRequest(rollbackId: string): boolean {
    const deleted = this.rollbackRequests.delete(rollbackId);
    if (deleted) {
      this.logger.debug(`Deleted rollback request ${rollbackId}`);
    }
    return deleted;
  }

  /**
   * 롤백 통계 조회
   */
  getRollbackStats(): {
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    completedRollbacks: number;
    failedRollbacks: number;
    totalPoliciesWithRollbacks: number;
  } {
    let pendingRequests = 0;
    let approvedRequests = 0;
    let completedRollbacks = 0;
    let failedRollbacks = 0;

    for (const request of this.rollbackRequests.values()) {
      switch (request.status) {
        case 'pending':
          pendingRequests++;
          break;
        case 'approved':
          approvedRequests++;
          break;
        case 'completed':
          completedRollbacks++;
          break;
        case 'failed':
          failedRollbacks++;
          break;
      }
    }

    return {
      totalRequests: this.rollbackRequests.size,
      pendingRequests,
      approvedRequests,
      completedRollbacks,
      failedRollbacks,
      totalPoliciesWithRollbacks: this.rollbackHistory.size,
    };
  }

  /**
   * 롤백 가능한 버전 목록 조회
   */
  getRollbackableVersions(policyId: string): Array<{
    version: number;
    createdAt: Date;
    createdBy: string;
    changeReason?: string;
  }> {
    const currentVersion = this.versionService.getLatestVersion(policyId);
    if (!currentVersion) {
      return [];
    }

    const versionHistory = this.versionService.getVersionHistory(policyId);
    if (!versionHistory) {
      return [];
    }

    // 현재 버전을 제외한 모든 버전 반환
    return versionHistory.versions
      .filter(v => v.version !== currentVersion.version)
      .map(v => ({
        version: v.version,
        createdAt: v.createdAt,
        createdBy: v.createdBy,
        changeReason: v.changeReason,
      }))
      .sort((a, b) => b.version - a.version);
  }
}

