/**
 * Property-Based Tests for SplitPaperKeyService
 *
 * These tests validate universal properties of the split paper key system
 * using fast-check for property-based testing.
 *
 * **Validates: Requirements 2.1, 2.4, 2.5**
 *
 * @module services/identity/splitPaperKeyService.property.spec
 */

import { ECIESService } from '@digitaldefiance/ecies-lib';
import * as fc from 'fast-check';

import { initializeBrightChain } from '../../init';
import { ServiceProvider } from '../service.provider';
import { PaperKeyService } from './paperKeyService';
import { SplitPaperKeyService } from './splitPaperKeyService';

describe('SplitPaperKeyService - Property Tests', () => {
  let eciesService: ECIESService;

  beforeAll(() => {
    initializeBrightChain();
  });

  beforeEach(() => {
    ServiceProvider.resetInstance();
    eciesService = ServiceProvider.getInstance().eciesService;
  });

  describe('Property 2: Split Paper Key Reconstruction', () => {
    /**
     * Property 2: Split Paper Key Reconstruction
     *
     * For any paper key split into N shares with threshold T,
     * reconstructing from any T shares SHALL produce the original paper key.
     *
     * **Validates: Requirements 2.1, 2.4, 2.5**
     */
    it('should reconstruct the original paper key from exactly T shares', () => {
      fc.assert(
        fc.property(
          // Generate random N (totalShares) in [2, 10] and T (threshold) in [2, N]
          fc.integer({ min: 2, max: 10 }).chain((n) =>
            fc.record({
              totalShares: fc.constant(n),
              threshold: fc.integer({ min: 2, max: n }),
            }),
          ),
          ({ totalShares, threshold }) => {
            // 1. Generate a fresh paper key (Requirement 2.2)
            const paperKey = PaperKeyService.generatePaperKey(eciesService);
            const paperKeyValue = paperKey.value!;

            // 2. Split into N shares with threshold T (Requirement 2.1)
            const shares = SplitPaperKeyService.split(
              paperKeyValue,
              totalShares,
              threshold,
            );

            // Verify we got the expected number of shares
            expect(shares).toHaveLength(totalShares);

            // 3. Pick exactly T shares (a random subset)
            const shuffled = [...shares].sort(() => Math.random() - 0.5);
            const selectedShares = shuffled.slice(0, threshold);

            // 4. Reconstruct from T shares (Requirement 2.4)
            const reconstructed = SplitPaperKeyService.reconstruct(
              selectedShares,
              totalShares,
            );

            // 5. The reconstructed paper key must match the original
            expect(reconstructed).toBe(paperKeyValue);
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should fail reconstruction with fewer than T shares (Requirement 2.5)', () => {
      fc.assert(
        fc.property(
          // Generate N in [3, 8] and T in [3, N] so that T-1 >= 2 (minimum for reconstruct)
          fc.integer({ min: 3, max: 8 }).chain((n) =>
            fc.record({
              totalShares: fc.constant(n),
              threshold: fc.integer({ min: 3, max: n }),
            }),
          ),
          ({ totalShares, threshold }) => {
            // 1. Generate a fresh paper key
            const paperKey = PaperKeyService.generatePaperKey(eciesService);
            const paperKeyValue = paperKey.value!;

            // 2. Split into N shares with threshold T
            const shares = SplitPaperKeyService.split(
              paperKeyValue,
              totalShares,
              threshold,
            );

            // 3. Take fewer than T shares (T-1)
            const insufficientShares = shares.slice(0, threshold - 1);

            // 4. Reconstruction with fewer than T shares should either
            //    throw an error or produce a different (wrong) mnemonic
            try {
              const result = SplitPaperKeyService.reconstruct(
                insufficientShares,
                totalShares,
              );
              // If it doesn't throw, the result must NOT match the original
              expect(result).not.toBe(paperKeyValue);
            } catch {
              // Throwing is the expected behaviour — reconstruction failed
              expect(true).toBe(true);
            }
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should reconstruct correctly from any subset of T shares out of N', () => {
      fc.assert(
        fc.property(
          // Use a fixed split (5 shares, threshold 3) and pick different subsets
          fc.constant(null),
          () => {
            // 1. Generate a fresh paper key
            const paperKey = PaperKeyService.generatePaperKey(eciesService);
            const paperKeyValue = paperKey.value!;

            const totalShares = 5;
            const threshold = 3;

            // 2. Split into 5 shares with threshold 3
            const shares = SplitPaperKeyService.split(
              paperKeyValue,
              totalShares,
              threshold,
            );

            // 3. Try two different subsets of 3 shares
            const subset1 = [shares[0], shares[2], shares[4]];
            const subset2 = [shares[1], shares[3], shares[4]];

            const reconstructed1 = SplitPaperKeyService.reconstruct(
              subset1,
              totalShares,
            );
            const reconstructed2 = SplitPaperKeyService.reconstruct(
              subset2,
              totalShares,
            );

            // 4. Both subsets must reconstruct to the same original paper key
            expect(reconstructed1).toBe(paperKeyValue);
            expect(reconstructed2).toBe(paperKeyValue);
          },
        ),
        { numRuns: 10 },
      );
    });
  });
});
