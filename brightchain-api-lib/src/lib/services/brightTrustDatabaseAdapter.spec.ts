/**
 * Unit tests for BrightTrustDatabaseAdapter.
 *
 * Tests CRUD round-trips for each collection, pagination,
 * listExpired filtering, transaction support, and isAvailable health check.
 */

import {
  AliasRecord,
  BlockSize,
  BrightTrustEpoch,
  BrightTrustMemberMetadata,
  BrightTrustOperationalMode,
  ChainedAuditLogEntry,
  IBrightTrustMember,
  IdentityMode,
  IdentityRecoveryRecord,
  initializeBrightChain,
  MemoryBlockStore,
  OperationalState,
  Proposal,
  ProposalActionType,
  ProposalStatus,
  RedistributionJournalEntry,
  resetInitialization,
  StatuteOfLimitationsConfig,
  Vote,
} from '@brightchain/brightchain-lib';
import { BrightDb, HeadRegistry } from '@brightchain/db';
import {
  HexString,
  IIdProvider,
  SignatureUint8Array,
} from '@digitaldefiance/ecies-lib';
import { BrightTrustDatabaseAdapter } from './brightTrustDatabaseAdapter';

// ─── Mock ID Provider ───────────────────────────────────────────────────────

/**
 * Minimal mock IIdProvider<HexString> for tests.
 * Generates 32-char hex IDs matching ShortHexGuid format.
 */
const mockIdProvider: IIdProvider<HexString> = {
  byteLength: 16,
  name: 'MockHexProvider',
  generate(): Uint8Array {
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    return bytes;
  },
  validate(id: Uint8Array): boolean {
    return id.length === 16;
  },
  serialize(id: Uint8Array): string {
    return Buffer.from(id).toString('hex');
  },
  deserialize(str: string): Uint8Array {
    return new Uint8Array(Buffer.from(str, 'hex'));
  },
  toBytes(id: HexString): Uint8Array {
    return new Uint8Array(Buffer.from(id, 'hex'));
  },
  fromBytes(bytes: Uint8Array): HexString {
    return Buffer.from(bytes).toString('hex') as HexString;
  },
  equals(a: HexString, b: HexString): boolean {
    return a === b;
  },
  clone(id: HexString): HexString {
    return id;
  },
  idToString(id: HexString): string {
    return id;
  },
  idFromString(str: string): HexString {
    return str as HexString;
  },
  parseSafe(str: string): HexString | undefined {
    return /^[0-9a-f]{32}$/.test(str) ? (str as HexString) : undefined;
  },
};

// ─── Test Helpers ───────────────────────────────────────────────────────────

function createTestDb(): BrightDb {
  const store = new MemoryBlockStore(BlockSize.Small);
  const registry = HeadRegistry.createIsolated();
  return new BrightDb(store, {
    name: 'brightTrust-test-db',
    headRegistry: registry,
    poolId: 'brightTrust-system',
  });
}

function makeHexString(suffix: string): HexString {
  // Convert suffix to hex by encoding each char as 2 hex digits, then pad to 32 chars
  const hexSuffix = Buffer.from(suffix, 'ascii').toString('hex');
  return hexSuffix.padStart(32, '0').slice(-32) as HexString;
}

function makeEpoch(
  epochNumber: number,
  memberIds: HexString[] = [],
  threshold = 2,
  mode: BrightTrustOperationalMode = BrightTrustOperationalMode.Bootstrap,
): BrightTrustEpoch<HexString> {
  return {
    epochNumber,
    memberIds,
    threshold,
    mode,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    previousEpochNumber: epochNumber > 1 ? epochNumber - 1 : undefined,
  };
}

function makeMember(
  id: HexString,
  isActive = true,
): IBrightTrustMember<HexString> {
  const metadata: BrightTrustMemberMetadata = {
    name: `Member ${id.slice(-4)}`,
    email: `member-${id.slice(-4)}@test.com`,
  };
  return {
    id,
    publicKey: new Uint8Array([1, 2, 3, 4]),
    metadata,
    isActive,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };
}

