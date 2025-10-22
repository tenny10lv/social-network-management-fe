export type SentimentLevel = 'positive' | 'neutral' | 'negative';

export type CrawlExecutionStatus = 'success' | 'failed' | 'scheduled' | 'running';

export interface TrendPoint {
  date: string;
  value: number;
}

export interface EngagementPoint {
  date: string;
  engagementRate: number;
}

export interface PostFrequencyPoint {
  date: string;
  posts: number;
}

export interface Watcher {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
}

export interface AlertSettings {
  notifyOnNewPost: boolean;
  notifyOnFollowerSpike: boolean;
  notifyOnEngagementDrop: boolean;
}

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
  username: string;
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
  followerCount: number;
  followerGrowth: TrendPoint[];
  engagementRateTrend: EngagementPoint[];
  postFrequencyTrend: PostFrequencyPoint[];
  avgEngagementRate: number;
  note?: string;
  watcher?: Watcher | null;
  alerts?: AlertSettings;
  lastCrawlStatus: CrawlExecutionStatus;
  lastCrawlMessage?: string | null;
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
  hashtags?: string[];
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
  originalUrl?: string;
  sentimentScore?: number;
  categoryTags?: string[];
  collections?: string[];
  mediaUrl?: string;
  engagementRate?: number;
  createdAt?: string;
}

export interface PostEngagementPoint {
  date: string;
  likes: number;
  comments: number;
  reposts: number;
}

export interface PostAnalyticsSummary {
  topHashtags: { label: string; value: number }[];
  engagementOverTime: TrendPoint[];
}

export interface PostDetail extends CrawledPost {
  accountDisplayName: string;
  accountHandle: string;
  mediaUrls?: string[];
  sentimentSummary?: string;
}

export interface WatchlistAnalyticsSummary {
  followerGrowth: TrendPoint[];
  engagementRates: { label: string; value: number }[];
}

export interface AccountComparisonDataset {
  accountId: string;
  accountName: string;
  followerGrowth: TrendPoint[];
  postFrequency: PostFrequencyPoint[];
  engagement: EngagementPoint[];
}

export interface GlobalCrawlStatus {
  completedAt: string;
  status: CrawlExecutionStatus | 'idle';
  triggeredBy?: string;
}

export interface CollectionOption {
  id: string;
  name: string;
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
