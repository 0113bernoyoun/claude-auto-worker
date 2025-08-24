import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { WorkflowRepositoryService, Workflow } from './workflow-repository.service';

export interface ShareWorkflowDto {
  userId: string;
  permission: 'read' | 'write' | 'admin';
  grantedBy: string;
  expiresAt?: Date;
}

export interface UpdateShareDto {
  permission?: 'read' | 'write' | 'admin';
  expiresAt?: Date;
  isActive?: boolean;
}

export interface WorkflowShare {
  id: string;
  workflowId: string;
  userId: string;
  permission: 'read' | 'write' | 'admin';
  grantedBy: string;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
}

@Injectable()
export class WorkflowSharingService {
  private readonly logger = new Logger(WorkflowSharingService.name);
  private shares: Map<string, WorkflowShare> = new Map();
  private nextShareId = 1;

  constructor(
    private workflowRepositoryService: WorkflowRepositoryService,
  ) {}

  /**
   * 워크플로우를 사용자와 공유합니다.
   */
  async shareWorkflow(workflowId: string, shareDto: ShareWorkflowDto): Promise<WorkflowShare> {
    // 워크플로우 존재 확인
    try {
      await this.workflowRepositoryService.getWorkflow(workflowId);
    } catch (error) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found`);
    }

    // 이미 공유되어 있는지 확인
    const existingShare = Array.from(this.shares.values()).find(
      s => s.workflowId === workflowId && s.userId === shareDto.userId
    );

    if (existingShare) {
      // 기존 공유 업데이트
      existingShare.permission = shareDto.permission;
      existingShare.grantedBy = shareDto.grantedBy;
      if (shareDto.expiresAt) {
        existingShare.expiresAt = shareDto.expiresAt;
      }
      existingShare.isActive = true;

      this.shares.set(existingShare.id, existingShare);
      this.logger.log(`Workflow share updated: ${workflowId} -> ${shareDto.userId} (${shareDto.permission})`);
      return existingShare;
    }

    // 새로운 공유 생성
    const share: WorkflowShare = {
      id: `share-${this.nextShareId++}`,
      workflowId,
      userId: shareDto.userId,
      permission: shareDto.permission,
      grantedBy: shareDto.grantedBy,
      expiresAt: shareDto.expiresAt,
      isActive: true,
      createdAt: new Date(),
    };

    this.shares.set(share.id, share);
    this.logger.log(`Workflow shared: ${workflowId} -> ${shareDto.userId} (${shareDto.permission})`);
    
    return share;
  }

  /**
   * 워크플로우 공유 권한을 업데이트합니다.
   */
  async updateShare(shareId: string, updateDto: UpdateShareDto, updatedBy: string): Promise<WorkflowShare> {
    const share = this.shares.get(shareId);
    if (!share) {
      throw new NotFoundException(`Share with ID ${shareId} not found`);
    }

    // 권한 확인 (admin만 수정 가능)
    const hasPermission = await this.checkPermission(share.workflowId, updatedBy, 'admin');
    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions to update share');
    }

    Object.assign(share, updateDto);
    this.shares.set(shareId, share);

    this.logger.log(`Workflow share updated: ${shareId} by ${updatedBy}`);
    return share;
  }

  /**
   * 워크플로우 공유를 제거합니다.
   */
  async removeShare(shareId: string, removedBy: string): Promise<boolean> {
    const share = this.shares.get(shareId);
    if (!share) {
      throw new NotFoundException(`Share with ID ${shareId} not found`);
    }

    // 권한 확인 (admin만 제거 가능)
    const hasPermission = await this.checkPermission(share.workflowId, removedBy, 'admin');
    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions to remove share');
    }

    this.shares.delete(shareId);
    this.logger.log(`Workflow share removed: ${shareId} by ${removedBy}`);
    
    return true;
  }

  /**
   * 워크플로우에 대한 사용자의 권한을 확인합니다.
   */
  async checkPermission(workflowId: string, userId: string, requiredPermission: 'read' | 'write' | 'admin'): Promise<boolean> {
    // 워크플로우 소유자 확인
    try {
      const workflow = await this.workflowRepositoryService.getWorkflow(workflowId);
      if (workflow.createdBy === userId) {
        return true; // 소유자는 모든 권한을 가짐
      }

      // 공개 워크플로우는 읽기 권한만 필요
      if (workflow.isPublic && requiredPermission === 'read') {
        return true;
      }
    } catch (error) {
      return false;
    }

    // 공유 권한 확인
    const share = Array.from(this.shares.values()).find(
      s => s.workflowId === workflowId && s.userId === userId && s.isActive
    );

    if (!share) {
      return false;
    }

    // 만료 확인
    if (share.expiresAt && share.expiresAt < new Date()) {
      return false;
    }

    // 권한 수준 확인
    const permissionLevels = { read: 1, write: 2, admin: 3 };
    const userLevel = permissionLevels[share.permission];
    const requiredLevel = permissionLevels[requiredPermission];

    return userLevel >= requiredLevel;
  }

  /**
   * 워크플로우의 공유 목록을 조회합니다.
   */
  async getWorkflowShares(workflowId: string): Promise<WorkflowShare[]> {
    const shares = Array.from(this.shares.values())
      .filter(s => s.workflowId === workflowId && s.isActive)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return shares;
  }

  /**
   * 사용자가 공유받은 워크플로우 목록을 조회합니다.
   */
  async getUserSharedWorkflows(userId: string): Promise<Workflow[]> {
    const shares = Array.from(this.shares.values())
      .filter(s => s.userId === userId && s.isActive)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // 만료되지 않은 공유만 필터링
    const validShares = shares.filter(share => {
      if (!share.expiresAt) return true;
      return share.expiresAt > new Date();
    });

    // 워크플로우 정보 조회
    const workflows: Workflow[] = [];
    for (const share of validShares) {
      try {
        const workflow = await this.workflowRepositoryService.getWorkflow(share.workflowId);
        workflows.push(workflow);
      } catch (error) {
        // 워크플로우가 삭제된 경우 스킵
        continue;
      }
    }

    return workflows;
  }

  /**
   * 워크플로우 공유 통계를 조회합니다.
   */
  async getSharingStats(workflowId?: string): Promise<{
    totalShares: number;
    activeShares: number;
    expiredShares: number;
    permissionBreakdown: { read: number; write: number; admin: number };
  }> {
    let shares = Array.from(this.shares.values()).filter(s => s.isActive);
    
    if (workflowId) {
      shares = shares.filter(s => s.workflowId === workflowId);
    }

    const totalShares = shares.length;
    const activeShares = shares.filter(s => !s.expiresAt).length;
    const expiredShares = shares.filter(s => s.expiresAt && s.expiresAt < new Date()).length;

    // 권한별 통계
    const readCount = shares.filter(s => s.permission === 'read').length;
    const writeCount = shares.filter(s => s.permission === 'write').length;
    const adminCount = shares.filter(s => s.permission === 'admin').length;

    return {
      totalShares,
      activeShares,
      expiredShares,
      permissionBreakdown: { read: readCount, write: writeCount, admin: adminCount },
    };
  }

  /**
   * 만료된 공유를 정리합니다.
   */
  async cleanupExpiredShares(): Promise<number> {
    const expiredShares = Array.from(this.shares.values()).filter(
      s => s.expiresAt && s.expiresAt < new Date() && s.isActive
    );

    for (const share of expiredShares) {
      share.isActive = false;
      this.shares.set(share.id, share);
    }

    this.logger.log(`Cleaned up ${expiredShares.length} expired shares`);
    return expiredShares.length;
  }

  /**
   * 워크플로우를 팀과 공유합니다.
   */
  async shareWithTeam(workflowId: string, teamId: string, permission: 'read' | 'write' | 'admin', grantedBy: string): Promise<WorkflowShare[]> {
    // TODO: 팀 멤버 조회 로직 구현 필요
    // 현재는 기본 사용자 ID로 대체
    const teamMemberIds = [teamId]; // 임시 구현

    const shares: WorkflowShare[] = [];
    for (const memberId of teamMemberIds) {
      try {
        const share = await this.shareWorkflow(workflowId, {
          userId: memberId,
          permission,
          grantedBy,
        });
        shares.push(share);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        this.logger.warn(`Failed to share workflow with team member ${memberId}: ${errorMessage}`);
      }
    }

    this.logger.log(`Workflow shared with team ${teamId}: ${shares.length} members`);
    return shares;
  }
}
