import { AUTH_LOCAL_STORAGE_KEY, getAuth, removeAuth } from '@/auth/lib/helpers';
import { DEFAULT_UNAUTHORIZED_MESSAGE, buildApiBaseUrl, emitUnauthorized } from '@/lib/api';
import { toast } from 'sonner';

export type AxiosLikeResponse<T = unknown> = {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  request: Request;
};

export type AxiosLikeRequestConfig = {
  params?: Record<string, unknown>;
  data?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  responseType?: 'json' | 'blob' | 'text';
};

const buildQueryString = (params?: Record<string, unknown>) => {
  if (!params || Object.keys(params).length === 0) {
    return '';
  }

  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        search.append(key, String(item));
      });
      return;
    }

    search.append(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : '';
};

const isBrowser = typeof window !== 'undefined';

const parseErrorMessage = (payload: unknown): string | undefined => {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const record = payload as Record<string, unknown>;

  const directKey = ['message', 'error', 'detail', 'title'];
  for (const key of directKey) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const validation = record.errors ?? record.errorMessages ?? record.validationErrors;
  if (validation && typeof validation === 'object') {
    const messages = Object.values(validation as Record<string, unknown>).flatMap((candidate) =>
      Array.isArray(candidate) ? candidate : [candidate],
    );

    const first = messages.find((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0);

    if (first) {
      return first.trim();
    }
  }

  return undefined;
};

class AxiosLikeClient {
  private baseURL: string;

  constructor() {
    this.baseURL = buildApiBaseUrl();
  }

  private buildUrl(path: string, params?: Record<string, unknown>) {
    const sanitizedPath = path.replace(/^\/+/, '');
    return `${this.baseURL}/${sanitizedPath}${buildQueryString(params)}`;
  }

  private buildHeaders(custom?: Record<string, string>) {
    const headers = new Headers();
    headers.set('accept', 'application/json');
    if (custom) {
      Object.entries(custom).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }

    return headers;
  }

  private attachAuth(headers: Headers) {
    try {
      const auth = getAuth();
      if (auth?.access_token) {
        headers.set('Authorization', `Bearer ${auth.access_token}`);
      }
    } catch (error) {
      console.warn('Failed to read auth token for request', error);
    }
  }

  private async parseResponse<T>(response: Response, responseType: AxiosLikeRequestConfig['responseType']) {
    if (responseType === 'blob') {
      const blob = await response.blob();
      return blob as T;
    }

    if (responseType === 'text') {
      const text = await response.text();
      return text as T;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();

    if (!text) {
      return undefined as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch (error) {
      console.warn('Failed to parse JSON response', error);
      return undefined as T;
    }
  }

  private async request<T>(method: string, path: string, config: AxiosLikeRequestConfig = {}): Promise<AxiosLikeResponse<T>> {
    const { params, data, headers: customHeaders, signal, responseType = 'json' } = config;

    const url = this.buildUrl(path, params);
    const headers = this.buildHeaders(customHeaders);

    if (data !== undefined && !(data instanceof FormData)) {
      headers.set('content-type', headers.get('content-type') ?? 'application/json');
    }

    this.attachAuth(headers);

    const body = data instanceof FormData ? data : data !== undefined ? JSON.stringify(data) : undefined;

    const request = new Request(url, {
      method,
      headers,
      body,
      signal,
    });

    const response = await fetch(request);

    if (response.status === 401) {
      emitUnauthorized({ message: DEFAULT_UNAUTHORIZED_MESSAGE });
      try {
        removeAuth();
        if (isBrowser) {
          sessionStorage.removeItem(AUTH_LOCAL_STORAGE_KEY);
        }
      } catch (error) {
        console.warn('Failed to clear auth data after unauthorized response', error);
      }
    }

    if (!response.ok) {
      let payload: unknown;
      try {
        payload = await this.parseResponse(response, 'json');
      } catch (error) {
        console.warn('Failed to parse error response payload', error);
      }

      const fallbackMessage =
        response.status === 401 ? DEFAULT_UNAUTHORIZED_MESSAGE : 'Request failed. Please try again.';
      const message = parseErrorMessage(payload) ?? fallbackMessage;

      if (response.status >= 500) {
        toast.error('Server error. Please try again later.');
      } else if (response.status === 422) {
        if (payload && typeof payload === 'object') {
          const validation = (payload as Record<string, unknown>).errors ?? (payload as Record<string, unknown>).errorMessages;
          if (validation && typeof validation === 'object') {
            Object.values(validation as Record<string, unknown>)
              .flatMap((item) => (Array.isArray(item) ? item : [item]))
              .forEach((item) => {
                if (typeof item === 'string' && item.trim()) {
                  toast.error(item.trim());
                }
              });
          }
        }
      } else if (message) {
        toast.error(message);
      }

      throw Object.assign(new Error(message), {
        response,
        status: response.status,
      });
    }

    const payload = await this.parseResponse<T>(response, responseType);

    return {
      data: payload as T,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      request,
    };
  }

  get<T>(path: string, config?: AxiosLikeRequestConfig) {
    return this.request<T>('GET', path, config);
  }

  post<T>(path: string, data?: unknown, config?: AxiosLikeRequestConfig) {
    return this.request<T>('POST', path, { ...(config ?? {}), data });
  }

  patch<T>(path: string, data?: unknown, config?: AxiosLikeRequestConfig) {
    return this.request<T>('PATCH', path, { ...(config ?? {}), data });
  }

  delete<T>(path: string, config?: AxiosLikeRequestConfig) {
    return this.request<T>('DELETE', path, config);
  }
}

export const axiosInstance = new AxiosLikeClient();

export type { AxiosLikeClient };
