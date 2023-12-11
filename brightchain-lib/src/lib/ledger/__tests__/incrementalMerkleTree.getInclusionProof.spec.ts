/**
 * Unit tests for IncrementalMerkleTree.getInclusionProof()
 *
 * Validates task 2.2: inclusion proof generation with correct structure,
 * error handling, and verification round-trip.
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 14.2
 */

import { LedgerError, LedgerErrorType } from '../../errors/ledgerError';
import { MerkleDirection } from '../../interfaces/ledger/merkleProof';
import { ChecksumService } from '../../services/checksum.service';
import { Checksum } from '../../types/checksum';
import { IncrementalMerkleTree } from '../incrementalMerkleTree';

describe('IncrementalMerkleTree.getInclusionProof', () => {
  let cs: ChecksumService;

  /** Helper: create a deterministic leaf hash from a single byte value. */
  function makeLeaf(val: number): Checksum {
    const data = new Uint8Array([val]);
    return cs.calculateChecksum(data);
  }

  /** Helper: hash two checksums together (same as tree internal node). */
  function hashPair(left: Checksum, right: Checksum): Checksum {
    const l = left.toUint8Array();
    const r = right.toUint8Array();
    const combined = new Uint8Array(l.length + r.length);
    combined.set(l, 0);
    combined.set(r, l.length);
    return cs.calculateChecksum(combined);
  }

  /** Helper: verify an inclusion proof by recomputing from leaf to root. */
  function verifyProof(
    leafHash: Checksum,
    path: readonly { hash: Checksum; direction: number }[],
    expectedRoot: Checksum,
  ): boolean {
    let current = leafHash;
    for (const step of path) {
      if (step.direction === MerkleDirection.LEFT) {
        current = hashPair(step.hash, current);
      } else {
        current = hashPair(current, step.hash);
      }
    }
    return current.equals(expectedRoot);
  }

  beforeEach(() => {
    cs = new ChecksumService();
  });

  // ── Error handling ──────────────────────────────────────────────────

  it('should throw MerkleProofFailed for empty tree', () => {
    const tree = new IncrementalMerkleTree(cs);
    expect(() => tree.getInclusionProof(0)).toThrow(LedgerError);
    try {
      tree.getInclusionProof(0);
    } catch (e) {
      expect((e as LedgerError).errorType).toBe(
        LedgerErrorType.MerkleProofFailed,
      );
    }
  });

  it('should throw MerkleProofFailed for negative index', () => {
    const tree = new IncrementalMerkleTree(cs);
    tree.append(makeLeaf(1));
    expect(() => tree.getInclusionProof(-1)).toThrow(LedgerError);
  });

  it('should throw MerkleProofFailed for index >= size', () => {
    const tree = new IncrementalMerkleTree(cs);
    tree.append(makeLeaf(1));
    expect(() => tree.getInclusionProof(1)).toThrow(LedgerError);
  });

  // ── Single leaf (N=1): path length = 0 ─────────────────────────────

  it('should return empty path for single-leaf tree', () => {
    const tree = new IncrementalMerkleTree(cs);
    const leaf = makeLeaf(42);
    tree.append(leaf);

    const proof = tree.getInclusionProof(0);
    expect(proof.leafHash.equals(leaf)).toBe(true);
    expect(proof.leafIndex).toBe(0);
    expect(proof.treeSize).toBe(1);
    expect(proof.path.length).toBe(0);
  });

  // ── Two leaves (N=2): path length = ceil(log2(2)) = 1 ──────────────

  it('should return path of length 1 for two-leaf tree', () => {
    const tree = new IncrementalMerkleTree(cs);
    const a = makeLeaf(1);
    const b = makeLeaf(2);
    tree.append(a);
    tree.append(b);

    const proof0 = tree.getInclusionProof(0);
    expect(proof0.path.length).toBe(1);
    expect(proof0.path[0].hash.equals(b)).toBe(true);
    expect(proof0.path[0].direction).toBe(MerkleDirection.RIGHT);
    expect(verifyProof(a, proof0.path, tree.root)).toBe(true);

    const proof1 = tree.getInclusionProof(1);
    expect(proof1.path.length).toBe(1);
    expect(proof1.path[0].hash.equals(a)).toBe(true);
    expect(proof1.path[0].direction).toBe(MerkleDirection.LEFT);
    expect(verifyProof(b, proof1.path, tree.root)).toBe(true);
  });

  // ── Four leaves (N=4): path length = ceil(log2(4)) = 2 ─────────────

  it('should return path of length 2 for four-leaf tree and verify all proofs', () => {
    const tree = new IncrementalMerkleTree(cs);
    const leaves = [makeLeaf(1), makeLeaf(2), makeLeaf(3), makeLeaf(4)];
    leaves.forEach((l) => tree.append(l));

    for (let i = 0; i < 4; i++) {
      const proof = tree.getInclusionProof(i);
      expect(proof.path.length).toBe(2);
      expect(proof.leafIndex).toBe(i);
      expect(proof.treeSize).toBe(4);
      expect(verifyProof(leaves[i], proof.path, tree.root)).toBe(true);
    }
  });

  // ── Three leaves (N=3): RFC 6962 decomposition ─────────────────────

  it('should produce verifiable proofs for three-leaf tree', () => {
    const tree = new IncrementalMerkleTree(cs);
    const leaves = [makeLeaf(10), makeLeaf(20), makeLeaf(30)];
    leaves.forEach((l) => tree.append(l));

    for (let i = 0; i < 3; i++) {
      const proof = tree.getInclusionProof(i);
      expect(proof.treeSize).toBe(3);
      expect(proof.leafIndex).toBe(i);
      expect(verifyProof(leaves[i], proof.path, tree.root)).toBe(true);
    }
  });

  // ── Seven leaves (N=7): non-power-of-2 ─────────────────────────────

  it('should produce verifiable proofs for seven-leaf tree', () => {
    const tree = new IncrementalMerkleTree(cs);
    const leaves = Array.from({ length: 7 }, (_, i) => makeLeaf(i));
    leaves.forEach((l) => tree.append(l));

    for (let i = 0; i < 7; i++) {
      const proof = tree.getInclusionProof(i);
      expect(proof.treeSize).toBe(7);
      expect(verifyProof(leaves[i], proof.path, tree.root)).toBe(true);
    }
  });

  // ── Eight leaves (N=8): power-of-2, path length = 3 ────────────────

  it('should return path of length 3 for eight-leaf tree', () => {
    const tree = new IncrementalMerkleTree(cs);
    const leaves = Array.from({ length: 8 }, (_, i) => makeLeaf(i));
    leaves.forEach((l) => tree.append(l));

    for (let i = 0; i < 8; i++) {
      const proof = tree.getInclusionProof(i);
      expect(proof.path.length).toBe(3);
      expect(verifyProof(leaves[i], proof.path, tree.root)).toBe(true);
    }
  });

  // ── Proof fields are correct ────────────────────────────────────────

  it('should set leafHash, leafIndex, and treeSize correctly', () => {
    const tree = new IncrementalMerkleTree(cs);
    const leaves = Array.from({ length: 5 }, (_, i) => makeLeaf(i + 100));
    leaves.forEach((l) => tree.append(l));

    const proof = tree.getInclusionProof(3);
    expect(proof.leafHash.equals(leaves[3])).toBe(true);
    expect(proof.leafIndex).toBe(3);
    expect(proof.treeSize).toBe(5);
  });
});
