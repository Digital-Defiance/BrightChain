/**
 * BrightChainDb – comprehensive tests.
 *
 * Tests the top-level database API: collection management,
 * session/transaction lifecycle, cross-collection transactions,
 * and the withTransaction convenience helper.
 */

import { HeadRegistry } from '../lib/collection';
import { BrightChainDb } from '../lib/database';
import { MockBlockStore } from './helpers/mockBlockStore';

/* eslint-disable @typescript-eslint/no-explicit-any */

function makeDb(name = 'testdb'): {
  db: BrightChainDb;
  store: MockBlockStore;
  registry: HeadRegistry;
} {
  const store = new MockBlockStore();
  const registry = HeadRegistry.createIsolated();
  const db = new BrightChainDb(store as any, { name, headRegistry: registry });
  return { db, store, registry };
}

// ══════════════════════════════════════════════════════════════
// Constructor & basic properties
// ══════════════════════════════════════════════════════════════

describe('BrightChainDb – basics', () => {
  it('should create a database with default name', () => {
    const store = new MockBlockStore();
    const db = new BrightChainDb(store as any, {
      headRegistry: HeadRegistry.createIsolated(),
    });
    expect(db.name).toBe('brightchain');
  });

  it('should create a database with custom name', () => {
    const { db } = makeDb('mydb');
    expect(db.name).toBe('mydb');
  });
});

// ══════════════════════════════════════════════════════════════
// Collection management
// ══════════════════════════════════════════════════════════════

