/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

import {
  buildApiUrl,
  DEFAULT_UNAUTHORIZED_MESSAGE,
  emitUnauthorized,
  UnauthorizedError,
} from '@/lib/api';

export const threadsAccountBaseSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().optional(),
  proxyId: z.string().min(1, 'Proxy is required'),
  categoryId: z.string().min(1, 'Category is required'),
  watchlistAccountIds: z.array(z.string().uuid('Invalid watchlist account id')).default([]),
});

export const threadsAccountCreateSchema = threadsAccountBaseSchema.extend({
  password: z.string().min(1, 'Password is required'),
});

export type ThreadsAccountFormValues = z.infer<typeof threadsAccountBaseSchema>;

export type ThreadsAccountType = 'default' | 'watcher';

export type ThreadsAccountRecord = {
  id: string;
  username: string;
  type?: ThreadsAccountType | null;
  proxyId?: string | null;
  proxyName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  watchlistAccountIds?: string[] | null;
  watchlistAccounts?: WatchlistAccountOption[] | null;
  lastLoginAt?: string | null;
  status?: string | null;
  isActive?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ThreadsAccountListResponse = {
  data: ThreadsAccountRecord[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
};

export type ThreadsAccountLoginResponse = {
  jobId: string | null;
  status: string | null;
};

export type ProxyOption = {
  id: string;
  name: string;
};

export type CategoryOption = {
  id: string;
  name: string;
};

export type WatchlistAccountOption = {
  id: string;
  name: string;
  username?: string | null;
};

const normalizeTimestampString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
};

async function parseJson(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid server response.');
  }
}

async function handleResponse(response: Response) {
  let payload: any = null;

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
      (payload && (payload.message || payload.error)) ||
      response.statusText ||
      'Request failed. Please try again.';

    if (response.status === 401) {
      emitUnauthorized({ message: message || DEFAULT_UNAUTHORIZED_MESSAGE });
      throw new UnauthorizedError(message || DEFAULT_UNAUTHORIZED_MESSAGE);
    }

    throw new Error(message);
  }

  return payload;
}

const normalizeStatus = (value: unknown) => {
  if (typeof value === 'boolean') {
    return {
      status: value ? 'Active' : 'Inactive',
      isActive: value,
    };
  }

  if (typeof value === 'number') {
    const isActive = value === 1;
    return {
      status: isActive ? 'Active' : 'Inactive',
      isActive,
    };
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    const lowered = normalized.toLowerCase();
    const isActive = ['active', 'enabled', 'true', '1'].includes(lowered);

    return {
      status: normalized || (isActive ? 'Active' : 'Inactive'),
      isActive,
    };
  }

  return {
    status: 'Inactive',
    isActive: false,
  };
};

const getLatestTimestamp = (timestamps: string[]): string | null => {
  if (timestamps.length === 0) {
    return null;
  }

  return timestamps.reduce((latest, current) => {
    const latestTime = Date.parse(latest);
    const currentTime = Date.parse(current);

    if (Number.isNaN(latestTime)) {
      return current;
    }

    if (Number.isNaN(currentTime)) {
      return latest;
    }

    return currentTime > latestTime ? current : latest;
  });
};

const resolveLastLoginAt = (record: any): string | null => {
  const primaryCandidates = [
    record?.lastLoginAt,
    record?.last_login_at,
    record?.lastLoggedInAt,
    record?.last_logged_in_at,
    record?.loggedInAt,
    record?.logged_in_at,
  ];

  for (const candidate of primaryCandidates) {
    const normalized = normalizeTimestampString(candidate);

    if (normalized) {
      return normalized;
    }
  }

  const sessionMode = record?.sessionMode ?? record?.session_mode ?? record?.mode;
  const timestamps: string[] = [];
  const appendTimestamp = (value: unknown) => {
    const normalized = normalizeTimestampString(value);

    if (normalized) {
      timestamps.push(normalized);
    }
  };
  const collectFromEntry = (entry: unknown) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }

    const source = entry as Record<string, unknown>;
    appendTimestamp(
      source.lastLoggedInAt ??
        source.last_logged_in_at ??
        source.lastLoginAt ??
        source.loggedInAt ??
        source.logged_in_at,
    );
  };

  if (Array.isArray(sessionMode)) {
    sessionMode.forEach((entry) => collectFromEntry(entry));
  } else if (sessionMode && typeof sessionMode === 'object') {
    collectFromEntry(sessionMode);

    const successResults = Array.isArray((sessionMode as Record<string, unknown>).successResults)
      ? (sessionMode as Record<string, unknown>).successResults
      : Array.isArray((sessionMode as Record<string, unknown>).success_results)
        ? (sessionMode as Record<string, unknown>).success_results
        : [];
    const failureResults = Array.isArray((sessionMode as Record<string, unknown>).failureResults)
      ? (sessionMode as Record<string, unknown>).failureResults
      : Array.isArray((sessionMode as Record<string, unknown>).failure_results)
        ? (sessionMode as Record<string, unknown>).failure_results
        : [];

    successResults.forEach((entry) => collectFromEntry(entry));
    failureResults.forEach((entry) => collectFromEntry(entry));
  }

  return getLatestTimestamp(timestamps);
};

