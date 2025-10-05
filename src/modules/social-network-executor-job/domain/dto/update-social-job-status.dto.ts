import { SocialJobStatus } from '../enums/social-job-status.enum';

export class UpdateSocialJobStatusDto {
  status!: SocialJobStatus;
  result?: Record<string, any> | null;
  error?: Record<string, any> | null;
}
