/**
 * CalendarReminder BrightDb Model
 *
 * Defines the stored/typed interfaces, hydration schema, collection schema,
 * and factory function for the calendar_reminders collection.
 *
 * @see Requirements 14.1, 14.4
 */

import type { IHydrationSchema } from '@brightchain/brightchain-lib';
import type { BrightDb, BsonDocument, CollectionSchema } from '@brightchain/db';
import { Model } from '@brightchain/db';

// ─── Collection name ─────────────────────────────────────────────────────────

export const CALENDAR_REMINDERS_COLLECTION = 'calendar_reminders';

// ─── Stored interface (block storage form — all primitives/strings) ──────────

export interface IStoredCalendarReminder extends BsonDocument {
  _id: string;
  eventId: string;
  userId: string;
  triggerAt: string;
  channels: string[];
  delivered: boolean;
  dateCreated: string;
}

// ─── Typed interface (application form) ──────────────────────────────────────

export interface ITypedCalendarReminder {
  id: string;
  eventId: string;
  userId: string;
  triggerAt: Date;
  channels: ('email' | 'push')[];
  delivered: boolean;
  dateCreated: Date;
}

// ─── Hydration schema ────────────────────────────────────────────────────────

export const calendarReminderHydration: IHydrationSchema<
  IStoredCalendarReminder,
  ITypedCalendarReminder
> = {
  hydrate: (stored: IStoredCalendarReminder): ITypedCalendarReminder => ({
    id: stored._id as string,
    eventId: stored.eventId,
    userId: stored.userId,
    triggerAt: new Date(stored.triggerAt),
    channels: stored.channels as ('email' | 'push')[],
    delivered: stored.delivered,
    dateCreated: new Date(stored.dateCreated),
  }),

  dehydrate: (typed: ITypedCalendarReminder): IStoredCalendarReminder => ({
    _id: typed.id,
    eventId: typed.eventId,
    userId: typed.userId,
    triggerAt: typed.triggerAt.toISOString(),
    channels: typed.channels,
    delivered: typed.delivered,
    dateCreated: typed.dateCreated.toISOString(),
  }),
};

// ─── Collection schema (validation + indexes) ────────────────────────────────

export const CALENDAR_REMINDER_SCHEMA: CollectionSchema = {
  name: CALENDAR_REMINDERS_COLLECTION,
  properties: {
    _id: { type: 'string' },
    eventId: { type: 'string', required: true, minLength: 1 },
    userId: { type: 'string', required: true, minLength: 1 },
    triggerAt: { type: 'string', required: true },
    channels: { type: 'array', required: true },
    delivered: { type: 'boolean', required: true },
    dateCreated: { type: 'string', required: true },
  },
  required: [
    'eventId',
    'userId',
    'triggerAt',
    'channels',
    'delivered',
    'dateCreated',
  ],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Polling for due reminders
    { fields: { triggerAt: 1, delivered: 1 } },
    // Find reminders for an event (for cancellation)
    { fields: { eventId: 1 } },
    // Find reminders for a user
    { fields: { userId: 1 } },
  ],
};

// ─── Model factory ───────────────────────────────────────────────────────────

/**
 * Create a CalendarReminder Model from a BrightDb instance.
 *
 * @example
 * ```typescript
 * const reminderModel = createCalendarReminderModel(db);
 * const due = await reminderModel.find({ triggerAt: { $lte: now }, delivered: false }).toArray();
 * ```
 */
export function createCalendarReminderModel(
  db: BrightDb,
): Model<IStoredCalendarReminder, ITypedCalendarReminder> {
  const collection = db.collection<IStoredCalendarReminder>(
    CALENDAR_REMINDERS_COLLECTION,
  );
  return new Model(collection, {
    schema: CALENDAR_REMINDER_SCHEMA,
    hydration: calendarReminderHydration,
    collectionName: CALENDAR_REMINDERS_COLLECTION,
  });
}
