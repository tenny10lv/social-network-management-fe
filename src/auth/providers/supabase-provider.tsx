import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { ApiAuthAdapter } from '@/auth/adapters/api-auth-adapter';
import { SupabaseAdapter } from '@/auth/adapters/supabase-adapter';
import { AuthContext } from '@/auth/context/auth-context';
import * as authHelper from '@/auth/lib/helpers';
import { AuthModel, UserModel } from '@/auth/lib/models';
import {
  DEFAULT_UNAUTHORIZED_MESSAGE,
  UNAUTHORIZED_EVENT,
  UnauthorizedEventDetail,
} from '@/lib/api';
import { toast } from 'sonner';

// Define the Supabase Auth Provider
export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<AuthModel | undefined>(authHelper.getAuth());
  const [currentUser, setCurrentUser] = useState<UserModel | undefined>(
    authHelper.getStoredUser(),
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const unauthorizedHandledRef = useRef(false);

  useEffect(() => {
    if (auth?.access_token) {
      unauthorizedHandledRef.current = false;
    }
  }, [auth?.access_token]);

  // Check if user is admin
  useEffect(() => {
    setIsAdmin(currentUser?.is_admin === true);
  }, [currentUser]);

  const verify = async () => {
    if (!auth?.access_token) {
      setCurrentUser(undefined);
      authHelper.removeStoredUser();
      return;
    }

    try {
      const user = await getUser();
      if (!user) {
        throw new Error('User not found');
      }
      setCurrentUser(user);
    } catch (error) {
      saveAuth(undefined);
      setCurrentUser(undefined);
      throw error;
    }
  };

  const saveAuth = (auth: AuthModel | undefined) => {
    setAuth(auth);
    if (auth) {
      authHelper.setAuth(auth);
    } else {
      authHelper.removeAuth();
      authHelper.removeStoredUser();
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { auth: authData, user } = await ApiAuthAdapter.login(email, password);
      saveAuth(authData);
      setCurrentUser(user);
    } catch (error) {
      saveAuth(undefined);
      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    password_confirmation: string,
    firstName?: string,
    lastName?: string,
  ) => {
    try {
      const auth = await SupabaseAdapter.register(
        email,
        password,
        password_confirmation,
        firstName,
        lastName,
      );
      saveAuth(auth);
      const user = await getUser();
      setCurrentUser(user || undefined);
    } catch (error) {
      saveAuth(undefined);
      throw error;
    }
  };

  const requestPasswordReset = async (email: string) => {
    await SupabaseAdapter.requestPasswordReset(email);
  };

  const resetPassword = async (
    password: string,
    password_confirmation: string,
  ) => {
    await SupabaseAdapter.resetPassword(password, password_confirmation);
  };

  const resendVerificationEmail = async (email: string) => {
    await SupabaseAdapter.resendVerificationEmail(email);
  };

  const getUser = async () => {
    if (auth?.access_token) {
      const apiUser = await ApiAuthAdapter.getCurrentUser(auth);
      if (apiUser) {
        return apiUser;
      }
    }

    return await SupabaseAdapter.getCurrentUser();
  };

  const updateProfile = async (userData: Partial<UserModel>) => {
    return await SupabaseAdapter.updateUserProfile(userData);
  };

  const logout = () => {
    ApiAuthAdapter.logout().catch((error) => {
      console.error('API logout error', error);
    });
    SupabaseAdapter.logout().catch((error) => {
      console.error('Supabase logout error', error);
    });
    saveAuth(undefined);
    setCurrentUser(undefined);
  };

  const logoutRef = useRef(logout);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleUnauthorized = (event: Event) => {
      if (unauthorizedHandledRef.current) {
        return;
      }

      unauthorizedHandledRef.current = true;

      const { detail } = event as CustomEvent<UnauthorizedEventDetail>;
      const message = detail?.message || DEFAULT_UNAUTHORIZED_MESSAGE;

      toast.error(message);

      logoutRef.current?.();
    };

    window.addEventListener(
      UNAUTHORIZED_EVENT,
      handleUnauthorized as EventListener,
    );

    return () => {
      window.removeEventListener(
        UNAUTHORIZED_EVENT,
        handleUnauthorized as EventListener,
      );
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        loading,
        setLoading,
        auth,
        saveAuth,
        user: currentUser,
        setUser: setCurrentUser,
        login,
        register,
        requestPasswordReset,
        resetPassword,
        resendVerificationEmail,
        getUser,
        updateProfile,
        logout,
        verify,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
