import {
  DEFAULT_NOTIFICATION_PAGE_LIMIT,
  IBaseNotification,
  IBaseNotificationGroup,
  IBaseNotificationPreferences,
  ICreateNotificationOptions,
  IDoNotDisturbConfig,
  INotificationCategorySettings,
  INotificationListOptions,
  INotificationService,
  IPaginatedResult,
  IQuietHoursConfig,
  MAX_NOTIFICATION_PAGE_LIMIT,
  MuteDuration,
  NOTIFICATION_GROUPING_WINDOW_MS,
  NotificationCategory,
  NotificationChannel,
  NotificationErrorCode,
  NotificationServiceError,
  NotificationType,
  RECONNECT_REMINDER_DAYS,
} from '@brightchain/brighthub-lib';
import { randomUUID } from 'crypto';

// ═══════════════════════════════════════════════════════
// Notification type → category mapping
// ═══════════════════════════════════════════════════════

/**
 * Maps each NotificationType to its NotificationCategory.
 *
 * Req 55.2 – Social: likes, reposts, quotes, replies, mentions
 * Req 55.3 – Messages: new messages, message requests, message reactions
 * Req 55.4 – Connections: new followers, follow requests, reconnect reminders
 * Req 55.5 – System: account alerts, security notifications, feature announcements
 */
const NOTIFICATION_TYPE_CATEGORY_MAP: Record<
  NotificationType,
  NotificationCategory
> = {
  // Social (Req 55.2)
  [NotificationType.Like]: NotificationCategory.Social,
  [NotificationType.Reply]: NotificationCategory.Social,
  [NotificationType.Mention]: NotificationCategory.Social,
  [NotificationType.Repost]: NotificationCategory.Social,
  [NotificationType.Quote]: NotificationCategory.Social,

  // Connections (Req 55.4)
  [NotificationType.Follow]: NotificationCategory.Connections,
  [NotificationType.FollowRequest]: NotificationCategory.Connections,
  [NotificationType.ReconnectReminder]: NotificationCategory.Connections,

  // Messages (Req 55.3)
  [NotificationType.NewMessage]: NotificationCategory.Messages,
  [NotificationType.MessageRequest]: NotificationCategory.Messages,
  [NotificationType.MessageReaction]: NotificationCategory.Messages,

  // System (Req 55.5)
  [NotificationType.SystemAlert]: NotificationCategory.System,
  [NotificationType.SecurityAlert]: NotificationCategory.System,
  [NotificationType.FeatureAnnouncement]: NotificationCategory.System,
};

// ═══════════════════════════════════════════════════════
// Database record types
// ═══════════════════════════════════════════════════════

interface NotificationRecord {
  _id: string;
  recipientId: string;
  type: string;
  category: string;
  actorId: string;
  targetId?: string;
  content: string;
  clickThroughUrl: string;
  groupId?: string;
  isRead: boolean;
  createdAt: string;
  /** Numeric timestamp (ms since epoch) for stable sort ordering */
  createdAtMs?: number;
}

interface NotificationPreferencesRecord {
  _id: string;
  userId: string;
  categorySettings: Record<string, unknown>;
  channelSettings: Record<string, boolean>;
  quietHours?: Record<string, unknown>;
  dndConfig?: Record<string, unknown>;
  soundEnabled: boolean;
  updatedAt: string;
}

interface NotificationGroupRecord {
  _id: string;
  groupKey: string;
  notificationIds: string[];
  actorIds: string[];
  count: number;
  latestAt: string;
}

// ═══════════════════════════════════════════════════════
// Connection-related record types (for filtering, Req 9.8-9.12)
// ═══════════════════════════════════════════════════════

interface ConnectionListMemberRecord {
  _id: string;
  listId: string;
  userId: string;
  addedAt: string;
}

