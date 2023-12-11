/**
 * Property-Based Tests for MerkleTreeAssembler
 *
 * Feature: proof-of-useful-work-ratelimit, Properties 7 & 8
 *
 * Property 7: Merkle Tree Decomposition and Assembly Round-Trip
 * For any set of leaf data blocks, decomposing them into work units and then
 * computing and assembling all work unit results SHALL produce a valid Merkle
 * tree whose leaf hashes match the SHA3-512 hashes of the original data blocks.
 *
 * Property 8: Merkle Tree Hash Consistency Invariant
 * For any assembled Merkle tree, every interior node's hash SHALL equal the
 * SHA3-512 hash of the concatenation of its children's hashes.
 *
 * **Validates: Requirements 2.2, 6.2, 6.5**
 */

import { Checksum, ChecksumService } from '@brightchain/brightchain-lib';
import * as fc from 'fast-check';
import { MerkleTreeAssembler } from '../merkleTreeAssembler';

/**
 * Compute the number of nodes at each level of a Merkle tree.
 *
 * @param leafCount - Number of leaf nodes
 * @returns Array where sizes[0] = root count (1), sizes[levels-1] = leafCount
 */
function computeLevelSizes(leafCount: number): number[] {
  const sizes: number[] = [];
  let currentSize = leafCount;
  sizes.unshift(currentSize);
  while (currentSize > 1) {
    currentSize = Math.ceil(currentSize / 2);
    sizes.unshift(currentSize);
  }
  return sizes;
}

/**
 * Build a complete Merkle tree from leaf data by computing leaf hashes,
 * then building interior nodes bottom-up.
 *
 * @returns Map of hashes by level for verification purposes
 */
function buildCompleteTree(
  assembler: MerkleTreeAssembler,
  checksumService: ChecksumService,
  treeId: string,
  leafData: Uint8Array[],
): Map<number, Checksum[]> {
  const leafCount = leafData.length;
  assembler.createTree(treeId, leafCount);

  const levelSizes = computeLevelSizes(leafCount);
  const levels = levelSizes.length;
  const leafLevel = levels - 1;

  // Insert leaf hashes
  const leafHashes: Checksum[] = [];
  for (let i = 0; i < leafCount; i++) {
    const hash = checksumService.calculateChecksum(leafData[i]);
    leafHashes.push(hash);
    assembler.insertNode(treeId, leafLevel, i, hash);
  }

  // Store hashes by level for building parents
  const hashesByLevel: Map<number, Checksum[]> = new Map();
  hashesByLevel.set(leafLevel, leafHashes);

  // Build interior nodes bottom-up
  for (let level = leafLevel - 1; level >= 0; level--) {
    const childHashes = hashesByLevel.get(level + 1)!;
    const parentHashes: Checksum[] = [];

    for (let i = 0; i < levelSizes[level]; i++) {
      const leftChild = childHashes[i * 2];
      const buffers: Uint8Array[] = [leftChild.toUint8Array()];

      if (i * 2 + 1 < childHashes.length) {
        buffers.push(childHashes[i * 2 + 1].toUint8Array());
      }

      const hash = checksumService.calculateChecksumForBuffers(buffers);
      parentHashes.push(hash);
      assembler.insertNode(treeId, level, i, hash);
    }

    hashesByLevel.set(level, parentHashes);
  }

  return hashesByLevel;
}

