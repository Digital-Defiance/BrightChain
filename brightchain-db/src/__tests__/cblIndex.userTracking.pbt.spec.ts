/**
 * CBLIndex – User-Level CBL Tracking Property-Based Tests.
 *
 * Feature: architectural-gaps
 *
 * Uses fast-check to validate universal correctness properties
 * of CBLIndex user collection organization, sharing, and visibility
 * enforcement across randomly generated inputs.
 */

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
  const db = new BrightChainDb(store as never, {
    name: 'pbt-user-db',
    headRegistry: registry,
  });
  const index = new CBLIndex(db, store as never);
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

/** Arbitrary for a user collection name. */
const collectionNameArb: fc.Arbitrary<string> = fc.constantFrom(
  'documents',
  'photos',
  'reports',
  'archive',
  'shared-files',
  'projects',
);

/** Arbitrary for a distinct pair of user IDs. */
const userPairArb: fc.Arbitrary<{ userA: string; userB: string }> = fc
  .tuple(identifierArb, identifierArb)
  .filter(([a, b]) => a !== b)
  .map(([a, b]) => ({ userA: `user-${a}`, userB: `user-${b}` }));

/** Arbitrary for three distinct user IDs. */
const userTripleArb: fc.Arbitrary<{
  creator: string;
  sharedUser: string;
  outsider: string;
}> = fc
  .tuple(identifierArb, identifierArb, identifierArb)
  .filter(([a, b, c]) => a !== b && b !== c && a !== c)
  .map(([a, b, c]) => ({
    creator: `user-${a}`,
    sharedUser: `user-${b}`,
    outsider: `user-${c}`,
  }));

// ══════════════════════════════════════════════════════════════
// Property 14: CBL Index user collection organization
// ══════════════════════════════════════════════════════════════

