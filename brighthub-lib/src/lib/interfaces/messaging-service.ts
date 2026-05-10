import { IBaseConversation } from './base-conversation';
import { IBaseDirectMessage } from './base-direct-message';
import { IBaseGroupConversation } from './base-group-conversation';
import { IBaseMediaAttachment } from './base-media-attachment';
import { IBaseMessageReaction } from './base-message-reaction';
import { IBaseMessageRequest } from './base-message-request';
import { IBaseReadReceipt } from './base-read-receipt';
import { IPaginatedResult, IPaginationOptions } from './user-profile-service';

// ═══════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════

/** Maximum message content length */
export const MAX_MESSAGE_LENGTH = 2000;

/** Maximum media attachments per message */
export const MAX_MESSAGE_ATTACHMENTS = 10;

/** Maximum total attachment size per message (25MB) */
export const MAX_MESSAGE_ATTACHMENT_SIZE = 25 * 1024 * 1024;

/** Edit window for messages (15 minutes in ms) */
export const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;

/** Maximum unique emoji reactions per message */
export const MAX_REACTIONS_PER_MESSAGE = 10;

/** Maximum pinned conversations per user */
export const MAX_PINNED_CONVERSATIONS = 10;

/** Maximum participants per group conversation */
export const MAX_GROUP_PARTICIPANTS = 50;

/** Typing indicator timeout (3 seconds in ms) */
export const TYPING_INDICATOR_TIMEOUT_MS = 3 * 1000;

/** Allowed media types for message attachments */
export const ALLOWED_MESSAGE_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

// ═══════════════════════════════════════════════════════
// Options interfaces
// ═══════════════════════════════════════════════════════

/** Options for sending a message */
export interface ISendMessageOptions {
  /** Media attachments (max 10) */
  attachments?: IBaseMediaAttachment<string>[];
  /** ID of the message being replied to (for threaded replies) */
  replyToMessageId?: string;
  /** ID of the original message if forwarding */
  forwardedFromId?: string;
}

/** Options for creating a group conversation */
export interface ICreateGroupOptions {
  /** Name of the group */
  name: string;
  /** Avatar URL for the group */
  avatarUrl?: string;
}

// ═══════════════════════════════════════════════════════
// Error codes
// ═══════════════════════════════════════════════════════

/** Error codes for messaging operations */
export enum MessagingErrorCode {
  // Conversation errors
  ConversationNotFound = 'CONVERSATION_NOT_FOUND',
  NotParticipant = 'NOT_PARTICIPANT',
  ConversationAlreadyExists = 'CONVERSATION_ALREADY_EXISTS',

  // Message errors
  MessageNotFound = 'MESSAGE_NOT_FOUND',
  EmptyContent = 'EMPTY_CONTENT',
  ContentTooLong = 'CONTENT_TOO_LONG',
  EditWindowExpired = 'EDIT_WINDOW_EXPIRED',
  Unauthorized = 'UNAUTHORIZED',
  MessageAlreadyDeleted = 'MESSAGE_ALREADY_DELETED',

  // Attachment errors
  TooManyAttachments = 'TOO_MANY_ATTACHMENTS',
  AttachmentSizeTooLarge = 'ATTACHMENT_SIZE_TOO_LARGE',
  InvalidMediaFormat = 'INVALID_MEDIA_FORMAT',

  // Reaction errors
  ReactionLimitExceeded = 'REACTION_LIMIT_EXCEEDED',
  ReactionAlreadyExists = 'REACTION_ALREADY_EXISTS',
  ReactionNotFound = 'REACTION_NOT_FOUND',

  // Message request errors
  MessageRequestNotFound = 'MESSAGE_REQUEST_NOT_FOUND',
  MessageRequestAlreadyExists = 'MESSAGE_REQUEST_ALREADY_EXISTS',
  UserBlocked = 'USER_BLOCKED',

  // Conversation management errors
  PinLimitExceeded = 'PIN_LIMIT_EXCEEDED',
  AlreadyPinned = 'ALREADY_PINNED',
  NotPinned = 'NOT_PINNED',
  AlreadyArchived = 'ALREADY_ARCHIVED',
  NotArchived = 'NOT_ARCHIVED',
  AlreadyMuted = 'ALREADY_MUTED',
  NotMuted = 'NOT_MUTED',

  // Group errors
  GroupParticipantLimitExceeded = 'GROUP_PARTICIPANT_LIMIT_EXCEEDED',
  NotAdmin = 'NOT_ADMIN',
  LastAdminCannotLeave = 'LAST_ADMIN_CANNOT_LEAVE',
  AlreadyParticipant = 'ALREADY_PARTICIPANT',
  InvalidGroupName = 'INVALID_GROUP_NAME',
}

/** Messaging service error with code and message */
export class MessagingServiceError extends Error {
  constructor(
    public readonly code: MessagingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'MessagingServiceError';
  }
}

// ═══════════════════════════════════════════════════════
// Service interface
// ═══════════════════════════════════════════════════════

