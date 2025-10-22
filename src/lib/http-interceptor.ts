import { AUTH_LOCAL_STORAGE_KEY, getAuth, removeAuth, setAuth } from '@/auth/lib/helpers';
import { AuthModel } from '@/auth/lib/models';
import { DEFAULT_UNAUTHORIZED_MESSAGE, buildApiBaseUrl, buildApiUrl, emitUnauthorized } from '@/lib/api';
import { toast } from 'sonner';

type LoginResponsePayload = {
  token?: string;
  refreshToken?: string;
  tokenExpires?: number | string;
  tokenType?: string;
};

const isBrowserEnvironment = typeof window !== 'undefined';

let interceptorsInitialized = false;

const toNumberOrUndefined = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const persistToken = (payload: LoginResponsePayload) => {
  if (!payload?.token) {
    return;
  }

  const tokenExpires = toNumberOrUndefined(payload.tokenExpires);

  const auth: AuthModel = {
    access_token: payload.token,
    refresh_token: payload.refreshToken,
    token_expires: tokenExpires,
    token_type: payload.tokenType,
  };

  try {
    setAuth(auth);
  } catch (error) {
    console.error('Failed to persist auth token', error);
  }

  if (!isBrowserEnvironment) {
    return;
  }

  try {
    sessionStorage.setItem(AUTH_LOCAL_STORAGE_KEY, JSON.stringify(auth));
  } catch (error) {
    console.warn('Unable to mirror auth token to sessionStorage', error);
  }
};

const shouldAttachAuthHeader = (url: string, loginUrl: string, apiBaseUrl: string, token?: string) => {
  if (!token) {
    return false;
  }

  const normalizedUrl = url.split('?')[0];

  if (normalizedUrl === loginUrl) {
    return false;
  }

  return normalizedUrl.startsWith(apiBaseUrl);
};

const isTokenExpired = (expires?: number) => {
  if (!expires) {
    return false;
  }

  return expires <= Date.now();
};

const isLikelyExceptionIdentifier = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  if (!/exception$/i.test(trimmed)) {
    return false;
  }

  return !/\s/.test(trimmed);
};

export function initializeHttpInterceptors() {
  if (interceptorsInitialized || !isBrowserEnvironment) {
    return;
  }

  const { fetch: originalFetch } = window;

  if (typeof originalFetch !== 'function') {
    return;
  }

  let apiBaseUrl: string;
  let loginUrl: string;

  try {
    apiBaseUrl = buildApiBaseUrl();
    loginUrl = buildApiUrl('auth/email/login');
  } catch (error) {
    console.error('Failed to initialize HTTP interceptors', error);
    return;
  }

  // Override fetch so API calls automatically include the bearer token.
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const requestUrl = request.url;
    const headers = new Headers(request.headers);

    let authModel: AuthModel | undefined;

    try {
      authModel = getAuth();
    } catch (error) {
      console.warn('Failed to read stored auth data', error);
    }

    if (authModel && isTokenExpired(authModel.token_expires)) {
      try {
        removeAuth();
      } catch (error) {
        console.error('Failed to remove expired auth data', error);
      }

      emitUnauthorized({ message: DEFAULT_UNAUTHORIZED_MESSAGE });
      authModel = undefined;
    }

    if (shouldAttachAuthHeader(requestUrl, loginUrl, apiBaseUrl, authModel?.access_token)) {
      headers.set('Authorization', `Bearer ${authModel!.access_token}`);
    }

    const authorizedRequest = new Request(request, { headers });

    const response = await originalFetch(authorizedRequest);

    if (requestUrl.split('?')[0] === loginUrl && response.ok) {
      try {
        const clone = response.clone();
        const payload = (await clone.json()) as LoginResponsePayload;
        persistToken(payload);
      } catch (error) {
        console.error('Failed to handle login response for token persistence', error);
      }
    }

    if (response.status === 401 && requestUrl.split('?')[0] !== loginUrl) {
      emitUnauthorized({ message: DEFAULT_UNAUTHORIZED_MESSAGE });
    }

    if (response.status === 422) {
      try {
        const clone = response.clone();
        const payload = await clone.json();

        if (payload?.status === 422 && payload?.errorMessages && typeof payload.errorMessages === 'object') {
          const messages = Object.values(payload.errorMessages as Record<string, unknown>)
            .flatMap((value) => (Array.isArray(value) ? value : [value]))
            .filter(
              (value): value is string =>
                typeof value === 'string' &&
                value.trim().length > 0 &&
                !isLikelyExceptionIdentifier(value),
            );

          messages.forEach((message) => {
            toast.error(message);
          });
        }
      } catch (error) {
        console.error('Failed to handle validation error response', error);
      }
    }

    if (response.status !== 200 && response.status !== 201) {
      try {
        const clone = response.clone();
        await clone.json();
      } catch (error) {
        console.error('Failed to parse error response', error);
      }
    }

    return response;
  };

  interceptorsInitialized = true;
}
