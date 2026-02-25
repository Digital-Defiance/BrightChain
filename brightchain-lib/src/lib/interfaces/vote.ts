/**
 * @fileoverview Vote and VoteInput interfaces.
 *
 * Defines the structure of quorum votes and their input format.
 *
 * @see Requirements 6, 7
 */

import { PlatformID, ShortHexGuid } from '@digitaldefiance/ecies-lib';

/**
 * A quorum member's response to a Proposal.
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface Vote<TID extends PlatformID = Uint8Array> {
  /** ID of the proposal being voted on */
  proposalId: ShortHexGuid;
  /** ID of the voting member */
  voterMemberId: ShortHexGuid;
  /** Vote decision */
  decision: 'approve' | 'reject';
  /** Optional comment, max 1024 characters */
  comment?: string;
  /** ECIES-encrypted share to proposer's public key, present only on approve */
  encryptedShare?: Uint8Array;
  /** Timestamp of vote creation */
  createdAt: Date;
  /** Generic marker for DTO compatibility */
  _platformId?: TID;
}

/**
 * Input format for submitting a vote.
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface VoteInput<TID extends PlatformID = Uint8Array> {
  /** ID of the proposal being voted on */
  proposalId: ShortHexGuid;
  /** ID of the voting member (optional — defaults to local node member) */
  voterMemberId?: ShortHexGuid;
  /** Vote decision */
  decision: 'approve' | 'reject';
  /** Optional comment */
  comment?: string;
  /** Generic marker for DTO compatibility */
  _platformId?: TID;
}
