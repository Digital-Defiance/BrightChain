/**
 * Model — comprehensive tests.
 *
 * Tests the typed Model wrapper: hydration on reads, dehydration on writes,
 * schema validation, TypedCursor, and pass-through methods (replaceOne,
 * aggregate, distinct).
 */

import type { IHydrationSchema } from '@brightchain/brightchain-lib';
import { BrightDb } from '../lib/database';
import { InMemoryHeadRegistry } from '../lib/headRegistry';
import { Model, TypedCursor } from '../lib/model';
import type { CollectionSchema } from '../lib/schemaValidation';
import type { BsonDocument } from '../lib/types';
import { MockBlockStore } from './helpers/mockBlockStore';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Test types ──────────────────────────────────────────────────────────────

/** Stored form: all strings, extends BsonDocument */
interface IStoredItem extends BsonDocument {
  _id: string;
  name: string;
  count: string; // stored as string
  createdAt: string; // ISO date string
  active: boolean;
}

/** Typed form: proper types */
interface ITypedItem {
  _id: number;
  name: string;
  count: number;
  createdAt: Date;
  active: boolean;
}

// ─── Hydration schema ────────────────────────────────────────────────────────

const itemHydration: IHydrationSchema<IStoredItem, ITypedItem> = {
  hydrate: (stored: IStoredItem): ITypedItem => ({
    _id: parseInt(stored._id, 10),
    name: stored.name,
    count: parseInt(stored.count, 10),
    createdAt: new Date(stored.createdAt),
    active: stored.active,
  }),
  dehydrate: (typed: ITypedItem): IStoredItem => ({
    _id: String(typed._id),
    name: typed.name,
    count: String(typed.count),
    createdAt: typed.createdAt.toISOString(),
    active: typed.active,
  }),
};

// ─── Schema for validation ───────────────────────────────────────────────────

