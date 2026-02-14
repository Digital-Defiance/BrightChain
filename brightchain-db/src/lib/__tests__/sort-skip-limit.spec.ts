/**
 * @fileoverview Unit tests for sort/skip/limit edge cases in Collection.find().
 *
 * Tests cover:
 * - limit(0) returns empty
 * - skip > length returns empty
 * - sort ascending and descending with known values
 * - multi-field sort with known data
 * - sort + skip + limit chain with known data
 *
 * _Requirements: 8.6, 8.7_
 */

import { MockBlockStore } from '../../__tests__/helpers/mockBlockStore';
import { BrightChainDb } from '../database';
import { BsonDocument, SortSpec } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.setTimeout(30000);

function createDb(): BrightChainDb {
  const store = new MockBlockStore();
  return new BrightChainDb(store as any, { name: 'test-sort-skip-limit-unit' });
}

async function insertDocs(
  collection: ReturnType<BrightChainDb['collection']>,
  docs: BsonDocument[],
): Promise<void> {
  for (const doc of docs) {
    await collection.insertOne({ ...doc });
  }
}

function _stripIds(docs: BsonDocument[]): Record<string, unknown>[] {
  return docs.map(({ _id, ...rest }) => rest);
}

describe('Collection sort/skip/limit edge cases', () => {
  let db: BrightChainDb;

  beforeEach(async () => {
    db = createDb();
    await db.connect();
  });

  afterEach(async () => {
    await db.disconnect();
  });

  it('limit(0) returns an empty result set', async () => {
    const col = db.collection<BsonDocument>('items');
    await insertDocs(col, [{ val: 1 }, { val: 2 }, { val: 3 }]);

    const results = await col.find({}, { limit: 0 }).toArray();
    expect(results).toEqual([]);
  });

  it('skip exceeding total documents returns an empty result set', async () => {
    const col = db.collection<BsonDocument>('items');
    await insertDocs(col, [{ val: 1 }, { val: 2 }]);

    const results = await col.find({}, { skip: 100 }).toArray();
    expect(results).toEqual([]);
  });

  it('sort ascending orders by field value low to high', async () => {
    const col = db.collection<BsonDocument>('items');
    await insertDocs(col, [{ val: 30 }, { val: 10 }, { val: 20 }]);

    const sort = { val: 1 } as SortSpec<BsonDocument>;
    const results = await col.find({}, { sort }).toArray();
    const vals = results.map((d) => d['val']);
    expect(vals).toEqual([10, 20, 30]);
  });

  it('sort descending orders by field value high to low', async () => {
    const col = db.collection<BsonDocument>('items');
    await insertDocs(col, [{ val: 30 }, { val: 10 }, { val: 20 }]);

    const sort = { val: -1 } as SortSpec<BsonDocument>;
    const results = await col.find({}, { sort }).toArray();
    const vals = results.map((d) => d['val']);
    expect(vals).toEqual([30, 20, 10]);
  });

  it('multi-field sort uses secondary field for ties', async () => {
    const col = db.collection<BsonDocument>('items');
    await insertDocs(col, [
      { group: 'a', rank: 2 },
      { group: 'b', rank: 1 },
      { group: 'a', rank: 1 },
      { group: 'b', rank: 2 },
    ]);

    // Sort by group ascending, then rank ascending
    const sort = { group: 1, rank: 1 } as SortSpec<BsonDocument>;
    const results = await col.find({}, { sort }).toArray();
    const pairs = results.map((d) => [d['group'], d['rank']]);
    expect(pairs).toEqual([
      ['a', 1],
      ['a', 2],
      ['b', 1],
      ['b', 2],
    ]);
  });

  it('sort + skip + limit chain returns the correct slice', async () => {
    const col = db.collection<BsonDocument>('items');
    await insertDocs(col, [
      { val: 50 },
      { val: 10 },
      { val: 40 },
      { val: 20 },
      { val: 30 },
    ]);

    // Sort ascending: [10, 20, 30, 40, 50], skip 1 → [20, 30, 40, 50], limit 2 → [20, 30]
    const sort = { val: 1 } as SortSpec<BsonDocument>;
    const results = await col.find({}, { sort, skip: 1, limit: 2 }).toArray();
    const vals = results.map((d) => d['val']);
    expect(vals).toEqual([20, 30]);
  });

  it('skip(0) returns all documents', async () => {
    const col = db.collection<BsonDocument>('items');
    await insertDocs(col, [{ val: 1 }, { val: 2 }]);

    const results = await col.find({}, { skip: 0 }).toArray();
    expect(results).toHaveLength(2);
  });

  it('limit with no sort returns at most N documents', async () => {
    const col = db.collection<BsonDocument>('items');
    await insertDocs(col, [{ val: 1 }, { val: 2 }, { val: 3 }, { val: 4 }]);

    const results = await col.find({}, { limit: 2 }).toArray();
    expect(results).toHaveLength(2);
  });
});
