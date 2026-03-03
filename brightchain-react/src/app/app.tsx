import {
  BrightChainComponentId,
  BrightChainStrings,
  BrightPassComponentId,
  BrightPassStrings,
  CoreConstants,
  i18nEngine,
  ISuiteCoreConstants,
  THEME_COLORS,
} from '@brightchain/brightchain-lib';
import { ECIES_CONFIG } from '@digitaldefiance/ecies-lib';
import {
  ApiAccess,
  AppThemeProvider,
  AuthenticatedApiProvider,
  AuthProvider,
  BackupCodeLoginWrapper,
  BackupCodesWrapper,
  ChangePasswordFormWrapper,
  createMenuType,
  ForgotPasswordFormWrapper,
  I18nProvider,
  IMenuConfig,
  LoginFormWrapper,
  LogoutPageWrapper,
  MenuProvider,
  PrivateRoute,
  RegisterFormWrapper,
  ResetPasswordFormWrapper,
  SuiteConfigProvider,
  TopMenu,
  TranslatedTitle,
  UnAuthRoute,
  useI18n,
  UserSettingsFormWrapper,
  VerifyEmailPageWrapper,
} from '@digitaldefiance/express-suite-react-components';
import { LanguageRegistry } from '@digitaldefiance/i18n-lib';
import {
  SuiteCoreComponentId,
  SuiteCoreStringKey,
  SuiteCoreStringKeyValue,
} from '@digitaldefiance/suite-core-lib';
import { Lock as LockIcon, Mail as MailIcon } from '@mui/icons-material';
import { Box, CircularProgress, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { FC, lazy, Suspense, useCallback } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { IncludeOnMenu } from '../enumerations/includeOnMenu';
import { environment } from '../environments/environment';
import '../styles.scss';
import BrightChainLogo from './components/BrightChainLogo';
import { BrightChainSoupDemo } from './components/BrightChainSoupDemo';
import DashboardPage from './components/dashboardPage';
import { BrightPassDemo } from './components/showcase/BrightPassDemo';
import { DatabaseDemo } from './components/showcase/DatabaseDemo';
import { IdentityDemo } from './components/showcase/IdentityDemo';
import { MessagingDemo } from './components/showcase/MessagingDemo';
import { StoragePoolsDemo } from './components/showcase/StoragePoolsDemo';
import { SplashPage } from './components/splashPage';
import { createAppTheme } from './theme';

// BrightMail components from the @brightchain/brightmail-react-components library
const BrightMailLayout = lazy(() =>
  import('@brightchain/brightmail-react-components').then((m) => ({
    default: m.BrightMailLayout,
  })),
);
const InboxView = lazy(() =>
  import('@brightchain/brightmail-react-components').then((m) => ({
    default: m.InboxView,
  })),
);
const ThreadView = lazy(() =>
  import('@brightchain/brightmail-react-components').then((m) => ({
    default: m.ThreadView,
  })),
);
const ComposeView = lazy(() =>
  import('@brightchain/brightmail-react-components').then((m) => ({
    default: m.ComposeView,
  })),
);

// Lazy-loaded BrightPass routes from the @brightchain/brightpass-react-components library
const BrightPassRoutes = lazy(() =>
  import('@brightchain/brightpass-react-components').then((m) => ({
    default: m.BrightPassRoutes,
  })),
);

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

const eciesConfig = ECIES_CONFIG;

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
        <AuthenticatedApiProvider>{children}</AuthenticatedApiProvider>
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

const InnerApp: FC = () => {
  const { tComponent } = useI18n();
  const t = (key: string) => tComponent(BrightChainComponentId, key);
  const tBrightPass = (key: string) => tComponent(BrightPassComponentId, key);

  const brightMailMenuConfig: IMenuConfig = {
    menuType: createMenuType(String(IncludeOnMenu.BrightMailMenu)),
    menuIcon: <MailIcon />,
    priority: 15,
    options: [
      {
        id: 'brightmail',
        label: t(BrightChainStrings.BrightMail_MenuLabel),
        includeOnMenus: [createMenuType(String(IncludeOnMenu.BrightMailMenu))],
        index: 15,
        icon: <MailIcon />,
        link: '/brightmail',
        requiresAuth: true,
      },
    ],
  };

  const brightPassMenuConfig: IMenuConfig = {
    menuType: createMenuType(String(IncludeOnMenu.BrightPassMenu)),
    menuIcon: <LockIcon />,
    priority: 50,
    options: [
      {
        id: 'brightpass',
        label: tBrightPass(BrightPassStrings.Menu_BrightPass),
        includeOnMenus: [createMenuType(String(IncludeOnMenu.BrightPassMenu))],
        index: 50,
        icon: <LockIcon />,
        link: '/brightpass',
        requiresAuth: true,
      },
    ],
  };

  return (
    <MenuProvider menuConfigs={[brightMailMenuConfig, brightPassMenuConfig]}>
      <Box className="app-container" sx={{ paddingTop: '64px' }}>
        <TopMenu
          Logo={
            <BrightChainLogo
              brightColor={THEME_COLORS.CHAIN_BLUE_DARK}
              chainColor={THEME_COLORS.CHAIN_BLUE_LIGHT}
              taglineColor={THEME_COLORS.TAGLINE_COLOR}
              height={40}
              width={200}
            />
          }
          constants={CoreConstants}
          showTitle={false}
        />
        <Suspense
          fallback={
            <Box display="flex" justifyContent="center" mt={4}>
              <CircularProgress />
            </Box>
          }
        >
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
              path="/forgot-password"
              element={
                <UnAuthRoute>
                  <ForgotPasswordFormWrapper />
                </UnAuthRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <UnAuthRoute>
                  <ResetPasswordFormWrapper />
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
            <Route
              path="/brightmail"
              element={
                <PrivateRoute>
                  <BrightMailLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<InboxView />} />
              <Route path="thread/:messageId" element={<ThreadView />} />
              <Route path="compose" element={<ComposeView />} />
            </Route>
            <Route path="/brightpass/*" element={<BrightPassRoutes />} />
          </Routes>
        </Suspense>
      </Box>
    </MenuProvider>
  );
};

export default App;
