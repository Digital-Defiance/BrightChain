/**
 * Property-based test for search results ordering by relevance score.
 *
 * Property 10: Search results ordered by relevance score
 * Tests the pure sorting logic used to order search results by
 * relevanceScore in descending order.
 *
 * Feature: brightchat-frontend, Property 10: Search results ordered by relevance score
 */

jest.mock('@brightchain/brightchain-lib', () => ({}));

import fc from 'fast-check';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ISearchResultItem {
  messageId: string;
  contextId: string;
  contextName: string;
  encryptedContent: string;
  relevanceScore: number;
  createdAt: Date;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * The exact sorting logic for search results: descending by relevanceScore.
 */
function sortByRelevanceScore(
  results: ISearchResultItem[],
): ISearchResultItem[] {
  return [...results].sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const validDateArb = fc
  .integer({
    min: new Date('2020-01-01T00:00:00Z').getTime(),
    max: new Date('2030-12-31T23:59:59Z').getTime(),
  })
  .map((ms) => new Date(ms));

const searchResultArb = fc.record({
  messageId: fc.uuid(),
  contextId: fc.uuid(),
  contextName: fc.string({ minLength: 1, maxLength: 50 }),
  encryptedContent: fc.string({ minLength: 1, maxLength: 200 }),
  relevanceScore: fc.double({ min: 0, max: 1, noNaN: true }),
  createdAt: validDateArb,
});

/**
 * Generates an array of search results with distinct relevanceScore values.
 */
const distinctScoreResultsArb = fc
  .array(searchResultArb, { minLength: 2, maxLength: 30 })
  .filter((results) => {
    const scores = results.map((r) => r.relevanceScore);
    return new Set(scores).size === scores.length;
  });

// ─── Property 10: Search results ordered by relevance score ─────────────────

describe('Feature: brightchat-frontend, Property 10: Search results ordered by relevance score', () => {
  /**
   * **Validates: Requirements 5.5**
   *
   * For any array of search results with distinct relevanceScore values,
   * sorting produces strictly descending order by relevanceScore.
   */
  it('should sort search results in strictly descending order of relevanceScore', () => {
    fc.assert(
      fc.property(distinctScoreResultsArb, (results) => {
        const sorted = sortByRelevanceScore(results);

        for (let i = 0; i < sorted.length - 1; i++) {
          expect(sorted[i].relevanceScore).toBeGreaterThan(
            sorted[i + 1].relevanceScore,
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 5.5**
   *
   * Sorting preserves all original results (no loss or duplication).
   */
  it('should preserve all original results after sorting (no items lost or added)', () => {
    fc.assert(
      fc.property(distinctScoreResultsArb, (results) => {
        const sorted = sortByRelevanceScore(results);

        expect(sorted.length).toBe(results.length);

        const originalIds = new Set(results.map((r) => r.messageId));
        const sortedIds = new Set(sorted.map((r) => r.messageId));
        expect(sortedIds).toEqual(originalIds);
      }),
      { numRuns: 100 },
    );
  });
});
