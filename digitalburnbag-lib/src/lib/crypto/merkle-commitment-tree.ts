import { sha3_512 } from '@noble/hashes/sha3';
import { ChainVerificationError, TreeDepthError } from '../errors';
import type {
  IMerkleProof,
  IMerkleTree,
  ITreeVerificationResult,
} from '../interfaces';

const MIN_DEPTH = 8;
const DEFAULT_DEPTH = 10;

/** Encode a number as a big-endian 32-bit Uint8Array. */
function bigEndian32(n: number): Uint8Array {
  const buf = new Uint8Array(4);
  const view = new DataView(buf.buffer);
  view.setUint32(0, n, false);
  return buf;
}

/** Concatenate two Uint8Arrays. */
function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/** Constant-time comparison of two Uint8Arrays. */
function equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function validateDepth(depth: number): void {
  if (depth < MIN_DEPTH) {
    throw new TreeDepthError(depth);
  }
}

/**
 * SHA3-512 Merkle commitment tree.
 *
 * Leaf derivation: leaf[i] = SHA3-512(treeSeed || bigEndian32(i))
 * Internal nodes: SHA3-512(left || right)
 *
 * Validates: Requirements 1.2, 2.1–2.7, 24.2
 */
export class MerkleCommitmentTree {
  /** Derive all leaves from seed and build the full Merkle tree. */
  static build(
    treeSeed: Uint8Array,
    depth: number = DEFAULT_DEPTH,
  ): IMerkleTree {
    validateDepth(depth);
    const leafCount = 1 << depth; // 2^D
    const leaves: Uint8Array[] = new Array(leafCount);

    for (let i = 0; i < leafCount; i++) {
      leaves[i] = sha3_512(concat(treeSeed, bigEndian32(i)));
    }

    // Build tree bottom-up. Store all levels for allNodes().
    // levels[0] = leaves, levels[depth] = [root]
    const levels: Uint8Array[][] = [leaves];
    let current = leaves;
    for (let d = 0; d < depth; d++) {
      const next: Uint8Array[] = new Array(current.length >> 1);
      for (let i = 0; i < next.length; i++) {
        next[i] = sha3_512(concat(current[2 * i], current[2 * i + 1]));
      }
      levels.push(next);
      current = next;
    }

    const root = current[0];

    return {
      root,
      leaves,
      depth,
      allNodes(): Uint8Array[] {
        const nodes: Uint8Array[] = [];
        for (const level of levels) {
          for (const node of level) {
            nodes.push(node);
          }
        }
        return nodes;
      },
    };
  }

  /** Compute only the Merkle root (memory-efficient for verification). */
  static computeRoot(
    treeSeed: Uint8Array,
    depth: number = DEFAULT_DEPTH,
  ): Uint8Array {
    validateDepth(depth);
    const leafCount = 1 << depth;
    let current: Uint8Array[] = new Array(leafCount);

    for (let i = 0; i < leafCount; i++) {
      current[i] = sha3_512(concat(treeSeed, bigEndian32(i)));
    }

    for (let d = 0; d < depth; d++) {
      const next: Uint8Array[] = new Array(current.length >> 1);
      for (let i = 0; i < next.length; i++) {
        next[i] = sha3_512(concat(current[2 * i], current[2 * i + 1]));
      }
      current = next;
    }

    return current[0];
  }

  /** Verify that a candidate seed produces the expected Merkle root. */
  static verify(
    candidateSeed: Uint8Array,
    expectedRoot: Uint8Array,
    depth: number = DEFAULT_DEPTH,
  ): ITreeVerificationResult {
    try {
      validateDepth(depth);
    } catch (e) {
      return { valid: false, error: (e as Error).message };
    }
    const computed = MerkleCommitmentTree.computeRoot(candidateSeed, depth);
    if (equal(computed, expectedRoot)) {
      return { valid: true };
    }
    return { valid: false, error: 'Merkle root mismatch' };
  }

  /** Generate a Merkle proof (authentication path) for a specific leaf index. */
  static generateProof(tree: IMerkleTree, leafIndex: number): IMerkleProof {
    if (leafIndex < 0 || leafIndex >= tree.leaves.length) {
      throw new ChainVerificationError(
        `Leaf index ${leafIndex} out of range [0, ${tree.leaves.length})`,
      );
    }

    const siblings: Uint8Array[] = [];
    const directions: boolean[] = [];

    // Rebuild levels to walk the proof path
    const _leafCount = tree.leaves.length;
    let current: Uint8Array[] = tree.leaves;
    let idx = leafIndex;

    for (let d = 0; d < tree.depth; d++) {
      const siblingIdx = idx ^ 1; // flip last bit
      siblings.push(current[siblingIdx]);
      directions.push((idx & 1) === 0); // true = sibling is on the right
      // Move up
      const next: Uint8Array[] = new Array(current.length >> 1);
      for (let i = 0; i < next.length; i++) {
        next[i] = sha3_512(concat(current[2 * i], current[2 * i + 1]));
      }
      current = next;
      idx = idx >> 1;
    }

    return {
      leafValue: tree.leaves[leafIndex],
      leafIndex,
      siblings,
      directions,
    };
  }

  /** Verify a Merkle proof against a known root. */
  static verifyProof(proof: IMerkleProof, expectedRoot: Uint8Array): boolean {
    let hash = proof.leafValue;
    for (let i = 0; i < proof.siblings.length; i++) {
      if (proof.directions[i]) {
        // sibling is on the right
        hash = sha3_512(concat(hash, proof.siblings[i]));
      } else {
        // sibling is on the left
        hash = sha3_512(concat(proof.siblings[i], hash));
      }
    }
    return equal(hash, expectedRoot);
  }
}
