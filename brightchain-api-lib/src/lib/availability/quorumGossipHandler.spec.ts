/**
 * @fileoverview Unit tests for QuorumGossipHandler
 *
 * Tests:
 * - Proposal serialization/deserialization round-trip
 * - Vote serialization/deserialization round-trip
 * - Invalid proposer message rejection
 * - Invalid voter message rejection
 * - Duplicate proposal handling
 * - Duplicate vote handling
 * - CBL attachment retrieval and caching
 *
 * @see Task 21.5
 */

import {
  BlockAnnouncement,
  IGossipService,
  IQuorumDatabase,
  IQuorumStateMachine,
  Proposal,
  ProposalActionType,
  ProposalInput,
  ProposalStatus,
  QuorumProposalMetadata,
  QuorumVoteMetadata,
  VoteInput,
} from '@brightchain/brightchain-lib';
import { HexString } from '@digitaldefiance/ecies-lib';
import {
  ICBLContentProvider,
  QuorumGossipHandler,
} from './quorumGossipHandler';

// ── Helpers ──────────────────────────────────────────────────────────

const MEMBER_A = 'aaaa0000' as HexString;
const MEMBER_B = 'bbbb1111' as HexString;
const PROPOSAL_ID = 'pppp0001' as HexString;
const CBL_ID = 'cbl-attachment-001';

function makeMember(id: HexString, isActive = true) {
  return {
    id,
    publicKey: new Uint8Array([1, 2, 3]),
    metadata: { name: `Member-${id}` },
    isActive,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: PROPOSAL_ID,
    description: 'Test proposal',
    actionType: ProposalActionType.CUSTOM,
    actionPayload: { key: 'value' },
    proposerMemberId: MEMBER_A,
    status: ProposalStatus.Pending,
    requiredThreshold: 2,
    expiresAt: new Date(Date.now() + 3600_000),
    createdAt: new Date(),
    epochNumber: 1,
    ...overrides,
  };
}

function makeProposalMetadata(
  overrides: Partial<QuorumProposalMetadata> = {},
): QuorumProposalMetadata {
  return {
    proposalId: PROPOSAL_ID,
    description: 'Test proposal via gossip',
    actionType: ProposalActionType.CUSTOM,
    actionPayload: JSON.stringify({ key: 'value' }),
    proposerMemberId: MEMBER_A,
    expiresAt: new Date(Date.now() + 3600_000),
    requiredThreshold: 2,
    ...overrides,
  };
}

function makeVoteMetadata(
  overrides: Partial<QuorumVoteMetadata> = {},
): QuorumVoteMetadata {
  return {
    proposalId: PROPOSAL_ID,
    voterMemberId: MEMBER_B,
    decision: 'approve',
    ...overrides,
  };
}

function makeProposalAnnouncement(
  metadata: QuorumProposalMetadata,
): BlockAnnouncement {
  return {
    type: 'quorum_proposal',
    blockId: metadata.proposalId,
    nodeId: 'remote-node-1',
    timestamp: new Date(),
    ttl: 5,
    quorumProposal: metadata,
  };
}

function makeVoteAnnouncement(metadata: QuorumVoteMetadata): BlockAnnouncement {
  return {
    type: 'quorum_vote',
    blockId: metadata.proposalId,
    nodeId: 'remote-node-2',
    timestamp: new Date(),
    ttl: 5,
    quorumVote: metadata,
  };
}

// ── Mock Factories ───────────────────────────────────────────────────

type ProposalHandler = (ann: BlockAnnouncement) => void;
type VoteHandler = (ann: BlockAnnouncement) => void;

