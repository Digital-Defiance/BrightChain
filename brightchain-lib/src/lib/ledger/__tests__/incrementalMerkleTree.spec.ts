/**
 * Unit tests for IncrementalMerkleTree — core tree operations.
 *
 * Covers: root computation, append, frontier, consistency proofs, static methods.
 * The companion file incrementalMerkleTree.getInclusionProof.spec.ts covers
 * inclusion proof generation.
 *
 * @see Requirements 1.4, 1.5, 3.3, 5.2, 5.3, 5.4, 8.3
 */

import { LedgerError, LedgerErrorType } from '../../errors/ledgerError';
import { ChecksumService } from '../../services/checksum.service';
import { Checksum } from '../../types/checksum';
import { IncrementalMerkleTree } from '../incrementalMerkleTree';

describe('IncrementalMerkleTree', () => {
  let cs: ChecksumService;

  /** Helper: create a deterministic leaf hash from a single byte value. */
  function makeLeaf(val: number): Checksum {
    return cs.calculateChecksum(new Uint8Array([val]));
  }

  /** Helper: SHA3-512(left || right). */
  function hashPair(left: Checksum, right: Checksum): Checksum {
    const l = left.toUint8Array();
    const r = right.toUint8Array();
    const combined = new Uint8Array(l.length + r.length);
    combined.set(l, 0);
    combined.set(r, l.length);
    return cs.calculateChecksum(combined);
  }

  beforeEach(() => {
    cs = new ChecksumService();
  });

  // ── Empty tree root ─────────────────────────────────────────────────

  describe('empty tree', () => {
    it('root should equal SHA3-512 of empty bytes (Req 1.4)', () => {
      const tree = new IncrementalMerkleTree(cs);
      const expectedRoot = cs.calculateChecksum(new Uint8Array(0));
      expect(tree.root.equals(expectedRoot)).toBe(true);
      expect(tree.size).toBe(0);
    });
  });

  // ── Single-leaf tree ────────────────────────────────────────────────

  describe('single-leaf tree', () => {
    it('root should equal the leaf hash (Req 1.5)', () => {
      const tree = new IncrementalMerkleTree(cs);
      const leaf = makeLeaf(42);
      tree.append(leaf);
      expect(tree.root.equals(leaf)).toBe(true);
      expect(tree.size).toBe(1);
    });
  });

  // ── Known vectors ───────────────────────────────────────────────────

  describe('known vectors for root computation', () => {
    it('2 leaves: root = SHA3-512(leaf0 || leaf1)', () => {
      const l0 = makeLeaf(0);
      const l1 = makeLeaf(1);
      const expected = hashPair(l0, l1);

      const tree = new IncrementalMerkleTree(cs);
      tree.append(l0);
      tree.append(l1);
      expect(tree.root.equals(expected)).toBe(true);
    });

    it('3 leaves: root = SHA3-512(SHA3-512(leaf0 || leaf1) || leaf2)', () => {
      const l0 = makeLeaf(0);
      const l1 = makeLeaf(1);
      const l2 = makeLeaf(2);
      const expected = hashPair(hashPair(l0, l1), l2);

      const tree = new IncrementalMerkleTree(cs);
      tree.append(l0);
      tree.append(l1);
      tree.append(l2);
      expect(tree.root.equals(expected)).toBe(true);
    });

    it('4 leaves: root = SHA3-512(SHA3-512(l0||l1) || SHA3-512(l2||l3))', () => {
      const l0 = makeLeaf(0);
      const l1 = makeLeaf(1);
      const l2 = makeLeaf(2);
      const l3 = makeLeaf(3);
      const expected = hashPair(hashPair(l0, l1), hashPair(l2, l3));

      const tree = new IncrementalMerkleTree(cs);
      [l0, l1, l2, l3].forEach((l) => tree.append(l));
      expect(tree.root.equals(expected)).toBe(true);
    });

    it('7 leaves: root matches manual RFC 6962 decomposition', () => {
      // 7 = 4 + 2 + 1
      // Tree structure (RFC 6962 decomposition, k = largest power of 2 < n):
      //   root = H(H(H(l0,l1), H(l2,l3)), H(H(l4,l5), l6))
      const leaves = Array.from({ length: 7 }, (_, i) => makeLeaf(i));
      const [l0, l1, l2, l3, l4, l5, l6] = leaves;

      const h01 = hashPair(l0, l1);
      const h23 = hashPair(l2, l3);
      const h0123 = hashPair(h01, h23);
      const h45 = hashPair(l4, l5);
      const h456 = hashPair(h45, l6);
      const expected = hashPair(h0123, h456);

      const tree = new IncrementalMerkleTree(cs);
      leaves.forEach((l) => tree.append(l));
      expect(tree.root.equals(expected)).toBe(true);
    });

    it('8 leaves: root = H(H(H(l0,l1),H(l2,l3)), H(H(l4,l5),H(l6,l7)))', () => {
      const leaves = Array.from({ length: 8 }, (_, i) => makeLeaf(i));
      const [l0, l1, l2, l3, l4, l5, l6, l7] = leaves;

      const h01 = hashPair(l0, l1);
      const h23 = hashPair(l2, l3);
      const h45 = hashPair(l4, l5);
      const h67 = hashPair(l6, l7);
      const h0123 = hashPair(h01, h23);
      const h4567 = hashPair(h45, h67);
      const expected = hashPair(h0123, h4567);

      const tree = new IncrementalMerkleTree(cs);
      leaves.forEach((l) => tree.append(l));
      expect(tree.root.equals(expected)).toBe(true);
    });
  });

  // ── Out-of-range proof request ──────────────────────────────────────

  describe('out-of-range proof request (Req 3.3)', () => {
    it('should throw MerkleProofFailed for index out of range', () => {
      const tree = new IncrementalMerkleTree(cs);
      tree.append(makeLeaf(1));
      tree.append(makeLeaf(2));

      expect(() => tree.getInclusionProof(2)).toThrow(LedgerError);
      expect(() => tree.getInclusionProof(-1)).toThrow(LedgerError);

      try {
        tree.getInclusionProof(5);
      } catch (e) {
        expect((e as LedgerError).errorType).toBe(
          LedgerErrorType.MerkleProofFailed,
        );
      }
    });
  });

  // ── Consistency proof: M=0 returns empty (Req 5.2) ─────────────────

  describe('consistency proof with M=0 (Req 5.2)', () => {
    it('should return empty proof', () => {
      const tree = new IncrementalMerkleTree(cs);
      tree.append(makeLeaf(1));
      tree.append(makeLeaf(2));

      const proof = tree.getConsistencyProof(0);
      expect(proof.earlierSize).toBe(0);
      expect(proof.laterSize).toBe(2);
      expect(proof.hashes.length).toBe(0);
    });
  });

  // ── Consistency proof: M>N throws (Req 5.3) ────────────────────────

  describe('consistency proof with M>N (Req 5.3)', () => {
    it('should throw ConsistencyProofFailed', () => {
      const tree = new IncrementalMerkleTree(cs);
      tree.append(makeLeaf(1));

      expect(() => tree.getConsistencyProof(2)).toThrow(LedgerError);

      try {
        tree.getConsistencyProof(5);
      } catch (e) {
        expect((e as LedgerError).errorType).toBe(
          LedgerErrorType.ConsistencyProofFailed,
        );
      }
    });
  });

  // ── Consistency proof: M=N returns empty (Req 5.4) ─────────────────

  describe('consistency proof with M=N (Req 5.4)', () => {
    it('should return empty proof', () => {
      const tree = new IncrementalMerkleTree(cs);
      tree.append(makeLeaf(1));
      tree.append(makeLeaf(2));
      tree.append(makeLeaf(3));

      const proof = tree.getConsistencyProof(3);
      expect(proof.earlierSize).toBe(3);
      expect(proof.laterSize).toBe(3);
      expect(proof.hashes.length).toBe(0);
    });
  });

  // ── Frontier restoration failure scenario (Req 8.3) ────────────────

  describe('frontier restoration failure scenario (Req 8.3)', () => {
    it('fromFrontier with wrong frontier produces different root', () => {
      const tree = new IncrementalMerkleTree(cs);
      tree.append(makeLeaf(1));
      tree.append(makeLeaf(2));
      tree.append(makeLeaf(3));

      const correctRoot = tree.root;
      const correctFrontier = tree.currentFrontier;

      // Create a wrong frontier by replacing the first hash with a different one
      const wrongFrontier = [...correctFrontier];
      wrongFrontier[0] = makeLeaf(99);

      const restoredWrong = IncrementalMerkleTree.fromFrontier(
        wrongFrontier,
        tree.size,
        cs,
      );

      // The wrong frontier should produce a different root
      expect(restoredWrong.root.equals(correctRoot)).toBe(false);
    });
  });

  // ── fromLeaves produces same root as sequential appends ─────────────

  describe('fromLeaves equivalence', () => {
    it('should produce the same root as sequential appends', () => {
      const leaves = Array.from({ length: 10 }, (_, i) => makeLeaf(i));

      // Build incrementally
      const incremental = new IncrementalMerkleTree(cs);
      leaves.forEach((l) => incremental.append(l));

      // Build from batch
      const batch = IncrementalMerkleTree.fromLeaves(leaves, cs);

      expect(batch.root.equals(incremental.root)).toBe(true);
      expect(batch.size).toBe(incremental.size);
    });
  });

  // ── fromFrontier restores correct root ──────────────────────────────

  describe('fromFrontier restoration', () => {
    it('should restore the correct root from frontier', () => {
      const tree = new IncrementalMerkleTree(cs);
      const leaves = Array.from({ length: 5 }, (_, i) => makeLeaf(i + 10));
      leaves.forEach((l) => tree.append(l));

      const frontier = tree.currentFrontier;
      const size = tree.size;
      const originalRoot = tree.root;

      const restored = IncrementalMerkleTree.fromFrontier(frontier, size, cs);
      expect(restored.root.equals(originalRoot)).toBe(true);
      expect(restored.size).toBe(size);
    });
  });

  // ── computeRoot static method ───────────────────────────────────────

  describe('computeRoot static method', () => {
    it('should return correct root for empty leaves', () => {
      const root = IncrementalMerkleTree.computeRoot([], cs);
      const expected = cs.calculateChecksum(new Uint8Array(0));
      expect(root.equals(expected)).toBe(true);
    });

    it('should return the leaf hash for a single leaf', () => {
      const leaf = makeLeaf(77);
      const root = IncrementalMerkleTree.computeRoot([leaf], cs);
      expect(root.equals(leaf)).toBe(true);
    });

    it('should return the same root as a tree built via append', () => {
      const leaves = Array.from({ length: 6 }, (_, i) => makeLeaf(i + 20));
      const tree = new IncrementalMerkleTree(cs);
      leaves.forEach((l) => tree.append(l));

      const computedRoot = IncrementalMerkleTree.computeRoot(leaves, cs);
      expect(computedRoot.equals(tree.root)).toBe(true);
    });
  });
});
