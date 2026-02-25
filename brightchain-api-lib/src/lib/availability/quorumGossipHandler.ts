/**
 * @fileoverview QuorumGossipHandler — validates, deserializes, and dispatches
 * quorum proposal/vote gossip messages to the QuorumStateMachine.
 *
 * Registers as a handler on the GossipService for 'quorum_proposal' and
 * 'quorum_vote' announcements. Validates that proposers/voters are active
 * quorum members, deduplicates messages, caches CBL attachments, and
 * dispatches to the QuorumStateMachine for processing.
 *
 * @see Requirements 5.5, 7.3
 */

import {
  BlockAnnouncement,
  IGossipService,
  IQuorumDatabase,
  IQuorumStateMachine,
  ProposalActionType,
  ProposalInput,
  ProposalStatus,
  QuorumProposalMetadata,
  QuorumVoteMetadata,
  VoteInput,
} from '@brightchain/brightchain-lib';
import { PlatformID, ShortHexGuid } from '@digitaldefiance/ecies-lib';

/**
 * Interface for retrieving and caching CBL attachment content.
 */
export interface ICBLContentProvider {
  /**
   * Retrieve CBL content by its ID.
   * @param cblId - The CBL identifier
   * @returns The CBL content bytes, or null if not found
   */
  retrieveCBL(cblId: string): Promise<Uint8Array | null>;
}

