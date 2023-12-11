/**
 * @fileoverview Consistency proof interface for the blockchain ledger Merkle tree.
 *
 * Defines the consistency proof used to verify that an earlier ledger state
 * is a prefix of the current state (append-only auditing).
 *
 * @see Design: Merkle Tree Commitment Layer — New Types
 * @see Requirements 5.1, 6.1
 */

import { Checksum } from '../../types/checksum';

/**
 * A consistency proof between two tree states.
 */
export interface IConsistencyProof {
  /** Number of leaves in the earlier tree state. */
  readonly earlierSize: number;
  /** Number of leaves in the later tree state. */
  readonly laterSize: number;
  /** Intermediate hashes needed to verify consistency. */
  readonly hashes: readonly Checksum[];
}
