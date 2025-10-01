/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

import {
  buildApiUrl,
  DEFAULT_UNAUTHORIZED_MESSAGE,
  emitUnauthorized,
  UnauthorizedError,
} from '@/lib/api';

export const proxyBaseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  host: z.string().min(1, 'Host is required'),
  port: z.coerce
    .number({ invalid_type_error: 'Port must be a number' })
    .int('Port must be an integer')
    .positive('Port must be greater than zero'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().optional(),
  isActive: z.boolean(),
});

export const proxyCreateSchema = proxyBaseSchema.extend({
  password: z.string().min(1, 'Password is required'),
});

export type ProxyFormValues = z.infer<typeof proxyBaseSchema>;
export type ProxyRecord = {
  id: string;
  name: string;
  host: string;
  port: number;
  username?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ProxyListResponse = {
  data: ProxyRecord[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
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

const normalizeProxyRecord = (record: any): ProxyRecord => ({
  id: String(record.id ?? record.uuid ?? record._id ?? ''),
  name: String(record.name ?? ''),
  host: String(record.host ?? ''),
  port: Number(record.port ?? 0),
  username: record.username ?? record.user ?? record.login ?? null,
  isActive: Boolean(
    typeof record.isActive === 'boolean'
      ? record.isActive
      : record.active ?? record.enabled ?? false,
  ),
  createdAt: record.createdAt ?? record.created_at ?? null,
  updatedAt: record.updatedAt ?? record.updated_at ?? null,
});

const normalizeListPayload = (payload: any, page: number, limit: number): ProxyListResponse => {
  if (!payload) {
    return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
  }

  const rawItems = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.items)
        ? payload.items
        : [];

  const meta = payload.meta ?? payload.pagination ?? {};

  return {
    data: rawItems.map(normalizeProxyRecord),
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

export async function getProxies({
  page,
  limit,
}: {
  page: number;
  limit: number;
}): Promise<ProxyListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await fetch(buildApiUrl(`proxies?${params.toString()}`));
  const payload = await handleResponse(response);

  return normalizeListPayload(payload, page, limit);
}

export async function getProxy(id: string): Promise<ProxyRecord> {
  const response = await fetch(buildApiUrl(`proxies/${id}`));
  const payload = await handleResponse(response);

  const data = payload?.data ?? payload;

  return normalizeProxyRecord(data);
}

export async function createProxy(data: ProxyFormValues): Promise<ProxyRecord> {
  const response = await fetch(buildApiUrl('proxies'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const payload = await handleResponse(response);

  const record = payload?.data ?? payload;

  return normalizeProxyRecord(record);
}

export async function updateProxy({
  id,
  data,
}: {
  id: string;
  data: ProxyFormValues;
}): Promise<ProxyRecord> {
  const response = await fetch(buildApiUrl(`proxies/${id}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const payload = await handleResponse(response);

  const record = payload?.data ?? payload;

  return normalizeProxyRecord(record);
}

export async function deleteProxy(id: string): Promise<void> {
  const response = await fetch(buildApiUrl(`proxies/${id}`), {
    method: 'DELETE',
  });

  await handleResponse(response);
}
