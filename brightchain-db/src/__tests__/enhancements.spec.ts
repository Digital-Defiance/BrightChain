/**
 * Enhancement tests – TTL indexes, text search, bulk write,
 * $facet aggregation, cursor pagination, schema validation integration,
 * write concern / read preference.
 */

import { runAggregation } from '../lib/aggregation';
import { Collection } from '../lib/collection';
import { BrightChainDb } from '../lib/database';
import { BulkWriteError, ValidationError } from '../lib/errors';
import { InMemoryHeadRegistry } from '../lib/headRegistry';
import { tokenize } from '../lib/queryEngine';
import { CollectionSchema } from '../lib/schemaValidation';
import { BsonDocument, CollectionOptions } from '../lib/types';
import { MockBlockStore } from './helpers/mockBlockStore';

/* eslint-disable @typescript-eslint/no-explicit-any */

function makeCollection(
  name = 'test',
  store?: MockBlockStore,
  registry?: InMemoryHeadRegistry,
  options?: CollectionOptions,
): { coll: Collection; store: MockBlockStore; registry: InMemoryHeadRegistry } {
  const s = store ?? new MockBlockStore();
  const r = registry ?? InMemoryHeadRegistry.createIsolated();
  const coll = new Collection(name, s as any, 'testdb', r, options);
  return { coll, store: s, registry: r };
}

function makeDb(store?: MockBlockStore): {
  db: BrightChainDb;
  store: MockBlockStore;
} {
  const s = store ?? new MockBlockStore();
  const db = new BrightChainDb(s as any, {
    name: 'testdb',
    cursorTimeoutMs: 500,
  });
  return { db, store: s };
}

// ═══════════════════════════════════════════════════════════════
// $facet aggregation
// ═══════════════════════════════════════════════════════════════

