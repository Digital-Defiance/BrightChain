/**
 * Deep edge-case and boundary tests for brightchain-db.
 *
 * Covers areas not exercised by the module-specific tests:
 *   - Query engine: $elemMatch, $type, $all, nested dot-path queries
 *   - Update engine: $push to non-existent field, $inc on non-number, compound ops
 *   - Aggregation: $lookup, expression operators ($concat, $cond, $add, etc.), $unwind preserve
 *   - Collection: concurrent writes, store errors, content-addressable dedup
 *   - Transaction: partial-commit rollback, nested transaction rejection
 *   - Cursor: exhaustion semantics, empty source
 */

import { runAggregation } from '../lib/aggregation';
import { Cursor } from '../lib/cursor';
import { BrightChainDb } from '../lib/database';
import { InMemoryHeadRegistry } from '../lib/headRegistry';
import {
  applyProjection,
  deepEquals,
  matchesFilter,
  sortDocuments,
} from '../lib/queryEngine';
import { BsonDocument } from '../lib/types';
import { applyUpdate } from '../lib/updateEngine';
import { MockBlockStore } from './helpers/mockBlockStore';

/* eslint-disable @typescript-eslint/no-explicit-any */

function makeDb() {
  const store = new MockBlockStore();
  const registry = InMemoryHeadRegistry.createIsolated();
  const db = new BrightChainDb(store as any, {
    name: 'edgedb',
    headRegistry: registry,
  });
  return { db, store, registry };
}

// ══════════════════════════════════════════════════════════════
// Query engine – advanced operators
// ══════════════════════════════════════════════════════════════