interface ConnectionMetadataRecord {
  _id: string;
  userId: string;
  connectionId: string;
  isPriority: boolean;
  isQuiet: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ConnectionCategoryAssignmentRecord {
  _id: string;
  ownerId: string;
  connectionId: string;
  categoryId: string;
  assignedAt: string;
}

interface ConnectionInteractionRecord {
  _id: string;
  userId: string;
  connectionId: string;
  totalLikesGiven: number;
  totalLikesReceived: number;
  totalReplies: number;
  totalMentions: number;
  lastInteractionAt?: string;
  strength: string;
  followedAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════
// Collection & Application interfaces
// ═══════════════════════════════════════════════════════

interface FindQuery<T> {
  sort?(field: Record<string, 1 | -1>): FindQuery<T>;
  skip?(count: number): FindQuery<T>;
  limit?(count: number): FindQuery<T>;
  exec(): Promise<T[]>;
}

interface Collection<T> {
  create(record: T): Promise<T>;
  findOne(filter: Partial<T>): { exec(): Promise<T | null> };
  find(filter: Partial<T>): FindQuery<T>;
  updateOne(
    filter: Partial<T>,
    update: Partial<T>,
  ): { exec(): Promise<{ modifiedCount: number }> };
  deleteOne(filter: Partial<T>): { exec(): Promise<{ deletedCount: number }> };
  deleteMany?(filter: Partial<T>): {
    exec(): Promise<{ deletedCount: number }>;
  };
  countDocuments?(filter: Partial<T>): { exec(): Promise<number> };
}

interface IApplicationWithCollections {
  getModel<T>(name: string): Collection<T>;
}

// ═══════════════════════════════════════════════════════
// NotificationService Implementation
// ═══════════════════════════════════════════════════════

/**
 * Notification_Service implementation
 * Handles notification CRUD, preferences, grouping, and real-time delivery
 * @see Requirements: 9.1-9.7, 54.1-54.8
 */
export class NotificationService implements INotificationService {
  private readonly notificationsCollection: Collection<NotificationRecord>;
  private readonly preferencesCollection: Collection<NotificationPreferencesRecord>;
  private readonly groupsCollection: Collection<NotificationGroupRecord>;
  private readonly listMembersCollection: Collection<ConnectionListMemberRecord>;
  private readonly connectionMetadataCollection: Collection<ConnectionMetadataRecord>;
  private readonly categoryAssignmentsCollection: Collection<ConnectionCategoryAssignmentRecord>;
  private readonly connectionInteractionsCollection: Collection<ConnectionInteractionRecord>;
  private emailService?: {
    sendEmail(
      to: string,
      subject: string,
      text: string,
      html: string,
    ): Promise<void>;
  };
  private userEmailResolver?: (userId: string) => Promise<string | null>;

  constructor(application: IApplicationWithCollections) {
    this.notificationsCollection = application.getModel<NotificationRecord>(
      'brighthub_notifications',
    );
    this.preferencesCollection =
      application.getModel<NotificationPreferencesRecord>(
        'brighthub_notification_preferences',
      );
    this.groupsCollection = application.getModel<NotificationGroupRecord>(
      'brighthub_notification_groups',
    );
    this.listMembersCollection =
      application.getModel<ConnectionListMemberRecord>(
        'brighthub_connection_list_members',
      );
    this.connectionMetadataCollection =
      application.getModel<ConnectionMetadataRecord>(
        'brighthub_connection_metadata',
      );
    this.categoryAssignmentsCollection =
      application.getModel<ConnectionCategoryAssignmentRecord>(
        'brighthub_connection_category_assignments',
      );
    this.connectionInteractionsCollection =
      application.getModel<ConnectionInteractionRecord>(
        'brighthub_connection_interactions',
      );
  }

  /**
   * Set the email service for sending email notifications.
   */
  setEmailService(
    service: {
      sendEmail(
        to: string,
        subject: string,
        text: string,
        html: string,
      ): Promise<void>;
    },
    userEmailResolver: (userId: string) => Promise<string | null>,
  ): void {
    this.emailService = service;
    this.userEmailResolver = userEmailResolver;
  }

  /**
   * Send an email notification if the user has email enabled for this category.
   */
  private async sendEmailNotification(
    recipientId: string,
    category: string,
    subject: string,
    body: string,
  ): Promise<void> {
    if (!this.emailService || !this.userEmailResolver) return;

    try {
      // Check if user has email enabled for this category
      const prefs = await this.preferencesCollection
        .findOne({
          userId: recipientId,
        } as Partial<NotificationPreferencesRecord>)
        .exec();

      if (prefs) {
        const channelSettings = prefs.channelSettings as
          | Record<string, boolean>
          | undefined;
        if (channelSettings && channelSettings['email'] === false) return;

        const catSettings = prefs.categorySettings as
          | Record<
              string,
              { enabled?: boolean; channels?: Record<string, boolean> }
            >
          | undefined;
        if (catSettings?.[category]) {
          if (catSettings[category].enabled === false) return;
          if (catSettings[category].channels?.['email'] === false) return;
        }
      }

      const email = await this.userEmailResolver(recipientId);
      if (!email) return;

      await this.emailService.sendEmail(email, subject, body, `<p>${body}</p>`);
    } catch {
      // Non-fatal — email delivery failure shouldn't break notifications
    }
  }

  // ═══════════════════════════════════════════════════════
  // Private helpers
  // ═══════════════════════════════════════════════════════

  private clampLimit(limit?: number): number {
    const l = limit ?? DEFAULT_NOTIFICATION_PAGE_LIMIT;
    return Math.min(Math.max(1, l), MAX_NOTIFICATION_PAGE_LIMIT);
  }

  private recordToNotification(
    record: NotificationRecord,
  ): IBaseNotification<string> {
    return {
      _id: record._id,
      recipientId: record.recipientId,
      type: record.type as NotificationType,
      category: record.category as NotificationCategory,
      actorId: record.actorId,
      targetId: record.targetId,
      content: record.content,
      clickThroughUrl: record.clickThroughUrl,
      groupId: record.groupId,
      isRead: record.isRead,
      createdAt: record.createdAt,
    };
  }

