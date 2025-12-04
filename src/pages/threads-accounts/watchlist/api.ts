import { buildApiUrl } from '@/lib/api';
import type { WatchlistAccount, WatchlistAccountsResponse } from './types';

const WATCHLIST_ACCOUNTS_ENDPOINT = 'threads/watchlist/accounts';
const WATCHLIST_ACCOUNTS_BY_THREADS_ACCOUNT_ENDPOINT = 'threads/watchlist/accounts/by-threads-account';
const THREAD_CATEGORIES_ENDPOINT = 'categories';

const DEFAULT_ERROR_MESSAGE = 'Failed to add watchlist account. Please try again.';
const DEFAULT_LIST_ERROR_MESSAGE = 'Failed to load watchlist accounts. Please try again.';
const DEFAULT_CATEGORY_ERROR_MESSAGE = 'Failed to load categories. Please try again.';

type CreateWatchlistAccountArgs = {
  username: string;
  categoryId: string | null;
};

export type ThreadCategory = {
  id: string;
  name: string;
};

export const THREAD_CATEGORIES_QUERY_KEY = ['threads', 'categories'] as const;

const extractErrorMessage = (payload: unknown): string | undefined => {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const record = payload as Record<string, unknown>;

  const possibleKeys = ['message', 'error', 'detail'];
  for (const key of possibleKeys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const errors = record.errors ?? record.errorMessages ?? record.validationErrors;
  if (typeof errors === 'object' && errors !== null) {
    const messages = Object.values(errors).flatMap((item) =>
      Array.isArray(item) ? item : [item],
    );

    const firstMessage = messages.find(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    );

    if (firstMessage) {
      return firstMessage.trim();
    }
  }

  return undefined;
};

const normalizeThreadCategory = (value: unknown): ThreadCategory | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;

  const id = typeof record.id === 'string' ? record.id : null;
  const name = typeof record.name === 'string' ? record.name : null;

  if (!id || !name) {
    return null;
  }

  return { id, name };
};

const resolveCategoryCollection = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const possibleKeys = ['data', 'categories', 'items', 'results'];

    for (const key of possibleKeys) {
      const value = record[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  return [];
};

const normalizeString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return null;
};

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const normalizeBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      return null;
    }

    if (['true', '1', 'yes', 'active', 'enabled'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no', 'inactive', 'disabled'].includes(normalized)) {
      return false;
    }
  }

  return null;
};

const normalizeDateValue = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
};

const normalizeWatchlistAccount = (value: unknown): WatchlistAccount | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id =
    normalizeString(record.id) ??
    normalizeString(record._id) ??
    normalizeString(record.uuid) ??
    normalizeString(record.watchlistAccountId) ??
    normalizeString(record.watchlist_account_id);

  const username =
    normalizeString(record.username) ??
    normalizeString(record.userName) ??
    normalizeString(record.handle) ??
    normalizeString(record.accountUsername);

  if (!id || !username) {
    return null;
  }

  const status =
    typeof record.status === 'string'
      ? record.status.trim()
      : typeof record.state === 'string'
        ? record.state.trim()
        : null;

  return {
    id,
    username,
    status,
    category: normalizeThreadCategory(record.category) ?? null,
    jobId: normalizeString(record.jobId ?? record.job_id),
    accountName: normalizeString(record.accountName ?? record.account_name ?? record.name ?? record.title),
    email: normalizeString(record.email ?? record.contactEmail),
    fullName: normalizeString(record.fullName ?? record.full_name ?? record.displayName ?? record.display_name),
    pk: normalizeString(record.pk ?? record.pkId ?? record.pk_id),
    biography: normalizeString(record.biography ?? record.bio),
    profilePicUrl:
      normalizeString(record.profilePicUrl) ??
      normalizeString(record.profile_pic_url) ??
      normalizeString(record.avatarUrl) ??
      normalizeString(record.avatar_url) ??
      normalizeString(record.profilePic),
    profilePicFileId: normalizeString(record.profilePicFileId ?? record.profile_pic_file_id ?? record.profilePicFileID),
    followerCount: normalizeNumber(record.followerCount ?? record.follower_count ?? record.followers),
    textPostAppIsPrivate: normalizeBoolean(record.textPostAppIsPrivate ?? record.text_post_app_is_private),
    hasOnboardedToTextPostApp: normalizeBoolean(
      record.hasOnboardedToTextPostApp ?? record.has_onboarded_to_text_post_app,
    ),
    isVerified: normalizeBoolean(record.isVerified ?? record.verified ?? record.is_verified),
    categoryId: normalizeString(record.categoryId ?? record.category_id ?? (record.category as { id?: unknown } | null)?.id),
    userId: normalizeString(record.userId ?? record.user_id),
    note: normalizeString(record.note ?? record.notes),
    lastSyncedAt: normalizeDateValue(record.lastSyncedAt ?? record.last_synced_at ?? record.syncedAt),
    isActive: normalizeBoolean(record.isActive ?? record.active ?? record.enabled),
    createdAt: normalizeDateValue(record.createdAt ?? record.created_at),
    updatedAt: normalizeDateValue(record.updatedAt ?? record.updated_at),
    deletedAt: normalizeDateValue(record.deletedAt ?? record.deleted_at),
  };
};

