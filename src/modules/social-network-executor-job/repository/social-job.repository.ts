import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';

import { SocialJobEntity } from '../domain/entities/social-job.entity';
import { SocialJobStatus } from '../domain/enums/social-job-status.enum';

@Injectable()
export class SocialJobRepository {
  constructor(
    @InjectRepository(SocialJobEntity)
    private readonly repository: Repository<SocialJobEntity>,
  ) {}

  create(data: DeepPartial<SocialJobEntity>): SocialJobEntity {
    return this.repository.create(data);
  }

  async save(entity: SocialJobEntity): Promise<SocialJobEntity> {
    return this.repository.save(entity);
  }

  findById(id: string): Promise<SocialJobEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  findAll(): Promise<SocialJobEntity[]> {
    return this.repository.find();
  }

  findByStatus(status: SocialJobStatus): Promise<SocialJobEntity[]> {
    return this.repository.find({ where: { status } });
  }

  async update(
    id: string,
    data: DeepPartial<SocialJobEntity>,
  ): Promise<SocialJobEntity | null> {
    await this.repository.update({ id }, data);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  async markProcessing(id: string): Promise<SocialJobEntity | null> {
    const now = new Date();
    await this.repository.update(
      { id },
      { status: SocialJobStatus.PROCESSING, startedAt: now, finishedAt: null },
    );
    return this.findById(id);
  }

  async markSuccess(
    id: string,
    result?: Record<string, any>,
  ): Promise<SocialJobEntity | null> {
    const now = new Date();
    await this.repository.update(
      { id },
      {
        status: SocialJobStatus.SUCCESS,
        result: result ?? null,
        error: null,
        finishedAt: now,
      },
    );
    return this.findById(id);
  }

  async markFailed(
    id: string,
    error?: Record<string, any>,
  ): Promise<SocialJobEntity | null> {
    const now = new Date();
    await this.repository.update(
      { id },
      {
        status: SocialJobStatus.FAILED,
        error: error ?? null,
        finishedAt: now,
      },
    );
    return this.findById(id);
  }

  async updateStatus(
    id: string,
    status: SocialJobStatus,
    extras: Partial<Pick<SocialJobEntity, 'result' | 'error' | 'startedAt' | 'finishedAt'>> = {},
  ): Promise<SocialJobEntity | null> {
    const data: DeepPartial<SocialJobEntity> = { status, ...extras };
    await this.repository.update({ id } as FindOptionsWhere<SocialJobEntity>, data);
    return this.findById(id);
  }
}
