/**
 * CalendarShare Model — unit tests.
 *
 * Tests hydration round-trip, schema validation, and model CRUD
 * for the calendar_shares collection.
 *
 * @see Requirements 6.1, 6.2, 6.3, 6.4
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
  CALENDAR_SHARE_SCHEMA,
  CALENDAR_SHARES_COLLECTION,
  calendarShareHydration,
  createCalendarShareModel,
  type IStoredCalendarShare,
  type ITypedCalendarShare,
} from '../calendarShare.model.ts';

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
  overrides: Partial<IStoredCalendarShare> = {},
): IStoredCalendarShare {
  return {
    _id: 'share-001',
    calendarId: 'cal-001',
    grantedToUserId: 'user-xyz',
    permission: CalendarPermissionLevel.Viewer,
    dateCreated: NOW.toISOString(),
    ...overrides,
  };
}

function sampleTyped(
  overrides: Partial<ITypedCalendarShare> = {},
): ITypedCalendarShare {
  return {
    id: 'share-001',
    calendarId: 'cal-001',
    grantedToUserId: 'user-xyz',
    permission: CalendarPermissionLevel.Viewer,
    dateCreated: NOW,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CalendarShare Model', () => {
  describe('hydration', () => {
    it('should hydrate stored document to typed form', () => {
      const stored = sampleStored();
      const typed = calendarShareHydration.hydrate(stored);

      expect(typed.id).toBe('share-001');
      expect(typed.calendarId).toBe('cal-001');
      expect(typed.grantedToUserId).toBe('user-xyz');
      expect(typed.grantedToGroupId).toBeUndefined();
      expect(typed.permission).toBe(CalendarPermissionLevel.Viewer);
      expect(typed.publicLink).toBeUndefined();
      expect(typed.expiresAt).toBeUndefined();
      expect(typed.dateCreated).toEqual(NOW);
    });

    it('should hydrate optional fields when present', () => {
      const expires = new Date('2025-12-31T23:59:59.000Z');
      const stored = sampleStored({
        grantedToGroupId: 'group-abc',
        grantedToUserId: undefined,
        publicLink: 'https://cal.example.com/share/abc123',
        expiresAt: expires.toISOString(),
      });
      const typed = calendarShareHydration.hydrate(stored);

      expect(typed.grantedToUserId).toBeUndefined();
      expect(typed.grantedToGroupId).toBe('group-abc');
      expect(typed.publicLink).toBe('https://cal.example.com/share/abc123');
      expect(typed.expiresAt).toEqual(expires);
    });

    it('should dehydrate typed document to stored form', () => {
      const typed = sampleTyped();
      const stored = calendarShareHydration.dehydrate(typed);

      expect(stored._id).toBe('share-001');
      expect(stored.calendarId).toBe('cal-001');
      expect(stored.grantedToUserId).toBe('user-xyz');
      expect(stored.permission).toBe('viewer');
      expect(stored.dateCreated).toBe(NOW.toISOString());
      expect(stored.expiresAt).toBeUndefined();
    });

    it('should dehydrate expiresAt when present', () => {
      const expires = new Date('2025-12-31T23:59:59.000Z');
      const typed = sampleTyped({ expiresAt: expires });
      const stored = calendarShareHydration.dehydrate(typed);

      expect(stored.expiresAt).toBe(expires.toISOString());
    });

    it('should round-trip hydrate → dehydrate → hydrate', () => {
      const original = sampleTyped({
        grantedToGroupId: 'group-team',
        grantedToUserId: undefined,
        publicLink: 'https://cal.example.com/share/xyz',
        expiresAt: new Date('2025-09-15T18:00:00.000Z'),
        permission: CalendarPermissionLevel.Editor,
      });
      const stored = calendarShareHydration.dehydrate(original);
      const rehydrated = calendarShareHydration.hydrate(stored);

      expect(rehydrated.id).toBe(original.id);
      expect(rehydrated.calendarId).toBe(original.calendarId);
      expect(rehydrated.grantedToUserId).toBe(original.grantedToUserId);
      expect(rehydrated.grantedToGroupId).toBe(original.grantedToGroupId);
      expect(rehydrated.permission).toBe(original.permission);
      expect(rehydrated.publicLink).toBe(original.publicLink);
      expect(rehydrated.expiresAt).toEqual(original.expiresAt);
      expect(rehydrated.dateCreated).toEqual(original.dateCreated);
    });
  });

  describe('schema validation', () => {
    it('should accept a valid stored document', () => {
      const stored = sampleStored();
      const errors = validateDocument(
        stored,
        CALENDAR_SHARE_SCHEMA,
        CALENDAR_SHARES_COLLECTION,
      );
      expect(errors).toEqual([]);
    });

    it('should accept a document with only group grant', () => {
      const stored = sampleStored({
        grantedToUserId: undefined,
        grantedToGroupId: 'group-abc',
      });
      const errors = validateDocument(
        stored,
        CALENDAR_SHARE_SCHEMA,
        CALENDAR_SHARES_COLLECTION,
      );
      expect(errors).toEqual([]);
    });

    it('should accept a document with public link', () => {
      const stored = sampleStored({
        grantedToUserId: undefined,
        publicLink: 'https://cal.example.com/share/abc',
      });
      const errors = validateDocument(
        stored,
        CALENDAR_SHARE_SCHEMA,
        CALENDAR_SHARES_COLLECTION,
      );
      expect(errors).toEqual([]);
    });

    it('should reject missing required fields', () => {
      const incomplete = {
        _id: 'share-bad',
      } as unknown as IStoredCalendarShare;
      expect(() =>
        validateDocument(
          incomplete,
          CALENDAR_SHARE_SCHEMA,
          CALENDAR_SHARES_COLLECTION,
        ),
      ).toThrow();
    });

    it('should reject invalid permission value', () => {
      const stored = sampleStored({ permission: 'superadmin' });
      expect(() =>
        validateDocument(
          stored,
          CALENDAR_SHARE_SCHEMA,
          CALENDAR_SHARES_COLLECTION,
        ),
      ).toThrow();
    });

    it('should reject empty calendarId', () => {
      const stored = sampleStored({ calendarId: '' });
      expect(() =>
        validateDocument(
          stored,
          CALENDAR_SHARE_SCHEMA,
          CALENDAR_SHARES_COLLECTION,
        ),
      ).toThrow();
    });

    it('should accept all valid permission levels', () => {
      for (const perm of Object.values(CalendarPermissionLevel)) {
        const stored = sampleStored({ permission: perm });
        const errors = validateDocument(
          stored,
          CALENDAR_SHARE_SCHEMA,
          CALENDAR_SHARES_COLLECTION,
        );
        expect(errors).toEqual([]);
      }
    });
  });

  describe('model factory and CRUD', () => {
    it('should create a model from BrightDb', () => {
      const db = makeDb();
      const model = createCalendarShareModel(db);
      expect(model).toBeDefined();
      expect(model.collection).toBeDefined();
    });

    it('should insert and retrieve a calendar share', async () => {
      const db = makeDb();
      const model = createCalendarShareModel(db);
      const typed = sampleTyped();

      await model.insertOne(typed);
      const found = await model.findOne({});

      expect(found).not.toBeNull();
      expect(found!.id).toBe('share-001');
      expect(found!.calendarId).toBe('cal-001');
      expect(found!.grantedToUserId).toBe('user-xyz');
      expect(found!.permission).toBe(CalendarPermissionLevel.Viewer);
      expect(found!.dateCreated).toEqual(NOW);
    });

    it('should find shares by calendarId', async () => {
      const db = makeDb();
      const model = createCalendarShareModel(db);

      await model.insertOne(
        sampleTyped({ id: 'share-1', calendarId: 'cal-a' }),
      );
      await model.insertOne(
        sampleTyped({ id: 'share-2', calendarId: 'cal-a' }),
      );
      await model.insertOne(
        sampleTyped({ id: 'share-3', calendarId: 'cal-b' }),
      );

      const results = await model.find({ calendarId: 'cal-a' }).toArray();
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.calendarId === 'cal-a')).toBe(true);
    });

    it('should find shares by grantedToUserId', async () => {
      const db = makeDb();
      const model = createCalendarShareModel(db);

      await model.insertOne(
        sampleTyped({ id: 'share-1', grantedToUserId: 'user-a' }),
      );
      await model.insertOne(
        sampleTyped({ id: 'share-2', grantedToUserId: 'user-b' }),
      );

      const results = await model.find({ grantedToUserId: 'user-a' }).toArray();
      expect(results).toHaveLength(1);
      expect(results[0].grantedToUserId).toBe('user-a');
    });

    it('should update a calendar share', async () => {
      const db = makeDb();
      const model = createCalendarShareModel(db);

      await model.insertOne(sampleTyped());
      await model.updateOne(
        { _id: 'share-001' },
        { $set: { permission: CalendarPermissionLevel.Editor } },
      );

      const found = await model.findOne({ _id: 'share-001' });
      expect(found!.permission).toBe(CalendarPermissionLevel.Editor);
    });

    it('should delete a calendar share', async () => {
      const db = makeDb();
      const model = createCalendarShareModel(db);

      await model.insertOne(sampleTyped());
      const result = await model.deleteOne({ _id: 'share-001' });
      expect(result.deletedCount).toBe(1);

      const found = await model.findOne({ _id: 'share-001' });
      expect(found).toBeNull();
    });
  });

  describe('constants', () => {
    it('should export the correct collection name', () => {
      expect(CALENDAR_SHARES_COLLECTION).toBe('calendar_shares');
    });

    it('should define indexes in the schema', () => {
      expect(CALENDAR_SHARE_SCHEMA.indexes).toBeDefined();
      expect(CALENDAR_SHARE_SCHEMA.indexes!.length).toBe(4);
    });

    it('should have a unique sparse index on publicLink', () => {
      const publicLinkIndex = CALENDAR_SHARE_SCHEMA.indexes!.find(
        (idx) => 'publicLink' in idx.fields,
      );
      expect(publicLinkIndex).toBeDefined();
      expect(publicLinkIndex!.options).toEqual({ unique: true, sparse: true });
    });
  });
});
