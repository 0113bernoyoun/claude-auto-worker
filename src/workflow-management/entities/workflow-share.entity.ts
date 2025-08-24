import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Workflow } from './workflow.entity';

@Entity('workflow_shares')
@Unique(['workflowId', 'userId'])
export class WorkflowShare {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  workflowId!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  userId!: string;

  @Column({ type: 'varchar', length: 50, nullable: false, default: 'read' })
  permission!: 'read' | 'write' | 'admin';

  @Column({ type: 'varchar', length: 100, nullable: true })
  grantedBy?: string;

  @Column({ type: 'datetime', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  // 관계 설정
  @ManyToOne(() => Workflow, workflow => workflow.shares)
  @JoinColumn({ name: 'workflowId' })
  workflow?: Workflow;
}