function createMockGossipService(): IGossipService & {
  proposalHandlers: Set<ProposalHandler>;
  voteHandlers: Set<VoteHandler>;
} {
  const proposalHandlers = new Set<ProposalHandler>();
  const voteHandlers = new Set<VoteHandler>();

  return {
    proposalHandlers,
    voteHandlers,
    announceBlock: jest.fn(async () => {}),
    announceRemoval: jest.fn(async () => {}),
    announcePoolDeletion: jest.fn(async () => {}),
    announceCBLIndexUpdate: jest.fn(async () => {}),
    announceCBLIndexDelete: jest.fn(async () => {}),
    announceHeadUpdate: jest.fn(async () => {}),
    announceACLUpdate: jest.fn(async () => {}),
    announceMessage: jest.fn(async () => {}),
    sendDeliveryAck: jest.fn(async () => {}),
    announceQuorumProposal: jest.fn(async () => {}),
    announceQuorumVote: jest.fn(async () => {}),
    handleAnnouncement: jest.fn(async () => {}),
    onAnnouncement: jest.fn(),
    offAnnouncement: jest.fn(),
    onMessageDelivery: jest.fn(),
    offMessageDelivery: jest.fn(),
    onDeliveryAck: jest.fn(),
    offDeliveryAck: jest.fn(),
    onQuorumProposal: jest.fn((handler: ProposalHandler) => {
      proposalHandlers.add(handler);
    }),
    offQuorumProposal: jest.fn((handler: ProposalHandler) => {
      proposalHandlers.delete(handler);
    }),
    onQuorumVote: jest.fn((handler: VoteHandler) => {
      voteHandlers.add(handler);
    }),
    offQuorumVote: jest.fn((handler: VoteHandler) => {
      voteHandlers.delete(handler);
    }),
    getPendingAnnouncements: jest.fn(() => []),
    flushAnnouncements: jest.fn(async () => {}),
    start: jest.fn(),
    stop: jest.fn(async () => {}),
    getConfig: jest.fn(() => ({
      fanout: 3,
      defaultTtl: 3,
      batchIntervalMs: 1000,
      maxBatchSize: 100,
      messagePriority: {
        normal: { fanout: 5, ttl: 5 },
        high: { fanout: 7, ttl: 7 },
      },
    })),
  };
}

function createMockDatabase(options?: {
  members?: Map<HexString, ReturnType<typeof makeMember>>;
  proposals?: Map<HexString, Proposal>;
}): IQuorumDatabase {
  const members =
    options?.members ?? new Map([[MEMBER_A, makeMember(MEMBER_A)]]);
  const proposals = options?.proposals ?? new Map();

  return {
    getMember: jest.fn(async (id: HexString) => members.get(id) ?? null),
    getProposal: jest.fn(async (id: HexString) => proposals.get(id) ?? null),
    listActiveMembers: jest.fn(async () =>
      Array.from(members.values()).filter((m) => m.isActive),
    ),
    // Stubs for remaining IQuorumDatabase methods
    saveEpoch: jest.fn(async () => {}),
    getEpoch: jest.fn(async () => null),
    getCurrentEpoch: jest.fn(async () => ({
      epochNumber: 1,
      memberIds: Array.from(members.keys()),
      threshold: 2,
      mode: 'quorum' as const,
      createdAt: new Date(),
    })),
    saveMember: jest.fn(async () => {}),
    saveDocument: jest.fn(async () => {}),
    getDocument: jest.fn(async () => null),
    listDocumentsByEpoch: jest.fn(async () => []),
    saveProposal: jest.fn(async () => {}),
    saveVote: jest.fn(async () => {}),
    getVotesForProposal: jest.fn(async () => []),
    saveIdentityRecord: jest.fn(async () => {}),
    getIdentityRecord: jest.fn(async () => null),
    deleteIdentityRecord: jest.fn(async () => {}),
    listExpiredIdentityRecords: jest.fn(async () => []),
    saveAlias: jest.fn(async () => {}),
    getAlias: jest.fn(async () => null),
    isAliasAvailable: jest.fn(async () => true),
    appendAuditEntry: jest.fn(async () => {}),
    getLatestAuditEntry: jest.fn(async () => null),
    saveJournalEntry: jest.fn(async () => {}),
    getJournalEntries: jest.fn(async () => []),
    deleteJournalEntries: jest.fn(async () => {}),
    saveStatuteConfig: jest.fn(async () => {}),
    getStatuteConfig: jest.fn(async () => null),
    saveOperationalState: jest.fn(async () => {}),
    getOperationalState: jest.fn(async () => null),
    withTransaction: jest.fn(async <R>(fn: () => Promise<R>) => fn()),
    isAvailable: jest.fn(async () => true),
  } as IQuorumDatabase;
}

interface MockStateMachine extends IQuorumStateMachine {
  submittedProposals: Array<ProposalInput>;
  submittedVotes: Array<VoteInput>;
}

