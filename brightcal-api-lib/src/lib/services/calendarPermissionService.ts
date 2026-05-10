/**
 * CalendarPermissionService
 *
 * Manages calendar sharing, public link generation, and permission enforcement.
 * All share/revoke operations verify the requesting user is the calendar owner.
 *
 * @see Requirements 6.1, 6.2, 6.3, 6.4, 6.9
 */

import { CalendarPermissionLevel } from '@brightchain/brightcal-lib';
import type { Model } from '@brightchain/db';
import { randomUUID } from 'crypto';
import type {
  IStoredCalendarCollection,
  ITypedCalendarCollection,
} from '../models/calendarCollection.model.js';
import type {
  IStoredCalendarShare,
  ITypedCalendarShare,
} from '../models/calendarShare.model.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const PUBLIC_LINK_BASE = 'https://cal.brightchain.org/public/';

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * CalendarPermissionService handles calendar sharing, public link generation,
 * and permission-level enforcement. It delegates storage to BrightDb Models.
 *
 * @requirements 6.1, 6.2, 6.3, 6.4, 6.9
 */
export class CalendarPermissionService {
  private readonly calendarCollectionModel: Model<
    IStoredCalendarCollection,
    ITypedCalendarCollection
  >;
  private readonly calendarShareModel: Model<
    IStoredCalendarShare,
    ITypedCalendarShare
  >;
  constructor(
    calendarCollectionModel: Model<
      IStoredCalendarCollection,
      ITypedCalendarCollection
    >,
    calendarShareModel: Model<IStoredCalendarShare, ITypedCalendarShare>,
  ) {
    this.calendarCollectionModel = calendarCollectionModel;
    this.calendarShareModel = calendarShareModel;
  }

  // ── Share operations ────────────────────────────────────────────────────

  /**
   * Share a calendar with a specific user at a given permission level.
   * Only the calendar owner may share.
   *
   * @throws Error('FORBIDDEN') if the requesting user is not the owner
   * @throws Error('NOT_FOUND') if the calendar does not exist
   * @requirements 6.2
   */
  async shareCalendar(
    calendarId: string,
    ownerId: string,
    grantedToUserId: string,
    permission: CalendarPermissionLevel,
  ): Promise<ITypedCalendarShare> {
    await this.assertOwner(calendarId, ownerId);

    const now = new Date();
    const share: ITypedCalendarShare = {
      id: randomUUID().replace(/-/g, ''),
      calendarId,
      grantedToUserId,
      permission,
      dateCreated: now,
    };

    await this.calendarShareModel.insertOne(share);
    return share;
  }

  /**
   * Share a calendar with a group at a given permission level.
   * Only the calendar owner may share.
   *
   * @throws Error('FORBIDDEN') if the requesting user is not the owner
   * @throws Error('NOT_FOUND') if the calendar does not exist
   * @requirements 6.2
   */
  async shareCalendarWithGroup(
    calendarId: string,
    ownerId: string,
    grantedToGroupId: string,
    permission: CalendarPermissionLevel,
  ): Promise<ITypedCalendarShare> {
    await this.assertOwner(calendarId, ownerId);

    const now = new Date();
    const share: ITypedCalendarShare = {
      id: randomUUID().replace(/-/g, ''),
      calendarId,
      grantedToGroupId,
      permission,
      dateCreated: now,
    };

    await this.calendarShareModel.insertOne(share);
    return share;
  }

  // ── Revoke operations ──────────────────────────────────────────────────

  /**
   * Revoke a specific share by its ID.
   * Only the calendar owner may revoke.
   *
   * @returns true if the share was found and deleted, false otherwise
   * @throws Error('FORBIDDEN') if the requesting user is not the owner
   * @throws Error('NOT_FOUND') if the calendar does not exist
   * @requirements 6.3
   */
  async revokeShare(
    calendarId: string,
    ownerId: string,
    shareId: string,
  ): Promise<boolean> {
    await this.assertOwner(calendarId, ownerId);

    const share = await this.calendarShareModel.findOne({
      _id: shareId,
      calendarId,
    } as Partial<IStoredCalendarShare>);

    if (!share) {
      return false;
    }

    await this.calendarShareModel.deleteOne({
      _id: shareId,
    } as Partial<IStoredCalendarShare>);

    return true;
  }

  /**
   * Revoke all shares for a specific user on a calendar.
   * Only the calendar owner may revoke.
   *
   * @returns true if any shares were revoked, false otherwise
   * @throws Error('FORBIDDEN') if the requesting user is not the owner
   * @throws Error('NOT_FOUND') if the calendar does not exist
   * @requirements 6.3
   */
  async revokeUserAccess(
    calendarId: string,
    ownerId: string,
    userId: string,
  ): Promise<boolean> {
    await this.assertOwner(calendarId, ownerId);

    const shares = await this.calendarShareModel
      .find({
        calendarId,
        grantedToUserId: userId,
      } as Partial<IStoredCalendarShare>)
      .toArray();

    if (shares.length === 0) {
      return false;
    }

    await this.calendarShareModel.deleteMany({
      calendarId,
      grantedToUserId: userId,
    } as Partial<IStoredCalendarShare>);

    return true;
  }

  // ── Public link operations ─────────────────────────────────────────────

