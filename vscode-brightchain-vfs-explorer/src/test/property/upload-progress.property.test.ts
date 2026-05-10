/**
 * Feature: brightchain-vfs-explorer, Property 15: Upload progress tracks chunk completion
 *
 * For any upload session with totalChunks > 0, after receiving chunk i (0-indexed),
 * the reported progress fraction should equal (i + 1) / totalChunks.
 *
 * **Validates: Requirements 7.4**
 */

import * as fc from 'fast-check';
import { calculateProgress } from '../../ui/progress-reporter';

describe('Property 15: Upload progress tracks chunk completion', () => {
  it('should report correct progress fraction for each chunk', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10000 }), (totalChunks) => {
        // For each possible chunk index (0-indexed), verify progress
        return fc.assert(
          fc.property(
            fc.integer({ min: 0, max: totalChunks - 1 }),
            (chunkIndex) => {
              const chunksCompleted = chunkIndex + 1;
              const progress = calculateProgress(chunksCompleted, totalChunks);
              const expected = chunksCompleted / totalChunks;

              expect(progress).toBeCloseTo(expected, 10);
              expect(progress).toBeGreaterThan(0);
              expect(progress).toBeLessThanOrEqual(1);
            },
          ),
          { numRuns: 10 },
        );
      }),
      { numRuns: 100 },
    );
  });

  it('should return 0 for zero or negative totalChunks', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 0 }),
        fc.integer({ min: 0, max: 100 }),
        (totalChunks, chunksCompleted) => {
          expect(calculateProgress(chunksCompleted, totalChunks)).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should cap progress at 1 when chunksCompleted exceeds totalChunks', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        (totalChunks, extra) => {
          const chunksCompleted = totalChunks + extra;
          expect(calculateProgress(chunksCompleted, totalChunks)).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
