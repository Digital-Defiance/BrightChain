import { ThemeOptions } from '@mui/material/styles';
import { ReactNode } from 'react';

export interface BrandConfig {
  /** Display name shown in AppBar when no logo is provided */
  appName: string;
  /** Logo ReactNode rendered on the left side of the AppBar */
  logo?: ReactNode;
  /** MUI primary color hex string */
  primaryColor: string;
  /** Partial MUI ThemeOptions merged with the base theme */
  themeOverrides?: Partial<ThemeOptions>;
}

export interface NavItem {
  /** Unique identifier / route path */
  route: string;
  /** Display label */
  label: string;
  /** MUI icon element */
  icon: ReactNode;
  /** Optional badge count (renders MUI Badge) */
  badgeCount?: number;
  /** When true, a MUI Divider is rendered before this item */
  dividerBefore?: boolean;
}

export interface SidebarConfig {
  /** Navigation items */
  items: NavItem[];
  /** Content rendered above the nav list (logo, compose button, etc.) */
  header?: ReactNode;
  /** Content rendered below the nav list */
  footer?: ReactNode;
  /** ARIA label for the navigation list */
  ariaLabel?: string;
  /** Callback when a nav item is selected */
  onNavigate?: (route: string) => void;
  /** Override the active route for highlighting (defaults to current URL pathname) */
  activeRoute?: string;
}

export interface LayoutShellProps {
  /** Brand configuration controlling AppBar and theming */
  brandConfig: BrandConfig;
  /** Sidebar configuration; omit for container-only layouts */
  sidebar?: SidebarConfig;
  /** Optional SubBar rendered between AppBar and content row */
  subBar?: ReactNode;
  /** Optional toolbar actions rendered on the right side of the AppBar */
  toolbarActions?: ReactNode;
  /** Optional detail panel rendered on the right at ≥1280px */
  detailPanel?: ReactNode;
  /** Optional children; when provided, rendered instead of <Outlet /> */
  children?: ReactNode;
}

export interface AppSidebarProps {
  /** Whether the drawer is open (relevant for temporary variant) */
  open: boolean;
  /** Toggle callback for temporary drawer */
  onToggle: () => void;
  /** Drawer variant — LayoutShell sets this based on viewport */
  variant: 'permanent' | 'temporary';
  /** Current active route for highlighting */
  activeRoute: string;
  /** Navigation items */
  items: NavItem[];
  /** Header slot */
  header?: ReactNode;
  /** Footer slot */
  footer?: ReactNode;
  /** ARIA label for the nav list */
  ariaLabel?: string;
  /** Navigation callback */
  onNavigate?: (route: string) => void;
}