  private getCategoryForType(type: NotificationType): NotificationCategory {
    return NOTIFICATION_TYPE_CATEGORY_MAP[type] ?? NotificationCategory.System;
  }

  /**
   * Build default notification preferences for a user.
   * All categories enabled, all channels enabled, no quiet hours, no DND, sound on.
   */
  private buildDefaultPreferences(
    userId: string,
  ): IBaseNotificationPreferences<string> {
    const defaultChannels: Record<NotificationChannel, boolean> = {
      [NotificationChannel.InApp]: true,
      [NotificationChannel.Email]: true,
      [NotificationChannel.Push]: true,
    };

    const defaultCategorySettings: Record<
      NotificationCategory,
      INotificationCategorySettings
    > = {
      [NotificationCategory.Social]: {
        enabled: true,
        channels: { ...defaultChannels },
      },
      [NotificationCategory.Messages]: {
        enabled: true,
        channels: { ...defaultChannels },
      },
      [NotificationCategory.Connections]: {
        enabled: true,
        channels: { ...defaultChannels },
      },
      [NotificationCategory.System]: {
        enabled: true,
        channels: { ...defaultChannels },
      },
    };

    return {
      userId,
      categorySettings: defaultCategorySettings,
      channelSettings: { ...defaultChannels },
      soundEnabled: true,
    };
  }

  /**
   * Get existing preferences from DB or create and persist defaults.
   * Req 56.11: Store preferences in user profile and sync across devices.
   */
  private async getOrCreateDefaultPreferences(
    userId: string,
  ): Promise<IBaseNotificationPreferences<string>> {
    const existing = await this.preferencesCollection
      .findOne({ userId } as Partial<NotificationPreferencesRecord>)
      .exec();

    if (existing) {
      return this.recordToPreferences(existing);
    }

    // Create default preferences and persist
    const defaults = this.buildDefaultPreferences(userId);
    const now = new Date().toISOString();

    const record: NotificationPreferencesRecord = {
      _id: randomUUID(),
      userId,
      categorySettings: defaults.categorySettings as unknown as Record<
        string,
        unknown
      >,
      channelSettings: defaults.channelSettings,
      soundEnabled: defaults.soundEnabled,
      updatedAt: now,
    };

    await this.preferencesCollection.create(record);
    return defaults;
  }

  /**
   * Convert a DB record to IBaseNotificationPreferences<string>.
   */
  private recordToPreferences(
    record: NotificationPreferencesRecord,
  ): IBaseNotificationPreferences<string> {
    const prefs: IBaseNotificationPreferences<string> = {
      userId: record.userId,
      categorySettings: record.categorySettings as unknown as Record<
        NotificationCategory,
        INotificationCategorySettings
      >,
      channelSettings: record.channelSettings as Record<
        NotificationChannel,
        boolean
      >,
      soundEnabled: record.soundEnabled,
    };

    if (record.quietHours) {
      prefs.quietHours = record.quietHours as unknown as IQuietHoursConfig;
    }
    if (record.dndConfig) {
      prefs.dndConfig = record.dndConfig as unknown as IDoNotDisturbConfig;
    }

    return prefs;
  }

  /**
   * Check if the current time falls within the quiet hours window.
   * Req 56.5: Suppress in-app notifications during quiet hours.
   * Req 56.6: Quiet hours with start/end times and timezone.
   */
  private isWithinQuietHours(config: IQuietHoursConfig): boolean {
    if (!config.enabled) {
      return false;
    }

    // Parse HH:mm times
    const parseTime = (
      timeStr: string,
    ): { hours: number; minutes: number } | null => {
      const match = /^(\d{2}):(\d{2})$/.exec(timeStr);
      if (!match) return null;
      return { hours: parseInt(match[1], 10), minutes: parseInt(match[2], 10) };
    };

    const start = parseTime(config.startTime);
    const end = parseTime(config.endTime);
    if (!start || !end) return false;

    // Get current time in the specified timezone
    let nowHours: number;
    let nowMinutes: number;
    try {
      const nowInTz = new Date().toLocaleString('en-US', {
        timeZone: config.timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });
      // Format: "HH:MM"
      const parts = nowInTz.split(':');
      nowHours = parseInt(parts[0], 10);
      nowMinutes = parseInt(parts[1], 10);
    } catch {
      // Invalid timezone — treat as not within quiet hours
      return false;
    }

    const nowTotal = nowHours * 60 + nowMinutes;
    const startTotal = start.hours * 60 + start.minutes;
    const endTotal = end.hours * 60 + end.minutes;

    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (startTotal <= endTotal) {
      return nowTotal >= startTotal && nowTotal < endTotal;
    } else {
      return nowTotal >= startTotal || nowTotal < endTotal;
    }
  }

