/**
 * Navigation Type Interfaces
 *
 * Defines the INavigationItem and INavigationConfig interfaces used
 * by the BrightChart shell to build role-aware, specialty-driven navigation.
 *
 * @module shell/navigationTypes
 */

import type { ReactNode } from 'react';

/**
 * A single navigation item in the BrightChart sidebar or bottom nav.
 */
export interface INavigationItem {
  /** Unique identifier for this nav item */
  id: string;

  /** Display label (may be specialty-aware) */
  label: string;

  /** Icon — either a string icon name or a React element */
  icon: string | ReactNode;

  /** Route path relative to /brightchart */
  route: string;

  /** Permission strings required to see this item */
  requiredPermissions: string[];

  /** Optional child navigation items for sub-menus */
  children?: INavigationItem[];

  /** Optional badge element (e.g. unread count) */
  badge?: ReactNode;

  /** Whether this item is visible (computed from permissions at runtime) */
  visible: boolean;
}

/**
 * Navigation configuration for a workspace, parameterized by specialty and role.
 */
export interface INavigationConfig {
  /** Navigation items for this workspace */
  items: INavigationItem[];

  /** Specialty code driving label/item variations */
  specialtyCode: string;

  /** Healthcare role code this config is designed for */
  roleCode: string;
}
