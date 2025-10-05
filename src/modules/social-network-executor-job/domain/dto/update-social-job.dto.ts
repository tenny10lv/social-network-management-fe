import { SocialJobStatus } from '../enums/social-job-status.enum';

export class UpdateSocialJobDto {
  platform?: 'threads' | 'facebook' | 'tiktok' | 'instagram';
  action?: 'login' | 'publish' | 'comment' | 'like' | 'logout';
  payload?: Record<string, any> | null;
  status?: SocialJobStatus;
  result?: Record<string, any> | null;
  error?: Record<string, any> | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
}
