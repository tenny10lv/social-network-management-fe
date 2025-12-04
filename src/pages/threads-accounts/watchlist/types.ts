export type SentimentLevel = 'positive' | 'neutral' | 'negative';

export interface WatchlistAccount {
  id: string;
  username: string;
  status?: string | null;
  category?: { id: string; name: string } | null;
  jobId?: string | null;
  accountName?: string | null;
  email?: string | null;
  fullName?: string | null;
  pk?: string | null;
  biography?: string | null;
  profilePicUrl?: string | null;
  profilePicFileId?: string | null;
  followerCount?: number | null;
  textPostAppIsPrivate?: boolean | null;
  hasOnboardedToTextPostApp?: boolean | null;
  isVerified?: boolean | null;
  categoryId?: string | null;
  userId?: string | null;
  note?: string | null;
  lastSyncedAt?: string | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

export type WatchlistAccountsResponse = {
  data: WatchlistAccount[];
  meta: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
  };
};

export interface MyThreadsAccount {
  id: string;
  handle: string;
  displayName: string;
  followerCount: number;
  timezone: string;
  status: 'active' | 'paused';
  isPrimary?: boolean;
  lastPublishedAt?: string | null;
  avatarUrl?: string;
}

export interface WatchlistAccountRow {
  id: string;
  username: string;
  handle: string;
  displayName: string;
  platform: 'Threads' | 'Instagram' | 'TikTok' | 'X';
  category: string;
  tags: string[];
  lastCrawledAt: string;
  crawlFrequency: 'Hourly' | 'Daily' | 'Weekly';
  riskLevel: 'low' | 'medium' | 'high';
  avatarUrl: string;
}

export interface PostMediaImage {
  src: string;
  full?: string;
  alt?: string;
}

export interface PostMediaVideo {
  src: string;
  thumbnail?: string;
  title?: string;
}

export interface CrawledPost {
  id: string;
  watchlistAccountId: string;
  content: string;
  capturedAt: string;
  language: string;
  topics: string[];
  mediaType: 'text' | 'image' | 'video';
  previewImage?: string;
  images?: PostMediaImage[];
  videos?: PostMediaVideo[];
  status: 'draft' | 'ready' | 'scheduled' | 'published';
  scheduledFor?: string;
  publishedAt?: string;
  targetAccountId?: string;
  sentiment: SentimentLevel;
  likes: number;
  replies: number;
  reposts: number;
  editorNotes?: string;
}

export interface PublishingTask {
  id: string;
  postId: string;
  watchlistAccountId: string;
  targetAccountId: string;
  action: 'publish' | 'schedule';
  status: 'scheduled' | 'completed' | 'cancelled';
  scheduledFor?: string;
  executedAt?: string;
  notes?: string;
}
