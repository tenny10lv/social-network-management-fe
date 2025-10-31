import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DEFAULT_UNAUTHORIZED_MESSAGE,
  UnauthorizedError,
  buildApiUrl,
  emitUnauthorized,
} from '@/lib/api';
import {
  Category,
  CategoryListQuery,
  CategoryListResponse,
  CategoryPayload,
  CategoryReference,
} from '../types/category';

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
  const payload = await parseJson(response);

  if (!response.ok) {
    const message =
      (payload && (payload.message || payload.error || payload.detail)) ||
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

const toStringOrNull = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  const stringValue = String(value).trim();

  return stringValue.length > 0 ? stringValue : null;
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'active', 'enabled', 'yes'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'inactive', 'disabled', 'no'].includes(normalized)) {
      return false;
    }
  }

  return false;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

const normalizeParent = (value: unknown): CategoryReference | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Record<string, unknown>;
  const id = toStringOrNull(source.id ?? source._id ?? source.uuid);
  const name = toStringOrNull(source.name ?? source.title ?? source.label ?? source.slug);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    slug: toStringOrNull(source.slug ?? source.code ?? source.identifier),
  };
};

const normalizeCategoryRecord = (record: unknown): Category => {
  const source = (record && typeof record === 'object' ? record : {}) as Record<string, unknown>;

  const id = toStringOrNull(source.id ?? source._id ?? source.uuid) ?? '';
  const name = toStringOrNull(source.name ?? source.title) ?? '';
  const slug = toStringOrNull(source.slug ?? source.code ?? source.identifier) ?? '';
  const description =
    toStringOrNull(source.description ?? source.details ?? source.summary ?? source.note) ?? null;
  const parentSource = (source.parent ?? source.parentCategory ?? source.parent_category) as
    | Record<string, unknown>
    | undefined;
  const parentId =
    toStringOrNull(source.parentId ?? source.parent_id ?? parentSource?.id ?? parentSource?._id) ?? null;
  const parent = normalizeParent(parentSource);
  const order =
    toNumberOrNull(
      source.order ?? source.sortOrder ?? source.sort_order ?? source.position ?? source.sequence,
    ) ?? null;
  const createdAt = toStringOrNull(source.createdAt ?? source.created_at) ?? null;
  const updatedAt = toStringOrNull(source.updatedAt ?? source.updated_at) ?? null;

  return {
    id,
    name,
    slug,
    description,
    isActive: toBoolean(source.isActive ?? source.active ?? source.status ?? source.enabled),
    parentId,
    parent,
    order,
    createdAt,
    updatedAt,
  };
};

const normalizeListResponse = (
  payload: unknown,
  params: CategoryListQuery,
): CategoryListResponse => {
  const root = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;

  const rawItems = Array.isArray(payload)
    ? (payload as unknown[])
    : Array.isArray(root.data as unknown[])
      ? (root.data as unknown[])
      : Array.isArray(root.items as unknown[])
        ? (root.items as unknown[])
        : [];

  const metaSource = (root.meta ?? root.pagination ?? root.metaData ?? {}) as Record<string, unknown>;

  const totalCandidate =
    typeof metaSource.total === 'number'
      ? metaSource.total
      : typeof root.total === 'number'
        ? (root.total as number)
        : undefined;
  const total = totalCandidate ?? rawItems.length;

  const page = typeof metaSource.page === 'number' ? (metaSource.page as number) : params.page ?? 1;
  const limit = typeof metaSource.limit === 'number' ? (metaSource.limit as number) : params.limit ?? rawItems.length;

  const totalPagesCandidate =
    typeof metaSource.totalPages === 'number'
      ? (metaSource.totalPages as number)
      : typeof metaSource.total_pages === 'number'
        ? (metaSource.total_pages as number)
        : undefined;

  const totalPages =
    totalPagesCandidate !== undefined
      ? totalPagesCandidate
      : typeof total === 'number' && limit
        ? Math.max(1, Math.ceil(total / (limit || 1)))
        : undefined;

  return {
    data: rawItems.map((item) => normalizeCategoryRecord(item)),
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  };
};

