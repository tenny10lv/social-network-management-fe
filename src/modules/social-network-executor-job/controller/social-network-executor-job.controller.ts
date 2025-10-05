import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CreateSocialJobDto } from '../domain/dto/create-social-job.dto';
import { UpdateSocialJobStatusDto } from '../domain/dto/update-social-job-status.dto';
import { SocialJobEntity } from '../domain/entities/social-job.entity';
import { SocialJobStatus } from '../domain/enums/social-job-status.enum';
import { SocialNetworkExecutorJobService } from '../service/social-network-executor-job.service';

@Controller('social-network-executor-jobs')
export class SocialNetworkExecutorJobController {
  constructor(
    private readonly service: SocialNetworkExecutorJobService,
  ) {}

  @Post()
  create(@Body() payload: CreateSocialJobDto): Promise<SocialJobEntity> {
    return this.service.create(payload);
  }

  @Get(':id')
  getById(@Param('id') id: string): Promise<SocialJobEntity> {
    return this.service.findById(id);
  }

  @Get()
  list(
    @Query('status') status?: SocialJobStatus,
  ): Promise<SocialJobEntity[]> {
    return this.service.findAll(status);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() payload: UpdateSocialJobStatusDto,
  ): Promise<SocialJobEntity> {
    return this.service.updateStatus(id, payload);
  }
}
