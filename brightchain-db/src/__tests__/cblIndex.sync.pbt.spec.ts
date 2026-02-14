/**
 * CBLIndex – Cross-Node Sync Property-Based Tests.
 *
 * Feature: architectural-gaps
 *
 * Uses fast-check to validate universal correctness properties
 * of CBL Index cross-node synchronization (merge, conflict, soft-delete).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ICBLIndexEntry } from '@brightchain/brightchain-lib';
import { CBLVisibility } from '@brightchain/brightchain-lib';
import * as fc from 'fast-check';
import { CBLIndex } from '../lib/cblIndex';
import { BrightChainDb } from '../lib/database';
import { InMemoryHeadRegistry } from '../lib/headRegistry';
import { MockBlockStore } from './helpers/mockBlockStore';

// ══════════════════════════════════════════════════════════════
// Helpers & Arbitraries
// ══════════════════════════════════════════════════════════════

/** Create a fresh db + store + CBLIndex for each property run. */
function makeCBLIndex(): {
  index: CBLIndex;
  store: MockBlockStore;
  db: BrightChainDb;
} {
  const store = new MockBlockStore();
  const registry = InMemoryHeadRegistry.createIsolated();
  const db = new BrightChainDb(store as any, {
    name: 'pbt-sync-db',
    headRegistry: registry,
  });
  const index = new CBLIndex(db, store as any);
  return { index, store, db };
}

/** Seed two blocks in the store and return their IDs. */
async function seedBlocks(
  store: MockBlockStore,
  id1: string,
  id2: string,
): Promise<void> {
  await store.put(id1, new Uint8Array([1, 2, 3]));
  await store.put(id2, new Uint8Array([4, 5, 6]));
}

/** Alphanumeric character set for generating safe identifiers. */
const alphaChars = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Arbitrary for safe identifier strings (no special chars). */
const identifierArb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...alphaChars.split('')), {
    minLength: 3,
    maxLength: 12,
  })
  .map((chars) => chars.join(''));

/** Arbitrary for a unique block ID pair. */
const blockIdPairArb: fc.Arbitrary<{ blockId1: string; blockId2: string }> = fc
  .tuple(identifierArb, identifierArb)
  .filter(([a, b]) => a !== b)
  .map(([a, b]) => ({ blockId1: `blk-${a}`, blockId2: `blk-${b}` }));

/** Arbitrary for a valid block size (power of 2, typical CBL sizes). */
const blockSizeArb: fc.Arbitrary<number> = fc.constantFrom(128, 256, 512, 1024);