function makeProposal(
  id: HexString,
  status: ProposalStatus = ProposalStatus.Pending,
): Proposal<HexString> {
  return {
    id,
    description: 'Test proposal',
    actionType: ProposalActionType.ADD_MEMBER,
    actionPayload: { memberId: makeHexString('abc') },
    proposerMemberId: makeHexString('proposer1'),
    status,
    requiredThreshold: 2,
    expiresAt: new Date('2025-01-01T00:00:00Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    epochNumber: 1,
  };
}

function makeVote(
  proposalId: HexString,
  voterMemberId: HexString,
  decision: 'approve' | 'reject' = 'approve',
): Vote<HexString> {
  return {
    proposalId,
    voterMemberId,
    decision,
    comment: 'Test vote',
    encryptedShare:
      decision === 'approve' ? new Uint8Array([10, 20, 30]) : undefined,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  };
}

function makeIdentityRecord(
  id: HexString,
  expiresAt: Date,
): IdentityRecoveryRecord<HexString> {
  const shards = new Map<HexString, Uint8Array>();
  shards.set(makeHexString('m1'), new Uint8Array([1, 2, 3]));
  shards.set(makeHexString('m2'), new Uint8Array([4, 5, 6]));
  return {
    id,
    contentId: makeHexString('content1'),
    contentType: 'post',
    encryptedShardsByMemberId: shards as unknown as Map<HexString, Uint8Array>,
    memberIds: [makeHexString('m1'), makeHexString('m2')],
    threshold: 2,
    epochNumber: 1,
    expiresAt,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    identityMode: IdentityMode.Anonymous,
  };
}

function makeAlias(aliasName: string, isActive = true): AliasRecord<HexString> {
  return {
    aliasName,
    ownerMemberId: makeHexString('owner1'),
    aliasPublicKey: new Uint8Array([7, 8, 9]),
    identityRecoveryRecordId: makeHexString('recovery1'),
    isActive,
    registeredAt: new Date('2024-01-01T00:00:00Z'),
    epochNumber: 1,
  };
}

function makeChainedAuditEntry(
  id: HexString,
  timestamp: Date,
): ChainedAuditLogEntry<HexString> {
  return {
    id,
    eventType: 'epoch_created',
    details: { epochNumber: 1 },
    timestamp,
    previousEntryHash: null,
    contentHash: 'abc123',
    signature: new Uint8Array([11, 22, 33]) as SignatureUint8Array,
    blockId1: 'block1',
    blockId2: 'block2',
  };
}

function makeJournalEntry(
  documentId: HexString,
  oldEpoch: number,
): RedistributionJournalEntry {
  const oldShares = new Map<HexString, Uint8Array>();
  oldShares.set(makeHexString('m1'), new Uint8Array([1, 2]));
  return {
    documentId,
    oldShares,
    oldMemberIds: [makeHexString('m1')],
    oldThreshold: 1,
    oldEpoch,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('BrightTrustDatabaseAdapter', () => {
  let db: BrightDb;
  let adapter: BrightTrustDatabaseAdapter<HexString>;

  beforeAll(() => {
    initializeBrightChain();
  });

  afterAll(() => {
    resetInitialization();
  });

  beforeEach(() => {
    db = createTestDb();
    adapter = new BrightTrustDatabaseAdapter(db, mockIdProvider);
  });

  // === Epoch CRUD ===

  describe('epoch CRUD', () => {
    it('should save and retrieve an epoch', async () => {
      const epoch = makeEpoch(1, [makeHexString('m1')]);
      await adapter.saveEpoch(epoch);
      const retrieved = await adapter.getEpoch(1);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.epochNumber).toBe(1);
      expect(retrieved!.mode).toBe(BrightTrustOperationalMode.Bootstrap);
      expect(retrieved!.memberIds).toEqual([makeHexString('m1')]);
    });

    it('should return null for non-existent epoch', async () => {
      const result = await adapter.getEpoch(999);
      expect(result).toBeNull();
    });

    it('should update an existing epoch', async () => {
      const epoch = makeEpoch(1, [makeHexString('m1')]);
      await adapter.saveEpoch(epoch);
      const updated = makeEpoch(
        1,
        [makeHexString('m1'), makeHexString('m2')],
        2,
        BrightTrustOperationalMode.BrightTrust,
      );
      await adapter.saveEpoch(updated);
      const retrieved = await adapter.getEpoch(1);
      expect(retrieved!.memberIds).toHaveLength(2);
      expect(retrieved!.mode).toBe(BrightTrustOperationalMode.BrightTrust);
    });

    it('should get current epoch (highest epoch number)', async () => {
      await adapter.saveEpoch(makeEpoch(1));
      await adapter.saveEpoch(makeEpoch(2));
      await adapter.saveEpoch(makeEpoch(3));
      const current = await adapter.getCurrentEpoch();
      expect(current.epochNumber).toBe(3);
    });

    it('should throw when no epochs exist', async () => {
      await expect(adapter.getCurrentEpoch()).rejects.toThrow(
        'No epochs found',
      );
    });
  });

  // === Member CRUD ===

  describe('member CRUD', () => {
    it('should save and retrieve a member', async () => {
      const member = makeMember(makeHexString('m1'));
      await adapter.saveMember(member);
      const retrieved = await adapter.getMember(makeHexString('m1'));
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(makeHexString('m1'));
      expect(retrieved!.isActive).toBe(true);
      expect(retrieved!.metadata.name).toContain(makeHexString('m1').slice(-4));
    });

    it('should return null for non-existent member', async () => {
      const result = await adapter.getMember(makeHexString('missing'));
      expect(result).toBeNull();
    });

    it('should update an existing member', async () => {
      const member = makeMember(makeHexString('m1'));
      await adapter.saveMember(member);
      const updated = makeMember(makeHexString('m1'), false);
      await adapter.saveMember(updated);
      const retrieved = await adapter.getMember(makeHexString('m1'));
      expect(retrieved!.isActive).toBe(false);
    });

    it('should list only active members', async () => {
      await adapter.saveMember(makeMember(makeHexString('m1'), true));
      await adapter.saveMember(makeMember(makeHexString('m2'), false));
      await adapter.saveMember(makeMember(makeHexString('m3'), true));
      const active = await adapter.listActiveMembers();
      expect(active).toHaveLength(2);
      const ids = active.map((m) => m.id);
      expect(ids).toContain(makeHexString('m1'));
      expect(ids).toContain(makeHexString('m3'));
    });
  });

  // === Proposal CRUD ===

  describe('proposal CRUD', () => {
    it('should save and retrieve a proposal', async () => {
      const proposal = makeProposal(makeHexString('p1'));
      await adapter.saveProposal(proposal);
      const retrieved = await adapter.getProposal(makeHexString('p1'));
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(makeHexString('p1'));
      expect(retrieved!.status).toBe(ProposalStatus.Pending);
    });

    it('should return null for non-existent proposal', async () => {
      const result = await adapter.getProposal(makeHexString('missing'));
      expect(result).toBeNull();
    });

    it('should update an existing proposal', async () => {
      const proposal = makeProposal(makeHexString('p1'));
      await adapter.saveProposal(proposal);
      const updated = makeProposal(
        makeHexString('p1'),
        ProposalStatus.Approved,
      );
      await adapter.saveProposal(updated);
      const retrieved = await adapter.getProposal(makeHexString('p1'));
      expect(retrieved!.status).toBe(ProposalStatus.Approved);
    });
  });

  // === Vote CRUD ===

  describe('vote CRUD', () => {
    it('should save and retrieve votes for a proposal', async () => {
      const proposalId = makeHexString('p1');
      const vote1 = makeVote(proposalId, makeHexString('v1'), 'approve');
      const vote2 = makeVote(proposalId, makeHexString('v2'), 'reject');
      await adapter.saveVote(vote1);
      await adapter.saveVote(vote2);
      const votes = await adapter.getVotesForProposal(proposalId);
      expect(votes).toHaveLength(2);
      const decisions = votes.map((v) => v.decision);
      expect(decisions).toContain('approve');
      expect(decisions).toContain('reject');
    });

    it('should return empty array for proposal with no votes', async () => {
      const votes = await adapter.getVotesForProposal(makeHexString('none'));
      expect(votes).toHaveLength(0);
    });

    it('should update an existing vote (same voter, same proposal)', async () => {
      const proposalId = makeHexString('p1');
      const voterId = makeHexString('v1');
      await adapter.saveVote(makeVote(proposalId, voterId, 'reject'));
      await adapter.saveVote(makeVote(proposalId, voterId, 'approve'));
      const votes = await adapter.getVotesForProposal(proposalId);
      expect(votes).toHaveLength(1);
      expect(votes[0].decision).toBe('approve');
    });

    it('should preserve encrypted share on approve votes', async () => {
      const proposalId = makeHexString('p1');
      const vote = makeVote(proposalId, makeHexString('v1'), 'approve');
      await adapter.saveVote(vote);
      const votes = await adapter.getVotesForProposal(proposalId);
      expect(votes[0].encryptedShare).toEqual(new Uint8Array([10, 20, 30]));
    });
  });

  // === Identity Recovery Records ===

  describe('identity recovery record CRUD', () => {
    it('should save and retrieve an identity record', async () => {
      const record = makeIdentityRecord(
        makeHexString('ir1'),
        new Date('2025-06-01T00:00:00Z'),
      );
      await adapter.saveIdentityRecord(record);
      const retrieved = await adapter.getIdentityRecord(makeHexString('ir1'));
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(makeHexString('ir1'));
      expect(retrieved!.identityMode).toBe(IdentityMode.Anonymous);
      expect(retrieved!.encryptedShardsByMemberId.size).toBe(2);
    });

    it('should return null for non-existent identity record', async () => {
      const result = await adapter.getIdentityRecord(makeHexString('missing'));
      expect(result).toBeNull();
    });

    it('should delete an identity record', async () => {
      const record = makeIdentityRecord(
        makeHexString('ir1'),
        new Date('2025-06-01T00:00:00Z'),
      );
      await adapter.saveIdentityRecord(record);
      await adapter.deleteIdentityRecord(makeHexString('ir1'));
      const result = await adapter.getIdentityRecord(makeHexString('ir1'));
      expect(result).toBeNull();
    });

    it('should list expired identity records with filtering', async () => {
      const now = new Date('2024-06-01T00:00:00Z');
      // Expired: expiresAt before "now"
      const expired1 = makeIdentityRecord(
        makeHexString('ir1'),
        new Date('2024-03-01T00:00:00Z'),
      );
      const expired2 = makeIdentityRecord(
        makeHexString('ir2'),
        new Date('2024-05-01T00:00:00Z'),
      );
      // Not expired: expiresAt after "now"
      const notExpired = makeIdentityRecord(
        makeHexString('ir3'),
        new Date('2025-01-01T00:00:00Z'),
      );
      await adapter.saveIdentityRecord(expired1);
      await adapter.saveIdentityRecord(expired2);
      await adapter.saveIdentityRecord(notExpired);

      const result = await adapter.listExpiredIdentityRecords(now, 0, 10);
      expect(result).toHaveLength(2);
      const ids = result.map((r) => r.id);
      expect(ids).toContain(makeHexString('ir1'));
      expect(ids).toContain(makeHexString('ir2'));
    });

    it('should paginate expired identity records', async () => {
      const now = new Date('2024-06-01T00:00:00Z');
      // Create 5 expired records
      for (let i = 1; i <= 5; i++) {
        const record = makeIdentityRecord(
          makeHexString(`ir${i}`),
          new Date(`2024-0${i}-01T00:00:00Z`),
        );
        await adapter.saveIdentityRecord(record);
      }

      const page0 = await adapter.listExpiredIdentityRecords(now, 0, 2);
      expect(page0).toHaveLength(2);

      const page1 = await adapter.listExpiredIdentityRecords(now, 1, 2);
      expect(page1).toHaveLength(2);

      const page2 = await adapter.listExpiredIdentityRecords(now, 2, 2);
      expect(page2).toHaveLength(1);
    });
  });

  // === Alias Registry ===

  describe('alias registry', () => {
    it('should save and retrieve an alias', async () => {
      const alias = makeAlias('testuser');
      await adapter.saveAlias(alias);
      const retrieved = await adapter.getAlias('testuser');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.aliasName).toBe('testuser');
      expect(retrieved!.isActive).toBe(true);
    });

    it('should return null for non-existent alias', async () => {
      const result = await adapter.getAlias('nonexistent');
      expect(result).toBeNull();
    });

    it('should check alias availability', async () => {
      expect(await adapter.isAliasAvailable('newname')).toBe(true);
      await adapter.saveAlias(makeAlias('newname'));
      expect(await adapter.isAliasAvailable('newname')).toBe(false);
    });

    it('should consider inactive alias as available', async () => {
      await adapter.saveAlias(makeAlias('oldname', false));
      expect(await adapter.isAliasAvailable('oldname')).toBe(true);
    });

    it('should update an existing alias', async () => {
      await adapter.saveAlias(makeAlias('myalias', true));
      await adapter.saveAlias(makeAlias('myalias', false));
      const retrieved = await adapter.getAlias('myalias');
      expect(retrieved!.isActive).toBe(false);
    });

    it('should preserve Uint8Array fields through round-trip', async () => {
      const alias = makeAlias('keytest');
      await adapter.saveAlias(alias);
      const retrieved = await adapter.getAlias('keytest');
      expect(retrieved!.aliasPublicKey).toEqual(new Uint8Array([7, 8, 9]));
    });
  });

  // === Audit Log ===

  describe('audit log', () => {
    it('should append and retrieve the latest audit entry', async () => {
      // We store a chained entry (with chain fields) since getLatestAuditEntry
      // deserializes as ChainedAuditLogEntry
      const entry = makeChainedAuditEntry(
        makeHexString('a1'),
        new Date('2024-01-01T00:00:00Z'),
      );
      await adapter.appendAuditEntry(entry);
      const latest = await adapter.getLatestAuditEntry();
      expect(latest).not.toBeNull();
      expect(latest!.id).toBe(makeHexString('a1'));
      expect(latest!.contentHash).toBe('abc123');
    });

    it('should return null when audit log is empty', async () => {
      const latest = await adapter.getLatestAuditEntry();
      expect(latest).toBeNull();
    });

    it('should return the most recent entry by timestamp', async () => {
      const entry1 = makeChainedAuditEntry(
        makeHexString('a1'),
        new Date('2024-01-01T00:00:00Z'),
      );
      const entry2 = makeChainedAuditEntry(
        makeHexString('a2'),
        new Date('2024-06-01T00:00:00Z'),
      );
      await adapter.appendAuditEntry(entry1);
      await adapter.appendAuditEntry(entry2);
      const latest = await adapter.getLatestAuditEntry();
      expect(latest!.id).toBe(makeHexString('a2'));
    });
  });

  // === Redistribution Journal ===

  describe('redistribution journal', () => {
    it('should save and retrieve journal entries by epoch', async () => {
      const entry1 = makeJournalEntry(makeHexString('d1'), 1);
      const entry2 = makeJournalEntry(makeHexString('d2'), 1);
      const entry3 = makeJournalEntry(makeHexString('d3'), 2);
      await adapter.saveJournalEntry(entry1);
      await adapter.saveJournalEntry(entry2);
      await adapter.saveJournalEntry(entry3);

      const epoch1Entries = await adapter.getJournalEntries(1);
      expect(epoch1Entries).toHaveLength(2);

      const epoch2Entries = await adapter.getJournalEntries(2);
      expect(epoch2Entries).toHaveLength(1);
    });

    it('should return empty array for epoch with no journal entries', async () => {
      const entries = await adapter.getJournalEntries(999);
      expect(entries).toHaveLength(0);
    });

    it('should delete journal entries by epoch', async () => {
      await adapter.saveJournalEntry(makeJournalEntry(makeHexString('d1'), 1));
      await adapter.saveJournalEntry(makeJournalEntry(makeHexString('d2'), 1));
      await adapter.saveJournalEntry(makeJournalEntry(makeHexString('d3'), 2));

      await adapter.deleteJournalEntries(1);

      const epoch1 = await adapter.getJournalEntries(1);
      expect(epoch1).toHaveLength(0);

      const epoch2 = await adapter.getJournalEntries(2);
      expect(epoch2).toHaveLength(1);
    });

    it('should preserve Map fields through round-trip', async () => {
      const entry = makeJournalEntry(makeHexString('d1'), 1);
      await adapter.saveJournalEntry(entry);
      const entries = await adapter.getJournalEntries(1);
      expect(entries[0].oldShares.get(makeHexString('m1'))).toEqual(
        new Uint8Array([1, 2]),
      );
    });
  });

  // === Statute Config ===

  describe('statute config', () => {
    it('should save and retrieve statute config', async () => {
      const durations = new Map<string, number>();
      durations.set('post', 1000 * 60 * 60 * 24 * 365);
      durations.set('message', 1000 * 60 * 60 * 24 * 30);
      const config: StatuteOfLimitationsConfig = {
        defaultDurations: durations,
        fallbackDurationMs: 1000 * 60 * 60 * 24 * 365 * 7,
      };
      await adapter.saveStatuteConfig(config);
      const retrieved = await adapter.getStatuteConfig();
      expect(retrieved).not.toBeNull();
      expect(retrieved!.fallbackDurationMs).toBe(1000 * 60 * 60 * 24 * 365 * 7);
      expect(retrieved!.defaultDurations.get('post')).toBe(
        1000 * 60 * 60 * 24 * 365,
      );
    });

    it('should return null when no config exists', async () => {
      const result = await adapter.getStatuteConfig();
      expect(result).toBeNull();
    });

    it('should update existing statute config', async () => {
      const config1: StatuteOfLimitationsConfig = {
        defaultDurations: new Map(),
        fallbackDurationMs: 1000,
      };
      await adapter.saveStatuteConfig(config1);
      const config2: StatuteOfLimitationsConfig = {
        defaultDurations: new Map(),
        fallbackDurationMs: 2000,
      };
      await adapter.saveStatuteConfig(config2);
      const retrieved = await adapter.getStatuteConfig();
      expect(retrieved!.fallbackDurationMs).toBe(2000);
    });
  });

  // === Operational State ===

  describe('operational state', () => {
    it('should save and retrieve operational state', async () => {
      const state: OperationalState = {
        mode: BrightTrustOperationalMode.Bootstrap,
        currentEpochNumber: 1,
        lastUpdated: new Date('2024-01-01T00:00:00Z'),
      };
      await adapter.saveOperationalState(state);
      const retrieved = await adapter.getOperationalState();
      expect(retrieved).not.toBeNull();
      expect(retrieved!.mode).toBe(BrightTrustOperationalMode.Bootstrap);
      expect(retrieved!.currentEpochNumber).toBe(1);
    });

    it('should return null when no state exists', async () => {
      const result = await adapter.getOperationalState();
      expect(result).toBeNull();
    });

    it('should update existing operational state', async () => {
      const state1: OperationalState = {
        mode: BrightTrustOperationalMode.Bootstrap,
        currentEpochNumber: 1,
        lastUpdated: new Date('2024-01-01T00:00:00Z'),
      };
      await adapter.saveOperationalState(state1);
      const state2: OperationalState = {
        mode: BrightTrustOperationalMode.BrightTrust,
        currentEpochNumber: 5,
        lastUpdated: new Date('2024-06-01T00:00:00Z'),
      };
      await adapter.saveOperationalState(state2);
      const retrieved = await adapter.getOperationalState();
      expect(retrieved!.mode).toBe(BrightTrustOperationalMode.BrightTrust);
      expect(retrieved!.currentEpochNumber).toBe(5);
    });
  });

  // === Transactions ===

  describe('withTransaction', () => {
    it('should execute a function within a transaction', async () => {
      const result = await adapter.withTransaction(async () => {
        await adapter.saveEpoch(makeEpoch(1));
        return 'done';
      });
      expect(result).toBe('done');
      const epoch = await adapter.getEpoch(1);
      expect(epoch).not.toBeNull();
    });

    it('should propagate errors from the transaction function', async () => {
      await expect(
        adapter.withTransaction(async () => {
          throw new Error('Transaction failed');
        }),
      ).rejects.toThrow('Transaction failed');
    });
  });

  // === Health Check ===

  describe('isAvailable', () => {
    it('should return true for a healthy database', async () => {
      const available = await adapter.isAvailable();
      expect(available).toBe(true);
    });

    it('should return false when database operations fail', async () => {
      // Create an adapter backed by a mock db that throws on collection access
      const brokenAdapter = new BrightTrustDatabaseAdapter(
        {
          collection: () => {
            throw new Error('pool corrupted');
          },
        } as unknown as BrightDb,
        mockIdProvider,
      );
      const available = await brokenAdapter.isAvailable();
      expect(available).toBe(false);
    });
  });
});