  /**
   * Check if Do Not Disturb is currently active.
   * Req 56.7: DND suppresses all non-critical notifications.
   * Req 56.8: DND duration options.
   */
  private isDndActive(config: IDoNotDisturbConfig): boolean {
    if (!config.enabled) {
      return false;
    }

    // If there's an expiration, check if it has passed
    if (config.expiresAt) {
      const expiresAt = new Date(config.expiresAt);
      if (new Date() >= expiresAt) {
        return false;
      }
    }

    // Enabled with no expiration (permanent) or not yet expired
    return true;
  }

  /**
   * Check if a notification type is critical (should bypass DND/quiet hours).
   * Req 56.9: Critical system notifications delivered even during DND.
   */
  private isCriticalNotificationType(type: NotificationType): boolean {
    return (
      type === NotificationType.SecurityAlert ||
      type === NotificationType.SystemAlert
    );
  }

  // ═══════════════════════════════════════════════════════
  // Notification CRUD (Req 9.1-9.7, 54.1-54.8)
  // ═══════════════════════════════════════════════════════

  async createNotification(
    recipientId: string,
    type: NotificationType,
    actorId: string,
    options?: ICreateNotificationOptions,
  ): Promise<IBaseNotification<string> | null> {
    if (!recipientId || !actorId) {
      throw new NotificationServiceError(
        NotificationErrorCode.InvalidInput,
        'recipientId and actorId are required',
      );
    }

    // Req 9.10: Suppress notifications from quiet-mode connections
    const isQuiet = await this.isQuietModeConnection(recipientId, actorId);
    if (isQuiet) {
      return null;
    }

    const category = this.getCategoryForType(type);
    const isCritical = this.isCriticalNotificationType(type);

    // Req 56.4: Respect user preferences when creating notifications
    if (!isCritical) {
      const prefs = await this.getOrCreateDefaultPreferences(recipientId);

      // Check if the category is disabled (Req 56.1-56.3)
      const catSettings = prefs.categorySettings[category];
      if (catSettings && !catSettings.enabled) {
        return null;
      }

      // Req 56.5-56.6: Check quiet hours
      if (prefs.quietHours && this.isWithinQuietHours(prefs.quietHours)) {
        return null;
      }

      // Req 56.7-56.8: Check DND
      if (prefs.dndConfig && this.isDndActive(prefs.dndConfig)) {
        return null;
      }
    }

    const now = new Date();

    const record: NotificationRecord = {
      _id: randomUUID(),
      recipientId,
      type,
      category,
      actorId,
      targetId: options?.targetId,
      content: options?.content ?? '',
      clickThroughUrl: options?.clickThroughUrl ?? '',
      isRead: false,
      createdAt: now.toISOString(),
      createdAtMs: now.getTime(),
    };

    await this.notificationsCollection.create(record);

    // Send email notification if enabled
    const notifContent = options?.content ?? type;
    this.sendEmailNotification(
      recipientId,
      record.category,
      `BrightHub: ${type}`,
      notifContent,
    ).catch(() => {}); // Fire and forget

    return this.recordToNotification(record);
  }

