/**
 * CalendarEvent Model — unit tests.
 *
 * Tests hydration round-trip, schema validation, and model CRUD
 * for the calendar_events collection.
 *
 * @see Requirements 4.1, 4.8, 15.1
 */

import {
  EventTransparency,
  EventVisibility,
} from '@brightchain/brightcal-lib';
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
  CALENDAR_EVENT_SCHEMA,
  CALENDAR_EVENTS_COLLECTION,
  calendarEventHydration,
  createCalendarEventModel,
  type IStoredCalendarEvent,
  type ITypedCalendarEvent,
} from '../calendarEvent.model.ts';

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

const NOW = new Date('2025-06-15T10:00:00.000Z');
const LATER = new Date('2025-06-15T11:00:00.000Z');

/**
 * Sample encrypted body placeholder — in production this would be AES-256-GCM
 * encrypted JSON containing summary, attendeeIds, rrule, etc.
 */
const SAMPLE_ENCRYPTED_BODY = 'encrypted-placeholder-data';

function sampleStored(
  overrides: Partial<IStoredCalendarEvent> = {},
): IStoredCalendarEvent {
  return {
    _id: 'evt-001',
    calendarId: 'cal-001',
    uid: '550e8400-e29b-41d4-a716-446655440000',
    sequence: 0,
    dtstart: NOW.toISOString(),
    dtend: LATER.toISOString(),
    dtstartTzid: 'America/New_York',
    dtendTzid: 'America/New_York',
    allDay: false,
    visibility: EventVisibility.Public,
    transparency: EventTransparency.Opaque,
    status: 'CONFIRMED',
    organizerId: 'user-abc',
    isRecurring: false,
    encryptedBody: SAMPLE_ENCRYPTED_BODY,
    blockId: 'block-xyz',
    dateCreated: NOW.toISOString(),
    dateModified: NOW.toISOString(),
    searchText: 'Team Standup daily meeting',
    ...overrides,
  };
}

