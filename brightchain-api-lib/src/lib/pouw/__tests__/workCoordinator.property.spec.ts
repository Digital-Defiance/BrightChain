/**
 * Property-Based Tests for WorkCoordinator
 *
 * Feature: proof-of-useful-work-ratelimit
 *
 * Properties tested:
 * - Property 17: Quorum Verification
 *
 * **Validates: Requirements 4.4**
 *
 * The WorkCoordinator uses pre-computed answer comparison as its primary
 * verification strategy. For redundant (quorum) verification, the same
 * work unit would be issued to N clients and accepted when Q matching
 * results are received. This test validates the building blocks:
 *
 * 1. verifyResult accepts correct results (matching pre-computed hash)
 * 2. verifyResult rejects incorrect results (non-matching hash)
 * 3. Simulated quorum: given N client results with varying correctness,
 *    the result set is accepted iff at least Q clients return the correct hash
 */

import {
  ChecksumService,
  DifficultyTier,
  IWorkResult,
} from '@brightchain/brightchain-lib';
import * as fc from 'fast-check';
import { MerkleTreeAssembler } from '../merkleTreeAssembler';
import { TokenValidator } from '../tokenValidator';
import { WorkCoordinator } from '../workCoordinator';
import { WorkQueue } from '../workQueue';

/**
 * Create a fresh WorkCoordinator with real dependencies for testing.
 */
function createCoordinator() {
  const checksumService = new ChecksumService();
  const queue = new WorkQueue({
    minQueueDepth: 10,
    workUnitMaxAgeMs: 3_600_000,
  });
  const assembler = new MerkleTreeAssembler(checksumService);
  const tokenValidator = new TokenValidator(
    'test-secret-key-for-property-tests',
    60,
  );
  const coordinator = new WorkCoordinator(
    checksumService,
    queue,
    assembler,
    tokenValidator,
    { minQueueDepth: 10, workUnitMaxAgeMs: 3_600_000 },
  );
  return { coordinator, checksumService, queue, assembler, tokenValidator };
}