  async getNotifications(
    userId: string,
    options?: INotificationListOptions,
  ): Promise<IPaginatedResult<IBaseNotification<string>>> {
    const limit = this.clampLimit(options?.limit);

    // Build filter
    const filter: Partial<NotificationRecord> = { recipientId: userId };
    if (options?.category) {
      filter.category = options.category;
    }
    if (options?.isRead !== undefined) {
      filter.isRead = options.isRead;
    }

    // Query with reverse chronological order
    let query = this.notificationsCollection.find(filter);
    if (query.sort) {
      query = query.sort({ createdAt: -1, _id: -1 });
    }

    const records = await query.exec();

    // Stable in-memory sort using createdAtMs (numeric) for precise ordering.
    // Falls back to ISO string comparison, then _id for deterministic tiebreak.
    records.sort((a, b) => {
      const aMs = a.createdAtMs ?? new Date(a.createdAt).getTime();
      const bMs = b.createdAtMs ?? new Date(b.createdAt).getTime();
      if (bMs !== aMs) return bMs - aMs; // reverse chronological
      return a._id < b._id ? 1 : a._id > b._id ? -1 : 0;
    });

    // Cursor-based pagination: cursor is the _id of the last item on the
    // previous page. Find its position and start after it.
    let startIndex = 0;
    if (options?.cursor) {
      // Try id-based cursor first (preferred)
      const cursorIdx = records.findIndex((r) => r._id === options.cursor);
      if (cursorIdx >= 0) {
        startIndex = cursorIdx + 1;
      } else {
        // Fall back to offset-based cursor for backward compatibility
        const cursorOffset = parseInt(options.cursor, 10);
        if (!isNaN(cursorOffset) && cursorOffset > 0) {
          startIndex = cursorOffset;
        }
      }
    }

    const sliced = records.slice(startIndex, startIndex + limit + 1);
    const hasMore = sliced.length > limit;
    const items = sliced
      .slice(0, limit)
      .map((r) => this.recordToNotification(r));

    // Use the _id of the last returned item as the cursor
    const lastRecord = items.length > 0 ? sliced[items.length - 1] : undefined;
    const nextCursor = hasMore && lastRecord ? lastRecord._id : undefined;

    return {
      items,
      cursor: nextCursor,
      hasMore,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const filter: Partial<NotificationRecord> = {
      recipientId: userId,
      isRead: false,
    };

    if (this.notificationsCollection.countDocuments) {
      return this.notificationsCollection.countDocuments(filter).exec();
    }

    // Fallback: count via find
    const records = await this.notificationsCollection.find(filter).exec();
    return records.length;
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const record = await this.notificationsCollection
      .findOne({ _id: notificationId } as Partial<NotificationRecord>)
      .exec();

    if (!record) {
      throw new NotificationServiceError(
        NotificationErrorCode.NotificationNotFound,
        `Notification ${notificationId} not found`,
      );
    }

    if (record.recipientId !== userId) {
      throw new NotificationServiceError(
        NotificationErrorCode.Unauthorized,
        "Cannot mark another user's notification as read",
      );
    }

    await this.notificationsCollection
      .updateOne(
        { _id: notificationId } as Partial<NotificationRecord>,
        { isRead: true } as Partial<NotificationRecord>,
      )
      .exec();
  }

  async markAllAsRead(userId: string): Promise<void> {
    // Find all unread notifications for the user and mark them as read
    const unread = await this.notificationsCollection
      .find({
        recipientId: userId,
        isRead: false,
      } as Partial<NotificationRecord>)
      .exec();

    for (const record of unread) {
      await this.notificationsCollection
        .updateOne(
          { _id: record._id } as Partial<NotificationRecord>,
          { isRead: true } as Partial<NotificationRecord>,
        )
        .exec();
    }
  }

  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    const record = await this.notificationsCollection
      .findOne({ _id: notificationId } as Partial<NotificationRecord>)
      .exec();

    if (!record) {
      throw new NotificationServiceError(
        NotificationErrorCode.NotificationNotFound,
        `Notification ${notificationId} not found`,
      );
    }

    if (record.recipientId !== userId) {
      throw new NotificationServiceError(
        NotificationErrorCode.Unauthorized,
        "Cannot delete another user's notification",
      );
    }

    await this.notificationsCollection
      .deleteOne({ _id: notificationId } as Partial<NotificationRecord>)
      .exec();
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    if (this.notificationsCollection.deleteMany) {
      await this.notificationsCollection
        .deleteMany({ recipientId: userId } as Partial<NotificationRecord>)
        .exec();
      return;
    }

    // Fallback: delete one by one
    const records = await this.notificationsCollection
      .find({ recipientId: userId } as Partial<NotificationRecord>)
      .exec();

    for (const record of records) {
      await this.notificationsCollection
        .deleteOne({ _id: record._id } as Partial<NotificationRecord>)
        .exec();
    }
  }

  // ═══════════════════════════════════════════════════════
  // Filtering (Req 9.8-9.12)
  // ═══════════════════════════════════════════════════════

  /**
   * Req 9.8: Get notifications filtered by connection list members.
   * Returns only notifications where the actorId is a member of the given list.
   */
  async getNotificationsByList(
    userId: string,
    listId: string,
    options?: INotificationListOptions,
  ): Promise<IPaginatedResult<IBaseNotification<string>>> {
    // Get all member userIds from the list
    const memberRecords = await this.listMembersCollection
      .find({ listId } as Partial<ConnectionListMemberRecord>)
      .exec();
    const memberIds = new Set(memberRecords.map((m) => m.userId));

    // Get all notifications for the user, then filter by actor membership
    const allResult = await this.getNotifications(userId, options);
    const filtered = allResult.items.filter((n) => memberIds.has(n.actorId));

    return {
      items: filtered,
      cursor: allResult.cursor,
      hasMore: allResult.hasMore,
    };
  }

  /**
   * Req 9.9: Get notifications filtered by connection category.
   * Returns only notifications where the actorId is in the given category.
   */
  async getNotificationsByConnectionCategory(
    userId: string,
    categoryId: string,
    options?: INotificationListOptions,
  ): Promise<IPaginatedResult<IBaseNotification<string>>> {
    // Get all connections assigned to this category for this user
    const assignments = await this.categoryAssignmentsCollection
      .find({
        ownerId: userId,
        categoryId,
      } as Partial<ConnectionCategoryAssignmentRecord>)
      .exec();
    const connectionIds = new Set(assignments.map((a) => a.connectionId));

    // Get all notifications for the user, then filter by actor in category
    const allResult = await this.getNotifications(userId, options);
    const filtered = allResult.items.filter((n) =>
      connectionIds.has(n.actorId),
    );

    return {
      items: filtered,
      cursor: allResult.cursor,
      hasMore: allResult.hasMore,
    };
  }

