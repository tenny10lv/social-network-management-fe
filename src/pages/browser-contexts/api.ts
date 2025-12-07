/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

import {
  buildApiUrl,
  DEFAULT_UNAUTHORIZED_MESSAGE,
  emitUnauthorized,
  UnauthorizedError,
} from '@/lib/api';

export const BROWSER_CONTEXTS_QUERY_KEY = 'browser-contexts';
export const BROWSER_CONTEXT_ACCOUNT_OPTIONS_QUERY_KEY = [
  'browser-contexts',
  'account-options',
] as const;

const proxyUrlSchema = z
  .string()
  .url('Proxy URL must be a valid URL')
  .or(z.literal(''))
  .optional();

export const browserContextFormSchema = z.object({
  threadsAccountId: z.string().min(1, 'Account is required'),
  accountName: z.string().min(1, 'Account name is required'),
  userAgent: z.string().min(1, 'User agent is required'),
  viewportWidth: z
    .coerce.number({ invalid_type_error: 'Width must be a number' })
    .int('Width must be an integer')
    .positive('Width must be greater than zero'),
  viewportHeight: z
    .coerce.number({ invalid_type_error: 'Height must be a number' })
    .int('Height must be an integer')
    .positive('Height must be greater than zero'),
  timezone: z.string().min(1, 'Timezone is required'),
  locale: z.string().min(1, 'Locale is required'),
  proxyUrl: proxyUrlSchema,
  storageState: z.string().optional(),
  userDataDirPath: z.string().optional(),
  fingerprint: z.string().optional(),
  note: z.string().optional(),
  isActive: z.boolean(),
});

export type BrowserContextFormValues = z.infer<typeof browserContextFormSchema>;

export type BrowserContextRecord = {
  id: string;
  threadsAccountId: string | null;
  accountName: string;
  userAgent?: string | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  timezone?: string | null;
  locale?: string | null;
  proxyUrl?: string | null;
  storageState?: string | null;
  userDataDirPath?: string | null;
  fingerprint?: string | null;
  note?: string | null;
  isActive: boolean;
  lastUsedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type BrowserContextListResponse = {
  data: BrowserContextRecord[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
};

export type BrowserContextAccountOption = {
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

const toStringOrNull = (value: any): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const toNumberOrNull = (value: any): number | null => {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
};

const normalizeBoolean = (value: any): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'active', 'enabled', 'yes'].includes(normalized);
  }

  return false;
};

const normalizeBrowserContextRecord = (record: any): BrowserContextRecord => {
  const viewport = record?.viewport ?? record?.viewportSize ?? null;

  const viewportWidth =
    record?.viewportWidth ??
    record?.viewport_width ??
    viewport?.width ??
    viewport?.w ??
    (Array.isArray(viewport) ? viewport[0] : undefined);

  const viewportHeight =
    record?.viewportHeight ??
    record?.viewport_height ??
    viewport?.height ??
    viewport?.h ??
    (Array.isArray(viewport) ? viewport[1] : undefined);

  const account = record?.account ?? record?.accountInfo ?? record?.account_info ?? null;

  const threadsAccountId =
    record?.threadsAccountId ??
    record?.account_id ??
    account?.id ??
    account?._id ??
    account?.uuid ??
    null;

  const accountName =
    record?.accountName ??
    record?.account_name ??
    account?.accountName ??
    account?.name ??
    account?.displayName ??
    '';

  return {
    id: String(record?.id ?? record?.uuid ?? record?._id ?? ''),
    threadsAccountId: threadsAccountId !== null && threadsAccountId !== undefined ? String(threadsAccountId) : null,
    accountName: String(accountName ?? ''),
    userAgent: record?.userAgent ?? record?.user_agent ?? null,
    viewportWidth: toNumberOrNull(viewportWidth),
    viewportHeight: toNumberOrNull(viewportHeight),
    timezone: record?.timezone ?? record?.timeZone ?? record?.tz ?? null,
    locale: record?.locale ?? record?.language ?? null,
    proxyUrl:
      record?.proxyUrl ??
      record?.proxy_url ??
      record?.proxy?.url ??
      record?.proxy?.proxyUrl ??
      null,
    storageState: toStringOrNull(record?.storageState ?? record?.storage_state),
    userDataDirPath: record?.userDataDirPath ?? record?.user_data_dir_path ?? null,
    fingerprint: toStringOrNull(record?.fingerprint),
    note: record?.note ?? record?.description ?? null,
    isActive: normalizeBoolean(
      record?.isActive ?? record?.active ?? record?.enabled ?? record?.status,
    ),
    lastUsedAt: record?.lastUsedAt ?? record?.last_used_at ?? null,
    createdAt: record?.createdAt ?? record?.created_at ?? null,
    updatedAt: record?.updatedAt ?? record?.updated_at ?? null,
  };
};

