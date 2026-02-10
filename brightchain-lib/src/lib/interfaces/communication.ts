/**
 * Communication interfaces for the BrightChain communication API.
 * These shared interfaces define the data models for direct messaging,
 * group chats, and channels.
 *
 * All data interfaces are generic over two type parameters:
 *   TId   – the identifier type (string on the frontend, GuidV4Buffer on the backend)
 *   TData – the binary-data type (string/base64 on the frontend, Buffer on the backend)
 *
 * This lets the same interface serve as a DTO for React clients and as the
 * concrete type used inside Node services.
 *
 * Requirements: 10.1, 10.3
 */

import { ChannelVisibility, DefaultRole } from '../enumerations/communication';

/**
 * Represents a reaction (emoji) attached to a message by a member.
 */
export interface IReaction<TId = string> {
  id: TId;
  emoji: string;
  memberId: TId;
  createdAt: Date;
}

/**
 * Represents a member within a group, including their role and mute status.
 */
export interface IGroupMember<TId = string> {
  memberId: TId;
  role: DefaultRole;
  joinedAt: Date;
  mutedUntil?: Date;
}

/**
 * Represents a member within a channel, including their role and mute status.
 */
export interface IChannelMember<TId = string> {
  memberId: TId;
  role: DefaultRole;
  joinedAt: Date;
  mutedUntil?: Date;
}

/**
 * Represents a direct message conversation between exactly two members.
 */
export interface IConversation<TId = string> {
  id: TId;
  participants: [TId, TId];
  createdAt: Date;
  lastMessageAt: Date;
  lastMessagePreview?: string;
}

/**
 * Represents a group chat entity with members, shared encryption keys,
 * and optional promotion from a conversation.
 *
 * `encryptedSharedKey` maps each member's ID (as string key) to the
 * ECIES-encrypted AES key in TData form.
 */
export interface IGroup<TId = string, TData = string> {
  id: TId;
  name: string;
  creatorId: TId;
  members: IGroupMember<TId>[];
  encryptedSharedKey: Map<string, TData>;
  createdAt: Date;
  lastMessageAt: Date;
  pinnedMessageIds: TId[];
  promotedFromConversation?: TId;
}

/**
 * Represents a channel (IRC/Discord-style) with visibility, access control,
 * topic metadata, and pinned messages.
 */
export interface IChannel<TId = string, TData = string> {
  id: TId;
  name: string;
  topic: string;
  creatorId: TId;
  visibility: ChannelVisibility;
  members: IChannelMember<TId>[];
  encryptedSharedKey: Map<string, TData>;
  createdAt: Date;
  lastMessageAt: Date;
  pinnedMessageIds: TId[];
  historyVisibleToNewMembers: boolean;
}

/**
 * Represents a communication message with support for editing, deletion,
 * pinning, and reactions. Used across conversations, groups, and channels.
 */
export interface ICommunicationMessage<TId = string, TData = string> {
  id: TId;
  contextType: 'conversation' | 'group' | 'channel';
  contextId: TId;
  senderId: TId;
  encryptedContent: TData;
  createdAt: Date;
  editedAt?: Date;
  editHistory: Array<{ content: TData; editedAt: Date }>;
  deleted: boolean;
  deletedBy?: TId;
  pinned: boolean;
  reactions: IReaction<TId>[];

  // ─── Exploding message fields (Requirements 8.1, 8.2, 8.3) ─────────
  /** When the message should auto-expire (time-based expiration) */
  expiresAt?: Date;
  /** Maximum number of reads before the message self-destructs */
  maxReads?: number;
  /** Current number of times the message has been read */
  readCount?: number;
  /** Map of member IDs to the timestamp they read the message */
  readBy?: Map<string, Date>;
  /** Whether the message has been exploded (permanently deleted) */
  exploded?: boolean;
  /** When the message was exploded */
  explodedAt?: Date;
}

/**
 * Represents a time-limited invite token for channel access.
 */
export interface IInviteToken<TId = string> {
  token: string;
  channelId: TId;
  createdBy: TId;
  createdAt: Date;
  expiresAt: Date;
  maxUses: number;
  currentUses: number;
}

/**
 * Standard API response envelope for all communication API responses.
 * Contains either a success payload or an error descriptor.
 */
export interface IApiEnvelope<T> {
  status: 'success' | 'error';
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  [key: string]: any; // Index signature for ApiResponse compatibility
}

/**
 * Paginated result wrapper with cursor-based navigation.
 */
export interface IPaginatedResult<T> {
  items: T[];
  cursor?: string;
  hasMore: boolean;
}

/**
 * Partial update interface for channel settings.
 */
export interface IChannelUpdate {
  name?: string;
  topic?: string;
  visibility?: ChannelVisibility;
  historyVisibleToNewMembers?: boolean;
}

/**
 * A search result item that pairs a message with its context name.
 * Used by cross-context search to include sender, timestamp, and
 * context information per requirement 8.3.
 */
export interface ISearchResultItem<TId = string, TData = string> {
  message: ICommunicationMessage<TId, TData>;
  contextName: string;
}
