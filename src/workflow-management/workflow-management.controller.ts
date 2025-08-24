import {
    Body,
    Controller,
    Delete,
    Get,
    HttpException,
    HttpStatus,
    Logger,
    Param,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CreateCommentDto, UpdateCommentDto, WorkflowCollaborationService } from './services/workflow-collaboration.service';
import { CreateWorkflowDto, SearchWorkflowDto, UpdateWorkflowDto, WorkflowRepositoryService } from './services/workflow-repository.service';
import { ShareWorkflowDto, UpdateShareDto, WorkflowSharingService } from './services/workflow-sharing.service';

// TODO: 실제 인증 가드 구현 필요
const mockAuthGuard = {
  canActivate: () => true,
};

@Controller('api/workflows')
@UseGuards(mockAuthGuard as any)
export class WorkflowManagementController {
  private readonly logger = new Logger(WorkflowManagementController.name);

  constructor(
    private readonly workflowRepositoryService: WorkflowRepositoryService,
    private readonly workflowSharingService: WorkflowSharingService,
    private readonly workflowCollaborationService: WorkflowCollaborationService,
  ) {}

  // ===== 워크플로우 관리 API =====

  /**
   * 새로운 워크플로우를 생성합니다.
   */
  @Post()
  async createWorkflow(@Body() createDto: CreateWorkflowDto) {
    try {
      const workflow = await this.workflowRepositoryService.createWorkflow(createDto);
      
      return {
        success: true,
        data: workflow,
        message: 'Workflow created successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to create workflow: ${errorMessage}`);
      throw new HttpException(
        { success: false, error: errorMessage },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * 워크플로우를 조회합니다.
   */
  @Get(':id')
  async getWorkflow(@Param('id') id: string) {
    try {
      const workflow = await this.workflowRepositoryService.getWorkflow(id);
      
      return {
        success: true,
        data: workflow,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get workflow ${id}: ${errorMessage}`);
      throw new HttpException(
        { success: false, error: errorMessage },
        HttpStatus.NOT_FOUND
      );
    }
  }

  /**
   * 워크플로우를 업데이트합니다.
   */
  @Put(':id')
  async updateWorkflow(
    @Param('id') id: string,
    @Body() updateDto: UpdateWorkflowDto,
    @Query('userId') userId: string
  ) {
    try {
      const workflow = await this.workflowRepositoryService.updateWorkflow(id, updateDto, userId);
      
      return {
        success: true,
        data: workflow,
        message: 'Workflow updated successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to update workflow ${id}: ${errorMessage}`);
      throw new HttpException(
        { success: false, error: errorMessage },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * 워크플로우를 삭제합니다.
   */
  @Delete(':id')
  async deleteWorkflow(
    @Param('id') id: string,
    @Query('userId') userId: string
  ) {
    try {
      await this.workflowRepositoryService.deleteWorkflow(id, userId);
      
      return {
        success: true,
        message: 'Workflow deleted successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to delete workflow ${id}: ${errorMessage}`);
      throw new HttpException(
        { success: false, error: errorMessage },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * 워크플로우를 복사합니다.
   */
  @Post(':id/copy')
  async copyWorkflow(
    @Param('id') id: string,
    @Body() body: { newName?: string; userId: string }
  ) {
    try {
      const copiedWorkflow = await this.workflowRepositoryService.copyWorkflow(
        id,
        body.userId,
        body.newName
      );
      
      return {
        success: true,
        data: copiedWorkflow,
        message: 'Workflow copied successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to copy workflow ${id}: ${errorMessage}`);
      throw new HttpException(
        { success: false, error: errorMessage },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * 워크플로우를 검색합니다.
   */
  @Get()
  async searchWorkflows(@Query() searchDto: SearchWorkflowDto) {
    try {
      const result = await this.workflowRepositoryService.searchWorkflows(searchDto);
      
      return {
        success: true,
        data: result.workflows,
        pagination: {
          total: result.total,
          limit: searchDto.limit || 20,
          offset: searchDto.offset || 0,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to search workflows: ${errorMessage}`);
      throw new HttpException(
        { success: false, error: errorMessage },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * 워크플로우 통계를 조회합니다.
   */
  @Get('stats/overview')
  async getWorkflowStats(@Query('teamId') teamId?: string) {
    try {
      const stats = await this.workflowRepositoryService.getWorkflowStats(teamId);
      
      return {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get workflow stats: ${errorMessage}`);
      throw new HttpException(
        { success: false, error: errorMessage },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ===== 워크플로우 공유 API =====

  /**
   * 워크플로우를 공유합니다.
   */
  @Post(':id/share')
  async shareWorkflow(
    @Param('id') id: string,
    @Body() shareDto: ShareWorkflowDto
  ) {
    try {
      const share = await this.workflowSharingService.shareWorkflow(id, shareDto);
      
      return {
        success: true,
        data: share,
        message: 'Workflow shared successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to share workflow ${id}: ${errorMessage}`);
      throw new HttpException(
        { success: false, error: errorMessage },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * 워크플로우 공유 권한을 업데이트합니다.
   */
  @Put('shares/:shareId')
  async updateShare(
    @Param('shareId') shareId: string,
    @Body() updateDto: UpdateShareDto,
    @Query('userId') userId: string
  ) {
    try {
      const share = await this.workflowSharingService.updateShare(shareId, updateDto, userId);
      
      return {
        success: true,
        data: share,
        message: 'Share updated successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to update share ${shareId}: ${errorMessage}`);
      throw new HttpException(
        { success: false, error: errorMessage },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * 워크플로우 공유를 제거합니다.
   */
  @Delete('shares/:shareId')
  async removeShare(
    @Param('shareId') shareId: string,
    @Query('userId') userId: string
  ) {
    try {
      await this.workflowSharingService.removeShare(shareId, userId);
      
      return {
        success: true,
        message: 'Share removed successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to remove share ${shareId}: ${errorMessage}`);
      throw new HttpException(
        { success: false, error: errorMessage },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * 워크플로우의 공유 목록을 조회합니다.
   */
  @Get(':id/shares')
  async getWorkflowShares(@Param('id') id: string) {
    try {
      const shares = await this.workflowSharingService.getWorkflowShares(id);
      
      return {
        success: true,
        data: shares,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get workflow shares ${id}: ${errorMessage}`);
      throw new HttpException(
        { success: false, error: errorMessage },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 사용자가 공유받은 워크플로우 목록을 조회합니다.
   */
  @Get('shared/user/:userId')
  async getUserSharedWorkflows(@Param('userId') userId: string) {
    try {
      const workflows = await this.workflowSharingService.getUserSharedWorkflows(userId);
      
      return {
        success: true,
        data: workflows,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get shared workflows for user ${userId}: ${errorMessage}`);
      throw new HttpException(
        { success: false, error: errorMessage },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 공유 통계를 조회합니다.
   */
  @Get('shares/stats')
  async getSharingStats(@Query('workflowId') workflowId?: string) {
    try {
      const stats = await this.workflowSharingService.getSharingStats(workflowId);
      
      return {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get sharing stats: ${errorMessage}`);
      throw new HttpException(
        { success: false, error: errorMessage },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ===== 워크플로우 협업 API =====

  /**
   * 워크플로우에 댓글을 추가합니다.
   */
  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @Body() createDto: CreateCommentDto,
    @Query('userId') userId: string
  ) {
    try {
      const comment = await this.workflowCollaborationService.addComment(id, userId, createDto);
      
      return {
        success: true,
        data: comment,
        message: 'Comment added successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to add comment to workflow ${id}: ${errorMessage}`);
      throw new HttpException(
        { success: false, error: errorMessage },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * 워크플로우의 댓글 목록을 조회합니다.
   */
  @Get(':id/comments')
  async getWorkflowComments(
    @Param('id') id: string,
    @Query() filterDto: any
  ) {
    try {
      const result = await this.workflowCollaborationService.getWorkflowComments(id, filterDto);
      
      return {
        success: true,
        data: result.comments,
        pagination: {
          total: result.total,
          limit: filterDto.limit || 50,
          offset: filterDto.offset || 0,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get workflow comments ${id}: ${errorMessage}`);
      throw new HttpException(
        { success: false, error: errorMessage },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 댓글을 업데이트합니다.
   */
  @Put('comments/:commentId')
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() updateDto: UpdateCommentDto,
    @Query('userId') userId: string
  ) {
    try {
      const comment = await this.workflowCollaborationService.updateComment(commentId, userId, updateDto);
      
      return {
        success: true,
        data: comment,
        message: 'Comment updated successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to update comment ${commentId}: ${errorMessage}`);
      throw new HttpException(
        { success: false, error: errorMessage },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * 댓글을 삭제합니다.
   */
  @Delete('comments/:commentId')
  async deleteComment(
    @Param('commentId') commentId: string,
    @Query('userId') userId: string
  ) {
    try {
      await this.workflowCollaborationService.deleteComment(commentId, userId);
      
      return {
        success: true,
        message: 'Comment deleted successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to delete comment ${commentId}: ${errorMessage}`);
      throw new HttpException(
        { success: false, error: errorMessage },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * 댓글 통계를 조회합니다.
   */
  @Get(':id/comments/stats')
  async getCommentStats(@Param('id') id: string) {
    try {
      const stats = await this.workflowCollaborationService.getCommentStats(id);
      
      return {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get comment stats for workflow ${id}: ${errorMessage}`);
      throw new HttpException(
        { success: false, error: errorMessage },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 사용자의 댓글 활동을 조회합니다.
   */
  @Get('comments/user/:userId/activity')
  async getUserCommentActivity(@Param('userId') userId: string) {
    try {
      const activity = await this.workflowCollaborationService.getUserCommentActivity(userId);
      
      return {
        success: true,
        data: activity,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get user comment activity ${userId}: ${errorMessage}`);
      throw new HttpException(
        { success: false, error: errorMessage },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 워크플로우 피드백 요약을 조회합니다.
   */
  @Get(':id/feedback/summary')
  async getWorkflowFeedbackSummary(@Param('id') id: string) {
    try {
      const summary = await this.workflowCollaborationService.getWorkflowFeedbackSummary(id);
      
      return {
        success: true,
        data: summary,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to get workflow feedback summary ${id}: ${errorMessage}`);
      throw new HttpException(
        { success: false, error: errorMessage },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
