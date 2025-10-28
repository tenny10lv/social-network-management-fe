export type SentimentLevel = 'positive' | 'neutral' | 'negative';

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

export interface WatchlistAccount {
  id: string;
  handle: string;
  displayName: string;
  platform: 'Threads' | 'Instagram' | 'TikTok' | 'X';
  category: string;
  tags: string[];
  monitoringSince: string;
  lastCrawledAt: string;
  crawlFrequency: 'Hourly' | 'Daily' | 'Weekly';
  sentimentTrend: SentimentLevel;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'monitoring' | 'paused';
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
