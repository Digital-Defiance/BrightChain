/**
 * @fileoverview Integration tests for gossip-based consistency in BrightDB collections.
 *
 * These tests validate that when an external head update arrives via gossip
 * (simulated by calling `registry.mergeHeadUpdate()`), the receiving
 * Collection correctly merges remote state using per-document LWW semantics.
 *
 * Scenarios covered:
 *   1. Stale read invalidation — gossip causes a re-read of an updated doc
 *   2. Multi-writer convergence — two writers' states converge via gossip
 *   3. LWW correctness — older gossip does NOT override newer local state
 *   4. Tombstone vs live — delete/insert ordering is respected by LWW
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { brightDateNow, InMemoryHeadRegistry } from '@brightchain/brightchain-lib';
import { MockBlockStore } from '../../__tests__/helpers/mockBlockStore';
import { Collection, ICollectionHeadRegistry } from '../collection';

// Tests exercise async operations including fake-timer tick-throughs.
jest.setTimeout(15000);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Allow pending `void` async calls (e.g. mergeFromGossipHead) to complete. */
async function flushAsync(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  // Second tick: persistMeta inside mergeFromGossipHead may await store.put
  await new Promise<void>((resolve) => setImmediate(resolve));
}

/**
 * Build a Collection wired to the given shared registry and block store.
 *
 * We cast the registry `as any as ICollectionHeadRegistry` because
 * InMemoryHeadRegistry satisfies the structural interface but TypeScript
 * cannot verify private-field compatibility across declaration boundaries.
 */
function makeCollection(
  name: string,
  dbName: string,
  store: MockBlockStore,
  registry: InMemoryHeadRegistry,
  nowBd?: () => number,
): Collection {
  return new Collection(
    name,
    store as any,
    dbName,
    registry as any as ICollectionHeadRegistry,
    nowBd ? { nowBd } : undefined,
  );
}

// ---------------------------------------------------------------------------
// Scenario 1: Stale read invalidation
// ---------------------------------------------------------------------------

