/**
 * Communication Services - Communication service logic for browser and Node.js
 *
 * This module exports all communication services that have been migrated from
 * brightchain-api-lib to enable browser-based communication clients.
 *
 * @module communication
 */

// ── permissionService (no conflicts) ────────────────────────────────────────
export * from './permissionService';

// ── messageOperationsService (has MessageNotFoundError — conflicts with conversationService) ─
export {
  MessageAuthorError,
  MessageOperationsService,
  MessageNotFoundError as MessageOpsNotFoundError,
  MessagePermissionError,
  MessageReactionNotFoundError,
  type IPinnableContext,
} from './messageOperationsService';

// ── conversationService (has MessageNotFoundError, NotMessageAuthorError — conflicts) ────────
export {
  MessageNotFoundError as ConversationMessageNotFoundError,
  ConversationNotFoundError,
  NotMessageAuthorError as ConversationNotMessageAuthorError,
  ConversationService,
  GroupPromotionNotConfiguredError,
  NotParticipantError,
  RecipientNotReachableError,
  type GroupPromotionHandler,
  type MemberReachabilityCheck,
} from './conversationService';

// ── groupService (has NotMessageAuthorError — conflicts) ────────────────────
export {
  GroupMessageNotFoundError,
  GroupNotFoundError,
  NotMessageAuthorError as GroupNotMessageAuthorError,
  GroupPermissionError,
  GroupService,
  MemberAlreadyInGroupError,
  MemberMutedError,
  NotGroupMemberError,
  ReactionNotFoundError,
  extractKeyFromDefault,
  type KeyEncryptionHandler,
} from './groupService';

// ── channelService (has NotMessageAuthorError — conflicts) ──────────────────
export {
  ChannelJoinDeniedError,
  ChannelMemberMutedError,
  ChannelMessageNotFoundError,
  ChannelNameConflictError,
  ChannelNotFoundError,
  NotMessageAuthorError as ChannelNotMessageAuthorError,
  ChannelPermissionError,
  ChannelReactionNotFoundError,
  ChannelService,
  InviteTokenExpiredError,
  InviteTokenNotFoundError,
  MemberAlreadyInChannelError,
  NotChannelMemberError,
  extractChannelKeyFromDefault,
  type ChannelKeyEncryptionHandler,
} from './channelService';

// ── searchService (no conflicts) ────────────────────────────────────────────
export * from './searchService';

// ── explodingMessageService (no conflicts) ──────────────────────────────────
export * from './explodingMessageService';