  /**
   * Req 9.10: Check if a connection has quiet mode enabled.
   */
  async isQuietModeConnection(
    userId: string,
    connectionId: string,
  ): Promise<boolean> {
    const metadata = await this.connectionMetadataCollection
      .findOne({
        userId,
        connectionId,
      } as Partial<ConnectionMetadataRecord>)
      .exec();

    return metadata?.isQuiet === true;
  }

  /**
   * Req 9.12: Create a reconnect reminder for a 30-day inactive connection.
   * Checks that the connection hasn't interacted in RECONNECT_REMINDER_DAYS days,
   * then creates a notification with type ReconnectReminder and category Connections.
   */
  async createReconnectReminder(
    userId: string,
    connectionId: string,
  ): Promise<IBaseNotification<string>> {
    // Look up the interaction record
    const interaction = await this.connectionInteractionsCollection
      .findOne({
        userId,
        connectionId,
      } as Partial<ConnectionInteractionRecord>)
      .exec();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RECONNECT_REMINDER_DAYS);

    // If there's a recent interaction, don't create a reminder
    if (interaction?.lastInteractionAt) {
      const lastInteraction = new Date(interaction.lastInteractionAt);
      if (lastInteraction > cutoffDate) {
        throw new NotificationServiceError(
          NotificationErrorCode.InvalidInput,
          `Connection ${connectionId} has interacted within the last ${RECONNECT_REMINDER_DAYS} days`,
        );
      }
    }

    // Create the reconnect reminder notification directly (bypass quiet mode check
    // since this is a system-initiated reminder, not an actor-initiated notification)
    const now = new Date().toISOString();
    const record: NotificationRecord = {
      _id: randomUUID(),
      recipientId: userId,
      type: NotificationType.ReconnectReminder,
      category: NotificationCategory.Connections,
      actorId: connectionId,
      content: `You haven't interacted with this connection in ${RECONNECT_REMINDER_DAYS} days. Consider reconnecting!`,
      clickThroughUrl: `/users/${connectionId}`,
      isRead: false,
      createdAt: now,
    };

    await this.notificationsCollection.create(record);
    return this.recordToNotification(record);
  }

  // ═══════════════════════════════════════════════════════
  // Preferences (Req 56.1-56.12)
  // ═══════════════════════════════════════════════════════

  /**
   * Get notification preferences for a user.
   * Returns existing preferences or creates defaults if none exist.
   * Req 56.11: Store preferences in user profile and sync across devices.
   */
  async getPreferences(
    userId: string,
  ): Promise<IBaseNotificationPreferences<string>> {
    return this.getOrCreateDefaultPreferences(userId);
  }

  /**
   * Update notification preferences for a user.
   * Merges partial updates into existing preferences.
   * Req 56.1-56.3: Per-category enable/disable and per-channel settings.
   * Req 56.10: Sound preferences.
   * Req 56.12: Preferences update reflected immediately.
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<IBaseNotificationPreferences<string>>,
  ): Promise<IBaseNotificationPreferences<string>> {
    const existing = await this.getOrCreateDefaultPreferences(userId);

    // Merge category settings
    if (preferences.categorySettings) {
      for (const cat of Object.values(NotificationCategory)) {
        if (preferences.categorySettings[cat]) {
          existing.categorySettings[cat] = {
            ...existing.categorySettings[cat],
            ...preferences.categorySettings[cat],
            channels: {
              ...existing.categorySettings[cat].channels,
              ...(preferences.categorySettings[cat].channels ?? {}),
            },
          };
        }
      }
    }

    // Merge channel settings
    if (preferences.channelSettings) {
      existing.channelSettings = {
        ...existing.channelSettings,
        ...preferences.channelSettings,
      };
    }

    // Merge optional fields
    if (preferences.quietHours !== undefined) {
      existing.quietHours = preferences.quietHours;
    }
    if (preferences.dndConfig !== undefined) {
      existing.dndConfig = preferences.dndConfig;
    }
    if (preferences.soundEnabled !== undefined) {
      existing.soundEnabled = preferences.soundEnabled;
    }

    // Save to database
    const now = new Date().toISOString();
    await this.preferencesCollection
      .updateOne(
        { userId } as Partial<NotificationPreferencesRecord>,
        {
          categorySettings: existing.categorySettings as unknown as Record<
            string,
            unknown
          >,
          channelSettings: existing.channelSettings as Record<string, boolean>,
          quietHours: existing.quietHours as unknown as Record<string, unknown>,
          dndConfig: existing.dndConfig as unknown as Record<string, unknown>,
          soundEnabled: existing.soundEnabled,
          updatedAt: now,
        } as Partial<NotificationPreferencesRecord>,
      )
      .exec();

    return existing;
  }

  /**
   * Set quiet hours configuration.
   * Req 56.5: Suppress in-app notifications during quiet hours.
   * Req 56.6: Start/end times with timezone support.
   */
  async setQuietHours(
    userId: string,
    config: IQuietHoursConfig,
  ): Promise<void> {
    // Validate HH:mm format
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(config.startTime) || !timeRegex.test(config.endTime)) {
      throw new NotificationServiceError(
        NotificationErrorCode.InvalidQuietHoursConfig,
        'startTime and endTime must be in HH:mm format',
      );
    }

