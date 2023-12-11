/**
 * BrightHub User Profile Schemas
 *
 * Defines database schemas for user profiles, blocks, and mutes.
 */

import type { CollectionSchema } from '../../schemaValidation';

// ═══════════════════════════════════════════════════════
// User Profiles Collection
// ═══════════════════════════════════════════════════════

/** Collection name for user profiles */
export const USER_PROFILES_COLLECTION = 'brighthub_user_profiles';

/** Approve followers mode enum values for schema validation */
export const APPROVE_FOLLOWERS_MODE_VALUES = [
  'approve_all',
  'approve_non_mutuals',
  'approve_none',
] as const;

/**
 * Schema definition for the user profiles collection.
 * Stores user profile information for the BrightHub social network.
 */
export const USER_PROFILES_SCHEMA: CollectionSchema = {
  name: 'brighthub_user_profile',
  properties: {
    _id: { type: 'string', required: true },
    username: { type: 'string', required: true, minLength: 1, maxLength: 30 },
    displayName: { type: 'string', required: true, maxLength: 50 },
    bio: { type: 'string', maxLength: 160 },
    profilePictureUrl: { type: 'string' },
    headerImageUrl: { type: 'string' },
    location: { type: 'string', maxLength: 100 },
    websiteUrl: { type: 'string', maxLength: 200 },
    followerCount: { type: 'number', required: true, minimum: 0 },
    followingCount: { type: 'number', required: true, minimum: 0 },
    postCount: { type: 'number', required: true, minimum: 0 },
    friendCount: { type: 'number', minimum: 0 },
    isVerified: { type: 'boolean', required: true },
    isProtected: { type: 'boolean', required: true },
    approveFollowersMode: {
      type: 'string',
      required: true,
      enum: [...APPROVE_FOLLOWERS_MODE_VALUES],
    },
    // Privacy settings embedded
    privacySettings: {
      type: 'object',
      required: true,
      properties: {
        hideFollowerCount: { type: 'boolean', required: true },
        hideFollowingCount: { type: 'boolean', required: true },
        hideFollowersFromNonFollowers: { type: 'boolean', required: true },
        hideFollowingFromNonFollowers: { type: 'boolean', required: true },
        allowDmsFromNonFollowers: { type: 'boolean', required: true },
        showOnlineStatus: { type: 'boolean', required: true },
        showReadReceipts: { type: 'boolean', required: true },
        hideFriendsFromNonFriends: { type: 'boolean' },
      },
    },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true },
  },
  required: [
    'username',
    'displayName',
    'followerCount',
    'followingCount',
    'postCount',
    'isVerified',
    'isProtected',
    'approveFollowersMode',
    'privacySettings',
    'createdAt',
    'updatedAt',
  ],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Unique username
    { fields: { username: 1 }, options: { unique: true } },
    // Search by display name
    { fields: { displayName: 1 } },
    // Text search on username and display name
    {
      fields: { username: 'text', displayName: 'text' },
      options: { name: 'user_search_text' },
    },
  ],
};

// ═══════════════════════════════════════════════════════
// Blocks Collection
// ═══════════════════════════════════════════════════════

/** Collection name for blocks */
export const BLOCKS_COLLECTION = 'brighthub_blocks';

/**
 * Schema definition for the blocks collection.
 * Tracks block relationships between users.
 */
export const BLOCKS_SCHEMA: CollectionSchema = {
  name: 'brighthub_block',
  properties: {
    _id: { type: 'string', required: true },
    blockerId: { type: 'string', required: true },
    blockedId: { type: 'string', required: true },
    createdAt: { type: 'string', required: true },
  },
  required: ['blockerId', 'blockedId', 'createdAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Unique constraint: one block relationship per user pair
    { fields: { blockerId: 1, blockedId: 1 }, options: { unique: true } },
    // Query blocks by blocker
    { fields: { blockerId: 1, createdAt: -1 } },
    // Query blocks by blocked user (to check if someone is blocked)
    { fields: { blockedId: 1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Mutes Collection
// ═══════════════════════════════════════════════════════

/** Collection name for mutes */
export const MUTES_COLLECTION = 'brighthub_mutes';

/**
 * Schema definition for the mutes collection.
 * Tracks mute relationships between users (permanent mutes).
 */
export const MUTES_SCHEMA: CollectionSchema = {
  name: 'brighthub_mute',
  properties: {
    _id: { type: 'string', required: true },
    muterId: { type: 'string', required: true },
    mutedId: { type: 'string', required: true },
    createdAt: { type: 'string', required: true },
  },
  required: ['muterId', 'mutedId', 'createdAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Unique constraint: one mute relationship per user pair
    { fields: { muterId: 1, mutedId: 1 }, options: { unique: true } },
    // Query mutes by muter
    { fields: { muterId: 1, createdAt: -1 } },
    // Query mutes by muted user
    { fields: { mutedId: 1 } },
  ],
};
