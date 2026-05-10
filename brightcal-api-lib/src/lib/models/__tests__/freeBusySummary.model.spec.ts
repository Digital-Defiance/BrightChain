/**
 * FreeBusySummary Model — unit tests.
 *
 * Tests hydration round-trip, schema validation, and model CRUD
 * for the calendar_freebusy collection.
 *
 * @see Requirements 8.1, 17.5
 */

import type { IFreeBusySlot } from '@brightchain/brightcal-lib';
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
  createFreeBusySummaryModel,
  FREE_BUSY_SUMMARIES_COLLECTION,
  FREE_BUSY_SUMMARY_SCHEMA,
  freeBusySummaryHydration,
  type IStoredFreeBusySummary,
  type ITypedFreeBusySummary,
} from '../freeBusySummary.model.ts';

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

const DATE = new Date('2025-06-15T00:00:00.000Z');
const MODIFIED = new Date('2025-06-15T10:30:00.000Z');

const SAMPLE_SLOTS: IFreeBusySlot[] = [
  { start: '2025-06-15T09:00:00Z', end: '2025-06-15T09:30:00Z', type: 'BUSY' },
  {
    start: '2025-06-15T10:00:00Z',
    end: '2025-06-15T10:15:00Z',
    type: 'BUSY-TENTATIVE',
  },
  {
    start: '2025-06-15T14:00:00Z',
    end: '2025-06-15T15:00:00Z',
    type: 'BUSY-UNAVAILABLE',
  },
];

function sampleStored(
  overrides: Partial<IStoredFreeBusySummary> = {},
): IStoredFreeBusySummary {
  return {
    _id: 'fb-001',
    userId: 'user-abc',
    date: DATE.toISOString(),
    slots: SAMPLE_SLOTS,
    dateModified: MODIFIED.toISOString(),
    ...overrides,
  };
}

