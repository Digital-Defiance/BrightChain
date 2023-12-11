/**
 * HeadRegistry – Property-Based Tests.
 *
 * Feature: architectural-gaps
 *
 * Uses fast-check to validate universal correctness properties
 * of PersistentHeadRegistry across randomly generated inputs.
 */

import * as fc from 'fast-check';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PersistentHeadRegistry } from '../lib/headRegistry';

/** Create a unique temp directory for each test run */
async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(join(tmpdir(), 'phr-pbt-'));
}

/** Clean up a temp directory */
async function cleanupDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

/**
 * Arbitrary for generating valid identifier strings.
 * Uses alphanumeric characters to avoid key-separator collisions with ':'.
 */
const alphanumChars =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const identifierArb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...alphanumChars.split('')), {
    minLength: 1,
    maxLength: 20,
  })
  .map((chars) => chars.join(''));

/**
 * Arbitrary for a (dbName, collectionName, blockId) triple.
 * Ensures no ':' in dbName or collectionName to avoid ambiguity with the composite key format.
 */
const headTripleArb: fc.Arbitrary<[string, string, string]> = fc.tuple(
  identifierArb,
  identifierArb,
  identifierArb,
);

/**
 * Arbitrary for a unique set of head triples.
 * Deduplicates by (dbName, collectionName) key so each key maps to exactly one blockId.
 */
const uniqueHeadTriplesArb: fc.Arbitrary<[string, string, string][]> = fc
  .array(headTripleArb, { minLength: 1, maxLength: 15 })
  .map((triples: [string, string, string][]) => {
    const seen = new Map<string, [string, string, string]>();
    for (const triple of triples) {
      const [db, col, block] = triple;
      const key = `${db}:${col}`;
      seen.set(key, [db, col, block]);
    }
    return [...seen.values()];
  })
  .filter((arr) => arr.length > 0);

describe('HeadRegistry Property-Based Tests', () => {
  /**
   * Property 1: HeadRegistry persistence round-trip
   *
   * Feature: architectural-gaps, Property 1: HeadRegistry persistence round-trip
   *
   * For any set of (dbName, collectionName, blockId) triples, after calling
   * setHead() for each triple and creating a new PersistentHeadRegistry instance
   * from the same data directory, calling getHead() for each triple should return
   * the same blockId that was set.
   *
   * **Validates: Requirements 1.1, 1.2**
   */
  it('Property 1: persistence round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(uniqueHeadTriplesArb, async (triples) => {
        const dataDir = await makeTempDir();
        try {
          // Write all heads with the first instance
          const reg1 = PersistentHeadRegistry.create({ dataDir });
          for (const [db, col, block] of triples) {
            await reg1.setHead(db, col, block);
          }

          // Create a fresh instance from the same directory and load
          const reg2 = PersistentHeadRegistry.create({ dataDir });
          await reg2.load();

          // Every head should round-trip exactly
          for (const [db, col, block] of triples) {
            const loaded = reg2.getHead(db, col);
            expect(loaded).toBe(block);
          }

          // Total count should match
          expect(reg2.getAllHeads().size).toBe(triples.length);
        } finally {
          await cleanupDir(dataDir);
        }
      }),
      { numRuns: 50 },
    );
  }, 30_000);

  /**
   * Property 2: HeadRegistry removal persistence
   *
   * Feature: architectural-gaps, Property 2: HeadRegistry removal persistence
   *
   * For any set of head pointers that have been persisted, after calling
   * removeHead() for a subset and creating a new PersistentHeadRegistry instance,
   * the removed entries should not be present and the remaining entries should be
   * unchanged. Similarly, after clear(), a new instance should have no entries.
   *
   * **Validates: Requirements 1.3, 1.7**
   */
  it('Property 2: removal persistence', async () => {
    await fc.assert(
      fc.asyncProperty(
        uniqueHeadTriplesArb.chain((triples) => {
          // Generate a boolean mask to decide which entries to remove
          return fc
            .array(fc.boolean(), {
              minLength: triples.length,
              maxLength: triples.length,
            })
            .map((mask) => ({ triples, mask }));
        }),
        async ({ triples, mask }) => {
          const dataDir = await makeTempDir();
          try {
            // Set all heads
            const reg1 = PersistentHeadRegistry.create({ dataDir });
            for (const [db, col, block] of triples) {
              await reg1.setHead(db, col, block);
            }

            // Remove the subset indicated by the mask
            const toRemove: [string, string, string][] = [];
            const toKeep: [string, string, string][] = [];
            for (let i = 0; i < triples.length; i++) {
              if (mask[i]) {
                toRemove.push(triples[i]);
              } else {
                toKeep.push(triples[i]);
              }
            }

            for (const [db, col] of toRemove) {
              await reg1.removeHead(db, col);
            }

            // Load a fresh instance and verify
            const reg2 = PersistentHeadRegistry.create({ dataDir });
            await reg2.load();

            // Removed entries should be absent
            for (const [db, col] of toRemove) {
              expect(reg2.getHead(db, col)).toBeUndefined();
            }

            // Remaining entries should be unchanged
            for (const [db, col, block] of toKeep) {
              expect(reg2.getHead(db, col)).toBe(block);
            }

            expect(reg2.getAllHeads().size).toBe(toKeep.length);

            // Now test clear() persistence
            await reg1.clear();
            const reg3 = PersistentHeadRegistry.create({ dataDir });
            await reg3.load();
            expect(reg3.getAllHeads().size).toBe(0);
          } finally {
            await cleanupDir(dataDir);
          }
        },
      ),
      { numRuns: 50 },
    );
  }, 30_000);

  /**
   * Property 3: HeadRegistry corrupt file recovery
   *
   * Feature: architectural-gaps, Property 3: HeadRegistry corrupt file recovery
   *
   * For any byte sequence written to the head registry file path, loading a
   * PersistentHeadRegistry should never throw an exception — it should either
   * parse valid JSON and load entries, or start with an empty registry.
   *
   * **Validates: Requirements 1.4**
   */
  it('Property 3: corrupt file recovery', async () => {
    // Suppress console.warn during this test since corrupt files trigger warnings
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // Completely random bytes
            fc.uint8Array({ minLength: 0, maxLength: 500 }),
            // Random strings (may or may not be valid JSON)
            fc.string({ minLength: 0, maxLength: 500 }),
            // Valid JSON but not a string-to-string object
            fc.oneof(
              fc.constant('null'),
              fc.constant('true'),
              fc.constant('42'),
              fc.constant('[]'),
              fc.constant('[1,2,3]'),
              fc.constant('{"key": 123}'),
              fc.constant('{"key": null}'),
              fc.constant('{"key": []}'),
              fc.constant('{"key": {"nested": true}}'),
            ),
          ),
          async (corruptData) => {
            const dataDir = await makeTempDir();
            try {
              const filePath = join(dataDir, 'head-registry.json');

              // Write the corrupt data to the file
              if (corruptData instanceof Uint8Array) {
                await fs.writeFile(filePath, corruptData);
              } else {
                await fs.writeFile(filePath, corruptData, 'utf-8');
              }

              // Loading should NEVER throw
              const reg = PersistentHeadRegistry.create({ dataDir });
              await reg.load();

              // The registry should either have valid entries or be empty
              const heads = reg.getAllHeads();
              // All values in the map must be strings
              for (const [key, value] of heads) {
                expect(typeof key).toBe('string');
                expect(typeof value).toBe('string');
              }
            } finally {
              await cleanupDir(dataDir);
            }
          },
        ),
        { numRuns: 50 },
      );
    } finally {
      warnSpy.mockRestore();
    }
  }, 30_000);
});
