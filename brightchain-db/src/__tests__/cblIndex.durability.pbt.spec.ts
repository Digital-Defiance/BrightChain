/**
 * CBLIndex – Durability Property-Based Tests.
 *
 * Feature: architectural-gaps
 *
 * Uses fast-check to validate universal correctness properties
 * of CBLIndex snapshot round-trip and sequence number monotonicity.
 *
 * **Property 17: CBL Index snapshot round-trip**
 * **Validates: Requirements 7.2**
 *
 * **Property 18: CBL Index sequence number monotonicity**
 * **Validates: Requirements 7.6**
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

/** Create a fresh db + store + CBLIndex. */
function makeCBLIndex(): {
  index: CBLIndex;
  store: MockBlockStore;
  db: BrightChainDb;
  registry: ReturnType<typeof InMemoryHeadRegistry.createIsolated>;
} {
  const store = new MockBlockStore();
  const registry = InMemoryHeadRegistry.createIsolated();
  const db = new BrightChainDb(store as any, {
    name: 'pbt-durability-db',
    headRegistry: registry,
  });
  const index = new CBLIndex(db, store as any);
  return { index, store, db, registry };
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

const alphaChars = 'abcdefghijklmnopqrstuvwxyz0123456789';

const identifierArb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...alphaChars.split('')), {
    minLength: 3,
    maxLength: 12,
  })
  .map((chars) => chars.join(''));

const blockIdPairArb: fc.Arbitrary<{ blockId1: string; blockId2: string }> = fc
  .tuple(identifierArb, identifierArb)
  .filter(([a, b]) => a !== b)
  .map(([a, b]) => ({ blockId1: `blk-${a}`, blockId2: `blk-${b}` }));

const visibilityArb: fc.Arbitrary<CBLVisibility> = fc.constantFrom(
  CBLVisibility.Private,
  CBLVisibility.Shared,
  CBLVisibility.Public,
);

/** Arbitrary for optional metadata fields. */
const metadataArb = fc.record({
  fileName: fc.option(
    identifierArb.map((s) => `${s}.txt`),
    { nil: undefined },
  ),
  mimeType: fc.option(fc.constant('text/plain'), { nil: undefined }),
  originalSize: fc.option(fc.integer({ min: 1, max: 100000 }), {
    nil: undefined,
  }),
  tags: fc.option(fc.array(identifierArb, { minLength: 0, maxLength: 3 }), {
    nil: undefined,
  }),
});

// ══════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════

