import { axiosInstance } from '@/lib/axios-instance';
import {
  AccountComparisonDataset,
  AlertSettings,
  CrawledPost,
  GlobalCrawlStatus,
  PostAnalyticsSummary,
  PostDetail,
  Watcher,
  WatchlistAccount,
  WatchlistAnalyticsSummary,
} from './types';

const WATCHLIST_ACCOUNTS_ENDPOINT = 'threads/watchlist/accounts';
const WATCHLIST_POSTS_ENDPOINT = 'threads/watchlist/posts';

type ApiEnvelope<T> = { data: T } | T;

const unwrap = <T>(payload: ApiEnvelope<T>): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
};

type PaginatedResponse<T> = {
  data: T[];
  meta?: {
    total: number;
    page: number;
    perPage: number;
  };
};

export type CreateWatchlistAccountArgs = {
  username: string;
};

export type FetchWatchlistAccountsParams = {
  search?: string;
  platform?: string;
  risk?: string;
  page?: number;
  perPage?: number;
};

export type UpdateWatchlistAccountPayload = Pick<WatchlistAccount, 'category' | 'note' | 'riskLevel' | 'tags'>;

export type AssignWatcherPayload = {
  watcherId: string | null;
};

export type UpdateAlertSettingsPayload = AlertSettings;

export type FetchWatchlistPostsParams = {
  accountId: string;
  search?: string;
  status?: string;
  sentiment?: string;
  mediaType?: string;
  page?: number;
  perPage?: number;
  sort?: string;
};

export type ExportPostsPayload = {
  accountId: string;
  filters: Omit<FetchWatchlistPostsParams, 'accountId' | 'page' | 'perPage'>;
  format: 'csv' | 'xlsx';
  postIds?: string[];
};

export type BulkDeletePostsPayload = {
  postIds: string[];
};

export type AddToCollectionPayload = {
  postIds: string[];
  collectionId?: string;
  name?: string;
};

export type RepublishPostPayload = {
  postId: string;
  targetAccountId: string;
  scheduledFor?: string;
  note?: string;
};

export type AuditLogPayload = {
  action: 'create' | 'update' | 'delete';
  entity: 'watchlist-account' | 'watchlist-post';
  entityId: string;
  metadata?: Record<string, unknown>;
};

const AUDIT_LOG_ENDPOINT = 'threads/watchlist/audit';
const WATCHERS_ENDPOINT = 'threads/watchlist/watchers';
const LAST_CRAWL_ENDPOINT = 'threads/watchlist/last-crawl';
const EXPORT_ENDPOINT = 'threads/watchlist/posts/export';
const COLLECTIONS_BASE_ENDPOINT = 'threads/watchlist/collections';
const COLLECTIONS_ASSIGN_ENDPOINT = 'threads/watchlist/posts/collections';
const SENTIMENT_ENDPOINT = (postId: string) => `${WATCHLIST_POSTS_ENDPOINT}/${postId}/sentiment`;

export async function fetchWatchlistAccounts(params?: FetchWatchlistAccountsParams) {
  const response = await axiosInstance.get<ApiEnvelope<PaginatedResponse<WatchlistAccount>> | WatchlistAccount[]>(
    WATCHLIST_ACCOUNTS_ENDPOINT,
    {
      params,
    },
  );

  const payload = unwrap(response.data);

  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: {
        total: payload.length,
        page: params?.page ?? 1,
        perPage: params?.perPage ?? payload.length,
      },
    };
  }

  const data = Array.isArray(payload.data) ? payload.data : [];

  return {
    items: data,
    meta: payload.meta ?? {
      total: data.length,
      page: params?.page ?? 1,
      perPage: params?.perPage ?? data.length,
    },
  };
}

export async function fetchWatchlistAnalyticsSummary() {
  const response = await axiosInstance.get<ApiEnvelope<WatchlistAnalyticsSummary>>(
    `${WATCHLIST_ACCOUNTS_ENDPOINT}/analytics-summary`,
  );

  return unwrap(response.data);
}

export async function createWatchlistAccount({ username }: CreateWatchlistAccountArgs) {
  const response = await axiosInstance.post<ApiEnvelope<WatchlistAccount>>(WATCHLIST_ACCOUNTS_ENDPOINT, {
    username: username.trim(),
  });

  return unwrap(response.data);
}

export async function updateWatchlistAccount(id: string, payload: UpdateWatchlistAccountPayload) {
  const response = await axiosInstance.patch<ApiEnvelope<WatchlistAccount>>(
    `${WATCHLIST_ACCOUNTS_ENDPOINT}/${id}`,
    payload,
  );

  return unwrap(response.data);
}

export async function deleteWatchlistAccount(id: string) {
  await axiosInstance.delete(`${WATCHLIST_ACCOUNTS_ENDPOINT}/${id}`);
}

