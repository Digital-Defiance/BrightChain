/**
 * Notification Components
 * Components for displaying and managing notifications
 *
 * @remarks
 * Implements notification UI for Requirements 51-56
 */

export {
  NotificationProvider,
  default as NotificationProviderDefault,
  useNotifications,
} from './NotificationProvider';
export type {
  NotificationContextValue,
  NotificationProviderProps,
} from './NotificationProvider';

export {
  NotificationBell,
  default as NotificationBellDefault,
} from './NotificationBell';
export type { NotificationBellProps } from './NotificationBell';

export {
  NotificationDropdown,
  default as NotificationDropdownDefault,
} from './NotificationDropdown';
export type { NotificationDropdownProps } from './NotificationDropdown';

export {
  NotificationItem,
  default as NotificationItemDefault,
} from './NotificationItem';
export type { NotificationItemProps } from './NotificationItem';

export {
  NotificationList,
  default as NotificationListDefault,
} from './NotificationList';
export type { NotificationListProps, ReadFilter } from './NotificationList';

export {
  NotificationPreferences,
  default as NotificationPreferencesDefault,
} from './NotificationPreferences';
export type { NotificationPreferencesProps } from './NotificationPreferences';

export {
  NotificationCategoryFilter,
  default as NotificationCategoryFilterDefault,
} from './NotificationCategoryFilter';
export type { NotificationCategoryFilterProps } from './NotificationCategoryFilter';
