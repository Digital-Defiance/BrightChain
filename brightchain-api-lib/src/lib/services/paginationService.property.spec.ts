import * as fc from 'fast-check';
import { PaginationService } from './paginationService';

describe('PaginationService - Property Tests', () => {
  describe('Property 21: Cursor-based pagination completeness', () => {
    it('should retrieve all items when following cursors', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
              data: fc.string(),
            }),
            { minLength: 0, maxLength: 50 },
          ),
          fc.integer({ min: 1, max: 10 }),
          (items, pageSize) => {
            const allRetrieved: typeof items = [];
            let cursor: string | undefined;
            let hasMore = true;

            while (hasMore) {
              const page = PaginationService.paginate(items, pageSize, cursor);
              allRetrieved.push(...page.items);
              cursor = page.nextCursor;
              hasMore = page.hasMore;
            }

            expect(allRetrieved.length).toBe(items.length);
            const sortedOriginal = [...items].sort(
              (a, b) => b.timestamp - a.timestamp,
            );
            expect(allRetrieved.map((i) => i.id)).toEqual(
              sortedOriginal.map((i) => i.id),
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should never return duplicate items across pages', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
            }),
            { minLength: 5, maxLength: 30 },
          ),
          fc.integer({ min: 1, max: 5 }),
          (items, pageSize) => {
            const seenIds = new Set<string>();
            let cursor: string | undefined;
            let hasMore = true;

            while (hasMore) {
              const page = PaginationService.paginate(items, pageSize, cursor);
              for (const item of page.items) {
                expect(seenIds.has(item.id)).toBe(false);
                seenIds.add(item.id);
              }
              cursor = page.nextCursor;
              hasMore = page.hasMore;
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should maintain sort order across pages', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
            }),
            { minLength: 5, maxLength: 30 },
          ),
          fc.integer({ min: 1, max: 5 }),
          (items, pageSize) => {
            const allRetrieved: typeof items = [];
            let cursor: string | undefined;
            let hasMore = true;

            while (hasMore) {
              const page = PaginationService.paginate(items, pageSize, cursor);
              allRetrieved.push(...page.items);
              cursor = page.nextCursor;
              hasMore = page.hasMore;
            }

            for (let i = 1; i < allRetrieved.length; i++) {
              expect(allRetrieved[i - 1].timestamp).toBeGreaterThanOrEqual(
                allRetrieved[i].timestamp,
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle cursor round-trip correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000000000, max: 9999999999999 }),
          fc.uuid(),
          (timestamp, id) => {
            const cursor = PaginationService.encodeCursor(timestamp, id);
            const decoded = PaginationService.decodeCursor(cursor);
            expect(decoded.timestamp).toBe(timestamp);
            expect(decoded.id).toBe(id);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
