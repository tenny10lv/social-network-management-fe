import { buildApiUrl } from '@/lib/api';

const WATCHLIST_ACCOUNTS_ENDPOINT = 'threads/watchlist/accounts';
const THREAD_CATEGORIES_ENDPOINT = 'categories';

const DEFAULT_ERROR_MESSAGE = 'Failed to add watchlist account. Please try again.';
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
