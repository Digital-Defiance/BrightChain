/**
 * BookingAppointment BrightDb Model
 *
 * Defines the stored/typed interfaces, hydration schema, collection schema,
 * and factory function for the booking_appointments collection.
 *
 * @see Requirements 9.1, 9.3, 9.5
 */

import type { IHydrationSchema } from '@brightchain/brightchain-lib';
import type { BrightDb, BsonDocument, CollectionSchema } from '@brightchain/db';
import { Model } from '@brightchain/db';

// ─── Collection name ─────────────────────────────────────────────────────────

export const BOOKING_APPOINTMENTS_COLLECTION = 'booking_appointments';

// ─── Stored interface (block storage form — all primitives/strings) ──────────

export interface IStoredBookingAppointment extends BsonDocument {
  _id: string;
  bookingPageId: string;
  hostUserId: string;
  bookerName: string;
  bookerEmail: string;
  appointmentType: string;
  startTime: string;
  endTime: string;
  eventId?: string;
  answers: string; // JSON-serialized Record<string, string>
  status: string;
  dateCreated: string;
}

// ─── Typed interface (application form) ──────────────────────────────────────

export interface ITypedBookingAppointment {
  id: string;
  bookingPageId: string;
  hostUserId: string;
  bookerName: string;
  bookerEmail: string;
  appointmentType: string;
  startTime: Date;
  endTime: Date;
  eventId?: string;
  answers: Record<string, string>;
  status: 'confirmed' | 'cancelled';
  dateCreated: Date;
}

// ─── Hydration schema ────────────────────────────────────────────────────────

export const bookingAppointmentHydration: IHydrationSchema<
  IStoredBookingAppointment,
  ITypedBookingAppointment
> = {
  hydrate: (stored: IStoredBookingAppointment): ITypedBookingAppointment => ({
    id: stored._id as string,
    bookingPageId: stored.bookingPageId,
    hostUserId: stored.hostUserId,
    bookerName: stored.bookerName,
    bookerEmail: stored.bookerEmail,
    appointmentType: stored.appointmentType,
    startTime: new Date(stored.startTime),
    endTime: new Date(stored.endTime),
    eventId: stored.eventId,
    answers: JSON.parse(stored.answers) as Record<string, string>,
    status: stored.status as 'confirmed' | 'cancelled',
    dateCreated: new Date(stored.dateCreated),
  }),

  dehydrate: (typed: ITypedBookingAppointment): IStoredBookingAppointment => ({
    _id: typed.id,
    bookingPageId: typed.bookingPageId,
    hostUserId: typed.hostUserId,
    bookerName: typed.bookerName,
    bookerEmail: typed.bookerEmail,
    appointmentType: typed.appointmentType,
    startTime: typed.startTime.toISOString(),
    endTime: typed.endTime.toISOString(),
    eventId: typed.eventId,
    answers: JSON.stringify(typed.answers),
    status: typed.status,
    dateCreated: typed.dateCreated.toISOString(),
  }),
};

// ─── Collection schema (validation + indexes) ────────────────────────────────

export const BOOKING_APPOINTMENT_SCHEMA: CollectionSchema = {
  name: BOOKING_APPOINTMENTS_COLLECTION,
  properties: {
    _id: { type: 'string' },
    bookingPageId: { type: 'string', required: true, minLength: 1 },
    hostUserId: { type: 'string', required: true, minLength: 1 },
    bookerName: { type: 'string', required: true, minLength: 1 },
    bookerEmail: { type: 'string', required: true, minLength: 1 },
    appointmentType: { type: 'string', required: true, minLength: 1 },
    startTime: { type: 'string', required: true },
    endTime: { type: 'string', required: true },
    eventId: { type: 'string' },
    answers: { type: 'string', required: true },
    status: {
      type: 'string',
      required: true,
      enum: ['confirmed', 'cancelled'],
    },
    dateCreated: { type: 'string', required: true },
  },
  required: [
    'bookingPageId',
    'hostUserId',
    'bookerName',
    'bookerEmail',
    'appointmentType',
    'startTime',
    'endTime',
    'answers',
    'status',
    'dateCreated',
  ],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Find appointments for a booking page in a time range
    { fields: { bookingPageId: 1, startTime: 1 } },
    // Find appointments for a host in a time range
    { fields: { hostUserId: 1, startTime: 1 } },
    // Find appointments by booker email
    { fields: { bookerEmail: 1 } },
  ],
};

// ─── Model factory ───────────────────────────────────────────────────────────

/**
 * Create a BookingAppointment Model from a BrightDb instance.
 *
 * @example
 * ```typescript
 * const appointmentModel = createBookingAppointmentModel(db);
 * const upcoming = await appointmentModel.find({
 *   hostUserId: userId,
 *   status: 'confirmed',
 * }).toArray();
 * ```
 */
export function createBookingAppointmentModel(
  db: BrightDb,
): Model<IStoredBookingAppointment, ITypedBookingAppointment> {
  const collection = db.collection<IStoredBookingAppointment>(
    BOOKING_APPOINTMENTS_COLLECTION,
  );
  return new Model(collection, {
    schema: BOOKING_APPOINTMENT_SCHEMA,
    hydration: bookingAppointmentHydration,
    collectionName: BOOKING_APPOINTMENTS_COLLECTION,
  });
}