const normalizeThreadsAccountRecord = (record: any): ThreadsAccountRecord => {
  const proxy = record?.proxy ?? record?.proxyInfo ?? record?.proxy_info ?? null;
  const proxyId =
    record?.proxyId ??
    record?.proxy_id ??
    proxy?.id ??
    proxy?._id ??
    proxy?.uuid ??
    proxy?.proxyId ??
    proxy?.proxy_id ??
    proxy?.proxyUuid ??
    proxy?.proxy_uuid ??
    null;
  const proxyName =
    record?.proxyName ??
    record?.proxy_name ??
    proxy?.name ??
    proxy?.label ??
    proxy?.title ??
    null;

  const category = record?.category ?? record?.categoryInfo ?? record?.category_info ?? null;
  const categoryId =
    record?.categoryId ??
    record?.category_id ??
    category?.id ??
    category?._id ??
    category?.uuid ??
    category?.categoryId ??
    category?.category_id ??
    category?.categoryUuid ??
    category?.category_uuid ??
    null;
  const categoryName =
    record?.categoryName ??
    record?.category_name ??
    category?.name ??
    category?.label ??
    category?.title ??
    null;

  const watchlistAccountsSource =
    record?.watchlistAccounts ??
    record?.watchlist_accounts ??
    record?.watchlist ??
    record?.watchListAccounts ??
    record?.watch_list_accounts ??
    [];

  const watchlistAccountIdsSource =
    record?.watchlistAccountIds ??
    record?.watchlist_account_ids ??
    record?.watchlistAccountId ??
    record?.watchlist_account_id ??
    null;

  const normalizedWatchlistAccounts: WatchlistAccountOption[] = Array.isArray(watchlistAccountsSource)
    ? (watchlistAccountsSource as unknown[])
        .map((item) => {
          if (!item || typeof item !== 'object') {
            return null;
          }

          const candidate = item as Record<string, unknown>;
          const idCandidate =
            candidate.id ??
            candidate._id ??
            candidate.uuid ??
            candidate.watchlistAccountId ??
            candidate.watchlist_account_id;

          const usernameCandidate =
            candidate.username ?? candidate.userName ?? candidate.handle ?? candidate.accountUsername;
          const accountNameCandidate =
            candidate.accountName ?? candidate.account_name ?? candidate.name ?? candidate.title;

          if (idCandidate === null || idCandidate === undefined) {
            return null;
          }

          const id = String(idCandidate).trim();

          if (!id) {
            return null;
          }
          const username =
            typeof usernameCandidate === 'string' && usernameCandidate.trim()
              ? usernameCandidate.trim()
              : null;
          const name =
            typeof accountNameCandidate === 'string' && accountNameCandidate.trim()
              ? accountNameCandidate.trim()
              : username ?? id;

          return {
            id,
            name,
            username,
          };
        })
        .filter((item): item is WatchlistAccountOption => Boolean(item))
    : [];

  const normalizedWatchlistAccountIds = new Set<string>();

  const appendWatchlistId = (value: unknown) => {
    if (typeof value === 'string' || typeof value === 'number') {
      const trimmed = String(value).trim();

      if (trimmed) {
        normalizedWatchlistAccountIds.add(trimmed);
      }

      return;
    }

    if (value && typeof value === 'object') {
      const candidate =
        (value as Record<string, unknown>).id ??
        (value as Record<string, unknown>)._id ??
        (value as Record<string, unknown>).uuid ??
        (value as Record<string, unknown>).watchlistAccountId ??
        (value as Record<string, unknown>).watchlist_account_id ??
        null;

      if ((typeof candidate === 'string' || typeof candidate === 'number') && String(candidate).trim()) {
        normalizedWatchlistAccountIds.add(String(candidate).trim());
      }
    }
  };

  const collectWatchlistIds = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => collectWatchlistIds(entry));
      return;
    }

    appendWatchlistId(value);
  };

  collectWatchlistIds(watchlistAccountIdsSource);
  collectWatchlistIds(normalizedWatchlistAccounts);

  const statusSource =
    record?.status ??
    record?.state ??
    record?.isActive ??
    record?.active ??
    record?.enabled ??
    null;
  const { status, isActive } = normalizeStatus(statusSource);
  const lastLoginAt = resolveLastLoginAt(record);
  const rawType = typeof record?.type === 'string' ? record.type.trim() : '';
  const loweredType = rawType.toLowerCase();
  const type: ThreadsAccountType | null =
    loweredType === 'default' || loweredType === 'watcher' ? (loweredType as ThreadsAccountType) : null;

  return {
    id: String(record?.id ?? record?.uuid ?? record?._id ?? ''),
    username: String(record?.username ?? record?.userName ?? record?.login ?? ''),
    type,
    proxyId: proxyId !== null && proxyId !== undefined ? String(proxyId) : null,
    proxyName: proxyName ? String(proxyName) : null,
    categoryId: categoryId !== null && categoryId !== undefined ? String(categoryId) : null,
    categoryName: categoryName ? String(categoryName) : null,
    watchlistAccountIds: Array.from(normalizedWatchlistAccountIds),
    watchlistAccounts: normalizedWatchlistAccounts,
    lastLoginAt,
    status,
    isActive,
    createdAt: record?.createdAt ?? record?.created_at ?? null,
    updatedAt: record?.updatedAt ?? record?.updated_at ?? null,
  };
};

