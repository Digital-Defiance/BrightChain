/**
 * CalendarEvent BrightDb Model
 *
 * Defines the stored/typed interfaces, hydration schema, collection schema,
 * and factory function for the calendar_events collection.
 *
 * The full event body is stored encrypted in the block store. This collection
 * holds searchable metadata (the "metadata index").
 *
 * @see Requirements 4.1, 4.8, 15.1
 */

import {
  EventTransparency,
  EventVisibility,
  type IRecurrenceRule,
} from '@brightchain/brightcal-lib';
import type { IHydrationSchema } from '@brightchain/brightchain-lib';
import type { BrightDb, BsonDocument, CollectionSchema } from '@brightchain/db';
import { Model } from '@brightchain/db';

// ─── Collection name ─────────────────────────────────────────────────────────

export const CALENDAR_EVENTS_COLLECTION = 'calendar_events';

// ─── Stored interface (block storage form — all primitives/strings) ──────────

export interface IStoredCalendarEvent extends BsonDocument {
  _id: string;
  calendarId: string;
  uid: string;
  sequence: number;
  dtstart: string;
  dtend: string;
  dtstartTzid: string;
  dtendTzid: string;
  allDay: boolean;
  visibility: string;
  transparency: string;
  status: string;
  organizerId: string;
  isRecurring: boolean;
  /**
   * AES-256-GCM encrypted JSON blob containing sensitive event fields:
   * summary, attendeeIds, rrule, exdates, rdates, recurrenceId, parentEventId.
   * Encrypted with the calendar's encryptionKey.
   */
  encryptedBody: string;
  /** Content-addressable block ID: SHA3-512 of encryptedBody. */
  blockId: string;
  dateCreated: string;
  dateModified: string;
  /** Plaintext search index derived from summary+description+location (searchability tradeoff). */
  searchText: string;
}

// ─── Typed interface (application form) ──────────────────────────────────────

export interface ITypedCalendarEvent {
  id: string;
  calendarId: string;
  uid: string;
  sequence: number;
  /** Populated after decrypting encryptedBody; empty string until decrypted. */
  summary: string;
  dtstart: Date;
  dtend: Date;
  dtstartTzid: string;
  dtendTzid: string;
  allDay: boolean;
  visibility: EventVisibility;
  transparency: EventTransparency;
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  organizerId: string;
  /** Populated after decrypting encryptedBody; empty array until decrypted. */
  attendeeIds: string[];
  isRecurring: boolean;
  /** Populated after decrypting encryptedBody. */
  rrule?: IRecurrenceRule;
  /** Populated after decrypting encryptedBody. */
  exdates?: Date[];
  /** Populated after decrypting encryptedBody. */
  rdates?: Date[];
  /** Populated after decrypting encryptedBody. */
  recurrenceId?: Date;
  /** Populated after decrypting encryptedBody. */
  parentEventId?: string;
  /** Content-addressable block ID: SHA3-512 of encryptedBody. */
  blockId: string;
  /** AES-256-GCM encrypted JSON blob of sensitive fields. Set by service layer. */
  encryptedBody: string;
  dateCreated: Date;
  dateModified: Date;
  searchText: string;
}

// ─── Hydration schema ────────────────────────────────────────────────────────

export const calendarEventHydration: IHydrationSchema<
  IStoredCalendarEvent,
  ITypedCalendarEvent
