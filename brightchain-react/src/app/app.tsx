import {
  CoreConstants,
  i18nEngine,
  ISuiteCoreConstants,
} from '@brightchain/brightchain-lib';
import { IECIESConfig } from '@digitaldefiance/ecies-lib';
import {
  ApiAccess,
  AppThemeProvider,
  AuthProvider,
  BackupCodeLoginWrapper,
  BackupCodesWrapper,
  ChangePasswordFormWrapper,
  I18nProvider,
  LoginFormWrapper,
  LogoutPageWrapper,
  MenuProvider,
  PrivateRoute,
  RegisterFormWrapper,
  SuiteConfigProvider,
  TDivBranded,
  TopMenu,
  TranslatedTitle,
  UnAuthRoute,
  UserSettingsFormWrapper,
  VerifyEmailPageWrapper,
} from '@digitaldefiance/express-suite-react-components';
import { LanguageRegistry } from '@digitaldefiance/i18n-lib';
import {
  SuiteCoreComponentId,
  SuiteCoreStringKey,
  SuiteCoreStringKeyValue,
} from '@digitaldefiance/suite-core-lib';
import { Box, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { FC, useCallback } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { environment } from '../environments/environment';
import '../styles.scss';
import { BrightChainSoupDemo } from './components/BrightChainSoupDemo';
import DashboardPage from './components/dashboardPage';
import { BrightPassDemo } from './components/showcase/BrightPassDemo';
import { DatabaseDemo } from './components/showcase/DatabaseDemo';
import { IdentityDemo } from './components/showcase/IdentityDemo';
import { MessagingDemo } from './components/showcase/MessagingDemo';
import { StoragePoolsDemo } from './components/showcase/StoragePoolsDemo';
import { SplashPage } from './components/splashPage';
import { createAppTheme } from './theme';

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
        constants={CoreConstants as ISuiteCoreConstants}
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
      <I18nProvider i18nEngine={i18nEngine}>
        <TranslatedTitle<SuiteCoreStringKeyValue>
          componentId={SuiteCoreComponentId}
          stringKey={SuiteCoreStringKey.Common_SiteTemplate}
          vars={{ Site: CoreConstants.Site }}
        />
        <AppThemeProvider customTheme={createAppTheme}>
          <CssBaseline />
          <AuthProviderWithNavigation>
            <InnerApp />
          </AuthProviderWithNavigation>
        </AppThemeProvider>
      </I18nProvider>
    </LocalizationProvider>
  );
};

const LogoComponent = () => (
  <TDivBranded
    stringKey={SuiteCoreStringKey.Common_SiteTemplate}
    vars={{ Site: CoreConstants.Site }}
    divOptions={{ style: { fontWeight: 'bold', fontSize: '1.5rem' } }}
  />
);

const InnerApp: FC = () => {
  return (
    <MenuProvider menuConfigs={[]}>
      <Box className="app-container" sx={{ paddingTop: '64px' }}>
        <TopMenu Logo={<LogoComponent />} constants={CoreConstants} />
        <Routes>
          <Route path="/" element={<SplashPage />} />
          <Route path="/demo" element={<BrightChainSoupDemo />} />
          <Route
            path="/showcase/storage-pools"
            element={<StoragePoolsDemo />}
          />
          <Route path="/showcase/messaging" element={<MessagingDemo />} />
          <Route path="/showcase/brightpass" element={<BrightPassDemo />} />
          <Route path="/showcase/database" element={<DatabaseDemo />} />
          <Route path="/showcase/identity" element={<IdentityDemo />} />
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
