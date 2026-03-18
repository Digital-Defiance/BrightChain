/**
 * BrightHub Connection Management Schemas
 *
 * Defines database schemas for connection lists, list members,
 * categories, notes, hubs, follow requests, and related features.
 */

import type { CollectionSchema } from '../../schemaValidation';

// ═══════════════════════════════════════════════════════
// Connection Lists Collection
// ═══════════════════════════════════════════════════════

/** Collection name for connection lists */
export const CONNECTION_LISTS_COLLECTION = 'brighthub_connection_lists';

/** Connection visibility enum values for schema validation */
export const CONNECTION_VISIBILITY_VALUES = [
  'private',
  'followers_only',
  'public',
] as const;

/**
 * Schema definition for the connection lists collection.
 * User-created lists for organizing followed users.
 */
export const CONNECTION_LISTS_SCHEMA: CollectionSchema = {
  name: 'brighthub_connection_list',
  properties: {
    _id: { type: 'string', required: true },
    ownerId: { type: 'string', required: true },
    name: { type: 'string', required: true, maxLength: 100 },
    description: { type: 'string', maxLength: 500 },
    visibility: {
      type: 'string',
      required: true,
      enum: [...CONNECTION_VISIBILITY_VALUES],
    },
    memberCount: { type: 'number', required: true, minimum: 0, maximum: 5000 },
    followerCount: { type: 'number', required: true, minimum: 0 },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true },
  },
  required: [
    'ownerId',
    'name',
    'visibility',
    'memberCount',
    'followerCount',
    'createdAt',
    'updatedAt',
  ],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // User's lists
    { fields: { ownerId: 1, createdAt: -1 } },
    // Public lists discovery
    { fields: { visibility: 1, followerCount: -1 } },
    // List name search within owner
    { fields: { ownerId: 1, name: 1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Connection List Members Collection
// ═══════════════════════════════════════════════════════

/** Collection name for connection list members */
export const CONNECTION_LIST_MEMBERS_COLLECTION =
  'brighthub_connection_list_members';

/**
 * Schema definition for the connection list members collection.
 * Tracks which users are members of which lists.
 */
export const CONNECTION_LIST_MEMBERS_SCHEMA: CollectionSchema = {
  name: 'brighthub_connection_list_member',
  properties: {
    _id: { type: 'string', required: true },
    listId: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    addedAt: { type: 'string', required: true },
  },
  required: ['listId', 'userId', 'addedAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Unique constraint: one membership per user per list
    { fields: { listId: 1, userId: 1 }, options: { unique: true } },
    // Query members of a list
    { fields: { listId: 1, addedAt: -1 } },
    // Query which lists a user is in
    { fields: { userId: 1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Connection List Followers Collection
// ═══════════════════════════════════════════════════════

/** Collection name for connection list followers */
export const CONNECTION_LIST_FOLLOWERS_COLLECTION =
  'brighthub_connection_list_followers';

/**
 * Schema definition for the connection list followers collection.
 * Tracks users who follow public lists.
 */
export const CONNECTION_LIST_FOLLOWERS_SCHEMA: CollectionSchema = {
  name: 'brighthub_connection_list_follower',
  properties: {
    _id: { type: 'string', required: true },
    listId: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    followedAt: { type: 'string', required: true },
  },
  required: ['listId', 'userId', 'followedAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Unique constraint: one follow per user per list
    { fields: { listId: 1, userId: 1 }, options: { unique: true } },
    // Query followers of a list
    { fields: { listId: 1, followedAt: -1 } },
    // Query lists a user follows
    { fields: { userId: 1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Connection Categories Collection
// ═══════════════════════════════════════════════════════

/** Collection name for connection categories */
export const CONNECTION_CATEGORIES_COLLECTION =
  'brighthub_connection_categories';

/**
 * Schema definition for the connection categories collection.
 * User-defined categories for classifying connections.
 */
export const CONNECTION_CATEGORIES_SCHEMA: CollectionSchema = {
  name: 'brighthub_connection_category',
  properties: {
    _id: { type: 'string', required: true },
    ownerId: { type: 'string', required: true },
    name: { type: 'string', required: true, maxLength: 50 },
    color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' }, // Hex color
    icon: { type: 'string', maxLength: 50 }, // FontAwesome icon name
    isDefault: { type: 'boolean', required: true },
    createdAt: { type: 'string', required: true },
  },
  required: ['ownerId', 'name', 'isDefault', 'createdAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // User's categories
    { fields: { ownerId: 1, createdAt: -1 } },
    // Category name uniqueness per owner
    { fields: { ownerId: 1, name: 1 }, options: { unique: true } },
  ],
};

// ═══════════════════════════════════════════════════════
// Connection Category Assignments Collection
// ═══════════════════════════════════════════════════════

/** Collection name for connection category assignments */
export const CONNECTION_CATEGORY_ASSIGNMENTS_COLLECTION =
  'brighthub_connection_category_assignments';

/**
 * Schema definition for the connection category assignments collection.
 * Many-to-many relationship between connections and categories.
 */
export const CONNECTION_CATEGORY_ASSIGNMENTS_SCHEMA: CollectionSchema = {
  name: 'brighthub_connection_category_assignment',
  properties: {
    _id: { type: 'string', required: true },
    ownerId: { type: 'string', required: true },
    connectionId: { type: 'string', required: true },
    categoryId: { type: 'string', required: true },
    assignedAt: { type: 'string', required: true },
  },
  required: ['ownerId', 'connectionId', 'categoryId', 'assignedAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Unique constraint: one assignment per connection per category
    {
      fields: { connectionId: 1, categoryId: 1 },
      options: { unique: true },
    },
    // Query assignments by category (for getConnectionsByCategory)
    { fields: { ownerId: 1, categoryId: 1, assignedAt: -1 } },
    // Query categories for a connection
    { fields: { ownerId: 1, connectionId: 1 } },
    // Cascade delete: find all assignments for a category
    { fields: { categoryId: 1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Connection Notes Collection
// ═══════════════════════════════════════════════════════

/** Collection name for connection notes */
export const CONNECTION_NOTES_COLLECTION = 'brighthub_connection_notes';

/**
 * Schema definition for the connection notes collection.
 * Private notes attached to connections.
 */
export const CONNECTION_NOTES_SCHEMA: CollectionSchema = {
  name: 'brighthub_connection_note',
  properties: {
    _id: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    connectionId: { type: 'string', required: true },
    note: { type: 'string', required: true, maxLength: 500 },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true },
  },
  required: ['userId', 'connectionId', 'note', 'createdAt', 'updatedAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // One note per connection per user
    { fields: { userId: 1, connectionId: 1 }, options: { unique: true } },
    // Search notes by content
    { fields: { userId: 1, note: 1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Hubs Collection
// ═══════════════════════════════════════════════════════

/** Collection name for hubs */
export const HUBS_COLLECTION = 'brighthub_hubs';

/**
 * Schema definition for the hubs collection.
 * Private groups for sharing content with select users.
 */
export const HUBS_SCHEMA: CollectionSchema = {
  name: 'brighthub_hub',
  properties: {
    _id: { type: 'string', required: true },
    ownerId: { type: 'string', required: true },
    slug: { type: 'string', maxLength: 100 },
    name: { type: 'string', required: true, maxLength: 100 },
    description: { type: 'string', maxLength: 2000 },
    rules: { type: 'string', maxLength: 5000 },
    memberCount: { type: 'number', required: true, minimum: 0 },
    postCount: { type: 'number', required: true, minimum: 0 },
    isDefault: { type: 'boolean', required: true },
    trustTier: {
      type: 'string',
      enum: ['open', 'verified', 'encrypted'],
    },
    parentHubId: { type: 'string' },
    icon: { type: 'string', maxLength: 500 },
    moderatorIds: {
      type: 'array',
      items: { type: 'string' },
    },
    createdAt: { type: 'string', required: true },
  },
  required: ['ownerId', 'name', 'memberCount', 'postCount', 'isDefault', 'createdAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // User's hubs
    { fields: { ownerId: 1, createdAt: -1 } },
    // Slug lookup (unique when present)
    { fields: { slug: 1 }, options: { unique: true, sparse: true } },
    // Explore: public hubs sorted by member count
    { fields: { isDefault: 1, memberCount: -1 } },
    // Sub-hub lookup
    { fields: { parentHubId: 1 } },
    // Trust tier filtering
    { fields: { trustTier: 1, memberCount: -1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Hub Members Collection
// ═══════════════════════════════════════════════════════

/** Collection name for hub members */
export const HUB_MEMBERS_COLLECTION = 'brighthub_hub_members';

/**
 * Schema definition for the hub members collection.
 * Tracks which users are members of which hubs.
 */
export const HUB_MEMBERS_SCHEMA: CollectionSchema = {
  name: 'brighthub_hub_member',
  properties: {
    _id: { type: 'string', required: true },
    hubId: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    addedAt: { type: 'string', required: true },
  },
  required: ['hubId', 'userId', 'addedAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Unique constraint: one membership per user per hub
    { fields: { hubId: 1, userId: 1 }, options: { unique: true } },
    // Query members of a hub
    { fields: { hubId: 1, addedAt: -1 } },
    // Query which hubs a user is in
    { fields: { userId: 1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Follow Requests Collection
// ═══════════════════════════════════════════════════════

/** Collection name for follow requests */
export const FOLLOW_REQUESTS_COLLECTION = 'brighthub_follow_requests';

/** Follow request status enum values for schema validation */
export const FOLLOW_REQUEST_STATUS_VALUES = [
  'pending',
  'approved',
  'rejected',
] as const;

/**
 * Schema definition for the follow requests collection.
 * Pending follow requests for protected accounts.
 */
export const FOLLOW_REQUESTS_SCHEMA: CollectionSchema = {
  name: 'brighthub_follow_request',
  properties: {
    _id: { type: 'string', required: true },
    requesterId: { type: 'string', required: true },
    targetId: { type: 'string', required: true },
    message: { type: 'string', maxLength: 280 },
    status: {
      type: 'string',
      required: true,
      enum: [...FOLLOW_REQUEST_STATUS_VALUES],
    },
    createdAt: { type: 'string', required: true },
  },
  required: ['requesterId', 'targetId', 'status', 'createdAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Pending requests for a user
    { fields: { targetId: 1, status: 1, createdAt: -1 } },
    // Requests sent by a user
    { fields: { requesterId: 1, createdAt: -1 } },
    // Unique pending request per user pair
    {
      fields: { requesterId: 1, targetId: 1 },
      options: { unique: true },
    },
  ],
};

// ═══════════════════════════════════════════════════════
// Connection Metadata Collection
// ═══════════════════════════════════════════════════════

/** Collection name for connection metadata */
export const CONNECTION_METADATA_COLLECTION = 'brighthub_connection_metadata';

/**
 * Schema definition for the connection metadata collection.
 * Stores priority, quiet mode, and category assignments for connections.
 */
export const CONNECTION_METADATA_SCHEMA: CollectionSchema = {
  name: 'brighthub_connection_metadata',
  properties: {
    _id: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    connectionId: { type: 'string', required: true },
    isPriority: { type: 'boolean', required: true },
    isQuiet: { type: 'boolean', required: true },
    categoryIds: {
      type: 'array',
      items: { type: 'string' },
    },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true },
  },
  required: [
    'userId',
    'connectionId',
    'isPriority',
    'isQuiet',
    'createdAt',
    'updatedAt',
  ],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // One metadata record per connection per user
    { fields: { userId: 1, connectionId: 1 }, options: { unique: true } },
    // Priority connections for a user
    { fields: { userId: 1, isPriority: 1 } },
    // Quiet connections for a user
    { fields: { userId: 1, isQuiet: 1 } },
    // Connections by category
    { fields: { userId: 1, categoryIds: 1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Temporary Mutes Collection
// ═══════════════════════════════════════════════════════

/** Collection name for temporary mutes */
export const TEMPORARY_MUTES_COLLECTION = 'brighthub_temporary_mutes';

/** Mute duration enum values for schema validation */
export const MUTE_DURATION_VALUES = [
  '1h',
  '8h',
  '24h',
  '7d',
  '30d',
  'permanent',
] as const;

/**
 * Schema definition for the temporary mutes collection.
 * Time-limited mutes that auto-expire.
 */
export const TEMPORARY_MUTES_SCHEMA: CollectionSchema = {
  name: 'brighthub_temporary_mute',
  properties: {
    _id: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    connectionId: { type: 'string', required: true },
    duration: {
      type: 'string',
      required: true,
      enum: [...MUTE_DURATION_VALUES],
    },
    expiresAt: { type: 'string', required: true },
    createdAt: { type: 'string', required: true },
  },
  required: ['userId', 'connectionId', 'duration', 'expiresAt', 'createdAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // One mute per connection per user
    { fields: { userId: 1, connectionId: 1 }, options: { unique: true } },
    // Active mutes for a user
    { fields: { userId: 1, expiresAt: 1 } },
    // TTL index for auto-expiration
    { fields: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Connection Interactions Collection
// ═══════════════════════════════════════════════════════

/** Collection name for connection interactions */
export const CONNECTION_INTERACTIONS_COLLECTION =
  'brighthub_connection_interactions';

/** Connection strength enum values for schema validation */
export const CONNECTION_STRENGTH_VALUES = [
  'strong',
  'moderate',
  'weak',
  'dormant',
] as const;

/**
 * Schema definition for the connection interactions collection.
 * Tracks interaction history for connection strength calculation.
 */
export const CONNECTION_INTERACTIONS_SCHEMA: CollectionSchema = {
  name: 'brighthub_connection_interaction',
  properties: {
    _id: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    connectionId: { type: 'string', required: true },
    totalLikesGiven: { type: 'number', required: true, minimum: 0 },
    totalLikesReceived: { type: 'number', required: true, minimum: 0 },
    totalReplies: { type: 'number', required: true, minimum: 0 },
    totalMentions: { type: 'number', required: true, minimum: 0 },
    lastInteractionAt: { type: 'string' },
    strength: {
      type: 'string',
      required: true,
      enum: [...CONNECTION_STRENGTH_VALUES],
    },
    followedAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true },
  },
  required: [
    'userId',
    'connectionId',
    'totalLikesGiven',
    'totalLikesReceived',
    'totalReplies',
    'totalMentions',
    'strength',
    'followedAt',
    'updatedAt',
  ],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // One interaction record per connection per user
    { fields: { userId: 1, connectionId: 1 }, options: { unique: true } },
    // Inactive connections (for reconnect reminders)
    { fields: { userId: 1, lastInteractionAt: 1 } },
    // Connections by strength
    { fields: { userId: 1, strength: 1 } },
    // Time-based queries
    { fields: { userId: 1, updatedAt: -1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Hub Banned Users Collection
// ═══════════════════════════════════════════════════════

/** Collection name for hub banned users */
export const HUB_BANNED_USERS_COLLECTION = 'brighthub_hub_banned_users';

/**
 * Schema definition for the hub banned users collection.
 * Tracks users banned from specific hubs to prevent re-joining.
 */
export const HUB_BANNED_USERS_SCHEMA: CollectionSchema = {
  name: 'brighthub_hub_banned_user',
  properties: {
    _id: { type: 'string', required: true },
    hubId: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    bannedBy: { type: 'string', required: true },
    reason: { type: 'string', maxLength: 500 },
    severity: {
      type: 'string',
      required: true,
      enum: ['warning', 'temp_ban', 'permanent_ban'],
    },
    expiresAt: { type: 'string' },
    bannedAt: { type: 'string', required: true },
  },
  required: ['hubId', 'userId', 'bannedBy', 'severity', 'bannedAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Unique: one ban per user per hub
    { fields: { hubId: 1, userId: 1 }, options: { unique: true } },
    // Check if user is banned from a hub
    { fields: { userId: 1, hubId: 1 } },
    // List banned users in a hub
    { fields: { hubId: 1, bannedAt: -1 } },
  ],
};