function sampleTyped(
  overrides: Partial<ITypedCalendarEvent> = {},
): ITypedCalendarEvent {
  return {
    id: 'evt-001',
    calendarId: 'cal-001',
    uid: '550e8400-e29b-41d4-a716-446655440000',
    sequence: 0,
    summary: 'Team Standup',
    dtstart: NOW,
    dtend: LATER,
    dtstartTzid: 'America/New_York',
    dtendTzid: 'America/New_York',
    allDay: false,
    visibility: EventVisibility.Public,
    transparency: EventTransparency.Opaque,
    status: 'CONFIRMED',
    organizerId: 'user-abc',
    attendeeIds: ['user-abc', 'user-def'],
    isRecurring: false,
    blockId: 'block-xyz',
    encryptedBody: SAMPLE_ENCRYPTED_BODY,
    dateCreated: NOW,
    dateModified: NOW,
    searchText: 'Team Standup daily meeting',
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CalendarEvent Model', () => {
  describe('hydration', () => {
    it('should hydrate stored document to typed form', () => {
      const stored = sampleStored();
      const typed = calendarEventHydration.hydrate(stored);

      expect(typed.id).toBe('evt-001');
      expect(typed.calendarId).toBe('cal-001');
      expect(typed.uid).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(typed.sequence).toBe(0);
      // Sensitive fields are encrypted — hydration returns defaults
      expect(typed.summary).toBe('');
      expect(typed.attendeeIds).toEqual([]);
      expect(typed.dtstart).toEqual(NOW);
      expect(typed.dtend).toEqual(LATER);
      expect(typed.dtstartTzid).toBe('America/New_York');
      expect(typed.dtendTzid).toBe('America/New_York');
      expect(typed.allDay).toBe(false);
      expect(typed.visibility).toBe(EventVisibility.Public);
      expect(typed.transparency).toBe(EventTransparency.Opaque);
      expect(typed.status).toBe('CONFIRMED');
      expect(typed.organizerId).toBe('user-abc');
      expect(typed.isRecurring).toBe(false);
      expect(typed.encryptedBody).toBe(SAMPLE_ENCRYPTED_BODY);
      expect(typed.blockId).toBe('block-xyz');
      expect(typed.dateCreated).toEqual(NOW);
      expect(typed.dateModified).toEqual(NOW);
      expect(typed.searchText).toBe('Team Standup daily meeting');
      expect(typed.rrule).toBeUndefined();
      expect(typed.exdates).toBeUndefined();
      expect(typed.rdates).toBeUndefined();
      expect(typed.recurrenceId).toBeUndefined();
      expect(typed.parentEventId).toBeUndefined();
    });

    it('should hydrate recurrence fields as undefined (encrypted in body)', () => {
      // With the new encrypted schema, recurrence fields are inside encryptedBody.
      // Hydration always returns undefined for these — decryption is done at service layer.
      const stored = sampleStored({ isRecurring: true });
      const typed = calendarEventHydration.hydrate(stored);

      expect(typed.isRecurring).toBe(true);
      // These are encrypted in encryptedBody, not stored at top level
      expect(typed.rrule).toBeUndefined();
      expect(typed.exdates).toBeUndefined();
      expect(typed.rdates).toBeUndefined();
      expect(typed.recurrenceId).toBeUndefined();
      expect(typed.parentEventId).toBeUndefined();
    });

    it('should dehydrate typed document to stored form', () => {
      const typed = sampleTyped();
      const stored = calendarEventHydration.dehydrate(typed);

      expect(stored._id).toBe('evt-001');
      expect(stored.calendarId).toBe('cal-001');
      expect(stored.uid).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(stored.dtstart).toBe(NOW.toISOString());
      expect(stored.dtend).toBe(LATER.toISOString());
      expect(stored.visibility).toBe('PUBLIC');
      expect(stored.transparency).toBe('OPAQUE');
      expect(stored.status).toBe('CONFIRMED');
      expect(stored.encryptedBody).toBe(SAMPLE_ENCRYPTED_BODY);
      expect(stored.dateCreated).toBe(NOW.toISOString());
      expect(stored.dateModified).toBe(NOW.toISOString());
    });

    it('should round-trip hydrate → dehydrate → hydrate for metadata fields', () => {
      const original = sampleTyped({ isRecurring: true });
      const stored = calendarEventHydration.dehydrate(original);
      const rehydrated = calendarEventHydration.hydrate(stored);

      // Metadata fields round-trip correctly
      expect(rehydrated.id).toBe(original.id);
      expect(rehydrated.calendarId).toBe(original.calendarId);
      expect(rehydrated.uid).toBe(original.uid);
      expect(rehydrated.sequence).toBe(original.sequence);
      expect(rehydrated.dtstart).toEqual(original.dtstart);
      expect(rehydrated.dtend).toEqual(original.dtend);
      expect(rehydrated.dtstartTzid).toBe(original.dtstartTzid);
      expect(rehydrated.dtendTzid).toBe(original.dtendTzid);
      expect(rehydrated.allDay).toBe(original.allDay);
      expect(rehydrated.visibility).toBe(original.visibility);
      expect(rehydrated.transparency).toBe(original.transparency);
      expect(rehydrated.status).toBe(original.status);
      expect(rehydrated.organizerId).toBe(original.organizerId);
      expect(rehydrated.isRecurring).toBe(original.isRecurring);
      expect(rehydrated.blockId).toBe(original.blockId);
      expect(rehydrated.encryptedBody).toBe(original.encryptedBody);
      expect(rehydrated.dateCreated).toEqual(original.dateCreated);
      expect(rehydrated.dateModified).toEqual(original.dateModified);
      expect(rehydrated.searchText).toBe(original.searchText);

      // Sensitive fields are not preserved through hydration (they're encrypted)
      expect(rehydrated.summary).toBe('');
      expect(rehydrated.attendeeIds).toEqual([]);
    });
  });

  describe('schema validation', () => {
    it('should accept a valid stored document', () => {
      const stored = sampleStored();
      const errors = validateDocument(
        stored,
        CALENDAR_EVENT_SCHEMA,
        CALENDAR_EVENTS_COLLECTION,
      );
      expect(errors).toEqual([]);
    });

    it('should reject missing required fields', () => {
      const incomplete = { _id: 'evt-bad' } as unknown as IStoredCalendarEvent;
      expect(() =>
        validateDocument(
          incomplete,
          CALENDAR_EVENT_SCHEMA,
          CALENDAR_EVENTS_COLLECTION,
        ),
      ).toThrow();
    });

    it('should reject invalid visibility value', () => {
      const stored = sampleStored({ visibility: 'INVISIBLE' });
      expect(() =>
        validateDocument(
          stored,
          CALENDAR_EVENT_SCHEMA,
          CALENDAR_EVENTS_COLLECTION,
        ),
      ).toThrow();
    });

    it('should reject invalid transparency value', () => {
      const stored = sampleStored({ transparency: 'MAYBE' });
      expect(() =>
        validateDocument(
          stored,
          CALENDAR_EVENT_SCHEMA,
          CALENDAR_EVENTS_COLLECTION,
        ),
      ).toThrow();
    });

    it('should reject invalid status value', () => {
      const stored = sampleStored({ status: 'UNKNOWN' });
      expect(() =>
        validateDocument(
          stored,
          CALENDAR_EVENT_SCHEMA,
          CALENDAR_EVENTS_COLLECTION,
        ),
      ).toThrow();
    });

    it('should accept all valid visibility values', () => {
      for (const vis of Object.values(EventVisibility)) {
        const stored = sampleStored({ visibility: vis });
        const errors = validateDocument(
          stored,
          CALENDAR_EVENT_SCHEMA,
          CALENDAR_EVENTS_COLLECTION,
        );
        expect(errors).toEqual([]);
      }
    });

    it('should accept all valid transparency values', () => {
      for (const trans of Object.values(EventTransparency)) {
        const stored = sampleStored({ transparency: trans });
        const errors = validateDocument(
          stored,
          CALENDAR_EVENT_SCHEMA,
          CALENDAR_EVENTS_COLLECTION,
        );
        expect(errors).toEqual([]);
      }
    });

    it('should accept all valid status values', () => {
      for (const status of ['CONFIRMED', 'TENTATIVE', 'CANCELLED']) {
        const stored = sampleStored({ status });
        const errors = validateDocument(
          stored,
          CALENDAR_EVENT_SCHEMA,
          CALENDAR_EVENTS_COLLECTION,
        );
        expect(errors).toEqual([]);
      }
    });
  });

  describe('model factory and CRUD', () => {
    it('should create a model from BrightDb', () => {
      const db = makeDb();
      const model = createCalendarEventModel(db);
      expect(model).toBeDefined();
      expect(model.collection).toBeDefined();
    });

    it('should insert and retrieve a calendar event', async () => {
      const db = makeDb();
      const model = createCalendarEventModel(db);
      const typed = sampleTyped();

      await model.insertOne(typed);
      const found = await model.findOne({});

      expect(found).not.toBeNull();
      expect(found!.id).toBe('evt-001');
      expect(found!.calendarId).toBe('cal-001');
      expect(found!.visibility).toBe(EventVisibility.Public);
      expect(found!.dtstart).toEqual(NOW);
      expect(found!.dtend).toEqual(LATER);
      expect(found!.blockId).toBe('block-xyz');
      expect(found!.encryptedBody).toBe(SAMPLE_ENCRYPTED_BODY);
    });

    it('should find events by calendarId', async () => {
      const db = makeDb();
      const model = createCalendarEventModel(db);

      await model.insertOne(
        sampleTyped({ id: 'evt-1', uid: 'uid-1', calendarId: 'cal-a' }),
      );
      await model.insertOne(
        sampleTyped({ id: 'evt-2', uid: 'uid-2', calendarId: 'cal-a' }),
      );
      await model.insertOne(
        sampleTyped({ id: 'evt-3', uid: 'uid-3', calendarId: 'cal-b' }),
      );

      const results = await model.find({ calendarId: 'cal-a' }).toArray();
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.calendarId === 'cal-a')).toBe(true);
    });

    it('should find events by organizerId', async () => {
      const db = makeDb();
      const model = createCalendarEventModel(db);

      await model.insertOne(
        sampleTyped({ id: 'evt-1', uid: 'uid-1', organizerId: 'org-a' }),
      );
      await model.insertOne(
        sampleTyped({ id: 'evt-2', uid: 'uid-2', organizerId: 'org-b' }),
      );

      const results = await model.find({ organizerId: 'org-a' }).toArray();
      expect(results).toHaveLength(1);
      expect(results[0].organizerId).toBe('org-a');
    });

    it('should update a calendar event', async () => {
      const db = makeDb();
      const model = createCalendarEventModel(db);

      await model.insertOne(sampleTyped());
      await model.updateOne(
        { _id: 'evt-001' },
        { $set: { searchText: 'Updated Standup', sequence: 1 } },
      );

      const found = await model.findOne({ _id: 'evt-001' });
      expect(found!.searchText).toBe('Updated Standup');
      expect(found!.sequence).toBe(1);
    });

    it('should delete a calendar event', async () => {
      const db = makeDb();
      const model = createCalendarEventModel(db);

      await model.insertOne(sampleTyped());
      const result = await model.deleteOne({ _id: 'evt-001' });
      expect(result.deletedCount).toBe(1);

      const found = await model.findOne({ _id: 'evt-001' });
      expect(found).toBeNull();
    });
  });

  describe('constants', () => {
    it('should export the correct collection name', () => {
      expect(CALENDAR_EVENTS_COLLECTION).toBe('calendar_events');
    });

    it('should define indexes in the schema', () => {
      expect(CALENDAR_EVENT_SCHEMA.indexes).toBeDefined();
      expect(CALENDAR_EVENT_SCHEMA.indexes!.length).toBe(4);
    });

    it('should have compound index on calendarId, dtstart, dtend', () => {
      const idx = CALENDAR_EVENT_SCHEMA.indexes![0];
      expect(idx.fields).toEqual({ calendarId: 1, dtstart: 1, dtend: 1 });
    });

    it('should have index on organizerId', () => {
      const idx = CALENDAR_EVENT_SCHEMA.indexes![1];
      expect(idx.fields).toEqual({ organizerId: 1 });
    });

    it('should have unique index on uid', () => {
      const idx = CALENDAR_EVENT_SCHEMA.indexes![2];
      expect(idx.fields).toEqual({ uid: 1 });
      expect(idx.options).toEqual({ unique: true });
    });

    it('should have text index on searchText', () => {
      const idx = CALENDAR_EVENT_SCHEMA.indexes![3];
      expect(idx.fields).toEqual({ searchText: 'text' });
    });
  });
});
