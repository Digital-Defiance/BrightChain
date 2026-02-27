/**
 * @fileoverview IQuorumStateMachine interface.
 *
 * Central coordinator for the quorum system. Manages operational mode,
 * epoch lifecycle, proposal/vote orchestration, and delegates to
 * SealingService for cryptographic operations.
 *
 * @see Requirements 1-7, 10-13
 */

import { Member, PlatformID } from '@digitaldefiance/ecies-lib';
import { QuorumOperationalMode } from '../../enumerations/quorumOperationalMode';
import { Proposal, ProposalInput } from '../proposal';
import { QuorumEpoch } from '../quorumEpoch';
import { QuorumMetrics } from '../quorumMetrics';
import { VoteInput } from '../vote';
import { QuorumMemberMetadata, SealedDocumentResult } from './quorumService';
import { RedistributionConfig } from './redistributionConfig';

/**
 * Central quorum state machine interface.
 *
 * Replaces the current QuorumService as the central coordinator.
 * Manages operational mode, epoch lifecycle, proposal/vote orchestration,
 * and delegates to SealingService for cryptographic operations.
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface IQuorumStateMachine<TID extends PlatformID = Uint8Array> {
  /**
   * Get the current operational mode of the quorum system.
   * @returns The current mode (Bootstrap, Quorum, or TransitionInProgress)
   */
  getMode(): Promise<QuorumOperationalMode>;

  /**
   * Initialize the quorum system with an initial set of members and threshold.
   * Enters Bootstrap mode if members < threshold, Quorum mode otherwise.
   * Detects TransitionInProgress on startup and triggers rollback recovery.
   * @param members - Initial member set
   * @param threshold - Configured quorum threshold
   * @returns The initial QuorumEpoch
   */
  initialize(
    members: Member<TID>[],
    threshold: number,
  ): Promise<QuorumEpoch<TID>>;

  /**
   * Initiate a transition ceremony from Bootstrap to Quorum mode.
   * Verifies member count >= threshold, blocks operations, and re-splits
   * all bootstrap-sealed documents.
   * @throws QuorumError with TransitionInProgress if already transitioning
   * @throws QuorumError with InsufficientMembersForTransition if members < threshold
   */
  initiateTransition(): Promise<void>;

  /**
   * Add a new member to the quorum.
   * Increments epoch, triggers share redistribution for all documents,
   * and emits audit entries.
   * @param member - The member to add
   * @param metadata - Metadata for the member
   * @param redistributionConfig - Optional redistribution configuration
   * @returns The new QuorumEpoch after member addition
   */
  addMember(
    member: Member<TID>,
    metadata: QuorumMemberMetadata,
    redistributionConfig?: Partial<RedistributionConfig>,
  ): Promise<QuorumEpoch<TID>>;

  /**
   * Remove a member from the quorum.
   * Validates remaining count >= threshold, increments epoch,
   * triggers share redistribution with fresh polynomial coefficients,
   * and emits audit entries.
   * @param memberId - ID of the member to remove
   * @param redistributionConfig - Optional redistribution configuration
   * @returns The new QuorumEpoch after member removal
   * @throws QuorumError with InsufficientRemainingMembers if removal would drop below threshold
   */
  removeMember(
    memberId: TID,
    redistributionConfig?: Partial<RedistributionConfig>,
  ): Promise<QuorumEpoch<TID>>;

  /**
   * Submit a proposal for quorum voting.
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
   * Seal a document so it can only be accessed when enough quorum members agree.
   * Delegates to SealingService with bootstrap or quorum parameters.
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
   * @returns The current QuorumEpoch
   */
  getCurrentEpoch(): Promise<QuorumEpoch<TID>>;

  /**
   * Get a specific epoch by number.
   * @param epochNumber - The epoch number to retrieve
   * @returns The QuorumEpoch, or null if not found
   */
  getEpoch(epochNumber: number): Promise<QuorumEpoch<TID> | null>;

  /**
   * Get quorum system metrics for monitoring.
   * @returns QuorumMetrics with proposal, vote, redistribution, member, epoch, and expiration stats
   */
  getMetrics(): Promise<QuorumMetrics>;
}
