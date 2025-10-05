import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SocialJobEntity } from '../../../domain/entities/social-job.entity';
import { SocialJobRepository } from '../../../repository/social-job.repository';

@Module({
  imports: [TypeOrmModule.forFeature([SocialJobEntity])],
  providers: [SocialJobRepository],
  exports: [SocialJobRepository],
})
export class SocialNetworkExecutorJobRelationalPersistenceModule {}
