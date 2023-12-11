/**
 * @fileoverview Property-based tests for client-server hash compatibility.
 *
 * Feature: proof-of-useful-work-ratelimit, Property 9: Client-Server Hash Compatibility
 *
 * **Validates: Requirements 7.3, 7.4**
 *
 * Property 9: For any input data (leaf bytes or concatenated child hashes),
 * the client library's `computeWorkUnit()` function SHALL produce a SHA3-512
 * hash identical to the server's `ChecksumService.calculateChecksum()` output.
 */

import fc from 'fast-check';
import { DifficultyTier } from '../../enumerations/difficultyTier';
import { IWorkUnit, WorkUnitOperation } from '../../interfaces/pouw/workUnit';
import { ChecksumService } from '../../services/checksum.service';
import { computeWorkUnit } from '../computeWorkUnit';

describe('Feature: proof-of-useful-work-ratelimit, Property 9: Client-Server Hash Compatibility', () => {
  const checksumService = new ChecksumService();

  /**
   * Helper to build a minimal IWorkUnit for testing.
   */
  function makeWorkUnit(base64Input: string): IWorkUnit {
    return {
      id: 'test-work-unit-id',
      treeId: 'test-tree-id',
      treeLevel: 0,
      treeIndex: 0,
      operation: WorkUnitOperation.LeafHash,
      inputData: base64Input,
      childCount: 0,
      difficulty: DifficultyTier.Low,
      challengeToken: 'test-challenge-token',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
  }

  /**
   * **Validates: Requirements 7.3, 7.4**
   *
   * For any random byte array (0–8192 bytes), the client-side
   * `computeWorkUnit()` produces a SHA3-512 hash identical to the
   * server-side `ChecksumService.calculateChecksum()` output.
   *
   * Both results should be lowercase 128-character hex strings.
   */
  it('client computeWorkUnit() produces the same SHA3-512 hash as server ChecksumService.calculateChecksum()', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 0, maxLength: 8192 }),
        async (bytes: Uint8Array) => {
          // Encode bytes as base64 for the work unit input
          const base64String = Buffer.from(bytes).toString('base64');

          // Client-side: compute via computeWorkUnit
          const workUnit = makeWorkUnit(base64String);
          const result = await computeWorkUnit(workUnit);

          // Server-side: compute via ChecksumService
          const checksum = checksumService.calculateChecksum(bytes);

          // Both should produce the same lowercase 128-char hex string
          expect(result.resultHash).toBe(checksum.toHex());
          expect(result.resultHash).toHaveLength(128);
          expect(result.resultHash).toMatch(/^[0-9a-f]{128}$/);
        },
      ),
      { numRuns: 100 },
    );
  });
});
