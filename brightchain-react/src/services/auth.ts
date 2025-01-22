// services/authService.js
import {
  IRequestUser,
  StringLanguages,
  StringNames,
  translate,
} from '@BrightChain/brightchain-lib';
import { isAxiosError } from 'axios';
import api from './api';
import authenticatedApi from './authenticatedApi';

interface AuthContextFunctions {
  setUser: (user: IRequestUser | null) => void;
  setLanguage: (lang: StringLanguages) => void;
}

let authContextFunctions: AuthContextFunctions | null = null;

export const setAuthContextFunctions = (functions: AuthContextFunctions) => {
  authContextFunctions = functions;
};

const login = async (
  identifier: string,
  password: string,
  isEmail: boolean,
): Promise<
  { token: string } | { error: string; status?: number; errorType?: string }
> => {
  try {
    const response = await api.post('/user/login', {
      [isEmail ? 'email' : 'username']: identifier,
      password,
    });
    if (response.data.user) {
      if (authContextFunctions) {
        authContextFunctions.setUser(response.data.user);
      }
    }
    if (response.data.token) {
      return { token: response.data.token };
    }
    return {
      error: response.data.message
        ? response.data.message
        : translate(StringNames.Error_TokenInvalid),
      ...(response.data.errorType
        ? { errorType: response.data.errorType }
        : {}),
    };
  } catch (error) {
    console.error('Login error:', error);
    if (isAxiosError(error) && error.response) {
      return {
        error:
          error.response.data.error.message ??
          error.response.data.message ??
          error.message ??
          translate(StringNames.Error_UnexpectedError),
        ...(error.response.data.errorType
          ? { errorType: error.response.data.errorType }
          : {}),
        status: error.response.status,
      };
    }
    return { error: translate(StringNames.Error_UnexpectedError) };
  }
};

const register = async (
  username: string,
  email: string,
  password: string,
  timezone: string,
): Promise<
  { success: boolean; message: string } | { error: string; errorType?: string }
> => {
  try {
    const response = await api.post('/user/register', {
      username,
      email,
      password,
      timezone,
    });
    if (response.status !== 201) {
      return {
        error: response.data.message
          ? response.data.message
          : translate(StringNames.Register_Error),
        ...(response.data.errorType
          ? { errorType: response.data.errorType }
          : {}),
      };
    }
    return {
      success: true,
      message: response.data.message ?? translate(StringNames.Register_Success),
    };
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return {
        error:
          error.response.data.error.message ??
          error.response.data.message ??
          error.message ??
          translate(StringNames.Error_UnexpectedError),
        ...(error.response.data.errorType
          ? { errorType: error.response.data.errorType }
          : {}),
      };
    } else {
      return {
        error: translate(StringNames.Error_UnexpectedError),
      };
    }
  }
};

const changePassword = async (currentPassword: string, newPassword: string) => {
  // if we get a 200 response, the password was changed successfully
  // else, we throw an error with the response message
  const response = await authenticatedApi.post('/user/change-password', {
    currentPassword,
    newPassword,
  });
  if (response.status === 200) {
    return response.data;
  } else {
    throw new Error(response.data.message || 'An unexpected error occurred');
  }
};
const logout = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('authToken');
  if (authContextFunctions) {
    authContextFunctions.setUser(null);
  }
};

const verifyToken = async (
  token: string,
): Promise<IRequestUser | { error: string; errorType?: string }> => {
  try {
    const response = await api.get('/user/verify', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.user as IRequestUser;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return {
        error: error.response.data.message
          ? error.response.data.message
          : error.message
            ? error.message
            : translate(StringNames.Error_UnexpectedError),
        ...(error.response.data.errorType
          ? { errorType: error.response.data.errorType }
          : {}),
      };
    } else {
      return {
        error: translate(StringNames.Error_UnexpectedError),
      };
    }
  }
};

const refreshToken = async () => {
  // Refresh the token to update roles
  try {
    const refreshResponse = await authenticatedApi.get('/user/refresh-token');
    if (refreshResponse.status === 200) {
      const newToken = refreshResponse.headers['authorization'];
      if (newToken?.startsWith('Bearer ')) {
        const token = newToken.slice(7); // Remove 'Bearer ' prefix
        // Update the stored authToken
        localStorage.setItem('authToken', token);
      }
      if (refreshResponse.data.user) {
        localStorage.setItem('user', JSON.stringify(refreshResponse.data.user));
        if (authContextFunctions) {
          authContextFunctions.setUser(refreshResponse.data.user);
        }
      }
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    if (isAxiosError(error) && error.response) {
      console.error('Error response:', error.response.data);
      console.error('Error status:', error.response.status);
    }
    throw new Error('An unexpected error occurred during token refresh');
  }
};

export default {
  changePassword,
  login,
  register,
  logout,
  verifyToken,
  refreshToken,
};
