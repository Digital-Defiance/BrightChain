import {
  GlobalLanguageContext,
  IRequestUser,
  ISuccessMessage,
  LanguageCodes,
  StringLanguages,
  StringNames,
  translate,
} from '@BrightChain/brightchain-lib';
import { isAxiosError } from 'axios';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import i18n from './i18n';
import authService from './services/auth';
import api from './services/authenticatedApi';

export interface AuthContextData {
  user: IRequestUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  errorType: string | null;
  login: (
    identifier: string,
    password: string,
    isEmail: boolean,
  ) => Promise<{ token: string } | { error: string; status?: number }>;
  logout: () => void;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<ISuccessMessage>;
  verifyToken: (token: string) => Promise<void>;
  checkAuth: () => void;
  authState: number;
  language: StringLanguages;
  register: (
    username: string,
    displayname: string,
    email: string,
    password: string,
    timezone: string,
  ) => Promise<
    | { success: boolean; message: string }
    | { error: string; errorType?: string }
  >;
  setUser: (user: IRequestUser | null) => void;
  setLanguage: (lang: StringLanguages) => void;
  token: string | null;
  setToken: (token: string | null) => void;
}

export type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext<AuthContextData>(
  {} as AuthContextData,
);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<IRequestUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [authState, setAuthState] = useState(0);
  const navigate = useNavigate();

  const [language, setLanguage] = useState<StringLanguages>(() => {
    return (
      (localStorage.getItem('language') as StringLanguages) ??
      StringLanguages.EnglishUS
    );
  });

  useEffect(() => {
    if (user && user.siteLanguage) {
      (async () => {
        await i18n.changeLanguage(LanguageCodes[language]);
        localStorage.setItem('language', user.siteLanguage);
        localStorage.setItem('languageCode', LanguageCodes[user.siteLanguage]);
        setLanguage(user.siteLanguage);
      })();
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      await i18n.changeLanguage(LanguageCodes[language]);
      localStorage.setItem('language', language);
      localStorage.setItem('langugeCode', LanguageCodes[language]);
    })();
  }, [language]);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      setToken(null);
      return;
    }

    try {
      const userData = await authService.verifyToken(token);
      if ('error' in userData && typeof userData.error === 'string') {
        setError(userData.error);
        if (
          'errorType' in userData &&
          userData.errorType &&
          typeof userData.errorType === 'string'
        ) {
          setErrorType(userData.errorType);
        }
        setToken(null);
        setIsAuthenticated(false);
      } else {
        setUser(userData as IRequestUser);
        setIsAuthenticated(true);
        setToken(token);
        setError(null);
        setErrorType(null);
      }
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      if (isAxiosError(error)) {
        if (error.response?.data?.errorType) {
          setErrorType(error.response.data.errorType);
        }
        if (error.response?.data?.message) {
          setError(error.response.data.message);
        } else {
          setError(error.message);
        }
      } else {
        setError(translate(StringNames.Error_UnexpectedError));
      }
      localStorage.removeItem('authToken');
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(
    async (
      username: string,
      displayname: string,
      email: string,
      password: string,
      timezone: string,
    ): Promise<
      | { success: boolean; message: string }
      | { error: string; errorType?: string }
    > => {
      setLoading(true);
      const registerResult = await authService.register(
        username,
        displayname,
        email,
        password,
        timezone,
      );
      setLoading(false);
      if (
        typeof registerResult === 'object' &&
        'success' in registerResult &&
        registerResult.success
      ) {
        setError(null);
        setErrorType(null);
        return {
          success: true,
          message:
            registerResult.message ?? translate(StringNames.Register_Success),
        };
      } else if (
        typeof registerResult === 'object' &&
        'error' in registerResult
      ) {
        setError(registerResult.error);
        if ('errorType' in registerResult && registerResult.errorType) {
          setErrorType(registerResult.errorType);
        }
        return {
          error: registerResult.error,
          errorType: registerResult.errorType,
        };
      } else {
        setError(translate(StringNames.Error_UnexpectedError));
        return { error: translate(StringNames.Error_UnexpectedError) };
      }
    },
    [],
  );

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      (async () => {
        await checkAuth();
      })();
    } else {
      setLoading(false);
    }
  }, [checkAuth, authState]);

  const login = useCallback(
    async (
      identifier: string,
      password: string,
      isEmail: boolean,
    ): Promise<{ token: string } | { error: string; status?: number }> => {
      setLoading(true);
      const loginResult = await authService.login(
        identifier,
        password,
        isEmail,
      );
      setLoading(false);
      // if loginResult is an object with an error, setError with it
      if (typeof loginResult === 'object' && 'error' in loginResult) {
        setError(loginResult.error);
        if ('errorType' in loginResult && loginResult.errorType) {
          setErrorType(loginResult.errorType ?? null);
        }
      } else if (typeof loginResult === 'object' && 'token' in loginResult) {
        localStorage.setItem('authToken', loginResult.token);
        setAuthState((prev) => prev + 1);
        setToken(loginResult.token);
        setError(null);
        setErrorType(null);
      }
      return loginResult;
    },
    [],
  );

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setError(null);
    setErrorType(null);
    setAuthState((prev) => prev + 1);
    navigate('/');
  }, [navigate]);

  const verifyToken = useCallback(async (token: string) => {
    const requestUser = await authService.verifyToken(token);
    if (typeof requestUser === 'object' && 'error' in requestUser) {
      setError(requestUser.error);
      if ('errorType' in requestUser && requestUser.errorType) {
        setErrorType(requestUser.errorType);
      }
      setIsAuthenticated(false);
    } else {
      setUser(requestUser);
      setIsAuthenticated(true);
    }
  }, []);

  const changePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string,
    ): Promise<ISuccessMessage> => {
      try {
        const response = await authService.changePassword(
          currentPassword,
          newPassword,
        );
        // Handle success (e.g., show a message)
        setError(null);
        setErrorType(null);
        return {
          success: true,
          message: response,
        };
      } catch (error) {
        // Handle error (e.g., set error state)
        if (isAxiosError(error)) {
          setError(error.response?.data?.message ?? error.message);
          if (error.response?.data.errorType) {
            setErrorType(error.response.data.errorType);
          }
          throw new Error(
            error.response?.data?.message ||
              translate(StringNames.Error_UnexpectedError),
          );
        } else if (error instanceof Error) {
          throw error;
        } else {
          throw new Error(translate(StringNames.Error_UnexpectedError));
        }
      }
    },
    [],
  );

  const contextValue = useMemo(() => {
    const setUserAndLanguage = (newUser: IRequestUser | null) => {
      setUser(newUser);
      if (newUser && newUser.siteLanguage) {
        setLanguage(newUser.siteLanguage);
      }
      setIsAuthenticated(!!newUser);
    };

    const setLanguageAndUpdateUser = (newLanguage: StringLanguages) => {
      setLanguage(newLanguage);
      GlobalLanguageContext.language = newLanguage;
      if (user) {
        try {
          // Make API call to update user language
          api
            .post('/user/language', { language: newLanguage })
            .then((response) => {
              const user = response.data as IRequestUser;
              setUser(user);
              setError(null);
              setErrorType(null);
            });
        } catch (error) {
          if (isAxiosError(error)) {
            setError(error.response?.data?.message ?? error.message);
            if (error.response?.data.errorType) {
              setErrorType(error.response.data.errorType);
            }
          } else if (error instanceof Error) {
            setError(error.message);
            setErrorType(null);
          } else {
            setError(translate(StringNames.Error_UnexpectedError));
            setErrorType(null);
          }
        }
      }
    };

    return {
      user,
      setUser: setUserAndLanguage,
      isAuthenticated,
      loading,
      error,
      errorType,
      changePassword,
      login,
      logout,
      verifyToken,
      checkAuth,
      authState,
      token,
      setToken,
      language,
      setLanguage: setLanguageAndUpdateUser,
      register,
    };
  }, [
    user,
    setUser,
    isAuthenticated,
    loading,
    error,
    errorType,
    changePassword,
    login,
    logout,
    verifyToken,
    checkAuth,
    authState,
    token,
    setToken,
    language,
    setLanguage,
    register,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
