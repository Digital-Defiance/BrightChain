/**
 * @fileoverview Proposal status enumeration.
 *
 * Defines the lifecycle states of a quorum proposal.
 *
 * @see Requirements 5, 7
 */

export enum ProposalStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  Expired = 'expired',
}
