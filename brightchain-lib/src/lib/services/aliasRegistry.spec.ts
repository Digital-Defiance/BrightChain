/**
 * Unit tests for AliasRegistry.
 *
 * Tests registration, deregistration, duplicate rejection,
 * and lookup with insufficient shares.
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
import { QuorumErrorType } from '../enumerations/quorumErrorType';
import { QuorumOperationalMode } from '../enumerations/quorumOperationalMode';
import { QuorumError } from '../errors/quorumError';
import { initializeBrightChain } from '../init';
import { AliasRecord } from '../interfaces/aliasRecord';
import { IdentityRecoveryRecord } from '../interfaces/identityRecoveryRecord';
import { QuorumEpoch } from '../interfaces/quorumEpoch';
import { IQuorumDatabase } from '../interfaces/services/quorumDatabase';
import { IQuorumMember } from '../interfaces/services/quorumService';
import { AliasRegistry } from './aliasRegistry';
import { IdentitySealingPipeline } from './identitySealingPipeline';
import { SealingService } from './sealing.service';
import { ServiceProvider } from './service.provider';

jest.setTimeout(30000);

function createMockDatabase(
  memberPool: IMemberWithMnemonic<GuidV4Uint8Array>[],
  enhancedProvider: ReturnType<
    typeof ServiceProvider.getInstance<GuidV4Uint8Array>
  >['idProvider'],
): IQuorumDatabase<GuidV4Uint8Array> & {
  aliases: Map<string, AliasRecord<GuidV4Uint8Array>>;
  identityRecords: Map<HexString, IdentityRecoveryRecord<GuidV4Uint8Array>>;
} {
  const aliases = new Map<string, AliasRecord<GuidV4Uint8Array>>();
  const identityRecords = new Map<
    HexString,
    IdentityRecoveryRecord<GuidV4Uint8Array>
  >();

  const memberLookup = new Map<HexString, IQuorumMember<GuidV4Uint8Array>>();
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
    aliases,
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
        identityRecords.set(
          uint8ArrayToHex(record.id as Uint8Array) as HexString,
          record,
        );
      },
    ),
    getIdentityRecord: jest.fn(
      async (recordId: GuidV4Uint8Array) =>
        identityRecords.get(
          uint8ArrayToHex(recordId as Uint8Array) as HexString,
        ) ?? null,
    ),
    deleteIdentityRecord: jest.fn(async (recordId: GuidV4Uint8Array) => {
      identityRecords.delete(
        uint8ArrayToHex(recordId as Uint8Array) as HexString,
      );
    }),
    listExpiredIdentityRecords: jest.fn(async () => []),
    saveAlias: jest.fn(async (alias: AliasRecord<GuidV4Uint8Array>) => {
      aliases.set(alias.aliasName, alias);
    }),
    getAlias: jest.fn(
      async (aliasName: string) => aliases.get(aliasName) ?? null,
    ),
    isAliasAvailable: jest.fn(async (aliasName: string) => {
      const existing = aliases.get(aliasName);
      return !existing || !existing.isActive;
    }),
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
  };
}

describe('AliasRegistry Unit Tests', () => {
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
  ): QuorumEpoch<GuidV4Uint8Array> {
    return {
      epochNumber: 1,
      memberIds: memberPool.slice(0, memberCount).map((m) => m.member.id),
      threshold,
      mode: QuorumOperationalMode.Quorum,
      createdAt: new Date(),
    };
  }

  function createRegistry(
    db: IQuorumDatabase<GuidV4Uint8Array>,
    epoch: QuorumEpoch<GuidV4Uint8Array>,
  ): AliasRegistry<GuidV4Uint8Array> {
    const pipeline = new IdentitySealingPipeline<GuidV4Uint8Array>(
      db,
      sealingService,
      eciesService,
      async () => epoch,
      async () => null,
    );
    return new AliasRegistry<GuidV4Uint8Array>(
      db,
      pipeline,
      eciesService,
      async () => epoch,
    );
  }

  describe('registerAlias', () => {
    it('should register a new alias and return an AliasRecord', async () => {
      const epoch = createEpoch(3, 2);
      const db = createMockDatabase(memberPool, idProvider);
      const registry = createRegistry(db, epoch);

      const owner = memberPool[0].member;
      const ownerId = uint8ArrayToHex(
        idProvider.toBytes(owner.id),
      ) as HexString;

      const record = await registry.registerAlias(
        'TestAlias',
        ownerId,
        owner.publicKey,
      );

      expect(record.aliasName).toBe('TestAlias');
      expect(record.ownerMemberId).toBe(ownerId);
      expect(record.isActive).toBe(true);
      expect(record.aliasPublicKey).toBeInstanceOf(Uint8Array);
      expect(record.aliasPublicKey.length).toBeGreaterThan(0);
      expect(record.identityRecoveryRecordId).toBeDefined();
      expect(record.epochNumber).toBe(1);
      expect(record.registeredAt).toBeInstanceOf(Date);
      expect(record.deactivatedAt).toBeUndefined();

      // Verify alias was saved to database
      const saved = db.aliases.get('TestAlias');
      expect(saved).toBeDefined();
      expect(saved!.aliasName).toBe('TestAlias');
    });

    it('should reject duplicate alias registration', async () => {
      const epoch = createEpoch(3, 2);
      const db = createMockDatabase(memberPool, idProvider);
      const registry = createRegistry(db, epoch);

      const ownerA = memberPool[0].member;
      const ownerAId = uint8ArrayToHex(
        idProvider.toBytes(ownerA.id),
      ) as HexString;
      const ownerB = memberPool[1].member;
      const ownerBId = uint8ArrayToHex(
        idProvider.toBytes(ownerB.id),
      ) as HexString;

      // First registration succeeds
      await registry.registerAlias('UniqueAlias', ownerAId, ownerA.publicKey);

      // Second registration with same name fails
      await expect(
        registry.registerAlias('UniqueAlias', ownerBId, ownerB.publicKey),
      ).rejects.toThrow(QuorumError);

      try {
        await registry.registerAlias('UniqueAlias', ownerBId, ownerB.publicKey);
      } catch (error) {
        expect((error as QuorumError).type).toBe(
          QuorumErrorType.AliasAlreadyTaken,
        );
      }
    });

    it('should create an identity recovery record for the alias', async () => {
      const epoch = createEpoch(3, 2);
      const db = createMockDatabase(memberPool, idProvider);
      const registry = createRegistry(db, epoch);

      const owner = memberPool[0].member;
      const ownerId = uint8ArrayToHex(
        idProvider.toBytes(owner.id),
      ) as HexString;

      const record = await registry.registerAlias(
        'AliasWithRecovery',
        ownerId,
        owner.publicKey,
      );

      // Verify the identity recovery record exists
      const recoveryRecord = db.identityRecords.get(
        uint8ArrayToHex(
          record.identityRecoveryRecordId as Uint8Array,
        ) as HexString,
      );
      expect(recoveryRecord).toBeDefined();
      expect(recoveryRecord!.aliasName).toBe('AliasWithRecovery');
    });
  });

  describe('deregisterAlias', () => {
    it('should mark alias as inactive', async () => {
      const epoch = createEpoch(3, 2);
      const db = createMockDatabase(memberPool, idProvider);
      const registry = createRegistry(db, epoch);

      const owner = memberPool[0].member;
      const ownerId = uint8ArrayToHex(
        idProvider.toBytes(owner.id),
      ) as HexString;

      await registry.registerAlias('ToDeregister', ownerId, owner.publicKey);

      await registry.deregisterAlias('ToDeregister');

      const alias = db.aliases.get('ToDeregister');
      expect(alias).toBeDefined();
      expect(alias!.isActive).toBe(false);
      expect(alias!.deactivatedAt).toBeInstanceOf(Date);
    });

    it('should throw AliasNotFound for non-existent alias', async () => {
      const epoch = createEpoch(3, 2);
      const db = createMockDatabase(memberPool, idProvider);
      const registry = createRegistry(db, epoch);

      await expect(registry.deregisterAlias('NonExistent')).rejects.toThrow(
        QuorumError,
      );

      try {
        await registry.deregisterAlias('NonExistent');
      } catch (error) {
        expect((error as QuorumError).type).toBe(QuorumErrorType.AliasNotFound);
      }
    });

    it('should throw AliasInactive for already deactivated alias', async () => {
      const epoch = createEpoch(3, 2);
      const db = createMockDatabase(memberPool, idProvider);
      const registry = createRegistry(db, epoch);

      const owner = memberPool[0].member;
      const ownerId = uint8ArrayToHex(
        idProvider.toBytes(owner.id),
      ) as HexString;

      await registry.registerAlias('AlreadyInactive', ownerId, owner.publicKey);
      await registry.deregisterAlias('AlreadyInactive');

      await expect(registry.deregisterAlias('AlreadyInactive')).rejects.toThrow(
        QuorumError,
      );

      try {
        await registry.deregisterAlias('AlreadyInactive');
      } catch (error) {
        expect((error as QuorumError).type).toBe(QuorumErrorType.AliasInactive);
      }
    });
  });

  describe('lookupAlias', () => {
    it('should throw AliasNotFound for non-existent alias', async () => {
      const epoch = createEpoch(3, 2);
      const db = createMockDatabase(memberPool, idProvider);
      const registry = createRegistry(db, epoch);

      await expect(
        registry.lookupAlias('NonExistent', new Map()),
      ).rejects.toThrow(QuorumError);

      try {
        await registry.lookupAlias('NonExistent', new Map());
      } catch (error) {
        expect((error as QuorumError).type).toBe(QuorumErrorType.AliasNotFound);
      }
    });

    it('should throw with insufficient shares', async () => {
      const epoch = createEpoch(3, 2);
      const db = createMockDatabase(memberPool, idProvider);
      const registry = createRegistry(db, epoch);

      const owner = memberPool[0].member;
      const ownerId = uint8ArrayToHex(
        idProvider.toBytes(owner.id),
      ) as HexString;

      await registry.registerAlias('LookupTest', ownerId, owner.publicKey);

      // Attempt lookup with empty shares — should fail
      await expect(
        registry.lookupAlias('LookupTest', new Map()),
      ).rejects.toThrow(QuorumError);
    });

    it('should recover identity with sufficient shares', async () => {
      const epoch = createEpoch(3, 2);
      const db = createMockDatabase(memberPool, idProvider);
      const registry = createRegistry(db, epoch);

      const owner = memberPool[0].member;
      const ownerId = uint8ArrayToHex(
        idProvider.toBytes(owner.id),
      ) as HexString;

      const aliasRecord = await registry.registerAlias(
        'RecoverableAlias',
        ownerId,
        owner.publicKey,
      );

      // Get the identity recovery record and decrypt shards
      const recoveryRecord = db.identityRecords.get(
        uint8ArrayToHex(
          aliasRecord.identityRecoveryRecordId as Uint8Array,
        ) as HexString,
      );
      expect(recoveryRecord).toBeDefined();

      // Decrypt threshold (2) shards from the 3 members
      const decryptedShares = new Map<HexString, string>();
      const decoder = new TextDecoder();
      let count = 0;

      for (const m of memberPool.slice(0, 3)) {
        if (count >= 2) break;
        const memberIdHex = uint8ArrayToHex(
          idProvider.toBytes(m.member.id),
        ) as HexString;
        // encryptedShardsByMemberId is keyed by TID (GuidV4Uint8Array)
        // find the matching shard by comparing hex representations
        let encryptedShard: Uint8Array | undefined;
        for (const [shardKey, shardVal] of recoveryRecord!
          .encryptedShardsByMemberId) {
          if (uint8ArrayToHex(shardKey as Uint8Array) === memberIdHex) {
            encryptedShard = shardVal;
            break;
          }
        }
        if (encryptedShard && m.member.privateKey) {
          const decrypted = await eciesService.decryptWithLengthAndHeader(
            m.member.privateKey.value,
            encryptedShard,
          );
          decryptedShares.set(memberIdHex, decoder.decode(decrypted));
          count++;
        }
      }

      expect(decryptedShares.size).toBeGreaterThanOrEqual(2);

      const recoveredId = await registry.lookupAlias(
        'RecoverableAlias',
        decryptedShares,
      );

      // The recovered ID should be a valid TID
      expect(recoveredId).toBeDefined();
    });
  });
});
