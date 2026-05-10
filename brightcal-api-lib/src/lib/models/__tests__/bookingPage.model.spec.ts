/**
 * BookingPage Model — unit tests.
 *
 * Tests hydration round-trip, schema validation, and model CRUD
 * for the booking_pages collection.
 *
 * @see Requirements 9.1, 9.3, 9.5
 */

import type { IAppointmentTypeDTO } from '@brightchain/brightcal-lib';
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
  BOOKING_PAGE_SCHEMA,
  BOOKING_PAGES_COLLECTION,
  bookingPageHydration,
  createBookingPageModel,
  type IStoredBookingPage,
  type ITypedBookingPage,
} from '../bookingPage.model.ts';

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
const MODIFIED = new Date('2025-06-02T08:00:00.000Z');

const SAMPLE_APPOINTMENT_TYPES: IAppointmentTypeDTO[] = [
  {
    name: '30-min Meeting',
    durationMinutes: 30,
    bufferMinutes: 10,
    availableWindows: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
    ],
    questions: [{ label: 'What is this about?', type: 'text', required: true }],
    color: '#3366cc',
  },
];

function sampleStored(
  overrides: Partial<IStoredBookingPage> = {},
): IStoredBookingPage {
  return {
    _id: 'bp-001',
    ownerId: 'user-abc',
    slug: 'john-doe-meeting',
    title: 'Book a Meeting with John',
    description: 'Schedule a 30-minute meeting.',
    appointmentTypes: JSON.stringify(SAMPLE_APPOINTMENT_TYPES),
    minNoticeMinutes: 240,
    maxAdvanceDays: 30,
    active: true,
    dateCreated: NOW.toISOString(),
    dateModified: MODIFIED.toISOString(),
    ...overrides,
  };
}