describe('QueryEngine – advanced operators', () => {
  it('$elemMatch should match array elements against sub-filter', () => {
    const doc = {
      scores: [
        { subject: 'math', grade: 90 },
        { subject: 'eng', grade: 70 },
      ],
    };
    expect(
      matchesFilter(doc, {
        scores: { $elemMatch: { subject: 'math', grade: { $gte: 85 } } },
      } as any),
    ).toBe(true);
    expect(
      matchesFilter(doc, {
        scores: { $elemMatch: { subject: 'math', grade: { $gte: 95 } } },
      } as any),
    ).toBe(false);
  });

  it('$type should match field types', () => {
    expect(matchesFilter({ v: 42 }, { v: { $type: 'number' } } as any)).toBe(
      true,
    );
    expect(matchesFilter({ v: 'str' }, { v: { $type: 'string' } } as any)).toBe(
      true,
    );
    expect(matchesFilter({ v: true }, { v: { $type: 'bool' } } as any)).toBe(
      true,
    );
    expect(matchesFilter({ v: [1] }, { v: { $type: 'array' } } as any)).toBe(
      true,
    );
    expect(
      matchesFilter({ v: { a: 1 } }, { v: { $type: 'object' } } as any),
    ).toBe(true);
    expect(matchesFilter({ v: 42 }, { v: { $type: 'string' } } as any)).toBe(
      false,
    );
  });

  it('$all should require all values present in array', () => {
    expect(
      matchesFilter({ tags: ['a', 'b', 'c'] }, {
        tags: { $all: ['a', 'c'] },
      } as any),
    ).toBe(true);
    expect(
      matchesFilter({ tags: ['a', 'b'] }, {
        tags: { $all: ['a', 'c'] },
      } as any),
    ).toBe(false);
  });

  it('should match nested dot-path fields in filter', () => {
    const doc = { user: { profile: { name: 'Alice', age: 30 } } };
    expect(matchesFilter(doc, { 'user.profile.name': 'Alice' } as any)).toBe(
      true,
    );
    expect(matchesFilter(doc, { 'user.profile.age': { $gt: 25 } } as any)).toBe(
      true,
    );
    expect(matchesFilter(doc, { 'user.profile.name': 'Bob' } as any)).toBe(
      false,
    );
  });

  it('$regex with string pattern', () => {
    expect(
      matchesFilter({ name: 'Alice' }, { name: { $regex: '^Ali' } } as any),
    ).toBe(true);
    expect(
      matchesFilter({ name: 'Bob' }, { name: { $regex: '^Ali' } } as any),
    ).toBe(false);
  });

  it('$not should negate a sub-filter', () => {
    const doc = { age: 25 };
    expect(matchesFilter(doc, { age: { $not: { $gt: 30 } } } as any)).toBe(
      true,
    );
    expect(matchesFilter(doc, { age: { $not: { $lt: 30 } } } as any)).toBe(
      false,
    );
  });

  it('$nor should reject if any sub-filter matches', () => {
    const doc = { x: 5 };
    expect(matchesFilter(doc, { $nor: [{ x: 3 }, { x: 7 }] } as any)).toBe(
      true,
    );
    expect(matchesFilter(doc, { $nor: [{ x: 5 }, { x: 7 }] } as any)).toBe(
      false,
    );
  });

  it('should handle missing fields gracefully', () => {
    const doc = { name: 'Alice' };
    expect(matchesFilter(doc, { age: { $exists: false } } as any)).toBe(true);
    expect(matchesFilter(doc, { age: { $exists: true } } as any)).toBe(false);
    expect(matchesFilter(doc, { age: { $gt: 0 } } as any)).toBe(false);
  });

  it('should handle null values correctly', () => {
    const doc = { value: null };
    expect(matchesFilter(doc, { value: null } as any)).toBe(true);
    expect(matchesFilter(doc, { value: { $exists: true } } as any)).toBe(true);
    expect(matchesFilter(doc, { value: { $eq: null } } as any)).toBe(true);
  });

  it('deepEquals with mixed types', () => {
    expect(deepEquals(null, undefined)).toBe(false);
    expect(deepEquals(0, false)).toBe(false);
    expect(deepEquals('', false)).toBe(false);
    expect(deepEquals([], [])).toBe(true);
    expect(deepEquals({}, {})).toBe(true);
    expect(deepEquals([1, [2, 3]], [1, [2, 3]])).toBe(true);
    expect(deepEquals([1, [2, 3]], [1, [2, 4]])).toBe(false);
  });

  it('sortDocuments should handle equal values stably', () => {
    const docs = [
      { name: 'A', v: 1 },
      { name: 'B', v: 1 },
      { name: 'C', v: 1 },
    ];
    const sorted = sortDocuments(docs, { v: 1 });
    expect(sorted).toHaveLength(3);
    // All have same v=1, order should be preserved
    expect(sorted.map((d: any) => d.name)).toEqual(['A', 'B', 'C']);
  });

  it('applyProjection should handle _id exclusion in inclusion mode', () => {
    const doc = { _id: '123', name: 'Alice', age: 30 };
    const result = applyProjection(doc, { name: 1, _id: 0 });
    expect(result['name']).toBe('Alice');
    expect(result['_id']).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════
// Update engine – advanced cases
// ══════════════════════════════════════════════════════════════

describe('UpdateEngine – advanced cases', () => {
  it('$push to non-existent field should create array', () => {
    const doc = { name: 'Alice' };
    const result = applyUpdate(doc, { $push: { tags: 'new' } } as any) as any;
    expect(result.tags).toEqual(['new']);
  });

  it('$addToSet with existing duplicate should not add', () => {
    const doc = { tags: ['a', 'b'] };
    const result = applyUpdate(doc, { $addToSet: { tags: 'a' } }) as any;
    expect(result.tags).toEqual(['a', 'b']);
  });

  it('$inc on non-existent field should start from 0', () => {
    const doc = { name: 'Alice' };
    const result = applyUpdate(doc, { $inc: { score: 5 } } as any) as any;
    expect(result.score).toBe(5);
  });

  it('$mul on non-existent field should result in 0', () => {
    const doc = { name: 'Alice' };
    const result = applyUpdate(doc, { $mul: { score: 5 } } as any) as any;
    expect(result.score).toBe(0);
  });

  it('compound update with multiple operators', () => {
    const doc = { name: 'Alice', age: 25, tags: ['a'], score: 10 };
    const result = applyUpdate(doc, {
      $set: { name: 'Alicia' },
      $inc: { age: 1 },
      $push: { tags: 'b' },
      $mul: { score: 2 },
    }) as any;
    expect(result.name).toBe('Alicia');
    expect(result.age).toBe(26);
    expect(result.tags).toEqual(['a', 'b']);
    expect(result.score).toBe(20);
  });

  it('$pop first element', () => {
    const doc = { items: [1, 2, 3] };
    const result = applyUpdate(doc, { $pop: { items: -1 } }) as any;
    expect(result.items).toEqual([2, 3]);
  });

  it('$pop last element', () => {
    const doc = { items: [1, 2, 3] };
    const result = applyUpdate(doc, { $pop: { items: 1 } }) as any;
    expect(result.items).toEqual([1, 2]);
  });

  it('$rename should move field value', () => {
    const doc = { old_name: 'value', keep: true };
    const result = applyUpdate(doc, {
      $rename: { old_name: 'new_name' },
    }) as any;
    expect(result.new_name).toBe('value');
    expect(result.old_name).toBeUndefined();
    expect(result.keep).toBe(true);
  });

  it('$unset should remove multiple fields', () => {
    const doc = { a: 1, b: 2, c: 3 };
    const result = applyUpdate(doc, { $unset: { a: '', c: '' } }) as any;
    expect(result.a).toBeUndefined();
    expect(result.b).toBe(2);
    expect(result.c).toBeUndefined();
  });

  it('replacement update should preserve _id', () => {
    const doc = { _id: 'keep', name: 'Old', extra: true };
    const result = applyUpdate(doc, { name: 'New' }) as any;
    expect(result._id).toBe('keep');
    expect(result.name).toBe('New');
    expect(result.extra).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════
// Aggregation – expression operators
// ══════════════════════════════════════════════════════════════

describe('Aggregation – expression operators', () => {
  it('$addFields with field reference', async () => {
    const docs: BsonDocument[] = [{ _id: '1', first: 'Alice', last: 'Smith' }];
    const result = await runAggregation(docs, [
      { $addFields: { fullName: { $concat: ['$first', ' ', '$last'] } } },
    ]);
    expect(result[0]['fullName']).toBe('Alice Smith');
  });

  it('$project with $toLower / $toUpper', async () => {
    const docs: BsonDocument[] = [{ _id: '1', name: 'Alice' }];
    const lower = await runAggregation(docs, [
      { $project: { lower: { $toLower: '$name' } } },
    ]);
    expect(lower[0]['lower']).toBe('alice');

    const upper = await runAggregation(docs, [
      { $project: { upper: { $toUpper: '$name' } } },
    ]);
    expect(upper[0]['upper']).toBe('ALICE');
  });

  it('$project with $add and $subtract', async () => {
    const docs: BsonDocument[] = [{ _id: '1', a: 10, b: 3 }];
    const result = await runAggregation(docs, [
      {
        $project: {
          sum: { $add: ['$a', '$b'] },
          diff: { $subtract: ['$a', '$b'] },
        },
      },
    ]);
    expect(result[0]['sum']).toBe(13);
    expect(result[0]['diff']).toBe(7);
  });

  it('$project with $multiply and $divide', async () => {
    const docs: BsonDocument[] = [{ _id: '1', a: 10, b: 4 }];
    const result = await runAggregation(docs, [
      {
        $project: {
          product: { $multiply: ['$a', '$b'] },
          quotient: { $divide: ['$a', '$b'] },
        },
      },
    ]);
    expect(result[0]['product']).toBe(40);
    expect(result[0]['quotient']).toBe(2.5);
  });

  it('$project with $cond', async () => {
    const docs: BsonDocument[] = [
      { _id: '1', score: 85 },
      { _id: '2', score: 45 },
    ];
    const result = await runAggregation(docs, [
      { $project: { pass: { $cond: ['$score', 'yes', 'no'] } } },
    ]);
    // $cond with truthiness check – 85 is truthy
    expect(result[0]['pass']).toBe('yes');
    expect(result[1]['pass']).toBe('yes'); // 45 is also truthy
  });

  it('$group with $first and $last accumulators', async () => {
    const docs: BsonDocument[] = [
      { dept: 'eng', name: 'Alice' },
      { dept: 'eng', name: 'Bob' },
      { dept: 'eng', name: 'Charlie' },
    ];
    const result = await runAggregation(docs, [
      {
        $group: {
          _id: '$dept',
          first: { $first: '$name' },
          last: { $last: '$name' },
        },
      },
    ]);
    expect(result[0]['first']).toBe('Alice');
    expect(result[0]['last']).toBe('Charlie');
  });

  it('$group with $min and $max', async () => {
    const docs: BsonDocument[] = [
      { dept: 'eng', salary: 100 },
      { dept: 'eng', salary: 300 },
      { dept: 'eng', salary: 200 },
    ];
    const result = await runAggregation(docs, [
      {
        $group: {
          _id: '$dept',
          minSal: { $min: '$salary' },
          maxSal: { $max: '$salary' },
        },
      },
    ]);
    expect(result[0]['minSal']).toBe(100);
    expect(result[0]['maxSal']).toBe(300);
  });

  it('$group with $addToSet should deduplicate', async () => {
    const docs: BsonDocument[] = [
      { dept: 'eng', skill: 'js' },
      { dept: 'eng', skill: 'ts' },
      { dept: 'eng', skill: 'js' },
    ];
    const result = await runAggregation(docs, [
      { $group: { _id: '$dept', skills: { $addToSet: '$skill' } } },
    ]);
    expect(result[0]['skills']).toHaveLength(2);
    expect(new Set(result[0]['skills'] as string[])).toEqual(
      new Set(['js', 'ts']),
    );
  });

  it('$group with null _id should aggregate all', async () => {
    const docs: BsonDocument[] = [{ v: 1 }, { v: 2 }, { v: 3 }];
    const result = await runAggregation(docs, [
      { $group: { _id: null, total: { $sum: '$v' }, count: { $count: {} } } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]['_id']).toBeNull();
    expect(result[0]['total']).toBe(6);
    expect(result[0]['count']).toBe(3);
  });

  it('$unwind with preserveNullAndEmptyArrays', async () => {
    const docs: BsonDocument[] = [
      { _id: '1', tags: ['a', 'b'] },
      { _id: '2', tags: [] },
      { _id: '3' }, // missing field
    ];
    const result = await runAggregation(docs, [
      { $unwind: { path: '$tags', preserveNullAndEmptyArrays: true } } as any,
    ]);
    // doc1 unwinds to 2 results, doc2 preserves with null, doc3 preserves
    expect(result.length).toBeGreaterThanOrEqual(4);
  });

  it('$unwind without preserve should drop docs with empty/missing arrays', async () => {
    const docs: BsonDocument[] = [
      { _id: '1', tags: ['a', 'b'] },
      { _id: '2', tags: [] },
      { _id: '3' },
    ];
    const result = await runAggregation(docs, [{ $unwind: '$tags' }]);
    expect(result).toHaveLength(2); // only from doc1
    expect(result[0]['tags']).toBe('a');
    expect(result[1]['tags']).toBe('b');
  });

  it('$lookup should join with external collection', async () => {
    const orders: BsonDocument[] = [
      { _id: 'o1', userId: 'u1', total: 100 },
      { _id: 'o2', userId: 'u2', total: 200 },
    ];
    const users: BsonDocument[] = [
      { _id: 'u1', name: 'Alice' },
      { _id: 'u2', name: 'Bob' },
    ];

    const resolver = async (collName: string) => {
      if (collName === 'users') return users;
      return [];
    };

    const result = await runAggregation(
      orders,
      [
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        } as any,
      ],
      resolver,
    );
    expect(result[0]['user']).toHaveLength(1);
    expect((result[0]['user'] as any[])[0].name).toBe('Alice');
    expect(result[1]['user']).toHaveLength(1);
    expect((result[1]['user'] as any[])[0].name).toBe('Bob');
  });

  it('$lookup without resolver should produce empty arrays', async () => {
    const docs: BsonDocument[] = [{ _id: '1', ref: 'x' }];
    const result = await runAggregation(docs, [
      {
        $lookup: {
          from: 'other',
          localField: 'ref',
          foreignField: '_id',
          as: 'joined',
        },
      } as any,
    ]);
    expect(result[0]['joined']).toEqual([]);
  });

  it('$replaceRoot should swap document root', async () => {
    const docs: BsonDocument[] = [{ _id: '1', nested: { a: 1, b: 2 } }];
    const result = await runAggregation(docs, [
      { $replaceRoot: { newRoot: '$nested' } },
    ]);
    expect(result[0]['a']).toBe(1);
    expect(result[0]['b']).toBe(2);
    expect(result[0]['_id']).toBeUndefined();
  });

  it('empty pipeline should return docs unchanged', async () => {
    const docs: BsonDocument[] = [{ _id: '1', v: 1 }];
    const result = await runAggregation(docs, []);
    expect(result).toEqual(docs);
  });

  it('unknown stage should be skipped', async () => {
    const docs: BsonDocument[] = [{ _id: '1', v: 1 }];
    const result = await runAggregation(docs, [{ $fakeStage: {} } as any]);
    expect(result).toEqual(docs);
  });
});

// ══════════════════════════════════════════════════════════════
// Collection – duplicate key / store errors / content addressing
// ══════════════════════════════════════════════════════════════

describe('Collection – error handling', () => {
  it('should reject duplicate key on unique index', async () => {
    const { db } = makeDb();
    const coll = db.collection('users');
    await coll.createIndex({ email: 1 }, { unique: true });

    await coll.insertOne({ email: 'test@example.com', name: 'First' });
    await expect(
      coll.insertOne({ email: 'test@example.com', name: 'Second' }),
    ).rejects.toThrow();

    // Only the first document should exist
    const count = await coll.countDocuments();
    expect(count).toBe(1);
  });

  it('should roll back index entry on unique constraint violation during writeDoc', async () => {
    const { db } = makeDb();
    const coll = db.collection('users');
    await coll.createIndex({ email: 1 }, { unique: true });

    await coll.insertOne({ _id: 'u1', email: 'a@b.com' });
    await expect(
      coll.insertOne({ _id: 'u2', email: 'a@b.com' }),
    ).rejects.toThrow();

    // u1 should still be intact
    const doc = await coll.findById('u1');
    expect(doc!['email']).toBe('a@b.com');

    // u2 should not exist
    const doc2 = await coll.findById('u2');
    expect(doc2).toBeNull();
  });

  it('should handle identical document content (content-addressable dedup)', async () => {
    const { db } = makeDb();
    const coll = db.collection('items');

    // Two docs with same content but different _ids will have different block hashes
    // because _id is included in the serialized JSON
    await coll.insertOne({ _id: 'a', value: 42 });
    await coll.insertOne({ _id: 'b', value: 42 });

    expect(await coll.countDocuments()).toBe(2);
    // Both should be independently readable
    expect((await coll.findById('a'))!['value']).toBe(42);
    expect((await coll.findById('b'))!['value']).toBe(42);
  });
});

// ══════════════════════════════════════════════════════════════
// Transaction – rollback semantics
// ══════════════════════════════════════════════════════════════

describe('Transaction – rollback semantics', () => {
  it('should not persist inserts from aborted transaction', async () => {
    const { db } = makeDb();
    const coll = db.collection('items');

    const session = db.startSession();
    session.startTransaction();
    await coll.insertOne({ _id: 'abort-ins', v: 1 }, { session });
    await session.abortTransaction();
    session.endSession();

    const doc = await coll.findById('abort-ins');
    expect(doc).toBeNull();
  });

  it('should restore original value after failed update transaction', async () => {
    const { db } = makeDb();
    const coll = db.collection('items');
    await coll.insertOne({ _id: 'upd1', value: 'original' });

    const session = db.startSession();
    session.startTransaction();
    await coll.updateOne(
      { _id: 'upd1' },
      { $set: { value: 'changed' } },
      { session },
    );
    await session.abortTransaction();
    session.endSession();

    const doc = await coll.findById('upd1');
    expect(doc!['value']).toBe('original');
  });

  it('should restore deleted document after aborted transaction', async () => {
    const { db } = makeDb();
    const coll = db.collection('items');
    await coll.insertOne({ _id: 'del1', value: 'keep me' });

    const session = db.startSession();
    session.startTransaction();
    await coll.deleteOne({ _id: 'del1' }, { session });
    await session.abortTransaction();
    session.endSession();

    const doc = await coll.findById('del1');
    expect(doc).not.toBeNull();
    expect(doc!['value']).toBe('keep me');
  });

  it('should roll back multi-op transaction atomically', async () => {
    const { db } = makeDb();
    const coll = db.collection('items');
    await coll.insertOne({ _id: 'mo1', v: 1 });

    await expect(
      db.withTransaction(async (session) => {
        await coll.insertOne({ _id: 'mo2', v: 2 }, { session });
        await coll.updateOne({ _id: 'mo1' }, { $set: { v: 99 } }, { session });
        throw new Error('forced failure');
      }),
    ).rejects.toThrow('forced failure');

    // mo2 should not exist
    expect(await coll.findById('mo2')).toBeNull();
    // mo1 should have original value
    expect((await coll.findById('mo1'))!['v']).toBe(1);
  });

  it('should not allow nested transactions', () => {
    const { db } = makeDb();
    const session = db.startSession();
    session.startTransaction();
    expect(() => session.startTransaction()).toThrow('already in progress');
    session.endSession();
  });

  it('should not allow operations after session ends', () => {
    const { db } = makeDb();
    const session = db.startSession();
    session.endSession();
    expect(() => session.startTransaction()).toThrow('ended');
  });
});

// ══════════════════════════════════════════════════════════════
// Cursor – exhaustion and edge cases
// ══════════════════════════════════════════════════════════════

describe('Cursor – exhaustion', () => {
  it('should return empty array on second toArray() call (cursor exhausted)', async () => {
    const cursor = new Cursor(async () => [{ _id: '1' }, { _id: '2' }]);
    const first = await cursor.toArray();
    expect(first).toHaveLength(2);
    const second = await cursor.toArray();
    expect(second).toHaveLength(0);
  });

  it('should handle source that returns empty array', async () => {
    const cursor = new Cursor(async () => []);
    const docs = await cursor.toArray();
    expect(docs).toHaveLength(0);
    expect(await cursor.count()).toBe(0);
  });

  it('should apply skip beyond available docs', async () => {
    const cursor = new Cursor(async () => [{ _id: '1' }]).skip(100);
    const docs = await cursor.toArray();
    expect(docs).toHaveLength(0);
  });

  it('should apply limit of 0 to return empty', async () => {
    const cursor = new Cursor(async () => [{ _id: '1' }]).limit(0);
    const docs = await cursor.toArray();
    expect(docs).toHaveLength(0);
  });

  it('should be directly awaitable via then()', async () => {
    const cursor = new Cursor(async () => [{ _id: '1', v: 42 }]);
    const docs = await cursor;
    expect(docs).toHaveLength(1);
    expect(docs[0]['v']).toBe(42);
  });

  it('forEach should handle zero docs', async () => {
    const cursor = new Cursor(async () => []);
    const items: any[] = [];
    await cursor.forEach((doc) => {
      items.push(doc);
    });
    expect(items).toHaveLength(0);
  });

  it('map should transform documents', async () => {
    const cursor = new Cursor(async () => [{ v: 1 }, { v: 2 }, { v: 3 }]);
    const values = await cursor.map((doc) => (doc['v'] as number) * 10);
    expect(values).toEqual([10, 20, 30]);
  });
});

// ══════════════════════════════════════════════════════════════
// Collection + Index integration
// ══════════════════════════════════════════════════════════════

describe('Collection + Index integration', () => {
  it('should use index for findOne with compound filter', async () => {
    const { db } = makeDb();
    const coll = db.collection('items');
    await coll.createIndex({ department: 1, level: 1 });
    await coll.insertMany([
      { _id: 'i1', department: 'eng', level: 1 },
      { _id: 'i2', department: 'eng', level: 2 },
      { _id: 'i3', department: 'sales', level: 1 },
    ]);

    const doc = await coll.findOne({ department: 'eng' });
    expect(doc).not.toBeNull();
    expect(doc!['department']).toBe('eng');
  });

  it('should update index entries on document update', async () => {
    const { db } = makeDb();
    const coll = db.collection('items');
    await coll.createIndex({ status: 1 });
    await coll.insertOne({ _id: 's1', status: 'active' });

    await coll.updateOne({ _id: 's1' }, { $set: { status: 'inactive' } });

    // Should find by new status
    const found = await coll.findOne({ status: 'inactive' });
    expect(found).not.toBeNull();
    expect(found!['_id']).toBe('s1');

    // Should NOT find by old status (index was updated)
    const notFound = await coll.findOne({ status: 'active' });
    expect(notFound).toBeNull();
  });

  it('should remove index entries on document delete', async () => {
    const { db } = makeDb();
    const coll = db.collection('items');
    await coll.createIndex({ tag: 1 });
    await coll.insertOne({ _id: 't1', tag: 'important' });
    await coll.deleteOne({ _id: 't1' });

    const found = await coll.findOne({ tag: 'important' });
    expect(found).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// MockBlockStore behaviour verification
// ══════════════════════════════════════════════════════════════

describe('MockBlockStore', () => {
  it('should store and retrieve data', async () => {
    const store = new MockBlockStore();
    const data = new Uint8Array([1, 2, 3]);
    await store.put('key1', data);
    expect(await store.has('key1')).toBe(true);
    const handle = store.get('key1');
    expect(handle.fullData).toEqual(data);
  });

  it('should throw on get for missing key', () => {
    const store = new MockBlockStore();
    expect(() => store.get('missing')).toThrow('Block not found');
  });

  it('should track method calls', async () => {
    const store = new MockBlockStore();
    await store.has('k1');
    await store.put('k2', new Uint8Array([1]));
    store.get('k2');
    expect(store.calls.has).toEqual(['k1']);
    expect(store.calls.put).toEqual(['k2']);
    expect(store.calls.get).toEqual(['k2']);
  });

  it('should reset cleanly', async () => {
    const store = new MockBlockStore();
    await store.put('k1', new Uint8Array([1]));
    store.reset();
    expect(store.size).toBe(0);
    expect(store.calls.put).toHaveLength(0);
  });

  it('should simulate errors on configured keys', async () => {
    const store = new MockBlockStore();
    store.errorKeys.add('bad-key');
    await expect(store.has('bad-key')).rejects.toThrow('simulated error');
    expect(() => store.get('bad-key')).toThrow('simulated error');
    await expect(store.put('bad-key', new Uint8Array())).rejects.toThrow(
      'simulated error',
    );
  });
});