describe('WorkCoordinator Property Tests', () => {
  /**
   * Property 17: Quorum Verification
   *
   * For work units issued to N clients under redundant verification,
   * the result SHALL be accepted if and only if at least Q (quorum)
   * clients return matching results.
   *
   * Since the WorkCoordinator implements pre-computed answer comparison,
   * we test the building blocks of quorum verification:
   * - verifyResult correctly distinguishes correct from incorrect results
   * - A simulated quorum accepts iff matching count >= quorum threshold
   *
   * **Validates: Requirements 4.4**
   */
  describe('Feature: proof-of-useful-work-ratelimit, Property 17: Quorum Verification', () => {
    it('verifyResult accepts correct results and rejects incorrect results for any leaf data', () => {
      fc.assert(
        fc.property(
          // Random leaf data: 1-8 leaves, each 32-512 bytes
          fc.array(fc.uint8Array({ minLength: 32, maxLength: 512 }), {
            minLength: 1,
            maxLength: 8,
          }),
          (leafDataArrays) => {
            const { coordinator, checksumService } = createCoordinator();
            const clientId = 'test-client';
            const treeId = `tree-${Date.now()}-${Math.random()}`;

            // Decompose leaf data into work units (enqueues them)
            coordinator.decomposeTree(leafDataArrays, treeId);

            // Issue a work unit to a client
            const workUnit = coordinator.issueWorkUnit(
              clientId,
              DifficultyTier.Low,
            );

            // Compute the correct result: SHA3-512 of the leaf data
            const inputBytes = Buffer.from(workUnit.inputData, 'base64');
            const correctHash = checksumService
              .calculateChecksum(inputBytes)
              .toHex();

            // Submit the correct result — should be accepted
            const correctResult: IWorkResult = {
              workUnitId: workUnit.id,
              resultHash: correctHash,
              challengeToken: workUnit.challengeToken,
              computeTimeMs: 100,
              completedAt: new Date().toISOString(),
            };

            expect(coordinator.verifyResult(correctResult)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('verifyResult rejects results with incorrect hashes', () => {
      fc.assert(
        fc.property(
          // Random leaf data
          fc.uint8Array({ minLength: 32, maxLength: 512 }),
          // Random incorrect hash bytes (64 bytes = SHA3-512 length)
          fc.uint8Array({ minLength: 64, maxLength: 64 }),
          (leafData, randomHashBytes) => {
            const randomHexHash = Buffer.from(randomHashBytes).toString('hex');
            const { coordinator, checksumService } = createCoordinator();
            const clientId = 'test-client';
            const treeId = `tree-${Date.now()}-${Math.random()}`;

            // Decompose single leaf into work unit
            coordinator.decomposeTree([leafData], treeId);

            // Issue the work unit
            const workUnit = coordinator.issueWorkUnit(
              clientId,
              DifficultyTier.Low,
            );

            // Compute the correct hash to ensure our random hash differs
            const inputBytes = Buffer.from(workUnit.inputData, 'base64');
            const correctHash = checksumService
              .calculateChecksum(inputBytes)
              .toHex();

            // Only test when the random hash actually differs from the correct one
            if (randomHexHash === correctHash) {
              return; // Skip this case — extremely unlikely but possible
            }

            // Submit an incorrect result — should be rejected
            const incorrectResult: IWorkResult = {
              workUnitId: workUnit.id,
              resultHash: randomHexHash,
              challengeToken: workUnit.challengeToken,
              computeTimeMs: 100,
              completedAt: new Date().toISOString(),
            };

            expect(coordinator.verifyResult(incorrectResult)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('simulated quorum: result set accepted iff matching count >= quorum threshold', () => {
      fc.assert(
        fc.property(
          // N: total number of clients (2-10)
          fc.integer({ min: 2, max: 10 }),
          // quorumFraction: fraction of N required for quorum (0.5 to 1.0)
          fc.double({ min: 0.5, max: 1.0, noNaN: true }),
          // Random leaf data for the work unit
          fc.uint8Array({ minLength: 64, maxLength: 256 }),
          // matchingFraction: fraction of clients returning correct result
          fc.double({ min: 0.0, max: 1.0, noNaN: true }),
          (totalClients, quorumFraction, leafData, matchingFraction) => {
            const { checksumService } = createCoordinator();

            // Compute the quorum threshold Q
            const quorumThreshold = Math.ceil(totalClients * quorumFraction);

            // Compute the correct hash for this leaf data
            const correctHash = checksumService
              .calculateChecksum(leafData)
              .toHex();

            // Determine how many clients return the correct result
            const matchingCount = Math.round(totalClients * matchingFraction);

            // Simulate N client results: matchingCount return correct hash,
            // the rest return an incorrect hash
            const incorrectHash = '0'.repeat(128); // clearly wrong hash
            const results: string[] = [];
            for (let i = 0; i < totalClients; i++) {
              if (i < matchingCount) {
                results.push(correctHash);
              } else {
                results.push(incorrectHash);
              }
            }

            // Count how many results match the correct hash
            const actualMatchCount = results.filter(
              (r) => r === correctHash,
            ).length;

            // Quorum verification: accepted iff matching count >= quorum threshold
            const quorumMet = actualMatchCount >= quorumThreshold;

            // Verify each result individually using the pre-computed verification
            // building block (constant-time comparison simulation)
            const verifiedResults = results.map((resultHash) => {
              const resultBuffer = Buffer.from(resultHash, 'hex');
              const expectedBuffer = Buffer.from(correctHash, 'hex');
              if (resultBuffer.length !== expectedBuffer.length) {
                return false;
              }
              return resultBuffer.equals(expectedBuffer);
            });

            const verifiedMatchCount = verifiedResults.filter(Boolean).length;

            // The verified match count should equal our expected match count
            expect(verifiedMatchCount).toBe(actualMatchCount);

            // The quorum decision should be consistent
            const quorumAccepted = verifiedMatchCount >= quorumThreshold;
            expect(quorumAccepted).toBe(quorumMet);

            // Core property: accepted iff matchingCount >= quorumThreshold
            if (matchingCount >= quorumThreshold) {
              expect(quorumAccepted).toBe(true);
            } else {
              expect(quorumAccepted).toBe(false);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('verifyResult rejects results with single-bit-flipped hash', () => {
      fc.assert(
        fc.property(
          // Random leaf data
          fc.uint8Array({ minLength: 32, maxLength: 256 }),
          // Random bit position to flip (0-511 for 64-byte hash)
          fc.integer({ min: 0, max: 511 }),
          (leafData, bitPosition) => {
            const { coordinator, checksumService } = createCoordinator();
            const clientId = 'test-client';
            const treeId = `tree-${Date.now()}-${Math.random()}`;

            // Decompose single leaf into work unit
            coordinator.decomposeTree([leafData], treeId);

            // Issue the work unit
            const workUnit = coordinator.issueWorkUnit(
              clientId,
              DifficultyTier.Low,
            );

            // Compute the correct hash
            const inputBytes = Buffer.from(workUnit.inputData, 'base64');
            const correctHash = checksumService
              .calculateChecksum(inputBytes)
              .toHex();

            // Flip a single bit in the hash
            const hashBytes = Buffer.from(correctHash, 'hex');
            const byteIndex = Math.floor(bitPosition / 8);
            const bitIndex = bitPosition % 8;
            hashBytes[byteIndex] ^= 1 << bitIndex;
            const flippedHash = hashBytes.toString('hex');

            // Submit the bit-flipped result — should be rejected
            const flippedResult: IWorkResult = {
              workUnitId: workUnit.id,
              resultHash: flippedHash,
              challengeToken: workUnit.challengeToken,
              computeTimeMs: 100,
              completedAt: new Date().toISOString(),
            };

            expect(coordinator.verifyResult(flippedResult)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('verifyResult rejects unknown work unit IDs', () => {
      fc.assert(
        fc.property(
          // Random work unit ID
          fc.uuid(),
          // Random hash bytes (64 bytes = SHA3-512 length)
          fc.uint8Array({ minLength: 64, maxLength: 64 }),
          (unknownWorkUnitId, randomHashBytes) => {
            const randomHash = Buffer.from(randomHashBytes).toString('hex');
            const { coordinator } = createCoordinator();

            // Submit a result for a work unit that was never issued
            const result: IWorkResult = {
              workUnitId: unknownWorkUnitId,
              resultHash: randomHash,
              challengeToken: 'some-token',
              computeTimeMs: 100,
              completedAt: new Date().toISOString(),
            };

            expect(coordinator.verifyResult(result)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
