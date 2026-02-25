/**
 * Unit tests for QuorumStateMachine public methods.
 *
 * These complement the property-based tests (P1, P4, P5, P6, P14, P16, P17, P18)
 * by providing targeted unit tests for public methods that lack dedicated coverage.
 */
import {
  EmailString,
  GuidV4Uint8Array,
  IMemberWithMnemonic,
  Member,
  MemberType,
  ShortHexGuid,
} from '@digitaldefiance/ecies-lib';
import { ProposalActionType } from '../enumerations/proposalActionType';
import { ProposalStatus } from '../enumerations/proposalStatus';
import { QuorumErrorType } from '../enumerations/quorumErrorType';
import { QuorumOperationalMode } from '../enumerations/quorumOperationalMode';
import { QuorumError } from '../errors/quorumError';
import { initializeBrightChain } from '../init';
import { IGossipService } from '../interfaces/availability/gossipService';
import { OperationalState } from '../interfaces/operationalState';
import { Proposal } from '../interfaces/proposal';
import { QuorumEpoch } from '../interfaces/quorumEpoch';
import { IQuorumDatabase } from '../interfaces/services/quorumDatabase';
import { IQuorumMember } from '../interfaces/services/quorumService';
import { Vote } from '../interfaces/vote';
import { QuorumStateMachine } from './quorumStateMachine';
import { SealingService } from './sealing.service';
import { ServiceProvider } from './service.provider';

jest.setTimeout(30000);

function createMockDatabase(): IQuorumDatabase<GuidV4Uint8Array> & {
  savedEpochs: QuorumEpoch<GuidV4Uint8Array>[];
  savedOperationalStates: OperationalState[];
  proposals: Map<ShortHexGuid, Proposal<GuidV4Uint8Array>>;
  votes: Map<ShortHexGuid, Vote<GuidV4Uint8Array>[]>;
  activeMembers: IQuorumMember<GuidV4Uint8Array>[];
} {
  const epochs = new Map<number, QuorumEpoch<GuidV4Uint8Array>>();
  const savedEpochs: QuorumEpoch<GuidV4Uint8Array>[] = [];
  const savedOperationalStates: OperationalState[] = [];
  const proposals = new Map<ShortHexGuid, Proposal<GuidV4Uint8Array>>();
  const votes = new Map<ShortHexGuid, Vote<GuidV4Uint8Array>[]>();
  const activeMembers: IQuorumMember<GuidV4Uint8Array>[] = [];
  let operationalState: OperationalState | null = null;

  return {
    savedEpochs,
    savedOperationalStates,
    proposals,
    votes,
    activeMembers,
    saveEpoch: jest.fn(async (epoch: QuorumEpoch<GuidV4Uint8Array>) => {
      epochs.set(epoch.epochNumber, epoch);
      savedEpochs.push(epoch);
    }),
    getEpoch: jest.fn(
      async (epochNumber: number) => epochs.get(epochNumber) ?? null,
    ),
    getCurrentEpoch: jest.fn(async () => {
      const maxEpoch = Math.max(...Array.from(epochs.keys()), 0);
      const epoch = epochs.get(maxEpoch);
      if (!epoch) throw new Error('No epochs');
      return epoch;
    }),
    saveMember: jest.fn(async (member: IQuorumMember<GuidV4Uint8Array>) => {
      const idx = activeMembers.findIndex((m) => m.id === member.id);
      if (idx >= 0) activeMembers[idx] = member;
      else activeMembers.push(member);
    }),
    getMember: jest.fn(
      async (memberId: ShortHexGuid) =>
        activeMembers.find((m) => m.id === memberId) ?? null,
    ),
    listActiveMembers: jest.fn(async () => [...activeMembers]),
    saveDocument: jest.fn(async () => {}),
    getDocument: jest.fn(async () => null),
    listDocumentsByEpoch: jest.fn(async () => []),
    saveProposal: jest.fn(async (proposal: Proposal<GuidV4Uint8Array>) => {
      proposals.set(proposal.id, proposal);
    }),
    getProposal: jest.fn(
      async (proposalId: ShortHexGuid) => proposals.get(proposalId) ?? null,
    ),
    saveVote: jest.fn(async (vote: Vote<GuidV4Uint8Array>) => {
      const existing = votes.get(vote.proposalId) ?? [];
      existing.push(vote);
      votes.set(vote.proposalId, existing);
    }),
    getVotesForProposal: jest.fn(
      async (proposalId: ShortHexGuid) => votes.get(proposalId) ?? [],
    ),
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
    saveOperationalState: jest.fn(async (state: OperationalState) => {
      operationalState = state;
      savedOperationalStates.push(state);
    }),
    getOperationalState: jest.fn(async () => operationalState),
    withTransaction: jest.fn(async <R>(fn: () => Promise<R>) => fn()),
    isAvailable: jest.fn(async () => true),
  };
}