describe('BrightChainDb – collections', () => {
  it('should create collections lazily', () => {
    const { db } = makeDb();
    const users = db.collection('users');
    expect(users).toBeDefined();
    expect(users.name).toBe('users');
  });

  it('should return the same instance for the same collection name', () => {
    const { db } = makeDb();
    const c1 = db.collection('users');
    const c2 = db.collection('users');
    expect(c1).toBe(c2);
  });

  it('should return different instances for different names', () => {
    const { db } = makeDb();
    const users = db.collection('users');
    const orders = db.collection('orders');
    expect(users).not.toBe(orders);
  });

  it('should list all created collections', () => {
    const { db } = makeDb();
    db.collection('users');
    db.collection('orders');
    db.collection('products');
    const names = db.listCollections();
    expect(names).toHaveLength(3);
    expect(names).toContain('users');
    expect(names).toContain('orders');
    expect(names).toContain('products');
  });

  it('should list no collections initially', () => {
    const { db } = makeDb();
    expect(db.listCollections()).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// dropCollection
// ══════════════════════════════════════════════════════════════

describe('BrightChainDb – dropCollection', () => {
  it('should drop an existing collection', async () => {
    const { db } = makeDb();
    const coll = db.collection('todrop');
    await coll.insertOne({ name: 'test' });

    const dropped = await db.dropCollection('todrop');
    expect(dropped).toBe(true);
    expect(db.listCollections()).not.toContain('todrop');
  });

  it('should return false for non-existent collection', async () => {
    const { db } = makeDb();
    const dropped = await db.dropCollection('nonexistent');
    expect(dropped).toBe(false);
  });

  it('should clear documents on drop', async () => {
    const { db } = makeDb();
    const coll = db.collection('droptest');
    await coll.insertMany([{ v: 1 }, { v: 2 }, { v: 3 }]);
    await db.dropCollection('droptest');

    // Re-create collection – should be empty
    const coll2 = db.collection('droptest');
    const count = await coll2.estimatedDocumentCount();
    expect(count).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// CRUD through the database
// ══════════════════════════════════════════════════════════════

describe('BrightChainDb – CRUD through collections', () => {
  it('should insert and find documents', async () => {
    const { db } = makeDb();
    const users = db.collection('users');
    await users.insertOne({ _id: 'u1', name: 'Alice', age: 30 });
    await users.insertOne({ _id: 'u2', name: 'Bob', age: 25 });

    const alice = await users.findOne({ name: 'Alice' });
    expect(alice).not.toBeNull();
    expect(alice!['age']).toBe(30);

    const all = await users.find().toArray();
    expect(all).toHaveLength(2);
  });

  it('should support multiple collections independently', async () => {
    const { db } = makeDb();
    const users = db.collection('users');
    const orders = db.collection('orders');

    await users.insertOne({ _id: 'u1', name: 'Alice' });
    await orders.insertOne({ _id: 'o1', userId: 'u1', total: 99 });

    expect(await users.countDocuments()).toBe(1);
    expect(await orders.countDocuments()).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════
// Sessions & Transactions
// ══════════════════════════════════════════════════════════════

describe('BrightChainDb – sessions', () => {
  it('should start a session with a unique id', () => {
    const { db } = makeDb();
    const s1 = db.startSession();
    const s2 = db.startSession();
    expect(s1.id).toBeDefined();
    expect(s2.id).toBeDefined();
    expect(s1.id).not.toBe(s2.id);
  });

  it('should support transaction lifecycle manually', async () => {
    const { db } = makeDb();
    const users = db.collection('users');

    const session = db.startSession();
    session.startTransaction();

    // Operations within transaction are buffered
    await users.insertOne({ _id: 'tx1', name: 'TxUser' }, { session });

    // Before commit, doc is not visible via direct find (no session)
    const beforeCommit = await users.findById('tx1');
    expect(beforeCommit).toBeNull();

    // Commit applies buffered ops
    await session.commitTransaction();
    session.endSession();

    const afterCommit = await users.findById('tx1');
    expect(afterCommit).not.toBeNull();
    expect(afterCommit!['name']).toBe('TxUser');
  });

  it('should rollback transaction on abort', async () => {
    const { db } = makeDb();
    const users = db.collection('users');

    const session = db.startSession();
    session.startTransaction();
    await users.insertOne({ _id: 'abort1', name: 'Aborted' }, { session });
    await session.abortTransaction();
    session.endSession();

    // Document should not exist after abort
    const doc = await users.findById('abort1');
    expect(doc).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// withTransaction helper
// ══════════════════════════════════════════════════════════════

describe('BrightChainDb – withTransaction', () => {
  it('should commit on success', async () => {
    const { db } = makeDb();
    const users = db.collection('users');

    const result = await db.withTransaction(async (session) => {
      await users.insertOne({ _id: 'wt1', name: 'Alice' }, { session });
      await users.insertOne({ _id: 'wt2', name: 'Bob' }, { session });
      return 'done';
    });

    expect(result).toBe('done');
    expect(await users.findById('wt1')).not.toBeNull();
    expect(await users.findById('wt2')).not.toBeNull();
  });

  it('should abort on error and propagate the error', async () => {
    const { db } = makeDb();
    const users = db.collection('users');

    await expect(
      db.withTransaction(async (session) => {
        await users.insertOne({ _id: 'wt-fail', name: 'X' }, { session });
        throw new Error('intentional failure');
      }),
    ).rejects.toThrow('intentional failure');

    // Document should not exist after transaction error
    const doc = await users.findById('wt-fail');
    expect(doc).toBeNull();
  });

  it('should handle multi-collection transactions', async () => {
    const { db } = makeDb();
    const users = db.collection('users');
    const orders = db.collection('orders');

    await db.withTransaction(async (session) => {
      await users.insertOne({ _id: 'mc-u1', name: 'Alice' }, { session });
      await orders.insertOne(
        { _id: 'mc-o1', userId: 'mc-u1', total: 100 },
        { session },
      );
    });

    expect(await users.findById('mc-u1')).not.toBeNull();
    expect(await orders.findById('mc-o1')).not.toBeNull();
  });

  it('should support update and delete in transactions', async () => {
    const { db } = makeDb();
    const users = db.collection('users');

    // Pre-populate
    await users.insertOne({ _id: 'txu1', name: 'Alice', balance: 100 });
    await users.insertOne({ _id: 'txu2', name: 'Bob', balance: 50 });

    await db.withTransaction(async (session) => {
      await users.updateOne(
        { _id: 'txu1' },
        { $set: { balance: 75 } },
        { session },
      );
      await users.deleteOne({ _id: 'txu2' }, { session });
    });

    const alice = await users.findById('txu1');
    expect(alice!['balance']).toBe(75);
    const bob = await users.findById('txu2');
    expect(bob).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// Edge cases
// ══════════════════════════════════════════════════════════════

describe('BrightChainDb – edge cases', () => {
  it('should handle collections with same name across different databases', () => {
    const store = new MockBlockStore();
    const registry = HeadRegistry.createIsolated();
    const db1 = new BrightChainDb(store as any, {
      name: 'db1',
      headRegistry: registry,
    });
    const db2 = new BrightChainDb(store as any, {
      name: 'db2',
      headRegistry: registry,
    });

    const users1 = db1.collection('users');
    const users2 = db2.collection('users');
    expect(users1).not.toBe(users2);
  });

  it('should handle empty withTransaction', async () => {
    const { db } = makeDb();
    const result = await db.withTransaction(async () => {
      return 42;
    });
    expect(result).toBe(42);
  });

  it('should handle re-creating a dropped collection', async () => {
    const { db } = makeDb();
    const coll = db.collection('recreate');
    await coll.insertOne({ _id: 'r1', v: 1 });
    await db.dropCollection('recreate');

    const coll2 = db.collection('recreate');
    await coll2.insertOne({ _id: 'r2', v: 2 });
    const count = await coll2.countDocuments();
    expect(count).toBe(1);
    const doc = await coll2.findById('r2');
    expect(doc!['v']).toBe(2);
  });
});