/** Build a full ICBLIndexEntry as if it came from a remote peer. */
function makeRemoteEntry(
  overrides: Partial<ICBLIndexEntry> = {},
): ICBLIndexEntry {
  return {
    _id: `remote-${Math.random().toString(36).slice(2, 10)}`,
    magnetUrl: `magnet:?xt=urn:brightchain:cbl&bs=256&b1=default1&b2=default2`,
    blockId1: 'default-block-1',
    blockId2: 'default-block-2',
    blockSize: 256,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    visibility: CBLVisibility.Private,
    sequenceNumber: 10,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════

describe('CBLIndex Cross-Node Sync Property-Based Tests', () => {
  // ══════════════════════════════════════════════════════════════
  // Property 19: CBL Index gossip idempotence
  // ══════════════════════════════════════════════════════════════

  /**
   * Property 19: CBL Index gossip idempotence
   *
   * Feature: architectural-gaps, Property 19: CBL Index gossip idempotence
   *
   * For any CBL index entry announcement received by a node, processing
   * the same announcement multiple times should result in exactly one
   * entry in the local index (no duplicates).
   *
   * **Validates: Requirements 8.2**
   */
  it('Property 19: CBL Index gossip idempotence', async () => {
    await fc.assert(
      fc.asyncProperty(
        blockIdPairArb,
        identifierArb.map((s) => `magnet:?idem=${s}`),
        blockSizeArb,
        fc.integer({ min: 2, max: 10 }),
        async (ids, magnetUrl, blockSize, mergeCount) => {
          const { index } = makeCBLIndex();

          const remoteEntry = makeRemoteEntry({
            magnetUrl,
            blockId1: ids.blockId1,
            blockId2: ids.blockId2,
            blockSize,
          });

          // Merge the same entry multiple times
          for (let i = 0; i < mergeCount; i++) {
            await index.mergeEntry(remoteEntry);
          }

          // Query all entries (including deleted) to count
          const allEntries = await index.query({ includeDeleted: true });
          const matching = allEntries.filter((e) => e.magnetUrl === magnetUrl);

          // Exactly one entry should exist — no duplicates
          expect(matching).toHaveLength(1);
          expect(matching[0].blockId1).toBe(ids.blockId1);
          expect(matching[0].blockId2).toBe(ids.blockId2);
          expect(matching[0].blockSize).toBe(blockSize);
          // No conflict flag since content is identical
          expect(matching[0].hasConflict).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  // ══════════════════════════════════════════════════════════════
  // Property 20: CBL Index conflict preservation
  // ══════════════════════════════════════════════════════════════

  /**
   * Property 20: CBL Index conflict preservation
   *
   * Feature: architectural-gaps, Property 20: CBL Index conflict preservation
   *
   * For any two CBL index entries with the same magnet URL but different
   * content (e.g., different metadata), both entries should be preserved
   * in the index with a conflict flag, and neither should be silently
   * overwritten.
   *
   * **Validates: Requirements 8.3**
   */
  it('Property 20: CBL Index conflict preservation', async () => {
    await fc.assert(
      fc.asyncProperty(
        blockIdPairArb,
        blockIdPairArb,
        identifierArb.map((s) => `magnet:?conflict=${s}`),
        blockSizeArb,
        async (ids1, ids2, magnetUrl, blockSize) => {
          // Ensure the two entries have genuinely different content
          // (different block IDs or different block size)
          const hasDifferentContent =
            ids1.blockId1 !== ids2.blockId1 || ids1.blockId2 !== ids2.blockId2;

          if (!hasDifferentContent) return; // skip if identical content

          const { index, store } = makeCBLIndex();

          // Seed blocks for the first entry so addEntry succeeds
          await seedBlocks(store, ids1.blockId1, ids1.blockId2);

          // Add the first entry via normal addEntry (simulates local storage)
          const original = await index.addEntry({
            magnetUrl,
            blockId1: ids1.blockId1,
            blockId2: ids1.blockId2,
            blockSize,
            createdAt: new Date('2025-01-15T10:00:00Z'),
            visibility: CBLVisibility.Private,
          });

          // Merge a conflicting remote entry with same magnet URL but different content
          const conflicting = makeRemoteEntry({
            magnetUrl,
            blockId1: ids2.blockId1,
            blockId2: ids2.blockId2,
            blockSize,
          });

          const merged = await index.mergeEntry(conflicting);

          // Both entries should exist
          const allEntries = await index.query({ includeDeleted: true });
          const matching = allEntries.filter((e) => e.magnetUrl === magnetUrl);
          expect(matching).toHaveLength(2);

          // Both should be flagged as conflicts
          expect(matching.every((e) => e.hasConflict === true)).toBe(true);

          // Each should reference the other in conflictsWith
          const originalEntry = matching.find((e) => e._id === original._id);
          const mergedEntry = matching.find((e) => e._id === merged._id);

          expect(originalEntry).toBeDefined();
          expect(mergedEntry).toBeDefined();
          expect(originalEntry!.conflictsWith).toContain(merged._id);
          expect(mergedEntry!.conflictsWith).toContain(original._id);

          // Neither entry should be silently overwritten — both preserve their content
          expect(originalEntry!.blockId1).toBe(ids1.blockId1);
          expect(originalEntry!.blockId2).toBe(ids1.blockId2);
          expect(mergedEntry!.blockId1).toBe(ids2.blockId1);
          expect(mergedEntry!.blockId2).toBe(ids2.blockId2);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ══════════════════════════════════════════════════════════════
  // Property 21: CBL Index soft-delete propagation
  // ══════════════════════════════════════════════════════════════

  /**
   * Property 21: CBL Index soft-delete propagation
   *
   * Feature: architectural-gaps, Property 21: CBL Index soft-delete propagation
   *
   * For any CBL index entry that is soft-deleted on one node, after gossip
   * propagation, the entry should also be marked as soft-deleted on peer
   * nodes.
   *
   * **Validates: Requirements 8.6**
   */
  it('Property 21: CBL Index soft-delete propagation', async () => {
    await fc.assert(
      fc.asyncProperty(
        blockIdPairArb,
        identifierArb.map((s) => `magnet:?softdel=${s}`),
        blockSizeArb,
        fc.date({
          min: new Date('2025-01-01T00:00:00Z'),
          max: new Date('2025-12-31T23:59:59Z'),
        }),
        async (ids, magnetUrl, blockSize, deletedAt) => {
          const { index } = makeCBLIndex();

          // First, merge a remote entry (simulates receiving via gossip)
          const remoteEntry = makeRemoteEntry({
            magnetUrl,
            blockId1: ids.blockId1,
            blockId2: ids.blockId2,
            blockSize,
          });
          await index.mergeEntry(remoteEntry);

          // Verify entry exists before soft-delete
          const beforeDelete = await index.query({ includeDeleted: true });
          const entryBefore = beforeDelete.find(
            (e) => e.magnetUrl === magnetUrl,
          );
          expect(entryBefore).toBeDefined();
          expect(entryBefore!.deletedAt).toBeUndefined();

          // Propagate soft-delete from remote peer
          await index.mergeSoftDelete(magnetUrl, deletedAt);

          // Entry should no longer appear in default queries
          const defaultQuery = await index.query({});
          const visibleEntries = defaultQuery.filter(
            (e) => e.magnetUrl === magnetUrl,
          );
          expect(visibleEntries).toHaveLength(0);

          // Entry should still exist with includeDeleted: true
          const allEntries = await index.query({ includeDeleted: true });
          const deletedEntry = allEntries.find(
            (e) => e.magnetUrl === magnetUrl,
          );

          expect(deletedEntry).toBeDefined();
          expect(deletedEntry!.deletedAt).toBeDefined();
          expect(deletedEntry!.deletedAt).toEqual(deletedAt);
        },
      ),
      { numRuns: 100 },
    );
  });
});
