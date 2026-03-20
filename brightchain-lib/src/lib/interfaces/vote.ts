/**
 * @fileoverview Vote and VoteInput interfaces.
 *
 * Defines the structure of BrightTrust votes and their input format.
 *
 * @see Requirements 6, 7
 */

import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * A BrightTrust member's response to a Proposal.
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface Vote<TID extends PlatformID = Uint8Array> {
  /** ID of the proposal being voted on */
  proposalId: TID;
  /** ID of the voting member */
  voterMemberId: TID;
  /** Vote decision */
  decision: 'approve' | 'reject';
  /** Optional comment, max 1024 characters */
  comment?: string;
  /** ECIES-encrypted share to proposer's public key, present only on approve */
  encryptedShare?: Uint8Array;
  /** Digital signature of the vote for ban record attestation */
  signature?: Uint8Array;
  /** Timestamp of vote creation */
  createdAt: Date;
}

/**
 * Input format for submitting a vote.
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface VoteInput<TID extends PlatformID = Uint8Array> {
  /** ID of the proposal being voted on */
  proposalId: TID;
  /** ID of the voting member (optional — defaults to local node member) */
  voterMemberId?: TID;
  /** Vote decision */
  decision: 'approve' | 'reject';
  /** Optional comment */
  comment?: string;
}
