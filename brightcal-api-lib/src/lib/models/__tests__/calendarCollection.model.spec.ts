/**
 * CalendarCollection Model — unit tests.
 *
 * Tests hydration round-trip, schema validation, and model CRUD
 * for the calendar_collections collection.
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { CalendarPermissionLevel } from '@brightchain/brightcal-lib';
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
  CALENDAR_COLLECTION_SCHEMA,
  CALENDAR_COLLECTIONS_COLLECTION,
  calendarCollectionHydration,
  createCalendarCollectionModel,
  type IStoredCalendarCollection,
  type ITypedCalendarCollection,
} from '../calendarCollection.model.ts';

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

function sampleStored(
  overrides: Partial<IStoredCalendarCollection> = {},
): IStoredCalendarCollection {
  return {
    _id: 'cal-001',
    ownerId: 'user-abc',
    displayName: 'Work Calendar',
    color: '#3366FF',
    description: 'My work events',
    isDefault: false,
    isSubscription: false,
    defaultPermission: CalendarPermissionLevel.Viewer,
    dateCreated: NOW.toISOString(),
    dateModified: NOW.toISOString(),
    ...overrides,
  };
}

function sampleTyped(
  overrides: Partial<ITypedCalendarCollection> = {},
): ITypedCalendarCollection {
  return {
    id: 'cal-001',
    ownerId: 'user-abc',
    displayName: 'Work Calendar',
    color: '#3366FF',
    description: 'My work events',
    isDefault: false,
    isSubscription: false,
    defaultPermission: CalendarPermissionLevel.Viewer,
    dateCreated: NOW,
    dateModified: NOW,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CalendarCollection Model', () => {
  describe('hydration', () => {
    it('should hydrate stored document to typed form', () => {
      const stored = sampleStored();
      const typed = calendarCollectionHydration.hydrate(stored);

      expect(typed.id).toBe('cal-001');
      expect(typed.ownerId).toBe('user-abc');
      expect(typed.displayName).toBe('Work Calendar');
      expect(typed.color).toBe('#3366FF');
      expect(typed.description).toBe('My work events');
      expect(typed.isDefault).toBe(false);
      expect(typed.isSubscription).toBe(false);
      expect(typed.defaultPermission).toBe(CalendarPermissionLevel.Viewer);
      expect(typed.dateCreated).toEqual(NOW);
      expect(typed.dateModified).toEqual(NOW);
      expect(typed.subscriptionUrl).toBeUndefined();
      expect(typed.subscriptionRefreshInterval).toBeUndefined();
      expect(typed.subscriptionLastRefreshed).toBeUndefined();
    });

    it('should hydrate subscription fields when present', () => {
      const refreshed = new Date('2025-06-01T10:00:00.000Z');
      const stored = sampleStored({
        isSubscription: true,
        subscriptionUrl: 'https://example.com/feed.ics',
        subscriptionRefreshInterval: 60,
        subscriptionLastRefreshed: refreshed.toISOString(),
      });
      const typed = calendarCollectionHydration.hydrate(stored);

      expect(typed.isSubscription).toBe(true);
      expect(typed.subscriptionUrl).toBe('https://example.com/feed.ics');
      expect(typed.subscriptionRefreshInterval).toBe(60);
      expect(typed.subscriptionLastRefreshed).toEqual(refreshed);
    });

    it('should dehydrate typed document to stored form', () => {
      const typed = sampleTyped();
      const stored = calendarCollectionHydration.dehydrate(typed);

      expect(stored._id).toBe('cal-001');
      expect(stored.ownerId).toBe('user-abc');
      expect(stored.displayName).toBe('Work Calendar');
      expect(stored.color).toBe('#3366FF');
      expect(stored.dateCreated).toBe(NOW.toISOString());
      expect(stored.dateModified).toBe(NOW.toISOString());
      expect(stored.defaultPermission).toBe('viewer');
    });

    it('should round-trip hydrate → dehydrate → hydrate', () => {
      const original = sampleTyped({
        isSubscription: true,
        subscriptionUrl: 'https://example.com/cal.ics',
        subscriptionRefreshInterval: 30,
        subscriptionLastRefreshed: new Date('2025-05-30T08:00:00.000Z'),
      });
      const stored = calendarCollectionHydration.dehydrate(original);
      const rehydrated = calendarCollectionHydration.hydrate(stored);

      expect(rehydrated.id).toBe(original.id);
      expect(rehydrated.ownerId).toBe(original.ownerId);
      expect(rehydrated.displayName).toBe(original.displayName);
      expect(rehydrated.color).toBe(original.color);
      expect(rehydrated.isDefault).toBe(original.isDefault);
      expect(rehydrated.isSubscription).toBe(original.isSubscription);
      expect(rehydrated.subscriptionUrl).toBe(original.subscriptionUrl);
      expect(rehydrated.subscriptionRefreshInterval).toBe(
        original.subscriptionRefreshInterval,
      );
      expect(rehydrated.subscriptionLastRefreshed).toEqual(
        original.subscriptionLastRefreshed,
      );
      expect(rehydrated.defaultPermission).toBe(original.defaultPermission);
      expect(rehydrated.dateCreated).toEqual(original.dateCreated);
      expect(rehydrated.dateModified).toEqual(original.dateModified);
    });
  });

  describe('schema validation', () => {
    it('should accept a valid stored document', () => {
      const stored = sampleStored();
      const errors = validateDocument(
        stored,
        CALENDAR_COLLECTION_SCHEMA,
        CALENDAR_COLLECTIONS_COLLECTION,
      );
      expect(errors).toEqual([]);
    });

    it('should reject missing required fields', () => {
      const incomplete = {
        _id: 'cal-bad',
      } as unknown as IStoredCalendarCollection;
      expect(() =>
        validateDocument(
          incomplete,
          CALENDAR_COLLECTION_SCHEMA,
          CALENDAR_COLLECTIONS_COLLECTION,
        ),
      ).toThrow();
    });

    it('should reject invalid color format', () => {
      const stored = sampleStored({ color: 'red' });
      expect(() =>
        validateDocument(
          stored,
          CALENDAR_COLLECTION_SCHEMA,
          CALENDAR_COLLECTIONS_COLLECTION,
        ),
      ).toThrow();
    });

    it('should reject invalid permission value', () => {
      const stored = sampleStored({ defaultPermission: 'superadmin' });
      expect(() =>
        validateDocument(
          stored,
          CALENDAR_COLLECTION_SCHEMA,
          CALENDAR_COLLECTIONS_COLLECTION,
        ),
      ).toThrow();
    });

    it('should reject empty displayName', () => {
      const stored = sampleStored({ displayName: '' });
      expect(() =>
        validateDocument(
          stored,
          CALENDAR_COLLECTION_SCHEMA,
          CALENDAR_COLLECTIONS_COLLECTION,
        ),
      ).toThrow();
    });

    it('should accept all valid permission levels', () => {
      for (const perm of Object.values(CalendarPermissionLevel)) {
        const stored = sampleStored({ defaultPermission: perm });
        const errors = validateDocument(
          stored,
          CALENDAR_COLLECTION_SCHEMA,
          CALENDAR_COLLECTIONS_COLLECTION,
        );
        expect(errors).toEqual([]);
      }
    });
  });

  describe('model factory and CRUD', () => {
    it('should create a model from BrightDb', () => {
      const db = makeDb();
      const model = createCalendarCollectionModel(db);
      expect(model).toBeDefined();
      expect(model.collection).toBeDefined();
    });

    it('should insert and retrieve a calendar collection', async () => {
      const db = makeDb();
      const model = createCalendarCollectionModel(db);
      const typed = sampleTyped();

      await model.insertOne(typed);
      const found = await model.findOne({});

      expect(found).not.toBeNull();
      expect(found!.id).toBe('cal-001');
      expect(found!.displayName).toBe('Work Calendar');
      expect(found!.color).toBe('#3366FF');
      expect(found!.defaultPermission).toBe(CalendarPermissionLevel.Viewer);
      expect(found!.dateCreated).toEqual(NOW);
    });

    it('should find calendars by ownerId', async () => {
      const db = makeDb();
      const model = createCalendarCollectionModel(db);

      await model.insertOne(sampleTyped({ id: 'cal-1', ownerId: 'user-a' }));
      await model.insertOne(sampleTyped({ id: 'cal-2', ownerId: 'user-a' }));
      await model.insertOne(sampleTyped({ id: 'cal-3', ownerId: 'user-b' }));

      const results = await model.find({ ownerId: 'user-a' }).toArray();
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.ownerId === 'user-a')).toBe(true);
    });

    it('should update a calendar collection', async () => {
      const db = makeDb();
      const model = createCalendarCollectionModel(db);

      await model.insertOne(sampleTyped());
      await model.updateOne(
        { _id: 'cal-001' },
        { $set: { displayName: 'Updated Calendar', color: '#FF0000' } },
      );

      const found = await model.findOne({ _id: 'cal-001' });
      expect(found!.displayName).toBe('Updated Calendar');
      expect(found!.color).toBe('#FF0000');
    });

    it('should delete a calendar collection', async () => {
      const db = makeDb();
      const model = createCalendarCollectionModel(db);

      await model.insertOne(sampleTyped());
      const result = await model.deleteOne({ _id: 'cal-001' });
      expect(result.deletedCount).toBe(1);

      const found = await model.findOne({ _id: 'cal-001' });
      expect(found).toBeNull();
    });
  });

  describe('constants', () => {
    it('should export the correct collection name', () => {
      expect(CALENDAR_COLLECTIONS_COLLECTION).toBe('calendar_collections');
    });

    it('should define indexes in the schema', () => {
      expect(CALENDAR_COLLECTION_SCHEMA.indexes).toBeDefined();
      expect(CALENDAR_COLLECTION_SCHEMA.indexes!.length).toBeGreaterThan(0);
    });
  });
});