function createMockGossipService(): IGossipService {
  const noop = () => {};
  const asyncNoop = async () => {};
  return {
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
    announceQuorumProposal: jest.fn(asyncNoop),
    announceQuorumVote: jest.fn(asyncNoop),
    onQuorumProposal: jest.fn(noop),
    offQuorumProposal: jest.fn(noop),
    onQuorumVote: jest.fn(noop),
    offQuorumVote: jest.fn(noop),
  };
}

describe('QuorumStateMachine Unit Tests', () => {
  let sealingService: SealingService<GuidV4Uint8Array>;
  const memberPool: IMemberWithMnemonic<GuidV4Uint8Array>[] = [];

  beforeAll(() => {
    initializeBrightChain();
    const sp = ServiceProvider.getInstance<GuidV4Uint8Array>();
    sealingService = sp.sealingService;
    const eciesService = sp.eciesService;

    const names = ['Alice', 'Bob', 'Charlie', 'David', 'Eve'];
    for (const name of names) {
      memberPool.push(
        Member.newMember<GuidV4Uint8Array>(
          eciesService,
          MemberType.System,
          name,
          new EmailString(`${name.toLowerCase()}@example.com`),
        ),
      );
    }
  });

  function getMembers(count: number): Member<GuidV4Uint8Array>[] {
    return memberPool.slice(0, count).map((m) => m.member);
  }

  describe('getConfiguredThreshold', () => {
    it('should return 0 before initialization', () => {
      const sm = new QuorumStateMachine(
        createMockDatabase(),
        sealingService,
        createMockGossipService(),
      );
      expect(sm.getConfiguredThreshold()).toBe(0);
    });

    it('should return the configured threshold after initialization', async () => {
      const sm = new QuorumStateMachine(
        createMockDatabase(),
        sealingService,
        createMockGossipService(),
      );
      await sm.initialize(getMembers(3), 2);
      expect(sm.getConfiguredThreshold()).toBe(2);
    });
  });

  describe('getMetrics', () => {
    it('should return default metrics before initialization', async () => {
      const sm = new QuorumStateMachine(
        createMockDatabase(),
        sealingService,
        createMockGossipService(),
      );
      const metrics = await sm.getMetrics();
      expect(metrics.proposals.total).toBe(0);
      expect(metrics.proposals.pending).toBe(0);
      expect(metrics.votes.latency_ms).toBe(0);
      expect(metrics.redistribution.progress).toBe(-1);
      expect(metrics.redistribution.failures).toBe(0);
      expect(metrics.members.active).toBe(0);
      expect(metrics.epoch.current).toBe(0);
      expect(metrics.expiration.last_run).toBeNull();
      expect(metrics.expiration.deleted_total).toBe(0);
    });

    it('should reflect active member count after initialization', async () => {
      const sm = new QuorumStateMachine(
        createMockDatabase(),
        sealingService,
        createMockGossipService(),
      );
      await sm.initialize(getMembers(3), 2);
      const metrics = await sm.getMetrics();
      expect(metrics.members.active).toBe(3);
      expect(metrics.epoch.current).toBe(1);
    });
  });

  describe('getEpoch', () => {
    it('should return null for non-existent epoch number', async () => {
      const sm = new QuorumStateMachine(
        createMockDatabase(),
        sealingService,
        createMockGossipService(),
      );
      await sm.initialize(getMembers(3), 2);
      expect(await sm.getEpoch(999)).toBeNull();
    });

    it('should return epoch 1 after initialization', async () => {
      const sm = new QuorumStateMachine(
        createMockDatabase(),
        sealingService,
        createMockGossipService(),
      );
      await sm.initialize(getMembers(3), 2);
      const epoch = await sm.getEpoch(1);
      expect(epoch).not.toBeNull();
      expect(epoch?.epochNumber).toBe(1);
    });

    it('should throw when called before initialization', async () => {
      const sm = new QuorumStateMachine(
        createMockDatabase(),
        sealingService,
        createMockGossipService(),
      );
      await expect(sm.getEpoch(1)).rejects.toThrow(QuorumError);
    });
  });

  describe('getCurrentEpoch', () => {
    it('should return epoch 1 after initialization', async () => {
      const sm = new QuorumStateMachine(
        createMockDatabase(),
        sealingService,
        createMockGossipService(),
      );
      await sm.initialize(getMembers(3), 2);
      const epoch = await sm.getCurrentEpoch();
      expect(epoch.epochNumber).toBe(1);
      expect(epoch.memberIds).toHaveLength(3);
    });

    it('should throw when called before initialization', async () => {
      const sm = new QuorumStateMachine(
        createMockDatabase(),
        sealingService,
        createMockGossipService(),
      );
      await expect(sm.getCurrentEpoch()).rejects.toThrow(QuorumError);
    });
  });

  describe('getProposal', () => {
    it('should return null for non-existent proposal', async () => {
      const sm = new QuorumStateMachine(
        createMockDatabase(),
        sealingService,
        createMockGossipService(),
      );
      await sm.initialize(getMembers(3), 2);
      expect(await sm.getProposal('nonexistent' as ShortHexGuid)).toBeNull();
    });

    it('should return a proposal after it is submitted', async () => {
      const sm = new QuorumStateMachine(
        createMockDatabase(),
        sealingService,
        createMockGossipService(),
      );
      await sm.initialize(getMembers(3), 2);

      const submitted = await sm.submitProposal({
        description: 'Test proposal',
        actionType: ProposalActionType.CUSTOM,
        actionPayload: { test: true },
        expiresAt: new Date(Date.now() + 3600000),
      });

      const retrieved = await sm.getProposal(submitted.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(submitted.id);
      expect(retrieved?.description).toBe('Test proposal');
      expect(retrieved?.status).toBe(ProposalStatus.Pending);
    });

    it('should throw when called before initialization', async () => {
      const sm = new QuorumStateMachine(
        createMockDatabase(),
        sealingService,
        createMockGossipService(),
      );
      await expect(sm.getProposal('test' as ShortHexGuid)).rejects.toThrow(
        QuorumError,
      );
    });
  });

  describe('unsealDocument', () => {
    it('should throw DocumentNotFound for non-existent document', async () => {
      const sm = new QuorumStateMachine(
        createMockDatabase(),
        sealingService,
        createMockGossipService(),
      );
      await sm.initialize(getMembers(3), 2);

      try {
        await sm.unsealDocument('nonexistent' as ShortHexGuid, []);
        fail('Expected QuorumError to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(QuorumError);
        expect((e as QuorumError).type).toBe(QuorumErrorType.DocumentNotFound);
      }
    });

    it('should throw when called before initialization', async () => {
      const sm = new QuorumStateMachine(
        createMockDatabase(),
        sealingService,
        createMockGossipService(),
      );
      await expect(
        sm.unsealDocument('test' as ShortHexGuid, []),
      ).rejects.toThrow(QuorumError);
    });
  });

  describe('getMode', () => {
    it('should return Bootstrap mode when members < threshold', async () => {
      const sm = new QuorumStateMachine(
        createMockDatabase(),
        sealingService,
        createMockGossipService(),
      );
      await sm.initialize(getMembers(1), 3);
      expect(await sm.getMode()).toBe(QuorumOperationalMode.Bootstrap);
    });

    it('should return Quorum mode when members >= threshold', async () => {
      const sm = new QuorumStateMachine(
        createMockDatabase(),
        sealingService,
        createMockGossipService(),
      );
      await sm.initialize(getMembers(3), 3);
      expect(await sm.getMode()).toBe(QuorumOperationalMode.Quorum);
    });
  });

  describe('submitProposal validation', () => {
    it('should reject proposals with description exceeding 4096 characters', async () => {
      const sm = new QuorumStateMachine(
        createMockDatabase(),
        sealingService,
        createMockGossipService(),
      );
      await sm.initialize(getMembers(3), 2);

      await expect(
        sm.submitProposal({
          description: 'x'.repeat(4097),
          actionType: ProposalActionType.CUSTOM,
          actionPayload: {},
          expiresAt: new Date(Date.now() + 3600000),
        }),
      ).rejects.toThrow();
    });
  });
});
