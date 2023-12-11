/**
 * Property tests for cursor-based pagination utility.
 *
 * Feature: communication-api-controllers, Property 21: Cursor-based pagination completeness
 * Validates: Requirements 8.1
 *
 * Property 21: For any ordered collection of N messages, iterating through
 * all pages using cursor-based pagination SHALL yield exactly N messages
 * with no duplicates and no gaps, and the concatenation of all pages SHALL
 * be in the correct order.
 */

import { Identifiable, paginateItems } from '@brightchain/brightchain-lib';
import * as fc from 'fast-check';

/** Arbitrary for a list of identifiable items with unique IDs. */
const arbItems = fc
  .uniqueArray(fc.uuid(), { minLength: 0, maxLength: 200 })
  .map((ids) =>
    ids.map((id, i) => ({
      id,
      index: i,
    })),
  );

/** Arbitrary for a reasonable page size (1–50). */
const arbLimit = fc.integer({ min: 1, max: 50 });

describe('paginateItems – Property 21: Cursor-based pagination completeness', () => {
  /**
   * **Validates: Requirements 8.1**
   *
   * Iterating through all pages collects exactly N items with no
   * duplicates and no gaps, in the original order.
   */
  it('iterating all pages yields every item exactly once in order', () => {
    fc.assert(
      fc.property(arbItems, arbLimit, (items, limit) => {
        const collected: Identifiable[] = [];
        let cursor: string | undefined;

        // Walk through all pages
        for (let safety = 0; safety < items.length + 2; safety++) {
          const page = paginateItems(items, cursor, limit);
          collected.push(...page.items);
          if (!page.hasMore) break;
          cursor = page.cursor;
        }

        // Exactly N items
        if (collected.length !== items.length) return false;

        // No duplicates
        const ids = collected.map((c) => c.id);
        if (new Set(ids).size !== ids.length) return false;

        // Correct order preserved
        for (let i = 0; i < items.length; i++) {
          if (collected[i].id !== items[i].id) return false;
        }

        return true;
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements 8.1**
   *
   * Each page contains at most `limit` items.
   */
  it('each page contains at most limit items', () => {
    fc.assert(
      fc.property(arbItems, arbLimit, (items, limit) => {
        let cursor: string | undefined;

        for (let safety = 0; safety < items.length + 2; safety++) {
          const page = paginateItems(items, cursor, limit);
          if (page.items.length > limit) return false;
          if (!page.hasMore) break;
          cursor = page.cursor;
        }

        return true;
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements 8.1**
   *
   * hasMore is false if and only if we are on the last page.
   */
  it('hasMore is false only on the final page', () => {
    fc.assert(
      fc.property(arbItems, arbLimit, (items, limit) => {
        let cursor: string | undefined;
        let totalCollected = 0;

        for (let safety = 0; safety < items.length + 2; safety++) {
          const page = paginateItems(items, cursor, limit);
          totalCollected += page.items.length;

          if (!page.hasMore) {
            // This should be the last page — we should have all items
            return totalCollected === items.length;
          }
          cursor = page.cursor;
        }

        // Should not reach here for non-empty collections
        return items.length === 0;
      }),
      { numRuns: 200 },
    );
  });
});