/**
 * Interface for the Messaging_Service
 * Handles conversations, messages, reactions, and message requests
 * @see Requirements: 39-43
 */
export interface IMessagingService {
  // ── Conversation Management (Req 39.1, 39.2, 43.1-43.11) ──

  /** Create a direct conversation between two users */
  createDirectConversation(
    userId: string,
    otherUserId: string,
  ): Promise<IBaseConversation<string>>;

  /** Create a group conversation */
  createGroupConversation(
    creatorId: string,
    participantIds: string[],
    options: ICreateGroupOptions,
  ): Promise<IBaseGroupConversation<string>>;

  /** Get a conversation by ID */
  getConversation(
    conversationId: string,
    userId: string,
  ): Promise<IBaseConversation<string>>;

  /** Get all conversations for a user with pagination */
  getConversations(
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseConversation<string>>>;

  /** Delete a conversation from a user's view */
  deleteConversation(conversationId: string, userId: string): Promise<void>;

  // ── Message CRUD (Req 39.1-39.4, 41.9) ──

  /** Send a message in a conversation */
  sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    options?: ISendMessageOptions,
  ): Promise<IBaseDirectMessage<string>>;

  /** Edit a message within the 15-minute window */
  editMessage(
    messageId: string,
    userId: string,
    newContent: string,
  ): Promise<IBaseDirectMessage<string>>;

  /** Soft-delete a message */
  deleteMessage(messageId: string, userId: string): Promise<void>;

  /** Get messages in a conversation with pagination */
  getMessages(
    conversationId: string,
    userId: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseDirectMessage<string>>>;

  // ── Reactions (Req 39.8-39.10) ──

  /** Add an emoji reaction to a message */
  addReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<IBaseMessageReaction<string>>;

  /** Remove an emoji reaction from a message */
  removeReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<void>;

  // ── Read Receipts & Typing (Req 39.5-39.7) ──

  /** Mark messages as read up to a specific message */
  markAsRead(
    conversationId: string,
    userId: string,
    messageId: string,
  ): Promise<IBaseReadReceipt<string>>;

  /** Send a typing indicator (returns expiration timestamp) */
  sendTypingIndicator(
    conversationId: string,
    userId: string,
  ): Promise<{ expiresAt: string }>;

  // ── Message Requests (Req 42.1-42.12) ──

  /** Create a message request for a non-follower */
  createMessageRequest(
    senderId: string,
    recipientId: string,
    messagePreview: string,
  ): Promise<IBaseMessageRequest<string>>;

  /** Accept a message request, creating a conversation */
  acceptMessageRequest(
    requestId: string,
    recipientId: string,
  ): Promise<IBaseConversation<string>>;

  /** Decline a message request without notification */
  declineMessageRequest(requestId: string, recipientId: string): Promise<void>;

  /** Check if a user can message another directly (mutual follow) */
  canMessageDirectly(senderId: string, recipientId: string): Promise<boolean>;

  // ── Conversation Management Features (Req 43.3-43.11) ──

  /** Pin a conversation (max 10) */
  pinConversation(conversationId: string, userId: string): Promise<void>;

  /** Unpin a conversation */
  unpinConversation(conversationId: string, userId: string): Promise<void>;

  /** Archive a conversation */
  archiveConversation(conversationId: string, userId: string): Promise<void>;

  /** Unarchive a conversation */
  unarchiveConversation(conversationId: string, userId: string): Promise<void>;

  /** Mute a conversation */
  muteConversation(
    conversationId: string,
    userId: string,
    expiresAt?: string,
  ): Promise<void>;

  /** Unmute a conversation */
  unmuteConversation(conversationId: string, userId: string): Promise<void>;

  /** Search messages across all conversations */
  searchMessages(
    userId: string,
    query: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseDirectMessage<string>>>;

  /** Search messages within a specific conversation */
  searchInConversation(
    conversationId: string,
    userId: string,
    query: string,
    options?: IPaginationOptions,
  ): Promise<IPaginatedResult<IBaseDirectMessage<string>>>;

  // ── Group Conversation Management (Req 40.1-40.12) ──

  /** Add participants to a group conversation (admin only) */
  addParticipants(
    conversationId: string,
    adminId: string,
    userIds: string[],
  ): Promise<void>;

  /** Remove a participant from a group conversation (admin only) */
  removeParticipant(
    conversationId: string,
    adminId: string,
    userId: string,
  ): Promise<void>;

  /** Promote a participant to admin */
  promoteToAdmin(
    conversationId: string,
    adminId: string,
    userId: string,
  ): Promise<void>;

  /** Demote an admin to participant */
  demoteFromAdmin(
    conversationId: string,
    adminId: string,
    userId: string,
  ): Promise<void>;

  /** Leave a group conversation */
  leaveGroup(conversationId: string, userId: string): Promise<void>;

  /** Update group settings (name, avatar) */
  updateGroupSettings(
    conversationId: string,
    adminId: string,
    updates: { name?: string; avatarUrl?: string },
  ): Promise<IBaseGroupConversation<string>>;
}