describe('CBLIndex User-Level Tracking Property-Based Tests', () => {
  /**
   * Property 14: CBL Index user collection organization
   *
   * Feature: architectural-gaps, Property 14: CBL Index user collection organization
   *
   * For any CBL index entry assigned to a user collection name, querying by
   * that collection name should return the entry. Changing the collection
   * name should move the entry to the new collection.
   *
   * **Validates: Requirements 6.3**
   */
  it('Property 14: CBL Index user collection organization', async () => {
    await fc.assert(
      fc.asyncProperty(
        blockIdPairArb,
        identifierArb,
        fc
          .tuple(collectionNameArb, collectionNameArb)
          .filter(([a, b]) => a !== b),
        fc.integer({ min: 1, max: 4 }),
        async (ids, userId, [collection1, collection2], extraCount) => {
          const { index, store } = makeCBLIndex();
          await seedBlocks(store, ids.blockId1, ids.blockId2);

          // Create an entry in collection1
          const entry = await index.addEntry({
            magnetUrl: `magnet:?pbt-coll=${ids.blockId1}`,
            blockId1: ids.blockId1,
            blockId2: ids.blockId2,
            blockSize: 256,
            createdAt: new Date(),
            createdBy: userId,
            visibility: CBLVisibility.Private,
            userCollection: collection1,
          });

          // Add some entries in collection2 as noise
          for (let i = 0; i < extraCount; i++) {
            const noiseId1 = `noise1-${i}`;
            const noiseId2 = `noise2-${i}`;
            await seedBlocks(store, noiseId1, noiseId2);
            await index.addEntry({
              magnetUrl: `magnet:?pbt-noise=${i}`,
              blockId1: noiseId1,
              blockId2: noiseId2,
              blockSize: 256,
              createdAt: new Date(),
              createdBy: userId,
              visibility: CBLVisibility.Private,
              userCollection: collection2,
            });
          }

          // Query by collection1 should return our entry
          const coll1Results = await index.query({
            userCollection: collection1,
          });
          expect(coll1Results.length).toBe(1);
          expect(coll1Results[0]._id).toBe(entry._id);
          expect(coll1Results[0].userCollection).toBe(collection1);

          // Query by collection2 should NOT contain our entry
          const coll2Results = await index.query({
            userCollection: collection2,
          });
          expect(coll2Results.every((e) => e._id !== entry._id)).toBe(true);
          expect(coll2Results.length).toBe(extraCount);

          // "Move" the entry to collection2 by soft-deleting and re-adding
          // with the new collection name (simulating a collection rename)
          await index.softDelete(entry.magnetUrl);
          const movedEntry = await index.addEntry({
            magnetUrl: `magnet:?pbt-coll-moved=${ids.blockId1}`,
            blockId1: ids.blockId1,
            blockId2: ids.blockId2,
            blockSize: 256,
            createdAt: new Date(),
            createdBy: userId,
            visibility: CBLVisibility.Private,
            userCollection: collection2,
          });

          // After move: collection1 should be empty (original soft-deleted)
          const coll1After = await index.query({
            userCollection: collection1,
          });
          expect(coll1After.length).toBe(0);

          // After move: collection2 should contain the moved entry + noise
          const coll2After = await index.query({
            userCollection: collection2,
          });
          expect(coll2After.some((e) => e._id === movedEntry._id)).toBe(true);
          expect(coll2After.length).toBe(extraCount + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ══════════════════════════════════════════════════════════════
  // Property 15: CBL Index sharing without duplication
  // ══════════════════════════════════════════════════════════════

  /**
   * Property 15: CBL Index sharing without duplication
   *
   * Feature: architectural-gaps, Property 15: CBL Index sharing without duplication
   *
   * For any CBL index entry shared from user A to user B, user B's query
   * should include the entry, user A's query should still include the entry,
   * and the total number of blocks in the block store should not increase
   * (no data duplication).
   *
   * **Validates: Requirements 6.4**
   */
  it('Property 15: CBL Index sharing without duplication', async () => {
    await fc.assert(
      fc.asyncProperty(
        blockIdPairArb,
        userPairArb,
        async (ids, { userA, userB }) => {
          const { index, store } = makeCBLIndex();
          await seedBlocks(store, ids.blockId1, ids.blockId2);

          // User A creates an entry (initially private)
          const entry = await index.addEntry({
            magnetUrl: `magnet:?pbt-share=${ids.blockId1}`,
            blockId1: ids.blockId1,
            blockId2: ids.blockId2,
            blockSize: 256,
            createdAt: new Date(),
            createdBy: userA,
            visibility: CBLVisibility.Private,
          });

          // Record that the two CBL data blocks exist before sharing
          const dataBlock1Before = await store.has(ids.blockId1);
          const dataBlock2Before = await store.has(ids.blockId2);
          expect(dataBlock1Before).toBe(true);
          expect(dataBlock2Before).toBe(true);

          // Share with user B
          await index.shareWith(entry.magnetUrl, userB);

          // The same two CBL data blocks should still exist — no new copies
          // were created. (The block store may gain internal Collection
          // metadata blocks, but the CBL content blocks are not duplicated.)
          const dataBlock1After = await store.has(ids.blockId1);
          const dataBlock2After = await store.has(ids.blockId2);
          expect(dataBlock1After).toBe(true);
          expect(dataBlock2After).toBe(true);

          // User A should still see the entry via requestingUserId
          const userAResults = await index.query({
            requestingUserId: userA,
          });
          expect(userAResults.some((e) => e._id === entry._id)).toBe(true);

          // User B should now see the entry via requestingUserId
          const userBResults = await index.query({
            requestingUserId: userB,
          });
          expect(userBResults.some((e) => e._id === entry._id)).toBe(true);

          // The entry should now have visibility Shared and userB in sharedWith
          const updated = await index.getByMagnetUrl(entry.magnetUrl);
          expect(updated).not.toBeNull();
          expect(updated!.visibility).toBe(CBLVisibility.Shared);
          expect(updated!.sharedWith).toContain(userB);

          // Sharing the same user again should be idempotent
          await index.shareWith(entry.magnetUrl, userB);
          const afterDuplicate = await index.getByMagnetUrl(entry.magnetUrl);
          const sharedWithCount = afterDuplicate!.sharedWith!.filter(
            (u) => u === userB,
          ).length;
          expect(sharedWithCount).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ══════════════════════════════════════════════════════════════
  // Property 16: CBL Index visibility enforcement
  // ══════════════════════════════════════════════════════════════

  /**
   * Property 16: CBL Index visibility enforcement
   *
   * Feature: architectural-gaps, Property 16: CBL Index visibility enforcement
   *
   * For any CBL index entry with visibility `private`, only the creator
   * should see it in queries. For `shared`, only the creator and `sharedWith`
   * users should see it. For `public`, all pool members should see it.
   *
   * **Validates: Requirements 6.5**
   */
  it('Property 16: CBL Index visibility enforcement', async () => {
    await fc.assert(
      fc.asyncProperty(
        blockIdPairArb,
        userTripleArb,
        fc.constantFrom(
          CBLVisibility.Private,
          CBLVisibility.Shared,
          CBLVisibility.Public,
        ),
        async (ids, { creator, sharedUser, outsider }, visibility) => {
          const { index, store } = makeCBLIndex();
          await seedBlocks(store, ids.blockId1, ids.blockId2);

          // Create an entry with the given visibility
          const entry = await index.addEntry({
            magnetUrl: `magnet:?pbt-vis=${ids.blockId1}-${visibility}`,
            blockId1: ids.blockId1,
            blockId2: ids.blockId2,
            blockSize: 256,
            createdAt: new Date(),
            createdBy: creator,
            visibility,
            sharedWith:
              visibility === CBLVisibility.Shared ? [sharedUser] : undefined,
          });

          // Query as creator
          const creatorResults = await index.query({
            requestingUserId: creator,
          });
          // Creator should ALWAYS see their own entries regardless of visibility
          expect(creatorResults.some((e) => e._id === entry._id)).toBe(true);

          // Query as sharedUser
          const sharedResults = await index.query({
            requestingUserId: sharedUser,
          });

          // Query as outsider (not creator, not in sharedWith)
          const outsiderResults = await index.query({
            requestingUserId: outsider,
          });

          switch (visibility) {
            case CBLVisibility.Private:
              // Private: only creator sees it
              expect(sharedResults.some((e) => e._id === entry._id)).toBe(
                false,
              );
              expect(outsiderResults.some((e) => e._id === entry._id)).toBe(
                false,
              );
              break;

            case CBLVisibility.Shared:
              // Shared: creator and sharedWith users see it, outsider does not
              expect(sharedResults.some((e) => e._id === entry._id)).toBe(true);
              expect(outsiderResults.some((e) => e._id === entry._id)).toBe(
                false,
              );
              break;

            case CBLVisibility.Public:
              // Public: everyone sees it
              expect(sharedResults.some((e) => e._id === entry._id)).toBe(true);
              expect(outsiderResults.some((e) => e._id === entry._id)).toBe(
                true,
              );
              break;
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
