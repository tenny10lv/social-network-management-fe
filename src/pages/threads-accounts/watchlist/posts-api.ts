import { buildApiUrl } from '@/lib/api';

const DEFAULT_ERROR_MESSAGE = 'Failed to load crawled posts. Please try again.';

export type ThreadMediaItem = {
  url: string;
  previewUrl?: string | null;
  thumbnailUrl?: string | null;
  type?: string | null;
};

export enum ThreadsPostType {
  NORMAL = 'NORMAL',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  SHORT = 'SHORT',
}

export type ThreadPost = {
  id: string;
  pk: string | null;
  postId: string | null;
  code: string | null;
  replyToId: string | null;
  isReply: boolean;
  isPostUnavailable: boolean;
  isPinned: boolean;
  takenAt: string | null;
  likeCount: number;
  caption: string | null;
  captionIsEdited: boolean;
  replyControl: string | null;
  textFragments: string[];
  imageMediaItems: ThreadMediaItem[];
  videoMediaItems: ThreadMediaItem[];
  audioMediaItems: ThreadMediaItem[];
  mentions: string[];
  type: ThreadsPostType | null;
  threadsWatchlistAccountId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
};

export type ThreadPostListResponse = {
  data: ThreadPost[];
  meta: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
  };
};

export type GetThreadPostsParams = {
  page: number;
  limit: number;
  threadsWatchlistAccountId: string;
  isPinned?: boolean;
  isReply?: boolean;
  keyword?: string;
  type?: ThreadsPostType;
  replyToId?: string;
};

export const THREAD_POSTS_QUERY_KEY = ['threads', 'posts'] as const;

const normalizeString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const normalizeBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    if (['true', '1', 'yes'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }
  }

  return false;
};

const normalizeNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const normalizeDate = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const timestamp = Date.parse(trimmed);

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
};

const extractErrorMessage = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const candidates = ['message', 'error', 'detail'];

  for (const key of candidates) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const normalizeMediaItem = (value: unknown): ThreadMediaItem | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const url =
    normalizeString(record.url) ??
    normalizeString(record.src) ??
    normalizeString(record.sourceUrl ?? record.source_url) ??
    normalizeString(record.imageUrl ?? record.image_url) ??
    normalizeString(record.videoUrl ?? record.video_url) ??
    normalizeString(record.permalink) ??
    null;

  if (!url) {
    return null;
  }

  return {
    url,
    previewUrl: normalizeString(record.previewUrl ?? record.preview_url ?? record.originalUrl ?? record.original_url),
    thumbnailUrl: normalizeString(record.thumbnailUrl ?? record.thumbnail_url ?? record.thumbnail),
    type: normalizeString(record.type) as ThreadsPostType | null,
  };
};

const collectTextFragments = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim();
      }

      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const candidate =
          normalizeString(record.text) ??
          normalizeString(record.plainText ?? record.plain_text) ??
          normalizeString(record.value);

        return candidate ?? null;
      }

      return null;
    })
    .filter((fragment): fragment is string => Boolean(fragment));
};

const extractCaption = (caption: unknown, textFragments: string[]): string | null => {
  if (typeof caption === 'string') {
    return caption.trim() || null;
  }

  if (caption && typeof caption === 'object') {
    const record = caption as Record<string, unknown>;
    const candidate =
      normalizeString(record.text) ??
      normalizeString(record.caption) ??
      normalizeString(record.plainText ?? record.plain_text) ??
      normalizeString(record.body);

    if (candidate) {
      return candidate;
    }
  }

  if (textFragments.length > 0) {
    const combined = textFragments.join(' ').trim();
    return combined || null;
  }

  return null;
};

