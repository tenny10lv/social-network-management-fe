import { z } from 'zod';

import {
  buildApiUrl,
  DEFAULT_UNAUTHORIZED_MESSAGE,
  UnauthorizedError,
  emitUnauthorized,
} from '@/lib/api';

export const threadsWatchlistAccountCreateSchema = z.object({
  username: z.string().min(1, 'Username is required'),
});

export const threadsWatchlistAccountUpdateSchema = z.object({
  note: z
    .string()
    .max(1000, 'Note must be 1000 characters or less')
    .optional(),
  categoryId: z.string().optional().nullable(),
  isActive: z.boolean(),
});

export type ThreadsWatchlistAccountCreateValues = z.infer<
  typeof threadsWatchlistAccountCreateSchema
>;
export type ThreadsWatchlistAccountUpdateValues = z.infer<
  typeof threadsWatchlistAccountUpdateSchema
>;

export type ThreadsWatchlistAccountRecord = {
  id: string;
  username: string;
  platform?: string | null;
  status?: string | null;
  jobId?: string | null;
  accountName?: string | null;
  email?: string | null;
  fullname?: string | null;
  pk?: string | null;
  biography?: string | null;
  avatarUrl?: string | null;
  followerCount?: number | null;
  isVerified?: boolean;
  categoryId?: string | null;
  categoryName?: string | null;
  userId?: string | null;
  note?: string | null;
  lastSyncedAt?: string | null;
  isActive?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ThreadsWatchlistAccountListResponse = {
  data: ThreadsWatchlistAccountRecord[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
};

export type CategoryOption = {
  id: string;
  name: string;
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

    if (['true', '1', 'yes', 'verified'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no', 'unverified'].includes(normalized)) {
      return false;
    }
  }

  return null;
};

const parseJson = async (response: Response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid server response.');
  }
};

const handleResponse = async (response: Response) => {
  let payload: unknown;

  try {
    payload = await parseJson(response);
  } catch (error) {
    if (response.status === 401) {
      emitUnauthorized({ message: DEFAULT_UNAUTHORIZED_MESSAGE });
      throw new UnauthorizedError(DEFAULT_UNAUTHORIZED_MESSAGE);
    }

    throw error instanceof Error ? error : new Error('Invalid server response.');
  }

  if (!response.ok) {
    const message =
      (payload &&
        typeof payload === 'object' &&
        'message' in payload &&
        typeof payload.message === 'string'
        ? payload.message
        : payload &&
            typeof payload === 'object' &&
            'error' in payload &&
            typeof (payload as Record<string, unknown>).error === 'string'
          ? String((payload as Record<string, unknown>).error)
          : null) ||
      response.statusText ||
      'Request failed. Please try again.';

    if (response.status === 401) {
      emitUnauthorized({ message: message || DEFAULT_UNAUTHORIZED_MESSAGE });
      throw new UnauthorizedError(message || DEFAULT_UNAUTHORIZED_MESSAGE);
    }

    throw new Error(message);
  }

  return payload as Record<string, unknown> | null;
};

const normalizeStatus = (
  value: unknown,
): { status: string | null; isActive: boolean } => {
  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      return { status: null, isActive: false };
    }

    const lowered = trimmed.toLowerCase();

    if (['active', 'enabled', 'ready', 'running'].includes(lowered)) {
      return { status: trimmed, isActive: true };
    }

    if (['inactive', 'disabled', 'stopped', 'paused'].includes(lowered)) {
      return { status: trimmed, isActive: false };
    }

    return { status: trimmed, isActive: false };
  }

  const normalized = normalizeBoolean(value);

  if (normalized === null) {
    return { status: null, isActive: false };
  }

  return { status: normalized ? 'Active' : 'Inactive', isActive: normalized };
};