const normalizeListPayload = (
  payload: any,
  page: number,
  limit: number,
): ThreadsAccountListResponse => {
  if (!payload) {
    return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
  }

  const rawItems = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.items)
        ? payload.items
        : [];

  const meta = payload?.meta ?? payload?.pagination ?? {};

  return {
    data: rawItems.map(normalizeThreadsAccountRecord),
    meta: {
      total: typeof meta.total === 'number' ? meta.total : rawItems.length,
      page: typeof meta.page === 'number' ? meta.page : page,
      limit: typeof meta.limit === 'number' ? meta.limit : limit,
      totalPages:
        typeof meta.totalPages === 'number'
          ? meta.totalPages
          : typeof meta.total === 'number'
            ? Math.ceil(meta.total / (((meta.limit ?? limit) || 1)))
            : undefined,
    },
  };
};

export async function getThreadsAccounts({
  page,
  limit,
  search,
  status,
}: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}): Promise<ThreadsAccountListResponse> {
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

  const response = await fetch(buildApiUrl(`threads-accounts?${params.toString()}`), {
    headers: {
      accept: 'application/json',
      'x-custom-lang': 'en',
    },
  });
  const payload = await handleResponse(response);

  return normalizeListPayload(payload, page, limit);
}

export async function getThreadsAccount(id: string): Promise<ThreadsAccountRecord> {
  const response = await fetch(buildApiUrl(`threads-accounts/${id}`));
  const payload = await handleResponse(response);

  const data = payload?.data ?? payload;

  return normalizeThreadsAccountRecord(data);
}

const mapThreadsAccountFormValuesToPayload = (values: ThreadsAccountFormValues) => {
  const payload: Record<string, unknown> = {
    username: values.username,
    password: values.password,
    proxyId: values.proxyId,
    categoryId: values.categoryId,
    watchlistAccountIds: Array.isArray(values.watchlistAccountIds)
      ? Array.from(
          new Set(
            values.watchlistAccountIds
              .map((id) => id.trim())
              .filter(Boolean),
          ),
        )
      : [],
  };

  return payload;
};

export async function createThreadsAccount(data: ThreadsAccountFormValues): Promise<ThreadsAccountRecord> {
  const response = await fetch(buildApiUrl('threads-accounts'), {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'x-custom-lang': 'en',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mapThreadsAccountFormValuesToPayload(data)),
  });

  const payload = await handleResponse(response);
  const record = payload?.data ?? payload;

  return normalizeThreadsAccountRecord(record);
}

