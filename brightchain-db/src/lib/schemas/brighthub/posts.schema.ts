/**
 * BrightHub Posts Collection Schema
 *
 * Defines the database schema for social network posts including
 * content, author, timestamps, and interaction counts.
 */

import type { CollectionSchema } from '../../schemaValidation';

/** Collection name for posts */
export const POSTS_COLLECTION = 'brighthub_posts';

/** Post type enum values for schema validation */
export const POST_TYPE_VALUES = [
  'original',
  'reply',
  'repost',
  'quote',
] as const;

/**
 * Schema definition for the posts collection.
 * Supports posts, replies, reposts, and quote posts with media attachments.
 */
export const POSTS_SCHEMA: CollectionSchema = {
  name: 'brighthub_post',
  properties: {
    _id: { type: 'string', required: true },
    authorId: { type: 'string', required: true },
    content: { type: 'string', required: true, maxLength: 10000 },
    formattedContent: { type: 'string', required: true },
    postType: {
      type: 'string',
      required: true,
      enum: [...POST_TYPE_VALUES],
    },
    parentPostId: { type: 'string' },
    quotedPostId: { type: 'string' },
    mediaAttachments: {
      type: 'array',
      required: true,
      maxLength: 4,
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
    mentions: {
      type: 'array',
      required: true,
      maxLength: 10,
      items: { type: 'string' },
    },
    hashtags: {
      type: 'array',
      required: true,
      maxLength: 10,
      items: { type: 'string' },
    },
    likeCount: { type: 'number', required: true, minimum: 0 },
    repostCount: { type: 'number', required: true, minimum: 0 },
    replyCount: { type: 'number', required: true, minimum: 0 },
    quoteCount: { type: 'number', required: true, minimum: 0 },
    upvoteCount: { type: 'number', minimum: 0 },
    downvoteCount: { type: 'number', minimum: 0 },
    score: { type: 'number' },
    isEdited: { type: 'boolean', required: true },
    editedAt: { type: 'string' },
    hubIds: { type: 'array', items: { type: 'string' } },
    isBlogPost: { type: 'boolean', required: true },
    isDeleted: { type: 'boolean', required: true },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: true },
    createdBy: { type: 'string', required: true },
    updatedBy: { type: 'string', required: true },
  },
  required: [
    'authorId',
    'content',
    'formattedContent',
    'postType',
    'mediaAttachments',
    'mentions',
    'hashtags',
    'likeCount',
    'repostCount',
    'replyCount',
    'quoteCount',
    'isEdited',
    'isBlogPost',
    'isDeleted',
    'createdAt',
    'updatedAt',
    'createdBy',
    'updatedBy',
  ],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Author timeline queries
    { fields: { authorId: 1, createdAt: -1 } },
    // Thread/reply queries
    { fields: { parentPostId: 1, createdAt: -1 } },
    // Hashtag search
    { fields: { hashtags: 1 } },
    // Global timeline
    { fields: { createdAt: -1 } },
    // Text search on content
    { fields: { content: 1 }, options: { name: 'post_content_text' } },
    // Hub-restricted posts
    { fields: { hubIds: 1 } },
    // Soft-delete filtering
    { fields: { isDeleted: 1, createdAt: -1 } },
  ],
};

// ═══════════════════════════════════════════════════════
// Post Reports Collection
// ═══════════════════════════════════════════════════════

/** Collection name for post reports */
export const POST_REPORTS_COLLECTION = 'brighthub_post_reports';

/** Report status values */
export const POST_REPORT_STATUS_VALUES = [
  'pending',
  'reviewed',
  'dismissed',
  'actioned',
] as const;

/**
 * Schema definition for the post reports collection.
 * Tracks reported posts for moderation review.
 */
export const POST_REPORTS_SCHEMA: CollectionSchema = {
  name: 'brighthub_post_report',
  properties: {
    _id: { type: 'string', required: true },
    postId: { type: 'string', required: true },
    reporterId: { type: 'string', required: true },
    reason: { type: 'string', required: true, maxLength: 500 },
    hubId: { type: 'string' },
    status: {
      type: 'string',
      required: true,
      enum: [...POST_REPORT_STATUS_VALUES],
    },
    reviewedBy: { type: 'string' },
    reviewedAt: { type: 'string' },
    createdAt: { type: 'string', required: true },
  },
  required: ['postId', 'reporterId', 'reason', 'status', 'createdAt'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Moderation queue: pending reports sorted by date
    { fields: { status: 1, createdAt: -1 } },
    // Reports for a specific post
    { fields: { postId: 1 } },
    // Reports by a specific user
    { fields: { reporterId: 1 } },
    // Hub-scoped moderation
    { fields: { hubId: 1, status: 1, createdAt: -1 } },
  ],
};
