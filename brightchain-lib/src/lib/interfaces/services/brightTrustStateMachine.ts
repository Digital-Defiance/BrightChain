/**
 * @fileoverview IBrightTrustStateMachine interface.
 *
 * Central coordinator for the BrightTrust system. Manages operational mode,
 * epoch lifecycle, proposal/vote orchestration, and delegates to
 * SealingService for cryptographic operations.
 *
 * @see Requirements 1-7, 10-13
 */

import { Member, PlatformID } from '@digitaldefiance/ecies-lib';
import { BrightTrustOperationalMode } from '../../enumerations/brightTrustOperationalMode';
import { BrightTrustEpoch } from '../brightTrustEpoch';
import { BrightTrustMetrics } from '../brightTrustMetrics';
import { Proposal, ProposalInput } from '../proposal';
import { VoteInput } from '../vote';
import {
  BrightTrustMemberMetadata,
  SealedDocumentResult,
} from './brightTrustService';
import { RedistributionConfig } from './redistributionConfig';

/**
 * Central brightTrust state machine interface.
 *
 * Replaces the current BrightTrustService as the central coordinator.
 * Manages operational mode, epoch lifecycle, proposal/vote orchestration,
 * and delegates to SealingService for cryptographic operations.
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface IBrightTrustStateMachine<TID extends PlatformID = Uint8Array> {
  /**
   * Get the current operational mode of the BrightTrust system.
   * @returns The current mode (Bootstrap, BrightTrust, or TransitionInProgress)
   */
  getMode(): Promise<BrightTrustOperationalMode>;

  /**
   * Initialize the BrightTrust system with an initial set of members and threshold.
   * Enters Bootstrap mode if members < threshold, BrightTrust mode otherwise.
   * Detects TransitionInProgress on startup and triggers rollback recovery.
   * @param members - Initial member set
   * @param threshold - Configured quorum threshold
   * @returns The initial BrightTrustEpoch
   */
  initialize(
    members: Member<TID>[],
    threshold: number,
  ): Promise<BrightTrustEpoch<TID>>;

  /**
   * Initiate a transition ceremony from Bootstrap to BrightTrust mode.
   * Verifies member count >= threshold, blocks operations, and re-splits
   * all bootstrap-sealed documents.
   * @throws BrightTrustError with TransitionInProgress if already transitioning
   * @throws BrightTrustError with InsufficientMembersForTransition if members < threshold
   */
  initiateTransition(): Promise<void>;

  /**
   * Add a new member to the BrightTrust.
   * Increments epoch, triggers share redistribution for all documents,
   * and emits audit entries.
   * @param member - The member to add
   * @param metadata - Metadata for the member
   * @param redistributionConfig - Optional redistribution configuration
   * @returns The new BrightTrustEpoch after member addition
   */
  addMember(
    member: Member<TID>,
    metadata: BrightTrustMemberMetadata,
    redistributionConfig?: Partial<RedistributionConfig>,
  ): Promise<BrightTrustEpoch<TID>>;

  /**
   * Remove a member from the BrightTrust.
   * Validates remaining count >= threshold, increments epoch,
   * triggers share redistribution with fresh polynomial coefficients,
   * and emits audit entries.
   * @param memberId - ID of the member to remove
   * @param redistributionConfig - Optional redistribution configuration
   * @returns The new BrightTrustEpoch after member removal
   * @throws BrightTrustError with InsufficientRemainingMembers if removal would drop below threshold
   */
  removeMember(
    memberId: TID,
    redistributionConfig?: Partial<RedistributionConfig>,
  ): Promise<BrightTrustEpoch<TID>>;

  /**
   * Submit a proposal for BrightTrust voting.
   * Validates proposer, assigns ID, stores as pending, announces via gossip.
   * @param proposal - The proposal input
   * @returns The created Proposal with assigned ID and status
   */
  submitProposal(proposal: ProposalInput): Promise<Proposal<TID>>;

  /**
   * Submit a vote on a pending proposal.
   * Validates voter is active member on proposal, checks for duplicates,
   * stores vote, announces via gossip.
   * @param vote - The vote input
   */
  submitVote(vote: VoteInput<TID>): Promise<void>;

  /**
   * Get a proposal by its ID.
   * @param proposalId - The proposal ID
   * @returns The proposal, or null if not found
   */
  getProposal(proposalId: TID): Promise<Proposal<TID> | null>;

  /**
   * Seal a document so it can only be accessed when enough BrightTrust members agree.
   * Delegates to SealingService with bootstrap or brightTrust parameters.
   * Tags document with epoch and sealedUnderBootstrap flag.
   * @param agent - The member performing the sealing operation
   * @param document - The document to seal
   * @param memberIds - IDs of members who will receive shares
   * @param sharesRequired - Optional number of shares required to unseal
   * @returns The sealed document result
   */
  sealDocument<T>(
    agent: Member<TID>,
    document: T,
    memberIds: TID[],
    sharesRequired?: number,
  ): Promise<SealedDocumentResult<TID>>;

  /**
   * Unseal a document using member shares.
   * Verifies checksum (SHA-3) and creator signature using constant-time
   * comparison before delegating to SealingService.
   * @param documentId - The ID of the document to unseal
   * @param membersWithPrivateKey - Members with loaded private keys for decryption
   * @returns The unsealed document
   */
  unsealDocument<T>(
    documentId: TID,
    membersWithPrivateKey: Member<TID>[],
  ): Promise<T>;

  /**
   * Get the current epoch.
   * @returns The current BrightTrustEpoch
   */
  getCurrentEpoch(): Promise<BrightTrustEpoch<TID>>;

  /**
   * Get a specific epoch by number.
   * @param epochNumber - The epoch number to retrieve
   * @returns The BrightTrustEpoch, or null if not found
   */
  getEpoch(epochNumber: number): Promise<BrightTrustEpoch<TID> | null>;

  /**
   * Get brightTrust system metrics for monitoring.
   * @returns BrightTrustMetrics with proposal, vote, redistribution, member, epoch, and expiration stats
   */
  getMetrics(): Promise<BrightTrustMetrics>;
}