/**
 * Handles quorum proposal and vote gossip messages.
 *
 * Responsibilities:
 * - Validates proposer/voter membership against the quorum database
 * - Deduplicates proposals and votes by ID
 * - Deserializes gossip metadata into ProposalInput/VoteInput
 * - Dispatches to QuorumStateMachine for processing
 * - Caches CBL attachment content for proposals with attachments
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export class QuorumGossipHandler<TID extends PlatformID = Uint8Array> {
  /** Set of proposal IDs already processed (deduplication) */
  private readonly seenProposalIds = new Set<string>();

  /** Set of vote keys (proposalId:voterMemberId) already processed */
  private readonly seenVoteKeys = new Set<string>();

  /** Cached CBL attachment content keyed by CBL ID */
  private readonly attachmentCache = new Map<string, Uint8Array>();

  /** Bound handler references for cleanup */
  private readonly boundProposalHandler: (ann: BlockAnnouncement) => void;
  private readonly boundVoteHandler: (ann: BlockAnnouncement) => void;

  constructor(
    private readonly gossipService: IGossipService,
    private readonly stateMachine: IQuorumStateMachine<TID>,
    private readonly db: IQuorumDatabase<TID>,
    private readonly cblProvider?: ICBLContentProvider,
  ) {
    this.boundProposalHandler = (ann) => {
      this.handleProposalAnnouncement(ann).catch((err) => {
        console.error('[QuorumGossipHandler] Proposal handler error:', err);
      });
    };
    this.boundVoteHandler = (ann) => {
      this.handleVoteAnnouncement(ann).catch((err) => {
        console.error('[QuorumGossipHandler] Vote handler error:', err);
      });
    };
  }

  /**
   * Start listening for quorum gossip messages.
   */
  start(): void {
    this.gossipService.onQuorumProposal(this.boundProposalHandler);
    this.gossipService.onQuorumVote(this.boundVoteHandler);
  }

  /**
   * Stop listening for quorum gossip messages and clean up.
   */
  stop(): void {
    this.gossipService.offQuorumProposal(this.boundProposalHandler);
    this.gossipService.offQuorumVote(this.boundVoteHandler);
  }

  /**
   * Handle an incoming quorum proposal announcement.
   *
   * 1. Validate the announcement has quorumProposal metadata
   * 2. Deduplicate by proposal ID
   * 3. Validate the proposer is an active quorum member
   * 4. Deserialize the metadata into a ProposalInput
   * 5. Dispatch to QuorumStateMachine.submitProposal()
   * 6. If the proposal has an attachment, cache the CBL content
   *
   * @param announcement - The received gossip announcement
   */
  async handleProposalAnnouncement(
    announcement: BlockAnnouncement,
  ): Promise<void> {
    const metadata = announcement.quorumProposal;
    if (!metadata) {
      return;
    }

    // Deduplicate: skip if we've already processed this proposal
    if (this.seenProposalIds.has(metadata.proposalId)) {
      return;
    }

    // Check if proposal already exists in the database
    const existingProposal = await this.db.getProposal(
      metadata.proposalId as ShortHexGuid,
    );
    if (existingProposal) {
      this.seenProposalIds.add(metadata.proposalId);
      return;
    }

    // Validate proposer is an active quorum member
    const proposerMember = await this.db.getMember(
      metadata.proposerMemberId as ShortHexGuid,
    );
    if (!proposerMember || !proposerMember.isActive) {
      return; // Silently discard — invalid proposer
    }

    // Deserialize the gossip metadata into a ProposalInput
    const proposalInput = this.deserializeProposalMetadata(metadata);

    try {
      await this.stateMachine.submitProposal(proposalInput);
      this.seenProposalIds.add(metadata.proposalId);

      // Cache CBL attachment content if present (Task 21.4)
      if (metadata.attachmentCblId) {
        await this.cacheAttachment(metadata.attachmentCblId);
      }
    } catch {
      // Proposal submission failed (e.g., validation error in state machine).
      // The gossip layer silently discards invalid proposals.
    }
  }

  /**
   * Handle an incoming quorum vote announcement.
   *
   * 1. Validate the announcement has quorumVote metadata
   * 2. Deduplicate by proposalId + voterMemberId
   * 3. Validate the voter is an active quorum member
   * 4. Validate the referenced proposal exists and is pending
   * 5. Deserialize the metadata into a VoteInput
   * 6. Dispatch to QuorumStateMachine.submitVote()
   *
   * @param announcement - The received gossip announcement
   */
  async handleVoteAnnouncement(announcement: BlockAnnouncement): Promise<void> {
    const metadata = announcement.quorumVote;
    if (!metadata) {
      return;
    }

    // Deduplicate: skip if we've already processed this vote
    const voteKey = `${metadata.proposalId}:${metadata.voterMemberId}`;
    if (this.seenVoteKeys.has(voteKey)) {
      return;
    }

    // Validate voter is an active quorum member
    const voterMember = await this.db.getMember(
      metadata.voterMemberId as ShortHexGuid,
    );
    if (!voterMember || !voterMember.isActive) {
      return; // Silently discard — invalid voter
    }

    // Validate the referenced proposal exists and is pending
    const proposal = await this.db.getProposal(
      metadata.proposalId as ShortHexGuid,
    );
    if (!proposal || proposal.status !== ProposalStatus.Pending) {
      return; // Silently discard — no matching pending proposal
    }

    // Deserialize the gossip metadata into a VoteInput
    const voteInput = this.deserializeVoteMetadata(metadata);

    try {
      await this.stateMachine.submitVote(voteInput);
      this.seenVoteKeys.add(voteKey);
    } catch {
      // Vote submission failed (e.g., duplicate detected by state machine).
      // The gossip layer silently discards invalid votes.
    }
  }

  /**
   * Deserialize QuorumProposalMetadata from gossip into a ProposalInput.
   *
   * @param metadata - The gossip proposal metadata
   * @returns A ProposalInput suitable for QuorumStateMachine.submitProposal()
   */
  private deserializeProposalMetadata(
    metadata: QuorumProposalMetadata,
  ): ProposalInput<TID> {
    let actionPayload: Record<string, unknown>;
    try {
      actionPayload = JSON.parse(metadata.actionPayload) as Record<
        string,
        unknown
      >;
    } catch {
      actionPayload = {};
    }

    // Ensure proposerMemberId is in the action payload for the state machine
    actionPayload['proposerMemberId'] = metadata.proposerMemberId;

    return {
      description: metadata.description,
      actionType: metadata.actionType as ProposalActionType,
      actionPayload,
      expiresAt:
        metadata.expiresAt instanceof Date
          ? metadata.expiresAt
          : new Date(metadata.expiresAt),
      attachmentCblId: metadata.attachmentCblId,
    };
  }

  /**
   * Deserialize QuorumVoteMetadata from gossip into a VoteInput.
   *
   * @param metadata - The gossip vote metadata
   * @returns A VoteInput suitable for QuorumStateMachine.submitVote()
   */
  private deserializeVoteMetadata(
    metadata: QuorumVoteMetadata,
  ): VoteInput<TID> {
    return {
      proposalId: metadata.proposalId as ShortHexGuid,
      voterMemberId: metadata.voterMemberId as ShortHexGuid,
      decision: metadata.decision,
      comment: metadata.comment,
    };
  }

  /**
   * Retrieve and cache CBL attachment content.
   *
   * When a proposal with an attachment is received via gossip, the CBL
   * content is fetched and cached locally so the node operator can review
   * it during voting.
   *
   * @param cblId - The CBL identifier to retrieve and cache
   */
  private async cacheAttachment(cblId: string): Promise<void> {
    if (this.attachmentCache.has(cblId)) {
      return; // Already cached
    }

    if (!this.cblProvider) {
      return; // No CBL provider configured
    }

    try {
      const content = await this.cblProvider.retrieveCBL(cblId);
      if (content) {
        this.attachmentCache.set(cblId, content);
      }
    } catch {
      // CBL retrieval failed — non-fatal, operator can retry manually
      console.warn(
        `[QuorumGossipHandler] Failed to cache CBL attachment: ${cblId}`,
      );
    }
  }

  /**
   * Get cached CBL attachment content.
   *
   * @param cblId - The CBL identifier
   * @returns The cached content, or undefined if not cached
   */
  getCachedAttachment(cblId: string): Uint8Array | undefined {
    return this.attachmentCache.get(cblId);
  }

  /**
   * Clear the attachment cache.
   */
  clearAttachmentCache(): void {
    this.attachmentCache.clear();
  }

  /**
   * Clear deduplication state (for testing or periodic cleanup).
   */
  clearDeduplicationState(): void {
    this.seenProposalIds.clear();
    this.seenVoteKeys.clear();
  }
}
