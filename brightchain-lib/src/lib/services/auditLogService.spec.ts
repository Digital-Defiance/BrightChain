/**
 * Unit tests for AuditLogService.
 *
 * Tests:
 * - Genesis entry (null previousEntryHash)
 * - Chain linking (previousEntryHash matches previous contentHash)
 * - Signature verification
 * - Tamper detection
 * - Block store persistence integration
 */
import {
  EmailString,
  GuidV4Uint8Array,
  IMemberWithMnemonic,
  Member,
  MemberType,
  ShortHexGuid,
} from '@digitaldefiance/ecies-lib';
import { v4 as uuidv4 } from 'uuid';
import { initializeBrightChain } from '../init';
import { QuorumAuditLogEntry } from '../interfaces/auditLogEntry';
import { ChainedAuditLogEntry } from '../interfaces/chainedAuditLogEntry';
import { IQuorumDatabase } from '../interfaces/services/quorumDatabase';
import {
  AuditLogService,
  computeContentHash,
  IAuditBlockStorePersistence,
  serializeEntryForHashing,
} from './auditLogService';
import { ServiceProvider } from './service.provider';

jest.setTimeout(30000);

/**
 * Creates a mock IQuorumDatabase that tracks chained audit entries in memory.
 */
function createAuditMockDatabase(): IQuorumDatabase<GuidV4Uint8Array> & {
  chainedEntries: ChainedAuditLogEntry[];
} {
  const chainedEntries: ChainedAuditLogEntry[] = [];

  const noop = async () => {};
  const nullAsync = async () => null;

  return {
    chainedEntries,
    appendAuditEntry: jest.fn(async (entry: QuorumAuditLogEntry) => {
      const chained = entry as ChainedAuditLogEntry;
      if (chained.contentHash !== undefined) {
        chainedEntries.push(chained);
      }
    }),
    getLatestAuditEntry: jest.fn(async () => {
      if (chainedEntries.length === 0) return null;
      return chainedEntries[chainedEntries.length - 1];
    }),
    saveEpoch: jest.fn(noop),
    getEpoch: jest.fn(nullAsync),
    getCurrentEpoch: jest.fn(async () => {
      throw new Error('Not implemented');
    }),
    saveMember: jest.fn(noop),
    getMember: jest.fn(nullAsync),
    listActiveMembers: jest.fn(async () => []),
    saveDocument: jest.fn(noop),
    getDocument: jest.fn(nullAsync),
    listDocumentsByEpoch: jest.fn(async () => []),
    saveProposal: jest.fn(noop),
    getProposal: jest.fn(nullAsync),
    saveVote: jest.fn(noop),
    getVotesForProposal: jest.fn(async () => []),
    saveIdentityRecord: jest.fn(noop),
    getIdentityRecord: jest.fn(nullAsync),
    deleteIdentityRecord: jest.fn(noop),
    listExpiredIdentityRecords: jest.fn(async () => []),
    saveAlias: jest.fn(noop),
    getAlias: jest.fn(nullAsync),
    isAliasAvailable: jest.fn(async () => true),
    saveJournalEntry: jest.fn(noop),
    getJournalEntries: jest.fn(async () => []),
    deleteJournalEntries: jest.fn(noop),
    saveStatuteConfig: jest.fn(noop),
    getStatuteConfig: jest.fn(nullAsync),
    saveOperationalState: jest.fn(noop),
    getOperationalState: jest.fn(nullAsync),
    withTransaction: jest.fn(async <R>(fn: () => Promise<R>) => fn()),
    isAvailable: jest.fn(async () => true),
  };
}

function makeEntry(
  eventType: QuorumAuditLogEntry['eventType'] = 'epoch_created',
): QuorumAuditLogEntry {
  return {
    id: uuidv4() as ShortHexGuid,
    eventType,
    details: { test: true },
    timestamp: new Date(),
  };
}

