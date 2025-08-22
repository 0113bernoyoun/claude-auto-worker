import {
    Body,
    Controller,
    Delete,
    Get,
    Headers,
    HttpException,
    HttpStatus,
    Logger,
    Param,
    Post,
    Put,
    Query,
    UseGuards,
    UsePipes,
    ValidationPipe
} from '@nestjs/common';
import { PolicyEngineService } from './policy-engine.service';
import { PolicyManagementService } from './policy-management.service';
import { PolicyValidationService } from './policy-validation.service';
import {
    PolicyContext,
    SecurityPolicy,
    SecurityRule
} from './policy.types';

@Controller('api/policy')
export class PolicyController {
  private readonly logger = new Logger(PolicyController.name);

  constructor(
    private readonly policyEngineService: PolicyEngineService,
    private readonly policyValidationService: PolicyValidationService,
    private readonly policyManagementService: PolicyManagementService,
  ) {}

  // ===== 정책 엔진 API (TASK-032) =====

  /**
   * 워크플로우 실행을 검증합니다.
   */
  @Post('validate')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async validateWorkflowExecution(
    @Body() body: {
      context: PolicyContext;
      command?: string;
      filePath?: string;
    }
  ) {
    const { context, command, filePath } = body;
    
    this.logger.log(`Validating workflow execution: ${context.workflowId}`);
    
    const result = await this.policyEngineService.validateWorkflowExecution(
      context,
      command,
      filePath
    );

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 등록된 정책 목록을 반환합니다.
   */
  @Get('policies')
  async getPolicies() {
    const policies = this.policyEngineService.getPolicies();
    
    return {
      success: true,
      data: policies,
      count: policies.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 특정 정책을 반환합니다.
   */
  @Get('policies/:id')
  async getPolicy(@Param('id') id: string) {
    const policy = this.policyEngineService.getPolicy(id);
    
    if (!policy) {
      return {
        success: false,
        error: 'Policy not found',
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      data: policy,
      timestamp: new Date().toISOString()
    };
  }

  // ===== 정책 관리 API (TASK-033) =====

  /**
   * 새로운 보안 정책을 생성합니다.
   */
  @Post('policies')
  @UseGuards({ canActivate: (_c: any) => {
    const token = process.env.ADMIN_TOKEN;
    return !!token; // presence required; actual check in handler
  }} as any)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createPolicy(
    @Headers('x-admin-token') adminHeader: string,
    @Body() body: {
      name: string;
      description: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      rules: SecurityRule[];
      createdBy: string;
    }
  ) {
    if (process.env.ADMIN_TOKEN && adminHeader !== process.env.ADMIN_TOKEN) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    const { name, description, priority, rules, createdBy } = body;
    
    this.logger.log(`Creating policy: ${name} by ${createdBy}`);
    
    try {
      const policy = await this.policyManagementService.createPolicy(
        name,
        description,
        priority,
        rules,
        createdBy
      );

      return {
        success: true,
        data: policy,
        message: 'Policy created successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create policy: ${msg}`);
      
      return {
        success: false,
        error: msg,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 기존 정책을 업데이트합니다.
   */
  @Put('policies/:id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updatePolicy(
    @Param('id') id: string,
    @Body() body: {
      updates: Partial<Omit<SecurityPolicy, 'id' | 'createdAt' | 'createdBy'>>;
      updatedBy: string;
    }
  ) {
    const { updates, updatedBy } = body;
    
    this.logger.log(`Updating policy: ${id} by ${updatedBy}`);
    
    try {
      const policy = await this.policyManagementService.updatePolicy(
        id,
        updates,
        updatedBy
      );

      return {
        success: true,
        data: policy,
        message: 'Policy updated successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update policy: ${msg}`);
      
      return {
        success: false,
        error: msg,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 정책을 삭제합니다.
   */
  @Delete('policies/:id')
  @UseGuards({ canActivate: () => !!process.env.ADMIN_TOKEN } as any)
  async deletePolicy(
    @Param('id') id: string,
    @Headers('x-admin-token') adminHeader: string,
    @Body() body: { deletedBy: string }
  ) {
    if (process.env.ADMIN_TOKEN && adminHeader !== process.env.ADMIN_TOKEN) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    const { deletedBy } = body;
    
    this.logger.log(`Deleting policy: ${id} by ${deletedBy}`);
    
    try {
      const deleted = await this.policyManagementService.deletePolicy(id, deletedBy);

      if (deleted) {
        return {
          success: true,
          message: 'Policy deleted successfully',
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          error: 'Policy not found',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete policy: ${msg}`);
      
      return {
        success: false,
        error: msg,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 정책을 활성화/비활성화합니다.
   */
  @Put('policies/:id/toggle')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async togglePolicy(
    @Param('id') id: string,
    @Body() body: { enabled: boolean; updatedBy: string }
  ) {
    const { enabled, updatedBy } = body;
    
    this.logger.log(`Toggling policy: ${id} to ${enabled} by ${updatedBy}`);
    
    try {
      const policy = await this.policyManagementService.togglePolicy(
        id,
        enabled,
        updatedBy
      );

      return {
        success: true,
        data: policy,
        message: `Policy ${enabled ? 'enabled' : 'disabled'} successfully`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to toggle policy: ${msg}`);
      
      return {
        success: false,
        error: msg,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 정책을 테스트합니다.
   */
  @Post('policies/:id/test')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async testPolicy(
    @Param('id') id: string,
    @Body() body: {
      testContext: PolicyContext;
      testCommand?: string;
      testFilePath?: string;
    }
  ) {
    const { testContext, testCommand, testFilePath } = body;
    
    this.logger.log(`Testing policy: ${id}`);
    
    try {
      const result = await this.policyManagementService.testPolicy(
        id,
        testContext,
        testCommand,
        testFilePath
      );

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to test policy: ${msg}`);
      
      return {
        success: false,
        error: msg,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 정책 통계를 반환합니다.
   */
  @Get('stats')
  async getPolicyStats() {
    const stats = this.policyManagementService.getPolicyStats();
    
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 정책 템플릿을 반환합니다.
   */
  @Get('templates')
  async getPolicyTemplates() {
    const templates = this.policyManagementService.getPolicyTemplates();
    
    return {
      success: true,
      data: templates,
      count: templates.length,
      timestamp: new Date().toISOString()
    };
  }

  // ===== 정책 검증 및 승인 API (TASK-034) =====

  /**
   * 워크플로우 변경사항에 대한 승인을 요청합니다.
   */
  @Post('approvals')
  async requestApproval(
    @Body() body: {
      policyId: string;
      workflowId: string;
      stepId: string;
      requestedBy: string;
      changes: Record<string, unknown>;
      expiresInHours?: number;
    }
  ) {
    const { policyId, workflowId, stepId, requestedBy, changes, expiresInHours = 24 } = body;
    
    this.logger.log(`Requesting approval for workflow: ${workflowId}`);
    
    try {
      const approval = await this.policyValidationService.requestApproval(
        policyId,
        workflowId,
        stepId,
        requestedBy,
        changes,
        expiresInHours
      );

      return {
        success: true,
        data: approval,
        message: 'Approval requested successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to request approval: ${msg}`);
      
      return {
        success: false,
        error: msg,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 승인 요청을 승인합니다.
   */
  @Put('approvals/:id/approve')
  async approveRequest(
    @Param('id') id: string,
    @Body() body: { approvedBy: string; reason?: string }
  ) {
    const { approvedBy, reason } = body;
    
    this.logger.log(`Approving request: ${id} by ${approvedBy}`);
    
    try {
      const approval = await this.policyValidationService.approveRequest(
        id,
        approvedBy,
        reason
      );

      return {
        success: true,
        data: approval,
        message: 'Request approved successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to approve request: ${msg}`);
      
      return {
        success: false,
        error: msg,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 승인 요청을 거부합니다.
   */
  @Put('approvals/:id/reject')
  async rejectRequest(
    @Param('id') id: string,
    @Body() body: { rejectedBy: string; reason: string }
  ) {
    const { rejectedBy, reason } = body;
    
    this.logger.log(`Rejecting request: ${id} by ${rejectedBy}`);
    
    try {
      const approval = await this.policyValidationService.rejectRequest(
        id,
        rejectedBy,
        reason
      );

      return {
        success: true,
        data: approval,
        message: 'Request rejected successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to reject request: ${msg}`);
      
      return {
        success: false,
        error: msg,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 승인 요청 상태를 확인합니다.
   */
  @Get('approvals/:id')
  async getApprovalStatus(@Param('id') id: string) {
    const approval = this.policyValidationService.getApprovalStatus(id);
    
    if (!approval) {
      return {
        success: false,
        error: 'Approval not found',
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      data: approval,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 워크플로우에 대한 승인 요청들을 조회합니다.
   */
  @Get('approvals/workflow/:workflowId')
  async getApprovalsForWorkflow(@Param('workflowId') workflowId: string) {
    const approvals = this.policyValidationService.getApprovalsForWorkflow(workflowId);
    
    return {
      success: true,
      data: approvals,
      count: approvals.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 대기 중인 승인 요청들을 조회합니다.
   */
  @Get('approvals/pending')
  async getPendingApprovals() {
    const approvals = this.policyValidationService.getPendingApprovals();
    
    return {
      success: true,
      data: approvals,
      count: approvals.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 승인 요청 통계를 반환합니다.
   */
  @Get('approvals/stats')
  async getApprovalStats() {
    const stats = this.policyValidationService.getApprovalStats();
    
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 감사 로그를 조회합니다.
   */
  @Get('audit-logs')
  async getAuditLogs(
    @Query('userId') userId?: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    const logs = this.policyValidationService.getAuditLogs(
      userId,
      resourceType,
      resourceId,
      start,
      end
    );
    
    return {
      success: true,
      data: logs,
      count: logs.length,
      timestamp: new Date().toISOString()
    };
  }
}

