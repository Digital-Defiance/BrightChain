/**
 * Schema-driven unique index tests.
 *
 * Validates that CollectionSchema.indexes with unique constraints are
 * automatically created when setSchema() is called, and that they
 * enforce uniqueness on insert for both in-memory and disk-backed stores.
 */

import {
  BlockSize,
  PooledMemoryBlockStore,
} from '@brightchain/brightchain-lib';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Collection } from '../lib/collection';
import { BrightDb } from '../lib/database';
import {
  InMemoryHeadRegistry,
  PersistentHeadRegistry,
} from '../lib/headRegistry';
import { DuplicateKeyError } from '../lib/indexing';
import type { CollectionSchema } from '../lib/schemaValidation';
import { MockBlockStore } from './helpers/mockBlockStore';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Simple user schema with unique username and email indexes. */
const TEST_USER_SCHEMA: CollectionSchema = {
  name: 'testUser',
  properties: {
    _id: { type: 'string', required: true },
    username: { type: 'string', required: true },
    email: { type: 'string', required: true },
  },
  required: ['_id', 'username', 'email'],
  additionalProperties: true,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    { fields: { username: 1 }, options: { unique: true } },
    { fields: { email: 1 }, options: { unique: true } },
  ],
};

/** Schema with a compound unique index. */
const TEST_COMPOUND_SCHEMA: CollectionSchema = {
  name: 'testCompound',
  properties: {
    _id: { type: 'string', required: true },
    userId: { type: 'string', required: true },
    roleId: { type: 'string', required: true },
  },
  required: ['_id', 'userId', 'roleId'],
  additionalProperties: true,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    {
      fields: { userId: 1, roleId: 1 },
      options: { unique: true },
    },
  ],
};

/** Schema with no indexes (control case). */
const TEST_NO_INDEX_SCHEMA: CollectionSchema = {
  name: 'testNoIndex',
  properties: {
    _id: { type: 'string', required: true },
    name: { type: 'string', required: true },
  },
  required: ['_id', 'name'],
  additionalProperties: true,
  validationLevel: 'strict',
  validationAction: 'error',
};

function makeCollection(name = 'test'): {
  coll: Collection;
  store: MockBlockStore;
  registry: InMemoryHeadRegistry;
} {
  const store = new MockBlockStore();
  const registry = InMemoryHeadRegistry.createIsolated();
  const coll = new Collection(name, store as any, 'testdb', registry);
  return { coll, store, registry };
}

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(join(tmpdir(), 'schema-idx-'));
}

async function cleanupDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

// ══════════════════════════════════════════════════════════════
// In-memory store tests
// ══════════════════════════════════════════════════════════════

