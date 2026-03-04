/**
 * Property-based tests for Notification_Service.
 *
 * Tests the following properties:
 * - Property 20: Mention Notification Creation
 * - Property 22: Notification Category Assignment
 * - Property 23: Notification Click-Through URL
 * - Property 48: Notification Deduplication
 * - Property 49: Notification Grouping
 * - Property 50: Quiet Hours Enforcement
 * - Property 51: Do Not Disturb Mode
 * - Property 52: Notification Mark as Read
 *
 * Validates: Requirements 7.2, 9.1-9.14, 54-56
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  NOTIFICATION_GROUPING_WINDOW_MS,
  NotificationCategory,
  NotificationErrorCode,
  NotificationType,
} from '@brightchain/brighthub-lib';
import fc from 'fast-check';
import {
  createNotificationService,
  NotificationService,
} from './notificationService';
import {
  createMockNotificationApplication,
  setupQuietModeConnection,
} from './notificationService.test-helpers';

describe('Feature: brighthub-social-network, Notification_Service Property Tests', () => {
  let service: NotificationService;
  let mockApp: ReturnType<typeof createMockNotificationApplication>;

  beforeEach(() => {
    mockApp = createMockNotificationApplication();
    service = createNotificationService(mockApp as any);
  });

  // --- Smart Generators ---

  const userIdArb = fc.uuid();
  const contentArb = fc
    .string({ minLength: 1, maxLength: 200 })
    .filter((s) => s.trim().length > 0);
  const urlArb = fc.constantFrom(
    '/posts/123',
    '/users/456',
    '/messages/789',
    '/notifications',
  );
  const notificationTypeArb = fc.constantFrom(
    ...Object.values(NotificationType),
  );

  // --- Expected category mapping ---

  const EXPECTED_CATEGORY_MAP: Record<NotificationType, NotificationCategory> =
    {
      [NotificationType.Like]: NotificationCategory.Social,
      [NotificationType.Reply]: NotificationCategory.Social,
      [NotificationType.Mention]: NotificationCategory.Social,
      [NotificationType.Repost]: NotificationCategory.Social,
      [NotificationType.Quote]: NotificationCategory.Social,
      [NotificationType.Follow]: NotificationCategory.Connections,
      [NotificationType.FollowRequest]: NotificationCategory.Connections,
      [NotificationType.ReconnectReminder]: NotificationCategory.Connections,
      [NotificationType.NewMessage]: NotificationCategory.Messages,
      [NotificationType.MessageRequest]: NotificationCategory.Messages,
      [NotificationType.MessageReaction]: NotificationCategory.Messages,
      [NotificationType.SystemAlert]: NotificationCategory.System,
      [NotificationType.SecurityAlert]: NotificationCategory.System,
      [NotificationType.FeatureAnnouncement]: NotificationCategory.System,
    };

  // --- Property Tests ---

  describe('Property 20: Mention Notification Creation', () => {
    /**
     * Property 20: Mention Notification Creation
     *
     * WHEN a user is mentioned in a post, a notification with type Mention
     * and category Social is created with the correct content and targetId.
     *
     * **Validates: Requirements 7.2**
     */
    it('should create a Mention notification with category Social', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          contentArb,
          userIdArb,
          async (recipientId, actorId, content, targetId) => {
            if (recipientId === actorId) return true;

            mockApp = createMockNotificationApplication();
            service = createNotificationService(mockApp as any);

            const notification = await service.createNotification(
              recipientId,
              NotificationType.Mention,
              actorId,
              { content, targetId, clickThroughUrl: `/posts/${targetId}` },
            );

            expect(notification).not.toBeNull();
            expect(notification!.type).toBe(NotificationType.Mention);
            expect(notification!.category).toBe(NotificationCategory.Social);
            expect(notification!.content).toBe(content);
            expect(notification!.targetId).toBe(targetId);
            expect(notification!.recipientId).toBe(recipientId);
            expect(notification!.actorId).toBe(actorId);

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });
  });

  describe('Property 22: Notification Category Assignment', () => {
    /**
     * Property 22: Notification Category Assignment
     *
     * EVERY notification type maps to exactly one category:
     * - Like, Reply, Mention, Repost, Quote → Social
     * - Follow, FollowRequest, ReconnectReminder → Connections
     * - NewMessage, MessageRequest, MessageReaction → Messages
     * - SystemAlert, SecurityAlert, FeatureAnnouncement → System
     *
     * **Validates: Requirements 9.13, 9.14**
     */
    it('should assign the correct category for every notification type', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          notificationTypeArb,
          async (recipientId, actorId, type) => {
            if (recipientId === actorId) return true;

            mockApp = createMockNotificationApplication();
            service = createNotificationService(mockApp as any);

            const notification = await service.createNotification(
              recipientId,
              type,
              actorId,
              { content: 'test', clickThroughUrl: '/test' },
            );

            expect(notification).not.toBeNull();
            expect(notification!.category).toBe(EXPECTED_CATEGORY_MAP[type]);

            return true;
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Property 23: Notification Click-Through URL', () => {
    /**
     * Property 23: Notification Click-Through URL
     *
     * EVERY notification stores a clickThroughUrl that is returned correctly.
     *
     * **Validates: Requirements 9.1**
     */
    it('should store and return clickThroughUrl correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          notificationTypeArb,
          urlArb,
          async (recipientId, actorId, type, url) => {
            if (recipientId === actorId) return true;

            mockApp = createMockNotificationApplication();
            service = createNotificationService(mockApp as any);

            const notification = await service.createNotification(
              recipientId,
              type,
              actorId,
              { clickThroughUrl: url },
            );

            expect(notification).not.toBeNull();
            expect(notification!.clickThroughUrl).toBe(url);

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });
  });

  describe('Property 48: Notification Deduplication (Quiet Mode Suppression)', () => {
    /**
     * Property 48: Notification Deduplication
     *
     * WHEN a connection has quiet mode enabled, notifications from that
     * connection are suppressed (null returned).
     *
     * **Validates: Requirements 9.10**
     */
    it('should suppress notifications from quiet mode connections', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          notificationTypeArb,
          contentArb,
          async (recipientId, actorId, type, content) => {
            if (recipientId === actorId) return true;

            mockApp = createMockNotificationApplication();
            service = createNotificationService(mockApp as any);

            // Set up quiet mode for this connection
            await setupQuietModeConnection(mockApp, recipientId, actorId);

            const notification = await service.createNotification(
              recipientId,
              type,
              actorId,
              { content },
            );

            expect(notification).toBeNull();

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });
  });

  describe('Property 49: Notification Grouping', () => {
    /**
     * Property 49: Notification Grouping
     *
     * WHEN multiple notifications of the same type on the same target are
     * created within 1 hour, they are grouped together with correct count
     * and actorIds. Notifications more than 1 hour apart create separate groups.
     * skipGrouping=true returns each notification as its own group.
     *
     * **Validates: Requirements 55.6-55.9**
     */
    it('should group same-type notifications on same target within 1 hour', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.array(userIdArb, { minLength: 2, maxLength: 5 }),
          userIdArb,
          async (recipientId, actorIds, targetId) => {
            // Ensure all actors are unique and different from recipient
            const uniqueActors = [...new Set(actorIds)].filter(
              (id) => id !== recipientId,
            );
            if (uniqueActors.length < 2) return true;

            mockApp = createMockNotificationApplication();
            service = createNotificationService(mockApp as any);

            // Create multiple Like notifications on the same target within 1 hour
            const notifications = [];
            const baseTime = Date.now();
            for (let i = 0; i < uniqueActors.length; i++) {
              const n = await service.createNotification(
                recipientId,
                NotificationType.Like,
                uniqueActors[i],
                { targetId, content: 'liked your post' },
              );
              expect(n).not.toBeNull();
              // Override createdAt to be within the grouping window
              const notifCollection = mockApp.collections.get(
                'brighthub_notifications',
              )!;
              const record = notifCollection.data.find(
                (r: any) => r._id === n!._id,
              );
              if (record) {
                (record as any).createdAt = new Date(
                  baseTime + i * 1000,
                ).toISOString();
              }
              notifications.push(n!);
            }

            // Re-read notifications to get updated createdAt
            const result = await service.getNotifications(recipientId);
            const groups = await service.groupNotifications(result.items);

            // All should be in one group since they share type+target within 1 hour
            const targetGroups = groups.filter(
              (g) => g.groupKey === `${NotificationType.Like}:${targetId}`,
            );
            expect(targetGroups.length).toBe(1);
            expect(targetGroups[0].count).toBe(uniqueActors.length);
            expect(targetGroups[0].actorIds.length).toBe(uniqueActors.length);

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should create separate groups for notifications more than 1 hour apart', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          userIdArb,
          userIdArb,
          async (recipientId, actor1, actor2, targetId) => {
            if (
              recipientId === actor1 ||
              recipientId === actor2 ||
              actor1 === actor2
            )
              return true;

            mockApp = createMockNotificationApplication();
            service = createNotificationService(mockApp as any);

            // Create first notification
            const n1 = await service.createNotification(
              recipientId,
              NotificationType.Like,
              actor1,
              { targetId },
            );
            expect(n1).not.toBeNull();

            // Create second notification more than 1 hour later
            const n2 = await service.createNotification(
              recipientId,
              NotificationType.Like,
              actor2,
              { targetId },
            );
            expect(n2).not.toBeNull();

            // Manually adjust timestamps to be > 1 hour apart
            const notifCollection = mockApp.collections.get(
              'brighthub_notifications',
            )!;
            const r1 = notifCollection.data.find((r: any) => r._id === n1!._id);
            const r2 = notifCollection.data.find((r: any) => r._id === n2!._id);
            const baseTime = Date.now();
            if (r1) (r1 as any).createdAt = new Date(baseTime).toISOString();
            if (r2)
              (r2 as any).createdAt = new Date(
                baseTime + NOTIFICATION_GROUPING_WINDOW_MS + 1000,
              ).toISOString();

            const result = await service.getNotifications(recipientId);
            const groups = await service.groupNotifications(result.items);

            const targetGroups = groups.filter(
              (g) => g.groupKey === `${NotificationType.Like}:${targetId}`,
            );
            expect(targetGroups.length).toBe(2);
            expect(targetGroups[0].count).toBe(1);
            expect(targetGroups[1].count).toBe(1);

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should return each notification as its own group when skipGrouping=true', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          userIdArb,
          userIdArb,
          async (recipientId, actor1, actor2, targetId) => {
            if (
              recipientId === actor1 ||
              recipientId === actor2 ||
              actor1 === actor2
            )
              return true;

            mockApp = createMockNotificationApplication();
            service = createNotificationService(mockApp as any);

            await service.createNotification(
              recipientId,
              NotificationType.Like,
              actor1,
              { targetId },
            );
            await service.createNotification(
              recipientId,
              NotificationType.Like,
              actor2,
              { targetId },
            );

            const result = await service.getNotifications(recipientId);
            const groups = await service.groupNotifications(result.items, true);

            // Each notification should be its own group
            expect(groups.length).toBe(result.items.length);
            for (const group of groups) {
              expect(group.count).toBe(1);
              expect(group.notificationIds.length).toBe(1);
            }

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });
  });

  describe('Property 50: Quiet Hours Enforcement', () => {
    /**
     * Property 50: Quiet Hours Enforcement
     *
     * WHEN quiet hours are active, non-critical notifications are suppressed.
     * Critical notifications (SecurityAlert, SystemAlert) bypass quiet hours.
     *
     * **Validates: Requirements 56.5, 56.6, 56.9**
     */
    it('should suppress non-critical notifications during quiet hours', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          contentArb,
          async (recipientId, actorId, content) => {
            if (recipientId === actorId) return true;

            mockApp = createMockNotificationApplication();
            service = createNotificationService(mockApp as any);

            // Set quiet hours to cover the entire day (00:00 to 23:59 UTC)
            await service.setQuietHours(recipientId, {
              enabled: true,
              startTime: '00:00',
              endTime: '23:59',
              timezone: 'UTC',
            });

            // Non-critical notification should be suppressed
            const notification = await service.createNotification(
              recipientId,
              NotificationType.Like,
              actorId,
              { content },
            );

            expect(notification).toBeNull();

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should allow critical notifications during quiet hours', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          contentArb,
          async (recipientId, actorId, content) => {
            if (recipientId === actorId) return true;

            mockApp = createMockNotificationApplication();
            service = createNotificationService(mockApp as any);

            // Set quiet hours to cover the entire day
            await service.setQuietHours(recipientId, {
              enabled: true,
              startTime: '00:00',
              endTime: '23:59',
              timezone: 'UTC',
            });

            // SecurityAlert should bypass quiet hours
            const notification = await service.createNotification(
              recipientId,
              NotificationType.SecurityAlert,
              actorId,
              { content },
            );

            expect(notification).not.toBeNull();
            expect(notification!.type).toBe(NotificationType.SecurityAlert);
            expect(notification!.category).toBe(NotificationCategory.System);

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });
  });

  describe('Property 51: Do Not Disturb Mode', () => {
    /**
     * Property 51: Do Not Disturb Mode
     *
     * WHEN DND is active, non-critical notifications are suppressed.
     * Critical notifications bypass DND.
     * Expired DND does not suppress notifications.
     *
     * **Validates: Requirements 56.7, 56.8, 56.9**
     */
    it('should suppress non-critical notifications when DND is active', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          contentArb,
          async (recipientId, actorId, content) => {
            if (recipientId === actorId) return true;

            mockApp = createMockNotificationApplication();
            service = createNotificationService(mockApp as any);

            // Enable DND with no expiration (permanent)
            await service.setDoNotDisturb(recipientId, {
              enabled: true,
            });

            const notification = await service.createNotification(
              recipientId,
              NotificationType.Like,
              actorId,
              { content },
            );

            expect(notification).toBeNull();

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should allow critical notifications during DND', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          contentArb,
          async (recipientId, actorId, content) => {
            if (recipientId === actorId) return true;

            mockApp = createMockNotificationApplication();
            service = createNotificationService(mockApp as any);

            // Enable DND with no expiration
            await service.setDoNotDisturb(recipientId, {
              enabled: true,
            });

            // SecurityAlert should bypass DND
            const notification = await service.createNotification(
              recipientId,
              NotificationType.SecurityAlert,
              actorId,
              { content },
            );

            expect(notification).not.toBeNull();
            expect(notification!.type).toBe(NotificationType.SecurityAlert);

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should not suppress notifications when DND has expired', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          contentArb,
          async (recipientId, actorId, content) => {
            if (recipientId === actorId) return true;

            mockApp = createMockNotificationApplication();
            service = createNotificationService(mockApp as any);

            // Enable DND with an already-expired expiresAt
            await service.setDoNotDisturb(recipientId, {
              enabled: true,
              expiresAt: new Date(Date.now() - 60000).toISOString(),
            });

            const notification = await service.createNotification(
              recipientId,
              NotificationType.Like,
              actorId,
              { content },
            );

            expect(notification).not.toBeNull();
            expect(notification!.type).toBe(NotificationType.Like);

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });
  });

  describe('Property 52: Notification Mark as Read', () => {
    /**
     * Property 52: Notification Mark as Read
     *
     * WHEN a notification is marked as read, the unread count decreases.
     * markAllAsRead sets unread count to 0.
     * Cannot mark another user's notification as read.
     *
     * **Validates: Requirements 54.5, 54.6**
     */
    it('should decrease unread count when marking as read', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          fc.array(contentArb, { minLength: 2, maxLength: 5 }),
          async (recipientId, actorId, contents) => {
            if (recipientId === actorId) return true;

            mockApp = createMockNotificationApplication();
            service = createNotificationService(mockApp as any);

            // Create multiple notifications
            const notifications = [];
            for (const content of contents) {
              const n = await service.createNotification(
                recipientId,
                NotificationType.Like,
                actorId,
                { content },
              );
              expect(n).not.toBeNull();
              notifications.push(n!);
            }

            // Verify initial unread count
            const initialCount = await service.getUnreadCount(recipientId);
            expect(initialCount).toBe(contents.length);

            // Mark one as read
            await service.markAsRead(notifications[0]._id, recipientId);

            const afterOneRead = await service.getUnreadCount(recipientId);
            expect(afterOneRead).toBe(contents.length - 1);

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should set unread count to 0 with markAllAsRead', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          fc.array(contentArb, { minLength: 1, maxLength: 5 }),
          async (recipientId, actorId, contents) => {
            if (recipientId === actorId) return true;

            mockApp = createMockNotificationApplication();
            service = createNotificationService(mockApp as any);

            for (const content of contents) {
              const n = await service.createNotification(
                recipientId,
                NotificationType.Like,
                actorId,
                { content },
              );
              expect(n).not.toBeNull();
            }

            const beforeCount = await service.getUnreadCount(recipientId);
            expect(beforeCount).toBe(contents.length);

            await service.markAllAsRead(recipientId);

            const afterCount = await service.getUnreadCount(recipientId);
            expect(afterCount).toBe(0);

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it("should reject marking another user's notification as read", async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          userIdArb,
          contentArb,
          async (recipientId, actorId, otherUserId, content) => {
            if (
              recipientId === actorId ||
              recipientId === otherUserId ||
              actorId === otherUserId
            )
              return true;

            mockApp = createMockNotificationApplication();
            service = createNotificationService(mockApp as any);

            const notification = await service.createNotification(
              recipientId,
              NotificationType.Like,
              actorId,
              { content },
            );
            expect(notification).not.toBeNull();

            await expect(
              service.markAsRead(notification!._id, otherUserId),
            ).rejects.toMatchObject({
              code: NotificationErrorCode.Unauthorized,
            });

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });
  });
});
