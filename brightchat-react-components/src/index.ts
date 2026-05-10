// BrightChat React Components barrel file

// Context
export {
  default as BrightChatContext,
  BrightChatProvider,
  readSessionStorageValue,
  resolveRestoredServerId,
  useBrightChat,
  writeSessionStorageValue,
} from './lib/BrightChatContext';
export type {
  BrightChatContextValue,
  BrightChatProviderProps,
  ChatContext,
  ComposeState,
} from './lib/BrightChatContext';

// Hooks
export {
  generateBrightChatMenuOptions,
  useBrightChatMenuItems,
} from './lib/hooks/useBrightChatMenuItems';
export { useChatApi } from './lib/hooks/useChatApi';
export {
  applyKeyRotation,
  applyMemberJoined,
  applyMemberLeft,
  applyMessageDeleted,
  applyMessageEdited,
  applyMessageSent,
  applyPresenceChanged,
  applyReactionAdded,
  applyReactionRemoved,
  applyServerChannelCreated,
  applyServerChannelDeleted,
  applyServerMemberJoined,
  applyServerMemberRemoved,
  applyTypingStart,
  applyTypingStop,
  useChatWebSocket,
} from './lib/hooks/useChatWebSocket';
export type {
  ChatWebSocketHandlers,
  KeyRotationNoticeItem,
  ThreadItem,
} from './lib/hooks/useChatWebSocket';

// Layout
export { default as BrightChatApp } from './lib/BrightChatApp';
export type { BrightChatOutletContext } from './lib/BrightChatApp';
/** @deprecated Use BrightChatApp instead */
export { default as BrightChatDiscordApp } from './lib/BrightChatApp';
export {
  default as BrightChatLayout,
  buildBrightChatBreadcrumbs,
} from './lib/BrightChatLayout';
/** @deprecated Use BrightChatLayout instead */
export { default as DiscordLayout } from './lib/BrightChatLayout';
export type {
  BrightChatLayoutProps,
  DiscordLayoutProps,
} from './lib/BrightChatLayout';
export { default as BrightChatLayoutLegacy } from './lib/BrightChatLayoutLegacy';

// Presence
export {
  default as PresenceIndicator,
  presenceStatusColor,
  presenceStatusLabel,
  shouldSuppressNotification,
} from './lib/PresenceIndicator';
export type { PresenceIndicatorProps } from './lib/PresenceIndicator';

// Presence Dropdown
export { default as PresenceStatusDropdown } from './lib/PresenceStatusDropdown';
export type { PresenceStatusDropdownProps } from './lib/PresenceStatusDropdown';

// Sidebar
export { default as ChatSidebar, SIDEBAR_WIDTH } from './lib/ChatSidebar';
export type { ChatSidebarProps } from './lib/ChatSidebar';

// DM Sidebar
export { default as DMSidebar } from './lib/DMSidebar';
export type { DMSidebarProps } from './lib/DMSidebar';

// Server Rail
export {
  SERVER_RAIL_WIDTH,
  default as ServerRail,
  computeNextIndex,
} from './lib/ServerRail';
export type { ServerRailProps } from './lib/ServerRail';

// Channel Sidebar
export {
  CHANNEL_SIDEBAR_WIDTH,
  default as ChannelSidebar,
} from './lib/ChannelSidebar';
export type { ChannelSidebarProps } from './lib/ChannelSidebar';
export {
  groupChannelsByCategory,
  isAdminOrOwner,
} from './lib/ChannelSidebar.helpers';

// Dialogs
export { default as CreateChannelDialog } from './lib/CreateChannelDialog';
export type { CreateChannelDialogProps } from './lib/CreateChannelDialog';
export { default as CreateDMDialog } from './lib/CreateDMDialog';
export type {
  CreateDMDialogProps,
  DMConversation,
  DMUser,
} from './lib/CreateDMDialog';
export {
  filterUsersByQuery,
  findExistingConversation,
} from './lib/CreateDMDialog.helpers';
export {
  default as CreateServerDialog,
  validateServerName,
} from './lib/CreateServerDialog';
export type { CreateServerDialogProps } from './lib/CreateServerDialog';
export { default as DeleteChannelDialog } from './lib/DeleteChannelDialog';
export type { DeleteChannelDialogProps } from './lib/DeleteChannelDialog';
export { default as EditChannelDialog } from './lib/EditChannelDialog';
export type { EditChannelDialogProps } from './lib/EditChannelDialog';

// Settings
export { default as ChannelPermissionsPanel } from './lib/ChannelPermissionsPanel';
export type { ChannelPermissionsPanelProps } from './lib/ChannelPermissionsPanel';
export { default as ServerSettingsPanel } from './lib/ServerSettingsPanel';
export type { ServerSettingsPanelProps } from './lib/ServerSettingsPanel';

export { default as FontAwesomeIconPicker } from './lib/FontAwesomeIconPicker';
export type { FontAwesomeIconPickerProps } from './lib/FontAwesomeIconPicker';

// Icon Upload
export { default as IconCropDialog } from './lib/IconCropDialog';
export type { IconCropDialogProps } from './lib/IconCropDialog';
export { default as ServerIconUploadArea } from './lib/ServerIconUploadArea';
export type { ServerIconUploadAreaProps } from './lib/ServerIconUploadArea';
export { default as SafeFaIcon } from './lib/SafeFaIcon';
export type { SafeFaIconProps } from './lib/SafeFaIcon';

// Encryption Indicators
export { default as EncryptionBanner } from './lib/EncryptionBanner';
export type { EncryptionBannerProps } from './lib/EncryptionBanner';
export { default as KeyRotationNotice } from './lib/KeyRotationNotice';
export type {
  KeyRotationNoticeProps,
  KeyRotationReason,
} from './lib/KeyRotationNotice';

// Views
export { default as ChannelListView } from './lib/ChannelListView';
export { default as ComposeArea } from './lib/ComposeArea';
export type { ComposeAreaProps } from './lib/ComposeArea';
export { default as ConversationListView } from './lib/ConversationListView';
export type { ConversationListViewProps } from './lib/ConversationListView';
export { default as GroupListView } from './lib/GroupListView';
export {
  default as MessageThreadView,
  sortMessagesChronologically,
} from './lib/MessageThreadView';
export type { MessageThreadViewProps } from './lib/MessageThreadView';

// Services
export { createChatApiClient, handleApiCall } from './lib/services/chatApi';
export type { ChatApiClient } from './lib/services/chatApi';

// Friends Suggestion
export { default as FriendsSuggestionSection } from './lib/FriendsSuggestionSection';
export type { FriendsSuggestionSectionProps } from './lib/FriendsSuggestionSection';
