/**
 * Property-based tests for IncrementalMerkleTree.
 *
 * Properties 1, 2, 3, 4, 5, 6, 7, 11 from the design document.
 * Uses fast-check with minimum 100 iterations per property.
 *
 * @see Design: Merkle Tree Commitment Layer — Correctness Properties
 */

import * as fc from 'fast-check';
import { ChecksumService } from '../../services/checksum.service';
import { Checksum } from '../../types/checksum';
import { IncrementalMerkleTree } from '../incrementalMerkleTree';
import { MerkleDirection } from '../../interfaces/ledger/merkleProof';
import type { IMerkleProof } from '../../interfaces/ledger/merkleProof';
import type { IConsistencyProof } from '../../interfaces/ledger/consistencyProof';

// ── Shared ChecksumService instance ──────────────────────────────────

const cs = new ChecksumService();

// ── Custom Generators ────────────────────────────────────────────────

function arbChecksum(): fc.Arbitrary<Checksum> {
  return fc
    .array(fc.integer({ min: 0, max: 255 }), { minLength: 64, maxLength: 64 })
    .map((arr) => Checksum.fromUint8Array(new Uint8Array(arr)));
}

function arbLeafHashes(maxSize: number): fc.Arbitrary<Checksum[]> {
  return fc.array(arbChecksum(), { minLength: 1, maxLength: maxSize });
}

// ── Verification Helpers (inline, no Ledger dependency) ──────────────

/**
 * Hash two child nodes: SHA3-512(left || right).
 */
function hashPair(left: Checksum, right: Checksum): Checksum {
  const l = left.toUint8Array();
  const r = right.toUint8Array();
  const combined = new Uint8Array(l.length + r.length);
  combined.set(l, 0);
  combined.set(r, l.length);
  return cs.calculateChecksum(combined);
}

/**
 * Verify an inclusion proof by recomputing hashes from leaf to root.
 *
 * For each step in the path:
 *   - LEFT direction means sibling is on the left: hash(sibling, current)
 *   - RIGHT direction means sibling is on the right: hash(current, sibling)
 */
function verifyInclusionProof(
  proof: IMerkleProof,
  expectedRoot: Checksum,
): boolean {
  let current = proof.leafHash;
  for (const step of proof.path) {
    if (step.direction === MerkleDirection.LEFT) {
      current = hashPair(step.hash, current);
    } else {
      current = hashPair(current, step.hash);
    }
  }
  return current.equals(expectedRoot);
}

/**
 * Verify a consistency proof by replaying the RFC 6962 SUBPROOF decomposition.
 *
 * Instead of implementing the complex iterative verification algorithm,
 * we reconstruct both the earlier and later roots by replaying the same
 * recursive decomposition the prover used, consuming proof hashes where
 * the prover emitted them.
 */
function verifyConsistencyProof(
  proof: IConsistencyProof,
  earlierRoot: Checksum,
  laterRoot: Checksum,
): boolean {
  const m = proof.earlierSize;
  const n = proof.laterSize;

  if (m === 0) return true;
  if (m === n) return earlierRoot.equals(laterRoot);
  if (m > n) return false;

  const hashes = proof.hashes;
  let hashIdx = 0;

  /**
   * Replay SUBPROOF(subM, subN, startFromOldRoot).
   * Returns [oldSubRoot, newSubRoot] or null on error.
   * Consumes proof hashes in the same order buildConsistencyProof emits them.
   */
  function replay(
    subM: number,
    subN: number,
    startFromOldRoot: boolean,
  ): [Checksum, Checksum] | null {
    if (subM === subN) {
      if (!startFromOldRoot) {
        if (hashIdx >= hashes.length) return null;
        const h = hashes[hashIdx++];
        return [h, h];
      }
      // startFromOldRoot=true and subM===subN: hash omitted, verifier knows it
      // Return a sentinel — the caller must supply the earlierRoot
      return null;
    }

    let k = 1;
    while (k * 2 < subN) k *= 2;

    if (subM <= k) {
      const leftResult = replay(subM, k, startFromOldRoot);
      if (hashIdx >= hashes.length) return null;
      const rightHash = hashes[hashIdx++];

      if (leftResult === null) {
        // The left subtree was the old root (startFromOldRoot reached m==n)
        // Use earlierRoot as the old subtree root
        return [earlierRoot, hashPair(earlierRoot, rightHash)];
      }
      const [oldLeft, newLeft] = leftResult;
      return [oldLeft, hashPair(newLeft, rightHash)];
    } else {
      const rightResult = replay(subM - k, subN - k, false);
      if (rightResult === null) return null;
      if (hashIdx >= hashes.length) return null;
      const leftHash = hashes[hashIdx++];
      const [oldRight, newRight] = rightResult;
      return [hashPair(leftHash, oldRight), hashPair(leftHash, newRight)];
    }
  }

  const result = replay(m, n, true);
  if (result === null) return false;
  if (hashIdx !== hashes.length) return false;

  const [computedOldRoot, computedNewRoot] = result;
  return computedOldRoot.equals(earlierRoot) && computedNewRoot.equals(laterRoot);
}

