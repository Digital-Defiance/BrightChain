/**
 * BookingPage BrightDb Model
 *
 * Defines the stored/typed interfaces, hydration schema, collection schema,
 * and factory function for the booking_pages collection.
 *
 * @see Requirements 9.1, 9.3, 9.5
 */

import type {
  IAppointmentTypeDTO,
  IBookingPageDTO,
} from '@brightchain/brightcal-lib';
import type { IHydrationSchema } from '@brightchain/brightchain-lib';
import type { BrightDb, BsonDocument, CollectionSchema } from '@brightchain/db';
import { Model } from '@brightchain/db';

// ─── Collection name ─────────────────────────────────────────────────────────

export const BOOKING_PAGES_COLLECTION = 'booking_pages';

// ─── Stored interface (block storage form — all primitives/strings) ──────────

export interface IStoredBookingPage extends BsonDocument {
  _id: string;
  ownerId: string;
  slug: string;
  title: string;
  description?: string;
  appointmentTypes: string; // JSON-serialized IAppointmentTypeDTO[]
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  active: boolean;
  dateCreated: string;
  dateModified: string;
}

// ─── Typed interface (application form) ──────────────────────────────────────

export interface ITypedBookingPage extends IBookingPageDTO<string, Date> {
  /** dateModified tracks last update time */
  dateModified: Date;
}

// ─── Hydration schema ────────────────────────────────────────────────────────

export const bookingPageHydration: IHydrationSchema<
  IStoredBookingPage,
  ITypedBookingPage
> = {
  hydrate: (stored: IStoredBookingPage): ITypedBookingPage => ({
    id: stored._id as string,
    ownerId: stored.ownerId,
    slug: stored.slug,
    title: stored.title,
    description: stored.description,
    appointmentTypes: JSON.parse(
      stored.appointmentTypes,
    ) as IAppointmentTypeDTO[],
    minNoticeMinutes: stored.minNoticeMinutes,
    maxAdvanceDays: stored.maxAdvanceDays,
    active: stored.active,
    dateCreated: new Date(stored.dateCreated),
    dateModified: new Date(stored.dateModified),
  }),

  dehydrate: (typed: ITypedBookingPage): IStoredBookingPage => ({
    _id: typed.id,
    ownerId: typed.ownerId,
    slug: typed.slug,
    title: typed.title,
    description: typed.description,
    appointmentTypes: JSON.stringify(typed.appointmentTypes),
    minNoticeMinutes: typed.minNoticeMinutes,
    maxAdvanceDays: typed.maxAdvanceDays,
    active: typed.active,
    dateCreated: typed.dateCreated.toISOString(),
    dateModified: typed.dateModified.toISOString(),
  }),
};

// ─── Collection schema (validation + indexes) ────────────────────────────────

export const BOOKING_PAGE_SCHEMA: CollectionSchema = {
  name: BOOKING_PAGES_COLLECTION,
  properties: {
    _id: { type: 'string' },
    ownerId: { type: 'string', required: true, minLength: 1 },
    slug: { type: 'string', required: true, minLength: 1, maxLength: 255 },
    title: { type: 'string', required: true, minLength: 1, maxLength: 255 },
    description: { type: 'string' },
    appointmentTypes: { type: 'string', required: true },
    minNoticeMinutes: { type: 'number', required: true, minimum: 0 },
    maxAdvanceDays: { type: 'number', required: true, minimum: 1 },
    active: { type: 'boolean', required: true },
    dateCreated: { type: 'string', required: true },
    dateModified: { type: 'string', required: true },
  },
  required: [
    'ownerId',
    'slug',
    'title',
    'appointmentTypes',
    'minNoticeMinutes',
    'maxAdvanceDays',
    'active',
    'dateCreated',
    'dateModified',
  ],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Unique slug for public booking page URLs
    { fields: { slug: 1 }, options: { unique: true } },
    // Find booking pages by owner
    { fields: { ownerId: 1 } },
    // Filter active pages
    { fields: { active: 1 } },
  ],
};

// ─── Model factory ───────────────────────────────────────────────────────────

/**
 * Create a BookingPage Model from a BrightDb instance.
 *
 * @example
 * ```typescript
 * const bookingPageModel = createBookingPageModel(db);
 * const pages = await bookingPageModel.find({ ownerId: userId, active: true }).toArray();
 * ```
 */
export function createBookingPageModel(
  db: BrightDb,
): Model<IStoredBookingPage, ITypedBookingPage> {
  const collection = db.collection<IStoredBookingPage>(
    BOOKING_PAGES_COLLECTION,
  );
  return new Model(collection, {
    schema: BOOKING_PAGE_SCHEMA,
    hydration: bookingPageHydration,
    collectionName: BOOKING_PAGES_COLLECTION,
  });
}
