/**
 * CalendarEngineService
 *
 * Core service for calendar collection CRUD operations with permission checks,
 * default calendar creation, and ICS feed subscription management.
 *
 * Implements the ICalendarEngineService interface consumed by CalendarController.
 *
 * @see Requirements 3.4, 3.6, 3.7
 */

import { CalendarPermissionLevel } from '@brightchain/brightcal-lib';
import type { Model } from '@brightchain/db';
import { randomUUID } from 'crypto';
import type {
  ICalendarEngineService,
  IUpdateCalendarBody,
} from '../controllers/calendarController.js';
import type {
  IStoredCalendarCollection,
  ITypedCalendarCollection,
} from '../models/calendarCollection.model.js';
import type {
  IStoredCalendarShare,
  ITypedCalendarShare,
} from '../models/calendarShare.model.js';
import type { IEncryptionService } from './encryptionService.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_CALENDAR_NAME = 'Personal';
const DEFAULT_CALENDAR_COLOR = '#4285F4';

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * CalendarEngineService handles calendar collection persistence and
 * permission-aware access. It delegates storage to BrightDb Models.
 *
 * @requirements 3.4, 3.6, 3.7
 */
export class CalendarEngineService implements ICalendarEngineService {
  private readonly calendarCollectionModel: Model<
    IStoredCalendarCollection,
    ITypedCalendarCollection
  >;
  private readonly calendarShareModel: Model<
    IStoredCalendarShare,
    ITypedCalendarShare
  >;
  private readonly encryptionService: IEncryptionService;

  constructor(
    calendarCollectionModel: Model<
      IStoredCalendarCollection,
      ITypedCalendarCollection
    >,
    calendarShareModel: Model<IStoredCalendarShare, ITypedCalendarShare>,
    encryptionService: IEncryptionService,
  ) {
    this.calendarCollectionModel = calendarCollectionModel;
    this.calendarShareModel = calendarShareModel;
    this.encryptionService = encryptionService;
  }

  // ── Interface methods ───────────────────────────────────────────────────

  /**
   * Create a new calendar collection owned by the given user.
   *
   * @requirements 3.1
   */
  async createCalendar(
    ownerId: string,
    displayName: string,
    color: string,
    description: string,
  ): Promise<ITypedCalendarCollection> {
    const now = new Date();
    const calendar: ITypedCalendarCollection = {
      id: randomUUID().replace(/-/g, ''),
      ownerId,
      displayName,
      color,
      description,
      isDefault: false,
      isSubscription: false,
      defaultPermission: CalendarPermissionLevel.Viewer,
      encryptionKey: this.encryptionService.generateKey(),
      dateCreated: now,
      dateModified: now,
    };

    await this.calendarCollectionModel.insertOne(calendar);
    return calendar;
  }

  /**
   * List all calendars the user owns plus calendars shared with them,
   * each annotated with the user's permission level.
   *
   * @requirements 3.5
   */
  async listCalendarsForUser(
    userId: string,
  ): Promise<
    Array<ITypedCalendarCollection & { permission: CalendarPermissionLevel }>
  > {
    // 1. Owned calendars — owner always has Owner permission
    const owned = await this.calendarCollectionModel
      .find({ ownerId: userId } as Partial<IStoredCalendarCollection>)
      .toArray();

    const results: Array<
      ITypedCalendarCollection & { permission: CalendarPermissionLevel }
    > = owned.map((cal) => ({
      ...cal,
      permission: CalendarPermissionLevel.Owner,
    }));

    // 2. Shared calendars — look up shares granted to this user
    const shares = await this.calendarShareModel
      .find({
        grantedToUserId: userId,
      } as Partial<IStoredCalendarShare>)
      .toArray();

    for (const share of shares) {
      // Skip if user already owns this calendar
      if (results.some((r) => r.id === share.calendarId)) {
        continue;
      }

      const calendar = await this.calendarCollectionModel.findOne({
        _id: share.calendarId,
      } as Partial<IStoredCalendarCollection>);

      if (calendar) {
        results.push({
          ...calendar,
          permission: share.permission,
        });
      }
    }

    return results;
  }

  /**
   * Get a single calendar by ID, returning it with the requesting user's
   * permission level. Returns null if the calendar doesn't exist or the
   * user has no access.
   *
   * @requirements 3.5
   */
  async getCalendarById(
    calendarId: string,
    userId: string,
  ): Promise<{
    calendar: ITypedCalendarCollection;
    permission: CalendarPermissionLevel;
  } | null> {
    const calendar = await this.calendarCollectionModel.findOne({
      _id: calendarId,
    } as Partial<IStoredCalendarCollection>);

    if (!calendar) {
      return null;
    }

    // Owner check
    if (calendar.ownerId === userId) {
      return { calendar, permission: CalendarPermissionLevel.Owner };
    }

    // Share check
    const share = await this.calendarShareModel.findOne({
      calendarId,
      grantedToUserId: userId,
    } as Partial<IStoredCalendarShare>);

    if (!share) {
      return null;
    }

    return { calendar, permission: share.permission };
  }