    // Validate timezone is non-empty
    if (!config.timezone || config.timezone.trim().length === 0) {
      throw new NotificationServiceError(
        NotificationErrorCode.InvalidQuietHoursConfig,
        'timezone is required',
      );
    }

    // Get or create preferences, then update quiet hours
    await this.getOrCreateDefaultPreferences(userId);

    const now = new Date().toISOString();
    await this.preferencesCollection
      .updateOne(
        { userId } as Partial<NotificationPreferencesRecord>,
        {
          quietHours: config as unknown as Record<string, unknown>,
          updatedAt: now,
        } as Partial<NotificationPreferencesRecord>,
      )
      .exec();
  }

  /**
   * Set Do Not Disturb configuration.
   * Req 56.7: DND suppresses all non-critical notifications.
   * Req 56.8: Duration options (1h, 8h, 24h, until manually disabled).
   * Req 56.9: Critical system notifications still delivered during DND.
   */
  async setDoNotDisturb(
    userId: string,
    config: IDoNotDisturbConfig,
  ): Promise<void> {
    // Calculate expiresAt from duration if provided
    const resolvedConfig: IDoNotDisturbConfig = { ...config };

    if (config.enabled && config.duration && !config.expiresAt) {
      const now = new Date();
      const durationMs = this.parseDurationToMs(config.duration);
      if (durationMs > 0) {
        resolvedConfig.expiresAt = new Date(
          now.getTime() + durationMs,
        ).toISOString();
      }
      // Permanent duration: no expiresAt
    }

    // Get or create preferences, then update DND config
    await this.getOrCreateDefaultPreferences(userId);

    const now = new Date().toISOString();
    await this.preferencesCollection
      .updateOne(
        { userId } as Partial<NotificationPreferencesRecord>,
        {
          dndConfig: resolvedConfig as unknown as Record<string, unknown>,
          updatedAt: now,
        } as Partial<NotificationPreferencesRecord>,
      )
      .exec();
  }

  /**
   * Convert a MuteDuration to milliseconds.
   * Returns 0 for Permanent (no expiration).
   */
  private parseDurationToMs(duration: MuteDuration): number {
    switch (duration) {
      case MuteDuration.OneHour:
        return 60 * 60 * 1000;
      case MuteDuration.EightHours:
        return 8 * 60 * 60 * 1000;
      case MuteDuration.TwentyFourHours:
        return 24 * 60 * 60 * 1000;
      case MuteDuration.SevenDays:
        return 7 * 24 * 60 * 60 * 1000;
      case MuteDuration.ThirtyDays:
        return 30 * 24 * 60 * 60 * 1000;
      case MuteDuration.Permanent:
        return 0;
      default:
        return 0;
    }
  }

  // ═══════════════════════════════════════════════════════
  // Grouping (Req 55.6-55.9)
  // ═══════════════════════════════════════════════════════

