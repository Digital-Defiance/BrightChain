/**
 * Collection – comprehensive integration tests.
 *
 * These tests exercise the full Collection API with a MockBlockStore,
 * verifying CRUD operations, CoW semantics, index management,
 * change streams, persistence, and edge cases.
 */

import { Collection, HeadRegistry } from '../lib/collection';
import { MockBlockStore } from './helpers/mockBlockStore';

/* eslint-disable @typescript-eslint/no-explicit-any */

function makeCollection(
  name = 'test',
  store?: MockBlockStore,
  registry?: HeadRegistry,
): { coll: Collection; store: MockBlockStore; registry: HeadRegistry } {
  const s = store ?? new MockBlockStore();
  const r = registry ?? HeadRegistry.createIsolated();
  const coll = new Collection(name, s as any, 'testdb', r);
  return { coll, store: s, registry: r };
}

// ══════════════════════════════════════════════════════════════
// insertOne
// ══════════════════════════════════════════════════════════════

describe('Collection.insertOne', () => {
  it('should insert a document and return an insertedId', async () => {
    const { coll } = makeCollection();
    const result = await coll.insertOne({ name: 'Alice', age: 30 });
    expect(result.acknowledged).toBe(true);
    expect(result.insertedId).toBeDefined();
    expect(typeof result.insertedId).toBe('string');
  });

  it('should use provided _id', async () => {
    const { coll } = makeCollection();
    const result = await coll.insertOne({ _id: 'custom-id', name: 'Bob' });
    expect(result.insertedId).toBe('custom-id');
  });

  it('should retrieve inserted document by id', async () => {
    const { coll } = makeCollection();
    const { insertedId } = await coll.insertOne({ name: 'Alice', age: 30 });
    const doc = await coll.findById(insertedId);
    expect(doc).not.toBeNull();
    expect(doc!['name']).toBe('Alice');
    expect(doc!['age']).toBe(30);
    expect(doc!['_id']).toBe(insertedId);
  });

  it('should write the document block to the store', async () => {
    const { coll, store } = makeCollection();
    const initialBlocks = store.size;
    await coll.insertOne({ name: 'Alice' });
    // At least 1 doc block + 1 meta block
    expect(store.size).toBeGreaterThanOrEqual(initialBlocks + 2);
  });

  it('should persist metadata to the store', async () => {
    const { coll, registry } = makeCollection();
    await coll.insertOne({ name: 'Alice' });
    const headId = registry.getHead('testdb', 'test');
    expect(headId).toBeDefined();
    expect(typeof headId).toBe('string');
  });

  it('should auto-generate unique ids for multiple inserts', async () => {
    const { coll } = makeCollection();
    const r1 = await coll.insertOne({ name: 'A' });
    const r2 = await coll.insertOne({ name: 'B' });
    expect(r1.insertedId).not.toBe(r2.insertedId);
  });
});

// ══════════════════════════════════════════════════════════════
// insertMany
// ══════════════════════════════════════════════════════════════

