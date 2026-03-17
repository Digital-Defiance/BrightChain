/**
 * @fileoverview Merkle proof types for the blockchain ledger.
 *
 * Defines the direction enum, proof step interface, and inclusion proof
 * interface used by the IncrementalMerkleTree and proof verification logic.
 *
 * @see Design: Merkle Tree Commitment Layer — New Types
 * @see Requirements 3.1, 3.2, 4.1
 */

import { Checksum } from '../../types/checksum';

/**
 * Direction indicator for a sibling hash in a Merkle proof path.
 * LEFT means the sibling is on the left; the current hash is on the right.
 * RIGHT means the sibling is on the right; the current hash is on the left.
 */
export enum MerkleDirection {
  LEFT = 0,
  RIGHT = 1,
}

/**
 * A single step in a Merkle authentication path.
 */
export interface IMerkleProofStep {
  /** The sibling hash at this level. */
  readonly hash: Checksum;
  /** Whether the sibling is on the left or right. */
  readonly direction: MerkleDirection;
}

/**
 * An inclusion proof for a single leaf in the Merkle tree.
 */
export interface IMerkleProof {
  /** The leaf hash (entryHash of the ledger entry). */
  readonly leafHash: Checksum;
  /** Zero-based index of the leaf in the tree. */
  readonly leafIndex: number;
  /** Total number of leaves in the tree when the proof was generated. */
  readonly treeSize: number;
  /** Authentication path from leaf to root. */
  readonly path: readonly IMerkleProofStep[];
}