export async function updateThreadsAccount({
  id,
  data,
}: {
  id: string;
  data: ThreadsAccountFormValues;
}): Promise<ThreadsAccountRecord> {
  const response = await fetch(buildApiUrl(`threads-accounts/${id}`), {
    method: 'PATCH',
    headers: {
      accept: 'application/json',
      'x-custom-lang': 'en',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mapThreadsAccountFormValuesToPayload(data)),
  });

  const payload = await handleResponse(response);
  const record = payload?.data ?? payload;

  return normalizeThreadsAccountRecord(record);
}

export async function deleteThreadsAccount(id: string): Promise<void> {
  const response = await fetch(buildApiUrl(`threads-accounts/${id}`), {
    method: 'DELETE',
    headers: {
      accept: 'application/json',
      'x-custom-lang': 'en',
    },
  });

  await handleResponse(response);
}

export async function loginThreadsAccount(id: string): Promise<ThreadsAccountLoginResponse> {
  const response = await fetch(buildApiUrl(`threads-accounts/${id}/login`), {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'x-custom-lang': 'en',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const payload = await handleResponse(response);
  const record = (payload?.data ?? payload) as Record<string, unknown> | null;
  const jobId =
    typeof record?.jobId === 'string'
      ? record.jobId
      : typeof record?.job_id === 'string'
        ? record.job_id
        : null;
  const status =
    typeof record?.status === 'string'
      ? record.status
      : typeof record?.state === 'string'
        ? record.state
        : null;

  return {
    jobId,
    status,
  };
}

export async function getProxyOptions(): Promise<ProxyOption[]> {
  const params = new URLSearchParams({
    page: '1',
    limit: '100',
  });

  const response = await fetch(buildApiUrl(`proxies?${params.toString()}`), {
    headers: {
      accept: 'application/json',
      'x-custom-lang': 'en',
    },
  });
  const payload = await handleResponse(response);

  const rawItems = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : [];

  return rawItems
    .map((item: any) => {
      const id =
        item?.id ??
        item?.uuid ??
        item?._id ??
        (item?.proxyId ?? item?.proxy_id ?? null);

      const name = item?.name ?? item?.label ?? item?.title ?? item?.host;

      if (!id || !name) {
        return null;
      }

      return {
        id: String(id),
        name: String(name),
      };
    })
    .filter(Boolean) as ProxyOption[];
}

export async function getCategoryOptions(): Promise<CategoryOption[]> {
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

  const rawItems = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : [];

  return rawItems
    .map((item: any) => {
      const id =
        item?.id ??
        item?.uuid ??
        item?._id ??
        (item?.categoryId ?? item?.category_id ?? null);

      const name = item?.name ?? item?.label ?? item?.title;

      if (!id || !name) {
        return null;
      }

      return {
        id: String(id),
        name: String(name),
      };
    })
    .filter(Boolean) as CategoryOption[];
}

export async function getWatchlistAccountOptions(): Promise<WatchlistAccountOption[]> {
  const params = new URLSearchParams({
    page: '1',
    limit: '100',
  });

  const response = await fetch(buildApiUrl(`threads/watchlist/accounts?${params.toString()}`), {
    headers: {
      accept: 'application/json',
      'x-custom-lang': 'en',
    },
  });

  const payload = await handleResponse(response);

  const rawItems = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : [];

  return rawItems
    .map((item: any) => {
      const idSource =
        item?.id ??
        item?._id ??
        item?.uuid ??
        item?.watchlistAccountId ??
        item?.watchlist_account_id ??
        null;

      const username =
        item?.username ?? item?.userName ?? item?.handle ?? item?.accountUsername ?? null;
      const accountName = item?.accountName ?? item?.account_name ?? item?.name ?? item?.title;
      const id = typeof idSource === 'string' || typeof idSource === 'number' ? String(idSource).trim() : '';
      const label =
        (typeof accountName === 'string' && accountName.trim()) ||
        (typeof username === 'string' && username.trim()) ||
        null;

      if (!id || !label) {
        return null;
      }

      return {
        id,
        name: String(label),
        username:
          typeof username === 'string' && username.trim() ? String(username).trim() : null,
      };
    })
    .filter(Boolean) as WatchlistAccountOption[];
}