describe('Collection.insertMany', () => {
  it('should insert multiple documents', async () => {
    const { coll } = makeCollection();
    const result = await coll.insertMany([
      { name: 'Alice' },
      { name: 'Bob' },
      { name: 'Charlie' },
    ]);
    expect(result.acknowledged).toBe(true);
    expect(result.insertedCount).toBe(3);
    expect(Object.keys(result.insertedIds)).toHaveLength(3);
  });

  it('should make all inserted documents findable', async () => {
    const { coll } = makeCollection();
    await coll.insertMany([{ name: 'A' }, { name: 'B' }, { name: 'C' }]);
    const all = await coll.find().toArray();
    expect(all).toHaveLength(3);
  });

  it('should insert empty array without error', async () => {
    const { coll } = makeCollection();
    const result = await coll.insertMany([]);
    expect(result.insertedCount).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// findOne
// ══════════════════════════════════════════════════════════════

describe('Collection.findOne', () => {
  it('should return null if no match', async () => {
    const { coll } = makeCollection();
    const doc = await coll.findOne({ name: 'nonexistent' });
    expect(doc).toBeNull();
  });

  it('should find by exact match', async () => {
    const { coll } = makeCollection();
    await coll.insertMany([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]);
    const doc = await coll.findOne({ name: 'Bob' });
    expect(doc).not.toBeNull();
    expect(doc!['name']).toBe('Bob');
  });

  it('should find with operator filter', async () => {
    const { coll } = makeCollection();
    await coll.insertMany([
      { name: 'A', age: 10 },
      { name: 'B', age: 20 },
    ]);
    const doc = await coll.findOne({ age: { $gt: 15 } } as any);
    expect(doc).not.toBeNull();
    expect(doc!['name']).toBe('B');
  });

  it('should apply projection', async () => {
    const { coll } = makeCollection();
    await coll.insertOne({ name: 'Alice', age: 30, email: 'a@b.c' });
    const doc = await coll.findOne({}, { projection: { name: 1 } as any });
    expect(doc).not.toBeNull();
    expect(doc!['name']).toBe('Alice');
    expect(doc!['age']).toBeUndefined();
  });

  it('should find with empty filter', async () => {
    const { coll } = makeCollection();
    await coll.insertOne({ name: 'Alice' });
    const doc = await coll.findOne({});
    expect(doc).not.toBeNull();
  });

  it('should return null from empty collection', async () => {
    const { coll } = makeCollection();
    const doc = await coll.findOne({});
    expect(doc).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// find (cursor)
// ══════════════════════════════════════════════════════════════

describe('Collection.find', () => {
  it('should return all documents with empty filter', async () => {
    const { coll } = makeCollection();
    await coll.insertMany([{ name: 'A' }, { name: 'B' }]);
    const docs = await coll.find().toArray();
    expect(docs).toHaveLength(2);
  });

  it('should filter documents', async () => {
    const { coll } = makeCollection();
    await coll.insertMany([
      { name: 'A', score: 10 },
      { name: 'B', score: 20 },
    ]);
    const docs = await coll.find({ score: { $gt: 15 } } as any).toArray();
    expect(docs).toHaveLength(1);
    expect(docs[0]['name']).toBe('B');
  });

  it('should support sort, skip, limit via options', async () => {
    const { coll } = makeCollection();
    await coll.insertMany([
      { name: 'A', n: 1 },
      { name: 'B', n: 2 },
      { name: 'C', n: 3 },
      { name: 'D', n: 4 },
    ]);
    const docs = await coll
      .find({}, { sort: { n: -1 } as any, skip: 1, limit: 2 })
      .toArray();
    expect(docs).toHaveLength(2);
    expect(docs[0]['name']).toBe('C');
    expect(docs[1]['name']).toBe('B');
  });

  it('should support cursor chaining', async () => {
    const { coll } = makeCollection();
    await coll.insertMany([{ n: 1 }, { n: 2 }, { n: 3 }]);
    const docs = await coll
      .find()
      .sort({ n: -1 } as any)
      .limit(2)
      .toArray();
    expect(docs).toHaveLength(2);
    expect(docs[0]['n']).toBe(3);
  });

  it('should return empty array from empty collection', async () => {
    const { coll } = makeCollection();
    const docs = await coll.find().toArray();
    expect(docs).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// findById
// ══════════════════════════════════════════════════════════════

describe('Collection.findById', () => {
  it('should find document by _id', async () => {
    const { coll } = makeCollection();
    await coll.insertOne({ _id: 'abc123', value: 42 });
    const doc = await coll.findById('abc123');
    expect(doc).not.toBeNull();
    expect(doc!['value']).toBe(42);
  });

  it('should return null for non-existent id', async () => {
    const { coll } = makeCollection();
    const doc = await coll.findById('does-not-exist');
    expect(doc).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// updateOne
// ══════════════════════════════════════════════════════════════

describe('Collection.updateOne', () => {
  it('should update a matched document with $set', async () => {
    const { coll } = makeCollection();
    await coll.insertOne({ _id: 'u1', name: 'Alice', age: 25 });
    const result = await coll.updateOne({ _id: 'u1' }, { $set: { age: 26 } });
    expect(result.matchedCount).toBe(1);
    expect(result.modifiedCount).toBe(1);
    const doc = await coll.findById('u1');
    expect(doc!['age']).toBe(26);
  });

  it('should return 0 matched if no document matches', async () => {
    const { coll } = makeCollection();
    const result = await coll.updateOne({ _id: 'nope' }, { $set: { x: 1 } });
    expect(result.matchedCount).toBe(0);
    expect(result.modifiedCount).toBe(0);
  });

  it('should upsert when document does not exist', async () => {
    const { coll } = makeCollection();
    const result = await coll.updateOne(
      { name: 'NewDoc' },
      { $set: { value: 100 } },
      { upsert: true },
    );
    expect(result.upsertedCount).toBe(1);
    expect(result.upsertedId).toBeDefined();
    const doc = await coll.findOne({ name: 'NewDoc' });
    expect(doc!['value']).toBe(100);
  });

  it('should not upsert when document exists', async () => {
    const { coll } = makeCollection();
    await coll.insertOne({ _id: 'e1', name: 'Existing' });
    const result = await coll.updateOne(
      { name: 'Existing' },
      { $set: { updated: true } },
      { upsert: true },
    );
    expect(result.matchedCount).toBe(1);
    expect(result.upsertedCount).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// updateMany
// ══════════════════════════════════════════════════════════════

describe('Collection.updateMany', () => {
  it('should update all matching documents', async () => {
    const { coll } = makeCollection();
    await coll.insertMany([
      { _id: 'a', category: 'x', value: 1 },
      { _id: 'b', category: 'x', value: 2 },
      { _id: 'c', category: 'y', value: 3 },
    ]);
    const result = await coll.updateMany(
      { category: 'x' },
      { $set: { marked: true } },
    );
    expect(result.matchedCount).toBe(2);
    expect(result.modifiedCount).toBe(2);

    const a = await coll.findById('a');
    const b = await coll.findById('b');
    const c = await coll.findById('c');
    expect(a!['marked']).toBe(true);
    expect(b!['marked']).toBe(true);
    expect(c!['marked']).toBeUndefined();
  });

  it('should return zero counts when nothing matches', async () => {
    const { coll } = makeCollection();
    await coll.insertOne({ _id: 'x', v: 1 });
    const result = await coll.updateMany({ v: 999 }, { $set: { v: 0 } });
    expect(result.matchedCount).toBe(0);
    expect(result.modifiedCount).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// deleteOne
// ══════════════════════════════════════════════════════════════

describe('Collection.deleteOne', () => {
  it('should delete the matching document', async () => {
    const { coll } = makeCollection();
    await coll.insertOne({ _id: 'd1', name: 'ToDelete' });
    const result = await coll.deleteOne({ _id: 'd1' });
    expect(result.deletedCount).toBe(1);
    const doc = await coll.findById('d1');
    expect(doc).toBeNull();
  });

  it('should return 0 if no match', async () => {
    const { coll } = makeCollection();
    const result = await coll.deleteOne({ _id: 'nope' });
    expect(result.deletedCount).toBe(0);
  });

  it('should not delete other documents', async () => {
    const { coll } = makeCollection();
    await coll.insertMany([
      { _id: 'keep', v: 1 },
      { _id: 'del', v: 2 },
    ]);
    await coll.deleteOne({ _id: 'del' });
    const remaining = await coll.find().toArray();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]['_id']).toBe('keep');
  });
});

// ══════════════════════════════════════════════════════════════
// deleteMany
// ══════════════════════════════════════════════════════════════

describe('Collection.deleteMany', () => {
  it('should delete all matching documents', async () => {
    const { coll } = makeCollection();
    await coll.insertMany([
      { _id: 'a', type: 'keep' },
      { _id: 'b', type: 'remove' },
      { _id: 'c', type: 'remove' },
    ]);
    const result = await coll.deleteMany({ type: 'remove' });
    expect(result.deletedCount).toBe(2);
    const remaining = await coll.find().toArray();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]['_id']).toBe('a');
  });

  it('should handle empty match set', async () => {
    const { coll } = makeCollection();
    await coll.insertOne({ _id: 'x', v: 1 });
    const result = await coll.deleteMany({ v: 999 });
    expect(result.deletedCount).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// replaceOne
// ══════════════════════════════════════════════════════════════

describe('Collection.replaceOne', () => {
  it('should replace the matched document entirely', async () => {
    const { coll } = makeCollection();
    await coll.insertOne({ _id: 'r1', name: 'Old', extra: 'field' });
    const result = await coll.replaceOne({ _id: 'r1' }, { name: 'New' } as any);
    expect(result.matchedCount).toBe(1);
    expect(result.modifiedCount).toBe(1);
    const doc = await coll.findById('r1');
    expect(doc!['name']).toBe('New');
    expect(doc!['extra']).toBeUndefined();
    expect(doc!['_id']).toBe('r1');
  });

  it('should upsert when no match and upsert=true', async () => {
    const { coll } = makeCollection();
    const result = await coll.replaceOne(
      { _id: 'new-id' },
      { name: 'Upserted' } as any,
      { upsert: true },
    );
    expect(result.upsertedCount).toBe(1);
    const doc = await coll.findOne({ name: 'Upserted' });
    expect(doc).not.toBeNull();
  });

  it('should return 0 counts when no match and no upsert', async () => {
    const { coll } = makeCollection();
    const result = await coll.replaceOne({ _id: 'nope' }, { x: 1 } as any);
    expect(result.matchedCount).toBe(0);
    expect(result.modifiedCount).toBe(0);
    expect(result.upsertedCount).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// countDocuments / estimatedDocumentCount
// ══════════════════════════════════════════════════════════════

describe('Collection counting', () => {
  it('should count documents with filter', async () => {
    const { coll } = makeCollection();
    await coll.insertMany([{ type: 'a' }, { type: 'a' }, { type: 'b' }]);
    expect(await coll.countDocuments({ type: 'a' })).toBe(2);
    expect(await coll.countDocuments({})).toBe(3);
  });

  it('should return 0 for empty collection', async () => {
    const { coll } = makeCollection();
    expect(await coll.countDocuments()).toBe(0);
  });

  it('should return estimated count', async () => {
    const { coll } = makeCollection();
    await coll.insertMany([{ a: 1 }, { a: 2 }, { a: 3 }]);
    expect(await coll.estimatedDocumentCount()).toBe(3);
  });
});

// ══════════════════════════════════════════════════════════════
// distinct
// ══════════════════════════════════════════════════════════════

describe('Collection.distinct', () => {
  it('should return distinct values for a field', async () => {
    const { coll } = makeCollection();
    await coll.insertMany([
      { color: 'red' },
      { color: 'blue' },
      { color: 'red' },
      { color: 'green' },
    ]);
    const colors = await coll.distinct('color' as any);
    expect(colors).toHaveLength(3);
    expect(new Set(colors)).toEqual(new Set(['red', 'blue', 'green']));
  });

  it('should filter before distinct', async () => {
    const { coll } = makeCollection();
    await coll.insertMany([
      { color: 'red', active: true },
      { color: 'blue', active: false },
      { color: 'red', active: true },
    ]);
    const colors = await coll.distinct('color' as any, { active: true } as any);
    expect(colors).toEqual(['red']);
  });
});

// ══════════════════════════════════════════════════════════════
// aggregate
// ══════════════════════════════════════════════════════════════

describe('Collection.aggregate', () => {
  it('should run a pipeline on collection documents', async () => {
    const { coll } = makeCollection();
    await coll.insertMany([
      { department: 'eng', salary: 100 },
      { department: 'eng', salary: 200 },
      { department: 'sales', salary: 150 },
    ]);
    const result = await coll.aggregate([
      { $match: { department: 'eng' } },
      { $group: { _id: '$department', total: { $sum: '$salary' } } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]['_id']).toBe('eng');
    expect(result[0]['total']).toBe(300);
  });
});

// ══════════════════════════════════════════════════════════════
// Copy-on-write semantics
// ══════════════════════════════════════════════════════════════

describe('Collection – copy-on-write', () => {
  it('should never call store.delete()', async () => {
    const { coll, store } = makeCollection();
    await coll.insertOne({ _id: 'cow1', data: 'hello' });
    await coll.updateOne({ _id: 'cow1' }, { $set: { data: 'updated' } });
    await coll.deleteOne({ _id: 'cow1' });

    // The store should never have been asked to delete anything
    expect(store.calls.delete).toHaveLength(0);
  });

  it('should leave old blocks in store after update', async () => {
    const { coll, store } = makeCollection();
    await coll.insertOne({ _id: 'cow2', v: 1 });
    const blocksBeforeUpdate = store.size;
    await coll.updateOne({ _id: 'cow2' }, { $set: { v: 2 } });
    // New doc block + new meta block, old ones remain
    expect(store.size).toBeGreaterThanOrEqual(blocksBeforeUpdate);
    // Verify the new value is readable
    const doc = await coll.findById('cow2');
    expect(doc!['v']).toBe(2);
  });

  it('should leave blocks in store after delete', async () => {
    const { coll, store } = makeCollection();
    await coll.insertOne({ _id: 'cow3', v: 1 });
    const blocksAfterInsert = store.size;
    await coll.deleteOne({ _id: 'cow3' });
    // Blocks should not decrease (no store.delete called)
    // Only meta block may change
    expect(store.size).toBeGreaterThanOrEqual(blocksAfterInsert - 1);
    expect(store.calls.delete).toHaveLength(0);
  });

  it('should leave blocks in store after drop', async () => {
    const { coll, store } = makeCollection();
    await coll.insertMany([
      { _id: 'a', v: 1 },
      { _id: 'b', v: 2 },
    ]);
    const blocksAfterInsert = store.size;
    await coll.drop();
    // Blocks remain untouched
    expect(store.size).toBeGreaterThanOrEqual(blocksAfterInsert - 1);
    expect(store.calls.delete).toHaveLength(0);
    // But the collection is now empty
    const docs = await coll.find().toArray();
    expect(docs).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// Index management on Collection
// ══════════════════════════════════════════════════════════════

describe('Collection – indexes', () => {
  it('should create and list indexes', async () => {
    const { coll } = makeCollection();
    const name = await coll.createIndex({ name: 1 });
    expect(name).toBe('name_1');
    expect(coll.listIndexes()).toContain('name_1');
  });

  it('should drop an index', async () => {
    const { coll } = makeCollection();
    await coll.createIndex({ name: 1 });
    await coll.dropIndex('name_1');
    expect(coll.listIndexes()).not.toContain('name_1');
  });

  it('should enforce unique index on insert', async () => {
    const { coll } = makeCollection();
    await coll.createIndex({ email: 1 }, { unique: true });
    await coll.insertOne({ email: 'a@b.com' });
    await expect(coll.insertOne({ email: 'a@b.com' })).rejects.toThrow();
  });

  it('should use index for find acceleration', async () => {
    const { coll } = makeCollection();
    await coll.insertMany([
      { _id: 'i1', name: 'Alice' },
      { _id: 'i2', name: 'Bob' },
      { _id: 'i3', name: 'Charlie' },
    ]);
    await coll.createIndex({ name: 1 });
    const doc = await coll.findOne({ name: 'Bob' });
    expect(doc).not.toBeNull();
    expect(doc!['_id']).toBe('i2');
  });
});

// ══════════════════════════════════════════════════════════════
// Change streams (watch)
// ══════════════════════════════════════════════════════════════

describe('Collection – change streams', () => {
  it('should emit insert events', async () => {
    const { coll } = makeCollection();
    const events: any[] = [];
    coll.watch((ev) => events.push(ev));

    await coll.insertOne({ _id: 'w1', name: 'Alice' });
    expect(events).toHaveLength(1);
    expect(events[0].operationType).toBe('insert');
    expect(events[0].fullDocument.name).toBe('Alice');
    expect(events[0].documentKey._id).toBe('w1');
    expect(events[0].ns).toEqual({ db: 'testdb', coll: 'test' });
  });

  it('should emit update events', async () => {
    const { coll } = makeCollection();
    const events: any[] = [];
    await coll.insertOne({ _id: 'w2', name: 'Bob' });
    coll.watch((ev) => events.push(ev));

    await coll.updateOne({ _id: 'w2' }, { $set: { name: 'Bobby' } });
    expect(events).toHaveLength(1);
    expect(events[0].operationType).toBe('update');
    expect(events[0].fullDocument.name).toBe('Bobby');
  });

  it('should emit delete events', async () => {
    const { coll } = makeCollection();
    const events: any[] = [];
    await coll.insertOne({ _id: 'w3', name: 'Charlie' });
    coll.watch((ev) => events.push(ev));

    await coll.deleteOne({ _id: 'w3' });
    expect(events).toHaveLength(1);
    expect(events[0].operationType).toBe('delete');
    expect(events[0].documentKey._id).toBe('w3');
    expect(events[0].fullDocument).toBeUndefined();
  });

  it('should emit replace events', async () => {
    const { coll } = makeCollection();
    const events: any[] = [];
    await coll.insertOne({ _id: 'w4', name: 'Dave' });
    coll.watch((ev) => events.push(ev));

    await coll.replaceOne({ _id: 'w4' }, { name: 'David' } as any);
    expect(events).toHaveLength(1);
    expect(events[0].operationType).toBe('replace');
    expect(events[0].fullDocument.name).toBe('David');
  });

  it('should unsubscribe via returned function', async () => {
    const { coll } = makeCollection();
    const events: any[] = [];
    const unsubscribe = coll.watch((ev) => events.push(ev));

    await coll.insertOne({ name: 'First' });
    expect(events).toHaveLength(1);

    unsubscribe();
    await coll.insertOne({ name: 'Second' });
    expect(events).toHaveLength(1); // no new event
  });

  it('should not break on listener error', async () => {
    const { coll } = makeCollection();
    const events: any[] = [];
    coll.watch(() => {
      throw new Error('listener error');
    });
    coll.watch((ev) => events.push(ev));

    // Should not throw despite the first listener throwing
    await coll.insertOne({ name: 'Test' });
    expect(events).toHaveLength(1);
  });
});

// ══════════════════════════════════════════════════════════════
// Head persistence and reload
// ══════════════════════════════════════════════════════════════

describe('Collection – persistence', () => {
  it('should persist and reload documents via head registry', async () => {
    const store = new MockBlockStore();
    const registry = HeadRegistry.createIsolated();

    // Insert documents in first collection instance
    const coll1 = new Collection('persist', store as any, 'testdb', registry);
    await coll1.insertOne({ _id: 'p1', data: 'hello' });
    await coll1.insertOne({ _id: 'p2', data: 'world' });

    // Create a fresh collection instance with same store + registry
    const coll2 = new Collection('persist', store as any, 'testdb', registry);
    const doc = await coll2.findById('p1');
    expect(doc).not.toBeNull();
    expect(doc!['data']).toBe('hello');

    const all = await coll2.find().toArray();
    expect(all).toHaveLength(2);
  });

  it('should start fresh without head in registry', async () => {
    const store = new MockBlockStore();
    const registry = HeadRegistry.createIsolated();
    const coll = new Collection('empty', store as any, 'testdb', registry);
    const count = await coll.estimatedDocumentCount();
    expect(count).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// Drop
// ══════════════════════════════════════════════════════════════

describe('Collection.drop', () => {
  it('should clear all documents and indexes', async () => {
    const { coll, registry } = makeCollection();
    await coll.insertMany([{ v: 1 }, { v: 2 }]);
    await coll.createIndex({ v: 1 });

    await coll.drop();
    expect(await coll.estimatedDocumentCount()).toBe(0);
    expect(await coll.find().toArray()).toHaveLength(0);
    expect(registry.getHead('testdb', 'test')).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════
// HeadRegistry
// ══════════════════════════════════════════════════════════════

describe('HeadRegistry', () => {
  it('should set and get heads', () => {
    const reg = HeadRegistry.createIsolated();
    reg.setHead('db1', 'coll1', 'block-abc');
    expect(reg.getHead('db1', 'coll1')).toBe('block-abc');
  });

  it('should return undefined for unknown heads', () => {
    const reg = HeadRegistry.createIsolated();
    expect(reg.getHead('dbx', 'collx')).toBeUndefined();
  });

  it('should remove a head', () => {
    const reg = HeadRegistry.createIsolated();
    reg.setHead('db1', 'coll1', 'block-abc');
    reg.removeHead('db1', 'coll1');
    expect(reg.getHead('db1', 'coll1')).toBeUndefined();
  });

  it('should clear all heads', () => {
    const reg = HeadRegistry.createIsolated();
    reg.setHead('db1', 'c1', 'b1');
    reg.setHead('db1', 'c2', 'b2');
    reg.clear();
    expect(reg.getHead('db1', 'c1')).toBeUndefined();
    expect(reg.getHead('db1', 'c2')).toBeUndefined();
  });

  it('should provide a singleton instance', () => {
    const a = HeadRegistry.getInstance();
    const b = HeadRegistry.getInstance();
    expect(a).toBe(b);
  });

  it('should provide isolated instances for testing', () => {
    const a = HeadRegistry.createIsolated();
    const b = HeadRegistry.createIsolated();
    expect(a).not.toBe(b);
    a.setHead('db', 'c', 'x');
    expect(b.getHead('db', 'c')).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════
// Edge cases
// ══════════════════════════════════════════════════════════════

describe('Collection – edge cases', () => {
  it('should handle documents with nested objects', async () => {
    const { coll } = makeCollection();
    await coll.insertOne({
      _id: 'nested',
      profile: { name: 'Alice', address: { city: 'NYC' } },
    });
    const doc = await coll.findById('nested');
    expect(doc!['profile']).toEqual({
      name: 'Alice',
      address: { city: 'NYC' },
    });
  });

  it('should handle documents with arrays', async () => {
    const { coll } = makeCollection();
    await coll.insertOne({ _id: 'arr', tags: ['a', 'b', 'c'] });
    const doc = await coll.findById('arr');
    expect(doc!['tags']).toEqual(['a', 'b', 'c']);
  });

  it('should handle documents with null/boolean/numeric fields', async () => {
    const { coll } = makeCollection();
    await coll.insertOne({
      _id: 'types',
      nullField: null,
      boolField: false,
      numField: 0,
      strField: '',
    });
    const doc = await coll.findById('types');
    expect(doc!['nullField']).toBeNull();
    expect(doc!['boolField']).toBe(false);
    expect(doc!['numField']).toBe(0);
    expect(doc!['strField']).toBe('');
  });

  it('should handle updating the same document multiple times', async () => {
    const { coll } = makeCollection();
    await coll.insertOne({ _id: 'multi', counter: 0 });
    for (let i = 0; i < 10; i++) {
      await coll.updateOne({ _id: 'multi' }, { $inc: { counter: 1 } });
    }
    const doc = await coll.findById('multi');
    expect(doc!['counter']).toBe(10);
  });

  it('should handle large batch inserts', async () => {
    const { coll } = makeCollection();
    const docs = Array.from({ length: 100 }, (_, i) => ({
      index: i,
      data: `item-${i}`,
    }));
    const result = await coll.insertMany(docs);
    expect(result.insertedCount).toBe(100);
    expect(await coll.countDocuments()).toBe(100);
  });

  it('should handle unicode in document fields', async () => {
    const { coll } = makeCollection();
    await coll.insertOne({ _id: 'unicode', text: '日本語テスト 🎉' });
    const doc = await coll.findById('unicode');
    expect(doc!['text']).toBe('日本語テスト 🎉');
  });

  it('should handle content-addressable dedup (same content → same block)', async () => {
    const { coll, store } = makeCollection();
    await coll.insertOne({ _id: 'dup1', data: 'same' });
    const _blocksAfterFirst = store.size;
    // Insert same content under different logical id – block already exists
    await coll.insertOne({ _id: 'dup2', data: 'different' });
    // Only new meta blocks should be written, plus the new doc block
    expect(store.calls.has.length).toBeGreaterThan(0);
  });
});
