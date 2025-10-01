import { AuthModel, UserModel } from '@/auth/lib/models';
import {
  getStoredUser,
  removeStoredUser,
  setStoredUser,
} from '@/auth/lib/helpers';
import { buildApiUrl } from '@/lib/api';

interface ApiLoginResponse {
  refreshToken: string;
  token: string;
  tokenExpires?: number;
  tokenType?: string;
  user: ApiUser;
}

interface ApiUser {
  id: number;
  email: string;
  phoneNumber?: string | null;
  provider?: string;
  socialId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: {
    id: number;
    name: string;
    __entity?: string;
  };
  status?: {
    id: number;
    name: string;
    __entity?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

function mapUser(payload: ApiUser): UserModel {
  const firstName = payload.firstName ?? '';
  const lastName = payload.lastName ?? '';
  const fullname = `${firstName} ${lastName}`.trim();
  const username = payload.email?.split('@')[0] || payload.email || '';

  return {
    id: payload.id,
    email: payload.email,
    username,
    first_name: firstName,
    last_name: lastName,
    fullname: fullname || undefined,
    phone: payload.phoneNumber ?? undefined,
    phoneNumber: payload.phoneNumber ?? undefined,
    provider: payload.provider,
    socialId: payload.socialId,
    role: payload.role,
    status: payload.status,
    is_admin: payload.role?.name?.toLowerCase() === 'admin',
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
    deletedAt: payload.deletedAt,
  };
}

async function parseResponse(response: Response): Promise<ApiLoginResponse> {
  const text = await response.text();
  if (!text) {
    throw new Error('Empty response from authentication server.');
  }

  try {
    return JSON.parse(text) as ApiLoginResponse;
  } catch (error) {
    console.error('Failed to parse login response', { error, text });
    throw new Error('Unable to process login response.');
  }
}

export const ApiAuthAdapter = {
  async login(
    email: string,
    password: string,
  ): Promise<{ auth: AuthModel; user: UserModel }> {
    const url = buildApiUrl('auth/email/login');

    let response: Response;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-custom-lang': 'en',
        },
        body: JSON.stringify({ email, password }),
      });
    } catch (error) {
      console.error('Network error during login', error);
      throw new Error('Unable to reach authentication server.');
    }

    const data = await parseResponse(response);

    if (!response.ok) {
      const errorMessage =
        (data as unknown as { message?: string; error?: string })?.message ||
        (data as unknown as { message?: string; error?: string })?.error ||
        'Invalid email or password.';
      throw new Error(errorMessage);
    }

    if (!data.token || !data.user) {
      throw new Error('Authentication response is missing data.');
    }

    const expiresValue =
      typeof data.tokenExpires === 'string'
        ? Number.parseInt(data.tokenExpires, 10)
        : data.tokenExpires;
    const normalizedExpires =
      typeof expiresValue === 'number' && Number.isFinite(expiresValue)
        ? expiresValue
        : undefined;

    const auth: AuthModel = {
      access_token: data.token,
      refresh_token: data.refreshToken,
      token_expires: normalizedExpires,
      token_type: data.tokenType,
    };

    const user = mapUser(data.user);
    setStoredUser(user);

    return { auth, user };
  },

  async getCurrentUser(auth?: AuthModel): Promise<UserModel | null> {
    if (!auth?.access_token) {
      return null;
    }

    if (auth.token_expires && auth.token_expires <= Date.now()) {
      throw new Error('Session expired.');
    }

    const stored = getStoredUser();
    return stored ?? null;
  },

  async logout(): Promise<void> {
    removeStoredUser();
  },
};

export type { ApiUser };
