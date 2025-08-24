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
import { PolicyCacheService } from './services/policy-cache.service';
import { PolicyRollbackService } from './services/policy-rollback.service';
import { PolicyVersionService } from './services/policy-version.service';

@Controller('api/policy')
export class PolicyController {
  private readonly logger = new Logger(PolicyController.name);

  constructor(
    private readonly policyEngineService: PolicyEngineService,
    private readonly policyValidationService: PolicyValidationService,
    private readonly policyManagementService: PolicyManagementService,
    private readonly policyCacheService: PolicyCacheService,
    private readonly policyVersionService: PolicyVersionService,
    private readonly policyRollbackService: PolicyRollbackService,
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
    
    // 캐시 키 생성
    const cacheKey = this.policyCacheService.generateEvaluationCacheKey(
      context.workflowId || 'unknown',
      { context, command, filePath }
    );
    
    // 캐시에서 결과 확인
    let result = this.policyCacheService.getEvaluationResult(cacheKey);
    
    if (!result) {
      // 캐시 미스 시 실제 검증 수행
      result = await this.policyEngineService.validateWorkflowExecution(
        context,
        command,
        filePath
      );
      
      // 결과를 캐시에 저장
      this.policyCacheService.setEvaluationResult(cacheKey, result);
    }
    
    return {
      success: true,
      data: result,
      cached: !!this.policyCacheService.getEvaluationResult(cacheKey),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 등록된 정책 목록을 반환합니다.
   */
  @Get('policies')
  async getPolicies() {
    // 캐시에서 정책 목록 확인
    let policies = this.policyCacheService.getPolicyList('all_policies');
    
    if (!policies) {
      // 캐시 미스 시 실제 데이터 조회
      const enginePolicies = this.policyEngineService.getPolicies();
      
      // 정책 목록을 캐시에 저장
      this.policyCacheService.setPolicyList('all_policies', enginePolicies);
      policies = enginePolicies;
    }
    
    return {
      success: true,
      data: policies,
      count: policies.length,
      cached: !!this.policyCacheService.getPolicyList('all_policies'),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 특정 정책을 반환합니다.
   */
  @Get('policies/:id')
  async getPolicy(@Param('id') id: string) {
    // 캐시에서 정책 확인
    let policy = this.policyCacheService.getPolicy(id);
    
    if (!policy) {
      // 캐시 미스 시 실제 데이터 조회
      const enginePolicy = this.policyEngineService.getPolicy(id);
      
      if (enginePolicy) {
        // 정책을 캐시에 저장
        this.policyCacheService.setPolicy(id, enginePolicy);
        policy = enginePolicy;
      }
    }
    
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
      cached: !!this.policyCacheService.getPolicy(id),
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

      // 새 정책을 버전 관리에 추가
      this.policyVersionService.createVersion(
        policy,
        createdBy,
        'Initial policy creation'
      );

      // 캐시 무효화
      this.policyCacheService.invalidatePolicy('all_policies');
      this.policyCacheService.invalidatePolicy(policy.id);

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
      changeReason?: string;
    }
  ) {
    const { updates, updatedBy, changeReason } = body;
    
    this.logger.log(`Updating policy: ${id} by ${updatedBy}`);
    
    try {
      const policy = await this.policyManagementService.updatePolicy(
        id,
        updates,
        updatedBy
      );

      // 업데이트된 정책을 버전 관리에 추가
      this.policyVersionService.createVersion(
        policy,
        updatedBy,
        changeReason || 'Policy updated'
      );

      // 캐시 무효화
      this.policyCacheService.invalidatePolicy('all_policies');
      this.policyCacheService.invalidatePolicy(id);

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
        // 캐시 무효화
        this.policyCacheService.invalidatePolicy('all_policies');
        this.policyCacheService.invalidatePolicy(id);
        
        // 버전 히스토리 정리
        this.policyVersionService.deleteAllVersions(id);

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
    @Body() body: { enabled: boolean; updatedBy: string; changeReason?: string }
  ) {
    const { enabled, updatedBy, changeReason } = body;
    
    this.logger.log(`Toggling policy: ${id} to ${enabled} by ${updatedBy}`);
    
    try {
      const policy = await this.policyManagementService.togglePolicy(
        id,
        enabled,
        updatedBy
      );

      // 상태 변경을 버전 관리에 추가
      this.policyVersionService.createVersion(
        policy,
        updatedBy,
        changeReason || `Policy ${enabled ? 'enabled' : 'disabled'}`
      );

      // 캐시 무효화
      this.policyCacheService.invalidatePolicy('all_policies');
      this.policyCacheService.invalidatePolicy(id);

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

  // ===== 정책 캐싱 및 버전관리 API (TASK-092) =====

  /**
   * 캐시 통계를 조회합니다.
   */
  @Get('cache/stats')
  async getCacheStats() {
    const stats = this.policyCacheService.getStats();
    
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 캐시를 무효화합니다.
   */
  @Post('cache/invalidate')
  @UseGuards({ canActivate: () => !!process.env.ADMIN_TOKEN } as any)
  async invalidateCache(
    @Headers('x-admin-token') adminHeader: string,
    @Body() body: { 
      policyId?: string; 
      cacheKey?: string; 
      all?: boolean;
      invalidatedBy: string;
    }
  ) {
    if (process.env.ADMIN_TOKEN && adminHeader !== process.env.ADMIN_TOKEN) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const { policyId, cacheKey, all, invalidatedBy } = body;
    
    this.logger.log(`Invalidating cache by ${invalidatedBy}: policyId=${policyId}, cacheKey=${cacheKey}, all=${all}`);
    
    try {
      if (all) {
        this.policyCacheService.invalidateAllPolicyCache();
      } else if (policyId) {
        this.policyCacheService.invalidatePolicy(policyId);
      } else if (cacheKey) {
        this.policyCacheService.invalidateEvaluationResult(cacheKey);
      } else {
        throw new Error('Must specify policyId, cacheKey, or all=true');
      }

      return {
        success: true,
        message: 'Cache invalidated successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to invalidate cache: ${msg}`);
      
      return {
        success: false,
        error: msg,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 캐시 통계를 리셋합니다.
   */
  @Post('cache/reset-stats')
  @UseGuards({ canActivate: () => !!process.env.ADMIN_TOKEN } as any)
  async resetCacheStats(
    @Headers('x-admin-token') adminHeader: string,
    @Body() body: { resetBy: string }
  ) {
    if (process.env.ADMIN_TOKEN && adminHeader !== process.env.ADMIN_TOKEN) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const { resetBy } = body;
    
    this.logger.log(`Resetting cache stats by ${resetBy}`);
    
    try {
      this.policyCacheService.resetStats();

      return {
        success: true,
        message: 'Cache stats reset successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to reset cache stats: ${msg}`);
      
      return {
        success: false,
        error: msg,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 만료된 캐시 항목을 정리합니다.
   */
  @Post('cache/cleanup')
  @UseGuards({ canActivate: () => !!process.env.ADMIN_TOKEN } as any)
  async cleanupCache(
    @Headers('x-admin-token') adminHeader: string,
    @Body() body: { cleanedBy: string }
  ) {
    if (process.env.ADMIN_TOKEN && adminHeader !== process.env.ADMIN_TOKEN) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const { cleanedBy } = body;
    
    this.logger.log(`Cleaning up cache by ${cleanedBy}`);
    
    try {
      this.policyCacheService.cleanupExpiredEntries();

      return {
        success: true,
        message: 'Cache cleanup completed successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to cleanup cache: ${msg}`);
      
      return {
        success: false,
        error: msg,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 정책의 버전 히스토리를 조회합니다.
   */
  @Get('policies/:id/versions')
  async getPolicyVersions(@Param('id') id: string) {
    const versionHistory = this.policyVersionService.getVersionHistory(id);
    
    if (!versionHistory) {
      return {
        success: false,
        error: 'Policy not found or no versions available',
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      data: versionHistory,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 특정 버전의 정책을 조회합니다.
   */
  @Get('policies/:id/versions/:version')
  async getPolicyVersion(
    @Param('id') id: string,
    @Param('version') version: string
  ) {
    const versionNumber = parseInt(version, 10);
    if (isNaN(versionNumber)) {
      return {
        success: false,
        error: 'Invalid version number',
        timestamp: new Date().toISOString()
      };
    }

    const policyVersion = this.policyVersionService.getVersion(id, versionNumber);
    
    if (!policyVersion) {
      return {
        success: false,
        error: 'Version not found',
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      data: policyVersion,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 두 버전 간의 차이점을 비교합니다.
   */
  @Get('policies/:id/versions/:version1/compare/:version2')
  async compareVersions(
    @Param('id') id: string,
    @Param('version1') version1: string,
    @Param('version2') version2: string
  ) {
    const v1 = parseInt(version1, 10);
    const v2 = parseInt(version2, 10);
    
    if (isNaN(v1) || isNaN(v2)) {
      return {
        success: false,
        error: 'Invalid version numbers',
        timestamp: new Date().toISOString()
      };
    }

    const comparison = this.policyVersionService.compareVersions(id, v1, v2);
    
    if (!comparison) {
      return {
        success: false,
        error: 'Version comparison failed',
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      data: comparison,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 모든 정책의 버전 요약을 조회합니다.
   */
  @Get('versions/summary')
  async getAllVersionSummaries() {
    const summaries = this.policyVersionService.getAllVersionSummaries();
    
    return {
      success: true,
      data: summaries,
      count: summaries.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 버전 통계를 조회합니다.
   */
  @Get('versions/stats')
  async getVersionStats() {
    const stats = this.policyVersionService.getVersionStats();
    
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    };
  }

  // ===== 정책 롤백 API (TASK-092) =====

  /**
   * 롤백 요청을 생성합니다.
   */
  @Post('rollbacks')
  @UseGuards({ canActivate: () => !!process.env.ADMIN_TOKEN } as any)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createRollbackRequest(
    @Headers('x-admin-token') adminHeader: string,
    @Body() body: {
      policyId: string;
      targetVersion: number;
      reason: string;
      requestedBy: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    if (process.env.ADMIN_TOKEN && adminHeader !== process.env.ADMIN_TOKEN) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const { policyId, targetVersion, reason, requestedBy, metadata } = body;
    
    this.logger.log(`Creating rollback request for policy ${policyId} to version ${targetVersion} by ${requestedBy}`);
    
    try {
      const rollbackRequest = this.policyRollbackService.createRollbackRequest(
        policyId,
        targetVersion,
        reason,
        requestedBy,
        metadata
      );

      return {
        success: true,
        data: rollbackRequest,
        message: 'Rollback request created successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create rollback request: ${msg}`);
      
      return {
        success: false,
        error: msg,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 롤백 요청을 승인합니다.
   */
  @Put('rollbacks/:id/approve')
  @UseGuards({ canActivate: () => !!process.env.ADMIN_TOKEN } as any)
  async approveRollbackRequest(
    @Param('id') id: string,
    @Headers('x-admin-token') adminHeader: string,
    @Body() body: { approvedBy: string }
  ) {
    if (process.env.ADMIN_TOKEN && adminHeader !== process.env.ADMIN_TOKEN) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const { approvedBy } = body;
    
    this.logger.log(`Approving rollback request ${id} by ${approvedBy}`);
    
    try {
      const rollbackRequest = this.policyRollbackService.approveRollbackRequest(id, approvedBy);

      return {
        success: true,
        data: rollbackRequest,
        message: 'Rollback request approved successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to approve rollback request: ${msg}`);
      
      return {
        success: false,
        error: msg,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 롤백 요청을 거부합니다.
   */
  @Put('rollbacks/:id/reject')
  @UseGuards({ canActivate: () => !!process.env.ADMIN_TOKEN } as any)
  async rejectRollbackRequest(
    @Param('id') id: string,
    @Headers('x-admin-token') adminHeader: string,
    @Body() body: { rejectedBy: string; reason?: string }
  ) {
    if (process.env.ADMIN_TOKEN && adminHeader !== process.env.ADMIN_TOKEN) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const { rejectedBy, reason } = body;
    
    this.logger.log(`Rejecting rollback request ${id} by ${rejectedBy}`);
    
    try {
      const rollbackRequest = this.policyRollbackService.rejectRollbackRequest(id, rejectedBy, reason);

      return {
        success: true,
        data: rollbackRequest,
        message: 'Rollback request rejected successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to reject rollback request: ${msg}`);
      
      return {
        success: false,
        error: msg,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 롤백을 실행합니다.
   */
  @Post('rollbacks/:id/execute')
  @UseGuards({ canActivate: () => !!process.env.ADMIN_TOKEN } as any)
  async executeRollback(
    @Param('id') id: string,
    @Headers('x-admin-token') adminHeader: string,
    @Body() body: { executedBy: string }
  ) {
    if (process.env.ADMIN_TOKEN && adminHeader !== process.env.ADMIN_TOKEN) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const { executedBy } = body;
    
    this.logger.log(`Executing rollback ${id} by ${executedBy}`);
    
    try {
      const rollbackResult = this.policyRollbackService.executeRollback(id);

      return {
        success: true,
        data: rollbackResult,
        message: 'Rollback executed successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to execute rollback: ${msg}`);
      
      return {
        success: false,
        error: msg,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 롤백 요청을 조회합니다.
   */
  @Get('rollbacks/:id')
  async getRollbackRequest(@Param('id') id: string) {
    const rollbackRequest = this.policyRollbackService.getRollbackRequest(id);
    
    if (!rollbackRequest) {
      return {
        success: false,
        error: 'Rollback request not found',
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      data: rollbackRequest,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 정책의 모든 롤백 요청을 조회합니다.
   */
  @Get('policies/:id/rollbacks')
  async getRollbackRequestsByPolicy(@Param('id') id: string) {
    const rollbackRequests = this.policyRollbackService.getRollbackRequestsByPolicy(id);
    
    return {
      success: true,
      data: rollbackRequests,
      count: rollbackRequests.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 모든 롤백 요청을 조회합니다.
   */
  @Get('rollbacks')
  async getAllRollbackRequests() {
    const rollbackRequests = this.policyRollbackService.getAllRollbackRequests();
    
    return {
      success: true,
      data: rollbackRequests,
      count: rollbackRequests.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 정책의 롤백 이력을 조회합니다.
   */
  @Get('policies/:id/rollback-history')
  async getRollbackHistory(@Param('id') id: string) {
    const rollbackHistory = this.policyRollbackService.getRollbackHistory(id);
    
    return {
      success: true,
      data: rollbackHistory,
      count: rollbackHistory.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 모든 롤백 이력을 조회합니다.
   */
  @Get('rollbacks/history')
  async getAllRollbackHistory() {
    const rollbackHistory = this.policyRollbackService.getAllRollbackHistory();
    
    return {
      success: true,
      data: rollbackHistory,
      count: rollbackHistory.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 롤백 통계를 조회합니다.
   */
  @Get('rollbacks/stats')
  async getRollbackStats() {
    const stats = this.policyRollbackService.getRollbackStats();
    
    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 롤백 가능한 버전 목록을 조회합니다.
   */
  @Get('policies/:id/rollbackable-versions')
  async getRollbackableVersions(@Param('id') id: string) {
    const rollbackableVersions = this.policyRollbackService.getRollbackableVersions(id);
    
    return {
      success: true,
      data: rollbackableVersions,
      count: rollbackableVersions.length,
      timestamp: new Date().toISOString()
    };
  }
}