const normalizeWatchlistAccount = (
  record: Record<string, unknown> | null | undefined,
): ThreadsWatchlistAccountRecord => {
  const avatarSource =
    record?.avatarUrl ??
    record?.avatar_url ??
    record?.avatar ??
    record?.profilePicUrl ??
    record?.profile_pic_url ??
    null;

  const followerCountSource =
    record?.followerCount ?? record?.followers ?? record?.followers_count ?? null;

  const category = record?.category ?? record?.categoryInfo ?? record?.category_info ?? null;

  const categoryId =
    (category && typeof category === 'object' && 'id' in category && typeof category.id === 'string'
      ? category.id
      : null) ??
    (typeof record?.categoryId === 'string'
      ? record?.categoryId
      : typeof record?.category_id === 'string'
        ? record?.category_id
        : null);

  const categoryName =
    (category && typeof category === 'object' && 'name' in category && typeof category.name === 'string'
      ? category.name
      : null) ??
    (typeof record?.categoryName === 'string'
      ? record?.categoryName
      : typeof record?.category_name === 'string'
        ? record?.category_name
        : null);

  const statusResult = normalizeStatus(
    record?.status ?? record?.state ?? record?.isActive ?? record?.active ?? record?.enabled,
  );

  const isVerifiedSource =
    normalizeBoolean(record?.isVerified) ??
    normalizeBoolean(record?.verified) ??
    normalizeBoolean(record?.is_verified);

  const followerCount =
    typeof followerCountSource === 'number'
      ? followerCountSource
      : typeof followerCountSource === 'string'
        ? Number.parseInt(followerCountSource, 10)
        : null;

  return {
    id: String(record?.id ?? record?._id ?? record?.uuid ?? ''),
    username: String(record?.username ?? record?.userName ?? record?.handle ?? ''),
    platform:
      typeof record?.platform === 'string'
        ? record?.platform
        : typeof record?.platformName === 'string'
          ? record?.platformName
          : typeof record?.platform_name === 'string'
            ? record?.platform_name
            : null,
    status: statusResult.status,
    jobId:
      typeof record?.jobId === 'string'
        ? record?.jobId
        : typeof record?.job_id === 'string'
          ? record?.job_id
          : null,
    accountName:
      typeof record?.accountName === 'string'
        ? record?.accountName
        : typeof record?.name === 'string'
          ? record?.name
          : null,
    email: typeof record?.email === 'string' ? record?.email : null,
    fullname: typeof record?.fullname === 'string' ? record?.fullname : null,
    pk: typeof record?.pk === 'string' ? record?.pk : null,
    biography: typeof record?.biography === 'string' ? record?.biography : null,
    avatarUrl: avatarSource ? String(avatarSource) : null,
    followerCount: Number.isFinite(followerCount) ? followerCount : null,
    isVerified: isVerifiedSource ?? false,
    categoryId: categoryId ? String(categoryId) : null,
    categoryName: categoryName ? String(categoryName) : null,
    userId:
      typeof record?.userId === 'string'
        ? record?.userId
        : typeof record?.user_id === 'string'
          ? record?.user_id
          : null,
    note: typeof record?.note === 'string' ? record?.note : null,
    lastSyncedAt:
      typeof record?.lastSyncedAt === 'string'
        ? record?.lastSyncedAt
        : typeof record?.last_synced_at === 'string'
          ? record?.last_synced_at
          : null,
    isActive: statusResult.isActive,
    createdAt:
      typeof record?.createdAt === 'string'
        ? record?.createdAt
        : typeof record?.created_at === 'string'
          ? record?.created_at
          : null,
    updatedAt:
      typeof record?.updatedAt === 'string'
        ? record?.updatedAt
        : typeof record?.updated_at === 'string'
          ? record?.updated_at
          : null,
  };
};

const normalizeListPayload = (
  payload: unknown,
  page: number,
  limit: number,
): ThreadsWatchlistAccountListResponse => {
  if (!payload) {
    return {
      data: [],
      meta: { page, limit, total: 0, totalPages: 0 },
    };
  }

  const rawItems = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as Record<string, unknown>)?.data)
      ? ((payload as Record<string, unknown>).data as unknown[])
      : Array.isArray((payload as Record<string, unknown>)?.items)
        ? ((payload as Record<string, unknown>).items as unknown[])
        : [];

  const meta =
    (payload && typeof payload === 'object' && 'meta' in payload
      ? (payload as Record<string, unknown>).meta
      : payload && typeof payload === 'object' && 'pagination' in payload
        ? (payload as Record<string, unknown>).pagination
        : {}) ?? {};

  const total =
    typeof (meta as Record<string, unknown>).total === 'number'
      ? ((meta as Record<string, unknown>).total as number)
      : rawItems.length;

  const totalPages =
    typeof (meta as Record<string, unknown>).totalPages === 'number'
      ? ((meta as Record<string, unknown>).totalPages as number)
      : typeof total === 'number'
        ? Math.ceil(total / (Number((meta as Record<string, unknown>).limit) || limit || 1))
        : undefined;

  return {
    data: rawItems
      .map((item) => (item && typeof item === 'object' ? item : null))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => normalizeWatchlistAccount(item)),
    meta: {
      total,
      page:
        typeof (meta as Record<string, unknown>).page === 'number'
          ? ((meta as Record<string, unknown>).page as number)
          : page,
      limit:
        typeof (meta as Record<string, unknown>).limit === 'number'
          ? ((meta as Record<string, unknown>).limit as number)
          : limit,
      totalPages,
    },
  };
};

