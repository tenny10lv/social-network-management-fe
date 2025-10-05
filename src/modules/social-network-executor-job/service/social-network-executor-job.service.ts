import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateSocialJobDto } from '../domain/dto/create-social-job.dto';
import { UpdateSocialJobDto } from '../domain/dto/update-social-job.dto';
import { UpdateSocialJobStatusDto } from '../domain/dto/update-social-job-status.dto';
import { SocialJobEntity } from '../domain/entities/social-job.entity';
import { SocialJobStatus } from '../domain/enums/social-job-status.enum';
import { SocialJobRepository } from '../repository/social-job.repository';

@Injectable()
export class SocialNetworkExecutorJobService {
  constructor(private readonly repository: SocialJobRepository) {}

  async create(payload: CreateSocialJobDto): Promise<SocialJobEntity> {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  async findById(id: string): Promise<SocialJobEntity> {
    const job = await this.repository.findById(id);
    if (!job) {
      throw new NotFoundException(`Social job with id ${id} not found`);
    }
    return job;
  }

  findAll(status?: SocialJobStatus): Promise<SocialJobEntity[]> {
    if (status) {
      return this.repository.findByStatus(status);
    }
    return this.repository.findAll();
  }

  async update(
    id: string,
    payload: UpdateSocialJobDto,
  ): Promise<SocialJobEntity> {
    const updated = await this.repository.update(id, payload);
    if (!updated) {
      throw new NotFoundException(`Social job with id ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.repository.remove(id);
  }

  async updateStatus(
    id: string,
    { status, result, error }: UpdateSocialJobStatusDto,
  ): Promise<SocialJobEntity> {
    switch (status) {
      case SocialJobStatus.PROCESSING:
        return this.ensureJob(await this.repository.markProcessing(id), id);
      case SocialJobStatus.SUCCESS:
        return this.ensureJob(await this.repository.markSuccess(id, result), id);
      case SocialJobStatus.FAILED:
        return this.ensureJob(await this.repository.markFailed(id, error), id);
      case SocialJobStatus.TIMEOUT:
        return this.ensureJob(
          await this.repository.updateStatus(id, SocialJobStatus.TIMEOUT, {
            error,
            finishedAt: new Date(),
          }),
          id,
        );
      case SocialJobStatus.PENDING:
      default:
        return this.ensureJob(
          await this.repository.updateStatus(id, status, {
            result,
            error,
            startedAt: status === SocialJobStatus.PENDING ? null : undefined,
            finishedAt: null,
          }),
          id,
        );
    }
  }

  private ensureJob(
    job: SocialJobEntity | null,
    id: string,
  ): SocialJobEntity {
    if (!job) {
      throw new NotFoundException(`Social job with id ${id} not found`);
    }
    return job;
  }
}
