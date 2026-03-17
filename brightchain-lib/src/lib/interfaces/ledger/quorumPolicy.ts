/**
 * @fileoverview Quorum policy types for the blockchain ledger governance.
 *
 * Defines configurable quorum policies: unanimous (all admins),
 * majority (>50% of admins), or threshold (at least N admins).
 *
 * @see Requirements 14.1
 */

export enum QuorumType {
  Unanimous = 'unanimous',
  Majority = 'majority',
  Threshold = 'threshold',
}

export interface IQuorumPolicy {
  readonly type: QuorumType;
  /** Only used when type === QuorumType.Threshold. Must be >= 1. */
  readonly threshold?: number;
}
