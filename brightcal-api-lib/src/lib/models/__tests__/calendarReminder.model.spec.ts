/**
 * CalendarReminder Model — unit tests.
 *
 * Tests hydration round-trip, schema validation, and model CRUD
 * for the calendar_reminders collection.
 *
 * @see Requirements 14.1, 14.4
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
  CALENDAR_REMINDER_SCHEMA,
  CALENDAR_REMINDERS_COLLECTION,
  calendarReminderHydration,
  createCalendarReminderModel,
  type IStoredCalendarReminder,
  type ITypedCalendarReminder,
} from '../calendarReminder.model.ts';

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
const TRIGGER = new Date('2025-06-02T09:30:00.000Z');

function sampleStored(
  overrides: Partial<IStoredCalendarReminder> = {},
): IStoredCalendarReminder {
  return {
    _id: 'rem-001',
    eventId: 'evt-001',
    userId: 'user-abc',
    triggerAt: TRIGGER.toISOString(),
    channels: ['email', 'push'],
    delivered: false,
    dateCreated: NOW.toISOString(),
    ...overrides,
  };
}

function sampleTyped(
  overrides: Partial<ITypedCalendarReminder> = {},
): ITypedCalendarReminder {
  return {
    id: 'rem-001',
    eventId: 'evt-001',
    userId: 'user-abc',
    triggerAt: TRIGGER,
    channels: ['email', 'push'],
    delivered: false,
    dateCreated: NOW,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CalendarReminder Model', () => {
  describe('hydration', () => {
    it('should hydrate stored document to typed form', () => {
      const stored = sampleStored();
      const typed = calendarReminderHydration.hydrate(stored);

      expect(typed.id).toBe('rem-001');
      expect(typed.eventId).toBe('evt-001');
      expect(typed.userId).toBe('user-abc');
      expect(typed.triggerAt).toEqual(TRIGGER);
      expect(typed.channels).toEqual(['email', 'push']);
      expect(typed.delivered).toBe(false);
      expect(typed.dateCreated).toEqual(NOW);
    });

    it('should hydrate a single-channel reminder', () => {
      const stored = sampleStored({ channels: ['email'] });
      const typed = calendarReminderHydration.hydrate(stored);

      expect(typed.channels).toEqual(['email']);
    });

    it('should dehydrate typed document to stored form', () => {
      const typed = sampleTyped();
      const stored = calendarReminderHydration.dehydrate(typed);

      expect(stored._id).toBe('rem-001');
      expect(stored.eventId).toBe('evt-001');
      expect(stored.userId).toBe('user-abc');
      expect(stored.triggerAt).toBe(TRIGGER.toISOString());
      expect(stored.channels).toEqual(['email', 'push']);
      expect(stored.delivered).toBe(false);
      expect(stored.dateCreated).toBe(NOW.toISOString());
    });

    it('should dehydrate a delivered reminder', () => {
      const typed = sampleTyped({ delivered: true });
      const stored = calendarReminderHydration.dehydrate(typed);

      expect(stored.delivered).toBe(true);
    });

    it('should round-trip hydrate → dehydrate → hydrate', () => {
      const original = sampleTyped({
        id: 'rem-round',
        eventId: 'evt-round',
        userId: 'user-round',
        triggerAt: new Date('2025-07-04T14:00:00.000Z'),
        channels: ['push'],
        delivered: true,
        dateCreated: new Date('2025-07-01T08:00:00.000Z'),
      });
      const stored = calendarReminderHydration.dehydrate(original);
      const rehydrated = calendarReminderHydration.hydrate(stored);

      expect(rehydrated.id).toBe(original.id);
      expect(rehydrated.eventId).toBe(original.eventId);
      expect(rehydrated.userId).toBe(original.userId);
      expect(rehydrated.triggerAt).toEqual(original.triggerAt);
      expect(rehydrated.channels).toEqual(original.channels);
      expect(rehydrated.delivered).toBe(original.delivered);
      expect(rehydrated.dateCreated).toEqual(original.dateCreated);
    });
  });

  describe('schema validation', () => {
    it('should accept a valid stored document', () => {
      const stored = sampleStored();
      const errors = validateDocument(
        stored,
        CALENDAR_REMINDER_SCHEMA,
        CALENDAR_REMINDERS_COLLECTION,
      );
      expect(errors).toEqual([]);
    });

    it('should accept a document with single channel', () => {
      const stored = sampleStored({ channels: ['push'] });
      const errors = validateDocument(
        stored,
        CALENDAR_REMINDER_SCHEMA,
        CALENDAR_REMINDERS_COLLECTION,
      );
      expect(errors).toEqual([]);
    });

    it('should accept a delivered reminder', () => {
      const stored = sampleStored({ delivered: true });
      const errors = validateDocument(
        stored,
        CALENDAR_REMINDER_SCHEMA,
        CALENDAR_REMINDERS_COLLECTION,
      );
      expect(errors).toEqual([]);
    });

    it('should reject missing required fields', () => {
      const incomplete = {
        _id: 'rem-bad',
      } as unknown as IStoredCalendarReminder;
      expect(() =>
        validateDocument(
          incomplete,
          CALENDAR_REMINDER_SCHEMA,
          CALENDAR_REMINDERS_COLLECTION,
        ),
      ).toThrow();
    });

    it('should reject empty eventId', () => {
      const stored = sampleStored({ eventId: '' });
      expect(() =>
        validateDocument(
          stored,
          CALENDAR_REMINDER_SCHEMA,
          CALENDAR_REMINDERS_COLLECTION,
        ),
      ).toThrow();
    });

    it('should reject empty userId', () => {
      const stored = sampleStored({ userId: '' });
      expect(() =>
        validateDocument(
          stored,
          CALENDAR_REMINDER_SCHEMA,
          CALENDAR_REMINDERS_COLLECTION,
        ),
      ).toThrow();
    });
  });

  describe('model factory and CRUD', () => {
    it('should create a model from BrightDb', () => {
      const db = makeDb();
      const model = createCalendarReminderModel(db);
      expect(model).toBeDefined();
      expect(model.collection).toBeDefined();
    });

    it('should insert and retrieve a calendar reminder', async () => {
      const db = makeDb();
      const model = createCalendarReminderModel(db);
      const typed = sampleTyped();

      await model.insertOne(typed);
      const found = await model.findOne({});

      expect(found).not.toBeNull();
      expect(found!.id).toBe('rem-001');
      expect(found!.eventId).toBe('evt-001');
      expect(found!.userId).toBe('user-abc');
      expect(found!.triggerAt).toEqual(TRIGGER);
      expect(found!.channels).toEqual(['email', 'push']);
      expect(found!.delivered).toBe(false);
      expect(found!.dateCreated).toEqual(NOW);
    });

    it('should find reminders by eventId', async () => {
      const db = makeDb();
      const model = createCalendarReminderModel(db);

      await model.insertOne(sampleTyped({ id: 'rem-1', eventId: 'evt-a' }));
      await model.insertOne(sampleTyped({ id: 'rem-2', eventId: 'evt-a' }));
      await model.insertOne(sampleTyped({ id: 'rem-3', eventId: 'evt-b' }));

      const results = await model.find({ eventId: 'evt-a' }).toArray();
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.eventId === 'evt-a')).toBe(true);
    });

    it('should find reminders by userId', async () => {
      const db = makeDb();
      const model = createCalendarReminderModel(db);

      await model.insertOne(sampleTyped({ id: 'rem-1', userId: 'user-a' }));
      await model.insertOne(sampleTyped({ id: 'rem-2', userId: 'user-b' }));

      const results = await model.find({ userId: 'user-a' }).toArray();
      expect(results).toHaveLength(1);
      expect(results[0].userId).toBe('user-a');
    });

    it('should find undelivered reminders', async () => {
      const db = makeDb();
      const model = createCalendarReminderModel(db);

      await model.insertOne(sampleTyped({ id: 'rem-1', delivered: false }));
      await model.insertOne(sampleTyped({ id: 'rem-2', delivered: true }));
      await model.insertOne(sampleTyped({ id: 'rem-3', delivered: false }));

      const results = await model.find({ delivered: false }).toArray();
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.delivered === false)).toBe(true);
    });

    it('should update delivered flag', async () => {
      const db = makeDb();
      const model = createCalendarReminderModel(db);

      await model.insertOne(sampleTyped());
      await model.updateOne({ _id: 'rem-001' }, { $set: { delivered: true } });

      const found = await model.findOne({ _id: 'rem-001' });
      expect(found!.delivered).toBe(true);
    });

    it('should delete a calendar reminder', async () => {
      const db = makeDb();
      const model = createCalendarReminderModel(db);

      await model.insertOne(sampleTyped());
      const result = await model.deleteOne({ _id: 'rem-001' });
      expect(result.deletedCount).toBe(1);

      const found = await model.findOne({ _id: 'rem-001' });
      expect(found).toBeNull();
    });
  });

  describe('constants', () => {
    it('should export the correct collection name', () => {
      expect(CALENDAR_REMINDERS_COLLECTION).toBe('calendar_reminders');
    });

    it('should define indexes in the schema', () => {
      expect(CALENDAR_REMINDER_SCHEMA.indexes).toBeDefined();
      expect(CALENDAR_REMINDER_SCHEMA.indexes!.length).toBe(3);
    });

    it('should have a compound index on triggerAt + delivered for polling', () => {
      const pollingIndex = CALENDAR_REMINDER_SCHEMA.indexes!.find(
        (idx) => 'triggerAt' in idx.fields && 'delivered' in idx.fields,
      );
      expect(pollingIndex).toBeDefined();
      expect(pollingIndex!.fields).toEqual({ triggerAt: 1, delivered: 1 });
    });

    it('should have an index on eventId for cancellation lookups', () => {
      const eventIndex = CALENDAR_REMINDER_SCHEMA.indexes!.find(
        (idx) => 'eventId' in idx.fields,
      );
      expect(eventIndex).toBeDefined();
    });

    it('should have an index on userId for user lookups', () => {
      const userIndex = CALENDAR_REMINDER_SCHEMA.indexes!.find(
        (idx) => 'userId' in idx.fields,
      );
      expect(userIndex).toBeDefined();
    });
  });
});
