import { getData, setData } from '@/lib/storage';
import { AuthModel, UserModel } from './models';

const AUTH_LOCAL_STORAGE_KEY = `${import.meta.env.VITE_APP_NAME}-auth-v${
  import.meta.env.VITE_APP_VERSION || '1.0'
}`;
const AUTH_USER_LOCAL_STORAGE_KEY = `${AUTH_LOCAL_STORAGE_KEY}-user`;

/**
 * Get stored auth information from local storage
 */
const getAuth = (): AuthModel | undefined => {
  try {
    const auth = getData(AUTH_LOCAL_STORAGE_KEY) as AuthModel | undefined;
    return auth;
  } catch (error) {
    console.error('AUTH LOCAL STORAGE PARSE ERROR', error);
  }
};

const getStoredUser = (): UserModel | undefined => {
  try {
    const user = getData(AUTH_USER_LOCAL_STORAGE_KEY) as UserModel | undefined;
    return user;
  } catch (error) {
    console.error('AUTH USER LOCAL STORAGE PARSE ERROR', error);
  }
};

/**
 * Save auth information to local storage
 */
const setAuth = (auth: AuthModel) => {
  setData(AUTH_LOCAL_STORAGE_KEY, auth);
};

/**
 * Remove auth information from local storage
 */
const removeAuth = () => {
  if (!localStorage) {
    return;
  }

  try {
    localStorage.removeItem(AUTH_LOCAL_STORAGE_KEY);
  } catch (error) {
    console.error('AUTH LOCAL STORAGE REMOVE ERROR', error);
  }
};

const setStoredUser = (user: UserModel) => {
  setData(AUTH_USER_LOCAL_STORAGE_KEY, user);
};

const removeStoredUser = () => {
  if (!localStorage) {
    return;
  }

  try {
    localStorage.removeItem(AUTH_USER_LOCAL_STORAGE_KEY);
  } catch (error) {
    console.error('AUTH USER LOCAL STORAGE REMOVE ERROR', error);
  }
};

export {
  AUTH_LOCAL_STORAGE_KEY,
  AUTH_USER_LOCAL_STORAGE_KEY,
  getAuth,
  getStoredUser,
  removeAuth,
  removeStoredUser,
  setAuth,
  setStoredUser,
};
