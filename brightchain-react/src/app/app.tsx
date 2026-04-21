import { faComment } from '@awesome.me/kit-a20d532681/icons/chisel/regular';
import { faBookMedical } from '@awesome.me/kit-a20d532681/icons/classic/regular';
import {
  faBird,
  faEnvelope,
  faLock,
} from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { faCircleNodes } from '@awesome.me/kit-a20d532681/icons/classic/thin';
import {
  BrightChainFeatures,
  CONSTANTS,
  CoreConstants,
  i18nEngine,
  ISuiteCoreConstants,
  registerI18nComponentPackage,
  THEME_COLORS,
} from '@brightchain/brightchain-lib';
import {
  BrightChainLogoI18N,
  BrightChainSoupDemo,
  BrightChainSubLogo,
  BrightPassDemo,
  DatabaseDemo,
  IdentityDemo,
  MessagingDemo,
  StoragePoolsDemo,
} from '@brightchain/brightchain-react-components';
import { createBrightChartComponentPackage } from '@brightchain/brightchart-lib';
import {
  BrightChatStrings,
  createBrightChatComponentPackage,
} from '@brightchain/brightchat-lib';
import {
  createBrightHubComponentPackage,
  type IBaseHub,
} from '@brightchain/brighthub-lib';
import { useBrightHubMenuItems } from '@brightchain/brighthub-react-components';
import {
  BrightMailStrings,
  createBrightMailComponentPackage,
} from '@brightchain/brightmail-lib';
import { createBrightPassComponentPackage } from '@brightchain/brightpass-lib';
import {
  createDigitalBurnbagComponentPackage,
  DigitalBurnbagStrings,
} from '@brightchain/digitalburnbag-lib';
import {
  BirdbagLogoBlue,
  BirdbagLogoGrey,
} from '@brightchain/digitalburnbag-react-components';
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
  useAuth,
  useAuthenticatedApi,
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
import BarChartIcon from '@mui/icons-material/BarChart';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DeleteIcon from '@mui/icons-material/Delete';
import DraftsIcon from '@mui/icons-material/Drafts';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ForumIcon from '@mui/icons-material/Forum';
import GroupIcon from '@mui/icons-material/Group';
import LabelIcon from '@mui/icons-material/Label';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import SendIcon from '@mui/icons-material/Send';
import TimelineIcon from '@mui/icons-material/Timeline';
import { Box, CircularProgress, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  FC,
  lazy,
  LazyExoticComponent,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { IncludeOnMenu } from '../enumerations/includeOnMenu';
import { environment } from '../environments/environment';
import '../styles.scss';
import AboutPage from './components/AboutPage';
import AdminDashboardPage from './components/AdminDashboardPage';
import { AdminMenuRegistration } from './components/AdminMenuRegistration';
import { AppFooter } from './components/AppFooter';
import DashboardPage from './components/DashboardPage';
import { GlobalNotificationBell } from './components/GlobalNotificationBell';
import { SplashPage } from './components/SplashPage';
import { createAppTheme } from './theme';

const UnifiedNotificationsPage = lazy(() =>
  import('./components/UnifiedNotificationsPage').then((m) => ({
    default: m.default,
  })),
);

const AdminUserManagementPanel = lazy(() =>
  import('./components/AdminUserManagementPanel').then((m) => ({
    default: m.default,
  })),
);
const AdminBlockExplorerPanel = lazy(() =>
  import('./components/AdminBlockExplorerPanel').then((m) => ({
    default: m.default,
  })),
);
const AdminChatPanel = lazy(() =>
  import('./components/AdminChatPanel').then((m) => ({
    default: m.default,
  })),
);
const AdminChatServersPanel = lazy(() =>
  import('./components/AdminChatServersPanel').then((m) => ({
    default: m.default,
  })),
);
const AdminHubPanel = lazy(() =>
  import('./components/AdminHubPanel').then((m) => ({
    default: m.default,
  })),
);
const AdminMailPanel = lazy(() =>
  import('./components/AdminMailPanel').then((m) => ({
    default: m.default,
  })),
);
const AdminPassPanel = lazy(() =>
  import('./components/AdminPassPanel').then((m) => ({
    default: m.default,
  })),
);

const getEnabledFeatures = (): BrightChainFeatures[] => {
  if (typeof window !== 'undefined') {
    const appConfig = (
      window as { APP_CONFIG?: { enabledFeatures?: string[] } }
    ).APP_CONFIG;
    if (appConfig?.enabledFeatures) {
      return appConfig.enabledFeatures.map((f) => f as BrightChainFeatures);
    }
  }
  return (
    environment.enabledFeatures.map((f) => f as BrightChainFeatures) || [
      BrightChainFeatures.BrightChat,
      BrightChainFeatures.BrightChart,
      BrightChainFeatures.BrightHub,
      BrightChainFeatures.BrightMail,
      BrightChainFeatures.BrightPass,
    ]
  );
};

const enabledFeatures = getEnabledFeatures();
const brightChatEnabled = enabledFeatures.includes(
  BrightChainFeatures.BrightChat,
);
const brightHubEnabled = enabledFeatures.includes(
  BrightChainFeatures.BrightHub,
);
const brightMailEnabled = enabledFeatures.includes(
  BrightChainFeatures.BrightMail,
);
const brightPassEnabled = enabledFeatures.includes(
  BrightChainFeatures.BrightPass,
);
const burnbagEnabled = enabledFeatures.includes(
  BrightChainFeatures.DigitalBurnbag,
);
const brightChartEnabled = enabledFeatures.includes(
  BrightChainFeatures.BrightChart,
);

// Register sub-component i18n packages with the BrightChain engine.
// Must run after i18nEngine import above triggers engine creation.
let BrightChatRoutes: LazyExoticComponent<FC<object>>;
if (brightChatEnabled) {
  registerI18nComponentPackage(createBrightChatComponentPackage());
  BrightChatRoutes = lazy(() =>
    import('./brightchat-routes').then((m) => ({
      default: m.default,
    })),
  );
}
let BrightChartRoutes: LazyExoticComponent<FC<object>>;
if (brightChartEnabled) {
  registerI18nComponentPackage(createBrightChartComponentPackage());
  BrightChartRoutes = lazy(() =>
    import('./brightchart-routes').then((m) => ({
      default: m.default,
    })),
  );
}
let BrightHubRoutes: LazyExoticComponent<FC<object>>;
if (brightHubEnabled) {
  registerI18nComponentPackage(createBrightHubComponentPackage());
  BrightHubRoutes = lazy(() =>
    import('./brighthub-routes').then((m) => ({
      default: m.BrightHubRoutes,
    })),
  );
}
let BrightMailRoutes: LazyExoticComponent<FC<object>>;
if (brightMailEnabled) {
  registerI18nComponentPackage(createBrightMailComponentPackage());
  BrightMailRoutes = lazy(() =>
    import('./brightmail-routes').then((m) => ({
      default: m.default,
    })),
  );
}
let BrightPassRoutes: LazyExoticComponent<FC<object>>;
if (brightPassEnabled) {
  registerI18nComponentPackage(createBrightPassComponentPackage());
  BrightPassRoutes = lazy(() =>
    import('./brightpass-routes').then((m) => ({
      default: m.default,
    })),
  );
}
let BurnbagRoutes: LazyExoticComponent<FC<object>>;
if (burnbagEnabled) {
  registerI18nComponentPackage(createDigitalBurnbagComponentPackage());
  BurnbagRoutes = lazy(() =>
    import('./burnbag-routes').then((m) => ({
      default: m.default,
    })),
  );
}

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

let indexPriority = 15;
const InnerApp: FC = () => {
  const { tBranded: t } = useI18n();
  const { userData } = useAuth();
  const api = useAuthenticatedApi();
  const [subscribedHubs, setSubscribedHubs] = useState<IBaseHub<string>[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Fetch subscribed hubs and unread notification count for the menu
  useEffect(() => {
    const userId = userData?.id;
    if (!userId) return;
    api
      .get(`/brighthub/hubs?userId=${userId}`)
      .then((res: { data?: { data?: unknown } }) => {
        const data = res.data?.data;
        if (Array.isArray(data)) setSubscribedHubs(data);
        else if (data && typeof data === 'object' && 'hubs' in data)
          setSubscribedHubs((data as { hubs: IBaseHub<string>[] }).hubs);
      })
      .catch(() => {});
    api
      .get(`/brighthub/notifications/unread-count?userId=${userId}`)
      .then((res: { data?: { data?: { unreadCount?: number } } }) => {
        const count = res.data?.data?.unreadCount;
        if (typeof count === 'number') setUnreadNotifCount(count);
      })
      .catch(() => {});
  }, [api, userData?.id]);

  const digitalBurnbagMenu = createMenuType(
    String(IncludeOnMenu.DigitalBurnbagMenu),
  );
  const chatMenu = createMenuType(String(IncludeOnMenu.BrightChatMenu));
  const chartMenu = createMenuType(String(IncludeOnMenu.BrightChartMenu));
  const hubMenu = createMenuType(String(IncludeOnMenu.BrightHubMenu));
  const mailMenu = createMenuType(String(IncludeOnMenu.BrightMailMenu));
  const passMenu = createMenuType(String(IncludeOnMenu.BrightPassMenu));
  const brightMailMenuConfig: IMenuConfig = {
    menuType: mailMenu,
    menuIcon: <FontAwesomeIcon icon={faEnvelope} />,
    priority: indexPriority,
    options: [
      {
        id: 'brightmail',
        label: <BrightChainSubLogo subText="Mail" height={24} />,
        includeOnMenus: [mailMenu, MenuTypes.SideMenu],
        index: indexPriority,
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
        index: indexPriority + 5,
        icon: <SendIcon />,
        link: '/brightmail/sent',
        requiresAuth: true,
      },
      {
        id: 'brightmail-drafts',
        label: t(BrightMailStrings.Nav_Drafts),
        includeOnMenus: [mailMenu, MenuTypes.SideMenu],
        index: indexPriority + 10,
        icon: <DraftsIcon />,
        link: '/brightmail/drafts',
        requiresAuth: true,
      },
      {
        id: 'brightmail-trash',
        label: t(BrightMailStrings.Nav_Trash),
        includeOnMenus: [mailMenu, MenuTypes.SideMenu],
        index: indexPriority + 15,
        icon: <DeleteIcon />,
        link: '/brightmail/trash',
        requiresAuth: true,
      },
      {
        id: 'brightmail-labels',
        label: t(BrightMailStrings.Nav_Labels),
        includeOnMenus: [mailMenu, MenuTypes.SideMenu],
        index: indexPriority + 20,
        icon: <LabelIcon />,
        link: '/brightmail/labels',
        requiresAuth: true,
      },
    ],
  };
  indexPriority += 100;

  const brightPassMenuConfig: IMenuConfig = {
    menuType: passMenu,
    menuIcon: <FontAwesomeIcon icon={faLock} />,
    priority: indexPriority,
    options: [
      {
        id: 'brightpass',
        label: <BrightChainSubLogo subText="Pass" height={24} />,
        includeOnMenus: [
          createMenuType(String(IncludeOnMenu.BrightPassMenu)),
          MenuTypes.SideMenu,
        ],
        index: indexPriority,
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
  indexPriority += 100;

  const { options: brightHubMenuItems, nextIndex } = useBrightHubMenuItems(
    hubMenu,
    subscribedHubs,
    indexPriority,
    unreadNotifCount,
  );
  const brightHubMenuConfig: IMenuConfig = {
    menuType: hubMenu,
    menuIcon: <FontAwesomeIcon icon={faCircleNodes} />,
    priority: indexPriority,
    options: [
      {
        id: 'brighthub',
        label: <BrightChainSubLogo subText="Hub" height={24} />,
        includeOnMenus: [hubMenu, MenuTypes.SideMenu],
        index: indexPriority,
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
      ...brightHubMenuItems,
    ],
  };

  indexPriority = nextIndex;

  const brightChatMenuConfig: IMenuConfig = {
    menuType: chatMenu,
    menuIcon: <FontAwesomeIcon icon={faComment} />,
    priority: nextIndex,
    options: [
      {
        id: 'brightchat',
        label: <BrightChainSubLogo subText="Chat" height={24} />,
        includeOnMenus: [chatMenu, MenuTypes.SideMenu],
        index: nextIndex,
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
        index: nextIndex + 5,
        icon: <GroupIcon />,
        link: '/brightchat/groups',
        requiresAuth: true,
      },
      {
        id: 'brightchat-channels',
        label: t(BrightChatStrings.Nav_Channels),
        includeOnMenus: [chatMenu, MenuTypes.SideMenu],
        index: nextIndex + 10,
        icon: <ForumIcon />,
        link: '/brightchat/channels',
        requiresAuth: true,
      },
    ],
  };
  indexPriority += 100;

  const digitalBurnbagMenuConfig: IMenuConfig = {
    menuType: digitalBurnbagMenu,
    menuIcon: <BirdbagLogoGrey height={24} />,
    priority: indexPriority,
    options: [
      {
        id: 'burnbag',
        label: (
          <BrightChainSubLogo
            leadText="Digital"
            subText="Burnbag"
            height={24}
          />
        ),
        includeOnMenus: [digitalBurnbagMenu, MenuTypes.SideMenu],
        index: indexPriority,
        icon: <BirdbagLogoBlue height={24} />,
        link: '/burnbag/files',
        requiresAuth: true,
        additionalSx: {
          '& > svg': {
            marginRight: '3px',
          },
        },
      },
      {
        id: 'burnbag-shared',
        label: t(DigitalBurnbagStrings.Nav_SharedWithMe),
        includeOnMenus: [digitalBurnbagMenu, MenuTypes.SideMenu],
        index: indexPriority + 5,
        icon: <GroupIcon />,
        link: '/burnbag/shared',
        requiresAuth: true,
      },
      {
        id: 'burnbag-trash',
        label: t(DigitalBurnbagStrings.Nav_Trash),
        includeOnMenus: [digitalBurnbagMenu, MenuTypes.SideMenu],
        index: indexPriority + 10,
        icon: <DeleteIcon />,
        link: '/burnbag/trash',
        requiresAuth: true,
      },
      {
        id: 'burnbag-activity',
        label: t(DigitalBurnbagStrings.Nav_Activity),
        includeOnMenus: [digitalBurnbagMenu, MenuTypes.SideMenu],
        index: indexPriority + 15,
        icon: <TimelineIcon />,
        link: '/burnbag/activity',
        requiresAuth: true,
      },
      {
        id: 'burnbag-analytics',
        label: t(DigitalBurnbagStrings.Nav_Analytics),
        includeOnMenus: [digitalBurnbagMenu, MenuTypes.SideMenu],
        index: indexPriority + 20,
        icon: <BarChartIcon />,
        link: '/burnbag/analytics',
        requiresAuth: true,
      },
      {
        id: 'burnbag-canary',
        label: t(DigitalBurnbagStrings.Nav_Canary),
        includeOnMenus: [digitalBurnbagMenu, MenuTypes.SideMenu],
        index: indexPriority + 25,
        icon: <FontAwesomeIcon icon={faBird} />,
        link: '/burnbag/canary',
        requiresAuth: true,
      },
    ],
  };
  indexPriority += 100;

  const brightChartMenuConfig: IMenuConfig = {
    menuType: chartMenu,
    menuIcon: <FontAwesomeIcon icon={faBookMedical} />,
    priority: indexPriority,
    options: [
      {
        id: 'brightchart',
        label: <BrightChainSubLogo subText="Chart" height={24} />,
        includeOnMenus: [chartMenu, MenuTypes.SideMenu],
        index: indexPriority,
        icon: (
          <FontAwesomeIcon
            icon={faBookMedical}
            style={{ color: CONSTANTS.THEME_COLORS.CHAIN_BLUE_DARK }}
          />
        ),
        link: '/brightchart',
        requiresAuth: true,
        additionalSx: {
          '& > svg': {
            marginRight: '3px',
          },
        },
      },
      {
        id: 'brightchart-clinician',
        label: 'Clinician',
        includeOnMenus: [chartMenu, MenuTypes.SideMenu],
        index: indexPriority + 5,
        icon: <LocalHospitalIcon />,
        link: '/brightchart/clinician',
        requiresAuth: true,
      },
      {
        id: 'brightchart-portal',
        label: 'Patient Portal',
        includeOnMenus: [chartMenu, MenuTypes.SideMenu],
        index: indexPriority + 10,
        icon: <FavoriteIcon />,
        link: '/brightchart/portal',
        requiresAuth: true,
      },
      {
        id: 'brightchart-schedule',
        label: 'Schedule',
        includeOnMenus: [chartMenu, MenuTypes.SideMenu],
        index: indexPriority + 15,
        icon: <CalendarMonthIcon />,
        link: '/brightchart/front-desk',
        requiresAuth: true,
      },
      {
        id: 'brightchart-billing',
        label: 'Billing',
        includeOnMenus: [chartMenu, MenuTypes.SideMenu],
        index: indexPriority + 20,
        icon: <BarChartIcon />,
        link: '/brightchart/billing',
        requiresAuth: true,
      },
    ],
  };
  indexPriority += 100;

  const featureMenuMap: [BrightChainFeatures, IMenuConfig][] = [
    [BrightChainFeatures.DigitalBurnbag, digitalBurnbagMenuConfig],
    [BrightChainFeatures.BrightMail, brightMailMenuConfig],
    [BrightChainFeatures.BrightPass, brightPassMenuConfig],
    [BrightChainFeatures.BrightHub, brightHubMenuConfig],
    [BrightChainFeatures.BrightChat, brightChatMenuConfig],
    [BrightChainFeatures.BrightChart, brightChartMenuConfig],
  ];

  const enabledFeatures = new Set(getEnabledFeatures());
  const menuConfigs = featureMenuMap
    .filter(([feature]) => enabledFeatures.has(feature))
    .map(([, config]) => config);

  return (
    <MenuProvider menuConfigs={menuConfigs}>
      <AdminMenuRegistration />
      <Box className="app-container" sx={{ paddingTop: '64px' }}>
        <TopMenu
          Logo={
            <BrightChainLogoI18N
              primaryColor={THEME_COLORS.CHAIN_BLUE_DARK}
              secondaryColor={THEME_COLORS.CHAIN_BLUE_LIGHT}
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
            <Route path="/_spa" element={<SplashPage />} />
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
              path="/admin/dashboard"
              element={
                <PrivateRoute>
                  <AdminDashboardPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/about"
              element={
                <PrivateRoute>
                  <AboutPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <PrivateRoute>
                  <AdminUserManagementPanel />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/blocks"
              element={
                <PrivateRoute>
                  <AdminBlockExplorerPanel />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/chat"
              element={
                <PrivateRoute>
                  <AdminChatPanel />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/chat-servers"
              element={
                <PrivateRoute>
                  <AdminChatServersPanel />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/hub"
              element={
                <PrivateRoute>
                  <AdminHubPanel />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/mail"
              element={
                <PrivateRoute>
                  <AdminMailPanel />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/pass"
              element={
                <PrivateRoute>
                  <AdminPassPanel />
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
                  <RegisterFormWrapper
                    componentProps={{
                      disallowedEmailDomains: [emailDomain],
                    }}
                  />
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
            {BrightMailRoutes && (
              <Route path="/brightmail/*" element={<BrightMailRoutes />} />
            )}
            {BrightPassRoutes && (
              <Route path="/brightpass/*" element={<BrightPassRoutes />} />
            )}
            {BrightHubRoutes && (
              <Route path="/brighthub/*" element={<BrightHubRoutes />} />
            )}
            {BrightChatRoutes && (
              <Route path="/brightchat/*" element={<BrightChatRoutes />} />
            )}
            {BrightChartRoutes && (
              <Route path="/brightchart/*" element={<BrightChartRoutes />} />
            )}
            {BurnbagRoutes && (
              <Route path="/burnbag/*" element={<BurnbagRoutes />} />
            )}
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
        <AppFooter />
      </Box>
    </MenuProvider>
  );
};

export default App;
