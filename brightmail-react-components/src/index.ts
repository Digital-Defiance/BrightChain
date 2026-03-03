// Components
export { default as BrightMailLayout } from './lib/BrightMailLayout';
export { default as InboxView } from './lib/InboxView';
export { default as ComposeView } from './lib/ComposeView';
export { default as ThreadView } from './lib/ThreadView';
export { default as EmailListTable } from './lib/EmailListTable';
export { default as ConfirmDialog } from './lib/ConfirmDialog';

// Services
export { createEmailApiClient, handleApiCall } from './lib/services/emailApi';
export type {
  EmailApiClient,
  MailboxInput,
  SendEmailParams,
  InboxQueryParams,
  ReplyParams,
  ForwardParams,
} from './lib/services/emailApi';

// Hooks
export { useEmailApi } from './lib/hooks/useEmailApi';

// Utilities
export { bulkDelete, buildDeleteErrorMessage } from './lib/bulkActions';
export { formatDateLocale, formatDateTimeLocale } from './lib/dateFormatting';

// Re-export types
export type { EmailListTableProps } from './lib/EmailListTable';
export type { ConfirmDialogProps } from './lib/ConfirmDialog';
