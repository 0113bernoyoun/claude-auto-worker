import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Workflow } from './workflow.entity';

@Entity('workflow_comments')
export class WorkflowComment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  workflowId!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  userId!: string;

  @Column({ type: 'text', nullable: false })
  content!: string;

  @Column({ type: 'varchar', length: 50, default: 'comment' })
  type!: 'comment' | 'feedback' | 'review' | 'suggestion';

  @Column({ type: 'varchar', length: 100, nullable: true })
  parentCommentId?: string; // 대댓글 지원

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>; // 추가 메타데이터 (예: 첨부파일, 링크 등)

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // 관계 설정
  @ManyToOne(() => Workflow, workflow => workflow.comments)
  @JoinColumn({ name: 'workflowId' })
  workflow?: Workflow;
}
