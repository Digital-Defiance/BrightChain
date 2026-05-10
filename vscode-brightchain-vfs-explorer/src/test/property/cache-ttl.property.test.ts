/**
 * Feature: brightchain-vfs-explorer, Property 24: MetadataCache respects TTL
 *
 * For any cached entry, retrieving it before the TTL expires should return
 * the cached data. Retrieving it after the TTL expires should return
 * `undefined`, forcing a fresh API call.
 *
 * **Validates: Requirements 6.2, 6.4, 6.5**
 */

import fc from 'fast-check';
import { FileType } from 'vscode';
import { MetadataCache } from '../../services/metadata-cache';

/**
 * Arbitrary TTL value in milliseconds, constrained to a reasonable range.
 */
const ttlArb = fc.integer({ min: 100, max: 5000 });

/**
 * Arbitrary FileStat-like object for cache entries.
 */
const fileStatArb = fc.record({
  type: fc.constant(FileType.File),
  ctime: fc.nat({ max: 2_000_000_000_000 }),
  mtime: fc.nat({ max: 2_000_000_000_000 }),
  size: fc.nat({ max: 1_000_000_000 }),
});

/**
 * Arbitrary directory contents: array of [name, FileType] tuples.
 */
const dirContentsArb = fc.array(
  fc.tuple(
    fc
      .string({ minLength: 1, maxLength: 40 })
      .filter((s) => s.trim().length > 0),
    fc.constantFrom(FileType.File, FileType.Directory),
  ),
  { minLength: 1, maxLength: 10 },
);

describe('Property 24: MetadataCache respects TTL', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('getFileStat returns data before TTL expires', () => {
    fc.assert(
      fc.property(fc.uuid(), ttlArb, fileStatArb, (fileId, ttl, stat) => {
        const cache = new MetadataCache(ttl);
        cache.setFileStat(fileId, stat);

        // Advance time to just before TTL expiry
        const advanceBy = Math.max(0, ttl - 1);
        jest.advanceTimersByTime(advanceBy);

        const result = cache.getFileStat(fileId);
        expect(result).toBeDefined();
        expect(result).toEqual(stat);
      }),
      { numRuns: 100 },
    );
  });

  it('getFileStat returns undefined after TTL expires', () => {
    fc.assert(
      fc.property(fc.uuid(), ttlArb, fileStatArb, (fileId, ttl, stat) => {
        const cache = new MetadataCache(ttl);
        cache.setFileStat(fileId, stat);

        // Advance time past TTL expiry
        jest.advanceTimersByTime(ttl + 1);

        const result = cache.getFileStat(fileId);
        expect(result).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it('getDirContents returns data before TTL expires', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        ttlArb,
        dirContentsArb,
        (folderId, ttl, contents) => {
          const cache = new MetadataCache(ttl);
          cache.setDirContents(folderId, contents);

          const advanceBy = Math.max(0, ttl - 1);
          jest.advanceTimersByTime(advanceBy);

          const result = cache.getDirContents(folderId);
          expect(result).toBeDefined();
          expect(result).toEqual(contents);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('getDirContents returns undefined after TTL expires', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        ttlArb,
        dirContentsArb,
        (folderId, ttl, contents) => {
          const cache = new MetadataCache(ttl);
          cache.setDirContents(folderId, contents);

          jest.advanceTimersByTime(ttl + 1);

          const result = cache.getDirContents(folderId);
          expect(result).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});
