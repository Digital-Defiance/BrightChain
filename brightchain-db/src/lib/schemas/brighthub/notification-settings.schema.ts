/**
 * BrightHub Notification Preferences and Groups Schemas
 *
 * Defines database schemas for notification preferences and
 * notification grouping/aggregation.
 */

import type { CollectionSchema } from '../../schemaValidation';

// ═══════════════════════════════════════════════════════
// Notification Preferences Collection
// ═══════════════════════════════════════════════════════

/** Collection name for notification preferences */
export const NOTIFICATION_PREFERENCES_COLLECTION =
  'brighthub_notification_preferences';

/** Notification channel enum values for schema validation */
export const NOTIFICATION_CHANNEL_VALUES = ['in_app', 'email', 'push'] as const;

/**
 * Schema definition for the notification preferences collection.
 * Stores per-user notification settings including category preferences,
 * channel settings, quiet hours, and do-not-disturb configuration.
 */
export const NOTIFICATION_PREFERENCES_SCHEMA: CollectionSchema = {
  name: 'brighthub_notification_preferences',
  properties: {
    _id: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    categorySettings: {
      type: 'object',
      required: true,
      properties: {
        social: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean', required: true },
            channels: { type: 'object' },
          },
        },
        messages: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean', required: true },
            channels: { type: 'object' },
          },
        },
        connections: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean', required: true },
            channels: { type: 'object' },
          },
        },
        system: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean', required: true },
            channels: { type: 'object' },
          },
        },
      },
    },
    channelSettings: {
      type: 'object',
      required: true,
      properties: {
        in_app: { type: 'boolean' },
        email: { type: 'boolean' },
        push: { type: 'boolean' },
      },
    },
    quietHours: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', required: true },
        startTime: { type: 'string' }, // HH:mm format
        endTime: { type: 'string' }, // HH:mm format
        timezone: { type: 'string' },
      },
    },
    dndConfig: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', required: true },
        duration: { type: 'string' },
        expiresAt: { type: 'string' },
      },
    },
    soundEnabled: { type: 'boolean', required: true },
    updatedAt: { type: 'string', required: true },
  },
  required: [
    'userId',
    'categorySettings',
    'channelSettings',
    'soundEnabled',
    'updatedAt',
  ],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // One preferences document per user
    { fields: { userId: 1 }, options: { unique: true } },
  ],
};

// ═══════════════════════════════════════════════════════
// Notification Groups Collection
// ═══════════════════════════════════════════════════════

/** Collection name for notification groups */
export const NOTIFICATION_GROUPS_COLLECTION = 'brighthub_notification_groups';

/**
 * Schema definition for the notification groups collection.
 * Aggregates similar notifications (e.g., "5 people liked your post").
 */
export const NOTIFICATION_GROUPS_SCHEMA: CollectionSchema = {
  name: 'brighthub_notification_group',
  properties: {
    _id: { type: 'string', required: true },
    groupKey: { type: 'string', required: true },
    notificationIds: {
      type: 'array',
      required: true,
      items: { type: 'string' },
    },
    actorIds: {
      type: 'array',
      required: true,
      items: { type: 'string' },
    },
    count: { type: 'number', required: true, minimum: 1 },
    latestAt: { type: 'string', required: true },
  },
  required: ['groupKey', 'notificationIds', 'actorIds', 'count', 'latestAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Lookup by group key (e.g., "like:postId:recipientId")
    { fields: { groupKey: 1 }, options: { unique: true } },
    // Sort by latest activity
    { fields: { latestAt: -1 } },
  ],
};
