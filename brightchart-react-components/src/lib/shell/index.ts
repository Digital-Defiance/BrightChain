/**
 * BrightChart Shell — barrel export
 *
 * Exports the layout, contexts, hooks, permission components,
 * navigation components, notification components, and workspace components.
 *
 * @module shell
 */

// Layout
export { BrightChartLayout } from './BrightChartLayout';
export type { BrightChartLayoutProps } from './BrightChartLayout';

// Contexts
export {
  ActiveContext,
  ActiveContextProvider,
  useActiveContext,
} from './contexts/ActiveContext';
export type { ActiveContextProviderProps } from './contexts/ActiveContext';
export {
  NotificationContext,
  NotificationContextProvider,
  useNotifications,
} from './contexts/NotificationContext';
export type {
  NotificationContextProviderProps,
  NotificationContextValue,
} from './contexts/NotificationContext';
export {
  PermissionContext,
  PermissionContextProvider,
  usePermissionContext,
} from './contexts/PermissionContext';
export type {
  PermissionContextProviderProps,
  PermissionContextValue,
} from './contexts/PermissionContext';
export {
  SpecialtyContext,
  SpecialtyContextProvider,
  useSpecialty,
} from './contexts/SpecialtyContext';
export type {
  SpecialtyContextProviderProps,
  SpecialtyContextValue,
} from './contexts/SpecialtyContext';

// Permission components
export { AccessDenied } from './components/AccessDenied';
export { PermissionGate } from './components/PermissionGate';
export type { PermissionGateProps } from './components/PermissionGate';
export { PermissionGuardedRoute } from './components/PermissionGuardedRoute';
export type { PermissionGuardedRouteProps } from './components/PermissionGuardedRoute';
export { RoleGuardedRoute } from './components/RoleGuardedRoute';
export type { RoleGuardedRouteProps } from './components/RoleGuardedRoute';

// Hooks
export { useHealthcareRoles } from './hooks/useHealthcareRoles';
export type { UseHealthcareRolesResult } from './hooks/useHealthcareRoles';
export { usePermissions } from './hooks/usePermissions';
export type { UsePermissionsResult } from './hooks/usePermissions';

// Navigation
export { BottomNav } from './components/Navigation/BottomNav';
export type { BottomNavProps } from './components/Navigation/BottomNav';
export { Sidebar } from './components/Navigation/Sidebar';
export type { SidebarProps } from './components/Navigation/Sidebar';

// Header
export { ConnectivityIndicator } from './components/Header/ConnectivityIndicator';
export { NotificationBell } from './components/Header/NotificationBell';
export { RoleSwitcher } from './components/Header/RoleSwitcher';

// Shared components
export { NotificationPanel } from './components/NotificationPanel';
export type { NotificationPanelProps } from './components/NotificationPanel';
export { PatientHeader } from './components/PatientHeader';
export type { PatientHeaderProps } from './components/PatientHeader';

// Config
export {
  getAdminNav,
  getBillingNav,
  getClinicianNav,
  getFrontDeskNav,
  getPatientPortalNav,
} from './config/navigationConfigs';
export { SPECIALTY_THEMES, getSpecialtyTheme } from './config/specialtyThemes';
export type { SpecialtyTheme } from './config/specialtyThemes';

// Workspaces
export { AdminWorkspace } from './workspaces/admin/AdminWorkspace';
export { BillingWorkspace } from './workspaces/billing/BillingWorkspace';
export { ClinicianWorkspace } from './workspaces/clinician/ClinicianWorkspace';
export { FrontDeskWorkspace } from './workspaces/frontDesk/FrontDeskWorkspace';
export { PatientPortal } from './workspaces/patient/PatientPortal';