function sampleTyped(
  overrides: Partial<ITypedBookingPage> = {},
): ITypedBookingPage {
  return {
    id: 'bp-001',
    ownerId: 'user-abc',
    slug: 'john-doe-meeting',
    title: 'Book a Meeting with John',
    description: 'Schedule a 30-minute meeting.',
    appointmentTypes: SAMPLE_APPOINTMENT_TYPES,
    minNoticeMinutes: 240,
    maxAdvanceDays: 30,
    active: true,
    dateCreated: NOW,
    dateModified: MODIFIED,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('BookingPage Model', () => {
  describe('hydration', () => {
    it('should hydrate stored document to typed form', () => {
      const stored = sampleStored();
      const typed = bookingPageHydration.hydrate(stored);

      expect(typed.id).toBe('bp-001');
      expect(typed.ownerId).toBe('user-abc');
      expect(typed.slug).toBe('john-doe-meeting');
      expect(typed.title).toBe('Book a Meeting with John');
      expect(typed.description).toBe('Schedule a 30-minute meeting.');
      expect(typed.appointmentTypes).toEqual(SAMPLE_APPOINTMENT_TYPES);
      expect(typed.minNoticeMinutes).toBe(240);
      expect(typed.maxAdvanceDays).toBe(30);
      expect(typed.active).toBe(true);
      expect(typed.dateCreated).toEqual(NOW);
      expect(typed.dateModified).toEqual(MODIFIED);
    });

    it('should hydrate a page without description', () => {
      const stored = sampleStored({ description: undefined });
      const typed = bookingPageHydration.hydrate(stored);

      expect(typed.description).toBeUndefined();
    });

    it('should dehydrate typed document to stored form', () => {
      const typed = sampleTyped();
      const stored = bookingPageHydration.dehydrate(typed);

      expect(stored._id).toBe('bp-001');
      expect(stored.ownerId).toBe('user-abc');
      expect(stored.slug).toBe('john-doe-meeting');
      expect(stored.title).toBe('Book a Meeting with John');
      expect(stored.appointmentTypes).toBe(
        JSON.stringify(SAMPLE_APPOINTMENT_TYPES),
      );
      expect(stored.minNoticeMinutes).toBe(240);
      expect(stored.maxAdvanceDays).toBe(30);
      expect(stored.active).toBe(true);
      expect(stored.dateCreated).toBe(NOW.toISOString());
      expect(stored.dateModified).toBe(MODIFIED.toISOString());
    });

    it('should round-trip hydrate → dehydrate → hydrate', () => {
      const original = sampleTyped({
        id: 'bp-round',
        slug: 'round-trip-test',
        title: 'Round Trip Page',
        minNoticeMinutes: 60,
        maxAdvanceDays: 14,
        active: false,
      });
      const stored = bookingPageHydration.dehydrate(original);
      const rehydrated = bookingPageHydration.hydrate(stored);

      expect(rehydrated.id).toBe(original.id);
      expect(rehydrated.slug).toBe(original.slug);
      expect(rehydrated.title).toBe(original.title);
      expect(rehydrated.appointmentTypes).toEqual(original.appointmentTypes);
      expect(rehydrated.minNoticeMinutes).toBe(original.minNoticeMinutes);
      expect(rehydrated.maxAdvanceDays).toBe(original.maxAdvanceDays);
      expect(rehydrated.active).toBe(original.active);
      expect(rehydrated.dateCreated).toEqual(original.dateCreated);
      expect(rehydrated.dateModified).toEqual(original.dateModified);
    });
  });

  describe('schema validation', () => {
    it('should accept a valid stored document', () => {
      const stored = sampleStored();
      const errors = validateDocument(
        stored,
        BOOKING_PAGE_SCHEMA,
        BOOKING_PAGES_COLLECTION,
      );
      expect(errors).toEqual([]);
    });

    it('should accept a document without description', () => {
      const stored = sampleStored();
      delete (stored as Record<string, unknown>)['description'];
      const errors = validateDocument(
        stored,
        BOOKING_PAGE_SCHEMA,
        BOOKING_PAGES_COLLECTION,
      );
      expect(errors).toEqual([]);
    });

    it('should accept an inactive page', () => {
      const stored = sampleStored({ active: false });
      const errors = validateDocument(
        stored,
        BOOKING_PAGE_SCHEMA,
        BOOKING_PAGES_COLLECTION,
      );
      expect(errors).toEqual([]);
    });

    it('should reject missing required fields', () => {
      const incomplete = { _id: 'bp-bad' } as unknown as IStoredBookingPage;
      expect(() =>
        validateDocument(
          incomplete,
          BOOKING_PAGE_SCHEMA,
          BOOKING_PAGES_COLLECTION,
        ),
      ).toThrow();
    });

    it('should reject empty slug', () => {
      const stored = sampleStored({ slug: '' });
      expect(() =>
        validateDocument(stored, BOOKING_PAGE_SCHEMA, BOOKING_PAGES_COLLECTION),
      ).toThrow();
    });

    it('should reject empty title', () => {
      const stored = sampleStored({ title: '' });
      expect(() =>
        validateDocument(stored, BOOKING_PAGE_SCHEMA, BOOKING_PAGES_COLLECTION),
      ).toThrow();
    });
  });

  describe('model factory and CRUD', () => {
    it('should create a model from BrightDb', () => {
      const db = makeDb();
      const model = createBookingPageModel(db);
      expect(model).toBeDefined();
      expect(model.collection).toBeDefined();
    });

    it('should insert and retrieve a booking page', async () => {
      const db = makeDb();
      const model = createBookingPageModel(db);
      const typed = sampleTyped();

      await model.insertOne(typed);
      const found = await model.findOne({});

      expect(found).not.toBeNull();
      expect(found!.id).toBe('bp-001');
      expect(found!.slug).toBe('john-doe-meeting');
      expect(found!.title).toBe('Book a Meeting with John');
      expect(found!.appointmentTypes).toEqual(SAMPLE_APPOINTMENT_TYPES);
      expect(found!.active).toBe(true);
    });

    it('should find booking pages by ownerId', async () => {
      const db = makeDb();
      const model = createBookingPageModel(db);

      await model.insertOne(
        sampleTyped({ id: 'bp-1', ownerId: 'user-a', slug: 'slug-a' }),
      );
      await model.insertOne(
        sampleTyped({ id: 'bp-2', ownerId: 'user-a', slug: 'slug-b' }),
      );
      await model.insertOne(
        sampleTyped({ id: 'bp-3', ownerId: 'user-b', slug: 'slug-c' }),
      );

      const results = await model.find({ ownerId: 'user-a' }).toArray();
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.ownerId === 'user-a')).toBe(true);
    });

    it('should find active booking pages', async () => {
      const db = makeDb();
      const model = createBookingPageModel(db);

      await model.insertOne(
        sampleTyped({ id: 'bp-1', active: true, slug: 'active-1' }),
      );
      await model.insertOne(
        sampleTyped({ id: 'bp-2', active: false, slug: 'inactive-1' }),
      );

      const results = await model.find({ active: true }).toArray();
      expect(results).toHaveLength(1);
      expect(results[0].active).toBe(true);
    });

    it('should update a booking page', async () => {
      const db = makeDb();
      const model = createBookingPageModel(db);

      await model.insertOne(sampleTyped());
      await model.updateOne({ _id: 'bp-001' }, { $set: { active: false } });

      const found = await model.findOne({ _id: 'bp-001' });
      expect(found!.active).toBe(false);
    });

    it('should delete a booking page', async () => {
      const db = makeDb();
      const model = createBookingPageModel(db);

      await model.insertOne(sampleTyped());
      const result = await model.deleteOne({ _id: 'bp-001' });
      expect(result.deletedCount).toBe(1);

      const found = await model.findOne({ _id: 'bp-001' });
      expect(found).toBeNull();
    });
  });

  describe('constants', () => {
    it('should export the correct collection name', () => {
      expect(BOOKING_PAGES_COLLECTION).toBe('booking_pages');
    });

    it('should define indexes in the schema', () => {
      expect(BOOKING_PAGE_SCHEMA.indexes).toBeDefined();
      expect(BOOKING_PAGE_SCHEMA.indexes!.length).toBe(3);
    });

    it('should have a unique index on slug', () => {
      const slugIndex = BOOKING_PAGE_SCHEMA.indexes!.find(
        (idx) => 'slug' in idx.fields,
      );
      expect(slugIndex).toBeDefined();
      expect(slugIndex!.fields).toEqual({ slug: 1 });
      expect(slugIndex!.options).toEqual({ unique: true });
    });

    it('should have an index on ownerId', () => {
      const ownerIndex = BOOKING_PAGE_SCHEMA.indexes!.find(
        (idx) => 'ownerId' in idx.fields && !('active' in idx.fields),
      );
      expect(ownerIndex).toBeDefined();
    });

    it('should have an index on active', () => {
      const activeIndex = BOOKING_PAGE_SCHEMA.indexes!.find(
        (idx) => 'active' in idx.fields,
      );
      expect(activeIndex).toBeDefined();
    });
  });
});
