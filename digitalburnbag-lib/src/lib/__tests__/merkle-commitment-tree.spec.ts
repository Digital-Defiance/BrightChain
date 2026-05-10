import fc from 'fast-check';
import { MerkleCommitmentTree } from '../crypto/merkle-commitment-tree';
import { TreeDepthError } from '../errors';

describe('MerkleCommitmentTree', () => {
  // Feature: digital-burn-bag, Property 2: Commitment tree verification round-trip
  // Validates: Requirements 2.1, 2.2
  it('Property 2: build then verify round-trips for any valid seed and depth', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 32, maxLength: 32 }),
        fc.integer({ min: 8, max: 10 }),
        (seed, depth) => {
          const root = MerkleCommitmentTree.computeRoot(seed, depth);
          const result = MerkleCommitmentTree.verify(seed, root, depth);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: digital-burn-bag, Property 3: Wrong tree seed fails verification
  // Validates: Requirements 2.3
  it('Property 3: wrong seed fails verification', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 32, maxLength: 32 }),
        fc.uint8Array({ minLength: 32, maxLength: 32 }),
        fc.integer({ min: 8, max: 9 }),
        (seedA, seedB, depth) => {
          // Skip if seeds happen to be identical
          fc.pre(!seedA.every((v, i) => v === seedB[i]));
          const root = MerkleCommitmentTree.computeRoot(seedA, depth);
          const result = MerkleCommitmentTree.verify(seedB, root, depth);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Merkle root mismatch');
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: digital-burn-bag, Property 20: Merkle proof selective disclosure
  // Validates: Requirements 2.6, 2.7
  it('Property 20: Merkle proof verifies for any valid leaf index', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 32, maxLength: 32 }),
        fc.integer({ min: 8, max: 9 }),
        (seed, depth) => {
          const tree = MerkleCommitmentTree.build(seed, depth);
          const leafIndex = Math.floor(Math.random() * tree.leaves.length);
          const proof = MerkleCommitmentTree.generateProof(tree, leafIndex);
          expect(MerkleCommitmentTree.verifyProof(proof, tree.root)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 20: corrupted sibling fails proof verification', () => {
    const seed = new Uint8Array(32);
    crypto.getRandomValues(seed);
    const tree = MerkleCommitmentTree.build(seed, 8);
    const proof = MerkleCommitmentTree.generateProof(tree, 0);
    // Corrupt one sibling
    proof.siblings[0] = new Uint8Array(64);
    expect(MerkleCommitmentTree.verifyProof(proof, tree.root)).toBe(false);
  });

  it('rejects depth below 8', () => {
    const seed = new Uint8Array(32);
    expect(() => MerkleCommitmentTree.build(seed, 7)).toThrow(TreeDepthError);
  });

  it('build and computeRoot produce the same root', () => {
    const seed = new Uint8Array(32);
    crypto.getRandomValues(seed);
    const tree = MerkleCommitmentTree.build(seed, 8);
    const root = MerkleCommitmentTree.computeRoot(seed, 8);
    expect(Buffer.from(tree.root).equals(Buffer.from(root))).toBe(true);
  });

  it('allNodes returns leaves + internal nodes', () => {
    const seed = new Uint8Array(32);
    crypto.getRandomValues(seed);
    const tree = MerkleCommitmentTree.build(seed, 8);
    const nodes = tree.allNodes();
    // 2^8 leaves + 2^8 - 1 internal nodes = 511 total
    expect(nodes.length).toBe(256 + 255);
  });
});
