/**
 * @fileoverview Proposal and ProposalInput interfaces.
 *
 * Defines the structure of BrightTrust proposals and their input format.
 *
 * @see Requirements 5, 7, 11, 13
 */

import { PlatformID } from '@digitaldefiance/ecies-lib';
import { ProposalActionType } from '../enumerations/proposalActionType';
import { ProposalStatus } from '../enumerations/proposalStatus';

/**
 * A structured request submitted to BrightTrust members for deliberation and voting.
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface Proposal<TID extends PlatformID = Uint8Array> {
  /** Unique proposal identifier */
  id: TID;
  /** Human-readable description, max 4096 characters */
  description: string;
  /** The type of action this proposal triggers on approval */
  actionType: ProposalActionType;
  /** Machine-readable action payload */
  actionPayload: Record<string, unknown>;
  /** ID of the member who submitted the proposal */
  proposerMemberId: TID;
  /** Current lifecycle status */
  status: ProposalStatus;
  /** Number of approve votes required for approval */
  requiredThreshold: number;
  /** Timestamp after which the proposal expires */
  expiresAt: Date;
  /** Timestamp of proposal creation */
  createdAt: Date;
  /**
   * Optional CBL reference for supporting documentation.
   *
   * This field is type-agnostic: it accepts both regular CBL identifiers
   * and TCBL (Tarball CBL) identifiers without discrimination. When the
   * attachment is a TCBL, consumers can use {@link enumerateAttachmentEntries}
   * to enumerate all bundled entries from the manifest. When it is a plain
   * CBL, the same utility returns a single-entry list.
   *
   * @see Requirement 9.1 — accepts both CBL and TCBL identifiers
   */
  attachmentCblId?: string;
  /** Epoch number at proposal creation */
  epochNumber: number;
  /**
   * Optional cooling period end timestamp.
   * When set, the proposal cannot be executed until this time has passed,
   * even if the vote threshold is reached early.
   * Used by BAN_MEMBER and UNBAN_MEMBER proposals.
   */
  coolingPeriodEndsAt?: Date;
}

/**
 * Input format for submitting a new proposal.
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface ProposalInput {
  /** Human-readable description */
  description: string;
  /** The type of action this proposal triggers on approval */
  actionType: ProposalActionType;
  /** Machine-readable action payload */
  actionPayload: Record<string, unknown>;
  /** Timestamp after which the proposal expires */
  expiresAt: Date;
  /**
   * Optional CBL reference for supporting documentation.
   *
   * This field is type-agnostic: it accepts both regular CBL identifiers
   * and TCBL (Tarball CBL) identifiers without discrimination. When the
   * attachment is a TCBL, consumers can use {@link enumerateAttachmentEntries}
   * to enumerate all bundled entries from the manifest. When it is a plain
   * CBL, the same utility returns a single-entry list.
   *
   * @see Requirement 9.1 — accepts both CBL and TCBL identifiers
   */
  attachmentCblId?: string;
}
