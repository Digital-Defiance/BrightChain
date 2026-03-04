/**
 * BrightHub Notifications Collection Schema
 *
 * Defines the database schema for notifications including
 * recipient, type, category, actor, target, and read status.
 */

import type { CollectionSchema } from '../../schemaValidation';

/** Collection name for notifications */
export const NOTIFICATIONS_COLLECTION = 'brighthub_notifications';

/** Notification type enum values for schema validation */
export const NOTIFICATION_TYPE_VALUES = [
  'like',
  'reply',
  'mention',
  'follow',
  'follow_request',
  'repost',
  'quote',
  'new_message',
  'message_request',
  'message_reaction',
  'system_alert',
  'reconnect_reminder',
] as const;

/** Notification category enum values for schema validation */
export const NOTIFICATION_CATEGORY_VALUES = [
  'social',
  'messages',
  'connections',
  'system',
] as const;

/**
 * Schema definition for the notifications collection.
 * Stores user notifications with categorization and read tracking.
 */
export const NOTIFICATIONS_SCHEMA: CollectionSchema = {
  name: 'brighthub_notification',
  properties: {
    _id: { type: 'string', required: true },
    recipientId: { type: 'string', required: true },
    type: {
      type: 'string',
      required: true,
      enum: [...NOTIFICATION_TYPE_VALUES],
    },
    category: {
      type: 'string',
      required: true,
      enum: [...NOTIFICATION_CATEGORY_VALUES],
    },
    actorId: { type: 'string', required: true },
    targetId: { type: 'string' },
    content: { type: 'string', required: true },
    clickThroughUrl: { type: 'string', required: true },
    groupId: { type: 'string' },
    isRead: { type: 'boolean', required: true },
    createdAt: { type: 'string', required: true },
  },
  required: [
    'recipientId',
    'type',
    'category',
    'actorId',
    'content',
    'clickThroughUrl',
    'isRead',
    'createdAt',
  ],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // User's notifications timeline
    { fields: { recipientId: 1, createdAt: -1 } },
    // Unread notifications for a user
    { fields: { recipientId: 1, isRead: 1, createdAt: -1 } },
    // Filter by category
    { fields: { recipientId: 1, category: 1, createdAt: -1 } },
    // Notification grouping
    { fields: { groupId: 1 } },
    // Filter by type
    { fields: { recipientId: 1, type: 1, createdAt: -1 } },
  ],
};
