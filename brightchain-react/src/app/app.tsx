import { CONSTANTS } from '@brightchain/brightchain-lib';
import { IECIESConfig } from '@digitaldefiance/ecies-lib';
import {
  ApiAccess,
  AuthProvider,
  BackupCodeLoginWrapper,
  BackupCodesWrapper,
  ChangePasswordFormWrapper,
  LoginFormWrapper,
  LogoutPageWrapper,
  MenuProvider,
  PrivateRoute,
  RegisterFormWrapper,
  SuiteConfigProvider,
  TopMenu,
  TranslatedTitle,
  UnAuthRoute,
  UserSettingsFormWrapper,
  VerifyEmailPageWrapper,
} from '@digitaldefiance/express-suite-react-components';
import { LanguageRegistry } from '@digitaldefiance/i18n-lib';
import { IConstants } from '@digitaldefiance/suite-core-lib';
import { Box, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { FC, useCallback } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { environment } from '../environments/environment';
import '../styles.scss';
import { BrightChainSoupDemo } from './components/BrightChainSoupDemo';
import DashboardPage from './components/dashboardPage';
import { SplashPage } from './components/splashPage';

const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const appConfig = (window as { APP_CONFIG?: { apiUrl?: string } })
      .APP_CONFIG;
    if (appConfig?.apiUrl) {
      return appConfig.apiUrl;
    }
  }
  return environment.apiUrl || 'http://localhost:3000';
};

const API_BASE_URL: string = getApiBaseUrl();

const eciesConfig: IECIESConfig = {
  curveName: 'secp256k1',
  primaryKeyDerivationPath: "m/44'/0'/0'/0/0",
  mnemonicStrength: 256,
  symmetricAlgorithm: 'aes-256-gcm',
  symmetricKeyBits: 256,
  symmetricKeyMode: 'gcm',
};

const AuthProviderWithNavigation: FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <SuiteConfigProvider
      baseUrl={API_BASE_URL}
      routes={{
        dashboard: '/dashboard',
        login: '/login',
        register: '/register',
        verifyEmail: '/verify-email',
        settings: '/user-settings',
      }}
      languages={LanguageRegistry.getCodeLabelMap()}
    >
      <AuthProvider
        baseUrl={API_BASE_URL}
        constants={CONSTANTS as unknown as IConstants}
        eciesConfig={eciesConfig}
        onLogout={handleLogout}
      >
        {children}
      </AuthProvider>
    </SuiteConfigProvider>
  );
};

const App: FC = () => {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <TranslatedTitle
        componentId="brightchain.strings"
        stringKey="BrightChain"
      />
      <CssBaseline />
      <AuthProviderWithNavigation>
        <InnerApp />
      </AuthProviderWithNavigation>
    </LocalizationProvider>
  );
};

const LogoComponent = () => (
  <div style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>BrightChain</div>
);

const InnerApp: FC = () => {
  return (
    <MenuProvider menuConfigs={[]}>
      <Box className="app-container" sx={{ paddingTop: '64px' }}>
        <TopMenu Logo={<LogoComponent />} />
        <Routes>
          <Route path="/" element={<SplashPage />} />
          <Route path="/demo" element={<BrightChainSoupDemo />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/api-access"
            element={
              <PrivateRoute>
                <ApiAccess />
              </PrivateRoute>
            }
          />
          <Route path="/backup-code" element={<BackupCodeLoginWrapper />} />
          <Route
            path="/backup-codes"
            element={
              <PrivateRoute>
                <BackupCodesWrapper />
              </PrivateRoute>
            }
          />
          <Route
            path="/login"
            element={
              <UnAuthRoute>
                <LoginFormWrapper />
              </UnAuthRoute>
            }
          />
          <Route
            path="/logout"
            element={
              <PrivateRoute>
                <LogoutPageWrapper />
              </PrivateRoute>
            }
          />
          <Route
            path="/register"
            element={
              <UnAuthRoute>
                <RegisterFormWrapper />
              </UnAuthRoute>
            }
          />
          <Route
            path="/change-password"
            element={
              <PrivateRoute>
                <ChangePasswordFormWrapper />
              </PrivateRoute>
            }
          />
          <Route
            path="/verify-email"
            element={
              <UnAuthRoute>
                <VerifyEmailPageWrapper />
              </UnAuthRoute>
            }
          />
          <Route
            path="/user-settings"
            element={
              <PrivateRoute>
                <UserSettingsFormWrapper />
              </PrivateRoute>
            }
          />
        </Routes>
      </Box>
    </MenuProvider>
  );
};

export default App;
