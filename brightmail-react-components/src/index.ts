// Components
export { default as BrightMailLayout } from './lib/BrightMailLayout';
export { default as ComposeView } from './lib/ComposeView';
export { default as ConfirmDialog } from './lib/ConfirmDialog';
export { default as EmailListTable } from './lib/EmailListTable';
export { default as InboxView } from './lib/InboxView';
export { default as ThreadView } from './lib/ThreadView';

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

// Re-export types
export type { ConfirmDialogProps } from './lib/ConfirmDialog';
export type { EmailListTableProps } from './lib/EmailListTable';
