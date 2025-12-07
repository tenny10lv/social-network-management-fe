/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
import {
  buildApiUrl,
  DEFAULT_UNAUTHORIZED_MESSAGE,
  emitUnauthorized,
  UnauthorizedError,
} from '@/lib/api';

export const publishJobFormSchema = z.object({
  threadsAccountId: z.string().min(1, 'Account is required'),
  contentId: z.string().min(1, 'Content is required'),
  scheduledAt: z.string().optional().or(z.literal('')),
});

export type PublishJobFormValues = z.infer<typeof publishJobFormSchema>;

export type PublishJobSubmitPayload = {
  threadsAccountId: string;
  contentId: string;
  scheduledAt?: string | null;
};

export type PublishJobRecord = {
  id: string;
  threadsAccountId?: string | null;
  accountName?: string | null;
  contentId?: string | null;
  contentTitle?: string | null;
  status?: string | null;
  scheduledAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  platformResponse?: unknown;
};

export type PublishJobListResponse = {
  data: PublishJobRecord[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
};

export type SelectOption = {
  id: string;
  name: string;
};

export const PUBLISH_ACCOUNT_OPTIONS_QUERY_KEY = ['publish-account-options'];
export const PUBLISH_CONTENT_OPTIONS_QUERY_KEY = ['publish-content-options'];

async function parseJson(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    if (response.status === 401) {
      emitUnauthorized({ message: DEFAULT_UNAUTHORIZED_MESSAGE });
      throw new UnauthorizedError(DEFAULT_UNAUTHORIZED_MESSAGE);
    }

    throw error instanceof Error ? error : new Error('Invalid server response.');
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

const normalizeDate = (value: any): string | null => {
  const source = value ?? null;

  if (!source) {
    return null;
  }

  const date = new Date(source);

  if (Number.isNaN(date.getTime())) {
    return typeof source === 'string' ? source : null;
  }

  return date.toISOString();
};

const normalizePublishJobRecord = (record: any): PublishJobRecord => {
  const account = record?.account ?? record?.accountInfo ?? record?.account_info ?? null;
  const content = record?.content ?? record?.contentInfo ?? record?.content_info ?? null;

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
    account?.name ??
    account?.accountName ??
    account?.account_name ??
    account?.displayName ??
    account?.username ??
    null;

  const contentId =
    record?.contentId ??
    record?.content_id ??
    content?.id ??
    content?._id ??
    content?.uuid ??
    null;
  const contentTitle =
    record?.contentTitle ??
    record?.content_title ??
    content?.title ??
    content?.name ??
    content?.headline ??
    null;

  const status =
    record?.status ??
    record?.state ??
    record?.jobStatus ??
    record?.job_status ??
    record?.result ??
    null;

  const platformResponse =
    record?.platformResponse ??
    record?.platform_response ??
    record?.response ??
    record?.providerResponse ??
    record?.provider_response ??
    null;

  return {
    id: String(record?.id ?? record?._id ?? record?.uuid ?? ''),
    threadsAccountId: threadsAccountId ? String(threadsAccountId) : null,
    accountName: accountName ? String(accountName) : null,
    contentId: contentId ? String(contentId) : null,
    contentTitle: contentTitle ? String(contentTitle) : null,
    status: status ? String(status) : null,
    scheduledAt: normalizeDate(
      record?.scheduledAt ?? record?.scheduled_at ?? record?.scheduledTime ?? record?.scheduled_time,
    ),
    createdAt: normalizeDate(record?.createdAt ?? record?.created_at),
    updatedAt: normalizeDate(record?.updatedAt ?? record?.updated_at),
    platformResponse,
  };
};

const resolveListItems = (payload: any) => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
};

const resolveMeta = (payload: any, page: number, limit: number) => {
  const meta = payload?.meta ?? payload?.pagination ?? {};
  const total = typeof meta.total === 'number' ? meta.total : undefined;
  const totalPages = typeof meta.totalPages === 'number' ? meta.totalPages : undefined;
  const resolvedTotal = total ?? (Array.isArray(payload?.data) ? payload.data.length : undefined);

  const finalTotalPages =
    typeof totalPages === 'number'
      ? totalPages
      : typeof resolvedTotal === 'number'
        ? Math.max(1, Math.ceil(resolvedTotal / limit))
        : undefined;

  return {
    total: resolvedTotal,
    page,
    limit,
    totalPages: finalTotalPages,
  };
};

const toIsoOrNull = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

export async function getPublishJobs({
  page,
  limit,
}: {
  page: number;
  limit: number;
}): Promise<PublishJobListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await fetch(buildApiUrl(`publish?${params.toString()}`));
  const payload = await handleResponse(response);
  const items = resolveListItems(payload);

  return {
    data: items.map(normalizePublishJobRecord),
    meta: resolveMeta(payload, page, limit),
  };
}

export async function getPublishJob(id: string): Promise<PublishJobRecord> {
  const response = await fetch(buildApiUrl(`publish/${id}`));
  const payload = await handleResponse(response);
  const record = payload?.data ?? payload;

  return normalizePublishJobRecord(record);
}

export async function createPublishJob(
  data: PublishJobSubmitPayload,
): Promise<PublishJobRecord> {
  const payload: PublishJobSubmitPayload = {
    threadsAccountId: data.threadsAccountId,
    contentId: data.contentId,
    scheduledAt: toIsoOrNull(data.scheduledAt ?? undefined) ?? undefined,
  };

  const response = await fetch(buildApiUrl('publish'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await handleResponse(response);
  const record = result?.data ?? result;

  return normalizePublishJobRecord(record);
}

export async function retryPublishJob(id: string): Promise<PublishJobRecord> {
  const response = await fetch(buildApiUrl(`publish/${id}/retry`), {
    method: 'PUT',
  });

  const payload = await handleResponse(response);
  const record = payload?.data ?? payload;

  return normalizePublishJobRecord(record);
}

export async function cancelPublishJob(id: string): Promise<PublishJobRecord> {
  const response = await fetch(buildApiUrl(`publish/${id}/cancel`), {
    method: 'PUT',
  });

  const payload = await handleResponse(response);
  const record = payload?.data ?? payload;

  return normalizePublishJobRecord(record);
}

export async function getAccountOptions(): Promise<SelectOption[]> {
  const params = new URLSearchParams({
    page: '1',
    limit: '200',
  });

  const response = await fetch(buildApiUrl(`accounts?${params.toString()}`));
  const payload = await handleResponse(response);
  const items = resolveListItems(payload);

  return items
    .map((item: any) => ({
      id: String(item?.id ?? item?._id ?? item?.uuid ?? ''),
      name:
        item?.accountName ??
        item?.account_name ??
        item?.name ??
        item?.displayName ??
        item?.username ??
        '',
    }))
    .filter((option: SelectOption) => option.id && option.name);
}

export async function getContentOptions(): Promise<SelectOption[]> {
  const params = new URLSearchParams({
    page: '1',
    limit: '200',
  });

  const response = await fetch(buildApiUrl(`contents?${params.toString()}`));
  const payload = await handleResponse(response);
  const items = resolveListItems(payload);

  return items
    .map((item: any) => ({
      id: String(item?.id ?? item?._id ?? item?.uuid ?? ''),
      name:
        item?.title ??
        item?.name ??
        item?.contentTitle ??
        item?.headline ??
        item?.summary ??
        '',
    }))
    .filter((option: SelectOption) => option.id && option.name);
}
