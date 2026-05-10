/**
 * Messaging Components
 * Components for direct messaging and conversations
 *
 * @remarks
 * Implements messaging UI for Requirements 39-43
 */

export {
  MessagingInbox,
  default as MessagingInboxDefault,
} from './MessagingInbox';
export type { InboxConversation, MessagingInboxProps } from './MessagingInbox';

export {
  ConversationView,
  default as ConversationViewDefault,
} from './ConversationView';
export type { ConversationViewProps } from './ConversationView';

export {
  MessageComposer,
  default as MessageComposerDefault,
} from './MessageComposer';
export type { MessageComposerProps } from './MessageComposer';

export {
  MessageRequestsList,
  default as MessageRequestsListDefault,
} from './MessageRequestsList';
export type { MessageRequestsListProps } from './MessageRequestsList';

export {
  MessageBubble,
  default as MessageBubbleDefault,
} from './MessageBubble';
export type { MessageBubbleProps } from './MessageBubble';

export {
  TypingIndicator,
  default as TypingIndicatorDefault,
} from './TypingIndicator';
export type { TypingIndicatorProps } from './TypingIndicator';

export { ReadReceipt, default as ReadReceiptDefault } from './ReadReceipt';
export type { ReadReceiptProps, ReadStatus } from './ReadReceipt';

export {
  MessageReactions,
  default as MessageReactionsDefault,
} from './MessageReactions';
export type {
  AggregatedReaction,
  MessageReactionsProps,
} from './MessageReactions';

export {
  GroupConversationSettings,
  default as GroupConversationSettingsDefault,
} from './GroupConversationSettings';
export type {
  GroupConversationSettingsProps,
  ParticipantInfo,
} from './GroupConversationSettings';

export {
  NewConversationDialog,
  default as NewConversationDialogDefault,
} from './NewConversationDialog';
export type {
  NewConversationDialogProps,
  UserSearchResult,
} from './NewConversationDialog';

export {
  ConversationSearch,
  default as ConversationSearchDefault,
} from './ConversationSearch';
export type { ConversationSearchProps } from './ConversationSearch';

export {
  MessagingMenuBadge,
  default as MessagingMenuBadgeDefault,
} from './MessagingMenuBadge';
export type { MessagingMenuBadgeProps } from './MessagingMenuBadge';
