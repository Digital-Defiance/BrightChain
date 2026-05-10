// Components
export { default as AttachmentBar } from './lib/AttachmentBar';
export { default as AvatarCircle } from './lib/AvatarCircle';
export { default as BrightMailLayout } from './lib/BrightMailLayout';
export { default as CalendarInviteCard } from './lib/CalendarInviteCard';
export type { CalendarInviteCardProps } from './lib/CalendarInviteCard';
export { default as ComposeModal } from './lib/ComposeModal';
export { default as ComposeView } from './lib/ComposeView';
export { default as ConfirmDialog } from './lib/ConfirmDialog';
export { default as EmailList } from './lib/EmailList';
export { default as EmailRow } from './lib/EmailRow';
export { default as EncryptionSelector } from './lib/EncryptionSelector';
export { default as GpgSetupWizard } from './lib/GpgSetupWizard';
export { default as InboxView } from './lib/InboxView';
export { default as KeyManagementSettings } from './lib/KeyManagementSettings';
export { default as LabelsView } from './lib/LabelsView';
export { default as ReadingPane } from './lib/ReadingPane';
export { default as RecipientChipInput } from './lib/RecipientChipInput';
export { default as RichTextEditor } from './lib/RichTextEditor';
export { default as Sidebar } from './lib/Sidebar';
export { default as ThreadView } from './lib/ThreadView';

// Context
export {
  default as BrightMailContext,
  BrightMailProvider,
  useBrightMail,
} from './lib/BrightMailContext';

// Utility functions (exported for property testing and reuse)
export { getAvatarColor } from './lib/AvatarCircle';
export { clampPosition, shouldConfirmClose } from './lib/ComposeModal';
export { mapComposeStateToSendParams } from './lib/ComposeView';
export type { RecipientKeyResolution } from './lib/ComposeView';
export { toggleSelection } from './lib/EmailList';
export { getSenderDisplay, isEmailRead, truncateSnippet } from './lib/EmailRow';
export { findMissingRecipientKeys } from './lib/EncryptionSelector';
export { evaluatePassphraseStrength } from './lib/GpgSetupWizard';
export {
  extractGpgMetadata,
  extractSmimeMetadata,
  isValidGpgPublicKey,
  isValidSmimeCertificate,
} from './lib/KeyManagementSettings';
export { isValidEmail } from './lib/RecipientChipInput';
export { extractPlainText, sanitizeHtml } from './lib/RichTextEditor';
export { SIDEBAR_WIDTH } from './lib/Sidebar';
export {
  getInitialExpandedSet,
  getMailboxDisplay,
  sortByDateAscending,
} from './lib/ThreadView';
export {
  extractLocalPart,
  getEmailDomain,
  isLocalDomain,
  verificationResultToChipStatus,
} from './lib/utils/recipientVerification';

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
export { useBrightMailTranslation } from './lib/hooks/useBrightMailTranslation';
export { useEmailApi } from './lib/hooks/useEmailApi';

// Utilities
export { buildDeleteErrorMessage, bulkDelete } from './lib/bulkActions';
export {
  formatDateLocale,
  formatDateLocaleOnly,
  formatDateTimeLocale,
} from './lib/dateFormatting';

// Types
export type { AttachmentBarProps, AttachmentFile } from './lib/AttachmentBar';
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
export type { EncryptionSelectorProps } from './lib/EncryptionSelector';
export type {
  GpgSetupWizardProps,
  PassphraseStrength,
} from './lib/GpgSetupWizard';
export type { InboxViewProps } from './lib/InboxView';
export type {
  KeyManagementSettingsProps,
  KeyMetadata,
} from './lib/KeyManagementSettings';
export type { LabelsViewProps } from './lib/LabelsView';
export type { ReadingPaneProps } from './lib/ReadingPane';
export type { RecipientChipInputProps } from './lib/RecipientChipInput';
export type { RichTextEditorProps } from './lib/RichTextEditor';
export type { SidebarProps } from './lib/Sidebar';

/**
 * @deprecated Use `EmailList` instead. Will be removed in a future release.
 */
export { default as EmailListTable } from './lib/EmailListTable';
/** @deprecated Use `EmailListProps` instead. */
export type { EmailListTableProps } from './lib/EmailListTable';