const ITEM_SCHEMA: CollectionSchema = {
  name: 'items',
  properties: {
    _id: { type: 'string' },
    name: { type: 'string' },
    count: { type: 'string' },
    createdAt: { type: 'string' },
    active: { type: 'boolean' },
  },
  required: ['_id', 'name', 'count', 'createdAt', 'active'],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDb(name = 'testdb'): BrightDb {
  const store = new MockBlockStore();
  const registry = InMemoryHeadRegistry.createIsolated();
  return new BrightDb(store as any, { name, headRegistry: registry });
}

function makeModel(
  db: BrightDb,
  collectionName = 'items',
  schema?: CollectionSchema,
): Model<IStoredItem, ITypedItem> {
  const coll = db.collection<IStoredItem>(collectionName);
  return new Model(coll, {
    schema,
    hydration: itemHydration,
    collectionName,
  });
}

function sampleTyped(id = 1): ITypedItem {
  return {
    _id: id,
    name: `item-${id}`,
    count: id * 10,
    createdAt: new Date('2025-01-15T12:00:00.000Z'),
    active: true,
  };
}

// ══════════════════════════════════════════════════════════════
// Construction & basics
// ══════════════════════════════════════════════════════════════

describe('Model — basics', () => {
  it('should expose the underlying collection', () => {
    const db = makeDb();
    const model = makeModel(db);
    expect(model.collection).toBeDefined();
  });

  it('should hydrate a stored document', () => {
    const db = makeDb();
    const model = makeModel(db);
    const stored: IStoredItem = {
      _id: '42',
      name: 'widget',
      count: '7',
      createdAt: '2025-01-15T12:00:00.000Z',
      active: true,
    };
    const typed = model.hydrate(stored);
    expect(typed._id).toBe(42);
    expect(typed.count).toBe(7);
    expect(typed.createdAt).toBeInstanceOf(Date);
    expect(typed.name).toBe('widget');
  });

  it('should dehydrate a typed document', () => {
    const db = makeDb();
    const model = makeModel(db);
    const typed = sampleTyped(5);
    const stored = model.dehydrate(typed);
    expect(stored._id).toBe('5');
    expect(stored.count).toBe('50');
    expect(typeof stored.createdAt).toBe('string');
  });
});

// ══════════════════════════════════════════════════════════════
// Validation
// ══════════════════════════════════════════════════════════════

describe('Model — validation', () => {
  it('should return empty array for valid documents', () => {
    const db = makeDb();
    const model = makeModel(db, 'items', ITEM_SCHEMA);
    const errors = model.validate(sampleTyped());
    expect(errors).toEqual([]);
  });

  it('should skip validation when no schema is provided', () => {
    const db = makeDb();
    const model = makeModel(db); // no schema
    const errors = model.validate(sampleTyped());
    expect(errors).toEqual([]);
  });

  it('should return errors for invalid documents', () => {
    const db = makeDb();
    const model = makeModel(db, 'items', ITEM_SCHEMA);
    // Missing required 'name' field
    const bad = { ...sampleTyped(), name: undefined } as unknown as ITypedItem;
    const errors = model.validate(bad);
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════════════
// Writes — insertOne / insertMany
// ══════════════════════════════════════════════════════════════

describe('Model — writes', () => {
  it('insertOne should dehydrate and store', async () => {
    const db = makeDb();
    const model = makeModel(db);
    const typed = sampleTyped(1);
    const result = await model.insertOne(typed);
    expect(result.insertedId).toBeDefined();

    // Verify stored form via raw collection
    const raw = await model.collection.findById(result.insertedId);
    expect(raw).not.toBeNull();
    expect(raw!._id).toBe('1');
    expect(raw!.count).toBe('10');
    expect(typeof raw!.createdAt).toBe('string');
  });

  it('insertMany should dehydrate all documents', async () => {
    const db = makeDb();
    const model = makeModel(db);
    const docs = [sampleTyped(1), sampleTyped(2), sampleTyped(3)];
    const result = await model.insertMany(docs);
    expect(result.insertedCount).toBe(3);

    const count = await model.countDocuments();
    expect(count).toBe(3);
  });

  it('insertOne should validate when schema is set', async () => {
    const db = makeDb();
    const model = makeModel(db, 'items', ITEM_SCHEMA);
    const bad = {
      ...sampleTyped(),
      name: undefined,
    } as unknown as ITypedItem;
    await expect(model.insertOne(bad)).rejects.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════
// Reads — findOne / find / findById
// ══════════════════════════════════════════════════════════════

describe('Model — reads', () => {
  it('findOne should return hydrated document', async () => {
    const db = makeDb();
    const model = makeModel(db);
    await model.insertOne(sampleTyped(1));

    const found = await model.findOne({ _id: '1' });
    expect(found).not.toBeNull();
    expect(found!._id).toBe(1);
    expect(found!.count).toBe(10);
    expect(found!.createdAt).toBeInstanceOf(Date);
  });

  it('findOne should return null when not found', async () => {
    const db = makeDb();
    const model = makeModel(db);
    const found = await model.findOne({ _id: 'nonexistent' });
    expect(found).toBeNull();
  });

  it('findById should return hydrated document', async () => {
    const db = makeDb();
    const model = makeModel(db);
    const result = await model.insertOne(sampleTyped(42));

    const found = await model.findById(result.insertedId);
    expect(found).not.toBeNull();
    expect(found!._id).toBe(42);
  });

  it('find should return a TypedCursor', async () => {
    const db = makeDb();
    const model = makeModel(db);
    await model.insertMany([sampleTyped(1), sampleTyped(2)]);

    const cursor = model.find({});
    expect(cursor).toBeInstanceOf(TypedCursor);

    const docs = await cursor.toArray();
    expect(docs).toHaveLength(2);
    expect(docs[0]._id).toBe(1);
    expect(docs[0].createdAt).toBeInstanceOf(Date);
  });

  it('find cursor should be directly awaitable', async () => {
    const db = makeDb();
    const model = makeModel(db);
    await model.insertOne(sampleTyped(1));

    const docs = await model.find({});
    expect(docs).toHaveLength(1);
    expect(docs[0]._id).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════
// TypedCursor
// ══════════════════════════════════════════════════════════════

describe('TypedCursor', () => {
  it('should support skip and limit', async () => {
    const db = makeDb();
    const model = makeModel(db);
    await model.insertMany([sampleTyped(1), sampleTyped(2), sampleTyped(3)]);

    const docs = await model.find({}).skip(1).limit(1).toArray();
    expect(docs).toHaveLength(1);
  });

  it('should support count', async () => {
    const db = makeDb();
    const model = makeModel(db);
    await model.insertMany([sampleTyped(1), sampleTyped(2)]);

    const count = await model.find({}).count();
    expect(count).toBe(2);
  });

  it('should support next/hasNext iteration', async () => {
    const db = makeDb();
    const model = makeModel(db);
    await model.insertMany([sampleTyped(1), sampleTyped(2)]);

    const cursor = model.find({});
    const first = await cursor.next();
    expect(first).not.toBeNull();
    expect(first!.createdAt).toBeInstanceOf(Date);
  });

  it('should support forEach', async () => {
    const db = makeDb();
    const model = makeModel(db);
    await model.insertMany([sampleTyped(1), sampleTyped(2)]);

    const ids: number[] = [];
    await model.find({}).forEach((doc) => {
      ids.push(doc._id);
    });
    expect(ids).toHaveLength(2);
  });

  it('should support map', async () => {
    const db = makeDb();
    const model = makeModel(db);
    await model.insertMany([sampleTyped(1), sampleTyped(2)]);

    const names = await model.find({}).map((doc) => doc.name);
    expect(names).toEqual(['item-1', 'item-2']);
  });
});

// ══════════════════════════════════════════════════════════════
// Updates & deletes (pass-through on stored types)
// ══════════════════════════════════════════════════════════════

describe('Model — updates & deletes', () => {
  it('updateOne should work on stored field values', async () => {
    const db = makeDb();
    const model = makeModel(db);
    await model.insertOne(sampleTyped(1));

    const result = await model.updateOne(
      { _id: '1' },
      { $set: { name: 'updated' } },
    );
    expect(result.modifiedCount).toBe(1);

    const found = await model.findOne({ _id: '1' });
    expect(found!.name).toBe('updated');
  });

  it('updateMany should update multiple documents', async () => {
    const db = makeDb();
    const model = makeModel(db);
    await model.insertMany([sampleTyped(1), sampleTyped(2)]);

    const result = await model.updateMany({}, { $set: { active: false } });
    expect(result.modifiedCount).toBe(2);
  });

  it('deleteOne should remove a document', async () => {
    const db = makeDb();
    const model = makeModel(db);
    await model.insertOne(sampleTyped(1));

    const result = await model.deleteOne({ _id: '1' });
    expect(result.deletedCount).toBe(1);

    const count = await model.countDocuments();
    expect(count).toBe(0);
  });

  it('deleteMany should remove multiple documents', async () => {
    const db = makeDb();
    const model = makeModel(db);
    await model.insertMany([sampleTyped(1), sampleTyped(2), sampleTyped(3)]);

    const result = await model.deleteMany({});
    expect(result.deletedCount).toBe(3);
  });
});

// ══════════════════════════════════════════════════════════════
// replaceOne
// ══════════════════════════════════════════════════════════════

describe('Model — replaceOne', () => {
  it('should dehydrate the replacement and store it', async () => {
    const db = makeDb();
    const model = makeModel(db);
    await model.insertOne(sampleTyped(1));

    const replacement: ITypedItem = {
      ...sampleTyped(1),
      name: 'replaced',
      count: 999,
    };
    const result = await model.replaceOne({ _id: '1' }, replacement);
    expect(result.modifiedCount).toBe(1);

    const found = await model.findOne({ _id: '1' });
    expect(found!.name).toBe('replaced');
    expect(found!.count).toBe(999);
  });

  it('should return matchedCount 0 when no match', async () => {
    const db = makeDb();
    const model = makeModel(db);
    const result = await model.replaceOne(
      { _id: 'nonexistent' },
      sampleTyped(1),
    );
    expect(result.matchedCount).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// aggregate & distinct
// ══════════════════════════════════════════════════════════════

describe('Model — aggregate & distinct', () => {
  it('aggregate should pass through to collection', async () => {
    const db = makeDb();
    const model = makeModel(db);
    await model.insertMany([sampleTyped(1), sampleTyped(2)]);

    const results = await model.aggregate([{ $match: {} }]);
    expect(results).toHaveLength(2);
  });

  it('distinct should return unique stored values', async () => {
    const db = makeDb();
    const model = makeModel(db);
    await model.insertMany([sampleTyped(1), sampleTyped(2)]);

    const names = await model.distinct('name');
    expect(names).toHaveLength(2);
    expect(names).toContain('item-1');
    expect(names).toContain('item-2');
  });
});

// ══════════════════════════════════════════════════════════════
// Convenience methods
// ══════════════════════════════════════════════════════════════

describe('Model — convenience', () => {
  it('countDocuments should count matching docs', async () => {
    const db = makeDb();
    const model = makeModel(db);
    await model.insertMany([sampleTyped(1), sampleTyped(2)]);

    expect(await model.countDocuments()).toBe(2);
    expect(await model.countDocuments({ _id: '1' })).toBe(1);
  });

  it('estimatedDocumentCount should return total count', async () => {
    const db = makeDb();
    const model = makeModel(db);
    await model.insertMany([sampleTyped(1), sampleTyped(2), sampleTyped(3)]);

    expect(await model.estimatedDocumentCount()).toBe(3);
  });

  it('exists should return true when document exists', async () => {
    const db = makeDb();
    const model = makeModel(db);
    await model.insertOne(sampleTyped(1));

    expect(await model.exists({ _id: '1' })).toBe(true);
    expect(await model.exists({ _id: 'nope' })).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// db.model() registry integration
// ══════════════════════════════════════════════════════════════

describe('BrightDb.model() registry', () => {
  it('should register and retrieve a model', () => {
    const db = makeDb();
    const model = db.model<IStoredItem, ITypedItem>('items', {
      hydration: itemHydration,
    });
    expect(model).toBeInstanceOf(Model);
    expect(db.hasModel('items')).toBe(true);
  });

  it('should return the same model on subsequent calls', () => {
    const db = makeDb();
    const m1 = db.model<IStoredItem, ITypedItem>('items', {
      hydration: itemHydration,
    });
    const m2 = db.model<IStoredItem, ITypedItem>('items');
    expect(m1).toBe(m2);
  });

  it('should throw when retrieving unregistered model without options', () => {
    const db = makeDb();
    expect(() => db.model('nonexistent')).toThrow(/not been registered/);
  });

  it('should list registered model names', () => {
    const db = makeDb();
    db.model<IStoredItem, ITypedItem>('items', { hydration: itemHydration });
    db.model<IStoredItem, ITypedItem>('other', { hydration: itemHydration });
    expect(db.listModels()).toEqual(['items', 'other']);
  });

  it('registered model should work end-to-end', async () => {
    const db = makeDb();
    const model = db.model<IStoredItem, ITypedItem>('items', {
      hydration: itemHydration,
    });

    await model.insertOne(sampleTyped(1));
    const found = await model.findOne({ _id: '1' });
    expect(found).not.toBeNull();
    expect(found!._id).toBe(1);
    expect(found!.createdAt).toBeInstanceOf(Date);
  });
});
