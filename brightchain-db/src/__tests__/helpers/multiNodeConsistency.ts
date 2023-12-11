/**
 * @fileoverview Multi-node consistency test harness for BrightDB.
 *
 * Tests eventual-consistency guarantees when multiple BrightDb nodes share
 * the same block store but carry independent head registries. Gossip is
 * simulated by calling `mergeSnapshot()` / `mergeHeadUpdate()` between
 * registry instances.
 *
 * Unlike gossipConsistency.spec.ts (which pokes Collection internals via mocks),
 * these tests exercise the full public BrightDb API end-to-end.
 *
 * Driver variants (in-memory vs disk) are injected via the `MultiNodeFactory`
 * interface so the same scenarios run against every storage backend.
 *
 * Scenarios:
 *   1. Unidirectional gossip  — nodeA writes, gossip flows to nodeB
 *   2. Bidirectional gossip   — both nodes write, full sync converges them
 *   3. LWW rejects stale      — older gossip does NOT overwrite newer local state
 *   4. Tombstone beats write  — delete at T+1 wins over insert at T
 *   5. Write beats tombstone  — insert at T+1 wins over delete at T
 *   6. Snapshot gossip        — exportSnapshot/mergeSnapshot API convergence
 *   7. Three-node convergence — A→B, B→C, then C has A's writes
 */

import {
  initializeBrightChain,
  PooledMemoryBlockStore,
  resetInitialization,
} from '@brightchain/brightchain-lib';
import type { IHeadRegistry } from '@brightchain/brightchain-lib/lib/interfaces/storage/headRegistry';
import type { ICollectionHeadRegistry } from '../../lib/collection';
import { BrightDb } from '../../lib/database';

// ─── Public factory interface ────────────────────────────────────────────────

/**
 * Implement this interface for each driver variant.
 * A single shared block store is reused across all nodes in each test.
 */
