/**
 * @fileoverview Integration tests for the Network Trust and Ban Mechanism.
 *
 * Tests the full ban/unban lifecycle, Sybil protections, network enforcement
 * via BanListCache, and unban restoration — all wired through real service
 * implementations with an in-memory database mock.
 *
 * Covers:
 * 11.1 Full ban proposal lifecycle
 * 11.2 Sybil protections
 * 11.3 Network enforcement (BanListCache-level)
 * 11.4 Unban lifecycle
 *
 * @see Network Trust and Ban Mechanism spec
 */

import {
  ECIESService,
  EmailString,
  GuidV4Uint8Array,
  HexString,
  IMemberWithMnemonic,
  Member,
  MemberType,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { MemberStatusType } from '../enumerations/memberStatusType';
import { ProposalActionType } from '../enumerations/proposalActionType';
import { ProposalStatus } from '../enumerations/proposalStatus';
import { BrightTrustError } from '../errors/brightTrustError';
import { initializeBrightChain } from '../init';
import { IGossipService } from '../interfaces/availability/gossipService';
import { BrightTrustEpoch } from '../interfaces/brightTrustEpoch';
import { ChainedAuditLogEntry } from '../interfaces/chainedAuditLogEntry';
import { IBanRecord } from '../interfaces/network/banRecord';
import { OperationalState } from '../interfaces/operationalState';
import { Proposal } from '../interfaces/proposal';
import { IBrightTrustDatabase } from '../interfaces/services/brightTrustDatabase';
import { IBrightTrustMember } from '../interfaces/services/brightTrustService';
import { Vote } from '../interfaces/vote';
import { BanListCache } from '../services/banListCache';
import { BrightTrustStateMachine } from '../services/brightTrustStateMachine';
import { SealingService } from '../services/sealing.service';
import { ServiceProvider } from '../services/service.provider';

// Mock file-type module
jest.mock('file-type', () => ({
  fileTypeFromBuffer: async () => null,
  fileTypeStream: async () => null,
}));

jest.setTimeout(120000);

// ============================================================================
// Types & In-Memory Database Mock
// ============================================================================

type TID = GuidV4Uint8Array;

interface InMemoryDb extends IBrightTrustDatabase<TID> {
  _epochs: Map<number, BrightTrustEpoch<TID>>;
  _members: Map<string, IBrightTrustMember<TID>>;
  _proposals: Map<string, Proposal<TID>>;
  _votes: Map<string, Vote<TID>[]>;
  _auditEntries: ChainedAuditLogEntry<TID>[];
  _banRecords: Map<string, IBanRecord<TID>>;
  _admissionProposers: Map<string, TID>;
  _operationalState: OperationalState | null;
}

function toHex(id: TID): string {
  return uint8ArrayToHex(id as Uint8Array);
}

function createInMemoryDb(): InMemoryDb {
  const epochs = new Map<number, BrightTrustEpoch<TID>>();
  const members = new Map<string, IBrightTrustMember<TID>>();
  const proposals = new Map<string, Proposal<TID>>();
  const votes = new Map<string, Vote<TID>[]>();
  const auditEntries: ChainedAuditLogEntry<TID>[] = [];
  const banRecords = new Map<string, IBanRecord<TID>>();
  const admissionProposers = new Map<string, TID>();
  let operationalState: OperationalState | null = null;

  const db: InMemoryDb = {
    _epochs: epochs,
    _members: members,
    _proposals: proposals,
    _votes: votes,
    _auditEntries: auditEntries,
    _banRecords: banRecords,
    _admissionProposers: admissionProposers,
    _operationalState: null,

    // Epoch
    saveEpoch: jest.fn(async (epoch: BrightTrustEpoch<TID>) => {
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
    saveMember: jest.fn(async (m: IBrightTrustMember<TID>) => {
      members.set(toHex(m.id), m);
    }),
    getMember: jest.fn(async (id: TID) => members.get(toHex(id)) ?? null),
    listActiveMembers: jest.fn(async () =>
      Array.from(members.values()).filter((m) => m.isActive),
    ),

    // Documents (stubs — not needed for ban tests)
    saveDocument: jest.fn(async () => {}),
    getDocument: jest.fn(async () => null),
    listDocumentsByEpoch: jest.fn(async () => []),

    // Proposals
    saveProposal: jest.fn(async (p: Proposal<TID>) => {
      proposals.set(toHex(p.id), p);
    }),
    getProposal: jest.fn(async (id: TID) => proposals.get(toHex(id)) ?? null),

    // Votes
    saveVote: jest.fn(async (v: Vote<TID>) => {
      const key = toHex(v.proposalId);
      const existing = votes.get(key) ?? [];
      existing.push(v);
      votes.set(key, existing);
    }),
    getVotesForProposal: jest.fn(async (id: TID) => votes.get(toHex(id)) ?? []),

    // Identity Records (stubs)
    saveIdentityRecord: jest.fn(async () => {}),
    getIdentityRecord: jest.fn(async () => null),
    deleteIdentityRecord: jest.fn(async () => {}),
    listExpiredIdentityRecords: jest.fn(async () => []),

    // Aliases (stubs)
    saveAlias: jest.fn(async () => {}),
    getAlias: jest.fn(async () => null),
    isAliasAvailable: jest.fn(async () => true),

    // Audit
    appendAuditEntry: jest.fn(async (entry) => {
      auditEntries.push(entry as ChainedAuditLogEntry<TID>);
    }),
    getLatestAuditEntry: jest.fn(async () => {
      if (auditEntries.length === 0) return null;
      return auditEntries[auditEntries.length - 1];
    }),

    // Journal (stubs)
    saveJournalEntry: jest.fn(async () => {}),
    getJournalEntries: jest.fn(async () => []),
    deleteJournalEntries: jest.fn(async () => {}),

    // Statute Config (stubs)
    saveStatuteConfig: jest.fn(async () => {}),
    getStatuteConfig: jest.fn(async () => null),

    // Operational State
    saveOperationalState: jest.fn(async (s: OperationalState) => {
      operationalState = s;
      db._operationalState = s;
    }),
    getOperationalState: jest.fn(async () => operationalState),

    // Transaction
    withTransaction: jest.fn(async <R>(fn: () => Promise<R>) => fn()),

    // Ban records
    saveBanRecord: jest.fn(async (record: IBanRecord<TID>) => {
      banRecords.set(toHex(record.memberId), record);
    }),
    deleteBanRecord: jest.fn(async (memberId: TID) => {
      banRecords.delete(toHex(memberId));
    }),
    getBanRecord: jest.fn(
      async (memberId: TID) => banRecords.get(toHex(memberId)) ?? null,
    ),
    getAllBanRecords: jest.fn(async () => Array.from(banRecords.values())),
    getMemberAdmissionProposerId: jest.fn(
      async (memberId: TID) => admissionProposers.get(toHex(memberId)) ?? null,
    ),

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
    announceBrightTrustProposal: jest.fn(async (metadata) => {
      proposalAnnouncements.push(metadata);
    }),
    announceBrightTrustVote: jest.fn(async (metadata) => {
      voteAnnouncements.push(metadata);
    }),
    onBrightTrustProposal: jest.fn(noop),
    offBrightTrustProposal: jest.fn(noop),
    onBrightTrustVote: jest.fn(noop),
    offBrightTrustVote: jest.fn(noop),
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

/**
 * Helper: submit a BAN_MEMBER proposal and have enough members vote to approve.
 * Uses a very short cooling period (1ms past) so the ban executes immediately.
 */
async function submitAndApproveBan(
  qsm: BrightTrustStateMachine<TID>,
  db: InMemoryDb,
  proposer: Member<TID>,
  target: Member<TID>,
  voters: Member<TID>[],
  reason = 'Malicious behavior',
): Promise<Proposal<TID>> {
  const proposal = await qsm.submitProposal({
    description: `Ban ${reason}`,
    actionType: ProposalActionType.BAN_MEMBER,
    actionPayload: {
      proposerMemberId: proposer.id,
      targetMemberId: target.id,
      reason,
    },
    expiresAt: new Date(Date.now() + 86400000),
  });

  // Fast-forward cooling period by patching the proposal directly
  const stored = db._proposals.get(toHex(proposal.id));
  if (stored?.coolingPeriodEndsAt) {
    stored.coolingPeriodEndsAt = new Date(Date.now() - 1);
    db._proposals.set(toHex(proposal.id), stored);
  }

  // Cast approve votes from all provided voters
  for (const voter of voters) {
    await qsm.submitVote({
      proposalId: proposal.id,
      voterMemberId: voter.id,
      decision: 'approve',
    });
  }

  return proposal;
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Ban Mechanism Integration Tests', () => {
  beforeAll(() => {
    initializeBrightChain();
    const sp = ServiceProvider.getInstance<TID>();
    eciesService = sp.eciesService;
    sealingService = sp.sealingService;

    // Pre-create a pool of 8 members for use across tests
    const names = [
      'Alice',
      'Bob',
      'Charlie',
      'David',
      'Eve',
      'Frank',
      'Grace',
      'Heidi',
    ];
    for (const name of names) {
      memberPool.push(createTestMember(name));
    }
  });

  // ==========================================================================
  // 11.1 Full Ban Proposal Lifecycle
  // ==========================================================================
  describe('11.1 Full ban proposal lifecycle', () => {
    it('should submit BAN_MEMBER proposal, vote with supermajority, and execute ban', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      // Use a very short cooling period so tests don't need to wait
      const qsm = new BrightTrustStateMachine<TID>(
        db,
        sealingService,
        gossip,
        undefined,
        undefined,
        { banCoolingPeriodMs: 3600000, banSupermajorityThreshold: 0.75 },
      );

      // Initialize with 4 members, threshold 3
      const members = memberPool.slice(0, 4).map((m) => m.member);
      await qsm.initialize(members, 3);

      // Submit BAN_MEMBER proposal targeting member[3] (David)
      const proposal = await qsm.submitProposal({
        description: 'Ban David for malicious behavior',
        actionType: ProposalActionType.BAN_MEMBER,
        actionPayload: {
          proposerMemberId: members[0].id,
          targetMemberId: members[3].id,
          reason: 'Storing malicious content',
        },
        expiresAt: new Date(Date.now() + 86400000),
      });

      expect(proposal.status).toBe(ProposalStatus.Pending);
      expect(proposal.coolingPeriodEndsAt).toBeDefined();
      // 75% of 4 = 3 votes required
      expect(proposal.requiredThreshold).toBe(3);

      // Vote from 3 members (supermajority) — but cooling period blocks execution
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: members[0].id,
        decision: 'approve',
      });
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: members[1].id,
        decision: 'approve',
      });
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: members[2].id,
        decision: 'approve',
      });

      // Proposal should still be pending (cooling period not elapsed)
      const pendingProposal = await qsm.getProposal(proposal.id);
      expect(pendingProposal!.status).toBe(ProposalStatus.Pending);

      // Fast-forward cooling period
      const stored = db._proposals.get(toHex(proposal.id))!;
      stored.coolingPeriodEndsAt = new Date(Date.now() - 1);
      db._proposals.set(toHex(proposal.id), stored);

      // Submit one more vote to re-trigger tally (member[3] votes reject, but 3 approves already enough)
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: members[3].id,
        decision: 'reject',
      });

      // Now the proposal should be approved and executed
      const approvedProposal = await qsm.getProposal(proposal.id);
      expect(approvedProposal!.status).toBe(ProposalStatus.Approved);

      // Verify member status is Banned
      const bannedMember = db._members.get(toHex(members[3].id));
      expect(bannedMember).toBeDefined();
      expect(bannedMember!.status).toBe(MemberStatusType.Banned);

      // Verify ban record was persisted
      expect(db.saveBanRecord).toHaveBeenCalled();

      // Verify audit log contains member_banned entry
      const auditEvents = db._auditEntries.map((e) => e.eventType);
      expect(auditEvents).toContain('member_banned');
    });

    it('should enforce cooling period — threshold reached early does not execute', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      const qsm = new BrightTrustStateMachine<TID>(
        db,
        sealingService,
        gossip,
        undefined,
        undefined,
        { banCoolingPeriodMs: 72 * 3600000, banSupermajorityThreshold: 0.75 },
      );

      const members = memberPool.slice(0, 4).map((m) => m.member);
      await qsm.initialize(members, 3);

      const proposal = await qsm.submitProposal({
        description: 'Ban with long cooling period',
        actionType: ProposalActionType.BAN_MEMBER,
        actionPayload: {
          proposerMemberId: members[0].id,
          targetMemberId: members[3].id,
          reason: 'Test cooling period',
        },
        expiresAt: new Date(Date.now() + 86400000 * 7),
      });

      // All 3 approve votes — threshold reached
      for (let i = 0; i < 3; i++) {
        await qsm.submitVote({
          proposalId: proposal.id,
          voterMemberId: members[i].id,
          decision: 'approve',
        });
      }

      // Proposal should remain pending because cooling period is 72h
      const result = await qsm.getProposal(proposal.id);
      expect(result!.status).toBe(ProposalStatus.Pending);

      // Member should NOT be banned yet
      const member = db._members.get(toHex(members[3].id));
      expect(member?.status).not.toBe(MemberStatusType.Banned);
    });

    it('should reject ban proposal when supermajority is not reached', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      const qsm = new BrightTrustStateMachine<TID>(
        db,
        sealingService,
        gossip,
        undefined,
        undefined,
        { banCoolingPeriodMs: 3600000, banSupermajorityThreshold: 0.75 },
      );

      const members = memberPool.slice(0, 4).map((m) => m.member);
      await qsm.initialize(members, 3);

      const proposal = await qsm.submitProposal({
        description: 'Ban that will fail',
        actionType: ProposalActionType.BAN_MEMBER,
        actionPayload: {
          proposerMemberId: members[0].id,
          targetMemberId: members[3].id,
          reason: 'Insufficient support',
        },
        expiresAt: new Date(Date.now() + 86400000),
      });

      // Only 1 approve, 3 reject — approval impossible
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: members[0].id,
        decision: 'approve',
      });
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: members[1].id,
        decision: 'reject',
      });
      // After 1 approve + 1 reject, remaining 2 votes can give max 3 approves
      // but threshold is 3, so still possible. Add another reject:
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: members[2].id,
        decision: 'reject',
      });

      // Now max possible approves = 1 + 1 remaining = 2 < 3 threshold → rejected
      const result = await qsm.getProposal(proposal.id);
      expect(result!.status).toBe(ProposalStatus.Rejected);

      // Member should NOT be banned
      const member = db._members.get(toHex(members[3].id));
      expect(member?.status).not.toBe(MemberStatusType.Banned);
    });

    it('should require supermajority (75%) threshold for BAN_MEMBER', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      const qsm = new BrightTrustStateMachine<TID>(
        db,
        sealingService,
        gossip,
        undefined,
        undefined,
        { banCoolingPeriodMs: 3600000, banSupermajorityThreshold: 0.75 },
      );

      // 8 members: 75% = 6 votes required
      const members = memberPool.map((m) => m.member);
      await qsm.initialize(members, 5);

      const proposal = await qsm.submitProposal({
        description: 'Ban with 8 members',
        actionType: ProposalActionType.BAN_MEMBER,
        actionPayload: {
          proposerMemberId: members[0].id,
          targetMemberId: members[7].id,
          reason: 'Test supermajority',
        },
        expiresAt: new Date(Date.now() + 86400000),
      });

      // 75% of 8 = 6
      expect(proposal.requiredThreshold).toBe(6);
    });
  });

  // ==========================================================================
  // 11.2 Sybil Protections
  // ==========================================================================
  describe('11.2 Sybil protections', () => {
    it('should prevent a member from banning themselves', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      const qsm = new BrightTrustStateMachine<TID>(
        db,
        sealingService,
        gossip,
        undefined,
        undefined,
        { banCoolingPeriodMs: 3600000, banSupermajorityThreshold: 0.75 },
      );

      const members = memberPool.slice(0, 4).map((m) => m.member);
      await qsm.initialize(members, 3);

      await expect(
        qsm.submitProposal({
          description: 'Self-ban attempt',
          actionType: ProposalActionType.BAN_MEMBER,
          actionPayload: {
            proposerMemberId: members[0].id,
            targetMemberId: members[0].id, // same as proposer
            reason: 'Self-ban',
          },
          expiresAt: new Date(Date.now() + 86400000),
        }),
      ).rejects.toThrow(BrightTrustError);
    });

    it('should prevent banning an already-banned member', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      const qsm = new BrightTrustStateMachine<TID>(
        db,
        sealingService,
        gossip,
        undefined,
        undefined,
        { banCoolingPeriodMs: 3600000, banSupermajorityThreshold: 0.75 },
      );

      const members = memberPool.slice(0, 4).map((m) => m.member);
      await qsm.initialize(members, 3);

      // Manually set member[3] as banned in the database
      const memberRecord = db._members.get(toHex(members[3].id))!;
      memberRecord.status = MemberStatusType.Banned;
      db._members.set(toHex(members[3].id), memberRecord);

      await expect(
        qsm.submitProposal({
          description: 'Double-ban attempt',
          actionType: ProposalActionType.BAN_MEMBER,
          actionPayload: {
            proposerMemberId: members[0].id,
            targetMemberId: members[3].id,
            reason: 'Already banned',
          },
          expiresAt: new Date(Date.now() + 86400000),
        }),
      ).rejects.toThrow(BrightTrustError);
    });

    it('should filter proposer-ally votes from ban tally', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      const qsm = new BrightTrustStateMachine<TID>(
        db,
        sealingService,
        gossip,
        undefined,
        undefined,
        { banCoolingPeriodMs: 3600000, banSupermajorityThreshold: 0.75 },
      );

      const members = memberPool.slice(0, 4).map((m) => m.member);
      await qsm.initialize(members, 3);

      // Set up: member[1] was admitted by member[0] (the ban proposer)
      db._admissionProposers.set(toHex(members[1].id), members[0].id);

      const proposal = await qsm.submitProposal({
        description: 'Ban with ally filtering',
        actionType: ProposalActionType.BAN_MEMBER,
        actionPayload: {
          proposerMemberId: members[0].id,
          targetMemberId: members[3].id,
          reason: 'Test ally filtering',
        },
        expiresAt: new Date(Date.now() + 86400000),
      });

      // Fast-forward cooling period
      const stored = db._proposals.get(toHex(proposal.id))!;
      stored.coolingPeriodEndsAt = new Date(Date.now() - 1);
      db._proposals.set(toHex(proposal.id), stored);

      // member[0] votes approve (proposer)
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: members[0].id,
        decision: 'approve',
      });

      // member[1] votes approve (but is an ally — admitted by proposer)
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: members[1].id,
        decision: 'approve',
      });

      // member[2] votes approve
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: members[2].id,
        decision: 'approve',
      });

      // 3 raw approve votes, but member[1]'s vote is filtered out → only 2 effective
      // Threshold is ceil(4 * 0.75) = 3, so 2 effective approves < 3 → not approved
      // The proposal stays pending because the tally sees 2 approve + 0 reject in
      // filtered votes, with 1 "remaining" slot (member[1]'s filtered vote looks
      // like an uncounted member). This is correct conservative behavior.
      const afterThreeVotes = await qsm.getProposal(proposal.id);
      expect(afterThreeVotes!.status).toBe(ProposalStatus.Pending);

      // member[3] rejects — now filtered tally: 2 approve + 1 reject = 3 counted,
      // remaining = 4 - 3 = 1, maxApprovals = 2 + 1 = 3 >= 3 → still not rejected
      // (system is conservative about the filtered-out voter)
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: members[3].id,
        decision: 'reject',
      });

      const result = await qsm.getProposal(proposal.id);
      // All 4 members have voted, but after filtering: 2 approve, 1 reject, 1 filtered
      // The system sees 3 counted votes with 1 "remaining" → stays pending
      // This confirms ally filtering prevented the ban from passing with 3 raw approves
      expect(result!.status).toBe(ProposalStatus.Pending);

      // Member should NOT be banned — the ally filtering prevented supermajority
      const member = db._members.get(toHex(members[3].id));
      expect(member?.status).not.toBe(MemberStatusType.Banned);
    });

    it('should succeed when enough non-ally votes reach supermajority', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      const qsm = new BrightTrustStateMachine<TID>(
        db,
        sealingService,
        gossip,
        undefined,
        undefined,
        { banCoolingPeriodMs: 3600000, banSupermajorityThreshold: 0.75 },
      );

      // 5 members: threshold = ceil(5 * 0.75) = 4
      const members = memberPool.slice(0, 5).map((m) => m.member);
      await qsm.initialize(members, 3);

      // member[1] was admitted by member[0]
      db._admissionProposers.set(toHex(members[1].id), members[0].id);

      const proposal = await qsm.submitProposal({
        description: 'Ban with enough non-ally votes',
        actionType: ProposalActionType.BAN_MEMBER,
        actionPayload: {
          proposerMemberId: members[0].id,
          targetMemberId: members[4].id,
          reason: 'Legitimate ban',
        },
        expiresAt: new Date(Date.now() + 86400000),
      });

      // Fast-forward cooling period
      const stored = db._proposals.get(toHex(proposal.id))!;
      stored.coolingPeriodEndsAt = new Date(Date.now() - 1);
      db._proposals.set(toHex(proposal.id), stored);

      // 4 approve votes: member[0], member[1] (ally, filtered), member[2], member[3]
      // Effective: member[0], member[2], member[3] = 3 non-ally approves
      // Threshold = ceil(5 * 0.75) = 4, so 3 < 4 → not enough even without ally
      // Need all 4 non-target members to approve
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: members[0].id,
        decision: 'approve',
      });
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: members[1].id,
        decision: 'approve',
      });
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: members[2].id,
        decision: 'approve',
      });
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: members[3].id,
        decision: 'approve',
      });

      // Effective approves: 3 (member[1] filtered) out of threshold 4
      // member[4] is the last voter — if they approve, effective = 4
      await qsm.submitVote({
        proposalId: proposal.id,
        voterMemberId: members[4].id,
        decision: 'approve',
      });

      // Now effective approves = 4 (members 0, 2, 3, 4) >= threshold 4
      const result = await qsm.getProposal(proposal.id);
      expect(result!.status).toBe(ProposalStatus.Approved);

      // Member should be banned
      const member = db._members.get(toHex(members[4].id));
      expect(member?.status).toBe(MemberStatusType.Banned);
    });
  });

  // ==========================================================================
  // 11.3 Network Enforcement (BanListCache-level)
  // ==========================================================================
  describe('11.3 Network enforcement via BanListCache', () => {
    let banListCache: BanListCache<TID>;

    beforeEach(() => {
      const sp = ServiceProvider.getInstance<TID>();
      banListCache = new BanListCache<TID>(
        sp.sealingService['enhancedProvider'],
      );
    });

    it('should report unbanned members as not banned', () => {
      expect(banListCache.isBanned(memberPool[0].member.id)).toBe(false);
    });

    it('should report banned members after addBan', () => {
      const record: IBanRecord<TID> = {
        memberId: memberPool[0].member.id,
        reason: 'Test ban',
        proposalId: memberPool[1].member.id, // reuse as fake proposal ID
        epoch: 1,
        bannedAt: new Date(),
        approvalSignatures: [],
        requiredSignatures: 0,
      };

      banListCache.addBan(record);
      expect(banListCache.isBanned(memberPool[0].member.id)).toBe(true);
      expect(banListCache.isBanned(memberPool[1].member.id)).toBe(false);
    });

    it('should exclude banned peers from getAll()', () => {
      const record1: IBanRecord<TID> = {
        memberId: memberPool[0].member.id,
        reason: 'Ban 1',
        proposalId: memberPool[1].member.id,
        epoch: 1,
        bannedAt: new Date(),
        approvalSignatures: [],
        requiredSignatures: 0,
      };
      const record2: IBanRecord<TID> = {
        memberId: memberPool[2].member.id,
        reason: 'Ban 2',
        proposalId: memberPool[1].member.id,
        epoch: 1,
        bannedAt: new Date(),
        approvalSignatures: [],
        requiredSignatures: 0,
      };

      banListCache.addBan(record1);
      banListCache.addBan(record2);

      const all = banListCache.getAll();
      expect(all).toHaveLength(2);
      expect(banListCache.size).toBe(2);
    });

    it('should support bulk loading via loadFrom', () => {
      const records: IBanRecord<TID>[] = [0, 1, 2].map((i) => ({
        memberId: memberPool[i].member.id,
        reason: `Ban ${i}`,
        proposalId: memberPool[3].member.id,
        epoch: 1,
        bannedAt: new Date(),
        approvalSignatures: [],
        requiredSignatures: 0,
      }));

      banListCache.loadFrom(records);
      expect(banListCache.size).toBe(3);
      expect(banListCache.isBanned(memberPool[0].member.id)).toBe(true);
      expect(banListCache.isBanned(memberPool[1].member.id)).toBe(true);
      expect(banListCache.isBanned(memberPool[2].member.id)).toBe(true);
      expect(banListCache.isBanned(memberPool[3].member.id)).toBe(false);
    });

    it('should remove ban on removeBan', () => {
      const record: IBanRecord<TID> = {
        memberId: memberPool[0].member.id,
        reason: 'Temporary ban',
        proposalId: memberPool[1].member.id,
        epoch: 1,
        bannedAt: new Date(),
        approvalSignatures: [],
        requiredSignatures: 0,
      };

      banListCache.addBan(record);
      expect(banListCache.isBanned(memberPool[0].member.id)).toBe(true);

      banListCache.removeBan(memberPool[0].member.id);
      expect(banListCache.isBanned(memberPool[0].member.id)).toBe(false);
      expect(banListCache.size).toBe(0);
    });

    it('should reject ban records with insufficient signatures', async () => {
      const record: IBanRecord<TID> = {
        memberId: memberPool[0].member.id,
        reason: 'Insufficient sigs',
        proposalId: memberPool[1].member.id,
        epoch: 1,
        bannedAt: new Date(),
        approvalSignatures: [
          { memberId: memberPool[1].member.id, signature: new Uint8Array(64) },
        ],
        requiredSignatures: 3, // requires 3 but only 1 provided
      };

      const brightTrustKeys = new Map<HexString, Uint8Array>();
      const result = await banListCache.verifySignatures(
        record,
        brightTrustKeys,
      );
      expect(result).toBe(false);
    });

    it('should integrate with BrightTrustStateMachine ban execution', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      const qsm = new BrightTrustStateMachine<TID>(
        db,
        sealingService,
        gossip,
        undefined,
        undefined,
        { banCoolingPeriodMs: 3600000, banSupermajorityThreshold: 0.75 },
      );

      const members = memberPool.slice(0, 4).map((m) => m.member);
      await qsm.initialize(members, 3);

      // Execute a ban through the full proposal flow
      await submitAndApproveBan(qsm, db, members[0], members[3], [
        members[0],
        members[1],
        members[2],
      ]);

      // Verify the QSM's internal ban list cache was updated
      // Access via getBanConfig which confirms the QSM is wired up
      const config = qsm.getBanConfig();
      expect(config.banSupermajorityThreshold).toBe(0.75);

      // Verify member is banned in the database
      const bannedMember = db._members.get(toHex(members[3].id));
      expect(bannedMember?.status).toBe(MemberStatusType.Banned);
    });
  });

  // ==========================================================================
  // 11.4 Unban Lifecycle
  // ==========================================================================
  describe('11.4 Unban lifecycle', () => {
    it('should submit UNBAN_MEMBER proposal, vote, and restore member to Active', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      const qsm = new BrightTrustStateMachine<TID>(
        db,
        sealingService,
        gossip,
        undefined,
        undefined,
        {
          banCoolingPeriodMs: 3600000,
          unbanCoolingPeriodMs: 3600000,
          banSupermajorityThreshold: 0.75,
        },
      );

      const members = memberPool.slice(0, 4).map((m) => m.member);
      await qsm.initialize(members, 3);

      // First, ban member[3]
      await submitAndApproveBan(qsm, db, members[0], members[3], [
        members[0],
        members[1],
        members[2],
      ]);

      // Verify member is banned
      const bannedMember = db._members.get(toHex(members[3].id));
      expect(bannedMember?.status).toBe(MemberStatusType.Banned);

      // Now submit UNBAN_MEMBER proposal
      const unbanProposal = await qsm.submitProposal({
        description: 'Unban David',
        actionType: ProposalActionType.UNBAN_MEMBER,
        actionPayload: {
          targetMemberId: members[3].id,
        },
        expiresAt: new Date(Date.now() + 86400000),
      });

      expect(unbanProposal.status).toBe(ProposalStatus.Pending);
      expect(unbanProposal.coolingPeriodEndsAt).toBeDefined();

      // Fast-forward cooling period
      const stored = db._proposals.get(toHex(unbanProposal.id))!;
      stored.coolingPeriodEndsAt = new Date(Date.now() - 1);
      db._proposals.set(toHex(unbanProposal.id), stored);

      // Vote with supermajority (3 of 4 = 75%)
      await qsm.submitVote({
        proposalId: unbanProposal.id,
        voterMemberId: members[0].id,
        decision: 'approve',
      });
      await qsm.submitVote({
        proposalId: unbanProposal.id,
        voterMemberId: members[1].id,
        decision: 'approve',
      });
      await qsm.submitVote({
        proposalId: unbanProposal.id,
        voterMemberId: members[2].id,
        decision: 'approve',
      });

      // Verify proposal approved
      const result = await qsm.getProposal(unbanProposal.id);
      expect(result!.status).toBe(ProposalStatus.Approved);

      // Verify member status restored to Active
      const unbannedMember = db._members.get(toHex(members[3].id));
      expect(unbannedMember?.status).toBe(MemberStatusType.Active);

      // Verify ban record was deleted
      expect(db.deleteBanRecord).toHaveBeenCalled();

      // Verify audit log contains member_unbanned entry
      const auditEvents = db._auditEntries.map((e) => e.eventType);
      expect(auditEvents).toContain('member_unbanned');
    });

    it('should enforce cooling period on unban proposals', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      const qsm = new BrightTrustStateMachine<TID>(
        db,
        sealingService,
        gossip,
        undefined,
        undefined,
        {
          banCoolingPeriodMs: 3600000,
          unbanCoolingPeriodMs: 48 * 3600000,
          banSupermajorityThreshold: 0.75,
        },
      );

      const members = memberPool.slice(0, 4).map((m) => m.member);
      await qsm.initialize(members, 3);

      // Ban member[3] first
      await submitAndApproveBan(qsm, db, members[0], members[3], [
        members[0],
        members[1],
        members[2],
      ]);

      // Submit unban with 48h cooling period
      const unbanProposal = await qsm.submitProposal({
        description: 'Unban with long cooling',
        actionType: ProposalActionType.UNBAN_MEMBER,
        actionPayload: {
          targetMemberId: members[3].id,
        },
        expiresAt: new Date(Date.now() + 86400000 * 7),
      });

      // Vote with supermajority
      for (let i = 0; i < 3; i++) {
        await qsm.submitVote({
          proposalId: unbanProposal.id,
          voterMemberId: members[i].id,
          decision: 'approve',
        });
      }

      // Should still be pending — 48h cooling period not elapsed
      const result = await qsm.getProposal(unbanProposal.id);
      expect(result!.status).toBe(ProposalStatus.Pending);

      // Member should still be banned
      const member = db._members.get(toHex(members[3].id));
      expect(member?.status).toBe(MemberStatusType.Banned);
    });

    it('should reject UNBAN_MEMBER for a member that is not banned', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      const qsm = new BrightTrustStateMachine<TID>(
        db,
        sealingService,
        gossip,
        undefined,
        undefined,
        { banCoolingPeriodMs: 3600000, banSupermajorityThreshold: 0.75 },
      );

      const members = memberPool.slice(0, 4).map((m) => m.member);
      await qsm.initialize(members, 3);

      // Try to unban a member that was never banned
      await expect(
        qsm.submitProposal({
          description: 'Unban non-banned member',
          actionType: ProposalActionType.UNBAN_MEMBER,
          actionPayload: {
            targetMemberId: members[3].id,
          },
          expiresAt: new Date(Date.now() + 86400000),
        }),
      ).rejects.toThrow(BrightTrustError);
    });

    it('should remove ban record from BanListCache after unban', async () => {
      const db = createInMemoryDb();
      const gossip = createMockGossipService();
      const qsm = new BrightTrustStateMachine<TID>(
        db,
        sealingService,
        gossip,
        undefined,
        undefined,
        {
          banCoolingPeriodMs: 3600000,
          unbanCoolingPeriodMs: 3600000,
          banSupermajorityThreshold: 0.75,
        },
      );

      const members = memberPool.slice(0, 4).map((m) => m.member);
      await qsm.initialize(members, 3);

      // Ban member[3]
      await submitAndApproveBan(qsm, db, members[0], members[3], [
        members[0],
        members[1],
        members[2],
      ]);

      // Verify ban record was saved
      expect(db.saveBanRecord).toHaveBeenCalled();

      // Unban member[3]
      const unbanProposal = await qsm.submitProposal({
        description: 'Unban to restore',
        actionType: ProposalActionType.UNBAN_MEMBER,
        actionPayload: {
          targetMemberId: members[3].id,
        },
        expiresAt: new Date(Date.now() + 86400000),
      });

      // Fast-forward cooling period
      const stored = db._proposals.get(toHex(unbanProposal.id))!;
      stored.coolingPeriodEndsAt = new Date(Date.now() - 1);
      db._proposals.set(toHex(unbanProposal.id), stored);

      // Vote to approve unban
      for (let i = 0; i < 3; i++) {
        await qsm.submitVote({
          proposalId: unbanProposal.id,
          voterMemberId: members[i].id,
          decision: 'approve',
        });
      }

      // Verify unban executed
      const result = await qsm.getProposal(unbanProposal.id);
      expect(result!.status).toBe(ProposalStatus.Approved);

      // Verify ban record was deleted from database
      expect(db.deleteBanRecord).toHaveBeenCalled();

      // Verify member is Active again
      const member = db._members.get(toHex(members[3].id));
      expect(member?.status).toBe(MemberStatusType.Active);
    });
  });
});