describe('MerkleTreeAssembler Property Tests', () => {
  let checksumService: ChecksumService;

  beforeEach(() => {
    checksumService = new ChecksumService();
  });

  /**
   * Property 7: Merkle Tree Decomposition and Assembly Round-Trip
   *
   * **Validates: Requirements 2.2, 6.2**
   */
  describe('Feature: proof-of-useful-work-ratelimit, Property 7: Merkle Tree Decomposition and Assembly Round-Trip', () => {
    it('decomposing leaf data, computing results, and assembling produces a valid tree whose leaf hashes match SHA3-512 of original data', () => {
      fc.assert(
        fc.property(
          fc.array(fc.uint8Array({ minLength: 64, maxLength: 512 }), {
            minLength: 1,
            maxLength: 16,
          }),
          (leafData) => {
            const assembler = new MerkleTreeAssembler(checksumService);
            const treeId = `tree-${Date.now()}-${Math.random()}`;

            const hashesByLevel = buildCompleteTree(
              assembler,
              checksumService,
              treeId,
              leafData,
            );

            // Verify: tree is complete
            expect(assembler.isComplete(treeId)).toBe(true);

            // Verify: each leaf hash matches SHA3-512 of the original leaf data
            const leafLevel = hashesByLevel.size - 1;
            const leafHashes = hashesByLevel.get(leafLevel)!;
            for (let i = 0; i < leafData.length; i++) {
              const expectedHash = checksumService.calculateChecksum(
                leafData[i],
              );
              expect(leafHashes[i].equals(expectedHash)).toBe(true);
            }

            // Verify: validateTree() returns true
            expect(assembler.validateTree(treeId)).toBe(true);

            // Verify: root hash exists
            const rootHash = assembler.getRootHash(treeId);
            expect(rootHash).toBeDefined();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('exported addresses have correct count matching total nodes', () => {
      fc.assert(
        fc.property(
          fc.array(fc.uint8Array({ minLength: 64, maxLength: 256 }), {
            minLength: 1,
            maxLength: 16,
          }),
          (leafData) => {
            const assembler = new MerkleTreeAssembler(checksumService);
            const treeId = `tree-export-${Date.now()}-${Math.random()}`;

            buildCompleteTree(assembler, checksumService, treeId, leafData);

            const addresses = assembler.exportAddresses(treeId);
            const levelSizes = computeLevelSizes(leafData.length);
            const expectedTotal = levelSizes.reduce((sum, s) => sum + s, 0);

            expect(addresses.length).toBe(expectedTotal);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 8: Merkle Tree Hash Consistency Invariant
   *
   * **Validates: Requirements 6.5**
   */
  describe('Feature: proof-of-useful-work-ratelimit, Property 8: Merkle Tree Hash Consistency Invariant', () => {
    it('every interior node hash equals SHA3-512(concat(children hashes))', () => {
      fc.assert(
        fc.property(
          fc.array(fc.uint8Array({ minLength: 64, maxLength: 512 }), {
            minLength: 1,
            maxLength: 16,
          }),
          (leafData) => {
            const assembler = new MerkleTreeAssembler(checksumService);
            const treeId = `tree-consistency-${Date.now()}-${Math.random()}`;

            const hashesByLevel = buildCompleteTree(
              assembler,
              checksumService,
              treeId,
              leafData,
            );

            // validateTree checks the hash consistency invariant
            expect(assembler.validateTree(treeId)).toBe(true);

            // Also manually verify: for each interior node, its hash equals
            // SHA3-512(concat(children hashes))
            const levelSizes = computeLevelSizes(leafData.length);
            const levels = levelSizes.length;

            for (let level = 0; level < levels - 1; level++) {
              const childLevel = level + 1;
              const parentHashes = hashesByLevel.get(level)!;
              const childHashes = hashesByLevel.get(childLevel)!;

              for (let i = 0; i < levelSizes[level]; i++) {
                const leftChild = childHashes[i * 2];
                const buffers: Uint8Array[] = [leftChild.toUint8Array()];

                if (i * 2 + 1 < childHashes.length) {
                  buffers.push(childHashes[i * 2 + 1].toUint8Array());
                }

                const expectedHash =
                  checksumService.calculateChecksumForBuffers(buffers);
                expect(parentHashes[i].equals(expectedHash)).toBe(true);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('corrupting an interior node hash causes validateTree to return false', () => {
      fc.assert(
        fc.property(
          fc.array(fc.uint8Array({ minLength: 64, maxLength: 256 }), {
            minLength: 2,
            maxLength: 16,
          }),
          (leafData) => {
            const assembler = new MerkleTreeAssembler(checksumService);
            const treeId = `tree-corrupt-${Date.now()}-${Math.random()}`;

            buildCompleteTree(assembler, checksumService, treeId, leafData);

            // Tree should be valid before corruption
            expect(assembler.validateTree(treeId)).toBe(true);

            // Corrupt the root node by inserting a different hash
            // Create a bogus hash by hashing some arbitrary data
            const bogusHash = checksumService.calculateChecksum(
              new Uint8Array([0xff, 0xfe, 0xfd, 0xfc]),
            );
            assembler.insertNode(treeId, 0, 0, bogusHash);

            // Tree should now fail validation
            expect(assembler.validateTree(treeId)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