function sampleTyped(
  overrides: Partial<ITypedFreeBusySummary> = {},
): ITypedFreeBusySummary {
  return {
    id: 'fb-001',
    userId: 'user-abc',
    date: DATE,
    slots: SAMPLE_SLOTS,
    dateModified: MODIFIED,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('FreeBusySummary Model', () => {
  describe('hydration', () => {
    it('should hydrate stored document to typed form', () => {
      const stored = sampleStored();
      const typed = freeBusySummaryHydration.hydrate(stored);

      expect(typed.id).toBe('fb-001');
      expect(typed.userId).toBe('user-abc');
      expect(typed.date).toEqual(DATE);
      expect(typed.slots).toEqual(SAMPLE_SLOTS);
      expect(typed.dateModified).toEqual(MODIFIED);
    });

    it('should hydrate a summary with empty slots', () => {
      const stored = sampleStored({ slots: [] });
      const typed = freeBusySummaryHydration.hydrate(stored);

      expect(typed.slots).toEqual([]);
    });

    it('should dehydrate typed document to stored form', () => {
      const typed = sampleTyped();
      const stored = freeBusySummaryHydration.dehydrate(typed);

      expect(stored._id).toBe('fb-001');
      expect(stored.userId).toBe('user-abc');
      expect(stored.date).toBe(DATE.toISOString());
      expect(stored.slots).toEqual(SAMPLE_SLOTS);
      expect(stored.dateModified).toBe(MODIFIED.toISOString());
    });

    it('should round-trip hydrate → dehydrate → hydrate', () => {
      const original = sampleTyped({
        id: 'fb-round',
        userId: 'user-round',
        date: new Date('2025-07-04T00:00:00.000Z'),
        slots: [
          {
            start: '2025-07-04T08:00:00Z',
            end: '2025-07-04T08:15:00Z',
            type: 'FREE',
          },
        ],
        dateModified: new Date('2025-07-04T12:00:00.000Z'),
      });
      const stored = freeBusySummaryHydration.dehydrate(original);
      const rehydrated = freeBusySummaryHydration.hydrate(stored);

      expect(rehydrated.id).toBe(original.id);
      expect(rehydrated.userId).toBe(original.userId);
      expect(rehydrated.date).toEqual(original.date);
      expect(rehydrated.slots).toEqual(original.slots);
      expect(rehydrated.dateModified).toEqual(original.dateModified);
    });
  });

  describe('schema validation', () => {
    it('should accept a valid stored document', () => {
      const stored = sampleStored();
      const errors = validateDocument(
        stored,
        FREE_BUSY_SUMMARY_SCHEMA,
        FREE_BUSY_SUMMARIES_COLLECTION,
      );
      expect(errors).toEqual([]);
    });

    it('should accept a document with empty slots array', () => {
      const stored = sampleStored({ slots: [] });
      const errors = validateDocument(
        stored,
        FREE_BUSY_SUMMARY_SCHEMA,
        FREE_BUSY_SUMMARIES_COLLECTION,
      );
      expect(errors).toEqual([]);
    });

    it('should reject missing required fields', () => {
      const incomplete = { _id: 'fb-bad' } as unknown as IStoredFreeBusySummary;
      expect(() =>
        validateDocument(
          incomplete,
          FREE_BUSY_SUMMARY_SCHEMA,
          FREE_BUSY_SUMMARIES_COLLECTION,
        ),
      ).toThrow();
    });

    it('should reject empty userId', () => {
      const stored = sampleStored({ userId: '' });
      expect(() =>
        validateDocument(
          stored,
          FREE_BUSY_SUMMARY_SCHEMA,
          FREE_BUSY_SUMMARIES_COLLECTION,
        ),
      ).toThrow();
    });
  });

  describe('model factory and CRUD', () => {
    it('should create a model from BrightDb', () => {
      const db = makeDb();
      const model = createFreeBusySummaryModel(db);
      expect(model).toBeDefined();
      expect(model.collection).toBeDefined();
    });

    it('should insert and retrieve a free/busy summary', async () => {
      const db = makeDb();
      const model = createFreeBusySummaryModel(db);
      const typed = sampleTyped();

      await model.insertOne(typed);
      const found = await model.findOne({});

      expect(found).not.toBeNull();
      expect(found!.id).toBe('fb-001');
      expect(found!.userId).toBe('user-abc');
      expect(found!.date).toEqual(DATE);
      expect(found!.slots).toEqual(SAMPLE_SLOTS);
      expect(found!.dateModified).toEqual(MODIFIED);
    });

    it('should find summaries by userId', async () => {
      const db = makeDb();
      const model = createFreeBusySummaryModel(db);

      await model.insertOne(
        sampleTyped({
          id: 'fb-1',
          userId: 'user-a',
          date: new Date('2025-06-15T00:00:00.000Z'),
        }),
      );
      await model.insertOne(
        sampleTyped({
          id: 'fb-2',
          userId: 'user-a',
          date: new Date('2025-06-16T00:00:00.000Z'),
        }),
      );
      await model.insertOne(
        sampleTyped({
          id: 'fb-3',
          userId: 'user-b',
          date: new Date('2025-06-15T00:00:00.000Z'),
        }),
      );

      const results = await model.find({ userId: 'user-a' }).toArray();
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.userId === 'user-a')).toBe(true);
    });

    it('should update slots on an existing summary', async () => {
      const db = makeDb();
      const model = createFreeBusySummaryModel(db);

      await model.insertOne(sampleTyped());
      const newSlots: IFreeBusySlot[] = [
        {
          start: '2025-06-15T16:00:00Z',
          end: '2025-06-15T17:00:00Z',
          type: 'BUSY',
        },
      ];
      await model.updateOne({ _id: 'fb-001' }, { $set: { slots: newSlots } });

      const found = await model.findOne({ _id: 'fb-001' });
      expect(found!.slots).toEqual(newSlots);
    });

    it('should delete a free/busy summary', async () => {
      const db = makeDb();
      const model = createFreeBusySummaryModel(db);

      await model.insertOne(sampleTyped());
      const result = await model.deleteOne({ _id: 'fb-001' });
      expect(result.deletedCount).toBe(1);

      const found = await model.findOne({ _id: 'fb-001' });
      expect(found).toBeNull();
    });
  });

  describe('constants', () => {
    it('should export the correct collection name', () => {
      expect(FREE_BUSY_SUMMARIES_COLLECTION).toBe('calendar_freebusy');
    });

    it('should define indexes in the schema', () => {
      expect(FREE_BUSY_SUMMARY_SCHEMA.indexes).toBeDefined();
      expect(FREE_BUSY_SUMMARY_SCHEMA.indexes!.length).toBe(3);
    });

    it('should have a unique compound index on userId + date', () => {
      const compoundIndex = FREE_BUSY_SUMMARY_SCHEMA.indexes!.find(
        (idx) => 'userId' in idx.fields && 'date' in idx.fields,
      );
      expect(compoundIndex).toBeDefined();
      expect(compoundIndex!.fields).toEqual({ userId: 1, date: 1 });
      expect(compoundIndex!.options).toBeDefined();
      expect(compoundIndex!.options!.unique).toBe(true);
    });

    it('should have an index on userId for user lookups', () => {
      const userIndex = FREE_BUSY_SUMMARY_SCHEMA.indexes!.find(
        (idx) => 'userId' in idx.fields && !('date' in idx.fields),
      );
      expect(userIndex).toBeDefined();
    });

    it('should have an index on dateModified for cleanup queries', () => {
      const modifiedIndex = FREE_BUSY_SUMMARY_SCHEMA.indexes!.find(
        (idx) => 'dateModified' in idx.fields,
      );
      expect(modifiedIndex).toBeDefined();
    });
  });
});