const normalizeThreadPost = (value: unknown): ThreadPost | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id =
    normalizeString(record.id) ?? normalizeString(record.postId ?? record.post_id) ?? normalizeString(record.pk);

  if (!id) {
    return null;
  }

  const textFragments = collectTextFragments(record.textFragments ?? record.text_fragments);
  const imageMediaItems =
    Array.isArray(record.imageMediaItems ?? record.image_media_items) && (record.imageMediaItems ?? record.image_media_items)
      ? (record.imageMediaItems ?? record.image_media_items)
          .map((item) => normalizeMediaItem(item))
          .filter((item): item is ThreadMediaItem => Boolean(item))
      : [];
  const videoMediaItems =
    Array.isArray(record.videoMediaItems ?? record.video_media_items) && (record.videoMediaItems ?? record.video_media_items)
      ? (record.videoMediaItems ?? record.video_media_items)
          .map((item) => normalizeMediaItem(item))
          .filter((item): item is ThreadMediaItem => Boolean(item))
      : [];
  const audioMediaItems =
    Array.isArray(record.audioMediaItems ?? record.audio_media_items) && (record.audioMediaItems ?? record.audio_media_items)
      ? (record.audioMediaItems ?? record.audio_media_items)
          .map((item) => normalizeMediaItem(item))
          .filter((item): item is ThreadMediaItem => Boolean(item))
      : [];

  return {
    id,
    pk: normalizeString(record.pk),
    postId: normalizeString(record.postId ?? record.post_id),
    code: normalizeString(record.code),
    replyToId: normalizeString(record.replyToId ?? record.reply_to_id),
    isReply: normalizeBoolean(record.isReply ?? record.is_reply),
    isPostUnavailable: normalizeBoolean(record.isPostUnavailable ?? record.is_post_unavailable),
    isPinned: normalizeBoolean(record.isPinned ?? record.is_pinned),
    takenAt: normalizeDate(record.takenAt ?? record.taken_at),
    likeCount: normalizeNumber(record.likeCount ?? record.like_count),
    caption: extractCaption(record.caption, textFragments),
    captionIsEdited: normalizeBoolean(record.captionIsEdited ?? record.caption_is_edited),
    replyControl: normalizeString(record.replyControl ?? record.reply_control),
    textFragments,
    imageMediaItems,
    videoMediaItems,
    audioMediaItems,
    mentions: Array.isArray(record.mentions)
      ? (record.mentions as unknown[])
          .map((item) => (typeof item === 'string' ? item.trim() : null))
          .filter((item): item is string => Boolean(item))
      : [],
    type: normalizeString(record.type),
    threadsWatchlistAccountId: normalizeString(record.threadsWatchlistAccountId ?? record.threads_watchlist_account_id),
    createdAt: normalizeDate(record.createdAt ?? record.created_at),
    updatedAt: normalizeDate(record.updatedAt ?? record.updated_at),
    deletedAt: normalizeDate(record.deletedAt ?? record.deleted_at),
  };
};

const buildMeta = (meta: unknown, fallbackPage: number, fallbackLimit: number, fallbackTotal: number) => {
  const source = meta && typeof meta === 'object' ? (meta as Record<string, unknown>) : {};
  const limit = normalizeNumber(source.limit ?? source.perPage ?? source.per_page) || fallbackLimit || 1;
  const page = normalizeNumber(source.page) || fallbackPage || 1;
  const totalCount = normalizeNumber(source.totalCount ?? source.total ?? source.count) || fallbackTotal || 0;
  const totalPages =
    normalizeNumber(source.totalPages ?? source.total_pages) ||
    (limit > 0 ? Math.max(1, Math.ceil(totalCount / limit)) : 1);

  return {
    page,
    limit,
    totalPages,
    totalCount,
  };
};

export async function getThreadPosts({
  page,
  limit,
  threadsWatchlistAccountId,
  isPinned,
  isReply,
  keyword,
  type,
  replyToId,
}: GetThreadPostsParams): Promise<ThreadPostListResponse> {
  const sanitizedAccountId = threadsWatchlistAccountId?.trim();

  if (!sanitizedAccountId) {
    throw new Error('threadsWatchlistAccountId is required to load crawled posts.');
  }

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    threadsWatchlistAccountId: sanitizedAccountId,
  });

  if (typeof isPinned === 'boolean') {
    params.set('isPinned', String(isPinned));
  }

  if (typeof isReply === 'boolean') {
    params.set('isReply', String(isReply));
  }

  if (keyword) {
    params.set('keyword', keyword.trim());
  }

  if (type) {
    params.set('type', type);
  }

  if (replyToId) {
    params.set('replyToId', replyToId);
  }

  const response = await fetch(buildApiUrl(`threads/posts?${params.toString()}`), {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'x-custom-lang': 'en',
    },
  });

  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error('Invalid server response.');
    }
  }

  if (!response.ok) {
    const message = extractErrorMessage(payload) ?? DEFAULT_ERROR_MESSAGE;
    throw new Error(message);
  }

  const rawData = Array.isArray((payload as Record<string, unknown> | null)?.data)
    ? ((payload as Record<string, unknown>).data as unknown[])
    : [];

  const data = rawData.map((item) => normalizeThreadPost(item)).filter((item): item is ThreadPost => Boolean(item));
  const meta = buildMeta((payload as Record<string, unknown> | null)?.meta, page, limit, data.length);

  return {
    data,
    meta,
  };
}