export const getThreadsWatchlistAccounts = async ({
  page,
  limit,
  search,
  status,
}: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}): Promise<ThreadsWatchlistAccountListResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    params.set('search', search);
  }

  if (status) {
    params.set('status', status);
  }

  const response = await fetch(
    buildApiUrl(`threads/watchlist/accounts?${params.toString()}`),
    {
      headers: {
        accept: 'application/json',
        'x-custom-lang': 'en',
      },
    },
  );

  const payload = await handleResponse(response);

  return normalizeListPayload(payload, page, limit);
};

export const getThreadsWatchlistAccount = async (
  id: string,
): Promise<ThreadsWatchlistAccountRecord> => {
  const response = await fetch(buildApiUrl(`threads/watchlist/accounts/${id}`), {
    headers: {
      accept: 'application/json',
      'x-custom-lang': 'en',
    },
  });

  const payload = await handleResponse(response);
  const data = payload?.data ?? payload;

  return normalizeWatchlistAccount(
    (data && typeof data === 'object' ? (data as Record<string, unknown>) : null) ?? {},
  );
};

export const createThreadsWatchlistAccount = async (
  values: ThreadsWatchlistAccountCreateValues,
): Promise<ThreadsWatchlistAccountRecord> => {
  const payload = {
    username: values.username.trim(),
  };

  const response = await fetch(buildApiUrl('threads/watchlist/accounts'), {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'x-custom-lang': 'en',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(response);
  const record = data?.data ?? data;

  return normalizeWatchlistAccount(
    (record && typeof record === 'object' ? (record as Record<string, unknown>) : null) ?? {},
  );
};

export const updateThreadsWatchlistAccount = async ({
  id,
  values,
}: {
  id: string;
  values: ThreadsWatchlistAccountUpdateValues;
}): Promise<ThreadsWatchlistAccountRecord> => {
  const payload: Record<string, unknown> = {
    isActive: values.isActive,
  };

  if (typeof values.note === 'string') {
    payload.note = values.note.trim();
  }

  if (typeof values.categoryId === 'string' && values.categoryId.trim()) {
    payload.categoryId = values.categoryId.trim();
  } else {
    payload.categoryId = null;
  }

  const response = await fetch(buildApiUrl(`threads/watchlist/accounts/${id}`), {
    method: 'PATCH',
    headers: {
      accept: 'application/json',
      'x-custom-lang': 'en',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(response);
  const record = data?.data ?? data;

  return normalizeWatchlistAccount(
    (record && typeof record === 'object' ? (record as Record<string, unknown>) : null) ?? {},
  );
};

export const deleteThreadsWatchlistAccount = async (id: string): Promise<void> => {
  const response = await fetch(buildApiUrl(`threads/watchlist/accounts/${id}`), {
    method: 'DELETE',
    headers: {
      accept: 'application/json',
      'x-custom-lang': 'en',
    },
  });

  await handleResponse(response);
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

export const getCategoryOptions = async (): Promise<CategoryOption[]> => {
  const params = new URLSearchParams({
    page: '1',
    limit: '100',
  });

  const response = await fetch(buildApiUrl(`categories?${params.toString()}`), {
    headers: {
      accept: 'application/json',
      'x-custom-lang': 'en',
    },
  });

  const payload = await handleResponse(response);
  const collection = resolveCategoryCollection(payload);

  return collection
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const id = record.id ?? record._id ?? record.uuid ?? record.categoryId ?? record.category_id;
      const name = record.name ?? record.label ?? record.title;

      if (typeof id !== 'string' || typeof name !== 'string') {
        return null;
      }

      return {
        id: String(id),
        name: String(name),
      } satisfies CategoryOption;
    })
    .filter((item): item is CategoryOption => Boolean(item));
};
