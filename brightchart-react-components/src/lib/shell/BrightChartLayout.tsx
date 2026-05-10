/**
 * BrightChartLayout Component
 *
 * Main layout component for the BrightChart sub-application.
 * Migrated to use the shared LayoutShell from brightchain-react-components,
 * matching the pattern used by BrightMailLayout and BrightChatLayout.
 *
 * The colored AppBar, sidebar, and responsive behaviour are all handled
 * by LayoutShell. BrightChart layers its own context providers (Active,
 * Permission, Specialty, Notification) on top.
 *
 * @module shell/BrightChartLayout
 */
import { faBookMedical } from '@awesome.me/kit-a20d532681/icons/classic/regular';
import { THEME_COLORS } from '@brightchain/brightchain-lib';
import {
  BrightChainSubLogo,
  LayoutShell,
  SubLogoHeight,
  SubLogoIconHeight,
  type NavItem,
  type SidebarConfig,
} from '@brightchain/brightchain-react-components';
import type {
  BrightChartStringKey,
  IHealthcareRole,
  INotification,
  IShellMemberContext,
  ISpecialtyProfile,
  NotificationType,
  SmartScope,
} from '@brightchain/brightchart-lib';
import {
  ADMIN,
  BrightChartStrings,
  PATIENT,
} from '@brightchain/brightchart-lib';
import { useTheme } from '@mui/material';
import Box from '@mui/material/Box';
import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';
import { ConnectivityIndicator } from './components/Header/ConnectivityIndicator';
import { RoleSwitcher } from './components/Header/RoleSwitcher';
import {
  getAdminNav,
  getClinicianNav,
  getPatientPortalNav,
} from './config/navigationConfigs';
import { getSpecialtyTheme } from './config/specialtyThemes';
import {
  ActiveContextProvider,
  useActiveContext,
} from './contexts/ActiveContext';
import { NotificationContextProvider } from './contexts/NotificationContext';
import {
  PermissionContextProvider,
  usePermissionContext,
} from './contexts/PermissionContext';
import {
  SpecialtyContextProvider,
  useSpecialty,
} from './contexts/SpecialtyContext';

