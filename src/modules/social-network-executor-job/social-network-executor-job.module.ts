import { Module } from '@nestjs/common';

import { SocialNetworkExecutorJobController } from './controller/social-network-executor-job.controller';
import { SocialNetworkExecutorJobRelationalPersistenceModule } from './infrastructure/persistence/relational/social-network-executor-job-relational-persistence.module';
import { SocialNetworkExecutorJobService } from './service/social-network-executor-job.service';

@Module({
  imports: [SocialNetworkExecutorJobRelationalPersistenceModule],
  controllers: [SocialNetworkExecutorJobController],
  providers: [SocialNetworkExecutorJobService],
  exports: [SocialNetworkExecutorJobService],
})
export class SocialNetworkExecutorJobModule {}
