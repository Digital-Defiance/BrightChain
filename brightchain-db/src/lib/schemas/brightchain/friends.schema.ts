/**
 * BrightChain Friends System Schemas
 *
 * Defines database schemas for friendships and friend requests.
 * These collections use the `brightchain_` prefix to indicate
 * they are shared across all dApps (not scoped to brighthub).
 */

import type { CollectionSchema } from '../../schemaValidation';

// ═══════════════════════════════════════════════════════
// Friendships Collection
// ═══════════════════════════════════════════════════════

/** Collection name for friendships */
export const FRIENDSHIPS_COLLECTION = 'brightchain_friendships';

/**
 * Schema definition for the friendships collection.
 * Stores one record per mutual friendship. The memberIdA / memberIdB
 * pair is always stored in sorted order (lexicographic) to enforce
 * uniqueness without direction.
 */
export const FRIENDSHIPS_SCHEMA: CollectionSchema = {
  name: 'brightchain_friendship',
  properties: {
    _id: { type: 'string', required: true },
    memberIdA: { type: 'string', required: true },
    memberIdB: { type: 'string', required: true },
    createdAt: { type: 'string', required: true },
  },
  required: ['memberIdA', 'memberIdB', 'createdAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Unique friendship per pair (sorted order enforced at app level)
    { fields: { memberIdA: 1, memberIdB: 1 }, options: { unique: true } },
    // Query all friends of a member (appears as memberIdA)
    { fields: { memberIdA: 1, createdAt: -1 } },
    // Query all friends of a member (appears as memberIdB)
    { fields: { memberIdB: 1, createdAt: -1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Friend Requests Collection
// ═══════════════════════════════════════════════════════

/** Collection name for friend requests */
export const FRIEND_REQUESTS_COLLECTION = 'brightchain_friend_requests';

/** Friend request status enum values for schema validation */
export const FRIEND_REQUEST_STATUS_VALUES = [
  'pending',
  'accepted',
  'rejected',
  'cancelled',
] as const;

/**
 * Schema definition for the friend requests collection.
 * Stores friend request records with directional requester/recipient.
 */
export const FRIEND_REQUESTS_SCHEMA: CollectionSchema = {
  name: 'brightchain_friend_request',
  properties: {
    _id: { type: 'string', required: true },
    requesterId: { type: 'string', required: true },
    recipientId: { type: 'string', required: true },
    message: { type: 'string', maxLength: 280 },
    status: {
      type: 'string',
      required: true,
      enum: [...FRIEND_REQUEST_STATUS_VALUES],
    },
    createdAt: { type: 'string', required: true },
  },
  required: ['requesterId', 'recipientId', 'status', 'createdAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Pending requests for a recipient
    { fields: { recipientId: 1, status: 1, createdAt: -1 } },
    // Requests sent by a user
    { fields: { requesterId: 1, status: 1, createdAt: -1 } },
    // Unique pending request per directional pair
    {
      fields: { requesterId: 1, recipientId: 1 },
      options: { unique: true },
    },
  ],
};
