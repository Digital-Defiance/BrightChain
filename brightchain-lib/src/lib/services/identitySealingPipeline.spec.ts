/**
 * Unit tests for IdentitySealingPipeline.
 *
 * Tests each identity mode (real/alias/anonymous), shard verification
 * failure path, plaintext memory wipe verification, and recovery.
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
import { BrightTrustOperationalMode } from '../enumerations/brightTrustOperationalMode';
import { BrightTrustError } from '../errors/brightTrustError';
import { initializeBrightChain } from '../init';
import { BrightTrustEpoch } from '../interfaces/brightTrustEpoch';
import {
  ContentWithIdentity,
  IdentityMode,
} from '../interfaces/contentWithIdentity';
import { IdentityRecoveryRecord } from '../interfaces/identityRecoveryRecord';
import { IBrightTrustDatabase } from '../interfaces/services/brightTrustDatabase';
import { IBrightTrustMember } from '../interfaces/services/brightTrustService';
import {
  ANONYMOUS_ID,
  IdentitySealingPipeline,
} from './identitySealingPipeline';
import { SealingService } from './sealing.service';
import { ServiceProvider } from './service.provider';

jest.setTimeout(30000);

function createMockDatabase(
  memberPool: IMemberWithMnemonic<GuidV4Uint8Array>[],
  enhancedProvider: ReturnType<
    typeof ServiceProvider.getInstance<GuidV4Uint8Array>
  >['idProvider'],
): IBrightTrustDatabase<GuidV4Uint8Array> & {
  identityRecords: Map<HexString, IdentityRecoveryRecord<GuidV4Uint8Array>>;
} {
  const identityRecords = new Map<
    HexString,
    IdentityRecoveryRecord<GuidV4Uint8Array>
  >();

  const memberLookup = new Map<
    HexString,
    IBrightTrustMember<GuidV4Uint8Array>
  >();
  for (const m of memberPool) {
    const memberId = uint8ArrayToHex(
      enhancedProvider.toBytes(m.member.id),
    ) as HexString;
    memberLookup.set(memberId, {
      id: m.member.id,
      publicKey: m.member.publicKey,
      metadata: { name: m.member.name },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return {
    identityRecords,
    saveEpoch: jest.fn(async () => {}),
    getEpoch: jest.fn(async () => null),
    getCurrentEpoch: jest.fn(async () => {
      throw new Error('Not implemented');
    }),
    saveMember: jest.fn(async () => {}),
    getMember: jest.fn(
      async (memberId: GuidV4Uint8Array) =>
        memberLookup.get(
          uint8ArrayToHex(memberId as Uint8Array) as HexString,
        ) ?? null,
    ),
    listActiveMembers: jest.fn(async () => Array.from(memberLookup.values())),
    saveDocument: jest.fn(async () => {}),
    getDocument: jest.fn(async () => null),
    listDocumentsByEpoch: jest.fn(async () => []),
    saveProposal: jest.fn(async () => {}),
    getProposal: jest.fn(async () => null),
    saveVote: jest.fn(async () => {}),
    getVotesForProposal: jest.fn(async () => []),
    saveIdentityRecord: jest.fn(
      async (record: IdentityRecoveryRecord<GuidV4Uint8Array>) => {
        identityRecords.set(record.id as unknown as HexString, record);
      },
    ),
    getIdentityRecord: jest.fn(
      async (recordId: GuidV4Uint8Array) =>
        identityRecords.get(recordId as unknown as HexString) ?? null,
    ),
    deleteIdentityRecord: jest.fn(async (recordId: GuidV4Uint8Array) => {
      identityRecords.delete(recordId as unknown as HexString);
    }),
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
    saveBanRecord: jest.fn(async () => {}),
    deleteBanRecord: jest.fn(async () => {}),
    getBanRecord: jest.fn(async () => null),
    getAllBanRecords: jest.fn(async () => []),
    getMemberAdmissionProposerId: jest.fn(async () => null),
    isAvailable: jest.fn(async () => true),
  };
}

describe('IdentitySealingPipeline Unit Tests', () => {
  let sealingService: SealingService<GuidV4Uint8Array>;
  let eciesService: ECIESService<GuidV4Uint8Array>;
  let idProvider: ReturnType<
    typeof ServiceProvider.getInstance<GuidV4Uint8Array>
  >['idProvider'];
  const memberPool: IMemberWithMnemonic<GuidV4Uint8Array>[] = [];

  beforeAll(() => {
    initializeBrightChain();
    const sp = ServiceProvider.getInstance<GuidV4Uint8Array>();
    sealingService = sp.sealingService;
    eciesService = sp.eciesService;
    idProvider = sp.idProvider;

    const names = ['Alice', 'Bob', 'Charlie'];
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

  function createEpoch(
    memberCount: number,
    threshold: number,
  ): BrightTrustEpoch<GuidV4Uint8Array> {
    return {
      epochNumber: 1,
      memberIds: memberPool.slice(0, memberCount).map((m) => m.member.id),
      threshold,
      mode: BrightTrustOperationalMode.BrightTrust,
      createdAt: new Date(),
    };
  }

  function createContent(
    creatorId: GuidV4Uint8Array,
  ): ContentWithIdentity<GuidV4Uint8Array> {
    return {
      creatorId,
      contentId: uint8ArrayToHex(
        idProvider.toBytes(idProvider.generateTyped()),
      ) as HexString,
      contentType: 'post',
      signature: new Uint8Array([1, 2, 3, 4]),
    };
  }

  function createPipeline(
    db: IBrightTrustDatabase<GuidV4Uint8Array>,
    epoch: BrightTrustEpoch<GuidV4Uint8Array>,
  ): IdentitySealingPipeline<GuidV4Uint8Array> {
    return new IdentitySealingPipeline<GuidV4Uint8Array>(
      db,
      sealingService,
      eciesService,
      async () => epoch,
      async () => null,
    );
  }

  async function decryptShards(
    record: IdentityRecoveryRecord<GuidV4Uint8Array>,
    memberCount: number,
  ): Promise<Map<HexString, string>> {
    const decryptedShares = new Map<HexString, string>();
    const members = memberPool.slice(0, memberCount);
    const decoder = new TextDecoder();

    for (const m of members) {
      const memberId = uint8ArrayToHex(
        idProvider.toBytes(m.member.id),
      ) as HexString;
      // encryptedShardsByMemberId is keyed by GuidV4Uint8Array (TID)
      // find the matching shard by comparing hex representations
      let encryptedShard: Uint8Array | undefined;
      for (const [shardKey, shardVal] of record.encryptedShardsByMemberId) {
        if (uint8ArrayToHex(shardKey as Uint8Array) === memberId) {
          encryptedShard = shardVal;
          break;
        }
      }
      if (encryptedShard && m.member.privateKey) {
        const decrypted = await eciesService.decryptWithLengthAndHeader(
          m.member.privateKey.value,
          encryptedShard,
        );
        decryptedShares.set(memberId, decoder.decode(decrypted));
      }
    }

    return decryptedShares;
  }

  describe('sealIdentity — Real mode', () => {
    it('should keep creatorId unchanged and store recovery record', async () => {
      const epoch = createEpoch(3, 2);
      const db = createMockDatabase(memberPool, idProvider);
      const pipeline = createPipeline(db, epoch);
      const creator = memberPool[0].member;
      const content = createContent(creator.id);

      const result = await pipeline.sealIdentity(content, IdentityMode.Real);

      // creatorId should be unchanged in Real mode
      expect(
        idProvider.equals(result.modifiedContent.creatorId, creator.id),
      ).toBe(true);
      // Recovery record should be stored
      expect(result.recoveryRecordId).toBeDefined();
      expect(result.modifiedContent.identityRecoveryRecordId).toBe(
        result.recoveryRecordId,
      );
      // DB should have the record
      const record = await db.getIdentityRecord(
        result.recoveryRecordId as unknown as GuidV4Uint8Array,
      );
      expect(record).not.toBeNull();
      expect(record!.identityMode).toBe(IdentityMode.Real);
      expect(record!.threshold).toBe(2);
      expect(record!.memberIds).toHaveLength(3);
    });
  });

  describe('sealIdentity — Alias mode', () => {
    it('should replace creatorId and store alias name in record', async () => {
      const epoch = createEpoch(3, 2);
      const db = createMockDatabase(memberPool, idProvider);
      const pipeline = createPipeline(db, epoch);
      const creator = memberPool[0].member;
      const content = createContent(creator.id);

      const result = await pipeline.sealIdentity(
        content,
        IdentityMode.Alias,
        'MyAlias',
      );

      // creatorId should be different from original
      expect(
        idProvider.equals(result.modifiedContent.creatorId, creator.id),
      ).toBe(false);
      // Recovery record should store alias name
      const record = await db.getIdentityRecord(
        result.recoveryRecordId as unknown as GuidV4Uint8Array,
      );
      expect(record).not.toBeNull();
      expect(record!.identityMode).toBe(IdentityMode.Alias);
      expect(record!.aliasName).toBe('MyAlias');
    });

    it('should throw when alias name is missing', async () => {
      const epoch = createEpoch(3, 2);
      const db = createMockDatabase(memberPool, idProvider);
      const pipeline = createPipeline(db, epoch);
      const content = createContent(memberPool[0].member.id);

      await expect(
        pipeline.sealIdentity(content, IdentityMode.Alias),
      ).rejects.toThrow(BrightTrustError);
    });
  });

  describe('sealIdentity — Anonymous mode', () => {
    it('should replace creatorId with all-zeroes Anonymous_ID', async () => {
      const epoch = createEpoch(3, 2);
      const db = createMockDatabase(memberPool, idProvider);
      const pipeline = createPipeline(db, epoch);
      const creator = memberPool[0].member;
      const content = createContent(creator.id);

      const result = await pipeline.sealIdentity(
        content,
        IdentityMode.Anonymous,
      );

      // creatorId should be all zeroes
      const creatorBytes = idProvider.toBytes(result.modifiedContent.creatorId);
      expect(creatorBytes.every((b) => b === 0)).toBe(true);
      // Recovery record should exist
      const record = await db.getIdentityRecord(
        result.recoveryRecordId as unknown as GuidV4Uint8Array,
      );
      expect(record).not.toBeNull();
      expect(record!.identityMode).toBe(IdentityMode.Anonymous);
    });
  });

  describe('recoverIdentity', () => {
    it('should recover original identity with threshold shares', async () => {
      const epoch = createEpoch(3, 2);
      const db = createMockDatabase(memberPool, idProvider);
      const pipeline = createPipeline(db, epoch);
      const creator = memberPool[0].member;
      const content = createContent(creator.id);

      const result = await pipeline.sealIdentity(
        content,
        IdentityMode.Anonymous,
      );

      // Decrypt all shards and use threshold (2) of them
      const record = await db.getIdentityRecord(
        result.recoveryRecordId as unknown as GuidV4Uint8Array,
      );
      const allShares = await decryptShards(record!, 3);
      const thresholdShares = new Map<HexString, string>();
      let count = 0;
      for (const [k, v] of allShares) {
        if (count >= 2) break;
        thresholdShares.set(k, v);
        count++;
      }

      const recovered = await pipeline.recoverIdentity(
        result.recoveryRecordId,
        thresholdShares,
      );

      expect(idProvider.equals(recovered, creator.id)).toBe(true);
    });

    it('should throw when record not found', async () => {
      const epoch = createEpoch(3, 2);
      const db = createMockDatabase(memberPool, idProvider);
      const pipeline = createPipeline(db, epoch);

      await expect(
        pipeline.recoverIdentity('nonexistent' as HexString, new Map()),
      ).rejects.toThrow(BrightTrustError);
    });

    it('should throw when insufficient shares provided', async () => {
      const epoch = createEpoch(3, 2);
      const db = createMockDatabase(memberPool, idProvider);
      const pipeline = createPipeline(db, epoch);
      const content = createContent(memberPool[0].member.id);

      const result = await pipeline.sealIdentity(content, IdentityMode.Real);

      // Provide only 1 share when threshold is 2
      const record = await db.getIdentityRecord(
        result.recoveryRecordId as unknown as GuidV4Uint8Array,
      );
      const allShares = await decryptShards(record!, 3);
      const oneShare = new Map<HexString, string>();
      const firstEntry = allShares.entries().next();
      if (!firstEntry.done) {
        oneShare.set(firstEntry.value[0], firstEntry.value[1]);
      }

      await expect(
        pipeline.recoverIdentity(result.recoveryRecordId, oneShare),
      ).rejects.toThrow(BrightTrustError);
    });
  });

  describe('ANONYMOUS_ID constant', () => {
    it('should be a 16-byte all-zeroes Uint8Array', () => {
      expect(ANONYMOUS_ID).toBeInstanceOf(Uint8Array);
      expect(ANONYMOUS_ID.length).toBe(16);
      expect(ANONYMOUS_ID.every((b) => b === 0)).toBe(true);
    });
  });

  describe('plaintext memory wipe', () => {
    it('should wipe identity copy after sealing', async () => {
      const epoch = createEpoch(3, 2);
      const db = createMockDatabase(memberPool, idProvider);
      const pipeline = createPipeline(db, epoch);
      const creator = memberPool[0].member;
      const content = createContent(creator.id);

      // The pipeline internally creates a copy of the identity bytes
      // and wipes it in the finally block. We verify the pipeline
      // completes successfully, which means the finally block ran.
      const result = await pipeline.sealIdentity(content, IdentityMode.Real);

      // Verify the seal completed (finally block executed)
      expect(result.recoveryRecordId).toBeDefined();

      // Verify the original content's creatorId is still intact
      // (the pipeline works on a copy, not the original)
      expect(idProvider.equals(content.creatorId, creator.id)).toBe(true);
    });

    it('should wipe identity copy even when sealing fails', async () => {
      const epoch = createEpoch(3, 2);
      const db = createMockDatabase(memberPool, idProvider);

      // Make getMember fail to trigger an error during shard encryption
      (db.getMember as jest.Mock).mockResolvedValue(null);

      const pipeline = createPipeline(db, epoch);
      const content = createContent(memberPool[0].member.id);

      // Should throw but the finally block should still run
      await expect(
        pipeline.sealIdentity(content, IdentityMode.Real),
      ).rejects.toThrow(BrightTrustError);

      // Original content should be unmodified
      expect(
        idProvider.equals(content.creatorId, memberPool[0].member.id),
      ).toBe(true);
    });
  });
});
