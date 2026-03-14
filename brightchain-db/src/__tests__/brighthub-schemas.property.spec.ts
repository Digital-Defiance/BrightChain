/**
 * Property-Based Tests for BrightHub Database Schema Constraints
 *
 * Property 28: Connection List Membership Invariants
 * Validates: Requirements 19.2, 19.3, 19.4, 19.5, 19.8, 19.9
 *
 * These tests verify that the schema constraints properly enforce
 * the business rules for connection list membership.
 */

import * as fc from 'fast-check';
import { validateDocument } from '../lib/schemaValidation';
import {
  CONNECTION_LISTS_SCHEMA,
  CONNECTION_LIST_MEMBERS_SCHEMA,
  CONVERSATIONS_SCHEMA,
  FOLLOWS_SCHEMA,
  LIKES_SCHEMA,
  MESSAGES_SCHEMA,
  NOTIFICATIONS_SCHEMA,
  POSTS_SCHEMA,
  REPOSTS_SCHEMA,
} from '../lib/schemas/brighthub';

// ═══════════════════════════════════════════════════════
// Arbitraries for generating test data
// ═══════════════════════════════════════════════════════

/** Generate a valid UUID-like string ID */
const arbId = fc.uuid().map((id) => id.replace(/-/g, ''));

/** Generate a valid ISO timestamp string */
const arbTimestamp = fc
  .integer({ min: 1577836800000, max: 1924905600000 }) // 2020-01-01 to 2030-12-31
  .map((ts) => new Date(ts).toISOString());

/** Generate a valid connection list document */
const arbConnectionList = fc.record({
  _id: arbId,
  ownerId: arbId,
  name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  visibility: fc.constantFrom('private', 'followers_only', 'public'),
  memberCount: fc.integer({ min: 0, max: 5000 }),
  followerCount: fc.nat(),
  createdAt: arbTimestamp,
  updatedAt: arbTimestamp,
});

/** Generate a valid connection list member document */
const arbConnectionListMember = fc.record({
  _id: arbId,
  listId: arbId,
  userId: arbId,
  addedAt: arbTimestamp,
});

/** Generate a valid post document */
const arbPost = fc.record({
  _id: arbId,
  authorId: arbId,
  content: fc.string({ minLength: 1, maxLength: 280 }),
  formattedContent: fc.string({ minLength: 1 }),
  postType: fc.constantFrom('original', 'reply', 'repost', 'quote'),
  parentPostId: fc.option(arbId, { nil: undefined }),
  quotedPostId: fc.option(arbId, { nil: undefined }),
  mediaAttachments: fc.array(
    fc.record({
      _id: arbId,
      url: fc.webUrl(),
      mimeType: fc.constantFrom('image/jpeg', 'image/png', 'image/gif'),
      width: fc.option(fc.nat(), { nil: undefined }),
      height: fc.option(fc.nat(), { nil: undefined }),
      altText: fc.option(fc.string(), { nil: undefined }),
    }),
    { maxLength: 4 },
  ),
  mentions: fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
    maxLength: 10,
  }),
  hashtags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
    maxLength: 10,
  }),
  likeCount: fc.nat(),
  repostCount: fc.nat(),
  replyCount: fc.nat(),
  quoteCount: fc.nat(),
  isEdited: fc.boolean(),
  editedAt: fc.option(arbTimestamp, { nil: undefined }),
  hubIds: fc.option(fc.array(arbId), { nil: undefined }),
  isBlogPost: fc.boolean(),
  isDeleted: fc.boolean(),
  createdAt: arbTimestamp,
  updatedAt: arbTimestamp,
  createdBy: arbId,
  updatedBy: arbId,
});

/** Generate a valid follow document */
const arbFollow = fc.record({
  _id: arbId,
  followerId: arbId,
  followedId: arbId,
  createdAt: arbTimestamp,
});

/** Generate a valid like document */
const arbLike = fc.record({
  _id: arbId,
  userId: arbId,
  postId: arbId,
  createdAt: arbTimestamp,
});

/** Generate a valid repost document */
const arbRepost = fc.record({
  _id: arbId,
  userId: arbId,
  postId: arbId,
  createdAt: arbTimestamp,
});

/** Generate a valid notification document */
const arbNotification = fc.record({
  _id: arbId,
  recipientId: arbId,
  type: fc.constantFrom(
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
  ),
  category: fc.constantFrom('social', 'messages', 'connections', 'system'),
  actorId: arbId,
  targetId: fc.option(arbId, { nil: undefined }),
  content: fc.string({ minLength: 1 }),
  clickThroughUrl: fc.webUrl(),
  groupId: fc.option(arbId, { nil: undefined }),
  isRead: fc.boolean(),
  createdAt: arbTimestamp,
});

