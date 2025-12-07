/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
import {
  buildApiUrl,
  DEFAULT_UNAUTHORIZED_MESSAGE,
  emitUnauthorized,
  UnauthorizedError,
} from '@/lib/api';

export const contentFormSchema = z.object({
  threadsAccountId: z.string().min(1, 'Account is required'),
  title: z
    .string()
    .max(200, 'Title must be 200 characters or fewer')
    .optional()
    .or(z.literal('')),
  body: z.string().min(1, 'Body is required'),
  type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'SHORT']),
  scheduledAt: z.string().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED']),
});

export type ContentFormValues = z.infer<typeof contentFormSchema>;

export type ContentRecord = {
  id: string;
  threadsAccountId: string;
  accountName?: string | null;
  title?: string | null;
  body?: string | null;
  type?: string | null;
  status?: string | null;
  scheduledAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  mediaUrls?: string[];
};

export type ContentListResponse = {
  data: ContentRecord[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
};

export type AccountOption = {
  id: string;
  name: string;
};

export type ContentSubmitPayload = ContentFormValues & {
  existingMediaUrls: string[];
  newMediaFiles: File[];
};

export const CONTENT_ACCOUNT_OPTIONS_QUERY_KEY = ['content-account-options'];

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

const normalizeContentRecord = (record: any): ContentRecord => {
  const media =
    record?.mediaUrls ??
    record?.media_urls ??
    record?.media ??
    record?.attachments ??
    [];

  const normalizedMedia = Array.isArray(media)
    ? media
        .map((item) => {
          if (typeof item === 'string') {
            return item;
          }

          if (item && typeof item === 'object') {
            return (
              item.url ??
              item.href ??
              item.path ??
              item.source ??
              item.location ??
              null
            );
          }

          return null;
        })
        .filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];

  return {
    id: String(record?.id ?? record?._id ?? record?.uuid ?? ''),
    threadsAccountId: String(
      record?.threadsAccountId ?? record?.account_id ?? record?.account?.id ?? record?.account?.uuid ?? '',
    ),
    accountName:
      record?.accountName ??
      record?.account_name ??
      record?.account?.name ??
      record?.account?.accountName ??
      record?.account?.displayName ??
      null,
    title: record?.title ?? record?.name ?? null,
    body: record?.body ?? record?.content ?? record?.text ?? null,
    type: record?.type ?? record?.contentType ?? record?.kind ?? null,
    status: record?.status ?? record?.state ?? null,
    scheduledAt:
      normalizeDate(record?.scheduledAt ?? record?.scheduled_at ?? record?.scheduleAt ?? record?.publishAt),
    createdAt: normalizeDate(record?.createdAt ?? record?.created_at ?? record?.createdOn),
    updatedAt: normalizeDate(record?.updatedAt ?? record?.updated_at ?? record?.updatedOn),
    mediaUrls: normalizedMedia,
  };
};

const normalizeListPayload = (
  payload: any,
  page: number,
  limit: number,
): ContentListResponse => {
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
    data: rawItems.map(normalizeContentRecord),
    meta: {
      total: typeof meta.total === 'number' ? meta.total : rawItems.length,
      page: typeof meta.page === 'number' ? meta.page : page,
      limit: typeof meta.limit === 'number' ? meta.limit : limit,
      totalPages:
        typeof meta.totalPages === 'number'
          ? meta.totalPages
          : typeof meta.total === 'number'
            ? Math.max(1, Math.ceil(meta.total / limit))
            : undefined,
    },
  };
};

export async function getContents({
  page,
  limit,
}: {
  page: number;
  limit: number;
}): Promise<ContentListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await fetch(buildApiUrl(`contents?${params.toString()}`));
  const payload = await handleResponse(response);

  return normalizeListPayload(payload, page, limit);
}

export async function getContent(id: string): Promise<ContentRecord> {
  const response = await fetch(buildApiUrl(`contents/${id}`));
  const payload = await handleResponse(response);

  const data = payload?.data ?? payload;

  return normalizeContentRecord(data);
}

const mapToFormData = (data: ContentSubmitPayload): FormData => {
  const formData = new FormData();

  formData.append('threadsAccountId', data.threadsAccountId);
  formData.append('body', data.body);
  formData.append('type', data.type);
  formData.append('status', data.status);

  const trimmedTitle = data.title?.trim();
  if (trimmedTitle) {
    formData.append('title', trimmedTitle);
  }

  const trimmedScheduledAt = data.scheduledAt?.trim();
  if (trimmedScheduledAt) {
    formData.append('scheduledAt', trimmedScheduledAt);
  }

  if (data.existingMediaUrls.length > 0) {
    formData.append('mediaUrls', JSON.stringify(data.existingMediaUrls));
  }

  data.newMediaFiles.forEach((file) => {
    formData.append('mediaFiles', file);
  });

  return formData;
};

export async function createContent(data: ContentSubmitPayload): Promise<ContentRecord> {
  const response = await fetch(buildApiUrl('contents'), {
    method: 'POST',
    body: mapToFormData(data),
  });

  const payload = await handleResponse(response);
  const record = payload?.data ?? payload;

  return normalizeContentRecord(record);
}

export async function updateContent({
  id,
  data,
}: {
  id: string;
  data: ContentSubmitPayload;
}): Promise<ContentRecord> {
  const response = await fetch(buildApiUrl(`contents/${id}`), {
    method: 'PUT',
    body: mapToFormData(data),
  });

  const payload = await handleResponse(response);
  const record = payload?.data ?? payload;

  return normalizeContentRecord(record);
}

export async function deleteContent(id: string): Promise<void> {
  const response = await fetch(buildApiUrl(`contents/${id}`), {
    method: 'DELETE',
  });

  await handleResponse(response);
}

export async function getAccountOptions(): Promise<AccountOption[]> {
  const params = new URLSearchParams({
    page: '1',
    limit: '200',
  });

  const response = await fetch(buildApiUrl(`accounts?${params.toString()}`));
  const payload = await handleResponse(response);

  const items = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : [];

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
    .filter((option: AccountOption) => option.id && option.name);
}
