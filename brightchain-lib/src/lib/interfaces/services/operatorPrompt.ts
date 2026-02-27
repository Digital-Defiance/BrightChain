/**
 * @fileoverview IOperatorPrompt interface with ProposalDisplay and OperatorVoteResult.
 *
 * Interface for physical operator interaction during quorum voting.
 * Implementations live in brightchain-api-lib (CLI) or brightchain-react (web UI).
 *
 * @see Requirements 6
 */

import { HexString } from '@digitaldefiance/ecies-lib';
import { ProposalActionType } from '../../enumerations/proposalActionType';

/**
 * Display format for presenting a proposal to the operator for voting.
 */
export interface ProposalDisplay {
  /** Unique proposal identifier */
  proposalId: HexString;
  /** Human-readable proposal description */
  description: string;
  /** The type of action this proposal triggers */
  actionType: ProposalActionType;
  /** Machine-readable action payload */
  actionPayload: Record<string, unknown>;
  /** ID of the member who submitted the proposal */
  proposerMemberId: HexString;
  /** Timestamp after which the proposal expires */
  expiresAt: Date;
  /** Optional CBL reference for attached documentation */
  attachmentCblId?: string;
  /** Pre-fetched CBL content for operator review */
  attachmentContent?: Uint8Array;
}

/**
 * Result of an operator's vote on a proposal.
 */
export interface OperatorVoteResult {
  /** The operator's vote decision */
  decision: 'approve' | 'reject';
  /** Optional comment from the operator */
  comment?: string;
  /** Password for private key decryption, present only on approve */
  password?: string;
}

/**
 * Interface for physical operator interaction during quorum voting.
 *
 * No code path may release share material without going through this interface.
 * Implementations must present the full proposal description and any attachment
 * info, and require authentication on approve votes.
 */
export interface IOperatorPrompt {
  /**
   * Present a proposal to the operator and collect their vote.
   * Must display the full proposal description and any attachment info.
   * Returns the vote decision and, if approved, the authenticated password.
   * @param proposal - The proposal display information
   * @returns The operator's vote result
   */
  promptForVote(proposal: ProposalDisplay): Promise<OperatorVoteResult>;

  /**
   * Check if the voting interface is locked for a given proposal.
   * Voting is locked after 3 consecutive failed authentication attempts
   * for a configurable cooldown period (default 300 seconds).
   * @param proposalId - The proposal ID to check
   * @returns True if voting is locked for this proposal
   */
  isLocked(proposalId: HexString): boolean;
}