const buildWatchlistMeta = (
  meta: unknown,
  fallbackPage: number,
  fallbackLimit: number,
  fallbackTotal: number,
): WatchlistAccountsResponse['meta'] => {
  const source = meta && typeof meta === 'object' ? (meta as Record<string, unknown>) : {};
  const resolvedLimit = normalizeNumber(source.limit) ?? normalizeNumber(source.perPage) ?? fallbackLimit ?? 1;
  const limit = resolvedLimit > 0 ? resolvedLimit : 1;
  const resolvedPage = normalizeNumber(source.page) ?? fallbackPage;
  const page = resolvedPage && resolvedPage > 0 ? resolvedPage : 1;
  const totalCount = normalizeNumber(source.totalCount ?? source.total ?? source.count) ?? fallbackTotal;
  const totalPages =
    normalizeNumber(source.totalPages ?? source.total_pages) ??
    (limit > 0 ? Math.max(1, Math.ceil((totalCount ?? 0) / limit)) : 1);

  return {
    page,
    limit,
    totalPages: totalPages || 1,
    totalCount: totalCount ?? 0,
  };
};

type GetWatchlistAccountsByThreadsAccountArgs = {
  page: number;
  limit: number;
  username?: string;
  fullName?: string;
  search?: string;
  threadsAccountId: string;
};

export async function getWatchlistAccountsByThreadsAccount({
  page,
  limit,
  username,
  fullName,
  search,
  threadsAccountId,
}: GetWatchlistAccountsByThreadsAccountArgs): Promise<WatchlistAccountsResponse> {
  if (!threadsAccountId) {
    throw new Error('Threads account id is required.');
  }

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (username) {
    params.set('username', username);
  }

  if (fullName) {
    params.set('fullName', fullName);
  }

  if (search) {
    params.set('search', search);
  }

  if (threadsAccountId) {
    params.set('threadsAccountId', threadsAccountId);
  }

  const response = await fetch(
    buildApiUrl(`${WATCHLIST_ACCOUNTS_BY_THREADS_ACCOUNT_ENDPOINT}?${params.toString()}`),
    {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-custom-lang': 'en',
      },
    },
  );

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
    const message = extractErrorMessage(payload) ?? DEFAULT_LIST_ERROR_MESSAGE;
    throw new Error(message);
  }

  const rawItems = Array.isArray((payload as Record<string, unknown> | null)?.data)
    ? (payload as Record<string, unknown>).data
    : Array.isArray((payload as Record<string, unknown> | null)?.items)
      ? (payload as Record<string, unknown>).items
      : Array.isArray(payload)
        ? (payload as unknown[])
        : [];

  const data = rawItems
    .map((item) => normalizeWatchlistAccount(item))
    .filter((item): item is WatchlistAccount => Boolean(item));

  const metaSource =
    (payload as Record<string, unknown> | null)?.meta ?? (payload as Record<string, unknown> | null)?.pagination;
  const meta = buildWatchlistMeta(metaSource, page, limit, data.length);

  return {
    data,
    meta,
  };
}

export async function fetchThreadCategories(): Promise<ThreadCategory[]> {
  const response = await fetch(buildApiUrl(THREAD_CATEGORIES_ENDPOINT), {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'x-custom-lang': 'en',
    },
  });

  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Invalid server response.');
    }
  }

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? DEFAULT_CATEGORY_ERROR_MESSAGE;
    throw new Error(message);
  }

  const collection = resolveCategoryCollection(data);

  return collection
    .map((item) => normalizeThreadCategory(item))
    .filter((item): item is ThreadCategory => Boolean(item));
}

export async function createWatchlistAccount({ username, categoryId }: CreateWatchlistAccountArgs) {
  const trimmed = username.trim();
  const sanitizedCategoryId =
    typeof categoryId === 'string' && categoryId.trim() ? categoryId.trim() : null;
  const payload = { username: trimmed, categoryId: sanitizedCategoryId };

  const response = await fetch(
    buildApiUrl(WATCHLIST_ACCOUNTS_ENDPOINT),
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-custom-lang': 'en',
      },
      body: JSON.stringify(payload),
    },
  );

  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Invalid server response.');
    }
  }

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? DEFAULT_ERROR_MESSAGE;
    throw new Error(message);
  }

  return (data as Record<string, unknown> | null)?.data ?? data ?? { username: trimmed };
}