  /**
   * Group notifications by type and target within the grouping window (1 hour).
   *
   * Req 55.6: Same action on same content within 1 hour → single grouped notification
   * Req 55.7: Grouped notification displays count and list of actors
   * Req 55.8: Individual actors with timestamps available via notificationIds
   * Req 55.9: Supports ungrouping via skipGrouping flag (preference-driven)
   *
   * @param notifications - Array of notifications to group
   * @param skipGrouping  - When true, each notification becomes its own group (Req 55.9)
   * @returns Array of notification groups
   */
  async groupNotifications(
    notifications: IBaseNotification<string>[],
    skipGrouping?: boolean,
  ): Promise<IBaseNotificationGroup<string>[]> {
    if (notifications.length === 0) {
      return [];
    }

    // Req 55.9: If ungrouping is preferred, return each notification as its own group
    if (skipGrouping) {
      return notifications.map((n) => ({
        _id: randomUUID(),
        groupKey: `${n.type}:${n.targetId ?? n._id}`,
        notificationIds: [n._id],
        actorIds: [n.actorId],
        count: 1,
        latestAt: n.createdAt,
      }));
    }

    // Sort notifications by createdAt ascending so we process oldest first
    const sorted = [...notifications].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    // Build groups keyed by type:targetId.
    // Within each key, we may have multiple time-window clusters.
    const groupClusters = new Map<
      string,
      Array<{
        notificationIds: string[];
        actorIds: Set<string>;
        earliestAt: number;
        latestAt: number;
      }>
    >();

    for (const notification of sorted) {
      const groupKey = `${notification.type}:${notification.targetId ?? notification._id}`;
      const createdAtMs = new Date(notification.createdAt).getTime();

      if (!groupClusters.has(groupKey)) {
        groupClusters.set(groupKey, []);
      }

      const clusters = groupClusters.get(groupKey)!;

      // Try to find an existing cluster where this notification fits
      // (within NOTIFICATION_GROUPING_WINDOW_MS of the cluster's earliest notification)
      let addedToCluster = false;
      for (const cluster of clusters) {
        if (
          createdAtMs - cluster.earliestAt <
          NOTIFICATION_GROUPING_WINDOW_MS
        ) {
          cluster.notificationIds.push(notification._id);
          cluster.actorIds.add(notification.actorId);
          if (createdAtMs > cluster.latestAt) {
            cluster.latestAt = createdAtMs;
          }
          addedToCluster = true;
          break;
        }
      }

      // No matching cluster found — start a new one
      if (!addedToCluster) {
        clusters.push({
          notificationIds: [notification._id],
          actorIds: new Set([notification.actorId]),
          earliestAt: createdAtMs,
          latestAt: createdAtMs,
        });
      }
    }

    // Convert clusters to IBaseNotificationGroup<string>
    const groups: IBaseNotificationGroup<string>[] = [];

    for (const [groupKey, clusters] of groupClusters) {
      for (const cluster of clusters) {
        groups.push({
          _id: randomUUID(),
          groupKey,
          notificationIds: cluster.notificationIds,
          actorIds: Array.from(cluster.actorIds),
          count: cluster.notificationIds.length,
          latestAt: new Date(cluster.latestAt).toISOString(),
        });
      }
    }

    // Sort groups by latestAt descending (most recent first)
    groups.sort(
      (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime(),
    );

    return groups;
  }

  // ═══════════════════════════════════════════════════════
  // Real-time (Req 52.4, 52.5) — Task 20
  // ═══════════════════════════════════════════════════════

  private wsHandler: {
    broadcastNotification(notification: IBaseNotification<string>): void;
    broadcastNotificationRead(userId: string, notificationId: string): void;
    broadcastNotificationDeleted(userId: string, notificationId: string): void;
    broadcastNotificationCount(userId: string, unreadCount: number): void;
  } | null = null;

  /**
   * Late-bind the WebSocket handler for real-time notification delivery.
   * Called after both NotificationService and BrightHubWebSocketHandler are created.
   */
  setWebSocketHandler(handler: NonNullable<typeof this.wsHandler>): void {
    this.wsHandler = handler;
  }

  subscribeToNotifications(
    _userId: string,
    _callback: (notification: IBaseNotification<string>) => void,
  ): () => void {
    // Real-time subscriptions are handled by BrightHubWebSocketHandler
    // via room-based pub/sub on ClientWebSocketServer.
    // This method is kept for interface compatibility.
    return () => {
      /* unsubscribe is handled by WebSocket disconnect */
    };
  }

  async broadcastNotification(
    notification: IBaseNotification<string>,
  ): Promise<void> {
    if (this.wsHandler) {
      this.wsHandler.broadcastNotification(notification);
      // Also send updated unread count
      const count = await this.getUnreadCount(notification.recipientId);
      this.wsHandler.broadcastNotificationCount(
        notification.recipientId,
        count,
      );
    }
  }

  /**
   * Generate reconnect reminder notifications for users who haven't
   * interacted with a connection in a specified period.
   * Intended to be called by a scheduled job (cron, setInterval, etc.)
   *
   * @param inactiveDays Number of days of inactivity before sending a reminder
   * @returns Number of reminders sent
   */
  async generateReconnectReminders(inactiveDays = 30): Promise<number> {
    // Get all connection metadata records
    const allMetadata = await this.connectionMetadataCollection
      .find({} as Partial<ConnectionMetadataRecord>)
      .exec();

    const cutoff = new Date(Date.now() - inactiveDays * 86400000).toISOString();
    let sentCount = 0;

    for (const meta of allMetadata) {
      // Skip if last interaction is recent
      if (meta.updatedAt > cutoff) continue;
      // Skip muted/quiet connections
      if (meta.isQuiet) continue;

      try {
        await this.createNotification(
          meta.userId,
          NotificationType.ReconnectReminder,
          meta.connectionId,
          {
            content: `You haven't interacted with this connection in ${inactiveDays} days`,
          },
        );
        sentCount++;
      } catch {
        // Skip failures (e.g., DND active)
      }
    }

    return sentCount;
  }

  /**
   * Create a system alert notification for a specific user.
   * Used by admin tools for account-related alerts.
   */
  async createSystemAlert(
    recipientId: string,
    type:
      | typeof NotificationType.SystemAlert
      | typeof NotificationType.SecurityAlert
      | typeof NotificationType.FeatureAnnouncement,
    content: string,
  ): Promise<IBaseNotification<string> | null> {
    return this.createNotification(recipientId, type, 'system', {
      content,
    });
  }
}

// ═══════════════════════════════════════════════════════
// Factory function
// ═══════════════════════════════════════════════════════

/**
 * Create a new NotificationService instance
 * @param application Application with database collections
 * @returns NotificationService instance
 */
export function createNotificationService(
  application: IApplicationWithCollections,
): NotificationService {
  return new NotificationService(application);
}