const normalizeListPayload = (
  payload: any,
  page: number,
  limit: number,
): BrowserContextListResponse => {
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
    data: rawItems.map(normalizeBrowserContextRecord),
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

export async function getBrowserContexts({
  page,
  limit,
  threadsAccountId,
  isActive,
  search,
}: {
  page: number;
  limit: number;
  threadsAccountId?: string;
  isActive?: boolean;
  search?: string;
}): Promise<BrowserContextListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (threadsAccountId) {
    params.set('threadsAccountId', threadsAccountId);
  }

  if (typeof isActive === 'boolean') {
    params.set('isActive', String(isActive));
  }

  if (search && search.trim().length > 0) {
    params.set('search', search.trim());
  }

  const response = await fetch(
    buildApiUrl(`browser-contexts?${params.toString()}`),
  );
  const payload = await handleResponse(response);

  return normalizeListPayload(payload, page, limit);
}

export async function getBrowserContext(id: string): Promise<BrowserContextRecord> {
  const response = await fetch(buildApiUrl(`browser-contexts/${id}`));
  const payload = await handleResponse(response);

  const data = payload?.data ?? payload;

  return normalizeBrowserContextRecord(data);
}

const parseJsonFieldForSubmit = (value?: string | null) => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
};

const mapFormValuesToPayload = (values: BrowserContextFormValues) => {
  const payload: Record<string, unknown> = {
    threadsAccountId: values.threadsAccountId,
    accountName: values.accountName,
    userAgent: values.userAgent,
    viewportWidth: values.viewportWidth,
    viewportHeight: values.viewportHeight,
    viewport: {
      width: values.viewportWidth,
      height: values.viewportHeight,
    },
    timezone: values.timezone,
    locale: values.locale,
    isActive: values.isActive,
    status: values.isActive ? 'active' : 'inactive',
  };

  if (values.proxyUrl && values.proxyUrl.trim().length > 0) {
    payload.proxyUrl = values.proxyUrl.trim();
  }

  if (values.storageState !== undefined) {
    const storagePayload = parseJsonFieldForSubmit(values.storageState);
    if (storagePayload !== undefined) {
      payload.storageState = storagePayload;
    }
  }

  if (values.userDataDirPath && values.userDataDirPath.trim().length > 0) {
    payload.userDataDirPath = values.userDataDirPath.trim();
  }

  if (values.fingerprint !== undefined) {
    const fingerprintPayload = parseJsonFieldForSubmit(values.fingerprint);
    if (fingerprintPayload !== undefined) {
      payload.fingerprint = fingerprintPayload;
    }
  }

  if (values.note !== undefined && values.note.trim().length > 0) {
    payload.note = values.note.trim();
  }

  return payload;
};

export async function createBrowserContext(
  data: BrowserContextFormValues,
): Promise<BrowserContextRecord> {
  const response = await fetch(buildApiUrl('browser-contexts'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mapFormValuesToPayload(data)),
  });

  const payload = await handleResponse(response);

  const record = payload?.data ?? payload;

  return normalizeBrowserContextRecord(record);
}

export async function updateBrowserContext({
  id,
  data,
}: {
  id: string;
  data: BrowserContextFormValues;
}): Promise<BrowserContextRecord> {
  const response = await fetch(buildApiUrl(`browser-contexts/${id}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mapFormValuesToPayload(data)),
  });

  const payload = await handleResponse(response);

  const record = payload?.data ?? payload;

  return normalizeBrowserContextRecord(record);
}

export async function deleteBrowserContext(id: string): Promise<void> {
  const response = await fetch(buildApiUrl(`browser-contexts/${id}`), {
    method: 'DELETE',
  });

  await handleResponse(response);
}

export async function getAccountOptions(): Promise<BrowserContextAccountOption[]> {
  const params = new URLSearchParams({
    page: '1',
    limit: '100',
  });

  const response = await fetch(buildApiUrl(`accounts?${params.toString()}`));
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
        item?.id ?? item?._id ?? item?.uuid ?? item?.threadsAccountId ?? item?.account_id ?? null;
      const name =
        item?.accountName ??
        item?.name ??
        item?.displayName ??
        item?.username ??
        item?.handle ??
        null;

      if (!id || !name) {
        return null;
      }

      return {
        id: String(id),
        name: String(name),
      };
    })
    .filter((option): option is BrowserContextAccountOption => option !== null);
}