const buildCategoryUrl = (path = '') => {
  const sanitizedPath = path.replace(/^\/+/, '');
  return buildApiUrl(sanitizedPath ? `categories/${sanitizedPath}` : 'categories');
};

const buildQueryString = (params: CategoryListQuery) => {
  const searchParams = new URLSearchParams();

  if (params.page && params.page > 0) {
    searchParams.set('page', String(params.page));
  }

  if (params.limit && params.limit > 0) {
    searchParams.set('limit', String(params.limit));
  }

  const search = params.search?.toString().trim();
  if (search) {
    searchParams.set('search', search);
  }

  if (typeof params.isActive === 'boolean') {
    searchParams.set('isActive', params.isActive ? 'true' : 'false');
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

const sanitizePayload = (values: CategoryPayload): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    name: values.name,
    slug: values.slug,
    isActive: values.isActive,
  };

  if ('description' in values) {
    payload.description = values.description ?? null;
  }

  if ('parentId' in values) {
    payload.parentId = values.parentId ?? null;
  }

  if ('order' in values) {
    payload.order = values.order ?? null;
  }

  return payload;
};

export async function listCategories(params: CategoryListQuery = {}): Promise<CategoryListResponse> {
  const query = buildQueryString(params);
  const response = await fetch(`${buildCategoryUrl()}${query}`);
  const payload = await handleResponse(response);

  return normalizeListResponse(payload, params);
}

export async function getCategory(id: string): Promise<Category> {
  if (!id) {
    throw new Error('Category id is required');
  }

  const response = await fetch(buildCategoryUrl(id));
  const payload = await handleResponse(response);
  const data = payload?.data ?? payload;

  return normalizeCategoryRecord(data);
}

export async function createCategory(data: CategoryPayload): Promise<Category> {
  const response = await fetch(buildCategoryUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sanitizePayload(data)),
  });

  const payload = await handleResponse(response);
  const record = payload?.data ?? payload;

  return normalizeCategoryRecord(record);
}

export async function updateCategory({
  id,
  data,
}: {
  id: string;
  data: CategoryPayload;
}): Promise<Category> {
  if (!id) {
    throw new Error('Category id is required');
  }

  const response = await fetch(buildCategoryUrl(id), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sanitizePayload(data)),
  });

  const payload = await handleResponse(response);
  const record = payload?.data ?? payload;

  return normalizeCategoryRecord(record);
}

export async function deleteCategory(id: string): Promise<void> {
  if (!id) {
    throw new Error('Category id is required');
  }

  const response = await fetch(buildCategoryUrl(id), {
    method: 'DELETE',
  });

  await handleResponse(response);
}

export const useCategoryList = (params: CategoryListQuery = {}) => {
  const queryParams: CategoryListQuery = {
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    search: params.search ?? null,
    isActive:
      typeof params.isActive === 'boolean'
        ? params.isActive
        : params.isActive === null
          ? null
          : undefined,
  };

  return useQuery<CategoryListResponse, Error>({
    queryKey: ['categories', queryParams],
    queryFn: () => listCategories(queryParams),
    keepPreviousData: true,
  });
};

export const useCategory = (
  id: string | undefined,
  options?: { enabled?: boolean },
) =>
  useQuery<Category, Error>({
    queryKey: ['category', id],
    queryFn: () => getCategory(id as string),
    enabled: options?.enabled ?? !!id,
  });

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CategoryPayload) => createCategory(values),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      void queryClient.invalidateQueries({ queryKey: ['category', result.id] });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryPayload }) => updateCategory({ id, data }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      void queryClient.invalidateQueries({ queryKey: ['category', result.id] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      if (id) {
        void queryClient.invalidateQueries({ queryKey: ['category', id] });
      }
    },
  });
};
