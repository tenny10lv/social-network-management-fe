const sanitizeTrailingSlash = (value: string): string => value.replace(/\/$/, '');

const sanitizePathSegment = (value: string): string => value.replace(/^\/+|\/+$/g, '');

export const UNAUTHORIZED_EVENT = 'app:unauthorized';
export const DEFAULT_UNAUTHORIZED_MESSAGE = 'Session expired. Please sign in again.';

export type UnauthorizedEventDetail = {
  message?: string;
};

export class UnauthorizedError extends Error {
  constructor(message?: string) {
    super(message || 'Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

const isBrowser = () => typeof window !== 'undefined';

export function emitUnauthorized(detail: UnauthorizedEventDetail = {}) {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<UnauthorizedEventDetail>(UNAUTHORIZED_EVENT, { detail }),
  );
}

export function buildApiBaseUrl(): string {
  const baseUrl = sanitizeTrailingSlash(String(import.meta.env.VITE_API_URL ?? ''));
  const prefix = sanitizePathSegment(String(import.meta.env.VITE_API_PREFIX ?? ''));
  const version = sanitizePathSegment(String(import.meta.env.VITE_API_VERSION ?? ''));

  const segments = [baseUrl];
  if (prefix) segments.push(prefix);
  if (version) segments.push(version);

  const url = segments.filter(Boolean).join('/');

  if (!url) {
    throw new Error('API base URL is not configured.');
  }

  return url;
}

export function buildApiUrl(path = ''): string {
  const baseUrl = buildApiBaseUrl();
  const sanitizedPath = path.replace(/^\/+/, '');

  return sanitizedPath ? `${baseUrl}/${sanitizedPath}` : baseUrl;
}
