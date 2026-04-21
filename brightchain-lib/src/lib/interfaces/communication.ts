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
export interface IConversation<TId = string, TData = string> {
  id: TId;
  participants: [TId, TId];
  /** Per-participant wrapped DM key: Map<epoch, Map<participantId, wrappedKey>> */
  encryptedSharedKey: Map<number, Map<string, TData>>;
  createdAt: Date;
  lastMessageAt: Date;
  lastMessagePreview?: string;
}

/**
 * Represents a group chat entity with members, shared encryption keys,
 * and optional promotion from a conversation.
 *
 * `encryptedSharedKey` is epoch-aware: the outer key is the epoch number,
 * the inner map keys each member's ID to the ECIES-encrypted AES key in TData form.
 */
export interface IGroup<TId = string, TData = string> {
  id: TId;
  name: string;
  creatorId: TId;
  members: IGroupMember<TId>[];
  /** epoch → memberId → wrapped key */
  encryptedSharedKey: Map<number, Map<string, TData>>;
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
  /** epoch → memberId → wrapped key */
  encryptedSharedKey: Map<number, Map<string, TData>>;
  createdAt: Date;
  lastMessageAt: Date;
  pinnedMessageIds: TId[];
  historyVisibleToNewMembers: boolean;
  /** Optional link to the parent Server. Channels without serverId remain standalone. */
  serverId?: TId;
}

/**
 * Metadata for an encrypted inline attachment stored as a CBL asset.
 * Requirements: 11.6, 11.1, 11.2, 11.3
 *
 * Renamed from IAttachmentMetadata to avoid collision with the email-focused
 * IAttachmentMetadata exported from messaging/attachmentMetadata.ts.
 */
export interface IChatAttachmentMetadata<TId = string> {
  /** CBL asset ID referencing the encrypted attachment content */
  assetId: TId;
  /** Original file name */
  fileName: string;
  /** MIME type (e.g., "image/png", "application/pdf") */
  mimeType: string;
  /** Size of the encrypted content in bytes */
  encryptedSize: number;
  /** Size of the original content in bytes (before encryption) */
  originalSize: number;
}

/**
 * Platform-level configuration for inline attachment limits.
 * Requirements: 11.4
 */
export interface IAttachmentConfig {
  /** Maximum size per attachment in bytes (default: 25MB) */
  maxFileSizeBytes: number;
  /** Maximum number of attachments per message (default: 10) */
  maxAttachmentsPerMessage: number;
}

/**
 * Default attachment configuration values.
 */
export const DEFAULT_ATTACHMENT_CONFIG: IAttachmentConfig = {
  maxFileSizeBytes: 25 * 1024 * 1024, // 25MB
  maxAttachmentsPerMessage: 10,
};

/**
 * Input type for chat attachments provided by the caller of sendMessage().
 * Requirements: 11.1, 11.2
 */
export interface IChatAttachmentInput {
  /** Original file name */
  fileName: string;
  /** MIME type (e.g., "image/png", "application/pdf") */
  mimeType: string;
  /** Raw content bytes */
  content: Uint8Array;
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

  // ─── E2E Encryption fields (Requirements 1.4, 11.6) ────────────────
  /** Key epoch this message was encrypted under */
  keyEpoch: number;
  /** Inline attachments encrypted with the context's CEK */
  attachments: IChatAttachmentMetadata<TId>[];

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
