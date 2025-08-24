import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Workflow } from './workflow.entity';

@Entity('workflow_metadata')
export class WorkflowMetadata {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  workflowId!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  key!: string;

  @Column({ type: 'text', nullable: true })
  value?: string;

  @Column({ type: 'json', nullable: true })
  jsonValue?: any; // JSON 형태의 복잡한 값

  @Column({ type: 'varchar', length: 50, default: 'string' })
  type!: 'string' | 'number' | 'boolean' | 'json' | 'date';

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // 관계 설정
  @ManyToOne(() => Workflow, workflow => workflow.metadata)
  @JoinColumn({ name: 'workflowId' })
  workflow?: Workflow;
}