describe('$facet aggregation stage', () => {
  const docs: BsonDocument[] = [
    { _id: '1', category: 'A', price: 10 },
    { _id: '2', category: 'A', price: 20 },
    { _id: '3', category: 'B', price: 30 },
    { _id: '4', category: 'B', price: 40 },
    { _id: '5', category: 'C', price: 50 },
  ];

  it('should run multiple sub-pipelines on the same input', async () => {
    const result = await runAggregation(docs, [
      {
        $facet: {
          byCategory: [
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ],
          priceStats: [
            {
              $group: {
                _id: null,
                total: { $sum: '$price' },
                avg: { $avg: '$price' },
              },
            },
          ],
        },
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]['byCategory']).toHaveLength(3);
    expect((result[0]['priceStats'] as any[])[0].total).toBe(150);
    expect((result[0]['priceStats'] as any[])[0].avg).toBe(30);
  });

  it('should return empty arrays for sub-pipelines that filter everything', async () => {
    const result = await runAggregation(docs, [
      {
        $facet: {
          all: [{ $match: {} }],
          none: [{ $match: { category: 'Z' } }],
        },
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]['all']).toHaveLength(5);
    expect(result[0]['none']).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// Text search
// ═══════════════════════════════════════════════════════════════

describe('tokenize', () => {
  it('should split text into lowercase tokens', () => {
    expect(tokenize('Hello World')).toEqual(['hello', 'world']);
  });

  it('should strip punctuation', () => {
    expect(tokenize("it's a test, right?")).toEqual([
      'it',
      's',
      'a',
      'test',
      'right',
    ]);
  });

  it('should return empty array for empty string', () => {
    expect(tokenize('')).toEqual([]);
  });
});

describe('Collection text search', () => {
  it('should create and use a text index', async () => {
    const { coll } = makeCollection();
    await coll.insertOne({
      title: 'Hello World',
      body: 'This is a test article',
    });
    await coll.insertOne({
      title: 'Goodbye',
      body: 'Another article about farewell',
    });
    await coll.insertOne({ title: 'Random', body: 'Nothing special here' });

    coll.createTextIndex({ fields: { title: 1, body: 1 } });
    expect(coll.hasTextIndex()).toBe(true);

    // Search for 'hello'
    const results = await coll
      .find({ $text: { $search: 'hello' } } as any)
      .toArray();
    expect(results).toHaveLength(1);
    expect(results[0]['title']).toBe('Hello World');
  });

  it('should support quoted phrase search', async () => {
    const { coll } = makeCollection();
    await coll.insertOne({ title: 'Hello World', body: 'This is a test' });
    await coll.insertOne({ title: 'World Hello', body: 'Reversed order' });

    coll.createTextIndex({ fields: { title: 1 } });

    // Quoted phrase must appear as a contiguous substring
    const results = await coll
      .find({ $text: { $search: '"hello world"' } } as any)
      .toArray();
    expect(results).toHaveLength(1);
    expect(results[0]['title']).toBe('Hello World');
  });

  it('should support negation with minus prefix', async () => {
    const { coll } = makeCollection();
    await coll.insertOne({ title: 'Hello World' });
    await coll.insertOne({ title: 'Hello Moon' });

    coll.createTextIndex({ fields: { title: 1 } });

    const results = await coll
      .find({ $text: { $search: 'hello -moon' } } as any)
      .toArray();
    expect(results).toHaveLength(1);
    expect(results[0]['title']).toBe('Hello World');
  });

  it('should drop text index', async () => {
    const { coll } = makeCollection();
    coll.createTextIndex({ fields: { title: 1 } });
    expect(coll.hasTextIndex()).toBe(true);
    coll.dropTextIndex();
    expect(coll.hasTextIndex()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// TTL indexes
// ═══════════════════════════════════════════════════════════════

describe('TTL indexes', () => {
  it('should sweep expired documents', async () => {
    const { coll } = makeCollection();
    const pastDate = new Date(Date.now() - 120_000); // 2 minutes ago
    const futureDate = new Date(Date.now() + 120_000); // 2 minutes from now

    await coll.insertOne({ _id: 'old', createdAt: pastDate.toISOString() });
    await coll.insertOne({ _id: 'new', createdAt: futureDate.toISOString() });

    const deleted = await coll.sweepTTL('createdAt', 60); // expire after 60s
    expect(deleted).toBe(1);

    // Old doc should be gone
    const oldDoc = await coll.findById('old');
    expect(oldDoc).toBeNull();

    // New doc should remain
    const newDoc = await coll.findById('new');
    expect(newDoc).not.toBeNull();
  });

  it('should handle Date objects as TTL field', async () => {
    const { coll } = makeCollection();
    const pastDate = new Date(Date.now() - 120_000);
    await coll.insertOne({ _id: 'old', expiry: pastDate });

    const deleted = await coll.sweepTTL('expiry', 60);
    expect(deleted).toBe(1);
  });

  it('should create and stop TTL index timer', async () => {
    const { coll } = makeCollection();
    const name = await coll.createTTLIndex('createdAt', 3600, 999_999);
    expect(name).toBe('ttl_createdAt');

    // Stop should not throw
    coll.stopTTL(name);
    // Stopping again should be a no-op
    coll.stopTTL(name);
  });

  it('should not delete documents where field is not a date', async () => {
    const { coll } = makeCollection();
    await coll.insertOne({ _id: 'nodate', createdAt: 'not-a-date' });

    const deleted = await coll.sweepTTL('createdAt', 60);
    expect(deleted).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// Bulk write
// ═══════════════════════════════════════════════════════════════

describe('Collection.bulkWrite', () => {
  it('should execute mixed operations', async () => {
    const { coll } = makeCollection();
    // Seed
    await coll.insertOne({ _id: 'del-me', name: 'Delete Me' });
    await coll.insertOne({ _id: 'upd-me', name: 'Update Me', age: 20 });

    const result = await coll.bulkWrite([
      { insertOne: { document: { _id: 'new-1', name: 'Inserted' } } },
      {
        updateOne: { filter: { _id: 'upd-me' }, update: { $set: { age: 30 } } },
      },
      { deleteOne: { filter: { _id: 'del-me' } } },
    ]);

    expect(result.acknowledged).toBe(true);
    expect(result.insertedCount).toBe(1);
    expect(result.modifiedCount).toBe(1);
    expect(result.deletedCount).toBe(1);

    // Verify
    const inserted = await coll.findById('new-1');
    expect(inserted).not.toBeNull();

    const updated = await coll.findById('upd-me');
    expect(updated!['age']).toBe(30);

    const deleted = await coll.findById('del-me');
    expect(deleted).toBeNull();
  });

  it('should stop on first error in ordered mode', async () => {
    const { coll } = makeCollection();
    await coll.createIndex({ name: 1 }, { unique: true, name: 'name_uniq' });
    await coll.insertOne({ _id: '1', name: 'Alice' });

    await expect(
      coll.bulkWrite(
        [
          { insertOne: { document: { _id: '2', name: 'Alice' } } }, // dup
          { insertOne: { document: { _id: '3', name: 'Charlie' } } }, // won't run
        ],
        { ordered: true },
      ),
    ).rejects.toThrow(BulkWriteError);

    // Third doc should not have been inserted
    const charlie = await coll.findById('3');
    expect(charlie).toBeNull();
  });

  it('should collect all errors in unordered mode', async () => {
    const { coll } = makeCollection();
    await coll.createIndex({ name: 1 }, { unique: true, name: 'name_uniq' });
    await coll.insertOne({ _id: '1', name: 'Alice' });

    try {
      await coll.bulkWrite(
        [
          { insertOne: { document: { _id: '2', name: 'Alice' } } }, // dup
          { insertOne: { document: { _id: '3', name: 'Bob' } } }, // OK
          { insertOne: { document: { _id: '4', name: 'Alice' } } }, // dup
        ],
        { ordered: false },
      );
      fail('Expected BulkWriteError');
    } catch (err) {
      expect(err).toBeInstanceOf(BulkWriteError);
      const bwe = err as BulkWriteError;
      expect(bwe.writeErrors).toHaveLength(2);
      // Bob should have been inserted
      const bob = await coll.findById('3');
      expect(bob).not.toBeNull();
    }
  });

  it('should handle replaceOne in bulkWrite', async () => {
    const { coll } = makeCollection();
    await coll.insertOne({ _id: 'r1', name: 'Old', age: 10 });

    const result = await coll.bulkWrite([
      {
        replaceOne: {
          filter: { _id: 'r1' },
          replacement: { name: 'New', age: 99 },
        },
      },
    ]);

    expect(result.matchedCount).toBe(1);
    expect(result.modifiedCount).toBe(1);

    const doc = await coll.findById('r1');
    expect(doc!['name']).toBe('New');
    expect(doc!['age']).toBe(99);
  });
});

// ═══════════════════════════════════════════════════════════════
// Schema validation integration (with collection)
// ═══════════════════════════════════════════════════════════════

describe('Collection schema validation', () => {
  const schema: CollectionSchema = {
    properties: {
      name: { type: 'string', minLength: 1 },
      age: { type: 'number', minimum: 0 },
    },
    required: ['name'],
  };

  it('should block invalid inserts when schema is set', async () => {
    const { coll } = makeCollection();
    coll.setSchema(schema);

    await expect(coll.insertOne({ age: 30 })).rejects.toThrow(ValidationError);
  });

  it('should allow valid inserts', async () => {
    const { coll } = makeCollection();
    coll.setSchema(schema);

    const result = await coll.insertOne({ name: 'Alice', age: 30 });
    expect(result.acknowledged).toBe(true);
  });

  it('should apply defaults on insert', async () => {
    const { coll } = makeCollection();
    coll.setSchema({
      properties: {
        name: { type: 'string' },
        role: { type: 'string', default: 'user' },
      },
    });

    const result = await coll.insertOne({ name: 'Bob' });
    const doc = await coll.findById(result.insertedId);
    expect(doc!['role']).toBe('user');
  });

  it('should block invalid updates in strict mode', async () => {
    const { coll } = makeCollection();
    coll.setSchema({
      ...schema,
      validationLevel: 'strict',
    });

    const { insertedId } = await coll.insertOne({ name: 'Alice', age: 30 });

    // Update that would leave name as empty string
    await expect(
      coll.updateOne({ _id: insertedId }, { $set: { name: '' } }),
    ).rejects.toThrow(ValidationError);
  });

  it('should allow updates in moderate mode', async () => {
    const { coll } = makeCollection();
    coll.setSchema({
      ...schema,
      validationLevel: 'moderate',
    });

    const { insertedId } = await coll.insertOne({ name: 'Alice', age: 30 });

    // In moderate mode updates skip validation
    const result = await coll.updateOne(
      { _id: insertedId },
      { $set: { name: '' } },
    );
    expect(result.modifiedCount).toBe(1);
  });

  it('should validateDoc without inserting', () => {
    const { coll } = makeCollection();
    coll.setSchema(schema);

    const errors = coll.validateDoc({ age: -1 } as any);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should removeSchema and allow any document', async () => {
    const { coll } = makeCollection();
    coll.setSchema(schema);
    coll.removeSchema();

    // Should not validate anymore
    const result = await coll.insertOne({ totally: 'freeform' });
    expect(result.acknowledged).toBe(true);
  });

  it('should return schema via getSchema', () => {
    const { coll } = makeCollection();
    expect(coll.getSchema()).toBeUndefined();
    coll.setSchema(schema);
    expect(coll.getSchema()).toBeDefined();
    expect(coll.getSchema()!.required).toContain('name');
  });
});

// ═══════════════════════════════════════════════════════════════
// Write concern / Read preference
// ═══════════════════════════════════════════════════════════════

describe('Write concern / Read preference', () => {
  it('should have default write concern w:1', () => {
    const { coll } = makeCollection();
    expect(coll.getWriteConcern()).toEqual({ w: 1 });
  });

  it('should allow setting and getting write concern', () => {
    const { coll } = makeCollection();
    coll.setWriteConcern({ w: 'majority', journal: true });
    expect(coll.getWriteConcern()).toEqual({ w: 'majority', journal: true });
  });

  it('should have default read preference primary', () => {
    const { coll } = makeCollection();
    expect(coll.getReadPreference()).toBe('primary');
  });

  it('should allow setting and getting read preference', () => {
    const { coll } = makeCollection();
    coll.setReadPreference('secondary');
    expect(coll.getReadPreference()).toBe('secondary');
  });

  it('should accept options in constructor', () => {
    const { coll } = makeCollection('test', undefined, undefined, {
      writeConcern: { w: 2, wtimeoutMS: 5000 },
      readPreference: 'nearest',
    });
    expect(coll.getWriteConcern()).toEqual({ w: 2, wtimeoutMS: 5000 });
    expect(coll.getReadPreference()).toBe('nearest');
  });
});

// ═══════════════════════════════════════════════════════════════
// Cursor-based pagination (database level)
// ═══════════════════════════════════════════════════════════════

describe('BrightChainDb cursor sessions', () => {
  it('should create and retrieve a cursor session', () => {
    const { db } = makeDb();
    const cursor = db.createCursorSession({
      collection: 'users',
      documentIds: ['a', 'b', 'c', 'd', 'e'],
      position: 0,
      batchSize: 2,
      filter: {},
    });

    expect(cursor.id).toBeDefined();
    expect(cursor.lastAccessed).toBeDefined();

    const retrieved = db.getCursorSession(cursor.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.collection).toBe('users');
  });

  it('should get next batch and advance position', () => {
    const { db } = makeDb();
    const cursor = db.createCursorSession({
      collection: 'items',
      documentIds: ['1', '2', '3', '4', '5'],
      position: 0,
      batchSize: 2,
      filter: {},
    });

    const batch1 = db.getNextBatch(cursor.id);
    expect(batch1).toEqual(['1', '2']);

    const batch2 = db.getNextBatch(cursor.id);
    expect(batch2).toEqual(['3', '4']);

    const batch3 = db.getNextBatch(cursor.id);
    expect(batch3).toEqual(['5']);

    const batch4 = db.getNextBatch(cursor.id);
    expect(batch4).toEqual([]);
  });

  it('should return null for expired cursor', async () => {
    const { db } = makeDb(); // cursorTimeoutMs = 500

    const cursor = db.createCursorSession({
      collection: 'items',
      documentIds: ['1'],
      position: 0,
      batchSize: 10,
      filter: {},
    });

    // Wait for expiry
    await new Promise((r) => setTimeout(r, 600));

    expect(db.getCursorSession(cursor.id)).toBeNull();
    expect(db.getNextBatch(cursor.id)).toBeNull();
  });

  it('should close cursor session', () => {
    const { db } = makeDb();
    const cursor = db.createCursorSession({
      collection: 'items',
      documentIds: ['1', '2'],
      position: 0,
      batchSize: 10,
      filter: {},
    });

    expect(db.closeCursorSession(cursor.id)).toBe(true);
    expect(db.closeCursorSession(cursor.id)).toBe(false); // already closed
    expect(db.getCursorSession(cursor.id)).toBeNull();
  });

  it('should return null for non-existent cursor', () => {
    const { db } = makeDb();
    expect(db.getNextBatch('non-existent')).toBeNull();
    expect(db.getCursorSession('non-existent')).toBeNull();
    expect(db.closeCursorSession('non-existent')).toBe(false);
  });

  it('should pass collection options through db.collection', async () => {
    const { db } = makeDb();
    const coll = db.collection('users', {
      writeConcern: { w: 'majority' },
      readPreference: 'secondary',
    });

    expect(coll.getWriteConcern()).toEqual({ w: 'majority' });
    expect(coll.getReadPreference()).toBe('secondary');
  });
});
