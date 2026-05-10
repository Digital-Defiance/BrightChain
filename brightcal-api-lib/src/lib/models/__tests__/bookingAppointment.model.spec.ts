/**
 * BookingAppointment Model — unit tests.
 *
 * Tests hydration round-trip, schema validation, and model CRUD
 * for the booking_appointments collection.
 *
 * @see Requirements 9.1, 9.3, 9.5
 */

import {
  initializeBrightChain,
  MemoryBlockStore,
  ServiceLocator,
  ServiceProvider,
  validBlockSizes,
} from '@brightchain/brightchain-lib';
import {
  BrightDb,
  InMemoryHeadRegistry,
  validateDocument,
} from '@brightchain/db';
import {
  BOOKING_APPOINTMENT_SCHEMA,
  BOOKING_APPOINTMENTS_COLLECTION,
  bookingAppointmentHydration,
  createBookingAppointmentModel,
  type IStoredBookingAppointment,
  type ITypedBookingAppointment,
} from '../bookingAppointment.model.ts';

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(() => {
  initializeBrightChain();
  ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDb(name = 'testdb'): BrightDb {
  const store = new MemoryBlockStore(validBlockSizes);
  const registry = InMemoryHeadRegistry.createIsolated();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new BrightDb(store as any, { name, headRegistry: registry });
}

const NOW = new Date('2025-06-01T12:00:00.000Z');
const START = new Date('2025-06-10T14:00:00.000Z');
const END = new Date('2025-06-10T14:30:00.000Z');

const SAMPLE_ANSWERS: Record<string, string> = {
  'What is this about?': 'Discussing project timeline',
};

function sampleStored(
  overrides: Partial<IStoredBookingAppointment> = {},
): IStoredBookingAppointment {
  return {
    _id: 'appt-001',
    bookingPageId: 'bp-001',
    hostUserId: 'user-host',
    bookerName: 'Jane Smith',
    bookerEmail: 'jane@example.com',
    appointmentType: '30-min Meeting',
    startTime: START.toISOString(),
    endTime: END.toISOString(),
    eventId: 'evt-001',
    answers: JSON.stringify(SAMPLE_ANSWERS),
    status: 'confirmed',
    dateCreated: NOW.toISOString(),
    ...overrides,
  };
}

function sampleTyped(
  overrides: Partial<ITypedBookingAppointment> = {},
): ITypedBookingAppointment {
  return {
    id: 'appt-001',
    bookingPageId: 'bp-001',
    hostUserId: 'user-host',
    bookerName: 'Jane Smith',
    bookerEmail: 'jane@example.com',
    appointmentType: '30-min Meeting',
    startTime: START,
    endTime: END,
    eventId: 'evt-001',
    answers: SAMPLE_ANSWERS,
    status: 'confirmed',
    dateCreated: NOW,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('BookingAppointment Model', () => {
  describe('hydration', () => {
    it('should hydrate stored document to typed form', () => {
      const stored = sampleStored();
      const typed = bookingAppointmentHydration.hydrate(stored);

      expect(typed.id).toBe('appt-001');
      expect(typed.bookingPageId).toBe('bp-001');
      expect(typed.hostUserId).toBe('user-host');
      expect(typed.bookerName).toBe('Jane Smith');
      expect(typed.bookerEmail).toBe('jane@example.com');
      expect(typed.appointmentType).toBe('30-min Meeting');
      expect(typed.startTime).toEqual(START);
      expect(typed.endTime).toEqual(END);
      expect(typed.eventId).toBe('evt-001');
      expect(typed.answers).toEqual(SAMPLE_ANSWERS);
      expect(typed.status).toBe('confirmed');
      expect(typed.dateCreated).toEqual(NOW);
    });

    it('should hydrate an appointment without eventId', () => {
      const stored = sampleStored({ eventId: undefined });
      const typed = bookingAppointmentHydration.hydrate(stored);

      expect(typed.eventId).toBeUndefined();
    });

    it('should dehydrate typed document to stored form', () => {
      const typed = sampleTyped();
      const stored = bookingAppointmentHydration.dehydrate(typed);

      expect(stored._id).toBe('appt-001');
      expect(stored.bookingPageId).toBe('bp-001');
      expect(stored.hostUserId).toBe('user-host');
      expect(stored.bookerName).toBe('Jane Smith');
      expect(stored.bookerEmail).toBe('jane@example.com');
      expect(stored.appointmentType).toBe('30-min Meeting');
      expect(stored.startTime).toBe(START.toISOString());
      expect(stored.endTime).toBe(END.toISOString());
      expect(stored.answers).toBe(JSON.stringify(SAMPLE_ANSWERS));
      expect(stored.status).toBe('confirmed');
      expect(stored.dateCreated).toBe(NOW.toISOString());
    });

    it('should round-trip hydrate → dehydrate → hydrate', () => {
      const original = sampleTyped({
        id: 'appt-round',
        bookerName: 'Bob Builder',
        bookerEmail: 'bob@example.com',
        status: 'cancelled',
        answers: { topic: 'Architecture review' },
      });
      const stored = bookingAppointmentHydration.dehydrate(original);
      const rehydrated = bookingAppointmentHydration.hydrate(stored);

      expect(rehydrated.id).toBe(original.id);
      expect(rehydrated.bookerName).toBe(original.bookerName);
      expect(rehydrated.bookerEmail).toBe(original.bookerEmail);
      expect(rehydrated.status).toBe(original.status);
      expect(rehydrated.answers).toEqual(original.answers);
      expect(rehydrated.startTime).toEqual(original.startTime);
      expect(rehydrated.endTime).toEqual(original.endTime);
      expect(rehydrated.dateCreated).toEqual(original.dateCreated);
    });
  });

  describe('schema validation', () => {
    it('should accept a valid stored document', () => {
      const stored = sampleStored();
      const errors = validateDocument(
        stored,
        BOOKING_APPOINTMENT_SCHEMA,
        BOOKING_APPOINTMENTS_COLLECTION,
      );
      expect(errors).toEqual([]);
    });

    it('should accept a cancelled appointment', () => {
      const stored = sampleStored({ status: 'cancelled' });
      const errors = validateDocument(
        stored,
        BOOKING_APPOINTMENT_SCHEMA,
        BOOKING_APPOINTMENTS_COLLECTION,
      );
      expect(errors).toEqual([]);
    });

    it('should accept a document without eventId', () => {
      const stored = sampleStored();
      delete (stored as Record<string, unknown>)['eventId'];
      const errors = validateDocument(
        stored,
        BOOKING_APPOINTMENT_SCHEMA,
        BOOKING_APPOINTMENTS_COLLECTION,
      );
      expect(errors).toEqual([]);
    });

    it('should reject missing required fields', () => {
      const incomplete = {
        _id: 'appt-bad',
      } as unknown as IStoredBookingAppointment;
      expect(() =>
        validateDocument(
          incomplete,
          BOOKING_APPOINTMENT_SCHEMA,
          BOOKING_APPOINTMENTS_COLLECTION,
        ),
      ).toThrow();
    });

    it('should reject empty bookerName', () => {
      const stored = sampleStored({ bookerName: '' });
      expect(() =>
        validateDocument(
          stored,
          BOOKING_APPOINTMENT_SCHEMA,
          BOOKING_APPOINTMENTS_COLLECTION,
        ),
      ).toThrow();
    });

    it('should reject empty bookerEmail', () => {
      const stored = sampleStored({ bookerEmail: '' });
      expect(() =>
        validateDocument(
          stored,
          BOOKING_APPOINTMENT_SCHEMA,
          BOOKING_APPOINTMENTS_COLLECTION,
        ),
      ).toThrow();
    });

    it('should reject invalid status', () => {
      const stored = sampleStored({ status: 'pending' });
      expect(() =>
        validateDocument(
          stored,
          BOOKING_APPOINTMENT_SCHEMA,
          BOOKING_APPOINTMENTS_COLLECTION,
        ),
      ).toThrow();
    });
  });

  describe('model factory and CRUD', () => {
    it('should create a model from BrightDb', () => {
      const db = makeDb();
      const model = createBookingAppointmentModel(db);
      expect(model).toBeDefined();
      expect(model.collection).toBeDefined();
    });

    it('should insert and retrieve a booking appointment', async () => {
      const db = makeDb();
      const model = createBookingAppointmentModel(db);
      const typed = sampleTyped();

      await model.insertOne(typed);
      const found = await model.findOne({});

      expect(found).not.toBeNull();
      expect(found!.id).toBe('appt-001');
      expect(found!.bookingPageId).toBe('bp-001');
      expect(found!.bookerName).toBe('Jane Smith');
      expect(found!.startTime).toEqual(START);
      expect(found!.endTime).toEqual(END);
      expect(found!.answers).toEqual(SAMPLE_ANSWERS);
      expect(found!.status).toBe('confirmed');
    });

    it('should find appointments by bookingPageId', async () => {
      const db = makeDb();
      const model = createBookingAppointmentModel(db);

      await model.insertOne(
        sampleTyped({ id: 'appt-1', bookingPageId: 'bp-a' }),
      );
      await model.insertOne(
        sampleTyped({ id: 'appt-2', bookingPageId: 'bp-a' }),
      );
      await model.insertOne(
        sampleTyped({ id: 'appt-3', bookingPageId: 'bp-b' }),
      );

      const results = await model.find({ bookingPageId: 'bp-a' }).toArray();
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.bookingPageId === 'bp-a')).toBe(true);
    });

    it('should find appointments by hostUserId', async () => {
      const db = makeDb();
      const model = createBookingAppointmentModel(db);

      await model.insertOne(
        sampleTyped({ id: 'appt-1', hostUserId: 'host-a' }),
      );
      await model.insertOne(
        sampleTyped({ id: 'appt-2', hostUserId: 'host-b' }),
      );

      const results = await model.find({ hostUserId: 'host-a' }).toArray();
      expect(results).toHaveLength(1);
      expect(results[0].hostUserId).toBe('host-a');
    });

    it('should find appointments by bookerEmail', async () => {
      const db = makeDb();
      const model = createBookingAppointmentModel(db);

      await model.insertOne(
        sampleTyped({ id: 'appt-1', bookerEmail: 'alice@test.com' }),
      );
      await model.insertOne(
        sampleTyped({ id: 'appt-2', bookerEmail: 'bob@test.com' }),
      );

      const results = await model
        .find({ bookerEmail: 'alice@test.com' })
        .toArray();
      expect(results).toHaveLength(1);
      expect(results[0].bookerEmail).toBe('alice@test.com');
    });

    it('should update appointment status', async () => {
      const db = makeDb();
      const model = createBookingAppointmentModel(db);

      await model.insertOne(sampleTyped());
      await model.updateOne(
        { _id: 'appt-001' },
        { $set: { status: 'cancelled' } },
      );

      const found = await model.findOne({ _id: 'appt-001' });
      expect(found!.status).toBe('cancelled');
    });

    it('should delete a booking appointment', async () => {
      const db = makeDb();
      const model = createBookingAppointmentModel(db);

      await model.insertOne(sampleTyped());
      const result = await model.deleteOne({ _id: 'appt-001' });
      expect(result.deletedCount).toBe(1);

      const found = await model.findOne({ _id: 'appt-001' });
      expect(found).toBeNull();
    });
  });

  describe('constants', () => {
    it('should export the correct collection name', () => {
      expect(BOOKING_APPOINTMENTS_COLLECTION).toBe('booking_appointments');
    });

    it('should define indexes in the schema', () => {
      expect(BOOKING_APPOINTMENT_SCHEMA.indexes).toBeDefined();
      expect(BOOKING_APPOINTMENT_SCHEMA.indexes!.length).toBe(3);
    });

    it('should have a compound index on bookingPageId + startTime', () => {
      const pageIndex = BOOKING_APPOINTMENT_SCHEMA.indexes!.find(
        (idx) => 'bookingPageId' in idx.fields && 'startTime' in idx.fields,
      );
      expect(pageIndex).toBeDefined();
      expect(pageIndex!.fields).toEqual({ bookingPageId: 1, startTime: 1 });
    });

    it('should have a compound index on hostUserId + startTime', () => {
      const hostIndex = BOOKING_APPOINTMENT_SCHEMA.indexes!.find(
        (idx) => 'hostUserId' in idx.fields && 'startTime' in idx.fields,
      );
      expect(hostIndex).toBeDefined();
      expect(hostIndex!.fields).toEqual({ hostUserId: 1, startTime: 1 });
    });

    it('should have an index on bookerEmail', () => {
      const emailIndex = BOOKING_APPOINTMENT_SCHEMA.indexes!.find(
        (idx) => 'bookerEmail' in idx.fields,
      );
      expect(emailIndex).toBeDefined();
    });
  });
});