  /**
   * Generate a public sharing link for a calendar.
   * Only viewer or freebusy permissions are allowed for public links.
   * Replaces any existing public link for the calendar.
   *
   * @throws Error('FORBIDDEN') if the requesting user is not the owner
   * @throws Error('NOT_FOUND') if the calendar does not exist
   * @throws Error('INVALID_PERMISSION') if permission is not Viewer or FreeBusyOnly
   * @requirements 6.4
   */
  async generatePublicLink(
    calendarId: string,
    ownerId: string,
    permission: CalendarPermissionLevel,
  ): Promise<ITypedCalendarShare> {
    await this.assertOwner(calendarId, ownerId);

    if (
      permission !== CalendarPermissionLevel.Viewer &&
      permission !== CalendarPermissionLevel.FreeBusyOnly
    ) {
      throw new Error('INVALID_PERMISSION');
    }

    // Remove any existing public link share for this calendar
    const existingPublicShares = await this.calendarShareModel
      .find({ calendarId } as Partial<IStoredCalendarShare>)
      .toArray();

    for (const existing of existingPublicShares) {
      if (existing.publicLink) {
        await this.calendarShareModel.deleteOne({
          _id: existing.id,
        } as Partial<IStoredCalendarShare>);
      }
    }

    const linkId = randomUUID();
    const now = new Date();
    const share: ITypedCalendarShare = {
      id: randomUUID().replace(/-/g, ''),
      calendarId,
      permission,
      publicLink: `${PUBLIC_LINK_BASE}${linkId}`,
      dateCreated: now,
    };

    await this.calendarShareModel.insertOne(share);
    return share;
  }

  /**
   * Revoke the public link for a calendar.
   * Only the calendar owner may revoke.
   *
   * @returns true if a public link was found and revoked, false otherwise
   * @throws Error('FORBIDDEN') if the requesting user is not the owner
   * @throws Error('NOT_FOUND') if the calendar does not exist
   * @requirements 6.4
   */
  async revokePublicLink(
    calendarId: string,
    ownerId: string,
  ): Promise<boolean> {
    await this.assertOwner(calendarId, ownerId);

    const shares = await this.calendarShareModel
      .find({ calendarId } as Partial<IStoredCalendarShare>)
      .toArray();

    let revoked = false;
    for (const share of shares) {
      if (share.publicLink) {
        await this.calendarShareModel.deleteOne({
          _id: share.id,
        } as Partial<IStoredCalendarShare>);
        revoked = true;
      }
    }

    return revoked;
  }

  // ── Permission queries ─────────────────────────────────────────────────

  /**
   * Get the effective permission level for a user on a calendar.
   * Returns Owner if they own it, otherwise checks shares.
   * Returns null if the user has no access.
   *
   * @requirements 6.1
   */
  async getPermissionForUser(
    calendarId: string,
    userId: string,
  ): Promise<CalendarPermissionLevel | null> {
    const calendar = await this.calendarCollectionModel.findOne({
      _id: calendarId,
    } as Partial<IStoredCalendarCollection>);

    if (!calendar) {
      return null;
    }

    if (calendar.ownerId === userId) {
      return CalendarPermissionLevel.Owner;
    }

    const share = await this.calendarShareModel.findOne({
      calendarId,
      grantedToUserId: userId,
    } as Partial<IStoredCalendarShare>);

    if (!share) {
      return null;
    }

    return share.permission;
  }

  /**
   * Get all calendar IDs that a user has access to (owned + shared).
   * Used by SearchService to scope searches to accessible calendars.
   *
   * @requirements 15.1, 15.2
   */
  async getAccessibleCalendarIds(userId: string): Promise<string[]> {
    // 1. Owned calendars
    const owned = await this.calendarCollectionModel
      .find({ ownerId: userId } as Partial<IStoredCalendarCollection>)
      .toArray();

    const calendarIds = owned.map((cal) => cal.id);

    // 2. Shared calendars
    const shares = await this.calendarShareModel
      .find({
        grantedToUserId: userId,
      } as Partial<IStoredCalendarShare>)
      .toArray();

    for (const share of shares) {
      if (!calendarIds.includes(share.calendarId)) {
        calendarIds.push(share.calendarId);
      }
    }

    return calendarIds;
  }

  /**
   * List all shares for a calendar. Only the owner can view shares.
   *
   * @throws Error('FORBIDDEN') if the requesting user is not the owner
   * @throws Error('NOT_FOUND') if the calendar does not exist
   * @requirements 6.2
   */
  async getSharesForCalendar(
    calendarId: string,
    ownerId: string,
  ): Promise<ITypedCalendarShare[]> {
    await this.assertOwner(calendarId, ownerId);

    return this.calendarShareModel
      .find({ calendarId } as Partial<IStoredCalendarShare>)
      .toArray();
  }

  /**
   * Set the default permission level for new shares on a calendar.
   * Only the calendar owner may change this.
   *
   * @throws Error('FORBIDDEN') if the requesting user is not the owner
   * @throws Error('NOT_FOUND') if the calendar does not exist
   * @requirements 6.9
   */
  async setDefaultPermission(
    calendarId: string,
    ownerId: string,
    permission: CalendarPermissionLevel,
  ): Promise<void> {
    await this.assertOwner(calendarId, ownerId);

    await this.calendarCollectionModel.updateOne(
      { _id: calendarId } as Partial<IStoredCalendarCollection>,
      {
        $set: {
          defaultPermission: permission,
          dateModified: new Date().toISOString(),
        } as Partial<IStoredCalendarCollection>,
      },
    );
  }

  // ── Private helpers ────────────────────────────────────────────────────

  /**
   * Assert that the given user is the owner of the calendar.
   * @throws Error('NOT_FOUND') if the calendar does not exist
   * @throws Error('FORBIDDEN') if the user is not the owner
   */
  private async assertOwner(
    calendarId: string,
    userId: string,
  ): Promise<ITypedCalendarCollection> {
    const calendar = await this.calendarCollectionModel.findOne({
      _id: calendarId,
    } as Partial<IStoredCalendarCollection>);

    if (!calendar) {
      throw new Error('NOT_FOUND');
    }

    if (calendar.ownerId !== userId) {
      throw new Error('FORBIDDEN');
    }

    return calendar;
  }
}
