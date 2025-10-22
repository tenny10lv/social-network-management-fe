import { buildApiUrl } from '@/lib/api';

const WATCHLIST_ACCOUNTS_ENDPOINT = 'threads/watchlist/accounts';

const DEFAULT_ERROR_MESSAGE = 'Failed to add watchlist account. Please try again.';

type CreateWatchlistAccountArgs = {
  username: string;
};

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

export async function createWatchlistAccount({ username }: CreateWatchlistAccountArgs) {
  const trimmed = username.trim();
  const payload = { username: trimmed };

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
