/**
 * BrightHub Social Interactions Schemas
 *
 * Defines database schemas for follows, likes, and reposts.
 */

import type { CollectionSchema } from '../../schemaValidation';

// ═══════════════════════════════════════════════════════
// Follows Collection
// ═══════════════════════════════════════════════════════

/** Collection name for follows */
export const FOLLOWS_COLLECTION = 'brighthub_follows';

/**
 * Schema definition for the follows collection.
 * Tracks follow relationships between users.
 */
export const FOLLOWS_SCHEMA: CollectionSchema = {
  name: 'brighthub_follow',
  properties: {
    _id: { type: 'string', required: true },
    followerId: { type: 'string', required: true },
    followedId: { type: 'string', required: true },
    createdAt: { type: 'string', required: true },
  },
  required: ['followerId', 'followedId', 'createdAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Unique constraint: one follow relationship per user pair
    { fields: { followerId: 1, followedId: 1 }, options: { unique: true } },
    // Query followers of a user
    { fields: { followedId: 1, createdAt: -1 } },
    // Query who a user follows
    { fields: { followerId: 1, createdAt: -1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Likes Collection
// ═══════════════════════════════════════════════════════

/** Collection name for likes */
export const LIKES_COLLECTION = 'brighthub_likes';

/**
 * Schema definition for the likes collection.
 * Tracks like interactions on posts.
 */
export const LIKES_SCHEMA: CollectionSchema = {
  name: 'brighthub_like',
  properties: {
    _id: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    postId: { type: 'string', required: true },
    createdAt: { type: 'string', required: true },
  },
  required: ['userId', 'postId', 'createdAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Unique constraint: one like per user per post
    { fields: { userId: 1, postId: 1 }, options: { unique: true } },
    // Query likes on a post
    { fields: { postId: 1, createdAt: -1 } },
    // Query posts a user has liked
    { fields: { userId: 1, createdAt: -1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Reposts Collection
// ═══════════════════════════════════════════════════════

/** Collection name for reposts */
export const REPOSTS_COLLECTION = 'brighthub_reposts';

/**
 * Schema definition for the reposts collection.
 * Tracks repost interactions on posts.
 */
export const REPOSTS_SCHEMA: CollectionSchema = {
  name: 'brighthub_repost',
  properties: {
    _id: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    postId: { type: 'string', required: true },
    createdAt: { type: 'string', required: true },
  },
  required: ['userId', 'postId', 'createdAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Unique constraint: one repost per user per post
    { fields: { userId: 1, postId: 1 }, options: { unique: true } },
    // Query reposts of a post
    { fields: { postId: 1, createdAt: -1 } },
    // Query posts a user has reposted
    { fields: { userId: 1, createdAt: -1 } },
  ],
};