describe('Schema-driven unique indexes (in-memory)', () => {
  describe('setSchema auto-creates indexes', () => {
    it('should create indexes declared in the schema', () => {
      const { coll } = makeCollection('users');
      coll.setSchema(TEST_USER_SCHEMA);
      const indexes = coll.listIndexes();
      expect(indexes).toContain('username_1');
      expect(indexes).toContain('email_1');
    });

    it('should not create indexes when schema has no indexes field', () => {
      const { coll } = makeCollection('items');
      coll.setSchema(TEST_NO_INDEX_SCHEMA);
      const indexes = coll.listIndexes();
      expect(indexes).toHaveLength(0);
    });

    it('should create compound indexes', () => {
      const { coll } = makeCollection('user-roles');
      coll.setSchema(TEST_COMPOUND_SCHEMA);
      const indexes = coll.listIndexes();
      expect(indexes).toContain('userId_1_roleId_1');
    });
  });

  describe('unique constraint enforcement on insert', () => {
    it('should reject duplicate username', async () => {
      const { coll } = makeCollection('users');
      coll.setSchema(TEST_USER_SCHEMA);

      await coll.insertOne({
        _id: '1',
        username: 'alice',
        email: 'alice@example.com',
      });
      await expect(
        coll.insertOne({
          _id: '2',
          username: 'alice',
          email: 'bob@example.com',
        }),
      ).rejects.toThrow(DuplicateKeyError);
    });

    it('should reject duplicate email', async () => {
      const { coll } = makeCollection('users');
      coll.setSchema(TEST_USER_SCHEMA);

      await coll.insertOne({
        _id: '1',
        username: 'alice',
        email: 'alice@example.com',
      });
      await expect(
        coll.insertOne({
          _id: '2',
          username: 'bob',
          email: 'alice@example.com',
        }),
      ).rejects.toThrow(DuplicateKeyError);
    });

    it('should allow different username and email', async () => {
      const { coll } = makeCollection('users');
      coll.setSchema(TEST_USER_SCHEMA);

      await coll.insertOne({
        _id: '1',
        username: 'alice',
        email: 'alice@example.com',
      });
      const result = await coll.insertOne({
        _id: '2',
        username: 'bob',
        email: 'bob@example.com',
      });
      expect(result.acknowledged).toBe(true);
    });

    it('should reject duplicate compound key (userId + roleId)', async () => {
      const { coll } = makeCollection('user-roles');
      coll.setSchema(TEST_COMPOUND_SCHEMA);

      await coll.insertOne({ _id: '1', userId: 'u1', roleId: 'r1' });
      await expect(
        coll.insertOne({ _id: '2', userId: 'u1', roleId: 'r1' }),
      ).rejects.toThrow(DuplicateKeyError);
    });

    it('should allow same userId with different roleId', async () => {
      const { coll } = makeCollection('user-roles');
      coll.setSchema(TEST_COMPOUND_SCHEMA);

      await coll.insertOne({ _id: '1', userId: 'u1', roleId: 'r1' });
      const result = await coll.insertOne({
        _id: '2',
        userId: 'u1',
        roleId: 'r2',
      });
      expect(result.acknowledged).toBe(true);
    });
  });

  describe('unique constraint with insertMany', () => {
    it('should reject batch with internal duplicates', async () => {
      const { coll } = makeCollection('users');
      coll.setSchema(TEST_USER_SCHEMA);

      await expect(
        coll.insertMany([
          { _id: '1', username: 'alice', email: 'alice@example.com' },
          { _id: '2', username: 'alice', email: 'bob@example.com' },
        ]),
      ).rejects.toThrow(DuplicateKeyError);
    });

    it('should reject batch conflicting with existing docs', async () => {
      const { coll } = makeCollection('users');
      coll.setSchema(TEST_USER_SCHEMA);

      await coll.insertOne({
        _id: '1',
        username: 'alice',
        email: 'alice@example.com',
      });
      await expect(
        coll.insertMany([
          { _id: '2', username: 'bob', email: 'bob@example.com' },
          { _id: '3', username: 'alice', email: 'charlie@example.com' },
        ]),
      ).rejects.toThrow(DuplicateKeyError);
    });
  });

  describe('atomic rollback on duplicate key', () => {
    it('should not leave partial state after rejected insert', async () => {
      const { coll } = makeCollection('users');
      coll.setSchema(TEST_USER_SCHEMA);

      await coll.insertOne({
        _id: '1',
        username: 'alice',
        email: 'alice@example.com',
      });

      // This should fail — duplicate username
      await expect(
        coll.insertOne({
          _id: '2',
          username: 'alice',
          email: 'new@example.com',
        }),
      ).rejects.toThrow(DuplicateKeyError);

      // The failed doc should not exist
      const doc = await coll.findById('2');
      expect(doc).toBeNull();

      // Total count should still be 1
      const count = await coll.countDocuments();
      expect(count).toBe(1);
    });

    it('should still allow valid inserts after a rejected one', async () => {
      const { coll } = makeCollection('users');
      coll.setSchema(TEST_USER_SCHEMA);

      await coll.insertOne({
        _id: '1',
        username: 'alice',
        email: 'alice@example.com',
      });

      // Rejected
      await expect(
        coll.insertOne({
          _id: '2',
          username: 'alice',
          email: 'new@example.com',
        }),
      ).rejects.toThrow(DuplicateKeyError);

      // Valid insert should still work
      const result = await coll.insertOne({
        _id: '3',
        username: 'charlie',
        email: 'charlie@example.com',
      });
      expect(result.acknowledged).toBe(true);
      expect(await coll.countDocuments()).toBe(2);
    });
  });

  describe('schema applied via BrightDb', () => {
    it('should auto-create indexes when schema is set on db collection', () => {
      const store = new MockBlockStore();
      const registry = InMemoryHeadRegistry.createIsolated();
      const db = new BrightDb(store as any, {
        name: 'testdb',
        headRegistry: registry,
      });
      const coll = db.collection('users');
      coll.setSchema(TEST_USER_SCHEMA);

      const indexes = coll.listIndexes();
      expect(indexes).toContain('username_1');
      expect(indexes).toContain('email_1');
    });

    it('should enforce uniqueness through the database collection', async () => {
      const store = new MockBlockStore();
      const registry = InMemoryHeadRegistry.createIsolated();
      const db = new BrightDb(store as any, {
        name: 'testdb',
        headRegistry: registry,
      });
      const coll = db.collection('users');
      coll.setSchema(TEST_USER_SCHEMA);

      await coll.insertOne({
        _id: '1',
        username: 'alice',
        email: 'alice@example.com',
      });
      await expect(
        coll.insertOne({
          _id: '2',
          username: 'alice',
          email: 'different@example.com',
        }),
      ).rejects.toThrow(DuplicateKeyError);
    });
  });
});

