/**
 * nowBdClock – unit tests for the injectable `nowBd` clock.
 *
 * Verifies that:
 *   1. A custom `nowBd` clock is used for per-document write timestamps
 *      (tested indirectly via gossip merge LWW behaviour).
 *   2. A custom `nowBd` clock is used for TTL cutoff in `sweepTTL`.
 *   3. `BrightDb` forwards its `nowBd` option to every `Collection` it creates.
 *
 * _Requirements: 3.1, 8.1_
 */

import { brightDateNow } from '@brightchain/brightchain-lib';
import type { IHeadRegistry } from '@brightchain/brightchain-lib/lib/interfaces/storage/headRegistry';
import { Collection } from '../lib/collection';
import { BrightDb } from '../lib/database';
import { InMemoryHeadRegistry } from '../lib/headRegistry';
import { MockBlockStore } from './helpers/mockBlockStore';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Allow pending async microtasks / setImmediate callbacks to drain.
 * Needed after gossip-triggered mergeFromGossipHead() calls.
 * Multiple ticks are needed because mergeFromGossipHead chains several
 * async operations (store.getData → JSON.parse → persistMeta → store.put).
 */
async function flushAsync(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await new Promise<void>((r) => setImmediate(r));
  }
}

/**
 * Simulate gossip: push registryA's current head for (db, collection) into
 * registryB using a timestamp that is strictly newer than any real-clock
 * timestamp stored in the registry.
 *
 * We use `brightDateNow() + offset` so the gossip always passes the LWW
 * check in the registry regardless of when the test runs.
 *
 * Note: the registry-level timestamp only controls whether `onHeadChange`
 * fires. The per-document LWW comparison inside `mergeFromGossipHead` uses
 * the `docTimestamps` stored in the meta block, which are set by `nowBd`.
 */
async function gossipAtoB(
  dbName: string,
  collectionName: string,
  registryA: IHeadRegistry,
  registryB: IHeadRegistry,
  offset = 1.0, // 1 day ahead — always beats real clock
): Promise<void> {
  const head = registryA.getHead(dbName, collectionName);
  if (!head) return;
  await registryB.mergeHeadUpdate(
    dbName,
    collectionName,
    head,
    brightDateNow() + offset,
  );
  await flushAsync();
}

// ─── Test 1: Custom nowBd is used for write timestamps ───────────────────────

