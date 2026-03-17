import { faComment } from '@awesome.me/kit-a20d532681/icons/chisel/regular';
import {
  faEnvelope,
  faLock,
} from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { faCircleNodes } from '@awesome.me/kit-a20d532681/icons/classic/thin';
import { faShredder } from '@awesome.me/kit-a20d532681/icons/duotone/solid';
import {
  CONSTANTS,
  CoreConstants,
  i18nEngine,
  ISuiteCoreConstants,
  registerI18nComponentPackage,
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
import {
  BrightChatStrings,
  createBrightChatComponentPackage,
} from '@brightchain/brightchat-lib';
import { createBrightHubComponentPackage } from '@brightchain/brighthub-lib';
import {
  BrightMailStrings,
  createBrightMailComponentPackage,
} from '@brightchain/brightmail-lib';
import { createBrightPassComponentPackage } from '@brightchain/brightpass-lib';
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
  MenuTypes,
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
import DeleteIcon from '@mui/icons-material/Delete';
import DraftsIcon from '@mui/icons-material/Drafts';
import ForumIcon from '@mui/icons-material/Forum';
import GroupIcon from '@mui/icons-material/Group';
import LabelIcon from '@mui/icons-material/Label';
import SendIcon from '@mui/icons-material/Send';
import { Box, CircularProgress, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { FC, lazy, Suspense, useCallback } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { IncludeOnMenu } from '../enumerations/includeOnMenu';
import { environment } from '../environments/environment';
import '../styles.scss';
import DashboardPage from './components/DashboardPage';
import { GlobalNotificationBell } from './components/GlobalNotificationBell';
import { SplashPage } from './components/SplashPage';
import { createAppTheme } from './theme';

const UnifiedNotificationsPage = lazy(() =>
  import('./components/UnifiedNotificationsPage').then((m) => ({
    default: m.default,
  })),
);

// Register sub-component i18n packages with the BrightChain engine.
// Must run after i18nEngine import above triggers engine creation.
registerI18nComponentPackage(createBrightMailComponentPackage());
registerI18nComponentPackage(createBrightHubComponentPackage());
registerI18nComponentPackage(createBrightPassComponentPackage());
registerI18nComponentPackage(createBrightChatComponentPackage());

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
const BrightChatRoutes = lazy(() =>
  import('./brightchat-routes').then((m) => ({
    default: m.default,
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
  const digitalBurnbagMenu = createMenuType(
    String(IncludeOnMenu.DigitalBurnbagMenu),
  );
  const chatMenu = createMenuType(String(IncludeOnMenu.BrightChatMenu));
  const hubMenu = createMenuType(String(IncludeOnMenu.BrightHubMenu));
  const mailMenu = createMenuType(String(IncludeOnMenu.BrightMailMenu));
  const passMenu = createMenuType(String(IncludeOnMenu.BrightPassMenu));
  const brightMailMenuConfig: IMenuConfig = {
    menuType: mailMenu,
    menuIcon: <FontAwesomeIcon icon={faEnvelope} />,
    priority: 15,
    options: [
      {
        id: 'brightmail',
        label: <BrightChainSubLogo subText="Mail" height={24} />,
        includeOnMenus: [mailMenu, MenuTypes.SideMenu],
        index: 15,
        icon: (
          <FontAwesomeIcon
            icon={faEnvelope}
            style={{ color: CONSTANTS.THEME_COLORS.CHAIN_BLUE_DARK }}
          />
        ),
        link: '/brightmail',
        requiresAuth: true,
        additionalSx: {
          '& > svg': {
            marginRight: '3px',
          },
        },
      },
      {
        id: 'brightmail-sent',
        label: t(BrightMailStrings.Nav_Sent),
        includeOnMenus: [mailMenu, MenuTypes.SideMenu],
        index: 20,
        icon: <SendIcon />,
        link: '/brightmail/sent',
        requiresAuth: true,
      },
      {
        id: 'brightmail-drafts',
        label: t(BrightMailStrings.Nav_Drafts),
        includeOnMenus: [mailMenu, MenuTypes.SideMenu],
        index: 25,
        icon: <DraftsIcon />,
        link: '/brightmail/drafts',
        requiresAuth: true,
      },
      {
        id: 'brightmail-trash',
        label: t(BrightMailStrings.Nav_Trash),
        includeOnMenus: [mailMenu, MenuTypes.SideMenu],
        index: 30,
        icon: <DeleteIcon />,
        link: '/brightmail/trash',
        requiresAuth: true,
      },
      {
        id: 'brightmail-labels',
        label: t(BrightMailStrings.Nav_Labels),
        includeOnMenus: [mailMenu, MenuTypes.SideMenu],
        index: 35,
        icon: <LabelIcon />,
        link: '/brightmail/labels',
        requiresAuth: true,
      },
    ],
  };

  const brightPassMenuConfig: IMenuConfig = {
    menuType: passMenu,
    menuIcon: <FontAwesomeIcon icon={faLock} />,
    priority: 50,
    options: [
      {
        id: 'brightpass',
        label: <BrightChainSubLogo subText="Pass" height={24} />,
        includeOnMenus: [
          createMenuType(String(IncludeOnMenu.BrightPassMenu)),
          MenuTypes.SideMenu,
        ],
        index: 50,
        icon: (
          <FontAwesomeIcon
            icon={faLock}
            style={{ color: CONSTANTS.THEME_COLORS.CHAIN_BLUE_DARK }}
          />
        ),
        link: '/brightpass',
        requiresAuth: true,
        additionalSx: {
          '& > svg': {
            marginRight: '3px',
          },
        },
      },
    ],
  };

  const brightHubMenuConfig: IMenuConfig = {
    menuType: hubMenu,
    menuIcon: <FontAwesomeIcon icon={faCircleNodes} />,
    priority: 75,
    options: [
      {
        id: 'brighthub',
        label: <BrightChainSubLogo subText="Hub" height={24} />,
        includeOnMenus: [hubMenu, MenuTypes.SideMenu],
        index: 75,
        icon: (
          <FontAwesomeIcon
            icon={faCircleNodes}
            style={{ color: CONSTANTS.THEME_COLORS.CHAIN_BLUE_DARK }}
          />
        ),
        link: '/brighthub',
        requiresAuth: true,
        additionalSx: {
          '& > svg': {
            marginRight: '3px',
          },
        },
      },
    ],
  };

  const brightChatMenuConfig: IMenuConfig = {
    menuType: chatMenu,
    menuIcon: <FontAwesomeIcon icon={faComment} />,
    priority: 100,
    options: [
      {
        id: 'brightchat',
        label: <BrightChainSubLogo subText="Chat" height={24} />,
        includeOnMenus: [chatMenu, MenuTypes.SideMenu],
        index: 100,
        icon: (
          <FontAwesomeIcon
            icon={faComment}
            style={{ color: CONSTANTS.THEME_COLORS.CHAIN_BLUE_DARK }}
          />
        ),
        link: '/brightchat',
        requiresAuth: true,
        additionalSx: {
          '& > svg': {
            marginRight: '3px',
          },
        },
      },
      {
        id: 'brightchat-groups',
        label: t(BrightChatStrings.Nav_Groups),
        includeOnMenus: [chatMenu, MenuTypes.SideMenu],
        index: 115,
        icon: <GroupIcon />,
        link: '/brightchat/groups',
        requiresAuth: true,
      },
      {
        id: 'brightchat-channels',
        label: t(BrightChatStrings.Nav_Channels),
        includeOnMenus: [chatMenu, MenuTypes.SideMenu],
        index: 130,
        icon: <ForumIcon />,
        link: '/brightchat/channels',
        requiresAuth: true,
      },
    ],
  };

  const digitalBurnbagMenuConfig: IMenuConfig = {
    menuType: digitalBurnbagMenu,
    menuIcon: <FontAwesomeIcon icon={faShredder} />,
    priority: 125,
    options: [],
  };

  return (
    <MenuProvider
      menuConfigs={[
        digitalBurnbagMenuConfig,
        brightMailMenuConfig,
        brightPassMenuConfig,
        brightHubMenuConfig,
        brightChatMenuConfig,
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
          actions={<GlobalNotificationBell />}
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
            <Route path="/brightchat/*" element={<BrightChatRoutes />} />
            <Route
              path="/notifications"
              element={
                <PrivateRoute>
                  <UnifiedNotificationsPage />
                </PrivateRoute>
              }
            />
          </Routes>
        </Suspense>
      </Box>
    </MenuProvider>
  );
};

export default App;