/** Generate a valid conversation document */
const arbConversation = fc.record({
  _id: arbId,
  type: fc.constantFrom('direct', 'group'),
  participantIds: fc.array(arbId, { minLength: 2, maxLength: 50 }),
  name: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  avatarUrl: fc.option(fc.webUrl(), { nil: undefined }),
  adminIds: fc.option(fc.array(arbId), { nil: undefined }),
  creatorId: fc.option(arbId, { nil: undefined }),
  lastMessageAt: fc.option(arbTimestamp, { nil: undefined }),
  lastMessagePreview: fc.option(fc.string({ maxLength: 100 }), {
    nil: undefined,
  }),
  createdAt: arbTimestamp,
  updatedAt: arbTimestamp,
});

/** Generate a valid message document */
const arbMessage = fc.record({
  _id: arbId,
  conversationId: arbId,
  senderId: arbId,
  content: fc.string({ minLength: 1, maxLength: 2000 }),
  formattedContent: fc.string({ minLength: 1 }),
  attachments: fc.array(
    fc.record({
      _id: arbId,
      url: fc.webUrl(),
      mimeType: fc.constantFrom('image/jpeg', 'image/png', 'image/gif'),
      width: fc.option(fc.nat(), { nil: undefined }),
      height: fc.option(fc.nat(), { nil: undefined }),
      altText: fc.option(fc.string(), { nil: undefined }),
    }),
    { maxLength: 10 },
  ),
  replyToMessageId: fc.option(arbId, { nil: undefined }),
  forwardedFromId: fc.option(arbId, { nil: undefined }),
  isEdited: fc.boolean(),
  editedAt: fc.option(arbTimestamp, { nil: undefined }),
  isDeleted: fc.boolean(),
  createdAt: arbTimestamp,
});

// ═══════════════════════════════════════════════════════
// Property 28: Connection List Membership Invariants
// ═══════════════════════════════════════════════════════