// ══════════════════════════════════════════════════════════════
// Disk-backed store tests
// ══════════════════════════════════════════════════════════════

describe('Schema-driven unique indexes (disk-backed)', () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await makeTempDir();
  });

  afterEach(async () => {
    await cleanupDir(dataDir);
  });

  it('should create indexes and enforce uniqueness with PooledMemoryBlockStore', async () => {
    const store = new PooledMemoryBlockStore(BlockSize.Small);
    const db = new BrightDb(store, { name: 'disk-test', dataDir });
    const coll = db.collection('users');
    coll.setSchema(TEST_USER_SCHEMA);

    await coll.insertOne({
      _id: '1',
      username: 'alice',
      email: 'alice@example.com',
    });
    await expect(
      coll.insertOne({
        _id: '2',
        username: 'alice',
        email: 'bob@example.com',
      }),
    ).rejects.toThrow(DuplicateKeyError);
  });

  it('should allow non-duplicate inserts with disk-backed store', async () => {
    const store = new PooledMemoryBlockStore(BlockSize.Small);
    const db = new BrightDb(store, { name: 'disk-test', dataDir });
    const coll = db.collection('users');
    coll.setSchema(TEST_USER_SCHEMA);

    await coll.insertOne({
      _id: '1',
      username: 'alice',
      email: 'alice@example.com',
    });
    const result = await coll.insertOne({
      _id: '2',
      username: 'bob',
      email: 'bob@example.com',
    });
    expect(result.acknowledged).toBe(true);

    const count = await coll.countDocuments();
    expect(count).toBe(2);
  });

  it('should enforce compound unique index with disk-backed store', async () => {
    const store = new PooledMemoryBlockStore(BlockSize.Small);
    const db = new BrightDb(store, { name: 'disk-test', dataDir });
    const coll = db.collection('user-roles');
    coll.setSchema(TEST_COMPOUND_SCHEMA);

    await coll.insertOne({ _id: '1', userId: 'u1', roleId: 'r1' });
    await expect(
      coll.insertOne({ _id: '2', userId: 'u1', roleId: 'r1' }),
    ).rejects.toThrow(DuplicateKeyError);

    // Different compound key should succeed
    const result = await coll.insertOne({
      _id: '3',
      userId: 'u1',
      roleId: 'r2',
    });
    expect(result.acknowledged).toBe(true);
  });

  it('should persist data and maintain uniqueness across db instances', async () => {
    const store = new PooledMemoryBlockStore(BlockSize.Small);

    // Instance 1: insert a user
    const db1 = new BrightDb(store, {
      name: 'persist-unique',
      dataDir,
    });
    const coll1 = db1.collection('users');
    coll1.setSchema(TEST_USER_SCHEMA);
    await coll1.insertOne({
      _id: '1',
      username: 'alice',
      email: 'alice@example.com',
    });

    // Instance 2: re-open, re-apply schema, try duplicate
    const registry2 = new PersistentHeadRegistry({ dataDir });
    await registry2.load();
    const db2 = new BrightDb(store, {
      name: 'persist-unique',
      headRegistry: registry2,
    });
    const coll2 = db2.collection('users');
    coll2.setSchema(TEST_USER_SCHEMA);

    // The existing doc should be loaded; duplicate username should fail
    await expect(
      coll2.insertOne({
        _id: '2',
        username: 'alice',
        email: 'different@example.com',
      }),
    ).rejects.toThrow(DuplicateKeyError);

    // A non-duplicate should succeed
    const result = await coll2.insertOne({
      _id: '3',
      username: 'bob',
      email: 'bob@example.com',
    });
    expect(result.acknowledged).toBe(true);
  });
});