describe('AuditLogService', () => {
  let signingMember: IMemberWithMnemonic<GuidV4Uint8Array>;
  let eciesService: ReturnType<
    typeof ServiceProvider.getInstance<GuidV4Uint8Array>
  >['eciesService'];

  beforeAll(() => {
    initializeBrightChain();
    const sp = ServiceProvider.getInstance<GuidV4Uint8Array>();
    eciesService = sp.eciesService;
    signingMember = Member.newMember<GuidV4Uint8Array>(
      eciesService,
      MemberType.System,
      'AuditSigner',
      new EmailString('signer@example.com'),
    );
  });

  describe('appendEntry', () => {
    it('should create a genesis entry with null previousEntryHash', async () => {
      const db = createAuditMockDatabase();
      const service = new AuditLogService<GuidV4Uint8Array>(
        db,
        signingMember.member,
        eciesService,
      );

      const entry = makeEntry();
      const chained = await service.appendEntry(entry);

      expect(chained.previousEntryHash).toBeNull();
      expect(chained.contentHash).toBeDefined();
      expect(chained.contentHash.length).toBeGreaterThan(0);
      expect(chained.signature).toBeDefined();
      expect(chained.blockId1).toBe('');
      expect(chained.blockId2).toBe('');
    });

    it('should link second entry to first via previousEntryHash', async () => {
      const db = createAuditMockDatabase();
      const service = new AuditLogService<GuidV4Uint8Array>(
        db,
        signingMember.member,
        eciesService,
      );

      const first = await service.appendEntry(makeEntry('epoch_created'));
      const second = await service.appendEntry(makeEntry('member_added'));

      expect(second.previousEntryHash).toBe(first.contentHash);
    });

    it('should produce a valid contentHash from serialized entry', async () => {
      const db = createAuditMockDatabase();
      const service = new AuditLogService<GuidV4Uint8Array>(
        db,
        signingMember.member,
        eciesService,
      );

      const entry = makeEntry();
      const chained = await service.appendEntry(entry);

      // Recompute the hash manually
      const serialized = serializeEntryForHashing({
        id: chained.id,
        eventType: chained.eventType,
        timestamp: chained.timestamp,
        details: chained.details,
        previousEntryHash: chained.previousEntryHash,
      });
      const recomputed = computeContentHash(serialized);
      expect(recomputed).toBe(chained.contentHash);
    });

    it('should produce a valid signature verifiable with the signing key', async () => {
      const db = createAuditMockDatabase();
      const service = new AuditLogService<GuidV4Uint8Array>(
        db,
        signingMember.member,
        eciesService,
      );

      const chained = await service.appendEntry(makeEntry());

      const contentHashBytes = new TextEncoder().encode(chained.contentHash);
      const valid = eciesService.verifyMessage(
        signingMember.member.publicKey,
        contentHashBytes,
        chained.signature,
      );
      expect(valid).toBe(true);
    });

    it('should persist to block store when provided', async () => {
      const db = createAuditMockDatabase();
      const storedData: Uint8Array[] = [];
      const mockBlockStore: IAuditBlockStorePersistence = {
        storeCBLWithWhitening: jest.fn(async (data: Uint8Array) => {
          storedData.push(data);
          return {
            blockId1: 'block1-abc',
            blockId2: 'block2-def',
            blockSize: 256,
            magnetUrl: 'magnet:?test',
          };
        }),
        retrieveCBL: jest.fn(async () => new Uint8Array()),
      };

      const service = new AuditLogService<GuidV4Uint8Array>(
        db,
        signingMember.member,
        eciesService,
        mockBlockStore,
      );

      const chained = await service.appendEntry(makeEntry());

      expect(chained.blockId1).toBe('block1-abc');
      expect(chained.blockId2).toBe('block2-def');
      expect(mockBlockStore.storeCBLWithWhitening).toHaveBeenCalledTimes(1);
      expect(storedData.length).toBe(1);
    });

    it('should build a chain of 5 entries with correct linking', async () => {
      const db = createAuditMockDatabase();
      const service = new AuditLogService<GuidV4Uint8Array>(
        db,
        signingMember.member,
        eciesService,
      );

      const entries: ChainedAuditLogEntry[] = [];
      const eventTypes: QuorumAuditLogEntry['eventType'][] = [
        'epoch_created',
        'member_added',
        'proposal_created',
        'vote_cast',
        'proposal_approved',
      ];

      for (const eventType of eventTypes) {
        const chained = await service.appendEntry(makeEntry(eventType));
        entries.push(chained);
      }

      // Verify chain linking
      expect(entries[0].previousEntryHash).toBeNull();
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i].previousEntryHash).toBe(entries[i - 1].contentHash);
      }
    });
  });

  describe('verifyChain', () => {
    it('should verify an empty chain', async () => {
      const db = createAuditMockDatabase();
      const service = new AuditLogService<GuidV4Uint8Array>(
        db,
        signingMember.member,
        eciesService,
      );

      const result = await service.verifyChain(
        signingMember.member.publicKey,
        [],
      );
      expect(result).toBe(true);
    });

    it('should verify a valid single-entry chain', async () => {
      const db = createAuditMockDatabase();
      const service = new AuditLogService<GuidV4Uint8Array>(
        db,
        signingMember.member,
        eciesService,
      );

      const chained = await service.appendEntry(makeEntry());
      const result = await service.verifyChain(signingMember.member.publicKey, [
        chained,
      ]);
      expect(result).toBe(true);
    });

    it('should verify a valid multi-entry chain', async () => {
      const db = createAuditMockDatabase();
      const service = new AuditLogService<GuidV4Uint8Array>(
        db,
        signingMember.member,
        eciesService,
      );

      const entries: ChainedAuditLogEntry[] = [];
      for (let i = 0; i < 4; i++) {
        entries.push(await service.appendEntry(makeEntry()));
      }

      const result = await service.verifyChain(
        signingMember.member.publicKey,
        entries,
      );
      expect(result).toBe(true);
    });

    it('should detect tampered contentHash', async () => {
      const db = createAuditMockDatabase();
      const service = new AuditLogService<GuidV4Uint8Array>(
        db,
        signingMember.member,
        eciesService,
      );

      const chained = await service.appendEntry(makeEntry());
      const tampered: ChainedAuditLogEntry = {
        ...chained,
        contentHash: 'tampered_hash_value',
      };

      await expect(
        service.verifyChain(signingMember.member.publicKey, [tampered]),
      ).rejects.toThrow('Audit chain integrity compromised');
    });

    it('should detect broken previousEntryHash link', async () => {
      const db = createAuditMockDatabase();
      const service = new AuditLogService<GuidV4Uint8Array>(
        db,
        signingMember.member,
        eciesService,
      );

      const first = await service.appendEntry(makeEntry());
      const second = await service.appendEntry(makeEntry());

      // Break the link
      const tampered: ChainedAuditLogEntry = {
        ...second,
        previousEntryHash: 'wrong_hash',
      };

      await expect(
        service.verifyChain(signingMember.member.publicKey, [first, tampered]),
      ).rejects.toThrow('Audit chain integrity compromised');
    });

    it('should detect non-null previousEntryHash on genesis entry', async () => {
      const db = createAuditMockDatabase();
      const service = new AuditLogService<GuidV4Uint8Array>(
        db,
        signingMember.member,
        eciesService,
      );

      const chained = await service.appendEntry(makeEntry());
      const tampered: ChainedAuditLogEntry = {
        ...chained,
        previousEntryHash: 'should_be_null',
      };

      await expect(
        service.verifyChain(signingMember.member.publicKey, [tampered]),
      ).rejects.toThrow('Audit chain integrity compromised');
    });

    it('should detect invalid signature with wrong public key', async () => {
      const db = createAuditMockDatabase();
      const service = new AuditLogService<GuidV4Uint8Array>(
        db,
        signingMember.member,
        eciesService,
      );

      const chained = await service.appendEntry(makeEntry());

      // Create a different member with a different key
      const otherMember = Member.newMember<GuidV4Uint8Array>(
        eciesService,
        MemberType.System,
        'OtherSigner',
        new EmailString('other@example.com'),
      );

      await expect(
        service.verifyChain(otherMember.member.publicKey, [chained]),
      ).rejects.toThrow('Audit chain integrity compromised');
    });
  });

  describe('serializeEntryForHashing', () => {
    it('should produce deterministic output for the same input', () => {
      const entry: QuorumAuditLogEntry & { previousEntryHash: null } = {
        id: 'test-id' as ShortHexGuid,
        eventType: 'epoch_created',
        details: { key: 'value' },
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
        previousEntryHash: null,
      };

      const result1 = serializeEntryForHashing(entry);
      const result2 = serializeEntryForHashing(entry);
      expect(result1).toBe(result2);
    });

    it('should exclude signature and blockIds from serialization', () => {
      const entry: QuorumAuditLogEntry & { previousEntryHash: null } = {
        id: 'test-id' as ShortHexGuid,
        eventType: 'epoch_created',
        details: {},
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
        previousEntryHash: null,
      };

      const serialized = serializeEntryForHashing(entry);
      expect(serialized).not.toContain('signature');
      expect(serialized).not.toContain('blockId1');
      expect(serialized).not.toContain('blockId2');
    });

    it('should include optional fields when present', () => {
      const entry: QuorumAuditLogEntry & { previousEntryHash: null } = {
        id: 'test-id' as ShortHexGuid,
        eventType: 'proposal_created',
        proposalId: 'prop-123' as ShortHexGuid,
        targetMemberId: 'member-456' as ShortHexGuid,
        details: {},
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
        previousEntryHash: null,
      };

      const serialized = serializeEntryForHashing(entry);
      expect(serialized).toContain('proposalId');
      expect(serialized).toContain('targetMemberId');
    });
  });

  describe('computeContentHash', () => {
    it('should produce a hex string', () => {
      const hash = computeContentHash('test data');
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = computeContentHash('input1');
      const hash2 = computeContentHash('input2');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce consistent hashes for the same input', () => {
      const hash1 = computeContentHash('same input');
      const hash2 = computeContentHash('same input');
      expect(hash1).toBe(hash2);
    });
  });
});
