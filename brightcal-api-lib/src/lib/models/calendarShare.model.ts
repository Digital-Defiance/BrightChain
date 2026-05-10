/**
 * CalendarShare BrightDb Model
 *
 * Defines the stored/typed interfaces, hydration schema, collection schema,
 * and factory function for the calendar_shares collection.
 *
 * @see Requirements 6.1, 6.2, 6.3, 6.4
 */

import {
  CalendarPermissionLevel,
  type ICalendarShareDTO,
} from '@brightchain/brightcal-lib';
import type { IHydrationSchema } from '@brightchain/brightchain-lib';
import type { BrightDb, BsonDocument, CollectionSchema } from '@brightchain/db';
import { Model } from '@brightchain/db';

// ─── Collection name ─────────────────────────────────────────────────────────

export const CALENDAR_SHARES_COLLECTION = 'calendar_shares';

// ─── Stored interface (block storage form — all primitives/strings) ──────────

export interface IStoredCalendarShare extends BsonDocument {
  _id: string;
  calendarId: string;
  grantedToUserId?: string;
  grantedToGroupId?: string;
  permission: string;
  publicLink?: string;
  expiresAt?: string;
  dateCreated: string;
}

// ─── Typed interface (application form) ──────────────────────────────────────

export interface ITypedCalendarShare extends ICalendarShareDTO<string, Date> {
  /** Optional expiration time for the share */
  expiresAt?: Date;
}

// ─── Hydration schema ────────────────────────────────────────────────────────

export const calendarShareHydration: IHydrationSchema<
  IStoredCalendarShare,
  ITypedCalendarShare
> = {
  hydrate: (stored: IStoredCalendarShare): ITypedCalendarShare => ({
    id: stored._id as string,
    calendarId: stored.calendarId,
    grantedToUserId: stored.grantedToUserId,
    grantedToGroupId: stored.grantedToGroupId,
    permission: stored.permission as CalendarPermissionLevel,
    publicLink: stored.publicLink,
    expiresAt: stored.expiresAt ? new Date(stored.expiresAt) : undefined,
    dateCreated: new Date(stored.dateCreated),
  }),

  dehydrate: (typed: ITypedCalendarShare): IStoredCalendarShare => ({
    _id: typed.id,
    calendarId: typed.calendarId,
    grantedToUserId: typed.grantedToUserId,
    grantedToGroupId: typed.grantedToGroupId,
    permission: typed.permission,
    publicLink: typed.publicLink,
    expiresAt: typed.expiresAt ? typed.expiresAt.toISOString() : undefined,
    dateCreated: typed.dateCreated.toISOString(),
  }),
};

// ─── Collection schema (validation + indexes) ────────────────────────────────

export const CALENDAR_SHARE_SCHEMA: CollectionSchema = {
  name: CALENDAR_SHARES_COLLECTION,
  properties: {
    _id: { type: 'string' },
    calendarId: { type: 'string', required: true, minLength: 1 },
    grantedToUserId: { type: 'string' },
    grantedToGroupId: { type: 'string' },
    permission: {
      type: 'string',
      required: true,
      enum: Object.values(CalendarPermissionLevel),
    },
    publicLink: { type: 'string' },
    expiresAt: { type: 'string' },
    dateCreated: { type: 'string', required: true },
  },
  required: ['calendarId', 'permission', 'dateCreated'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Find shares for a calendar
    { fields: { calendarId: 1 } },
    // Find calendars shared with a user
    { fields: { grantedToUserId: 1 } },
    // Find calendars shared with a group
    { fields: { grantedToGroupId: 1 } },
    // Lookup by public link (unique, sparse)
    { fields: { publicLink: 1 }, options: { unique: true, sparse: true } },
  ],
};

// ─── Model factory ───────────────────────────────────────────────────────────

/**
 * Create a CalendarShare Model from a BrightDb instance.
 *
 * @example
 * ```typescript
 * const shareModel = createCalendarShareModel(db);
 * const shares = await shareModel.find({ calendarId: calId }).toArray();
 * ```
 */
export function createCalendarShareModel(
  db: BrightDb,
): Model<IStoredCalendarShare, ITypedCalendarShare> {
  const collection = db.collection<IStoredCalendarShare>(
    CALENDAR_SHARES_COLLECTION,
  );
  return new Model(collection, {
    schema: CALENDAR_SHARE_SCHEMA,
    hydration: calendarShareHydration,
    collectionName: CALENDAR_SHARES_COLLECTION,
  });
}
