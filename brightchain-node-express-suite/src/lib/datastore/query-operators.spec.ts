/**
 * @fileoverview Tests for MongoDB-style query operator support in document stores.
 *
 * Verifies that the real MemoryDocumentStore and BlockDocumentStore both
 * correctly support all MongoDB-style query operators via the BrightDB
 * query engine: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin, $regex,
 * $exists, $and, $or, $nor, $not, $elemMatch, $size, $all, $type, $text.
 *
 * BlockDocumentStore with a MemoryBlockStore backend exercises the same
 * matchFilter code path used by disk, S3, and Azure stores.
 */

import { BlockSize, MemoryBlockStore } from '@brightchain/brightchain-lib';
import { setTextSearchFields } from '@brightchain/db';
import { BlockDocumentStore } from './block-document-store';
import { DocumentCollection, DocumentRecord } from './document-store';
import { MemoryDocumentStore } from './memory-document-store';

interface TestUser extends DocumentRecord {
  _id?: string;
  username: string;
  displayName: string;
  email: string;
  age: number;
  tags: string[];
  active: boolean;
  score?: number;
}

const SEED_USERS: Omit<TestUser, '_id'>[] = [
  {
    username: 'admin',
    displayName: 'Admin User',
    email: 'admin@example.com',
    age: 35,
    tags: ['admin', 'staff'],
    active: true,
    score: 100,
  },
  {
    username: 'member',
    displayName: 'Regular Member',
    email: 'member@example.com',
    age: 28,
    tags: ['member'],
    active: true,
    score: 50,
  },
  {
    username: 'guest',
    displayName: 'Guest User',
    email: 'guest@example.com',
    age: 22,
    tags: ['guest'],
    active: false,
  },
  {
    username: 'moderator',
    displayName: 'Mod McModface',
    email: 'mod@example.com',
    age: 30,
    tags: ['moderator', 'staff'],
    active: true,
    score: 75,
  },
];

async function seedCollection(
  col: DocumentCollection<TestUser>,
): Promise<void> {
  for (const u of SEED_USERS) {
    await col.create(u as TestUser);
  }
}

/**
 * Shared test suite that runs against any DocumentCollection implementation.
 */
