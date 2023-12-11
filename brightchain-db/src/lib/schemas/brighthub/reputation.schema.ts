/**
 * BrightHub Hub Reputation Schema
 *
 * Tracks per-user, per-hub reputation scores.
 * Reputation is earned independently in each hub.
 */

import type { CollectionSchema } from '../../schemaValidation';

/** Collection name for hub reputation */
export const HUB_REPUTATION_COLLECTION = 'brighthub_hub_reputation';

/**
 * Schema definition for the hub reputation collection.
 * One record per user per hub.
 */
export const HUB_REPUTATION_SCHEMA: CollectionSchema = {
  name: 'brighthub_hub_reputation',
  properties: {
    _id: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    hubId: { type: 'string', required: true },
    score: { type: 'number', required: true },
    postCount: { type: 'number', required: true, minimum: 0 },
    upvotesReceived: { type: 'number', required: true, minimum: 0 },
    lastActiveAt: { type: 'string', required: true },
  },
  required: [
    'userId',
    'hubId',
    'score',
    'postCount',
    'upvotesReceived',
    'lastActiveAt',
  ],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Unique: one reputation record per user per hub
    { fields: { userId: 1, hubId: 1 }, options: { unique: true } },
    // Leaderboard: top reputation in a hub
    { fields: { hubId: 1, score: -1 } },
    // User's reputation across hubs
    { fields: { userId: 1, score: -1 } },
  ],
};
