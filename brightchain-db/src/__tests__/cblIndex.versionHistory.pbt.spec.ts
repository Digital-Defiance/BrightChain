/**
 * CBLIndex – Version History Property-Based Tests.
 *
 * Feature: architectural-gaps
 *
 * Uses fast-check to validate universal correctness properties
 * of CBLIndex file version history across randomly generated inputs.
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
    name: 'pbt-version-db',
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

// ══════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════

describe('CBLIndex Version History Property-Based Tests', () => {
  // ══════════════════════════════════════════════════════════════
  // Property 39: Version history chain integrity
  // ══════════════════════════════════════════════════════════════

  /**
   * Property 39: Version history chain integrity
   *
   * Feature: architectural-gaps, Property 39: Version history chain integrity
   *
   * For any file with N versions added via addVersion(), the version numbers
   * should be 1 through N with no gaps. Each version's previousVersion should
   * point to the magnet URL of the version with versionNumber - 1, and
   * version 1 should have no previousVersion. All entries should share the
   * same fileId.
   *
   * **Validates: Requirements 27.1, 27.2, 27.3, 27.4, 27.5**
   */
  it('Property 39: Version history chain integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        blockIdPairArb,
        identifierArb.map((s) => `file-${s}`),
        fc.integer({ min: 2, max: 8 }),
        async (ids, fileId, versionCount) => {
          const { index, store } = makeCBLIndex();
          await seedBlocks(store, ids.blockId1, ids.blockId2);

          // Add N versions sequentially
          const versions: ICBLIndexEntry[] = [];
          for (let i = 0; i < versionCount; i++) {
            const entry = {
              magnetUrl: `magnet:?ver=${i}-${ids.blockId1}-${fileId}`,
              blockId1: ids.blockId1,
              blockId2: ids.blockId2,
              blockSize: 256,
              createdAt: new Date(2025, 0, 1, 0, 0, i),
              visibility: CBLVisibility.Private,
            };
            const result = await index.addVersion(fileId, entry);
            versions.push(result);
          }

          // Verify version numbers are 1 through N with no gaps
          for (let i = 0; i < versionCount; i++) {
            expect(versions[i].versionNumber).toBe(i + 1);
          }

          // Verify version 1 has no previousVersion
          expect(versions[0].previousVersion).toBeUndefined();

          // Verify each subsequent version's previousVersion points to the
          // magnet URL of the version with versionNumber - 1
          for (let i = 1; i < versionCount; i++) {
            expect(versions[i].previousVersion).toBe(versions[i - 1].magnetUrl);
          }

          // All entries share the same fileId
          for (const v of versions) {
            expect(v.fileId).toBe(fileId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // ══════════════════════════════════════════════════════════════
  // Property 40: Latest version resolution
  // ══════════════════════════════════════════════════════════════

  /**
   * Property 40: Latest version resolution
   *
   * Feature: architectural-gaps, Property 40: Latest version resolution
   *
   * For any file with N versions, getLatestVersion(fileId) should return the
   * entry with versionNumber === N. getVersionHistory(fileId) should return
   * exactly N entries in ascending version order.
   *
   * **Validates: Requirements 27.6, 27.7**
   */
  it('Property 40: Latest version resolution', async () => {
    await fc.assert(
      fc.asyncProperty(
        blockIdPairArb,
        identifierArb.map((s) => `file-${s}`),
        fc.integer({ min: 2, max: 8 }),
        async (ids, fileId, versionCount) => {
          const { index, store } = makeCBLIndex();
          await seedBlocks(store, ids.blockId1, ids.blockId2);

          // Add N versions
          const versions: ICBLIndexEntry[] = [];
          for (let i = 0; i < versionCount; i++) {
            const result = await index.addVersion(fileId, {
              magnetUrl: `magnet:?latest=${i}-${ids.blockId1}-${fileId}`,
              blockId1: ids.blockId1,
              blockId2: ids.blockId2,
              blockSize: 256,
              createdAt: new Date(2025, 0, 1, 0, 0, i),
              visibility: CBLVisibility.Private,
            });
            versions.push(result);
          }

          // getLatestVersion should return the entry with versionNumber === N
          const latest = await index.getLatestVersion(fileId);
          expect(latest).not.toBeNull();
          expect(latest!.versionNumber).toBe(versionCount);
          expect(latest!.magnetUrl).toBe(versions[versionCount - 1].magnetUrl);
          expect(latest!.fileId).toBe(fileId);

          // getVersionHistory should return exactly N entries
          const history = await index.getVersionHistory(fileId);
          expect(history.length).toBe(versionCount);

          // History should be in ascending version order
          for (let i = 0; i < history.length; i++) {
            expect(history[i].versionNumber).toBe(i + 1);
          }

          // Verify ascending order is strictly maintained
          for (let i = 1; i < history.length; i++) {
            expect(history[i].versionNumber!).toBeGreaterThan(
              history[i - 1].versionNumber!,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // ══════════════════════════════════════════════════════════════
  // Property 41: Version chain survives soft-delete
  // ══════════════════════════════════════════════════════════════

  /**
   * Property 41: Version chain survives soft-delete
   *
   * Feature: architectural-gaps, Property 41: Version chain survives soft-delete
   *
   * For any file with versions [1, 2, 3] where version 2 is soft-deleted,
   * getVersionHistory(fileId) with includeDeleted: true should still return
   * all 3 versions with intact previousVersion pointers. Without
   * includeDeleted, version 2 is omitted but versions 1 and 3 retain their
   * original previousVersion values.
   *
   * **Validates: Requirements 27.8**
   */
  it('Property 41: Version chain survives soft-delete', async () => {
    await fc.assert(
      fc.asyncProperty(
        blockIdPairArb,
        identifierArb.map((s) => `file-${s}`),
        fc.integer({ min: 3, max: 8 }),
        async (ids, fileId, versionCount) => {
          const { index, store } = makeCBLIndex();
          await seedBlocks(store, ids.blockId1, ids.blockId2);

          // Add N versions (at least 3)
          const versions: ICBLIndexEntry[] = [];
          for (let i = 0; i < versionCount; i++) {
            const result = await index.addVersion(fileId, {
              magnetUrl: `magnet:?del=${i}-${ids.blockId1}-${fileId}`,
              blockId1: ids.blockId1,
              blockId2: ids.blockId2,
              blockSize: 256,
              createdAt: new Date(2025, 0, 1, 0, 0, i),
              visibility: CBLVisibility.Private,
            });
            versions.push(result);
          }

          // Soft-delete a middle version (version 2, index 1)
          const middleIndex = 1;
          await index.softDelete(versions[middleIndex].magnetUrl);

          // With includeDeleted: true — all versions present, chain intact
          const fullHistory = await index.getVersionHistory(fileId, true);
          expect(fullHistory.length).toBe(versionCount);

          // Verify chain integrity in full history
          for (let i = 0; i < fullHistory.length; i++) {
            expect(fullHistory[i].versionNumber).toBe(i + 1);
            expect(fullHistory[i].fileId).toBe(fileId);

            if (i === 0) {
              expect(fullHistory[i].previousVersion).toBeUndefined();
            } else {
              expect(fullHistory[i].previousVersion).toBe(
                versions[i - 1].magnetUrl,
              );
            }
          }

          // The soft-deleted version should have a deletedAt timestamp
          const deletedVersion = fullHistory[middleIndex];
          expect(deletedVersion.deletedAt).toBeDefined();
          expect(deletedVersion.deletedAt).toBeInstanceOf(Date);

          // Without includeDeleted — middle version omitted
          const filteredHistory = await index.getVersionHistory(fileId);
          expect(filteredHistory.length).toBe(versionCount - 1);

          // The omitted version should not appear
          const filteredVersionNumbers = filteredHistory.map(
            (v) => v.versionNumber,
          );
          expect(filteredVersionNumbers).not.toContain(middleIndex + 1);

          // Remaining versions retain their original previousVersion values
          for (const entry of filteredHistory) {
            const originalIndex = (entry.versionNumber ?? 0) - 1;
            expect(entry.previousVersion).toBe(
              versions[originalIndex].previousVersion,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