describe('nowBd clock – write timestamps (gossip merge LWW)', () => {
  /**
   * Strategy: create two Collection instances sharing the same MockBlockStore.
   *   - collA uses nowBd = () => 9000.0  (frozen clock)
   *   - collB uses nowBd = () => 9001.0  (strictly newer)
   *
   * The gossip merge LWW comparison is based on `docTimestamps` stored in
   * the meta block — NOT on the registry-level timestamps. So:
   *
   * Test A: collA inserts (docTs=9000), collB updates (docTs=9001),
   *         gossip B→A: 9001 > 9000 → collA adopts B's version.
   *
   * Test B: collB inserts (docTs=8999), collA updates (docTs=9000),
   *         gossip B→A again: 8999 < 9000 → collA keeps its own version.
   */

  const DB = 'nowbd-write-ts';
  const COL = 'items';
  const DOC_ID = 'doc-1';

  it('remote update at 9001.0 wins over local write at 9000.0', async () => {
    // Shared block store so both collections can read each other's blocks
    const store = new MockBlockStore();

    const regA = InMemoryHeadRegistry.createIsolated() as unknown as IHeadRegistry;
    const regB = InMemoryHeadRegistry.createIsolated() as unknown as IHeadRegistry;

    // collA: frozen clock at 9000.0
    const collA = new Collection<{ _id: string; value: string }>(
      COL,
      store as any,
      DB,
      regA as any,
      { nowBd: () => 9000.0 },
    );

    // collB: frozen clock at 9001.0 (strictly newer)
    const collB = new Collection<{ _id: string; value: string }>(
      COL,
      store as any,
      DB,
      regB as any,
      { nowBd: () => 9001.0 },
    );

    // collA writes the document first (docTimestamp = 9000.0)
    await collA.insertOne({ _id: DOC_ID, value: 'from-A' });

    // Gossip A → B so collB loads A's state (docTs=9000 in the meta block)
    await gossipAtoB(DB, COL, regA, regB);

    // collB overwrites the same document (docTimestamp = 9001.0)
    await collB.updateOne({ _id: DOC_ID }, { $set: { value: 'from-B' } });

    // Gossip B → A: mergeFromGossipHead reads B's meta block which has
    // docTimestamps['doc-1'] = 9001.0. collA's local docTimestamps['doc-1'] = 9000.0.
    // Since 9001.0 > 9000.0, collA adopts B's version.
    await gossipAtoB(DB, COL, regB, regA);

    const docInA = await collA.findById(DOC_ID);
    expect(docInA).not.toBeNull();
    expect(docInA!['value']).toBe('from-B');
  });

  it('remote update at 8999.0 loses to local write at 9000.0', async () => {
    const store = new MockBlockStore();

    const regA = InMemoryHeadRegistry.createIsolated() as unknown as IHeadRegistry;
    const regB = InMemoryHeadRegistry.createIsolated() as unknown as IHeadRegistry;

    // collA: frozen clock at 9000.0
    const collA = new Collection<{ _id: string; value: string }>(
      COL,
      store as any,
      DB + '-stale',
      regA as any,
      { nowBd: () => 9000.0 },
    );

    // collB: frozen clock at 8999.0 (older than collA)
    const collB = new Collection<{ _id: string; value: string }>(
      COL,
      store as any,
      DB + '-stale',
      regB as any,
      { nowBd: () => 8999.0 },
    );

    // collB writes first (docTimestamp = 8999.0)
    await collB.insertOne({ _id: DOC_ID, value: 'from-B-old' });

    // Gossip B → A so collA loads B's state (docTs=8999 in the meta block)
    await gossipAtoB(DB + '-stale', COL, regB, regA);

    // collA overwrites with a newer timestamp (9000.0 > 8999.0)
    await collA.updateOne({ _id: DOC_ID }, { $set: { value: 'from-A-new' } });

    // Gossip B → A again: mergeFromGossipHead reads B's meta block which has
    // docTimestamps['doc-1'] = 8999.0. collA's local docTimestamps['doc-1'] = 9000.0.
    // Since 8999.0 < 9000.0, collA keeps its own version.
    await gossipAtoB(DB + '-stale', COL, regB, regA);

    const docInA = await collA.findById(DOC_ID);
    expect(docInA).not.toBeNull();
    expect(docInA!['value']).toBe('from-A-new');
  });
});

// ─── Test 2: Custom nowBd is used for TTL cutoff ─────────────────────────────

