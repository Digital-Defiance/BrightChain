import {
  faEnvelope,
  faLock,
} from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { faCircleNodes } from '@awesome.me/kit-a20d532681/icons/classic/thin';
import {
  CONSTANTS,
  CoreConstants,
  i18nEngine,
  ISuiteCoreConstants,
  THEME_COLORS,
} from '@brightchain/brightchain-lib';
import {
  BrightChainLogo,
  BrightChainSoupDemo,
  BrightChainSubLogo,
  BrightPassDemo,
  DatabaseDemo,
  IdentityDemo,
  MessagingDemo,
  StoragePoolsDemo,
} from '@brightchain/brightchain-react-components';
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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, CircularProgress, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { FC, lazy, Suspense, useCallback } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { IncludeOnMenu } from '../enumerations/includeOnMenu';
import { environment } from '../environments/environment';
import '../styles.scss';
import DashboardPage from './components/DashboardPage';
import { SplashPage } from './components/SplashPage';
import { createAppTheme } from './theme';

// Lazy-loaded module routes
const BrightMailRoutes = lazy(() =>
  import('./brightmail-routes').then((m) => ({
    default: m.default,
  })),
);
const BrightPassRoutes = lazy(() =>
  import('./brightpass-routes').then((m) => ({
    default: m.default,
  })),
);
const BrightHubRoutes = lazy(() =>
  import('./brighthub-routes').then((m) => ({
    default: m.BrightHubRoutes,
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

const getEmailDomain = (): string => {
  if (typeof window !== 'undefined') {
    const appConfig = (window as { APP_CONFIG?: { emailDomain?: string } })
      .APP_CONFIG;
    if (appConfig?.emailDomain) {
      return appConfig.emailDomain;
    }
  }
  return environment.emailDomain || 'example.com';
};

const API_BASE_URL: string = getApiBaseUrl();

const emailDomain: string = getEmailDomain();

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
        emailDomain={emailDomain}
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
  const { tBranded: t } = useI18n();

  const brightMailMenuConfig: IMenuConfig = {
    menuType: createMenuType(String(IncludeOnMenu.BrightMailMenu)),
    menuIcon: <FontAwesomeIcon icon={faEnvelope} />,
    priority: 15,
    options: [
      {
        id: 'brightmail',
        label: <BrightChainSubLogo subText="Mail" height={24} />,
        includeOnMenus: [createMenuType(String(IncludeOnMenu.BrightMailMenu))],
        index: 15,
        icon: (
          <FontAwesomeIcon
            icon={faEnvelope}
            style={{ color: CONSTANTS.THEME_COLORS.CHAIN_BLUE_DARK }}
          />
        ),
        link: '/brightmail',
        requiresAuth: true,
      },
    ],
  };

  const brightPassMenuConfig: IMenuConfig = {
    menuType: createMenuType(String(IncludeOnMenu.BrightPassMenu)),
    menuIcon: <FontAwesomeIcon icon={faLock} />,
    priority: 50,
    options: [
      {
        id: 'brightpass',
        label: <BrightChainSubLogo subText="Pass" height={24} />,
        includeOnMenus: [createMenuType(String(IncludeOnMenu.BrightPassMenu))],
        index: 50,
        icon: (
          <FontAwesomeIcon
            icon={faLock}
            style={{ color: CONSTANTS.THEME_COLORS.CHAIN_BLUE_DARK }}
          />
        ),
        link: '/brightpass',
        requiresAuth: true,
      },
    ],
  };

  const brightHubMenuConfig: IMenuConfig = {
    menuType: createMenuType(String(IncludeOnMenu.BrightHubMenu)),
    menuIcon: <FontAwesomeIcon icon={faCircleNodes} />,
    priority: 75,
    options: [
      {
        id: 'brighthub',
        label: <BrightChainSubLogo subText="Hub" height={24} />,
        includeOnMenus: [createMenuType(String(IncludeOnMenu.BrightHubMenu))],
        index: 50,
        icon: (
          <FontAwesomeIcon
            icon={faCircleNodes}
            style={{ color: CONSTANTS.THEME_COLORS.CHAIN_BLUE_DARK }}
          />
        ),
        link: '/brighthub',
        requiresAuth: true,
      },
    ],
  };

  return (
    <MenuProvider
      menuConfigs={[
        brightMailMenuConfig,
        brightPassMenuConfig,
        brightHubMenuConfig,
      ]}
    >
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
            <Route path="/brightmail/*" element={<BrightMailRoutes />} />
            <Route path="/brightpass/*" element={<BrightPassRoutes />} />
            <Route path="/brighthub/*" element={<BrightHubRoutes />} />
          </Routes>
        </Suspense>
      </Box>
    </MenuProvider>
  );
};

export default App;
