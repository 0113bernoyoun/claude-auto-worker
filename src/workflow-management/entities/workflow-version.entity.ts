import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Workflow } from './workflow.entity';

@Entity('workflow_versions')
export class WorkflowVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  workflowId!: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  version!: string;

  @Column({ type: 'text', nullable: false })
  content!: string; // 해당 버전의 워크플로우 내용

  @Column({ type: 'varchar', length: 100, nullable: false })
  createdBy!: string;

  @Column({ type: 'text', nullable: true })
  changeReason?: string;

  @Column({ type: 'json', nullable: true })
  changes?: Record<string, any>; // 변경사항 상세 정보

  @Column({ type: 'boolean', default: false })
  isCurrent!: boolean; // 현재 활성 버전 여부

  @CreateDateColumn()
  createdAt!: Date;

  // 관계 설정
  @ManyToOne(() => Workflow, workflow => workflow.versions)
  @JoinColumn({ name: 'workflowId' })
  workflow?: Workflow;
}