describe('nowBd clock – TTL cutoff in sweepTTL', () => {
  /**
   * sweepTTL(field, expireAfterSeconds) computes:
   *   cutoff = nowBd() - expireAfterSeconds / 86400
   *
   * A document is expired when doc[field] <= cutoff.
   *
   * With nowBd = () => 1000.0 and expireAfterSeconds = 86400 (1 day):
   *   cutoff = 1000.0 - 1.0 = 999.0
   *
   * A document with createdAt = 998.9 (< 999.0) should be expired.
   * A document with createdAt = 999.5 (> 999.0) should NOT be expired.
   */

  it('expires a document whose timestamp is below the cutoff', async () => {
    const store = new MockBlockStore();
    const registry = InMemoryHeadRegistry.createIsolated();

    // nowBd frozen at 1000.0; expireAfterSeconds = 86400 → cutoff = 999.0
    const coll = new Collection(
      'ttl-test',
      store as any,
      'testdb',
      registry,
      { nowBd: () => 1000.0 },
    );

    // Insert a document with createdAt = 998.9 (below cutoff 999.0)
    await coll.insertOne({ _id: 'old-doc', createdAt: 998.9 });

    const swept = await coll.sweepTTL('createdAt', 86400);
    expect(swept).toBe(1);

    const doc = await coll.findById('old-doc');
    expect(doc).toBeNull();
  });

  it('does NOT expire a document whose timestamp is above the cutoff', async () => {
    const store = new MockBlockStore();
    const registry = InMemoryHeadRegistry.createIsolated();

    // nowBd frozen at 1000.0; expireAfterSeconds = 86400 → cutoff = 999.0
    const coll = new Collection(
      'ttl-test-keep',
      store as any,
      'testdb',
      registry,
      { nowBd: () => 1000.0 },
    );

    // Insert a document with createdAt = 999.5 (above cutoff 999.0)
    await coll.insertOne({ _id: 'fresh-doc', createdAt: 999.5 });

    const swept = await coll.sweepTTL('createdAt', 86400);
    expect(swept).toBe(0);

    const doc = await coll.findById('fresh-doc');
    expect(doc).not.toBeNull();
  });

  it('changing nowBd changes which documents are expired', async () => {
    // With nowBd = 999.0, cutoff = 998.0 → doc at 998.5 is NOT expired
    const store1 = new MockBlockStore();
    const registry1 = InMemoryHeadRegistry.createIsolated();
    const collEarly = new Collection(
      'ttl-test-early',
      store1 as any,
      'testdb',
      registry1,
      { nowBd: () => 999.0 },
    );

    await collEarly.insertOne({ _id: 'borderline-doc', createdAt: 998.5 });

    const sweptEarly = await collEarly.sweepTTL('createdAt', 86400);
    expect(sweptEarly).toBe(0);

    // Now use a later clock: nowBd = 1000.0, cutoff = 999.0 → doc at 998.5 IS expired
    const store2 = new MockBlockStore();
    const registry2 = InMemoryHeadRegistry.createIsolated();
    const collLate = new Collection(
      'ttl-test-late',
      store2 as any,
      'testdb',
      registry2,
      { nowBd: () => 1000.0 },
    );

    await collLate.insertOne({ _id: 'borderline-doc', createdAt: 998.5 });

    const sweptLate = await collLate.sweepTTL('createdAt', 86400);
    expect(sweptLate).toBe(1);
  });
});

// ─── Test 3: BrightDb forwards nowBd to Collection ───────────────────────────

describe('nowBd clock – BrightDb forwards clock to Collection', () => {
  /**
   * Create a BrightDb with nowBd = () => 5000.0.
   * Get a collection from it.
   * Verify the collection uses the same clock by checking TTL behaviour:
   *   cutoff = 5000.0 - 1.0 = 4999.0
   *   doc with createdAt = 4998.0 should be swept.
   *   doc with createdAt = 4999.5 should survive.
   */

  it('collection obtained from BrightDb uses the database nowBd clock', async () => {
    const store = new MockBlockStore();
    const registry = InMemoryHeadRegistry.createIsolated();

    const db = new BrightDb(store as any, {
      name: 'nowbd-forward-db',
      headRegistry: registry,
      nowBd: () => 5000.0,
    });

    const coll = db.collection<{ _id: string; createdAt: number }>('forward-test');

    // Insert one document that should expire (createdAt = 4998.0 < cutoff 4999.0)
    await coll.insertOne({ _id: 'expired', createdAt: 4998.0 });
    // Insert one document that should survive (createdAt = 4999.5 > cutoff 4999.0)
    await coll.insertOne({ _id: 'alive', createdAt: 4999.5 });

    const swept = await coll.sweepTTL('createdAt', 86400);
    expect(swept).toBe(1);

    expect(await coll.findById('expired')).toBeNull();
    expect(await coll.findById('alive')).not.toBeNull();
  });

  it('two collections from the same BrightDb share the same nowBd clock', async () => {
    const store = new MockBlockStore();
    const registry = InMemoryHeadRegistry.createIsolated();

    const db = new BrightDb(store as any, {
      name: 'nowbd-shared-db',
      headRegistry: registry,
      nowBd: () => 7000.0,
    });

    // cutoff = 7000.0 - 1.0 = 6999.0
    const collA = db.collection<{ _id: string; createdAt: number }>('shared-a');
    const collB = db.collection<{ _id: string; createdAt: number }>('shared-b');

    // Both collections should use the same clock
    await collA.insertOne({ _id: 'old-a', createdAt: 6998.0 }); // below cutoff
    await collB.insertOne({ _id: 'old-b', createdAt: 6998.0 }); // below cutoff

    const sweptA = await collA.sweepTTL('createdAt', 86400);
    const sweptB = await collB.sweepTTL('createdAt', 86400);

    expect(sweptA).toBe(1);
    expect(sweptB).toBe(1);
  });
});