  /**
   * Update a calendar's mutable fields. Only the owner may update.
   * Throws an Error with message 'FORBIDDEN' if the user is not the owner.
   * Returns null if the calendar doesn't exist.
   *
   * @requirements 3.2
   */
  async updateCalendar(
    calendarId: string,
    userId: string,
    updates: IUpdateCalendarBody,
  ): Promise<ITypedCalendarCollection | null> {
    const calendar = await this.calendarCollectionModel.findOne({
      _id: calendarId,
    } as Partial<IStoredCalendarCollection>);

    if (!calendar) {
      return null;
    }

    if (calendar.ownerId !== userId) {
      throw new Error('FORBIDDEN');
    }

    // Build the $set payload in stored-field terms
    const setFields: Partial<IStoredCalendarCollection> = {
      dateModified: new Date().toISOString(),
    };

    if (updates.displayName !== undefined) {
      setFields.displayName = updates.displayName;
    }
    if (updates.color !== undefined) {
      setFields.color = updates.color;
    }
    if (updates.description !== undefined) {
      setFields.description = updates.description;
    }

    await this.calendarCollectionModel.updateOne(
      { _id: calendarId } as Partial<IStoredCalendarCollection>,
      { $set: setFields },
    );

    // Return the updated document
    return this.calendarCollectionModel.findOne({
      _id: calendarId,
    } as Partial<IStoredCalendarCollection>) as Promise<ITypedCalendarCollection>;
  }

  /**
   * Delete a calendar and all associated shares. Only the owner may delete.
   * Throws an Error with message 'FORBIDDEN' if the user is not the owner.
   * Returns false if the calendar doesn't exist.
   *
   * @requirements 3.3
   */
  async deleteCalendar(calendarId: string, userId: string): Promise<boolean> {
    const calendar = await this.calendarCollectionModel.findOne({
      _id: calendarId,
    } as Partial<IStoredCalendarCollection>);

    if (!calendar) {
      return false;
    }

    if (calendar.ownerId !== userId) {
      throw new Error('FORBIDDEN');
    }

    // Remove all shares for this calendar
    await this.calendarShareModel.deleteMany({
      calendarId,
    } as Partial<IStoredCalendarShare>);

    // Remove the calendar itself
    await this.calendarCollectionModel.deleteOne({
      _id: calendarId,
    } as Partial<IStoredCalendarCollection>);

    return true;
  }

  // ── Additional methods (beyond ICalendarEngineService interface) ─────────

  /**
   * Create the default "Personal" calendar for a newly registered user.
   *
   * @requirements 3.4
   */
  async createDefaultCalendar(
    userId: string,
  ): Promise<ITypedCalendarCollection> {
    const now = new Date();
    const calendar: ITypedCalendarCollection = {
      id: randomUUID().replace(/-/g, ''),
      ownerId: userId,
      displayName: DEFAULT_CALENDAR_NAME,
      color: DEFAULT_CALENDAR_COLOR,
      description: '',
      isDefault: true,
      isSubscription: false,
      defaultPermission: CalendarPermissionLevel.Viewer,
      dateCreated: now,
      dateModified: now,
    };

    await this.calendarCollectionModel.insertOne(calendar);
    return calendar;
  }

  /**
   * Subscribe to an external ICS feed, creating a read-only calendar
   * collection that will be refreshed periodically.
   *
   * @requirements 3.6
   */
  async subscribeToFeed(
    userId: string,
    url: string,
    displayName: string,
    refreshInterval: number,
  ): Promise<ITypedCalendarCollection> {
    const now = new Date();
    const calendar: ITypedCalendarCollection = {
      id: randomUUID().replace(/-/g, ''),
      ownerId: userId,
      displayName,
      color: DEFAULT_CALENDAR_COLOR,
      description: '',
      isDefault: false,
      isSubscription: true,
      subscriptionUrl: url,
      subscriptionRefreshInterval: refreshInterval,
      subscriptionLastRefreshed: now,
      defaultPermission: CalendarPermissionLevel.Viewer,
      dateCreated: now,
      dateModified: now,
    };

    await this.calendarCollectionModel.insertOne(calendar);
    return calendar;
  }

  /**
   * Refresh an ICS feed subscription by updating the last-refreshed timestamp.
   * The actual feed fetching and event merge is handled by IcsSubscriptionService.
   *
   * @requirements 3.7
   */
  async refreshSubscription(calendarId: string): Promise<void> {
    await this.calendarCollectionModel.updateOne(
      { _id: calendarId } as Partial<IStoredCalendarCollection>,
      {
        $set: {
          subscriptionLastRefreshed: new Date().toISOString(),
          dateModified: new Date().toISOString(),
        } as Partial<IStoredCalendarCollection>,
      },
    );
  }
}