/**
 * Compute the Merkle root for a subset of leaves using RFC 6962 decomposition.
 */
function computeSubtreeRoot(leaves: Checksum[]): Checksum {
  const n = leaves.length;
  if (n === 0) return cs.calculateChecksum(new Uint8Array(0));
  if (n === 1) return leaves[0];
  let k = 1;
  while (k * 2 < n) k *= 2;
  const left = computeSubtreeRoot(leaves.slice(0, k));
  const right = computeSubtreeRoot(leaves.slice(k));
  return hashPair(left, right);
}

/**
 * Compute the depth of a leaf at the given index in an RFC 6962 tree of size n.
 */
function rfc6962LeafDepth(n: number, index: number): number {
  if (n <= 1) return 0;
  let k = 1;
  while (k * 2 < n) k *= 2;
  if (index < k) {
    return 1 + rfc6962LeafDepth(k, index);
  } else {
    return 1 + rfc6962LeafDepth(n - k, index - k);
  }
}

/**
 * Population count: number of 1-bits in the binary representation of n.
 */
function popcount(n: number): number {
  let count = 0;
  while (n > 0) {
    count += n & 1;
    n >>>= 1;
  }
  return count;
}

// ── Property Tests ───────────────────────────────────────────────────

describe('IncrementalMerkleTree PBT', () => {
  /**
   * Property 1: Incremental vs Batch Root Equivalence
   *
   * For any list of N SHA3-512 hashes (N >= 0), building an IncrementalMerkleTree
   * by appending hashes one at a time should produce the same Merkle root as
   * constructing the tree from the complete list via fromLeaves().
   *
   * **Validates: Requirements 2.3, 2.4**
   */
  it('Property 1: Incremental vs Batch Root Equivalence', () => {
    fc.assert(
      fc.property(
        fc.array(arbChecksum(), { minLength: 0, maxLength: 50 }),
        (leaves) => {
          const incremental = new IncrementalMerkleTree(cs);
          for (const leaf of leaves) {
            incremental.append(leaf);
          }
          const batch = IncrementalMerkleTree.fromLeaves(leaves, cs);
          expect(incremental.root.equals(batch.root)).toBe(true);
          expect(incremental.size).toBe(batch.size);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2: Inclusion Proof Verification Round-Trip
   *
   * For any IncrementalMerkleTree with N >= 1 leaves and for any valid leaf
   * index i (0 <= i < N), generating an inclusion proof via getInclusionProof(i)
   * and then verifying it should return a positive verification result.
   *
   * **Validates: Requirements 3.1, 3.4, 4.1, 4.2**
   */
  it('Property 2: Inclusion Proof Verification Round-Trip', () => {
    fc.assert(
      fc.property(
        arbLeafHashes(50).chain((leaves) =>
          fc.record({
            leaves: fc.constant(leaves),
            index: fc.integer({ min: 0, max: leaves.length - 1 }),
          }),
        ),
        ({ leaves, index }) => {
          const tree = IncrementalMerkleTree.fromLeaves(leaves, cs);
          const proof = tree.getInclusionProof(index);
          const result = verifyInclusionProof(proof, tree.root);
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3: Inclusion Proof Path Length
   *
   * For any tree with N >= 1 leaves, proof path length equals the depth of
   * the leaf in the RFC 6962 binary decomposition, which is at most
   * ceil(log2(N)), or 0 when N = 1.
   *
   * **Validates: Requirements 3.2**
   */
  it('Property 3: Inclusion Proof Path Length', () => {
    fc.assert(
      fc.property(
        arbLeafHashes(50).chain((leaves) =>
          fc.record({
            leaves: fc.constant(leaves),
            index: fc.integer({ min: 0, max: leaves.length - 1 }),
          }),
        ),
        ({ leaves, index }) => {
          const tree = IncrementalMerkleTree.fromLeaves(leaves, cs);
          const proof = tree.getInclusionProof(index);
          const n = leaves.length;

          const expectedLength = rfc6962LeafDepth(n, index);
          expect(proof.path.length).toBe(expectedLength);

          if (n > 1) {
            expect(proof.path.length).toBeLessThanOrEqual(
              Math.ceil(Math.log2(n)),
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4: Inclusion Proof Rejects Wrong Root
   *
   * For any valid proof and any different root, verification returns negative.
   *
   * **Validates: Requirements 4.3**
   */
  it('Property 4: Inclusion Proof Rejects Wrong Root', () => {
    fc.assert(
      fc.property(
        arbLeafHashes(50).chain((leaves) =>
          fc.record({
            leaves: fc.constant(leaves),
            index: fc.integer({ min: 0, max: leaves.length - 1 }),
            wrongRoot: arbChecksum(),
          }),
        ),
        ({ leaves, index, wrongRoot }) => {
          const tree = IncrementalMerkleTree.fromLeaves(leaves, cs);
          const proof = tree.getInclusionProof(index);

          if (!wrongRoot.equals(tree.root)) {
            const result = verifyInclusionProof(proof, wrongRoot);
            expect(result).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5: Consistency Proof Verification Round-Trip
   *
   * For any tree with N >= 1 and any M where 1 <= M <= N, consistency proof
   * verifies positively.
   *
   * **Validates: Requirements 5.1, 6.1, 6.2**
   */
  it('Property 5: Consistency Proof Verification Round-Trip', () => {
    fc.assert(
      fc.property(
        arbLeafHashes(50).chain((leaves) =>
          fc.record({
            leaves: fc.constant(leaves),
            earlierSize: fc.integer({ min: 1, max: leaves.length }),
          }),
        ),
        ({ leaves, earlierSize }) => {
          const tree = IncrementalMerkleTree.fromLeaves(leaves, cs);
          const proof = tree.getConsistencyProof(earlierSize);

          const earlierRoot = computeSubtreeRoot(leaves.slice(0, earlierSize));
          const laterRoot = tree.root;

          if (earlierSize === leaves.length) {
            expect(proof.hashes.length).toBe(0);
            expect(earlierRoot.equals(laterRoot)).toBe(true);
            return;
          }

          const result = verifyConsistencyProof(proof, earlierRoot, laterRoot);
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6: Consistency Proof Rejects Tampered Root
   *
   * For any valid consistency proof, verification with a different later root
   * returns negative.
   *
   * **Validates: Requirements 6.3**
   */
  it('Property 6: Consistency Proof Rejects Tampered Root', () => {
    fc.assert(
      fc.property(
        fc
          .array(arbChecksum(), { minLength: 2, maxLength: 50 })
          .chain((leaves) =>
            fc.record({
              leaves: fc.constant(leaves),
              earlierSize: fc.integer({ min: 1, max: leaves.length - 1 }),
              wrongRoot: arbChecksum(),
            }),
          ),
        ({ leaves, earlierSize, wrongRoot }) => {
          const tree = IncrementalMerkleTree.fromLeaves(leaves, cs);
          const proof = tree.getConsistencyProof(earlierSize);
          const earlierRoot = computeSubtreeRoot(leaves.slice(0, earlierSize));

          if (!wrongRoot.equals(tree.root)) {
            const result = verifyConsistencyProof(proof, earlierRoot, wrongRoot);
            expect(result).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7: Frontier Persistence Round-Trip
   *
   * Extract frontier + size, restore via fromFrontier, verify same root;
   * append more leaves to both, verify still same root.
   *
   * **Validates: Requirements 8.1, 8.2**
   */
  it('Property 7: Frontier Persistence Round-Trip', () => {
    fc.assert(
      fc.property(
        arbLeafHashes(30),
        fc.array(arbChecksum(), { minLength: 1, maxLength: 20 }),
        (initialLeaves, additionalLeaves) => {
          const original = IncrementalMerkleTree.fromLeaves(initialLeaves, cs);

          const frontier = original.currentFrontier;
          const size = original.size;

          const restored = IncrementalMerkleTree.fromFrontier(
            frontier,
            size,
            cs,
          );

          expect(restored.root.equals(original.root)).toBe(true);
          expect(restored.size).toBe(original.size);

          for (const leaf of additionalLeaves) {
            original.append(leaf);
            restored.append(leaf);
          }

          expect(restored.root.equals(original.root)).toBe(true);
          expect(restored.size).toBe(original.size);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11: Frontier Size Bounded by Log N
   *
   * For any tree with N >= 1 leaves, frontier length equals popcount(N)
   * and is at most ceil(log2(N)) + 1.
   *
   * **Validates: Requirements 14.5**
   */
  it('Property 11: Frontier Size Bounded by Log N', () => {
    fc.assert(
      fc.property(arbLeafHashes(50), (leaves) => {
        const tree = IncrementalMerkleTree.fromLeaves(leaves, cs);
        const n = tree.size;
        const frontier = tree.currentFrontier;

        expect(frontier.length).toBe(popcount(n));

        const maxFrontierSize = Math.ceil(Math.log2(n)) + 1;
        expect(frontier.length).toBeLessThanOrEqual(maxFrontierSize);
      }),
      { numRuns: 100 },
    );
  });
});
