/**
 * BrightHub Messaging Schemas
 *
 * Defines database schemas for conversations, messages, message requests,
 * reactions, read receipts, and conversation management.
 */

import type { CollectionSchema } from '../../schemaValidation';

// ═══════════════════════════════════════════════════════
// Conversations Collection
// ═══════════════════════════════════════════════════════

/** Collection name for conversations */
export const CONVERSATIONS_COLLECTION = 'brighthub_conversations';

/** Conversation type enum values for schema validation */
export const CONVERSATION_TYPE_VALUES = ['direct', 'group'] as const;

/**
 * Schema definition for the conversations collection.
 * Supports both direct (1:1) and group conversations.
 */
export const CONVERSATIONS_SCHEMA: CollectionSchema = {
  name: 'brighthub_conversation',
  properties: {
    _id: { type: 'string', required: true },
    type: {
      type: 'string',
      required: true,
      enum: [...CONVERSATION_TYPE_VALUES],
    },
    participantIds: {
      type: 'array',
      required: true,
      minLength: 2,
      maxLength: 50,
      items: { type: 'string' },
    },
    name: { type: 'string', maxLength: 100 }, // For group conversations
    avatarUrl: { type: 'string' }, // For group conversations
    adminIds: {
      type: 'array',
      items: { type: 'string' },
    }, // For group conversations
    creatorId: { type: 'string' }, // For group conversations
    lastMessageAt: { type: 'string' },
    lastMessagePreview: { type: 'string', maxLength: 100 },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true },
  },
  required: ['type', 'participantIds', 'createdAt', 'updatedAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Find conversations for a user
    { fields: { participantIds: 1 } },
    // Sort by recent activity
    { fields: { lastMessageAt: -1 } },
    // Find conversations by participant and activity
    { fields: { participantIds: 1, lastMessageAt: -1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Messages Collection
// ═══════════════════════════════════════════════════════

/** Collection name for messages */
export const MESSAGES_COLLECTION = 'brighthub_messages';

/**
 * Schema definition for the messages collection.
 * Direct messages within conversations.
 */
export const MESSAGES_SCHEMA: CollectionSchema = {
  name: 'brighthub_message',
  properties: {
    _id: { type: 'string', required: true },
    conversationId: { type: 'string', required: true },
    senderId: { type: 'string', required: true },
    content: { type: 'string', required: true, maxLength: 2000 },
    formattedContent: { type: 'string', required: true },
    attachments: {
      type: 'array',
      required: true,
      maxLength: 10,
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string', required: true },
          url: { type: 'string', required: true },
          mimeType: { type: 'string', required: true },
          width: { type: 'number' },
          height: { type: 'number' },
          altText: { type: 'string' },
        },
      },
    },
    replyToMessageId: { type: 'string' },
    forwardedFromId: { type: 'string' },
    isEdited: { type: 'boolean', required: true },
    editedAt: { type: 'string' },
    isDeleted: { type: 'boolean', required: true },
    createdAt: { type: 'string', required: true },
  },
  required: [
    'conversationId',
    'senderId',
    'content',
    'formattedContent',
    'attachments',
    'isEdited',
    'isDeleted',
    'createdAt',
  ],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Messages in a conversation (chronological)
    { fields: { conversationId: 1, createdAt: -1 } },
    // Full-text search on message content
    { fields: { content: 1 }, options: { name: 'message_content_text' } },
    // Thread replies
    { fields: { replyToMessageId: 1 } },
    // Messages by sender
    { fields: { senderId: 1, createdAt: -1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Message Requests Collection
// ═══════════════════════════════════════════════════════

/** Collection name for message requests */
export const MESSAGE_REQUESTS_COLLECTION = 'brighthub_message_requests';

/** Message request status enum values for schema validation */
export const MESSAGE_REQUEST_STATUS_VALUES = [
  'pending',
  'accepted',
  'declined',
] as const;

/**
 * Schema definition for the message requests collection.
 * Pending message requests from non-followers.
 */
export const MESSAGE_REQUESTS_SCHEMA: CollectionSchema = {
  name: 'brighthub_message_request',
  properties: {
    _id: { type: 'string', required: true },
    senderId: { type: 'string', required: true },
    recipientId: { type: 'string', required: true },
    messagePreview: { type: 'string', required: true, maxLength: 100 },
    status: {
      type: 'string',
      required: true,
      enum: [...MESSAGE_REQUEST_STATUS_VALUES],
    },
    createdAt: { type: 'string', required: true },
  },
  required: [
    'senderId',
    'recipientId',
    'messagePreview',
    'status',
    'createdAt',
  ],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Pending requests for a recipient
    { fields: { recipientId: 1, status: 1, createdAt: -1 } },
    // Requests sent by a user
    { fields: { senderId: 1, createdAt: -1 } },
    // Unique pending request per sender-recipient pair
    { fields: { senderId: 1, recipientId: 1 }, options: { unique: true } },
  ],
};

// ═══════════════════════════════════════════════════════
// Message Reactions Collection
// ═══════════════════════════════════════════════════════

/** Collection name for message reactions */
export const MESSAGE_REACTIONS_COLLECTION = 'brighthub_message_reactions';

/**
 * Schema definition for the message reactions collection.
 * Emoji reactions on messages.
 */
export const MESSAGE_REACTIONS_SCHEMA: CollectionSchema = {
  name: 'brighthub_message_reaction',
  properties: {
    _id: { type: 'string', required: true },
    messageId: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    emoji: { type: 'string', required: true, maxLength: 10 },
    createdAt: { type: 'string', required: true },
  },
  required: ['messageId', 'userId', 'emoji', 'createdAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Reactions on a message
    { fields: { messageId: 1 } },
    // Unique reaction per user per message per emoji
    {
      fields: { messageId: 1, userId: 1, emoji: 1 },
      options: { unique: true },
    },
    // User's reactions
    { fields: { userId: 1, createdAt: -1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Read Receipts Collection
// ═══════════════════════════════════════════════════════

/** Collection name for read receipts */
export const READ_RECEIPTS_COLLECTION = 'brighthub_read_receipts';

/**
 * Schema definition for the read receipts collection.
 * Tracks when users last read messages in conversations.
 */
export const READ_RECEIPTS_SCHEMA: CollectionSchema = {
  name: 'brighthub_read_receipt',
  properties: {
    _id: { type: 'string', required: true },
    conversationId: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    lastReadAt: { type: 'string', required: true },
    lastReadMessageId: { type: 'string', required: true },
  },
  required: ['conversationId', 'userId', 'lastReadAt', 'lastReadMessageId'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // One receipt per user per conversation
    { fields: { conversationId: 1, userId: 1 }, options: { unique: true } },
    // User's read receipts
    { fields: { userId: 1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Conversation Participants Collection
// ═══════════════════════════════════════════════════════

/** Collection name for conversation participants */
export const CONVERSATION_PARTICIPANTS_COLLECTION =
  'brighthub_conversation_participants';

/** Group participant role enum values for schema validation */
export const GROUP_PARTICIPANT_ROLE_VALUES = ['admin', 'participant'] as const;

/**
 * Schema definition for the conversation participants collection.
 * Per-user settings and roles for conversations.
 */
export const CONVERSATION_PARTICIPANTS_SCHEMA: CollectionSchema = {
  name: 'brighthub_conversation_participant',
  properties: {
    _id: { type: 'string', required: true },
    conversationId: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    role: {
      type: 'string',
      required: true,
      enum: [...GROUP_PARTICIPANT_ROLE_VALUES],
    },
    nickname: { type: 'string', maxLength: 50 },
    notificationsEnabled: { type: 'boolean', required: true },
    joinedAt: { type: 'string', required: true },
  },
  required: [
    'conversationId',
    'userId',
    'role',
    'notificationsEnabled',
    'joinedAt',
  ],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // One participant record per user per conversation
    { fields: { conversationId: 1, userId: 1 }, options: { unique: true } },
    // User's conversations
    { fields: { userId: 1, joinedAt: -1 } },
    // Admins of a conversation
    { fields: { conversationId: 1, role: 1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Pinned Conversations Collection
// ═══════════════════════════════════════════════════════

/** Collection name for pinned conversations */
export const PINNED_CONVERSATIONS_COLLECTION = 'brighthub_pinned_conversations';

/**
 * Schema definition for the pinned conversations collection.
 * Conversations pinned by users for quick access.
 */
export const PINNED_CONVERSATIONS_SCHEMA: CollectionSchema = {
  name: 'brighthub_pinned_conversation',
  properties: {
    _id: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    conversationId: { type: 'string', required: true },
    pinnedAt: { type: 'string', required: true },
  },
  required: ['userId', 'conversationId', 'pinnedAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // One pin per user per conversation
    { fields: { userId: 1, conversationId: 1 }, options: { unique: true } },
    // User's pinned conversations
    { fields: { userId: 1, pinnedAt: -1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Archived Conversations Collection
// ═══════════════════════════════════════════════════════

/** Collection name for archived conversations */
export const ARCHIVED_CONVERSATIONS_COLLECTION =
  'brighthub_archived_conversations';

/**
 * Schema definition for the archived conversations collection.
 * Conversations archived by users.
 */
export const ARCHIVED_CONVERSATIONS_SCHEMA: CollectionSchema = {
  name: 'brighthub_archived_conversation',
  properties: {
    _id: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    conversationId: { type: 'string', required: true },
    archivedAt: { type: 'string', required: true },
  },
  required: ['userId', 'conversationId', 'archivedAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // One archive per user per conversation
    { fields: { userId: 1, conversationId: 1 }, options: { unique: true } },
    // User's archived conversations
    { fields: { userId: 1, archivedAt: -1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Muted Conversations Collection
// ═══════════════════════════════════════════════════════

/** Collection name for muted conversations */
export const MUTED_CONVERSATIONS_COLLECTION = 'brighthub_muted_conversations';

/**
 * Schema definition for the muted conversations collection.
 * Conversations muted by users (with optional expiration).
 */
export const MUTED_CONVERSATIONS_SCHEMA: CollectionSchema = {
  name: 'brighthub_muted_conversation',
  properties: {
    _id: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    conversationId: { type: 'string', required: true },
    expiresAt: { type: 'string' }, // null = permanent mute
    mutedAt: { type: 'string', required: true },
  },
  required: ['userId', 'conversationId', 'mutedAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // One mute per user per conversation
    { fields: { userId: 1, conversationId: 1 }, options: { unique: true } },
    // User's muted conversations
    { fields: { userId: 1 } },
    // TTL index for auto-expiration (only for non-permanent mutes)
    {
      fields: { expiresAt: 1 },
      options: { expireAfterSeconds: 0, sparse: true },
    },
  ],
};

// ═══════════════════════════════════════════════════════
// Message Reports Collection
// ═══════════════════════════════════════════════════════

/** Collection name for message reports */
export const MESSAGE_REPORTS_COLLECTION = 'brighthub_message_reports';

/** Report type enum values for schema validation */
export const REPORT_TYPE_VALUES = [
  'hate_speech',
  'harassment',
  'spam',
  'violence',
  'nudity',
  'misinformation',
  'copyright',
  'other',
] as const;

/** Report status enum values for schema validation */
export const REPORT_STATUS_VALUES = [
  'pending',
  'reviewed',
  'actioned',
  'dismissed',
] as const;

/**
 * Schema definition for the message reports collection.
 * Reports of inappropriate messages.
 */
export const MESSAGE_REPORTS_SCHEMA: CollectionSchema = {
  name: 'brighthub_message_report',
  properties: {
    _id: { type: 'string', required: true },
    reporterId: { type: 'string', required: true },
    messageId: { type: 'string', required: true },
    reason: {
      type: 'string',
      required: true,
      enum: [...REPORT_TYPE_VALUES],
    },
    description: { type: 'string', maxLength: 500 },
    status: {
      type: 'string',
      required: true,
      enum: [...REPORT_STATUS_VALUES],
    },
    createdAt: { type: 'string', required: true },
    reviewedAt: { type: 'string' },
    reviewedBy: { type: 'string' },
  },
  required: ['reporterId', 'messageId', 'reason', 'status', 'createdAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Reports for a message
    { fields: { messageId: 1 } },
    // Pending reports for review
    { fields: { status: 1, createdAt: -1 } },
    // Reports by a user
    { fields: { reporterId: 1, createdAt: -1 } },
  ],
};