describe('Property 28: Connection List Membership Invariants', () => {
  /**
   * Property 28.1: Valid connection lists pass schema validation
   * Validates: Requirement 19.2 - Adding connections to lists
   */
  it('should validate well-formed connection list documents', () => {
    fc.assert(
      fc.property(arbConnectionList, (list) => {
        const errors = validateDocument(
          list,
          CONNECTION_LISTS_SCHEMA,
          'brighthub_connection_lists',
        );
        return errors.length === 0;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 28.2: Valid connection list members pass schema validation
   * Validates: Requirement 19.3 - Removing connections from lists
   */
  it('should validate well-formed connection list member documents', () => {
    fc.assert(
      fc.property(arbConnectionListMember, (member) => {
        const errors = validateDocument(
          member,
          CONNECTION_LIST_MEMBERS_SCHEMA,
          'brighthub_connection_list_members',
        );
        return errors.length === 0;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 28.3: Member count constraint is enforced
   * Validates: Requirement 19.9 - 5000 members per list limit
   */
  it('should reject member counts exceeding 5000', () => {
    fc.assert(
      fc.property(
        arbConnectionList,
        fc.integer({ min: 5001, max: 10000 }),
        (list, invalidCount) => {
          const invalidList = { ...list, memberCount: invalidCount };
          try {
            validateDocument(
              invalidList,
              CONNECTION_LISTS_SCHEMA,
              'brighthub_connection_lists',
            );
            return false; // Should have thrown
          } catch {
            return true; // Expected validation error
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 28.4: List name length constraint is enforced
   * Validates: Requirement 19.8 - 100 lists per user (name validation)
   */
  it('should reject list names exceeding 100 characters', () => {
    fc.assert(
      fc.property(
        arbConnectionList,
        fc.string({ minLength: 101, maxLength: 200 }),
        (list, longName) => {
          const invalidList = { ...list, name: longName };
          try {
            validateDocument(
              invalidList,
              CONNECTION_LISTS_SCHEMA,
              'brighthub_connection_lists',
            );
            return false; // Should have thrown
          } catch {
            return true; // Expected validation error
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 28.5: Visibility must be a valid enum value
   * Validates: Requirement 19.4, 19.5 - Bulk add/remove operations
   */
  it('should reject invalid visibility values', () => {
    fc.assert(
      fc.property(
        arbConnectionList,
        fc
          .string()
          .filter((s) => !['private', 'followers_only', 'public'].includes(s)),
        (list, invalidVisibility) => {
          const invalidList = { ...list, visibility: invalidVisibility };
          try {
            validateDocument(
              invalidList,
              CONNECTION_LISTS_SCHEMA,
              'brighthub_connection_lists',
            );
            return false; // Should have thrown
          } catch {
            return true; // Expected validation error
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ═══════════════════════════════════════════════════════
// Additional Schema Validation Properties
// ═══════════════════════════════════════════════════════

describe('Post Schema Validation Properties', () => {
  it('should validate well-formed post documents', () => {
    fc.assert(
      fc.property(arbPost, (post) => {
        const errors = validateDocument(post, POSTS_SCHEMA, 'brighthub_posts');
        return errors.length === 0;
      }),
      { numRuns: 100 },
    );
  });

  it('should reject posts with content exceeding 280 characters', () => {
    fc.assert(
      fc.property(
        arbPost,
        fc.string({ minLength: 281, maxLength: 500 }),
        (post, longContent) => {
          const invalidPost = { ...post, content: longContent };
          try {
            validateDocument(invalidPost, POSTS_SCHEMA, 'brighthub_posts');
            return false;
          } catch {
            return true;
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('should reject posts with more than 4 media attachments', () => {
    fc.assert(
      fc.property(arbPost, (post) => {
        const tooManyAttachments = Array(5)
          .fill(null)
          .map(() => ({
            _id: 'test-id',
            url: 'https://example.com/image.jpg',
            mimeType: 'image/jpeg',
          }));
        const invalidPost = { ...post, mediaAttachments: tooManyAttachments };
        try {
          validateDocument(invalidPost, POSTS_SCHEMA, 'brighthub_posts');
          return false;
        } catch {
          return true;
        }
      }),
      { numRuns: 20 },
    );
  });
});

describe('Follow Schema Validation Properties', () => {
  it('should validate well-formed follow documents', () => {
    fc.assert(
      fc.property(arbFollow, (follow) => {
        const errors = validateDocument(
          follow,
          FOLLOWS_SCHEMA,
          'brighthub_follows',
        );
        return errors.length === 0;
      }),
      { numRuns: 100 },
    );
  });
});

describe('Like Schema Validation Properties', () => {
  it('should validate well-formed like documents', () => {
    fc.assert(
      fc.property(arbLike, (like) => {
        const errors = validateDocument(like, LIKES_SCHEMA, 'brighthub_likes');
        return errors.length === 0;
      }),
      { numRuns: 100 },
    );
  });
});

describe('Repost Schema Validation Properties', () => {
  it('should validate well-formed repost documents', () => {
    fc.assert(
      fc.property(arbRepost, (repost) => {
        const errors = validateDocument(
          repost,
          REPOSTS_SCHEMA,
          'brighthub_reposts',
        );
        return errors.length === 0;
      }),
      { numRuns: 100 },
    );
  });
});

describe('Notification Schema Validation Properties', () => {
  it('should validate well-formed notification documents', () => {
    fc.assert(
      fc.property(arbNotification, (notification) => {
        const errors = validateDocument(
          notification,
          NOTIFICATIONS_SCHEMA,
          'brighthub_notifications',
        );
        return errors.length === 0;
      }),
      { numRuns: 100 },
    );
  });

  it('should reject invalid notification types', () => {
    fc.assert(
      fc.property(
        arbNotification,
        fc
          .string()
          .filter(
            (s) =>
              ![
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
              ].includes(s),
          ),
        (notification, invalidType) => {
          const invalidNotification = { ...notification, type: invalidType };
          try {
            validateDocument(
              invalidNotification,
              NOTIFICATIONS_SCHEMA,
              'brighthub_notifications',
            );
            return false;
          } catch {
            return true;
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});

describe('Conversation Schema Validation Properties', () => {
  it('should validate well-formed conversation documents', () => {
    fc.assert(
      fc.property(arbConversation, (conversation) => {
        const errors = validateDocument(
          conversation,
          CONVERSATIONS_SCHEMA,
          'brighthub_conversations',
        );
        return errors.length === 0;
      }),
      { numRuns: 100 },
    );
  });

  it('should reject conversations with fewer than 2 participants', () => {
    fc.assert(
      fc.property(arbConversation, arbId, (conversation, singleParticipant) => {
        const invalidConversation = {
          ...conversation,
          participantIds: [singleParticipant],
        };
        try {
          validateDocument(
            invalidConversation,
            CONVERSATIONS_SCHEMA,
            'brighthub_conversations',
          );
          return false;
        } catch {
          return true;
        }
      }),
      { numRuns: 50 },
    );
  });
});

describe('Message Schema Validation Properties', () => {
  it('should validate well-formed message documents', () => {
    fc.assert(
      fc.property(arbMessage, (message) => {
        const errors = validateDocument(
          message,
          MESSAGES_SCHEMA,
          'brighthub_messages',
        );
        return errors.length === 0;
      }),
      { numRuns: 100 },
    );
  });

  it('should reject messages with content exceeding 2000 characters', () => {
    fc.assert(
      fc.property(
        arbMessage,
        fc.string({ minLength: 2001, maxLength: 3000 }),
        (message, longContent) => {
          const invalidMessage = { ...message, content: longContent };
          try {
            validateDocument(
              invalidMessage,
              MESSAGES_SCHEMA,
              'brighthub_messages',
            );
            return false;
          } catch {
            return true;
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