describe('Gossip consistency – stale read invalidation', () => {
  /**
   * Node A loads a collection and reads a doc.
   * A remote node writes a newer version of the same doc and gossips the head.
   * After gossip merge, Node A's next read should return the updated document.
   */
  it('returns the gossip-updated doc on next find after head change', async () => {
    const DB = 'testdb';
    const COL = 'users';
    const store = new MockBlockStore();
    const registry = new InMemoryHeadRegistry();

    // ── Node A: insert initial document ──────────────────────────────────
    const nodeA = makeCollection(COL, DB, store, registry);
    await nodeA.insertOne({ _id: 'user-1', name: 'Alice v1' });

    // Ensure collection is loaded (warm up the ensureLoaded path)
    const initialDocs = await nodeA.find({});
    expect(initialDocs).toHaveLength(1);
    expect((initialDocs[0] as any).name).toBe('Alice v1');

    // ── Node B: independent collection on the same store / registry ───────
    // Simulate a second process by creating a fresh Collection that starts
    // from the same store and registry. It will update the document.
    const nodeB = makeCollection(COL, DB, store, registry);
    // Force nodeB to load from the current head (shared registry)
    await nodeB.find({});

    // Ensure nodeB's write gets a strictly newer docTimestamp than nodeA's.
    // Without this delay the two Date.now() calls can resolve in the same ms,
    // which would make the per-doc LWW condition (remoteTs > localTs) false.
    await new Promise<void>((r) => setTimeout(r, 5));

    // Node B writes a newer version
    await nodeB.updateOne({ _id: 'user-1' }, { $set: { name: 'Alice v2' } });

    // ── Simulate gossip: broadcast Node B's new head to Node A ───────────
    // Pass a timestamp 100 ms in the future so mergeHeadUpdate's strict-
    // newer check (newTs > storedTs) always succeeds, regardless of whether
    // setHead and mergeHeadUpdate resolve within the same millisecond.
    const newHead = registry.getHead(DB, COL);
    expect(newHead).toBeDefined();
    registry.mergeHeadUpdate(DB, COL, newHead!, brightDateNow() + 0.0012); // ~100ms in decimal days

    await flushAsync();

    // ── Node A should now see the updated document ────────────────────────
    const afterGossip = await nodeA.find({});
    expect(afterGossip).toHaveLength(1);
    expect((afterGossip[0] as any).name).toBe('Alice v2');
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Multi-writer convergence
// ---------------------------------------------------------------------------

describe('Gossip consistency – multi-writer convergence', () => {
  /**
   * Node A inserts docA. Node B inserts docB (on its own fresh state).
   * We gossip Node A's head to Node B → Node B should contain both docs.
   * Then we gossip Node B's merged head to Node A → Node A should also converge.
   */
  it('converges two independent writers to the union of their documents', async () => {
    const DB = 'testdb';
    const COL = 'items';
    const store = new MockBlockStore();

    // Two separate registries simulate two isolated processes that later gossip.
    const registryA = new InMemoryHeadRegistry();
    const registryB = new InMemoryHeadRegistry();

    const nodeA = makeCollection(COL, DB, store, registryA);
    const nodeB = makeCollection(COL, DB, store, registryB);

    // Each node inserts its own document (completely independent)
    await nodeA.insertOne({ _id: 'doc-a', origin: 'A' });
    await nodeB.insertOne({ _id: 'doc-b', origin: 'B' });

    // Warm up: ensure both are loaded
    const docsA = await nodeA.find({});
    const docsB = await nodeB.find({});
    expect(docsA).toHaveLength(1);
    expect(docsB).toHaveLength(1);

    // ── Gossip A's head into B's registry ────────────────────────────────
    const headA = registryA.getHead(DB, COL)!;
    expect(headA).toBeDefined();

    // Use a future timestamp so mergeHeadUpdate's strict-newer check always
    // fires regardless of same-millisecond resolution between setHead and the
    // gossip call.  The per-doc LWW still uses docTimestamps, not this value.
    registryB.mergeHeadUpdate(DB, COL, headA, brightDateNow() + 0.0012);
    await flushAsync();

    // Node B should now see both documents
    const mergedDocsB = await nodeB.find({});
    expect(mergedDocsB).toHaveLength(2);
    const ids = mergedDocsB.map((d: any) => d._id).sort();
    expect(ids).toEqual(['doc-a', 'doc-b']);

    // ── Now gossip B's merged head back to A ─────────────────────────────
    const headBMerged = registryB.getHead(DB, COL)!;
    expect(headBMerged).toBeDefined();

    registryA.mergeHeadUpdate(DB, COL, headBMerged, brightDateNow() + 0.0012);
    await flushAsync();

    // Node A should also see both documents
    const mergedDocsA = await nodeA.find({});
    expect(mergedDocsA).toHaveLength(2);
    const idsA = mergedDocsA.map((d: any) => d._id).sort();
    expect(idsA).toEqual(['doc-a', 'doc-b']);
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: LWW correctness – stale gossip does not override newer local
// ---------------------------------------------------------------------------

describe('Gossip consistency – LWW rejects stale gossip', () => {
  /**
   * Node A writes doc at T=200.
   * A stale gossip arrives with the doc state from T=100.
   * Node A's local state (T=200) must NOT be overwritten.
   */
  it('does not overwrite a newer local write with older gossip', async () => {
    const DB = 'testdb';
    const COL = 'products';
    const store = new MockBlockStore();
    const registry = new InMemoryHeadRegistry();

    // ── Create and freeze timestamps ──────────────────────────────────────
    // We'll use two separate collections to represent "old state" and "new state".
    // The "old" registry holds the stale head. The "new" (main) registry holds
    // the current head for the live node.

    const staleRegistry = new InMemoryHeadRegistry();

    // Write old state first (lower BrightDate timestamp)
    const staleNode = makeCollection(COL, DB, store, staleRegistry, () => 9000.1);
    await staleNode.insertOne({ _id: 'prod-1', price: 9.99 });

    // Capture the stale head
    const staleHead = staleRegistry.getHead(DB, COL)!;
    expect(staleHead).toBeDefined();

    // ── Now write the same doc with a newer timestamp on the live node ────
    const liveNode = makeCollection(COL, DB, store, registry, () => 9000.2);
    await liveNode.insertOne({ _id: 'prod-1', price: 29.99 });

    // Warm up the live node
    await liveNode.find({});

    // ── Gossip the stale head to the live registry ────────────────────────
    registry.mergeHeadUpdate(DB, COL, staleHead, brightDateNow());
    await flushAsync();

    // ── Live node must retain its newer value ─────────────────────────────
    const docs = await liveNode.find({});
    expect(docs).toHaveLength(1);
    expect((docs[0] as any).price).toBe(29.99);
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Tombstone vs live LWW semantics
// ---------------------------------------------------------------------------

describe('Gossip consistency – tombstone vs live LWW', () => {
  const DB = 'testdb';
  const COL = 'notes';

  /**
   * Remote delete at T=5 does NOT beat a local write at T=10.
   */
  it('a remote delete at T=5 does not win over a local write at T=10', async () => {
    const store = new MockBlockStore();
    const deleteRegistry = new InMemoryHeadRegistry();
    const liveRegistry = new InMemoryHeadRegistry();

    // ── Build a "deleter" node that deletes at T=5 ────────────────────────
    let deleterClock = 9000.001;
    const deleterNode = makeCollection(COL, DB, store, deleteRegistry, () => deleterClock);
    // First insert (needed so there's something to delete)
    await deleterNode.insertOne({ _id: 'note-1', text: 'initial' });
    await deleterNode.find({}); // load

    // Delete the doc at T=5 (lower BrightDate)
    deleterClock = 9000.005;
    await deleterNode.deleteOne({ _id: 'note-1' });

    const deleteHead = deleteRegistry.getHead(DB, COL)!;
    expect(deleteHead).toBeDefined();

    // ── Build a "writer" node that writes at T=10 ─────────────────────────
    const writerNode = makeCollection(COL, DB, store, liveRegistry, () => 9000.010);
    await writerNode.insertOne({ _id: 'note-1', text: 'updated' });
    await writerNode.find({}); // load

    // ── Gossip the delete (T=5) to the writer node (local write T=10) ─────
    liveRegistry.mergeHeadUpdate(DB, COL, deleteHead, brightDateNow());
    await flushAsync();

    // Writer's local T=10 write must survive — doc is still present
    const docs = await writerNode.find({});
    expect(docs).toHaveLength(1);
    expect((docs[0] as any).text).toBe('updated');
  });

  /**
   * Remote delete at T=15 DOES beat a local write at T=10.
   */
  it('a remote delete at T=15 wins over a local write at T=10', async () => {
    const store = new MockBlockStore();
    const deleteRegistry = new InMemoryHeadRegistry();
    const liveRegistry = new InMemoryHeadRegistry();

    // ── Build a "writer" node that writes at T=10 ─────────────────────────
    const writerNode = makeCollection(COL, DB, store, liveRegistry, () => 9000.010);
    await writerNode.insertOne({ _id: 'note-2', text: 'alive' });
    await writerNode.find({}); // load

    // ── Build a "deleter" node that inserts then deletes at T=15 ─────────
    // First, sync it with the writer's current state so it knows the doc exists.
    const writerHead = liveRegistry.getHead(DB, COL)!;
    deleteRegistry.mergeHeadUpdate(DB, COL, writerHead, brightDateNow());

    let deleterClock = 9000.010;
    const deleterNode = makeCollection(COL, DB, store, deleteRegistry, () => deleterClock);
    await deleterNode.find({}); // load (triggers merge of writer's state)
    await flushAsync();

    // Delete at T=15 (higher BrightDate)
    deleterClock = 9000.015;
    await deleterNode.deleteOne({ _id: 'note-2' });

    const deleteHead = deleteRegistry.getHead(DB, COL)!;
    expect(deleteHead).toBeDefined();

    // ── Gossip the delete (T=15) to the writer node (local write T=10) ────
    // Use a future timestamp so the strict-newer check always fires.
    liveRegistry.mergeHeadUpdate(
      DB,
      COL,
      deleteHead,
      brightDateNow() + 0.0012,
    );
    await flushAsync();

    // The T=15 tombstone beats the T=10 write — doc must be gone
    const docs = await writerNode.find({});
    expect(docs).toHaveLength(0);

  });
});