> = {
  hydrate: (stored: IStoredCalendarEvent): ITypedCalendarEvent => ({
    id: stored._id as string,
    calendarId: stored.calendarId,
    uid: stored.uid,
    sequence: stored.sequence,
    // Sensitive fields are encrypted; service layer must call decryptEventBody().
    summary: '',
    attendeeIds: [],
    rrule: undefined,
    exdates: undefined,
    rdates: undefined,
    recurrenceId: undefined,
    parentEventId: undefined,
    dtstart: new Date(stored.dtstart),
    dtend: new Date(stored.dtend),
    dtstartTzid: stored.dtstartTzid,
    dtendTzid: stored.dtendTzid,
    allDay: stored.allDay,
    visibility: stored.visibility as EventVisibility,
    transparency: stored.transparency as EventTransparency,
    status: stored.status as 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED',
    organizerId: stored.organizerId,
    isRecurring: stored.isRecurring,
    blockId: stored.blockId,
    encryptedBody: stored.encryptedBody,
    dateCreated: new Date(stored.dateCreated),
    dateModified: new Date(stored.dateModified),
    searchText: stored.searchText,
  }),

  dehydrate: (typed: ITypedCalendarEvent): IStoredCalendarEvent => ({
    _id: typed.id,
    calendarId: typed.calendarId,
    uid: typed.uid,
    sequence: typed.sequence,
    dtstart: typed.dtstart.toISOString(),
    dtend: typed.dtend.toISOString(),
    dtstartTzid: typed.dtstartTzid,
    dtendTzid: typed.dtendTzid,
    allDay: typed.allDay,
    visibility: typed.visibility,
    transparency: typed.transparency,
    status: typed.status,
    organizerId: typed.organizerId,
    isRecurring: typed.isRecurring,
    blockId: typed.blockId,
    encryptedBody: typed.encryptedBody,
    dateCreated: typed.dateCreated.toISOString(),
    dateModified: typed.dateModified.toISOString(),
    searchText: typed.searchText,
  }),
};

// ─── Collection schema (validation + indexes) ────────────────────────────────

export const CALENDAR_EVENT_SCHEMA: CollectionSchema = {
  name: CALENDAR_EVENTS_COLLECTION,
  properties: {
    _id: { type: 'string' },
    calendarId: { type: 'string', required: true, minLength: 1 },
    uid: { type: 'string', required: true, minLength: 1 },
    sequence: { type: 'number', required: true, minimum: 0 },
    dtstart: { type: 'string', required: true },
    dtend: { type: 'string', required: true },
    dtstartTzid: { type: 'string', required: true, minLength: 1 },
    dtendTzid: { type: 'string', required: true },
    allDay: { type: 'boolean', required: true },
    visibility: {
      type: 'string',
      required: true,
      enum: Object.values(EventVisibility),
    },
    transparency: {
      type: 'string',
      required: true,
      enum: Object.values(EventTransparency),
    },
    status: {
      type: 'string',
      required: true,
      enum: ['CONFIRMED', 'TENTATIVE', 'CANCELLED'],
    },
    organizerId: { type: 'string', required: true, minLength: 1 },
    isRecurring: { type: 'boolean', required: true },
    encryptedBody: { type: 'string', required: true, minLength: 1 },
    blockId: { type: 'string', required: true, minLength: 1 },
    dateCreated: { type: 'string', required: true },
    dateModified: { type: 'string', required: true },
    searchText: { type: 'string', required: true },
  },
  required: [
    'calendarId',
    'uid',
    'sequence',
    'dtstart',
    'dtend',
    'dtstartTzid',
    'dtendTzid',
    'allDay',
    'visibility',
    'transparency',
    'status',
    'organizerId',
    'isRecurring',
    'encryptedBody',
    'blockId',
    'dateCreated',
    'dateModified',
    'searchText',
  ],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Range queries: events by calendar within a time window
    { fields: { calendarId: 1, dtstart: 1, dtend: 1 } },
    // Events by organizer
    { fields: { organizerId: 1 } },
    // Unique event lookup by UID
    { fields: { uid: 1 }, options: { unique: true } },
    // Full-text search on searchText
    { fields: { searchText: 'text' } },
  ],
};

// ─── Model factory ───────────────────────────────────────────────────────────

/**
 * Create a CalendarEvent Model from a BrightDb instance.
 *
 * @example
 * ```typescript
 * const eventModel = createCalendarEventModel(db);
 * const events = await eventModel.find({ calendarId: calId }).toArray();
 * ```
 */
export function createCalendarEventModel(
  db: BrightDb,
): Model<IStoredCalendarEvent, ITypedCalendarEvent> {
  const collection = db.collection<IStoredCalendarEvent>(
    CALENDAR_EVENTS_COLLECTION,
  );
  return new Model(collection, {
    schema: CALENDAR_EVENT_SCHEMA,
    hydration: calendarEventHydration,
    collectionName: CALENDAR_EVENTS_COLLECTION,
  });
}
