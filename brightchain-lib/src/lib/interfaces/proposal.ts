/**
 * @fileoverview Proposal and ProposalInput interfaces.
 *
 * Defines the structure of quorum proposals and their input format.
 *
 * @see Requirements 5, 7, 11, 13
 */

import { PlatformID, ShortHexGuid } from '@digitaldefiance/ecies-lib';
import { ProposalActionType } from '../enumerations/proposalActionType';
import { ProposalStatus } from '../enumerations/proposalStatus';

/**
 * A structured request submitted to quorum members for deliberation and voting.
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface Proposal<TID extends PlatformID = Uint8Array> {
  /** Unique proposal identifier */
  id: ShortHexGuid;
  /** Human-readable description, max 4096 characters */
  description: string;
  /** The type of action this proposal triggers on approval */
  actionType: ProposalActionType;
  /** Machine-readable action payload */
  actionPayload: Record<string, unknown>;
  /** ID of the member who submitted the proposal */
  proposerMemberId: ShortHexGuid;
  /** Current lifecycle status */
  status: ProposalStatus;
  /** Number of approve votes required for approval */
  requiredThreshold: number;
  /** Timestamp after which the proposal expires */
  expiresAt: Date;
  /** Timestamp of proposal creation */
  createdAt: Date;
  /** Optional CBL reference for supporting documentation */
  attachmentCblId?: string;
  /** Epoch number at proposal creation */
  epochNumber: number;
  /** Generic marker for DTO compatibility */
  _platformId?: TID;
}

/**
 * Input format for submitting a new proposal.
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface ProposalInput<TID extends PlatformID = Uint8Array> {
  /** Human-readable description */
  description: string;
  /** The type of action this proposal triggers on approval */
  actionType: ProposalActionType;
  /** Machine-readable action payload */
  actionPayload: Record<string, unknown>;
  /** Timestamp after which the proposal expires */
  expiresAt: Date;
  /** Optional CBL reference for supporting documentation */
  attachmentCblId?: string;
  /** Generic marker for DTO compatibility */
  _platformId?: TID;
}