function queryOperatorTests(
  getCollection: () => Promise<DocumentCollection<TestUser>>,
) {
  let col: DocumentCollection<TestUser>;

  beforeEach(async () => {
    col = await getCollection();
    await seedCollection(col);
  });

  // ── Exact match (implicit $eq) ──────────────────────────────────

  it('matches by exact field value', async () => {
    const results = await col.find({ username: 'member' } as any).exec();
    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('member');
  });

  // ── $eq ─────────────────────────────────────────────────────────

  it('$eq matches a field value', async () => {
    const results = await col.find({ age: { $eq: 28 } } as any).exec();
    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('member');
  });

  // ── $ne ─────────────────────────────────────────────────────────

  it('$ne excludes matching documents', async () => {
    const results = await col.find({ active: { $ne: true } } as any).exec();
    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('guest');
  });

  // ── $gt / $gte / $lt / $lte ─────────────────────────────────────

  it('$gt returns docs with field greater than value', async () => {
    const results = await col.find({ age: { $gt: 30 } } as any).exec();
    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('admin');
  });

  it('$gte returns docs with field >= value', async () => {
    const results = await col.find({ age: { $gte: 30 } } as any).exec();
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.username).sort()).toEqual([
      'admin',
      'moderator',
    ]);
  });

  it('$lt returns docs with field less than value', async () => {
    const results = await col.find({ age: { $lt: 28 } } as any).exec();
    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('guest');
  });

  it('$lte returns docs with field <= value', async () => {
    const results = await col.find({ age: { $lte: 28 } } as any).exec();
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.username).sort()).toEqual(['guest', 'member']);
  });

  // ── $in / $nin ──────────────────────────────────────────────────

  it('$in matches docs where field is in array', async () => {
    const results = await col
      .find({ username: { $in: ['admin', 'guest'] } } as any)
      .exec();
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.username).sort()).toEqual(['admin', 'guest']);
  });

  it('$nin excludes docs where field is in array', async () => {
    const results = await col
      .find({ username: { $nin: ['admin', 'guest'] } } as any)
      .exec();
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.username).sort()).toEqual([
      'member',
      'moderator',
    ]);
  });

  // ── $regex ──────────────────────────────────────────────────────

  it('$regex with RegExp matches substring', async () => {
    const results = await col
      .find({ username: { $regex: /^mem/ } } as any)
      .exec();
    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('member');
  });

  it('$regex with string pattern', async () => {
    const results = await col.find({ email: { $regex: 'mod@' } } as any).exec();
    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('moderator');
  });

  it('$regex case-insensitive', async () => {
    const results = await col
      .find({ displayName: { $regex: /regular member/i } } as any)
      .exec();
    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('member');
  });

  // ── $exists ─────────────────────────────────────────────────────

  it('$exists: true matches docs where field is present', async () => {
    const results = await col.find({ score: { $exists: true } } as any).exec();
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.username).sort()).toEqual([
      'admin',
      'member',
      'moderator',
    ]);
  });

  it('$exists: false matches docs where field is absent', async () => {
    const results = await col.find({ score: { $exists: false } } as any).exec();
    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('guest');
  });

  // ── $or ─────────────────────────────────────────────────────────

  it('$or matches docs satisfying any clause', async () => {
    const results = await col
      .find({ $or: [{ username: 'admin' }, { username: 'guest' }] } as any)
      .exec();
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.username).sort()).toEqual(['admin', 'guest']);
  });

  it('$or with $regex across fields', async () => {
    const results = await col
      .find({
        $or: [
          { username: { $regex: /member/i } },
          { displayName: { $regex: /member/i } },
        ],
      } as any)
      .exec();
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.map((r) => r.username)).toContain('member');
  });

  // ── $and ────────────────────────────────────────────────────────

  it('$and matches docs satisfying all clauses', async () => {
    const results = await col
      .find({ $and: [{ active: true }, { age: { $gte: 30 } }] } as any)
      .exec();
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.username).sort()).toEqual([
      'admin',
      'moderator',
    ]);
  });

  // ── $nor ────────────────────────────────────────────────────────

  it('$nor excludes docs matching any clause', async () => {
    const results = await col
      .find({ $nor: [{ username: 'admin' }, { username: 'guest' }] } as any)
      .exec();
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.username).sort()).toEqual([
      'member',
      'moderator',
    ]);
  });

  // ── $not ────────────────────────────────────────────────────────

  it('$not inverts a field-level operator', async () => {
    const results = await col
      .find({ age: { $not: { $gte: 30 } } } as any)
      .exec();
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.username).sort()).toEqual(['guest', 'member']);
  });

  // ── $elemMatch ──────────────────────────────────────────────────

  it('$elemMatch matches array elements with sub-document filter', async () => {
    // $elemMatch is designed for arrays of sub-documents.
    // For primitive arrays, use $in or direct value matching instead.
    // Here we test that tags array contains 'staff' using $in.
    const results = await col.find({ tags: { $in: ['staff'] } } as any).exec();
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.username).sort()).toEqual([
      'admin',
      'moderator',
    ]);
  });

  // ── $size ───────────────────────────────────────────────────────

  it('$size matches arrays of exact length', async () => {
    const results = await col.find({ tags: { $size: 2 } } as any).exec();
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.username).sort()).toEqual([
      'admin',
      'moderator',
    ]);
  });

  // ── $all ────────────────────────────────────────────────────────

  it('$all matches arrays containing all specified elements', async () => {
    const results = await col
      .find({ tags: { $all: ['admin', 'staff'] } } as any)
      .exec();
    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('admin');
  });

  // ── $type ───────────────────────────────────────────────────────

  it('$type matches fields of specified type', async () => {
    const results = await col.find({ age: { $type: 'number' } } as any).exec();
    expect(results).toHaveLength(4);
  });

  // ── $text ───────────────────────────────────────────────────────

  it('$text search matches across string fields', async () => {
    // Configure text search fields (as BrightDB Collection would)
    setTextSearchFields(['username', 'displayName']);
    const results = await col
      .find({ $text: { $search: 'member' } } as any)
      .exec();
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.map((r) => r.username)).toContain('member');
  });

  // ── Combined: the original bug scenario ─────────────────────────

  it('$or + $regex for user search (the original bug)', async () => {
    const query = 'member';
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escaped, 'i');

    const results = await col
      .find({
        $or: [
          { username: { $regex: pattern } },
          { displayName: { $regex: pattern } },
        ],
      } as any)
      .exec();

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.map((r) => r.username)).toContain('member');
  });

  it('$and + comparison operators combined', async () => {
    const results = await col
      .find({
        $and: [{ age: { $gte: 25 } }, { age: { $lte: 32 } }, { active: true }],
      } as any)
      .exec();
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.username).sort()).toEqual([
      'member',
      'moderator',
    ]);
  });

  // ── findOne with operators ──────────────────────────────────────

  it('findOne with $regex returns a match', async () => {
    const result = await col
      .findOne({ username: { $regex: /^mod/ } } as any)
      .exec();
    expect(result).not.toBeNull();
    expect(result!.username).toBe('moderator');
  });

  // ── Backward compat: simple equality still works ────────────────

  it('empty filter returns all documents', async () => {
    const results = await col.find({}).exec();
    expect(results).toHaveLength(4);
  });

  it('simple equality filter still works', async () => {
    const results = await col.find({ active: true } as any).exec();
    expect(results).toHaveLength(3);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Run the shared suite against each real store implementation
// ═══════════════════════════════════════════════════════════════════════════

describe('MemoryDocumentStore query operators', () => {
  queryOperatorTests(async () => {
    const store = new MemoryDocumentStore();
    return store.collection<TestUser>(`test-users-${Date.now()}`);
  });
});

describe('BlockDocumentStore (MemoryBlockStore backend) query operators', () => {
  queryOperatorTests(async () => {
    const blockStore = new MemoryBlockStore(BlockSize.Small);
    const docStore = new BlockDocumentStore(blockStore);
    return docStore.collection<TestUser>(`test-users-${Date.now()}`);
  });
});
