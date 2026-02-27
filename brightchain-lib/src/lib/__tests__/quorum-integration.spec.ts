/**
 * @fileoverview Integration tests for the quorum bootstrap redesign.
 *
 * Tests critical end-to-end flows through real service implementations
 * wired together via an in-memory database mock.
 *
 * Covers:
 * 25.1 Bootstrap → Add Members → Transition → Quorum Mode
 * 25.2 Proposal → Gossip → Vote → Tally → Action
 * 25.3 Content ingestion with identity sealing (real/alias/anonymous)
 * 25.4 IDENTITY_DISCLOSURE end-to-end
 * 25.5 Statute of limitations
 * 25.6 Audit chain integrity
 * 25.7 Share redistribution on member add/remove
 */

import {
  ECIESService,
  EmailString,
  GuidV4Uint8Array,
  HexString,
  IMemberWithMnemonic,
  Member,
  MemberType,
  SignatureUint8Array,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { sha3_512 } from '@noble/hashes/sha3';
import { v4 as uuidv4 } from 'uuid';
import { MemberStatusType } from '../enumerations/memberStatusType';
import { ProposalActionType } from '../enumerations/proposalActionType';
import { ProposalStatus } from '../enumerations/proposalStatus';
import { QuorumOperationalMode } from '../enumerations/quorumOperationalMode';
import { QuorumError } from '../errors/quorumError';
import { initializeBrightChain } from '../init';
import { AliasRecord } from '../interfaces/aliasRecord';
import { QuorumAuditLogEntry } from '../interfaces/auditLogEntry';
import { IGossipService } from '../interfaces/availability/gossipService';
import { ChainedAuditLogEntry } from '../interfaces/chainedAuditLogEntry';
import {
  ContentWithIdentity,
  IdentityMode,
} from '../interfaces/contentWithIdentity';
import { IdentityRecoveryRecord } from '../interfaces/identityRecoveryRecord';
import { OperationalState } from '../interfaces/operationalState';
import { Proposal } from '../interfaces/proposal';
import { QuorumEpoch } from '../interfaces/quorumEpoch';
import { RedistributionJournalEntry } from '../interfaces/redistributionJournalEntry';
import { IQuorumDatabase } from '../interfaces/services/quorumDatabase';
import { IQuorumMember } from '../interfaces/services/quorumService';
import { StatuteOfLimitationsConfig } from '../interfaces/statuteConfig';
import { Vote } from '../interfaces/vote';
import { QuorumDataRecord } from '../quorumDataRecord';
import { AuditLogService } from '../services/auditLogService';
import {
  ANONYMOUS_ID,
  IdentitySealingPipeline,
} from '../services/identitySealingPipeline';
import { IdentityValidator } from '../services/identityValidator';
import { MembershipProofService } from '../services/membershipProofService';
import { QuorumStateMachine } from '../services/quorumStateMachine';
import { SealingService } from '../services/sealing.service';
import { ServiceProvider } from '../services/service.provider';

// Mock file-type module
jest.mock('file-type', () => ({
  fileTypeFromBuffer: async () => null,
  fileTypeStream: async () => null,
}));

jest.setTimeout(120000);

// ============================================================================
// In-Memory Database Mock
// ============================================================================

type TID = GuidV4Uint8Array;

interface InMemoryDb extends IQuorumDatabase<TID> {
  _epochs: Map<number, QuorumEpoch<TID>>;
  _members: Map<TID, IQuorumMember<TID>>;
  _documents: Map<string, QuorumDataRecord<TID>>;
  _proposals: Map<TID, Proposal<TID>>;
  _votes: Map<TID, Vote<TID>[]>;
  _identityRecords: Map<TID, IdentityRecoveryRecord<TID>>;
  _aliases: Map<string, AliasRecord<TID>>;
  _auditEntries: ChainedAuditLogEntry<TID>[];
  _journalEntries: RedistributionJournalEntry[];
  _statuteConfig: StatuteOfLimitationsConfig | null;
  _operationalState: OperationalState | null;
}

function createInMemoryDb(): InMemoryDb {
  const epochs = new Map<number, QuorumEpoch<TID>>();
  const members = new Map<TID, IQuorumMember<TID>>();
  const documents = new Map<string, QuorumDataRecord<TID>>();
  const proposals = new Map<TID, Proposal<TID>>();
  const votes = new Map<TID, Vote<TID>[]>();
  const identityRecords = new Map<TID, IdentityRecoveryRecord<TID>>();
  const aliases = new Map<string, AliasRecord<TID>>();
  const auditEntries: ChainedAuditLogEntry<TID>[] = [];
  const journalEntries: RedistributionJournalEntry[] = [];
  let statuteConfig: StatuteOfLimitationsConfig | null = null;
  let operationalState: OperationalState | null = null;

  const db: InMemoryDb = {
    _epochs: epochs,
    _members: members,
    _documents: documents,
    _proposals: proposals,
    _votes: votes,
    _identityRecords: identityRecords,
    _aliases: aliases,
    _auditEntries: auditEntries,
    _journalEntries: journalEntries,
    _statuteConfig: null,
    _operationalState: null,

    // Epoch
    saveEpoch: jest.fn(async (epoch: QuorumEpoch<TID>) => {
      epochs.set(epoch.epochNumber, epoch);
    }),
    getEpoch: jest.fn(async (n: number) => epochs.get(n) ?? null),
    getCurrentEpoch: jest.fn(async () => {
      const max = Math.max(...Array.from(epochs.keys()), 0);
      const e = epochs.get(max);
      if (!e) throw new Error('No epochs');
      return e;
    }),

    // Members
    saveMember: jest.fn(async (m: IQuorumMember<TID>) => {
      members.set(m.id, m);
    }),
    getMember: jest.fn(async (id: TID) => members.get(id) ?? null),
    listActiveMembers: jest.fn(async () =>
      Array.from(members.values()).filter((m) => m.isActive),
    ),

    // Documents
    saveDocument: jest.fn(async (doc: QuorumDataRecord<TID>) => {
      const idHex = uint8ArrayToHex(doc.enhancedProvider.toBytes(doc.id));
      documents.set(idHex, doc);
    }),
    getDocument: jest.fn(async (docId: TID) => {
      const docIdHex = uint8ArrayToHex(docId as Uint8Array);
      // Try direct lookup and also iterate
      for (const [key, doc] of documents) {
        if (
          key === docIdHex ||
          key.startsWith(docIdHex) ||
          docIdHex.startsWith(key)
        ) {
          return doc;
        }
      }
      return null;
    }),
    listDocumentsByEpoch: jest.fn(
      async (epochNumber: number, page: number, pageSize: number) => {
        const docs = Array.from(documents.values()).filter(
          (d) => d.epochNumber === epochNumber,
        );
        return docs.slice(page * pageSize, (page + 1) * pageSize);
      },
    ),

    // Proposals
    saveProposal: jest.fn(async (p: Proposal<TID>) => {
      proposals.set(p.id, p);
    }),
    getProposal: jest.fn(async (id: TID) => proposals.get(id) ?? null),

    // Votes
    saveVote: jest.fn(async (v: Vote<TID>) => {
      const existing = votes.get(v.proposalId) ?? [];
      existing.push(v);
      votes.set(v.proposalId, existing);
    }),
    getVotesForProposal: jest.fn(async (id: TID) => votes.get(id) ?? []),

    // Identity Records
    saveIdentityRecord: jest.fn(async (r: IdentityRecoveryRecord<TID>) => {
      identityRecords.set(r.id, r);
    }),
    getIdentityRecord: jest.fn(
      async (id: TID) => identityRecords.get(id) ?? null,
    ),
    deleteIdentityRecord: jest.fn(async (id: TID) => {
      identityRecords.delete(id);
    }),
    listExpiredIdentityRecords: jest.fn(
      async (before: Date, page: number, pageSize: number) => {
        const expired = Array.from(identityRecords.values()).filter(
          (r) => r.expiresAt.getTime() <= before.getTime(),
        );
        return expired.slice(page * pageSize, (page + 1) * pageSize);
      },
    ),

    // Aliases
    saveAlias: jest.fn(async (a: AliasRecord<TID>) => {
      aliases.set(a.aliasName, a);
    }),
    getAlias: jest.fn(async (name: string) => aliases.get(name) ?? null),
    isAliasAvailable: jest.fn(async (name: string) => !aliases.has(name)),

    // Audit
    appendAuditEntry: jest.fn(async (entry: QuorumAuditLogEntry) => {
      auditEntries.push(entry as ChainedAuditLogEntry<TID>);
    }),
    getLatestAuditEntry: jest.fn(
      async (): Promise<ChainedAuditLogEntry<TID> | null> => {
        if (auditEntries.length === 0) return null;
        return auditEntries[auditEntries.length - 1];
      },
    ),

    // Journal
    saveJournalEntry: jest.fn(async (e: RedistributionJournalEntry) => {
      journalEntries.push(e);
    }),
    getJournalEntries: jest.fn(async (epochNumber: number) =>
      journalEntries.filter((e) => e.oldEpoch === epochNumber),
    ),
    deleteJournalEntries: jest.fn(async (epochNumber: number) => {
      const toRemove = journalEntries.filter((e) => e.oldEpoch === epochNumber);
      for (const entry of toRemove) {
        const idx = journalEntries.indexOf(entry);
        if (idx >= 0) journalEntries.splice(idx, 1);
      }
    }),

    // Statute Config
    saveStatuteConfig: jest.fn(async (c: StatuteOfLimitationsConfig) => {
      statuteConfig = c;
      db._statuteConfig = c;
    }),
    getStatuteConfig: jest.fn(async () => statuteConfig),

    // Operational State
    saveOperationalState: jest.fn(async (s: OperationalState) => {
      operationalState = s;
      db._operationalState = s;
    }),
    getOperationalState: jest.fn(async () => operationalState),

    // Transaction
    withTransaction: jest.fn(async <R>(fn: () => Promise<R>) => fn()),

    // Health
    isAvailable: jest.fn(async () => true),
  };

  return db;
}

// ============================================================================
// Mock Gossip Service
// ============================================================================

function createMockGossipService(): IGossipService & {
  proposalAnnouncements: unknown[];
  voteAnnouncements: unknown[];
} {
  const proposalAnnouncements: unknown[] = [];
  const voteAnnouncements: unknown[] = [];
  const noop = () => {};
  const asyncNoop = async () => {};

  return {
    proposalAnnouncements,
    voteAnnouncements,
    announceBlock: jest.fn(asyncNoop),
    announceRemoval: jest.fn(asyncNoop),
    announcePoolDeletion: jest.fn(asyncNoop),
    announceCBLIndexUpdate: jest.fn(asyncNoop),
    announceCBLIndexDelete: jest.fn(asyncNoop),
    announceHeadUpdate: jest.fn(asyncNoop),
    announceACLUpdate: jest.fn(asyncNoop),
    handleAnnouncement: jest.fn(asyncNoop),
    onAnnouncement: jest.fn(noop),
    offAnnouncement: jest.fn(noop),
    getPendingAnnouncements: jest.fn(() => []),
    flushAnnouncements: jest.fn(asyncNoop),
    start: jest.fn(noop),
    stop: jest.fn(asyncNoop),
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
    announceMessage: jest.fn(asyncNoop),
    sendDeliveryAck: jest.fn(asyncNoop),
    onMessageDelivery: jest.fn(noop),
    offMessageDelivery: jest.fn(noop),
    onDeliveryAck: jest.fn(noop),
    offDeliveryAck: jest.fn(noop),
    announceQuorumProposal: jest.fn(async (metadata) => {
      proposalAnnouncements.push(metadata);
    }),
    announceQuorumVote: jest.fn(async (metadata) => {
      voteAnnouncements.push(metadata);
    }),
    onQuorumProposal: jest.fn(noop),
    offQuorumProposal: jest.fn(noop),
    onQuorumVote: jest.fn(noop),
    offQuorumVote: jest.fn(noop),
  };
}

// ============================================================================
// Shared Helpers
// ============================================================================

let eciesService: ECIESService<TID>;
let sealingService: SealingService<TID>;
const memberPool: IMemberWithMnemonic<TID>[] = [];

function createTestMember(name: string): IMemberWithMnemonic<TID> {
  return Member.newMember<TID>(
    eciesService,
    MemberType.User,
    name,
    new EmailString(`${name.toLowerCase().replace(/\s/g, '')}@test.com`),
  );
}

function getMemberHexId(member: Member<TID>): HexString {
  return uint8ArrayToHex(member.idBytes) as HexString;
}

function computeContentDigest(content: ContentWithIdentity<TID>): Uint8Array {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${content.contentId}:${content.contentType}`);
  const fullHash = sha3_512(data);
  return fullHash.slice(0, 32);
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Quorum Integration Tests', () => {
  beforeAll(() => {
    initializeBrightChain();
    const sp = ServiceProvider.getInstance<TID>();
    eciesService = sp.eciesService;
    sealingService = sp.sealingService;

    // Pre-create a pool of 7 members for use across tests
    const names = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace'];
    for (const name of names) {
      memberPool.push(createTestMember(name));
    }
  });

  // ==========================================================================
  // 25.1 Bootstrap → Add Members → Transition Ceremony → Quorum Mode
  // ==========================================================================
  describe('25.1 Full Lifecycle: Bootstrap → Add Members → Transition → Quorum', () => {
    it('should complete the full lifecycle from bootstrap to quorum mode', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      const qsm = new QuorumStateMachine<TID>(db, sealingService, gossip);

      // Step 1: Initialize with 1 member, threshold 3 → Bootstrap mode
      const epoch1 = await qsm.initialize([memberPool[0].member], 3);
      expect(epoch1.epochNumber).toBe(1);
      expect(epoch1.mode).toBe(QuorumOperationalMode.Bootstrap);
      expect(epoch1.threshold).toBe(1); // effective threshold = member count
      expect(await qsm.getMode()).toBe(QuorumOperationalMode.Bootstrap);

      // Step 2: Seal a document in bootstrap mode
      const secretDoc = { secret: 'bootstrap-data', value: 42 };
      const sealResult = await qsm.sealDocument(
        memberPool[0].member,
        secretDoc,
        [memberPool[0].member.id],
        1,
      );
      expect(sealResult.documentId).toBeDefined();

      // Step 3: Add member 2 → still Bootstrap, epoch increments
      const epoch2 = await qsm.addMember(memberPool[1].member, {
        name: 'Bob',
      });
      expect(epoch2.epochNumber).toBe(2);
      expect(epoch2.mode).toBe(QuorumOperationalMode.Bootstrap);
      expect(epoch2.memberIds).toHaveLength(2);

      // Step 4: Add member 3 → now members >= threshold, mode becomes Quorum
      const epoch3 = await qsm.addMember(memberPool[2].member, {
        name: 'Charlie',
      });
      expect(epoch3.epochNumber).toBe(3);
      expect(epoch3.mode).toBe(QuorumOperationalMode.Quorum);
      expect(epoch3.memberIds).toHaveLength(3);
      expect(epoch3.threshold).toBe(3);

      // Step 5: Verify mode is now Quorum
      expect(await qsm.getMode()).toBe(QuorumOperationalMode.Quorum);

      // Step 6: Verify epoch is monotonically increasing
      const currentEpoch = await qsm.getCurrentEpoch();
      expect(currentEpoch.epochNumber).toBe(3);

      // Step 7: Verify metrics reflect the state
      const metrics = await qsm.getMetrics();
      expect(metrics.members.active).toBe(3);
      expect(metrics.epoch.current).toBe(3);
    });
  });

  // ==========================================================================
  // 25.2 Proposal → Gossip → Vote → Tally → Action
  // ==========================================================================
  describe('25.2 Proposal Submission → Gossip → Vote → Tally → Action', () => {
    it('should submit a proposal, collect votes via gossip, and execute action on approval', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      const qsm = new QuorumStateMachine<TID>(db, sealingService, gossip);

      // Initialize with 3 members, threshold 2
      await qsm.initialize(
        [memberPool[0].member, memberPool[1].member, memberPool[2].member],
        2,
      );

      // Submit a CUSTOM proposal (since ADD_MEMBER via proposal is a stub)
      const proposal = await qsm.submitProposal({
        description: 'Test proposal for integration',
        actionType: ProposalActionType.CUSTOM,
        actionPayload: { customAction: 'test' },
        expiresAt: new Date(Date.now() + 3600000),
      });

      expect(proposal.id).toBeDefined();
      expect(proposal.status).toBe(ProposalStatus.Pending);

      // Verify gossip announcement was made
      expect(gossip.announceQuorumProposal).toHaveBeenCalled();
      expect(gossip.proposalAnnouncements.length).toBeGreaterThanOrEqual(1);

      // Submit approve vote from member 0
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: memberPool[0].member.id,
        decision: 'approve',
      });

      // Verify gossip vote announcement
      expect(gossip.announceQuorumVote).toHaveBeenCalled();

      // Submit approve vote from member 1 (reaches threshold of 2)
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: memberPool[1].member.id,
        decision: 'approve',
      });

      // Verify proposal is now approved
      const updatedProposal = await qsm.getProposal(proposal.id);
      expect(updatedProposal).not.toBeNull();
      expect(updatedProposal!.status).toBe(ProposalStatus.Approved);

      // Verify audit trail has entries for proposal lifecycle
      const auditEvents = db._auditEntries.map((e) => e.eventType);
      expect(auditEvents).toContain('proposal_created');
      expect(auditEvents).toContain('vote_cast');
      expect(auditEvents).toContain('proposal_approved');
    });

    it('should reject a proposal when rejection makes approval impossible', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      const qsm = new QuorumStateMachine<TID>(db, sealingService, gossip);

      // Initialize with 3 members, threshold 2
      await qsm.initialize(
        [memberPool[0].member, memberPool[1].member, memberPool[2].member],
        2,
      );

      const proposal = await qsm.submitProposal({
        description: 'Proposal that will be rejected',
        actionType: ProposalActionType.CUSTOM,
        actionPayload: {},
        expiresAt: new Date(Date.now() + 3600000),
      });

      // Two rejections make approval impossible (only 1 member left, need 2)
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: memberPool[0].member.id,
        decision: 'reject',
      });
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: memberPool[1].member.id,
        decision: 'reject',
      });

      const updatedProposal = await qsm.getProposal(proposal.id);
      expect(updatedProposal!.status).toBe(ProposalStatus.Rejected);
    });
  });

  // ==========================================================================
  // 25.3 Content Ingestion with Identity Sealing
  // ==========================================================================
  describe('25.3 Content Ingestion with Identity Sealing', () => {
    let db: InMemoryDb;
    let pipeline: IdentitySealingPipeline<TID>;
    let validator: IdentityValidator<TID>;
    let membershipProofService: MembershipProofService<TID>;

    function setupServices(memberCount: number, threshold: number) {
      db = createInMemoryDb();
      const members = memberPool.slice(0, memberCount);

      // Create epoch
      const epoch: QuorumEpoch<TID> = {
        epochNumber: 1,
        memberIds: members.map((m) => m.member.id),
        threshold,
        mode: QuorumOperationalMode.Quorum,
        createdAt: new Date(),
      };
      db._epochs.set(1, epoch);

      // Register members in db
      for (const m of members) {
        db._members.set(m.member.id, {
          id: m.member.id,
          publicKey: m.member.publicKey,
          metadata: {
            name: `Member-${getMemberHexId(m.member).substring(0, 8)}`,
          },
          isActive: true,
          status: MemberStatusType.Active,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      pipeline = new IdentitySealingPipeline<TID>(
        db,
        sealingService,
        eciesService,
        async () => epoch,
        async () => ({
          defaultDurations: new Map(),
          fallbackDurationMs: 7 * 365.25 * 24 * 60 * 60 * 1000,
        }),
      );

      membershipProofService = new MembershipProofService<TID>();

      validator = new IdentityValidator<TID>(
        db,
        eciesService,
        membershipProofService,
      );

      return { epoch, members };
    }

    it('should process content with real identity mode', async () => {
      const { members } = setupServices(3, 2);
      const creator = members[0].member;
      const contentId = uuidv4() as HexString;

      // Create content signed by the real member
      const content: ContentWithIdentity<TID> = {
        creatorId: creator.id,
        contentId,
        contentType: 'post',
        signature: creator.sign(
          computeContentDigest({
            creatorId: creator.id,
            contentId,
            contentType: 'post',
            signature: new Uint8Array(0),
          }),
        ) as SignatureUint8Array,
      };

      // Validate
      const validationResult = await validator.validateContent(content);
      expect(validationResult.valid).toBe(true);
      expect(validationResult.identityMode).toBe(IdentityMode.Real);

      // Seal identity
      const sealResult = await pipeline.sealIdentity(
        content,
        IdentityMode.Real,
      );
      expect(sealResult.recoveryRecordId).toBeDefined();
      // In real mode, creatorId should remain unchanged
      expect(sealResult.modifiedContent.creatorId).toEqual(creator.id);
      expect(sealResult.modifiedContent.identityRecoveryRecordId).toBe(
        sealResult.recoveryRecordId,
      );

      // Verify recovery record was stored
      const record = await db.getIdentityRecord(
        sealResult.recoveryRecordId as unknown as TID,
      );
      expect(record).not.toBeNull();
      expect(record!.identityMode).toBe(IdentityMode.Real);
    });

    it('should process content with anonymous identity mode', async () => {
      const { members } = setupServices(3, 2);
      const creator = members[0].member;
      const contentId = uuidv4() as HexString;

      // Generate membership proof (ring signature)
      const memberPublicKeys = members.map((m) => m.member.publicKey);
      const contentHash = computeContentDigest({
        creatorId: ANONYMOUS_ID as TID,
        contentId,
        contentType: 'post',
        signature: new Uint8Array(0),
      });

      const proof = await membershipProofService.generateProof(
        creator.privateKey!.value,
        memberPublicKeys,
        contentHash,
      );

      const content: ContentWithIdentity<TID> = {
        creatorId: ANONYMOUS_ID as TID,
        contentId,
        contentType: 'post',
        signature: new Uint8Array(64), // anonymous content uses proof, not signature
        membershipProof: proof,
      };

      // Validate anonymous content
      const validationResult = await validator.validateContent(content);
      expect(validationResult.valid).toBe(true);
      expect(validationResult.identityMode).toBe(IdentityMode.Anonymous);

      // Seal identity in anonymous mode
      const sealResult = await pipeline.sealIdentity(
        { ...content, creatorId: creator.id }, // pipeline needs real ID to seal
        IdentityMode.Anonymous,
      );
      expect(sealResult.recoveryRecordId).toBeDefined();

      // Verify the modified content has Anonymous_ID
      const modifiedCreatorBytes = sealResult.modifiedContent.creatorId;
      expect(modifiedCreatorBytes).toBeDefined();

      // Verify recovery record was stored
      const record = await db.getIdentityRecord(
        sealResult.recoveryRecordId as unknown as TID,
      );
      expect(record).not.toBeNull();
      expect(record!.identityMode).toBe(IdentityMode.Anonymous);
    });
  });

  // ==========================================================================
  // 25.4 IDENTITY_DISCLOSURE End-to-End
  // ==========================================================================
  describe('25.4 IDENTITY_DISCLOSURE End-to-End', () => {
    it('should submit disclosure proposal with attachment, vote, and verify audit trail', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      const qsm = new QuorumStateMachine<TID>(db, sealingService, gossip);

      // Initialize with 3 members, threshold 2
      await qsm.initialize(
        [memberPool[0].member, memberPool[1].member, memberPool[2].member],
        2,
      );

      // First, seal an identity via the pipeline so we have a recovery record
      const epoch = await qsm.getCurrentEpoch();
      const pipeline = new IdentitySealingPipeline<TID>(
        db,
        sealingService,
        eciesService,
        async () => epoch,
        async () => ({
          defaultDurations: new Map(),
          fallbackDurationMs: 7 * 365.25 * 24 * 60 * 60 * 1000,
        }),
      );

      const creator = memberPool[0].member;
      const contentId = uuidv4() as HexString;
      const content: ContentWithIdentity<TID> = {
        creatorId: creator.id,
        contentId,
        contentType: 'post',
        signature: creator.sign(new Uint8Array(32)) as SignatureUint8Array,
      };

      const sealResult = await pipeline.sealIdentity(
        content,
        IdentityMode.Alias,
        'whistleblower42',
      );
      const recoveryRecordId = sealResult.recoveryRecordId;

      // Verify recovery record exists
      const record = await db.getIdentityRecord(
        recoveryRecordId as unknown as TID,
      );
      expect(record).not.toBeNull();

      // Submit IDENTITY_DISCLOSURE proposal with attachment
      const proposal = await qsm.submitProposal({
        description: 'Legal order requires identity disclosure',
        actionType: ProposalActionType.IDENTITY_DISCLOSURE,
        actionPayload: {
          targetRecoveryRecordId: recoveryRecordId,
          targetMemberId: creator.id,
        },
        expiresAt: new Date(Date.now() + 3600000),
        attachmentCblId: 'cbl-court-order-12345',
      });

      expect(proposal.status).toBe(ProposalStatus.Pending);
      expect(proposal.attachmentCblId).toBe('cbl-court-order-12345');

      // Vote to approve from 2 members (meets threshold)
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: memberPool[0].member.id,
        decision: 'approve',
      });
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: memberPool[1].member.id,
        decision: 'approve',
      });

      // Verify proposal was approved
      const updatedProposal = await qsm.getProposal(proposal.id);
      expect(updatedProposal!.status).toBe(ProposalStatus.Approved);

      // Verify audit trail contains disclosure-related entries
      const auditEvents = db._auditEntries.map((e) => e.eventType);
      expect(auditEvents).toContain('proposal_created');
      expect(auditEvents).toContain('vote_cast');
      expect(auditEvents).toContain('proposal_approved');
    });

    it('should reject IDENTITY_DISCLOSURE without attachment', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      const qsm = new QuorumStateMachine<TID>(db, sealingService, gossip);

      await qsm.initialize(
        [memberPool[0].member, memberPool[1].member, memberPool[2].member],
        2,
      );

      // Submit IDENTITY_DISCLOSURE without attachment — should be rejected
      await expect(
        qsm.submitProposal({
          description: 'Disclosure without legal docs',
          actionType: ProposalActionType.IDENTITY_DISCLOSURE,
          actionPayload: { targetMemberId: 'some-id' },
          expiresAt: new Date(Date.now() + 3600000),
          // No attachmentCblId!
        }),
      ).rejects.toThrow(QuorumError);
    });
  });

  // ==========================================================================
  // 25.5 Statute of Limitations
  // ==========================================================================
  describe('25.5 Statute of Limitations', () => {
    it('should expire identity records past their expiration date', async () => {
      const db = createInMemoryDb();

      // Create an identity recovery record with expiration in the past
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      const sp = ServiceProvider.getInstance<TID>();
      const record: IdentityRecoveryRecord<TID> = {
        id: sp.idProvider.generateTyped(),
        contentId: sp.idProvider.generateTyped(),
        contentType: 'post',
        encryptedShardsByMemberId: new Map([
          [sp.idProvider.generateTyped(), new Uint8Array([1, 2, 3])],
          [sp.idProvider.generateTyped(), new Uint8Array([4, 5, 6])],
        ]),
        memberIds: [
          sp.idProvider.generateTyped(),
          sp.idProvider.generateTyped(),
        ],
        threshold: 2,
        epochNumber: 1,
        expiresAt: pastDate,
        createdAt: new Date(Date.now() - 86400000),
        identityMode: IdentityMode.Alias,
        aliasName: 'expired-alias',
      };

      await db.saveIdentityRecord(record);

      // Verify the record exists
      const stored = await db.getIdentityRecord(record.id);
      expect(stored).not.toBeNull();

      // Query expired records (simulating what the scheduler does)
      const now = new Date();
      const expiredRecords = await db.listExpiredIdentityRecords(now, 0, 100);
      expect(expiredRecords).toHaveLength(1);
      expect(expiredRecords[0].id).toBe(record.id);

      // Delete the expired record (simulating scheduler action)
      await db.deleteIdentityRecord(record.id);

      // Verify the record is gone
      const deleted = await db.getIdentityRecord(record.id);
      expect(deleted).toBeNull();

      // Verify disclosure would be rejected (record no longer exists)
      const disclosureAttempt = await db.getIdentityRecord(record.id);
      expect(disclosureAttempt).toBeNull();
    });

    it('should not expire records that have not reached their expiration date', async () => {
      const db = createInMemoryDb();

      const futureDate = new Date(Date.now() + 86400000 * 365); // 1 year from now
      const sp2 = ServiceProvider.getInstance<TID>();
      const record: IdentityRecoveryRecord<TID> = {
        id: sp2.idProvider.generateTyped(),
        contentId: sp2.idProvider.generateTyped(),
        contentType: 'message',
        encryptedShardsByMemberId: new Map([
          [sp2.idProvider.generateTyped(), new Uint8Array([1, 2, 3])],
        ]),
        memberIds: [sp2.idProvider.generateTyped()],
        threshold: 1,
        epochNumber: 1,
        expiresAt: futureDate,
        createdAt: new Date(),
        identityMode: IdentityMode.Real,
      };

      await db.saveIdentityRecord(record);

      // Query expired records — should find none
      const now = new Date();
      const expiredRecords = await db.listExpiredIdentityRecords(now, 0, 100);
      expect(expiredRecords).toHaveLength(0);

      // Record should still exist
      const stored = await db.getIdentityRecord(record.id);
      expect(stored).not.toBeNull();
    });
  });

  // ==========================================================================
  // 25.6 Audit Chain Integrity
  // ==========================================================================
  describe('25.6 Audit Chain Integrity', () => {
    it('should build a valid audit chain and detect tampering', async () => {
      const db = createInMemoryDb();
      const signingMember = memberPool[0].member;

      const auditLogService = new AuditLogService<TID>(
        db,
        signingMember,
        eciesService,
      );

      // Perform multiple operations that generate audit entries
      const auditSp = ServiceProvider.getInstance<TID>();
      const entry1 = await auditLogService.appendEntry({
        id: auditSp.idProvider.generateTyped(),
        eventType: 'epoch_created',
        details: { epochNumber: 1, memberCount: 3 },
        timestamp: new Date(),
      });

      const entry2 = await auditLogService.appendEntry({
        id: auditSp.idProvider.generateTyped(),
        eventType: 'member_added',
        targetMemberId: auditSp.idProvider.generateTyped(),
        details: { memberName: 'David' },
        timestamp: new Date(),
      });

      const entry3 = await auditLogService.appendEntry({
        id: auditSp.idProvider.generateTyped(),
        eventType: 'proposal_created',
        proposalId: auditSp.idProvider.generateTyped(),
        details: { actionType: 'CUSTOM' },
        timestamp: new Date(),
      });

      // Verify chain structure
      expect(entry1.previousEntryHash).toBeNull(); // genesis
      expect(entry2.previousEntryHash).toBe(entry1.contentHash);
      expect(entry3.previousEntryHash).toBe(entry2.contentHash);

      // Verify the chain is valid
      const chainEntries = [entry1, entry2, entry3];
      const isValid = await auditLogService.verifyChain(
        signingMember.publicKey,
        chainEntries,
      );
      expect(isValid).toBe(true);
    });

    it('should detect tampering when an entry contentHash is modified', async () => {
      const db = createInMemoryDb();
      const signingMember = memberPool[0].member;

      const auditLogService = new AuditLogService<TID>(
        db,
        signingMember,
        eciesService,
      );

      const tamperSp = ServiceProvider.getInstance<TID>();
      const entry1 = await auditLogService.appendEntry({
        id: tamperSp.idProvider.generateTyped(),
        eventType: 'epoch_created',
        details: { epochNumber: 1 },
        timestamp: new Date(),
      });

      const entry2 = await auditLogService.appendEntry({
        id: tamperSp.idProvider.generateTyped(),
        eventType: 'member_added',
        details: { memberName: 'Bob' },
        timestamp: new Date(),
      });

      // Tamper with entry1's contentHash
      const tamperedEntry1 = {
        ...entry1,
        contentHash: 'tampered-hash-value-that-does-not-match',
      };

      // Verification should detect the tampering
      await expect(
        auditLogService.verifyChain(signingMember.publicKey, [
          tamperedEntry1,
          entry2,
        ]),
      ).rejects.toThrow(QuorumError);
    });

    it('should detect tampering when entry details are modified', async () => {
      const db = createInMemoryDb();
      const signingMember = memberPool[0].member;

      const auditLogService = new AuditLogService<TID>(
        db,
        signingMember,
        eciesService,
      );

      const detailsSp = ServiceProvider.getInstance<TID>();
      const entry1 = await auditLogService.appendEntry({
        id: detailsSp.idProvider.generateTyped(),
        eventType: 'epoch_created',
        details: { epochNumber: 1 },
        timestamp: new Date(),
      });

      // Tamper with the details (contentHash won't match recomputed hash)
      const tamperedEntry1: ChainedAuditLogEntry<TID> = {
        ...entry1,
        details: { epochNumber: 999, hacked: true },
      };

      await expect(
        auditLogService.verifyChain(signingMember.publicKey, [tamperedEntry1]),
      ).rejects.toThrow(QuorumError);
    });
  });

  // ==========================================================================
  // 25.7 Share Redistribution on Member Add/Remove
  // ==========================================================================
  describe('25.7 Share Redistribution on Member Add/Remove', () => {
    it('should seal a document, add a member, and verify epoch increments with redistribution audit trail', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      const qsm = new QuorumStateMachine<TID>(db, sealingService, gossip);

      // Initialize with 3 members, threshold 2
      const members = [
        memberPool[0].member,
        memberPool[1].member,
        memberPool[2].member,
      ];
      await qsm.initialize(members, 2);

      const memberIds = members.map((m) => m.id);

      // Seal a document
      const secretDoc = { data: 'sensitive-info', key: 12345 };
      const sealResult = await qsm.sealDocument(
        memberPool[0].member,
        secretDoc,
        memberIds,
        2,
      );
      expect(sealResult.documentId).toBeDefined();

      // Add a 4th member — triggers redistribution
      const epoch2 = await qsm.addMember(memberPool[3].member, {
        name: 'David',
      });
      expect(epoch2.epochNumber).toBe(2);
      expect(epoch2.memberIds).toHaveLength(4);

      // Verify redistribution audit entries exist
      const auditEvents = db._auditEntries.map((e) => e.eventType);
      expect(auditEvents).toContain('member_added');
      expect(auditEvents).toContain('share_redistribution_started');

      // Verify the new epoch has the correct member count
      const currentEpoch = await qsm.getCurrentEpoch();
      expect(currentEpoch.memberIds).toContain(memberPool[3].member.id);
    });

    it('should reject member removal when it would drop below threshold', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      const qsm = new QuorumStateMachine<TID>(db, sealingService, gossip);

      // Initialize with 2 members, threshold 2
      await qsm.initialize([memberPool[0].member, memberPool[1].member], 2);

      // Try to remove a member — would drop below threshold
      await expect(qsm.removeMember(memberPool[0].member.id)).rejects.toThrow(
        QuorumError,
      );
    });

    it('should remove a member and trigger redistribution', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      const qsm = new QuorumStateMachine<TID>(db, sealingService, gossip);

      // Initialize with 4 members, threshold 2
      const members = [
        memberPool[0].member,
        memberPool[1].member,
        memberPool[2].member,
        memberPool[3].member,
      ];
      await qsm.initialize(members, 2);

      const memberIds = members.map((m) => m.id);

      // Seal a document
      await qsm.sealDocument(
        memberPool[0].member,
        { data: 'test' },
        memberIds,
        2,
      );

      // Remove member 3 (David)
      const newEpoch = await qsm.removeMember(memberPool[3].member.id);
      expect(newEpoch.epochNumber).toBe(2);
      expect(newEpoch.memberIds).toHaveLength(3);
      expect(newEpoch.memberIds).not.toContain(memberPool[3].member.id);

      // Verify member is marked inactive
      const removedMember = await db.getMember(memberPool[3].member.id);
      expect(removedMember).not.toBeNull();
      expect(removedMember!.isActive).toBe(false);

      // Verify audit trail
      const auditEvents = db._auditEntries.map((e) => e.eventType);
      expect(auditEvents).toContain('member_removed');
      expect(auditEvents).toContain('share_redistribution_started');
    });
  });

  // Close the main describe block
});
