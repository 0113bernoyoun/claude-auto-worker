import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

export interface CreateWorkflowDto {
  name: string;
  description?: string;
  content: string;
  version?: string;
  createdBy: string;
  teamId?: string;
  isPublic?: boolean;
  tags?: string[];
  categories?: string[];
}

export interface UpdateWorkflowDto {
  name?: string;
  description?: string;
  content?: string;
  version?: string;
  status?: 'draft' | 'published' | 'archived';
  tags?: string[];
  categories?: string[];
}

export interface SearchWorkflowDto {
  query?: string;
  tags?: string[];
  categories?: string[];
  status?: string;
  teamId?: string;
  createdBy?: string;
  isPublic?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  content: string;
  version: string;
  createdBy: string;
  teamId?: string;
  isPublic: boolean;
  isActive: boolean;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  categories: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: string;
  content: string;
  createdBy: string;
  changeReason?: string;
  changes?: Record<string, any>;
  isCurrent: boolean;
  createdAt: Date;
}

@Injectable()
export class WorkflowRepositoryService {
  private readonly logger = new Logger(WorkflowRepositoryService.name);
  private workflows: Map<string, Workflow> = new Map();
  private versions: Map<string, WorkflowVersion[]> = new Map();
  private nextId = 1;

  /**
   * 새로운 워크플로우를 생성합니다.
   */
  async createWorkflow(createDto: CreateWorkflowDto): Promise<Workflow> {
    try {
      const id = `wf-${this.nextId++}`;
      const now = new Date();
      
      const workflow: Workflow = {
        id,
        name: createDto.name,
        description: createDto.description,
        content: createDto.content,
        version: createDto.version || '1.0.0',
        createdBy: createDto.createdBy,
        teamId: createDto.teamId,
        isPublic: createDto.isPublic || false,
        isActive: true,
        status: 'draft',
        tags: createDto.tags || [],
        categories: createDto.categories || [],
        createdAt: now,
        updatedAt: now,
      };

      this.workflows.set(id, workflow);

      // 초기 버전 생성
      await this.createVersion(id, {
        version: workflow.version,
        content: workflow.content,
        createdBy: workflow.createdBy,
        changeReason: 'Initial workflow creation',
        isCurrent: true,
      });

      this.logger.log(`Workflow created: ${id} by ${workflow.createdBy}`);
      return workflow;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to create workflow: ${errorMessage}`);
      throw new BadRequestException('Failed to create workflow');
    }
  }

  /**
   * 워크플로우를 업데이트합니다.
   */
  async updateWorkflow(id: string, updateDto: UpdateWorkflowDto, updatedBy: string): Promise<Workflow> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    // 버전 관리: 내용이 변경된 경우 새 버전 생성
    if (updateDto.content && updateDto.content !== workflow.content) {
      const newVersion = this.incrementVersion(workflow.version);
      
      // 이전 버전을 비활성화
      const workflowVersions = this.versions.get(id) || [];
      workflowVersions.forEach(v => v.isCurrent = false);

      // 새 버전 생성
      await this.createVersion(id, {
        version: newVersion,
        content: updateDto.content,
        createdBy: updatedBy,
        changeReason: updateDto.description || 'Workflow updated',
        isCurrent: true,
      });

      updateDto.version = newVersion;
    }

    // 워크플로우 업데이트
    Object.assign(workflow, updateDto);
    workflow.updatedAt = new Date();

    this.workflows.set(id, workflow);
    this.logger.log(`Workflow updated: ${id} by ${updatedBy}`);
    
    return workflow;
  }

  /**
   * 워크플로우를 삭제합니다.
   */
  async deleteWorkflow(id: string, deletedBy: string): Promise<boolean> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    // 실제 삭제 대신 아카이브 처리
    workflow.status = 'archived';
    workflow.isActive = false;
    workflow.updatedAt = new Date();

    this.workflows.set(id, workflow);
    this.logger.log(`Workflow archived: ${id} by ${deletedBy}`);
    
    return true;
  }

  /**
   * 워크플로우를 조회합니다.
   */
  async getWorkflow(id: string): Promise<Workflow> {
    const workflow = this.workflows.get(id);
    if (!workflow || !workflow.isActive) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    return workflow;
  }

  /**
   * 워크플로우 목록을 검색합니다.
   */
  async searchWorkflows(searchDto: SearchWorkflowDto): Promise<{ workflows: Workflow[]; total: number }> {
    let workflows = Array.from(this.workflows.values()).filter(w => w.isActive);
    const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'DESC' } = searchDto;

    // 검색 조건 적용
    if (searchDto.query) {
      workflows = workflows.filter(w => w.name.toLowerCase().includes(searchDto.query!.toLowerCase()));
    }

    if (searchDto.tags && searchDto.tags.length > 0) {
      workflows = workflows.filter(w => searchDto.tags!.some(tag => w.tags.includes(tag)));
    }

    if (searchDto.categories && searchDto.categories.length > 0) {
      workflows = workflows.filter(w => searchDto.categories!.some(cat => w.categories.includes(cat)));
    }

    if (searchDto.status) {
      workflows = workflows.filter(w => w.status === searchDto.status);
    }

    if (searchDto.teamId) {
      workflows = workflows.filter(w => w.teamId === searchDto.teamId);
    }

    if (searchDto.createdBy) {
      workflows = workflows.filter(w => w.createdBy === searchDto.createdBy);
    }

    if (searchDto.isPublic !== undefined) {
      workflows = workflows.filter(w => w.isPublic === searchDto.isPublic);
    }

    // 정렬
    workflows.sort((a, b) => {
      const aValue = a[sortBy as keyof Workflow];
      const bValue = b[sortBy as keyof Workflow];
      
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

    const total = workflows.length;
    const paginatedWorkflows = workflows.slice(offset, offset + limit);

    return { workflows: paginatedWorkflows, total };
  }

  /**
   * 워크플로우를 복사합니다.
   */
  async copyWorkflow(id: string, copiedBy: string, newName?: string): Promise<Workflow> {
    const originalWorkflow = await this.getWorkflow(id);
    
    const copyWorkflow = await this.createWorkflow({
      name: newName || `${originalWorkflow.name} (Copy)`,
      description: originalWorkflow.description,
      content: originalWorkflow.content,
      version: '1.0.0',
      createdBy: copiedBy,
      teamId: originalWorkflow.teamId,
      isPublic: false,
      tags: [...originalWorkflow.tags],
      categories: [...originalWorkflow.categories],
    });

    this.logger.log(`Workflow copied: ${id} -> ${copyWorkflow.id} by ${copiedBy}`);
    return copyWorkflow;
  }

  /**
   * 워크플로우 버전을 생성합니다.
   */
  private async createVersion(
    workflowId: string,
    versionData: {
      version: string;
      content: string;
      createdBy: string;
      changeReason?: string;
      isCurrent: boolean;
    }
  ): Promise<WorkflowVersion> {
    const version: WorkflowVersion = {
      id: `v-${Date.now()}`,
      workflowId,
      ...versionData,
      createdAt: new Date(),
    };

    if (!this.versions.has(workflowId)) {
      this.versions.set(workflowId, []);
    }
    
    this.versions.get(workflowId)!.push(version);
    return version;
  }

  /**
   * 버전 번호를 증가시킵니다.
   */
  private incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.');
    if (parts.length === 3) {
      const major = parseInt(parts[0] || '0');
      const minor = parseInt(parts[1] || '0');
      const patch = parseInt(parts[2] || '0');
      return `${major}.${minor}.${patch + 1}`;
    }
    return `${currentVersion}.1`;
  }

  /**
   * 워크플로우 통계를 조회합니다.
   */
  async getWorkflowStats(teamId?: string): Promise<{
    total: number;
    published: number;
    draft: number;
    archived: number;
    publicCount: number;
    privateCount: number;
  }> {
    let workflows = Array.from(this.workflows.values()).filter(w => w.isActive);
    
    if (teamId) {
      workflows = workflows.filter(w => w.teamId === teamId);
    }

    const total = workflows.length;
    const published = workflows.filter(w => w.status === 'published').length;
    const draft = workflows.filter(w => w.status === 'draft').length;
    const archived = workflows.filter(w => w.status === 'archived').length;
    const publicCount = workflows.filter(w => w.isPublic).length;
    const privateCount = workflows.filter(w => !w.isPublic).length;

    return { total, published, draft, archived, publicCount, privateCount };
  }
}
