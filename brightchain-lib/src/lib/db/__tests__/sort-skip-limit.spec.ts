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
 * _Requirements: 8.1, 8.4_
 */

import type { SortSpec } from '@digitaldefiance/suite-core-lib';
import { BlockSize } from '../../enumerations/blockSize';
import type { BsonDocument } from '../../interfaces/storage/documentTypes';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { Collection } from '../collection';
import { InMemoryDatabase } from '../inMemoryDatabase';

jest.setTimeout(30000);

function createDb(): InMemoryDatabase {
  const store = new MemoryBlockStore(BlockSize.Small);
  return new InMemoryDatabase(store, { name: 'test-ssl-unit' });
}

function col(db: InMemoryDatabase): Collection<BsonDocument> {
  return db.collection<BsonDocument>('items') as Collection<BsonDocument>;
}

async function insertDocs(
  c: Collection<BsonDocument>,
  docs: BsonDocument[],
): Promise<void> {
  for (const doc of docs) {
    await c.insertOne({ ...doc });
  }
}

describe('Collection sort/skip/limit edge cases', () => {
  let db: InMemoryDatabase;

  beforeEach(async () => {
    db = createDb();
    await db.connect();
  });

  afterEach(async () => {
    await db.disconnect();
  });

  it('limit(0) returns an empty result set', async () => {
    const c = col(db);
    await insertDocs(c, [{ val: 1 }, { val: 2 }, { val: 3 }]);
    const results = await c.find({}, { limit: 0 }).toArray();
    expect(results).toEqual([]);
  });

  it('skip exceeding total documents returns empty', async () => {
    const c = col(db);
    await insertDocs(c, [{ val: 1 }, { val: 2 }]);
    const results = await c.find({}, { skip: 100 }).toArray();
    expect(results).toEqual([]);
  });

  it('sort ascending orders low to high', async () => {
    const c = col(db);
    await insertDocs(c, [{ val: 30 }, { val: 10 }, { val: 20 }]);
    const sort = { val: 1 } as SortSpec<BsonDocument>;
    const results = await c.find({}, { sort }).toArray();
    const vals = results.map((d: BsonDocument) => d['val']);
    expect(vals).toEqual([10, 20, 30]);
  });

  it('sort descending orders high to low', async () => {
    const c = col(db);
    await insertDocs(c, [{ val: 30 }, { val: 10 }, { val: 20 }]);
    const sort = { val: -1 } as SortSpec<BsonDocument>;
    const results = await c.find({}, { sort }).toArray();
    const vals = results.map((d: BsonDocument) => d['val']);
    expect(vals).toEqual([30, 20, 10]);
  });

  it('multi-field sort uses secondary field for ties', async () => {
    const c = col(db);
    await insertDocs(c, [
      { group: 'a', rank: 2 },
      { group: 'b', rank: 1 },
      { group: 'a', rank: 1 },
      { group: 'b', rank: 2 },
    ]);
    const sort = { group: 1, rank: 1 } as SortSpec<BsonDocument>;
    const results = await c.find({}, { sort }).toArray();
    const pairs = results.map((d: BsonDocument) => [d['group'], d['rank']]);
    expect(pairs).toEqual([
      ['a', 1],
      ['a', 2],
      ['b', 1],
      ['b', 2],
    ]);
  });

  it('sort + skip + limit returns correct slice', async () => {
    const c = col(db);
    await insertDocs(c, [
      { val: 50 },
      { val: 10 },
      { val: 40 },
      { val: 20 },
      { val: 30 },
    ]);
    // Ascending: [10,20,30,40,50], skip 1, limit 2 → [20,30]
    const sort = { val: 1 } as SortSpec<BsonDocument>;
    const opts = { sort, skip: 1, limit: 2 };
    const results = await c.find({}, opts).toArray();
    const vals = results.map((d: BsonDocument) => d['val']);
    expect(vals).toEqual([20, 30]);
  });

  it('skip(0) returns all documents', async () => {
    const c = col(db);
    await insertDocs(c, [{ val: 1 }, { val: 2 }]);
    const results = await c.find({}, { skip: 0 }).toArray();
    expect(results).toHaveLength(2);
  });

  it('limit with no sort returns at most N docs', async () => {
    const c = col(db);
    await insertDocs(c, [{ val: 1 }, { val: 2 }, { val: 3 }, { val: 4 }]);
    const results = await c.find({}, { limit: 2 }).toArray();
    expect(results).toHaveLength(2);
  });
});
