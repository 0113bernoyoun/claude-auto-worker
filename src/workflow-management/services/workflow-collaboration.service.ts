import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { WorkflowRepositoryService } from './workflow-repository.service';
import { WorkflowSharingService } from './workflow-sharing.service';

export interface CreateCommentDto {
  content: string;
  type?: 'comment' | 'feedback' | 'review' | 'suggestion';
  parentCommentId?: string;
  metadata?: Record<string, any>;
}

export interface UpdateCommentDto {
  content?: string;
  type?: 'comment' | 'feedback' | 'review' | 'suggestion';
  metadata?: Record<string, any>;
}

export interface CommentFilterDto {
  type?: string;
  parentCommentId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface WorkflowComment {
  id: string;
  workflowId: string;
  userId: string;
  content: string;
  type: 'comment' | 'feedback' | 'review' | 'suggestion';
  parentCommentId?: string;
  metadata: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class WorkflowCollaborationService {
  private readonly logger = new Logger(WorkflowCollaborationService.name);
  private comments: Map<string, WorkflowComment> = new Map();
  private nextCommentId = 1;

  constructor(
    private workflowRepositoryService: WorkflowRepositoryService,
    private workflowSharingService: WorkflowSharingService,
  ) {}

  /**
   * 워크플로우에 댓글을 추가합니다.
   */
  async addComment(
    workflowId: string,
    userId: string,
    createDto: CreateCommentDto
  ): Promise<WorkflowComment> {
    // 워크플로우 존재 확인
    try {
      await this.workflowRepositoryService.getWorkflow(workflowId);
    } catch (error) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found`);
    }

    // 권한 확인 (읽기 권한 필요)
    const hasPermission = await this.workflowSharingService.checkPermission(workflowId, userId, 'read');
    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions to comment on this workflow');
    }

    // 대댓글인 경우 부모 댓글 확인
    if (createDto.parentCommentId) {
      const parentComment = this.comments.get(createDto.parentCommentId);
      if (!parentComment || parentComment.workflowId !== workflowId) {
        throw new BadRequestException('Parent comment not found');
      }
    }

    const comment: WorkflowComment = {
      id: `comment-${this.nextCommentId++}`,
      workflowId,
      userId,
      content: createDto.content,
      type: createDto.type || 'comment',
      parentCommentId: createDto.parentCommentId,
      metadata: createDto.metadata || {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.comments.set(comment.id, comment);
    this.logger.log(`Comment added to workflow ${workflowId} by ${userId}`);

    return comment;
  }

  /**
   * 댓글을 업데이트합니다.
   */
  async updateComment(
    commentId: string,
    userId: string,
    updateDto: UpdateCommentDto
  ): Promise<WorkflowComment> {
    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // 권한 확인 (댓글 작성자만 수정 가능)
    if (comment.userId !== userId) {
      throw new ForbiddenException('Only comment author can update the comment');
    }

    Object.assign(comment, updateDto);
    comment.updatedAt = new Date();

    this.comments.set(commentId, comment);
    this.logger.log(`Comment updated: ${commentId} by ${userId}`);

    return comment;
  }

  /**
   * 댓글을 삭제합니다.
   */
  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // 권한 확인 (댓글 작성자 또는 워크플로우 관리자만 삭제 가능)
    const isAuthor = comment.userId === userId;
    const isAdmin = await this.workflowSharingService.checkPermission(comment.workflowId, userId, 'admin');

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException('Insufficient permissions to delete this comment');
    }

    // 실제 삭제 대신 비활성화 처리
    comment.isActive = false;
    comment.updatedAt = new Date();

    this.comments.set(commentId, comment);
    this.logger.log(`Comment deleted: ${commentId} by ${userId}`);

    return true;
  }

  /**
   * 워크플로우의 댓글 목록을 조회합니다.
   */
  async getWorkflowComments(
    workflowId: string,
    filterDto: CommentFilterDto = {}
  ): Promise<{ comments: WorkflowComment[]; total: number }> {
    const { limit = 50, offset = 0, sortBy = 'createdAt', sortOrder = 'DESC' } = filterDto;

    let comments = Array.from(this.comments.values()).filter(c => c.workflowId === workflowId && c.isActive);

    if (filterDto.type) {
      comments = comments.filter(c => c.type === filterDto.type);
    }

    if (filterDto.parentCommentId) {
      comments = comments.filter(c => c.parentCommentId === filterDto.parentCommentId);
    } else {
      // 최상위 댓글만 조회 (대댓글 제외)
      comments = comments.filter(c => !c.parentCommentId);
    }

    if (filterDto.userId) {
      comments = comments.filter(c => c.userId === filterDto.userId);
    }

    // 정렬
    comments.sort((a, b) => {
      const aValue = a[sortBy as keyof WorkflowComment];
      const bValue = b[sortBy as keyof WorkflowComment];
      
      if (sortOrder === 'ASC') {
        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return 1;
        if (bValue === undefined) return -1;
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return 1;
        if (bValue === undefined) return -1;
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    const total = comments.length;
    const paginatedComments = comments.slice(offset, offset + limit);

    return { comments: paginatedComments, total };
  }

  /**
   * 댓글의 대댓글을 조회합니다.
   */
  async getCommentReplies(commentId: string): Promise<WorkflowComment[]> {
    const replies = Array.from(this.comments.values())
      .filter(c => c.parentCommentId === commentId && c.isActive)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return replies;
  }

  /**
   * 워크플로우의 댓글 통계를 조회합니다.
   */
  async getCommentStats(workflowId: string): Promise<{
    totalComments: number;
    activeComments: number;
    typeBreakdown: { comment: number; feedback: number; review: number; suggestion: number };
    replyCount: number;
  }> {
    const workflowComments = Array.from(this.comments.values()).filter(c => c.workflowId === workflowId);
    const totalComments = workflowComments.length;
    const activeComments = workflowComments.filter(c => c.isActive).length;
    const replyCount = workflowComments.filter(c => !c.parentCommentId && c.isActive).length;

    // 타입별 통계
    const commentCount = workflowComments.filter(c => c.type === 'comment' && c.isActive).length;
    const feedbackCount = workflowComments.filter(c => c.type === 'feedback' && c.isActive).length;
    const reviewCount = workflowComments.filter(c => c.type === 'review' && c.isActive).length;
    const suggestionCount = workflowComments.filter(c => c.type === 'suggestion' && c.isActive).length;

    return {
      totalComments,
      activeComments,
      typeBreakdown: { comment: commentCount, feedback: feedbackCount, review: reviewCount, suggestion: suggestionCount },
      replyCount,
    };
  }

  /**
   * 사용자의 댓글 활동을 조회합니다.
   */
  async getUserCommentActivity(userId: string): Promise<{
    totalComments: number;
    activeComments: number;
    workflowsCommented: number;
    recentActivity: WorkflowComment[];
  }> {
    const userComments = Array.from(this.comments.values()).filter(c => c.userId === userId);
    const totalComments = userComments.length;
    const activeComments = userComments.filter(c => c.isActive).length;

    // 댓글을 작성한 워크플로우 수
    const workflowsCommented = new Set(userComments.filter(c => c.isActive).map(c => c.workflowId)).size;

    // 최근 활동 (최근 10개 댓글)
    const recentActivity = userComments
      .filter(c => c.isActive)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    return {
      totalComments,
      activeComments,
      workflowsCommented,
      recentActivity,
    };
  }

  /**
   * 워크플로우 피드백을 요약합니다.
   */
  async getWorkflowFeedbackSummary(workflowId: string): Promise<{
    feedbackCount: number;
    reviewCount: number;
    suggestionCount: number;
    topFeedback: WorkflowComment[];
    recentActivity: WorkflowComment[];
  }> {
    const workflowComments = Array.from(this.comments.values()).filter(c => c.workflowId === workflowId && c.isActive);
    
    const feedbackCount = workflowComments.filter(c => c.type === 'feedback').length;
    const reviewCount = workflowComments.filter(c => c.type === 'review').length;
    const suggestionCount = workflowComments.filter(c => c.type === 'suggestion').length;

    // 최근 피드백 활동
    const recentActivity = workflowComments
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    // 상위 피드백 (최근 3개)
    const topFeedback = workflowComments
      .filter(c => c.type === 'feedback')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 3);

    return {
      feedbackCount,
      reviewCount,
      suggestionCount,
      topFeedback,
      recentActivity,
    };
  }

  /**
   * 협업 활동을 정리합니다.
   */
  async cleanupCollaborationData(workflowId: string): Promise<number> {
    // 비활성화된 댓글 정리
    const inactiveComments = Array.from(this.comments.values()).filter(
      c => c.workflowId === workflowId && !c.isActive
    );

    for (const comment of inactiveComments) {
      this.comments.delete(comment.id);
    }

    this.logger.log(`Cleaned up ${inactiveComments.length} inactive comments for workflow ${workflowId}`);
    return inactiveComments.length;
  }
}
