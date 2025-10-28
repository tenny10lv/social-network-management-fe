/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

import {
  buildApiUrl,
  DEFAULT_UNAUTHORIZED_MESSAGE,
  emitUnauthorized,
  UnauthorizedError,
} from '@/lib/api';

export const threadsAccountBaseSchema = z.object({
  platform: z.string().min(1, 'Platform is required'),
  accountName: z.string().min(1, 'Account name is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().optional(),
  proxyId: z.string().nullable().optional(),
  isActive: z.boolean(),
});

export const threadsAccountCreateSchema = threadsAccountBaseSchema.extend({
  password: z.string().min(1, 'Password is required'),
});

export type ThreadsAccountFormValues = z.infer<typeof threadsAccountBaseSchema>;

export type ThreadsAccountRecord = {
  id: string;
  platform: string;
  accountName: string;
  username: string;
  proxyId?: string | null;
  proxyName?: string | null;
  status: string;
  isActive: boolean;
  accessToken?: string | null;
  refreshToken?: string | null;
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

export type ProxyOption = {
  id: string;
  name: string;
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

const normalizeThreadsAccountRecord = (record: any): ThreadsAccountRecord => {
  const proxy = record?.proxy ?? record?.proxyInfo ?? record?.proxy_info ?? null;
  const proxyId =
    record?.proxyId ??
    record?.proxy_id ??
    proxy?.id ??
    proxy?._id ??
    proxy?.uuid ??
    null;
  const proxyName =
    record?.proxyName ??
    record?.proxy_name ??
    proxy?.name ??
    proxy?.label ??
    proxy?.title ??
    null;

  const statusSource =
    record?.status ??
    record?.state ??
    record?.isActive ??
    record?.active ??
    record?.enabled ??
    null;
  const { status, isActive } = normalizeStatus(statusSource);

  return {
    id: String(record?.id ?? record?.uuid ?? record?._id ?? ''),
    platform: String(record?.platform ?? record?.platformName ?? record?.provider ?? ''),
    accountName: String(record?.accountName ?? record?.name ?? record?.displayName ?? ''),
    username: String(record?.username ?? record?.userName ?? record?.login ?? ''),
    proxyId: proxyId ? String(proxyId) : null,
    proxyName: proxyName ? String(proxyName) : null,
    status,
    isActive,
    accessToken: record?.accessToken ?? record?.access_token ?? null,
    refreshToken: record?.refreshToken ?? record?.refresh_token ?? null,
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
}: {
  page: number;
  limit: number;
}): Promise<ThreadsAccountListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await fetch(buildApiUrl(`threads-accounts?${params.toString()}`));
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
    platform: values.platform,
    accountName: values.accountName,
    username: values.username,
    status: values.isActive ? 'active' : 'inactive',
    isActive: values.isActive,
  };

  if (values.proxyId) {
    payload.proxyId = values.proxyId;
  }

  if (values.password && values.password.trim().length > 0) {
    payload.password = values.password;
  }

  return payload;
};

export async function createThreadsAccount(data: ThreadsAccountFormValues): Promise<ThreadsAccountRecord> {
  const response = await fetch(buildApiUrl('threads-accounts'), {
    method: 'POST',
    headers: {
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
    method: 'PUT',
    headers: {
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
  });

  await handleResponse(response);
}

export async function loginThreadsAccount(id: string): Promise<ThreadsAccountRecord> {
  const response = await fetch(buildApiUrl(`threads-accounts/${id}/login`), {
    method: 'POST',
  });

  const payload = await handleResponse(response);
  const record = payload?.data ?? payload;

  return normalizeThreadsAccountRecord(record);
}

export async function getProxyOptions(): Promise<ProxyOption[]> {
  const params = new URLSearchParams({
    page: '1',
    limit: '100',
  });

  const response = await fetch(buildApiUrl(`proxies?${params.toString()}`));
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
