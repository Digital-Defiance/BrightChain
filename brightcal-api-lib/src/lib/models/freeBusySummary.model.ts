/**
 * FreeBusySummary BrightDb Model
 *
 * Defines the stored/typed interfaces, hydration schema, collection schema,
 * and factory function for the calendar_freebusy collection.
 *
 * Free/busy summaries are stored unencrypted to allow availability queries
 * without decrypting event details.
 *
 * @see Requirements 8.1, 17.5
 */

import type { IFreeBusySlot } from '@brightchain/brightcal-lib';
import type { IHydrationSchema } from '@brightchain/brightchain-lib';
import type { BrightDb, BsonDocument, CollectionSchema } from '@brightchain/db';
import { Model } from '@brightchain/db';

// ─── Collection name ─────────────────────────────────────────────────────────

export const FREE_BUSY_SUMMARIES_COLLECTION = 'calendar_freebusy';

// ─── Stored interface (block storage form — all primitives/strings) ──────────

export interface IStoredFreeBusySummary extends BsonDocument {
  _id: string;
  userId: string;
  date: string; // ISO 8601 date string (day-level granularity)
  slots: IFreeBusySlot[]; // already all-string interface, no conversion needed
  dateModified: string;
}

// ─── Typed interface (application form) ──────────────────────────────────────

export interface ITypedFreeBusySummary {
  id: string;
  userId: string;
  date: Date;
  slots: IFreeBusySlot[];
  dateModified: Date;
}

// ─── Hydration schema ────────────────────────────────────────────────────────

export const freeBusySummaryHydration: IHydrationSchema<
  IStoredFreeBusySummary,
  ITypedFreeBusySummary
> = {
  hydrate: (stored: IStoredFreeBusySummary): ITypedFreeBusySummary => ({
    id: stored._id as string,
    userId: stored.userId,
    date: new Date(stored.date),
    slots: stored.slots,
    dateModified: new Date(stored.dateModified),
  }),

  dehydrate: (typed: ITypedFreeBusySummary): IStoredFreeBusySummary => ({
    _id: typed.id,
    userId: typed.userId,
    date: typed.date.toISOString(),
    slots: typed.slots,
    dateModified: typed.dateModified.toISOString(),
  }),
};

// ─── Collection schema (validation + indexes) ────────────────────────────────

export const FREE_BUSY_SUMMARY_SCHEMA: CollectionSchema = {
  name: FREE_BUSY_SUMMARIES_COLLECTION,
  properties: {
    _id: { type: 'string' },
    userId: { type: 'string', required: true, minLength: 1 },
    date: { type: 'string', required: true },
    slots: { type: 'array', required: true },
    dateModified: { type: 'string', required: true },
  },
  required: ['userId', 'date', 'slots', 'dateModified'],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Fast free/busy lookups (compound, unique)
    { fields: { userId: 1, date: 1 }, options: { unique: true } },
    // Find all summaries for a user
    { fields: { userId: 1 } },
    // For cleanup/refresh queries
    { fields: { dateModified: 1 } },
  ],
};

// ─── Model factory ───────────────────────────────────────────────────────────

/**
 * Create a FreeBusySummary Model from a BrightDb instance.
 *
 * @example
 * ```typescript
 * const fbModel = createFreeBusySummaryModel(db);
 * const summary = await fbModel.findOne({ userId: 'user-abc', date: '2025-06-01' });
 * ```
 */
export function createFreeBusySummaryModel(
  db: BrightDb,
): Model<IStoredFreeBusySummary, ITypedFreeBusySummary> {
  const collection = db.collection<IStoredFreeBusySummary>(
    FREE_BUSY_SUMMARIES_COLLECTION,
  );
  return new Model(collection, {
    schema: FREE_BUSY_SUMMARY_SCHEMA,
    hydration: freeBusySummaryHydration,
    collectionName: FREE_BUSY_SUMMARIES_COLLECTION,
  });
}