export async function triggerAccountSync(id: string) {
  const response = await axiosInstance.post<ApiEnvelope<{ status: string; queuedAt: string }>>(
    `${WATCHLIST_ACCOUNTS_ENDPOINT}/${id}/sync`,
  );

  return unwrap(response.data);
}

export async function triggerAccountCrawl(id: string) {
  const response = await axiosInstance.post<ApiEnvelope<{ status: string; queuedAt: string }>>(
    `${WATCHLIST_ACCOUNTS_ENDPOINT}/${id}/crawl`,
  );

  return unwrap(response.data);
}

export async function updateAlertSettings(id: string, payload: UpdateAlertSettingsPayload) {
  const response = await axiosInstance.patch<ApiEnvelope<AlertSettings>>(
    `${WATCHLIST_ACCOUNTS_ENDPOINT}/${id}/alerts`,
    payload,
  );

  return unwrap(response.data);
}

export async function assignWatcher(id: string, payload: AssignWatcherPayload) {
  const response = await axiosInstance.patch<ApiEnvelope<WatchlistAccount>>(
    `${WATCHLIST_ACCOUNTS_ENDPOINT}/${id}/watcher`,
    payload,
  );

  return unwrap(response.data);
}

export async function fetchWatchers() {
  const response = await axiosInstance.get<ApiEnvelope<Watcher[]>>(WATCHERS_ENDPOINT);
  return unwrap(response.data);
}

export async function fetchAccountComparison(ids: string[]) {
  const response = await axiosInstance.get<ApiEnvelope<AccountComparisonDataset[]>>(
    `${WATCHLIST_ACCOUNTS_ENDPOINT}/compare`,
    {
      params: { ids: ids.join(',') },
    },
  );

  return unwrap(response.data);
}

export async function fetchWatchlistPosts(params: FetchWatchlistPostsParams) {
  const { accountId, ...rest } = params;
  const response = await axiosInstance.get<
    ApiEnvelope<PaginatedResponse<CrawledPost>> | CrawledPost[]
  >(WATCHLIST_POSTS_ENDPOINT, {
    params: { accountId, ...rest },
  });

  const payload = unwrap(response.data);

  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: {
        total: payload.length,
        page: rest.page ?? 1,
        perPage: rest.perPage ?? payload.length,
      },
    };
  }

  const data = Array.isArray(payload.data) ? payload.data : [];

  return {
    items: data,
    meta: payload.meta ?? {
      total: data.length,
      page: rest.page ?? 1,
      perPage: rest.perPage ?? data.length,
    },
  };
}

export async function fetchPostDetail(id: string) {
  const response = await axiosInstance.get<ApiEnvelope<PostDetail>>(`${WATCHLIST_POSTS_ENDPOINT}/${id}`);
  return unwrap(response.data);
}

export async function updatePostSentiment(postId: string, sentiment: string) {
  const response = await axiosInstance.patch<ApiEnvelope<CrawledPost>>(SENTIMENT_ENDPOINT(postId), {
    sentiment,
  });

  return unwrap(response.data);
}

export async function bulkDeletePosts(payload: BulkDeletePostsPayload) {
  await axiosInstance.post(`${WATCHLIST_POSTS_ENDPOINT}/bulk-delete`, payload);
}

export async function addPostsToCollection(payload: AddToCollectionPayload) {
  const response = await axiosInstance.post<ApiEnvelope<{ collectionId: string }>>(COLLECTIONS_ASSIGN_ENDPOINT, payload);
  return unwrap(response.data);
}

export async function fetchCollections() {
  const response = await axiosInstance.get<ApiEnvelope<{ id: string; name: string }[]>>(COLLECTIONS_BASE_ENDPOINT);
  return unwrap(response.data);
}

export async function exportPosts({ accountId, filters, format, postIds }: ExportPostsPayload) {
  const response = await axiosInstance.post<Blob>(
    EXPORT_ENDPOINT,
    {
      accountId,
      filters,
      format,
      postIds,
    },
    {
      responseType: 'blob',
    },
  );

  return response.data;
}

export async function republishPost(payload: RepublishPostPayload) {
  const response = await axiosInstance.post<ApiEnvelope<{ taskId: string }>>('threads/watchlist/publish', payload);
  return unwrap(response.data);
}

export async function fetchPostAnalytics(params: { accountId: string }) {
  const response = await axiosInstance.get<ApiEnvelope<PostAnalyticsSummary>>(
    `${WATCHLIST_POSTS_ENDPOINT}/analytics`,
    { params },
  );

  return unwrap(response.data);
}

export async function fetchLastGlobalCrawl() {
  const response = await axiosInstance.get<ApiEnvelope<GlobalCrawlStatus>>(LAST_CRAWL_ENDPOINT);
  return unwrap(response.data);
}

export async function logAuditEvent(payload: AuditLogPayload) {
  try {
    await axiosInstance.post(AUDIT_LOG_ENDPOINT, payload);
  } catch (error) {
    console.warn('Failed to record audit event', error);
  }
}