describe('CBLIndex Durability Property-Based Tests', () => {
  // ══════════════════════════════════════════════════════════════
  // Property 17: CBL Index snapshot round-trip
  // ══════════════════════════════════════════════════════════════

  /**
   * Property 17: CBL Index snapshot round-trip
   *
   * For any CBL index state (set of entries with metadata), creating a
   * snapshot and then restoring from that snapshot should produce an index
   * state equivalent to the original (same entries, same metadata, same
   * sequence numbers).
   *
   * **Validates: Requirements 7.2**
   */
  it('Property 17: CBL Index snapshot round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        blockIdPairArb,
        fc.integer({ min: 1, max: 6 }),
        fc.array(visibilityArb, { minLength: 1, maxLength: 6 }),
        fc.array(metadataArb, { minLength: 1, maxLength: 6 }),
        async (ids, entryCount, visibilities, metadatas) => {
          const { index, store, registry: _registry } = makeCBLIndex();
          await seedBlocks(store, ids.blockId1, ids.blockId2);

          const count = Math.min(
            entryCount,
            visibilities.length,
            metadatas.length,
          );

          // Add entries with varying metadata
          const originalEntries: ICBLIndexEntry[] = [];
          for (let i = 0; i < count; i++) {
            const entry = await index.addEntry({
              magnetUrl: `magnet:?snap=${i}-${ids.blockId1}`,
              blockId1: ids.blockId1,
              blockId2: ids.blockId2,
              blockSize: 256,
              createdAt: new Date(2025, 0, 1, 0, 0, i),
              visibility: visibilities[i],
              metadata: metadatas[i],
            });
            originalEntries.push(entry);
          }

          // Soft-delete the first entry if we have more than one
          if (count > 1) {
            await index.softDelete(originalEntries[0].magnetUrl);
          }

          // Take a snapshot
          const magnetUrl = await index.snapshot();

          // Restore into a fresh index on the same store
          const registry2 = InMemoryHeadRegistry.createIsolated();
          const db2 = new BrightChainDb(store as any, {
            name: 'pbt-durability-db-restored',
            headRegistry: registry2,
          });
          const restoredIndex = new CBLIndex(db2, store as any);
          await restoredIndex.restoreFromSnapshot(magnetUrl);

          // Query all entries including soft-deleted
          const restoredEntries = await restoredIndex.query({
            includeDeleted: true,
          });

          // Same number of entries
          expect(restoredEntries.length).toBe(count);

          // Sort both by sequence number for stable comparison
          const sortedOriginal = [...originalEntries].sort(
            (a, b) => a.sequenceNumber - b.sequenceNumber,
          );
          const sortedRestored = [...restoredEntries].sort(
            (a, b) => a.sequenceNumber - b.sequenceNumber,
          );

          for (let i = 0; i < count; i++) {
            const orig = sortedOriginal[i];
            const rest = sortedRestored[i];

            // Core fields preserved
            expect(rest._id).toBe(orig._id);
            expect(rest.magnetUrl).toBe(orig.magnetUrl);
            expect(rest.blockId1).toBe(orig.blockId1);
            expect(rest.blockId2).toBe(orig.blockId2);
            expect(rest.blockSize).toBe(orig.blockSize);
            expect(rest.visibility).toBe(orig.visibility);
            expect(rest.sequenceNumber).toBe(orig.sequenceNumber);

            // Metadata preserved
            expect(rest.metadata?.fileName).toBe(orig.metadata?.fileName);
            expect(rest.metadata?.mimeType).toBe(orig.metadata?.mimeType);
            expect(rest.metadata?.originalSize).toBe(
              orig.metadata?.originalSize,
            );
            expect(rest.metadata?.tags).toEqual(orig.metadata?.tags);
          }

          // Sequence counter preserved: new entry after restore continues numbering
          const nextEntry = await restoredIndex.addEntry({
            magnetUrl: `magnet:?snap=next-${ids.blockId1}`,
            blockId1: ids.blockId1,
            blockId2: ids.blockId2,
            blockSize: 256,
            createdAt: new Date(),
            visibility: CBLVisibility.Private,
          });
          expect(nextEntry.sequenceNumber).toBe(count + 1);
        },
      ),
      { numRuns: 50 },
    );
  });

  // ══════════════════════════════════════════════════════════════
  // Property 18: CBL Index sequence number monotonicity
  // ══════════════════════════════════════════════════════════════

  /**
   * Property 18: CBL Index sequence number monotonicity
   *
   * For any sequence of N mutations (inserts) on the CBL Index, the sequence
   * numbers assigned should be strictly monotonically increasing: each
   * mutation's sequence number should be greater than the previous mutation's
   * sequence number.
   *
   * **Validates: Requirements 7.6**
   */
  it('Property 18: CBL Index sequence number monotonicity', async () => {
    await fc.assert(
      fc.asyncProperty(
        blockIdPairArb,
        fc.integer({ min: 2, max: 15 }),
        async (ids, mutationCount) => {
          const { index, store } = makeCBLIndex();
          await seedBlocks(store, ids.blockId1, ids.blockId2);

          const sequenceNumbers: number[] = [];

          for (let i = 0; i < mutationCount; i++) {
            const entry = await index.addEntry({
              magnetUrl: `magnet:?mono=${i}-${ids.blockId1}`,
              blockId1: ids.blockId1,
              blockId2: ids.blockId2,
              blockSize: 256,
              createdAt: new Date(2025, 0, 1, 0, 0, i),
              visibility: CBLVisibility.Private,
            });
            sequenceNumbers.push(entry.sequenceNumber);
          }

          // Verify strict monotonic increase
          for (let i = 1; i < sequenceNumbers.length; i++) {
            expect(sequenceNumbers[i]).toBeGreaterThan(sequenceNumbers[i - 1]);
          }

          // Verify they are consecutive integers starting from 1
          for (let i = 0; i < sequenceNumbers.length; i++) {
            expect(sequenceNumbers[i]).toBe(i + 1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
