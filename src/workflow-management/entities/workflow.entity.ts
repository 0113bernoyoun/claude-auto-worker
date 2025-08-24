import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { WorkflowComment } from './workflow-comment.entity';
import { WorkflowMetadata } from './workflow-metadata.entity';
import { WorkflowShare } from './workflow-share.entity';
import { WorkflowVersion } from './workflow-version.entity';

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: false })
  content!: string; // YAML/JSON 워크플로우 내용

  @Column({ type: 'varchar', length: 50, default: '1.0.0' })
  version!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  createdBy!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  teamId?: string;

  @Column({ type: 'boolean', default: false })
  isPublic!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status!: 'draft' | 'published' | 'archived';

  @Column({ type: 'json', nullable: true })
  tags?: string[];

  @Column({ type: 'json', nullable: true })
  categories?: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // 관계 설정
  @OneToMany(() => WorkflowShare, share => share.workflow)
  shares?: WorkflowShare[];

  @OneToMany(() => WorkflowComment, comment => comment.workflow)
  comments?: WorkflowComment[];

  @OneToMany(() => WorkflowVersion, version => version.workflow)
  versions?: WorkflowVersion[];

  @OneToMany(() => WorkflowMetadata, metadata => metadata.workflow)
  metadata?: WorkflowMetadata[];
}