function createMockStateMachine(): MockStateMachine {
  const submittedProposals: Array<ProposalInput> = [];
  const submittedVotes: Array<VoteInput> = [];

  return {
    submittedProposals,
    submittedVotes,
    getMode: jest.fn(async () => 'quorum' as const),
    initialize: jest.fn(),
    initiateTransition: jest.fn(async () => {}),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    submitProposal: jest.fn(async (input: ProposalInput) => {
      submittedProposals.push(input);
      return makeProposal();
    }),
    submitVote: jest.fn(async (input: VoteInput) => {
      submittedVotes.push(input);
    }),
    getProposal: jest.fn(async () => null),
    sealDocument: jest.fn(),
    unsealDocument: jest.fn(),
    getCurrentEpoch: jest.fn(),
    getEpoch: jest.fn(async () => null),
    getMetrics: jest.fn(),
  } as MockStateMachine;
}

function createMockCBLProvider(content?: Uint8Array): ICBLContentProvider {
  return {
    retrieveCBL: jest.fn(async () => content ?? null),
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('QuorumGossipHandler', () => {
  let gossipService: ReturnType<typeof createMockGossipService>;
  let db: ReturnType<typeof createMockDatabase>;
  let stateMachine: MockStateMachine;
  let handler: QuorumGossipHandler;

  beforeEach(() => {
    gossipService = createMockGossipService();
    db = createMockDatabase({
      members: new Map([
        [MEMBER_A, makeMember(MEMBER_A)],
        [MEMBER_B, makeMember(MEMBER_B)],
      ]),
    });
    stateMachine = createMockStateMachine();
    handler = new QuorumGossipHandler(gossipService, stateMachine, db);
  });

  afterEach(() => {
    handler.stop();
    handler.clearDeduplicationState();
    handler.clearAttachmentCache();
  });

  describe('start/stop lifecycle', () => {
    it('should register handlers on start', () => {
      handler.start();
      expect(gossipService.onQuorumProposal).toHaveBeenCalledTimes(1);
      expect(gossipService.onQuorumVote).toHaveBeenCalledTimes(1);
      expect(gossipService.proposalHandlers.size).toBe(1);
      expect(gossipService.voteHandlers.size).toBe(1);
    });

    it('should unregister handlers on stop', () => {
      handler.start();
      handler.stop();
      expect(gossipService.offQuorumProposal).toHaveBeenCalledTimes(1);
      expect(gossipService.offQuorumVote).toHaveBeenCalledTimes(1);
    });
  });

  describe('proposal serialization/deserialization round-trip', () => {
    it('should deserialize gossip metadata and dispatch to state machine', async () => {
      const metadata = makeProposalMetadata();
      const announcement = makeProposalAnnouncement(metadata);

      await handler.handleProposalAnnouncement(announcement);

      expect(stateMachine.submitProposal).toHaveBeenCalledTimes(1);
      const submitted = stateMachine.submittedProposals[0];
      expect(submitted.description).toBe('Test proposal via gossip');
      expect(submitted.actionType).toBe(ProposalActionType.CUSTOM);
      expect(submitted.expiresAt).toBeInstanceOf(Date);
    });

    it('should parse JSON actionPayload from gossip metadata', async () => {
      const metadata = makeProposalMetadata({
        actionPayload: JSON.stringify({ targetId: 'abc', count: 42 }),
      });
      const announcement = makeProposalAnnouncement(metadata);

      await handler.handleProposalAnnouncement(announcement);

      const submitted = stateMachine.submittedProposals[0];
      const payload = submitted.actionPayload;
      expect(payload['targetId']).toBe('abc');
      expect(payload['count']).toBe(42);
    });

    it('should handle malformed JSON actionPayload gracefully', async () => {
      const metadata = makeProposalMetadata({
        actionPayload: 'not-valid-json{{{',
      });
      const announcement = makeProposalAnnouncement(metadata);

      await handler.handleProposalAnnouncement(announcement);

      expect(stateMachine.submitProposal).toHaveBeenCalledTimes(1);
      const submitted = stateMachine.submittedProposals[0];
      const payload = submitted.actionPayload;
      // Should default to empty object with proposerMemberId injected
      expect(payload['proposerMemberId']).toBe(MEMBER_A);
    });

    it('should inject proposerMemberId into actionPayload', async () => {
      const metadata = makeProposalMetadata();
      const announcement = makeProposalAnnouncement(metadata);

      await handler.handleProposalAnnouncement(announcement);

      const submitted = stateMachine.submittedProposals[0];
      const payload = submitted.actionPayload;
      expect(payload['proposerMemberId']).toBe(MEMBER_A);
    });

    it('should preserve attachmentCblId in deserialized proposal', async () => {
      const metadata = makeProposalMetadata({
        attachmentCblId: CBL_ID,
      });
      const announcement = makeProposalAnnouncement(metadata);

      await handler.handleProposalAnnouncement(announcement);

      const submitted = stateMachine.submittedProposals[0];
      expect(submitted.attachmentCblId).toBe(CBL_ID);
    });

    it('should convert string expiresAt to Date', async () => {
      const futureDate = new Date(Date.now() + 7200_000);
      const metadata = makeProposalMetadata({
        // Simulate JSON deserialization where Date becomes string
        expiresAt: futureDate.toISOString() as unknown as Date,
      });
      const announcement = makeProposalAnnouncement(metadata);

      await handler.handleProposalAnnouncement(announcement);

      const submitted = stateMachine.submittedProposals[0];
      expect(submitted.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('vote serialization/deserialization round-trip', () => {
    beforeEach(() => {
      // Ensure the proposal exists in the database for vote validation
      const pendingProposal = makeProposal();
      db = createMockDatabase({
        members: new Map([
          [MEMBER_A, makeMember(MEMBER_A)],
          [MEMBER_B, makeMember(MEMBER_B)],
        ]),
        proposals: new Map([[PROPOSAL_ID, pendingProposal]]),
      });
      handler = new QuorumGossipHandler(gossipService, stateMachine, db);
    });

    it('should deserialize vote metadata and dispatch to state machine', async () => {
      const metadata = makeVoteMetadata();
      const announcement = makeVoteAnnouncement(metadata);

      await handler.handleVoteAnnouncement(announcement);

      expect(stateMachine.submitVote).toHaveBeenCalledTimes(1);
      const submitted = stateMachine.submittedVotes[0];
      expect(submitted.proposalId).toBe(PROPOSAL_ID);
      expect(submitted.voterMemberId).toBe(MEMBER_B);
      expect(submitted.decision).toBe('approve');
    });

    it('should pass reject decision through correctly', async () => {
      const metadata = makeVoteMetadata({ decision: 'reject' });
      const announcement = makeVoteAnnouncement(metadata);

      await handler.handleVoteAnnouncement(announcement);

      const submitted = stateMachine.submittedVotes[0];
      expect(submitted.decision).toBe('reject');
    });

    it('should pass optional comment through', async () => {
      const metadata = makeVoteMetadata({ comment: 'Looks good to me' });
      const announcement = makeVoteAnnouncement(metadata);

      await handler.handleVoteAnnouncement(announcement);

      const submitted = stateMachine.submittedVotes[0];
      expect(submitted.comment).toBe('Looks good to me');
    });
  });

  describe('invalid proposer/voter message rejection', () => {
    it('should reject proposal from unknown member', async () => {
      const metadata = makeProposalMetadata({
        proposerMemberId: 'unknown-member-id' as HexString,
      });
      const announcement = makeProposalAnnouncement(metadata);

      await handler.handleProposalAnnouncement(announcement);

      expect(stateMachine.submitProposal).not.toHaveBeenCalled();
    });

    it('should reject proposal from inactive member', async () => {
      const inactiveDb = createMockDatabase({
        members: new Map([[MEMBER_A, makeMember(MEMBER_A, false)]]),
      });
      const inactiveHandler = new QuorumGossipHandler(
        gossipService,
        stateMachine,
        inactiveDb,
      );

      const metadata = makeProposalMetadata({ proposerMemberId: MEMBER_A });
      const announcement = makeProposalAnnouncement(metadata);

      await inactiveHandler.handleProposalAnnouncement(announcement);

      expect(stateMachine.submitProposal).not.toHaveBeenCalled();
    });

    it('should reject vote from unknown member', async () => {
      const dbWithProposal = createMockDatabase({
        members: new Map([[MEMBER_A, makeMember(MEMBER_A)]]),
        proposals: new Map([[PROPOSAL_ID, makeProposal()]]),
      });
      const handlerWithProposal = new QuorumGossipHandler(
        gossipService,
        stateMachine,
        dbWithProposal,
      );

      const metadata = makeVoteMetadata({
        voterMemberId: 'unknown-voter' as HexString,
      });
      const announcement = makeVoteAnnouncement(metadata);

      await handlerWithProposal.handleVoteAnnouncement(announcement);

      expect(stateMachine.submitVote).not.toHaveBeenCalled();
    });

    it('should reject vote from inactive member', async () => {
      const dbWithInactive = createMockDatabase({
        members: new Map([
          [MEMBER_A, makeMember(MEMBER_A)],
          [MEMBER_B, makeMember(MEMBER_B, false)],
        ]),
        proposals: new Map([[PROPOSAL_ID, makeProposal()]]),
      });
      const handlerWithInactive = new QuorumGossipHandler(
        gossipService,
        stateMachine,
        dbWithInactive,
      );

      const metadata = makeVoteMetadata({ voterMemberId: MEMBER_B });
      const announcement = makeVoteAnnouncement(metadata);

      await handlerWithInactive.handleVoteAnnouncement(announcement);

      expect(stateMachine.submitVote).not.toHaveBeenCalled();
    });

    it('should reject vote for non-existent proposal', async () => {
      // db has no proposals
      const metadata = makeVoteMetadata();
      const announcement = makeVoteAnnouncement(metadata);

      await handler.handleVoteAnnouncement(announcement);

      expect(stateMachine.submitVote).not.toHaveBeenCalled();
    });

    it('should reject vote for non-pending proposal', async () => {
      const approvedProposal = makeProposal({
        status: ProposalStatus.Approved,
      });
      const dbWithApproved = createMockDatabase({
        members: new Map([
          [MEMBER_A, makeMember(MEMBER_A)],
          [MEMBER_B, makeMember(MEMBER_B)],
        ]),
        proposals: new Map([[PROPOSAL_ID, approvedProposal]]),
      });
      const handlerWithApproved = new QuorumGossipHandler(
        gossipService,
        stateMachine,
        dbWithApproved,
      );

      const metadata = makeVoteMetadata();
      const announcement = makeVoteAnnouncement(metadata);

      await handlerWithApproved.handleVoteAnnouncement(announcement);

      expect(stateMachine.submitVote).not.toHaveBeenCalled();
    });

    it('should silently discard announcement without quorumProposal metadata', async () => {
      const announcement: BlockAnnouncement = {
        type: 'quorum_proposal',
        blockId: 'some-id',
        nodeId: 'remote-node',
        timestamp: new Date(),
        ttl: 5,
        // quorumProposal is missing
      };

      await handler.handleProposalAnnouncement(announcement);

      expect(stateMachine.submitProposal).not.toHaveBeenCalled();
    });

    it('should silently discard announcement without quorumVote metadata', async () => {
      const announcement: BlockAnnouncement = {
        type: 'quorum_vote',
        blockId: 'some-id',
        nodeId: 'remote-node',
        timestamp: new Date(),
        ttl: 5,
        // quorumVote is missing
      };

      await handler.handleVoteAnnouncement(announcement);

      expect(stateMachine.submitVote).not.toHaveBeenCalled();
    });
  });

  describe('duplicate message handling', () => {
    it('should skip duplicate proposal by ID (in-memory dedup)', async () => {
      const metadata = makeProposalMetadata();
      const announcement = makeProposalAnnouncement(metadata);

      await handler.handleProposalAnnouncement(announcement);
      await handler.handleProposalAnnouncement(announcement);

      expect(stateMachine.submitProposal).toHaveBeenCalledTimes(1);
    });

    it('should skip proposal that already exists in database', async () => {
      const existingProposal = makeProposal();
      const dbWithExisting = createMockDatabase({
        members: new Map([[MEMBER_A, makeMember(MEMBER_A)]]),
        proposals: new Map([[PROPOSAL_ID, existingProposal]]),
      });
      const handlerWithExisting = new QuorumGossipHandler(
        gossipService,
        stateMachine,
        dbWithExisting,
      );

      const metadata = makeProposalMetadata();
      const announcement = makeProposalAnnouncement(metadata);

      await handlerWithExisting.handleProposalAnnouncement(announcement);

      expect(stateMachine.submitProposal).not.toHaveBeenCalled();
    });

    it('should skip duplicate vote by proposalId + voterMemberId', async () => {
      const dbWithProposal = createMockDatabase({
        members: new Map([
          [MEMBER_A, makeMember(MEMBER_A)],
          [MEMBER_B, makeMember(MEMBER_B)],
        ]),
        proposals: new Map([[PROPOSAL_ID, makeProposal()]]),
      });
      const handlerWithProposal = new QuorumGossipHandler(
        gossipService,
        stateMachine,
        dbWithProposal,
      );

      const metadata = makeVoteMetadata();
      const announcement = makeVoteAnnouncement(metadata);

      await handlerWithProposal.handleVoteAnnouncement(announcement);
      await handlerWithProposal.handleVoteAnnouncement(announcement);

      expect(stateMachine.submitVote).toHaveBeenCalledTimes(1);
    });

    it('should allow votes from different members on the same proposal', async () => {
      const memberC = 'cccc2222' as HexString;
      const dbWithProposal = createMockDatabase({
        members: new Map([
          [MEMBER_A, makeMember(MEMBER_A)],
          [MEMBER_B, makeMember(MEMBER_B)],
          [memberC, makeMember(memberC)],
        ]),
        proposals: new Map([[PROPOSAL_ID, makeProposal()]]),
      });
      const handlerWithProposal = new QuorumGossipHandler(
        gossipService,
        stateMachine,
        dbWithProposal,
      );

      const voteB = makeVoteAnnouncement(
        makeVoteMetadata({ voterMemberId: MEMBER_B }),
      );
      const voteC = makeVoteAnnouncement(
        makeVoteMetadata({ voterMemberId: memberC }),
      );

      await handlerWithProposal.handleVoteAnnouncement(voteB);
      await handlerWithProposal.handleVoteAnnouncement(voteC);

      expect(stateMachine.submitVote).toHaveBeenCalledTimes(2);
    });

    it('should clear deduplication state when requested', async () => {
      const metadata = makeProposalMetadata();
      const announcement = makeProposalAnnouncement(metadata);

      await handler.handleProposalAnnouncement(announcement);
      expect(stateMachine.submitProposal).toHaveBeenCalledTimes(1);

      handler.clearDeduplicationState();

      // After clearing, the same proposal should be processed again
      // (but db check will catch it if it was saved)
      // Reset the db mock to not find the proposal
      (db.getProposal as jest.Mock).mockResolvedValueOnce(null);
      await handler.handleProposalAnnouncement(announcement);
      expect(stateMachine.submitProposal).toHaveBeenCalledTimes(2);
    });
  });

  describe('CBL attachment retrieval and caching', () => {
    it('should cache CBL attachment when proposal has attachmentCblId', async () => {
      const cblContent = new Uint8Array([10, 20, 30, 40]);
      const cblProvider = createMockCBLProvider(cblContent);
      const handlerWithCBL = new QuorumGossipHandler(
        gossipService,
        stateMachine,
        db,
        cblProvider,
      );

      const metadata = makeProposalMetadata({ attachmentCblId: CBL_ID });
      const announcement = makeProposalAnnouncement(metadata);

      await handlerWithCBL.handleProposalAnnouncement(announcement);

      expect(cblProvider.retrieveCBL).toHaveBeenCalledWith(CBL_ID);
      expect(handlerWithCBL.getCachedAttachment(CBL_ID)).toEqual(cblContent);
    });

    it('should not attempt CBL retrieval when no attachmentCblId', async () => {
      const cblProvider = createMockCBLProvider();
      const handlerWithCBL = new QuorumGossipHandler(
        gossipService,
        stateMachine,
        db,
        cblProvider,
      );

      const metadata = makeProposalMetadata(); // no attachmentCblId
      const announcement = makeProposalAnnouncement(metadata);

      await handlerWithCBL.handleProposalAnnouncement(announcement);

      expect(cblProvider.retrieveCBL).not.toHaveBeenCalled();
    });

    it('should not attempt CBL retrieval when no provider configured', async () => {
      // handler has no cblProvider
      const metadata = makeProposalMetadata({ attachmentCblId: CBL_ID });
      const announcement = makeProposalAnnouncement(metadata);

      // Should not throw
      await handler.handleProposalAnnouncement(announcement);

      expect(handler.getCachedAttachment(CBL_ID)).toBeUndefined();
    });

    it('should not re-fetch already cached attachment', async () => {
      const cblContent = new Uint8Array([10, 20, 30]);
      const cblProvider = createMockCBLProvider(cblContent);
      const handlerWithCBL = new QuorumGossipHandler(
        gossipService,
        stateMachine,
        db,
        cblProvider,
      );

      const metadata = makeProposalMetadata({ attachmentCblId: CBL_ID });

      // First proposal with this attachment
      await handlerWithCBL.handleProposalAnnouncement(
        makeProposalAnnouncement(metadata),
      );

      // Second proposal with same attachment (different proposal ID)
      handler.clearDeduplicationState();
      const metadata2 = makeProposalMetadata({
        proposalId: 'pppp0002' as HexString,
        attachmentCblId: CBL_ID,
      });
      await handlerWithCBL.handleProposalAnnouncement(
        makeProposalAnnouncement(metadata2),
      );

      // retrieveCBL should only be called once (cached on first call)
      expect(cblProvider.retrieveCBL).toHaveBeenCalledTimes(1);
    });

    it('should handle CBL retrieval failure gracefully', async () => {
      const failingProvider: ICBLContentProvider = {
        retrieveCBL: jest.fn(async () => {
          throw new Error('Network error');
        }),
      };
      const handlerWithFailing = new QuorumGossipHandler(
        gossipService,
        stateMachine,
        db,
        failingProvider,
      );

      const metadata = makeProposalMetadata({ attachmentCblId: CBL_ID });
      const announcement = makeProposalAnnouncement(metadata);

      // Should not throw — CBL failure is non-fatal
      await handlerWithFailing.handleProposalAnnouncement(announcement);

      // Proposal should still be submitted
      expect(stateMachine.submitProposal).toHaveBeenCalledTimes(1);
      // But attachment should not be cached
      expect(handlerWithFailing.getCachedAttachment(CBL_ID)).toBeUndefined();
    });

    it('should handle null CBL content gracefully', async () => {
      const nullProvider = createMockCBLProvider(undefined);
      (nullProvider.retrieveCBL as jest.Mock).mockResolvedValue(null);
      const handlerWithNull = new QuorumGossipHandler(
        gossipService,
        stateMachine,
        db,
        nullProvider,
      );

      const metadata = makeProposalMetadata({ attachmentCblId: CBL_ID });
      const announcement = makeProposalAnnouncement(metadata);

      await handlerWithNull.handleProposalAnnouncement(announcement);

      expect(handlerWithNull.getCachedAttachment(CBL_ID)).toBeUndefined();
    });

    it('should clear attachment cache when requested', async () => {
      const cblContent = new Uint8Array([1, 2, 3]);
      const cblProvider = createMockCBLProvider(cblContent);
      const handlerWithCBL = new QuorumGossipHandler(
        gossipService,
        stateMachine,
        db,
        cblProvider,
      );

      const metadata = makeProposalMetadata({ attachmentCblId: CBL_ID });
      await handlerWithCBL.handleProposalAnnouncement(
        makeProposalAnnouncement(metadata),
      );

      expect(handlerWithCBL.getCachedAttachment(CBL_ID)).toEqual(cblContent);

      handlerWithCBL.clearAttachmentCache();

      expect(handlerWithCBL.getCachedAttachment(CBL_ID)).toBeUndefined();
    });
  });

  describe('state machine error handling', () => {
    it('should not throw when submitProposal fails', async () => {
      (stateMachine.submitProposal as jest.Mock).mockRejectedValueOnce(
        new Error('Validation failed'),
      );

      const metadata = makeProposalMetadata();
      const announcement = makeProposalAnnouncement(metadata);

      // Should not throw
      await handler.handleProposalAnnouncement(announcement);
    });

    it('should not throw when submitVote fails', async () => {
      const dbWithProposal = createMockDatabase({
        members: new Map([
          [MEMBER_A, makeMember(MEMBER_A)],
          [MEMBER_B, makeMember(MEMBER_B)],
        ]),
        proposals: new Map([[PROPOSAL_ID, makeProposal()]]),
      });
      const handlerWithProposal = new QuorumGossipHandler(
        gossipService,
        stateMachine,
        dbWithProposal,
      );

      (stateMachine.submitVote as jest.Mock).mockRejectedValueOnce(
        new Error('Duplicate vote'),
      );

      const metadata = makeVoteMetadata();
      const announcement = makeVoteAnnouncement(metadata);

      // Should not throw
      await handlerWithProposal.handleVoteAnnouncement(announcement);
    });

    it('should not add to dedup set when submitProposal fails', async () => {
      (stateMachine.submitProposal as jest.Mock)
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce(makeProposal());

      const metadata = makeProposalMetadata();
      const announcement = makeProposalAnnouncement(metadata);

      // First attempt fails
      await handler.handleProposalAnnouncement(announcement);
      // Second attempt should retry (not deduped)
      await handler.handleProposalAnnouncement(announcement);

      expect(stateMachine.submitProposal).toHaveBeenCalledTimes(2);
    });
  });
});