export interface MultiNodeFactory {
  /** Human-readable label shown in describe() output */
  label: string;
  /**
   * Called once per test suite (beforeAll).
   * Must return the single shared block store and the first node's registry.
   */
  createSharedStore(): Promise<{
    store: PooledMemoryBlockStore;
  }>;
  /**
   * Create an independent registry for a single node.
   * Called once per node, per test.
   * Returns the full IHeadRegistry so gossip helpers can call mergeSnapshot etc.
   */
  createNodeRegistry(): Promise<IHeadRegistry>;
  /**
   * Release any temporary directories / handles created during the suite.
   * Called once (afterAll).
   */
  cleanup(): Promise<void>;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Allow pending `void` async calls (e.g. mergeFromGossipHead) to drain.
 * Two ticks: first for the initial Promise, second for nested store.put.
 */
async function flushAsync(): Promise<void> {
  await new Promise<void>((r) => setImmediate(r));
  await new Promise<void>((r) => setImmediate(r));
}

/**
 * Gossip node A's current head for (db, collection) into nodeB's registry
 * using a timestamp guaranteed to be strictly newer than the current clock.
 */
async function gossipAtoB(
  dbName: string,
  collectionName: string,
  registryA: IHeadRegistry,
  registryB: IHeadRegistry,
): Promise<void> {
  const head = registryA.getHead(dbName, collectionName);
  if (!head) return;
  await registryB.mergeHeadUpdate(
    dbName,
    collectionName,
    head,
    new Date(Date.now() + 100),
  );
  await flushAsync();
}

/** Full snapshot-based gossip — replicates ALL heads from A into B. */
async function snapshotSync(
  registryA: IHeadRegistry,
  registryB: IHeadRegistry,
): Promise<void> {
  const snapshot = registryA.exportSnapshot();
  // Bump every timestamp by 100 ms so the LWW check always fires for updates
  const bumped: Array<
    readonly [string, { blockId: string; timestamp: string }]
  > = [...snapshot].map(([key, rec]) => [
    key,
    {
      blockId: rec.blockId,
      timestamp: new Date(
        new Date(rec.timestamp).getTime() + 100,
      ).toISOString(),
    },
  ]);
  await registryB.mergeSnapshot(bumped);
  await flushAsync();
}

async function makeNode(
  store: PooledMemoryBlockStore,
  registry: IHeadRegistry,
  dbName: string,
): Promise<BrightDb> {
  const db = new BrightDb(store, {
    name: dbName,
    headRegistry: registry as unknown as ICollectionHeadRegistry,
  });
  await db.connect();
  return db;
}

// ─── Harness ─────────────────────────────────────────────────────────────────

export function runMultiNodeConsistency(factory: MultiNodeFactory): void {
  // Tests exercise real async I/O — allow generous timeout
  jest.setTimeout(30_000);

  let sharedStore: PooledMemoryBlockStore;

  beforeAll(async () => {
    initializeBrightChain();
    const created = await factory.createSharedStore();
    sharedStore = created.store;
  });

  afterAll(async () => {
    resetInitialization();
    await factory.cleanup();
  });

  // ── Scenario 1: Unidirectional gossip ─────────────────────────────────────

  describe('Scenario 1 – unidirectional gossip: A writes, B converges', () => {
    it('nodeB sees nodeA write after gossip', async () => {
      const DB = 'gossip-uni';
      const COL = 'users';

      const regA = await factory.createNodeRegistry();
      const regB = await factory.createNodeRegistry();

      const nodeA = await makeNode(sharedStore, regA, DB);
      const nodeB = await makeNode(sharedStore, regB, DB);

      const colA = nodeA.collection(COL);
      await colA.insertOne({ _id: 'u1', name: 'Alice' });

      // Before gossip: nodeB has no knowledge of the write
      const colB = nodeB.collection(COL);
      const beforeGossip = await colB.find({});
      expect(beforeGossip).toHaveLength(0);

      // Gossip A → B
      await gossipAtoB(DB, COL, regA, regB);

      const afterGossip = await colB.find({});
      expect(afterGossip).toHaveLength(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((afterGossip[0] as any).name).toBe('Alice');
    });
  });

  // ── Scenario 2: Bidirectional gossip ─────────────────────────────────────

  describe('Scenario 2 – bidirectional gossip: both nodes converge to union', () => {
    it('after full sync both nodes hold all documents', async () => {
      const DB = 'gossip-bi';
      const COL = 'items';

      const regA = await factory.createNodeRegistry();
      const regB = await factory.createNodeRegistry();

      const nodeA = await makeNode(sharedStore, regA, DB);
      const nodeB = await makeNode(sharedStore, regB, DB);

      // Each node writes its own document independently
      await nodeA.collection(COL).insertOne({ _id: 'item-a', origin: 'A' });
      await nodeB.collection(COL).insertOne({ _id: 'item-b', origin: 'B' });

      // Warm-up: confirm each only knows its own doc before sync
      expect(await nodeA.collection(COL).find({})).toHaveLength(1);
      expect(await nodeB.collection(COL).find({})).toHaveLength(1);

      // Full bidirectional sync via snapshot
      await snapshotSync(regA, regB);
      await snapshotSync(regB, regA);

      // Both nodes should now hold both documents
      const docsA = await nodeA.collection(COL).find({});
      const docsB = await nodeB.collection(COL).find({});

      const idsA = docsA.map((d) => (d as { _id: string })._id).sort();
      const idsB = docsB.map((d) => (d as { _id: string })._id).sort();

      expect(idsA).toEqual(['item-a', 'item-b']);
      expect(idsB).toEqual(['item-a', 'item-b']);
    });
  });

  // ── Scenario 3: LWW rejects stale gossip ──────────────────────────────────

  describe('Scenario 3 – LWW rejects stale gossip', () => {
    it('a stale head update does not overwrite a newer local write', async () => {
      const DB = 'gossip-lww';
      const COL = 'products';

      const regA = await factory.createNodeRegistry();
      const regStale = await factory.createNodeRegistry();

      // Build stale state: insert product at price 9.99
      jest.spyOn(Date, 'now').mockReturnValueOnce(100);
      const staleNode = await makeNode(sharedStore, regStale, DB);
      await staleNode.collection(COL).insertOne({ _id: 'p1', price: 9.99 });
      const staleHead = regStale.getHead(DB, COL)!;

      // Build live state: same doc, written later, at price 29.99
      jest.spyOn(Date, 'now').mockReturnValueOnce(200);
      const nodeA = await makeNode(sharedStore, regA, DB);
      await nodeA.collection(COL).insertOne({ _id: 'p1', price: 29.99 });
      await nodeA.collection(COL).find({}); // warm up

      // Gossip stale head with a timestamp that is OLDER than what nodeA has
      await regA.mergeHeadUpdate(DB, COL, staleHead, new Date(50));
      await flushAsync();

      const docs = await nodeA.collection(COL).find({});
      expect(docs).toHaveLength(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((docs[0] as any).price).toBe(29.99);

      jest.restoreAllMocks();
    });
  });

  // ── Scenario 4: Tombstone beats older write ───────────────────────────────

  describe('Scenario 4 – tombstone (delete at T+10) beats older write (at T)', () => {
    it('the document is absent after gossip of a newer delete', async () => {
      const DB = 'gossip-tomb4';
      const COL = 'notes';

      const regWriter = await factory.createNodeRegistry();
      const regDeleter = await factory.createNodeRegistry();

      // Writer inserts at T=10
      jest.spyOn(Date, 'now').mockReturnValueOnce(10);
      const nodeWriter = await makeNode(sharedStore, regWriter, DB);
      await nodeWriter.collection(COL).insertOne({ _id: 'n1', text: 'alive' });
      await nodeWriter.collection(COL).find({}); // warm up

      // Deleter gets the writer's state, then deletes at T=20
      await snapshotSync(regWriter, regDeleter);
      const nodeDeleter = await makeNode(sharedStore, regDeleter, DB);
      await nodeDeleter.collection(COL).find({}); // load merged state
      await flushAsync();

      jest.spyOn(Date, 'now').mockReturnValueOnce(20);
      await nodeDeleter.collection(COL).deleteOne({ _id: 'n1' });

      // Gossip the delete back to the writer's registry
      await gossipAtoB(DB, COL, regDeleter, regWriter);

      // Doc must be gone on the writer node
      const docs = await nodeWriter.collection(COL).find({});
      expect(docs).toHaveLength(0);

      jest.restoreAllMocks();
    });
  });

  // ── Scenario 5: Newer write beats older tombstone ─────────────────────────

  describe('Scenario 5 – newer write (at T+10) survives older tombstone (at T)', () => {
    it('the document survives when gossipped delete is older than local write', async () => {
      const DB = 'gossip-tomb5';
      const COL = 'notes';

      const regDeleter = await factory.createNodeRegistry();
      const regWriter = await factory.createNodeRegistry();

      // Deleter: insert at T=1, then delete at T=5
      jest.spyOn(Date, 'now').mockReturnValueOnce(1);
      const nodeDeleter = await makeNode(sharedStore, regDeleter, DB);
      await nodeDeleter
        .collection(COL)
        .insertOne({ _id: 'n2', text: 'initial' });
      await nodeDeleter.collection(COL).find({});

      jest.spyOn(Date, 'now').mockReturnValueOnce(5);
      await nodeDeleter.collection(COL).deleteOne({ _id: 'n2' });
      const deleteHead = regDeleter.getHead(DB, COL)!;

      // Writer: insert same doc at T=10 (after the delete)
      jest.spyOn(Date, 'now').mockReturnValueOnce(10);
      const nodeWriter = await makeNode(sharedStore, regWriter, DB);
      await nodeWriter
        .collection(COL)
        .insertOne({ _id: 'n2', text: 'resurrected' });
      await nodeWriter.collection(COL).find({});

      // Gossip the OLD delete (T=5) into the writer's registry.
      // Use a stale arrival timestamp so LWW for the head itself uses a past time.
      await regWriter.mergeHeadUpdate(DB, COL, deleteHead, new Date(50));
      await flushAsync();

      // Writer's T=10 insert must survive
      const docs = await nodeWriter.collection(COL).find({});
      expect(docs).toHaveLength(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((docs[0] as any).text).toBe('resurrected');

      jest.restoreAllMocks();
    });
  });

  // ── Scenario 6: Snapshot-based full sync ─────────────────────────────────

  describe('Scenario 6 – exportSnapshot/mergeSnapshot API', () => {
    it('two nodes with different collections fully converge via snapshot', async () => {
      const DB = 'gossip-snap';

      const regA = await factory.createNodeRegistry();
      const regB = await factory.createNodeRegistry();

      const nodeA = await makeNode(sharedStore, regA, DB);
      const nodeB = await makeNode(sharedStore, regB, DB);

      // nodeA writes to two different collections
      await nodeA.collection('alpha').insertOne({ _id: 'a1', v: 1 });
      await nodeA.collection('beta').insertOne({ _id: 'b1', v: 2 });

      // nodeB writes to a third collection
      await nodeB.collection('gamma').insertOne({ _id: 'g1', v: 3 });

      // Full snapshot sync: A→B then B→A
      await snapshotSync(regA, regB);
      await snapshotSync(regB, regA);

      // nodeB should now see alpha and beta (from A)
      expect(await nodeB.collection('alpha').find({})).toHaveLength(1);
      expect(await nodeB.collection('beta').find({})).toHaveLength(1);
      expect(await nodeB.collection('gamma').find({})).toHaveLength(1);

      // nodeA should now see gamma (from B)
      expect(await nodeA.collection('gamma').find({})).toHaveLength(1);
      expect(await nodeA.collection('alpha').find({})).toHaveLength(1);
      expect(await nodeA.collection('beta').find({})).toHaveLength(1);
    });
  });

  // ── Scenario 7: Three-node convergence ───────────────────────────────────

  describe('Scenario 7 – three-node convergence via chain gossip (A→B→C)', () => {
    it('nodeC eventually holds nodeA writes after chain gossip A→B then B→C', async () => {
      const DB = 'gossip-3node';
      const COL = 'events';

      const regA = await factory.createNodeRegistry();
      const regB = await factory.createNodeRegistry();
      const regC = await factory.createNodeRegistry();

      const nodeA = await makeNode(sharedStore, regA, DB);
      const nodeB = await makeNode(sharedStore, regB, DB);
      const nodeC = await makeNode(sharedStore, regC, DB);

      // Each node writes its own event
      await nodeA.collection(COL).insertOne({ _id: 'e-a', source: 'A' });
      await nodeB.collection(COL).insertOne({ _id: 'e-b', source: 'B' });
      await nodeC.collection(COL).insertOne({ _id: 'e-c', source: 'C' });

      // Chain gossip: A→B (B now has A+B)
      await snapshotSync(regA, regB);
      // Chain gossip: B→C (C now has A+B+C)
      await snapshotSync(regB, regC);
      // Propagate back: C→A (A now has A+B+C)
      await snapshotSync(regC, regA);
      // And: C→B (B now has A+B+C)
      await snapshotSync(regC, regB);

      const idsC = (await nodeC.collection(COL).find({}))
        .map((d) => (d as { _id: string })._id)
        .sort();
      expect(idsC).toEqual(['e-a', 'e-b', 'e-c']);

      const idsA = (await nodeA.collection(COL).find({}))
        .map((d) => (d as { _id: string })._id)
        .sort();
      expect(idsA).toEqual(['e-a', 'e-b', 'e-c']);
    });
  });
}