export interface BrightChartLayoutProps {
  member: IShellMemberContext;
  healthcareRoles: IHealthcareRole<string>[];
  initialRole: IHealthcareRole<string>;
  specialtyProfile: ISpecialtyProfile;
  scopes: SmartScope[];
  resolvedPermissions: string[];
  initialNotifications?: INotification[];
  allowedNotificationTypes?: NotificationType[];
  /** Optional callback to refetch healthcare roles after role-creating mutations */
  refetchRoles?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Workspace path prefix for a given role code */
function workspacePrefixForRole(roleCode: string): string {
  switch (roleCode) {
    case PATIENT:
      return '/brightchart/portal';
    case ADMIN:
      return '/brightchart/admin';
    default:
      return '/brightchart/clinician';
  }
}

/** Build LayoutShell-compatible NavItem[] from the role-specific nav config */
function buildNavItems(
  roleCode: string,
  specialtyProfile: ISpecialtyProfile,
  hasAllPermissions: (perms: string[]) => boolean,
  t: (key: BrightChartStringKey, vars?: Record<string, string>) => string,
): NavItem[] {
  let config;
  switch (roleCode) {
    case PATIENT:
      config = getPatientPortalNav(specialtyProfile.specialtyCode);
      break;
    case ADMIN:
      config = getAdminNav(specialtyProfile.specialtyCode);
      break;
    default:
      config = getClinicianNav(specialtyProfile.specialtyCode, roleCode);
      break;
  }

  const prefix = workspacePrefixForRole(roleCode);

  return config.items
    .filter(
      (item) =>
        item.requiredPermissions.length === 0 ||
        hasAllPermissions(item.requiredPermissions),
    )
    .map((item) => ({
      route: `${prefix}/${item.route}`,
      label: t(item.label as BrightChartStringKey),
      icon: (
        <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
          {item.icon}
        </Box>
      ),
    }));
}

// ─── Inner layout (must be inside all context providers) ────────────────────

const BrightChartLayoutInner: React.FC = () => {
  const navigate = useNavigate();
  const contrastText = useTheme().palette.primary.contrastText;
  const { displayName } = useSpecialty();
  const { activeRole } = useActiveContext();
  const { hasAllPermissions } = usePermissionContext();
  const { profile: specialtyProfile } = useSpecialty();
  const { t } = useBrightChartTranslation();

  const theme = useMemo(
    () => getSpecialtyTheme(specialtyProfile.specialtyCode),
    [specialtyProfile.specialtyCode],
  );

  const brandConfig = useMemo(
    () => ({
      appName: displayName,
      logo: (
        <BrightChainSubLogo
          subText="Chart"
          icon={faBookMedical}
          iconColor={contrastText}
          height={SubLogoHeight}
          iconHeight={SubLogoIconHeight}
          leadColor={contrastText}
          additionalText={
            specialtyProfile.specialtyCode !== 'medical'
              ? specialtyProfile.displayName.replace('BrightChart ', '')
              : undefined
          }
          additionalColor={contrastText}
        />
      ),
      primaryColor: theme.properties['--bc-primary'] ?? THEME_COLORS.CHAIN_BLUE,
    }),
    [contrastText, displayName, specialtyProfile, theme],
  );

  const navItems = useMemo(
    () =>
      buildNavItems(
        activeRole.roleCode,
        specialtyProfile,
        hasAllPermissions,
        t,
      ),
    [activeRole.roleCode, specialtyProfile, hasAllPermissions, t],
  );

  const handleNavigate = useCallback(
    (route: string) => {
      navigate(route);
    },
    [navigate],
  );

  const sidebarConfig: SidebarConfig = useMemo(
    () => ({
      items: navItems,
      header: (
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <BrightChainSubLogo
            subText="Chart"
            icon={faBookMedical}
            height={30}
            iconHeight={20}
          />
        </Box>
      ),
      ariaLabel: t(BrightChartStrings.Layout_NavAriaTemplate).replace(
        '{NAME}',
        displayName,
      ),
      onNavigate: handleNavigate,
    }),
    [navItems, handleNavigate, displayName],
  );

  // Toolbar actions: connectivity indicator + role switcher (no notification bell —
  // that lives in the global TopMenu via GlobalNotificationBell)
  const toolbarActions = useMemo(
    () => (
      <Box display="flex" alignItems="center" gap={1}>
        <ConnectivityIndicator />
        <RoleSwitcher />
      </Box>
    ),
    [],
  );

  return (
    <LayoutShell
      brandConfig={brandConfig}
      sidebar={sidebarConfig}
      toolbarActions={toolbarActions}
    />
  );
};

// ─── Outer wrapper providing context ────────────────────────────────────────

export const BrightChartLayout: React.FC<BrightChartLayoutProps> = ({
  member,
  healthcareRoles,
  initialRole,
  specialtyProfile,
  scopes,
  resolvedPermissions,
  initialNotifications,
  refetchRoles,
}) => {
  return (
    <ActiveContextProvider
      member={member}
      healthcareRoles={healthcareRoles}
      initialRole={initialRole}
      specialtyProfile={specialtyProfile}
      refetchRoles={refetchRoles}
    >
      <PermissionContextProvider
        role={initialRole}
        scopes={scopes}
        resolvedPermissions={resolvedPermissions}
      >
        <SpecialtyContextProvider profile={specialtyProfile}>
          <NotificationContextProvider
            initialNotifications={initialNotifications}
          >
            <BrightChartLayoutInner />
          </NotificationContextProvider>
        </SpecialtyContextProvider>
      </PermissionContextProvider>
    </ActiveContextProvider>
  );
};
