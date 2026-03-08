// Components
export { default as AvatarCircle } from './lib/AvatarCircle';
export { default as BrightMailLayout } from './lib/BrightMailLayout';
export { default as ComposeModal } from './lib/ComposeModal';
export { default as ComposeView } from './lib/ComposeView';
export { default as ConfirmDialog } from './lib/ConfirmDialog';
export { default as EmailList } from './lib/EmailList';
export { default as EmailRow } from './lib/EmailRow';
export { default as InboxView } from './lib/InboxView';
export { default as ReadingPane } from './lib/ReadingPane';
export { default as RecipientChipInput } from './lib/RecipientChipInput';
export { default as Sidebar } from './lib/Sidebar';
export { default as ThreadView } from './lib/ThreadView';

// Context
export {
  BrightMailProvider,
  useBrightMail,
  default as BrightMailContext,
} from './lib/BrightMailContext';

// Utility functions (exported for property testing and reuse)
export { getAvatarColor } from './lib/AvatarCircle';
export { clampPosition, shouldConfirmClose } from './lib/ComposeModal';
export { toggleSelection } from './lib/EmailList';
export { getSenderDisplay, truncateSnippet, isEmailRead } from './lib/EmailRow';
export { isValidEmail } from './lib/RecipientChipInput';
export { SIDEBAR_WIDTH } from './lib/Sidebar';
export {
  getMailboxDisplay,
  sortByDateAscending,
  getInitialExpandedSet,
} from './lib/ThreadView';

// Services
export { createEmailApiClient, handleApiCall } from './lib/services/emailApi';
export type {
  EmailApiClient,
  ForwardParams,
  InboxQueryParams,
  MailboxInput,
  ReplyParams,
  SendEmailParams,
} from './lib/services/emailApi';

// Hooks
export { useEmailApi } from './lib/hooks/useEmailApi';

// Utilities
export { buildDeleteErrorMessage, bulkDelete } from './lib/bulkActions';
export { formatDateLocale, formatDateTimeLocale } from './lib/dateFormatting';

// Types
export type { AvatarCircleProps } from './lib/AvatarCircle';
export type {
  BrightMailContextValue,
  BrightMailProviderProps,
  ComposeModalState,
  ComposePrefill,
  NavItem,
  StarState,
} from './lib/BrightMailContext';
export type { ComposeModalProps } from './lib/ComposeModal';
export type { ConfirmDialogProps } from './lib/ConfirmDialog';
export type { EmailListProps } from './lib/EmailList';
export type { EmailRowProps } from './lib/EmailRow';
export type { InboxViewProps } from './lib/InboxView';
export type { ReadingPaneProps } from './lib/ReadingPane';
export type { RecipientChipInputProps } from './lib/RecipientChipInput';
export type { SidebarProps } from './lib/Sidebar';

/**
 * @deprecated Use `EmailList` instead. Will be removed in a future release.
 */
export { default as EmailListTable } from './lib/EmailListTable';
/** @deprecated Use `EmailListProps` instead. */
export type { EmailListTableProps } from './lib/EmailListTable';
