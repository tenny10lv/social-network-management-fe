import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AuditBaseEntity } from '../../../common/domain/entities/audit-base.entity';
import { SocialJobStatus } from '../enums/social-job-status.enum';

@Entity({ name: 'social_network_executor_job' })
export class SocialJobEntity extends AuditBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  platform!: 'threads' | 'facebook' | 'tiktok' | 'instagram';

  @Column({ type: 'varchar' })
  action!: 'login' | 'publish' | 'comment' | 'like' | 'logout';

  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, any> | null;

  @Column({
    type: 'enum',
    enum: SocialJobStatus,
    default: SocialJobStatus.PENDING,
  })
  status!: SocialJobStatus;

  @Column({ type: 'jsonb', nullable: true })
  result?: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  error?: Record<string, any> | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt?: Date | null;
}
