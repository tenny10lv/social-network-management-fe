const sanitizeUsername = (value?: string | null) => value?.trim().replace(/^@+/, '') || '';

const sanitizeBaseUrl = (value?: string | null) => (value ? value.replace(/\/+$/, '') : '');

export const THREADS_BASE_URL = sanitizeBaseUrl(
  String(import.meta.env.VITE_THREADS_BASE_URL ?? 'https://www.threads.net'),
);

export const buildThreadsProfileUrl = (username?: string | null) => {
  const sanitizedUsername = sanitizeUsername(username);

  if (!THREADS_BASE_URL || !sanitizedUsername) {
    return null;
  }

  return `${THREADS_BASE_URL}/@${sanitizedUsername}`;
};
