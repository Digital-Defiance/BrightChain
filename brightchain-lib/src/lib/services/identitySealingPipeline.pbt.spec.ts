/**
 * Property-Based Tests for IdentitySealingPipeline
 *
 * P7: Identity Sealing Round-Trip
 * For any member identity ID and content C,
 * recoverIdentity(sealIdentity(C, ID).recoveryRecordId, sufficientShares)
 * returns ID. The content's creatorId field after sealing is either the alias ID,
 * Anonymous_ID, or the real ID depending on mode.
 *
 * **Validates: Requirements 14.1, 14.2, 14.3, 14.6, 14.7**
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
import * as fc from 'fast-check';
import { QuorumOperationalMode } from '../enumerations/quorumOperationalMode';
import { initializeBrightChain } from '../init';
import {
  ContentWithIdentity,
  IdentityMode,
} from '../interfaces/contentWithIdentity';
import { IdentityRecoveryRecord } from '../interfaces/identityRecoveryRecord';
import { QuorumEpoch } from '../interfaces/quorumEpoch';
import { IQuorumDatabase } from '../interfaces/services/quorumDatabase';
import { IQuorumMember } from '../interfaces/services/quorumService';
import { IdentitySealingPipeline } from './identitySealingPipeline';
import { SealingService } from './sealing.service';
import { ServiceProvider } from './service.provider';

jest.setTimeout(120000);

/**
 * Creates a mock IQuorumDatabase that stores identity records in memory
 * and returns member records with public keys from the provided member pool.
 */
function createMockDatabase(
  memberPool: IMemberWithMnemonic<GuidV4Uint8Array>[],
  enhancedProvider: ReturnType<
    typeof ServiceProvider.getInstance<GuidV4Uint8Array>
  >['idProvider'],
): IQuorumDatabase<GuidV4Uint8Array> {
  const identityRecords = new Map<
    HexString,
    IdentityRecoveryRecord<GuidV4Uint8Array>
  >();

  // Build member lookup by HexString
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
    isAvailable: jest.fn(async () => true),
  };
}

describe('IdentitySealingPipeline Property-Based Tests', () => {
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
    const members = memberPool.slice(0, memberCount);
    return {
      epochNumber: 1,
      memberIds: members.map((m) => m.member.id),
      threshold,
      mode: QuorumOperationalMode.Quorum,
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

  async function decryptShards(
    record: IdentityRecoveryRecord<GuidV4Uint8Array>,
    memberCount: number,
  ): Promise<Map<HexString, string>> {
    const decryptedShares = new Map<HexString, string>();
    const members = memberPool.slice(0, memberCount);

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
        // Shares were encoded as UTF-8 strings before ECIES encryption
        const decoder = new TextDecoder();
        decryptedShares.set(memberId, decoder.decode(decrypted));
      }
    }

    return decryptedShares;
  }

  /**
   * **Validates: Requirements 14.1, 14.2, 14.3, 14.6, 14.7**
   *
   * P7: Identity Sealing Round-Trip
   * For any member identity ID and content C,
   * recoverIdentity(sealIdentity(C, ID).recoveryRecordId, sufficientShares)
   * returns ID. The content's creatorId field after sealing is either the alias ID,
   * Anonymous_ID, or the real ID depending on mode.
   */
  describe('P7: Identity Sealing Round-Trip', () => {
    it('should round-trip seal/recover identity across modes and member counts', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Pick member count between 2 and 5
          fc.integer({ min: 2, max: 5 }),
          // Pick threshold (will be clamped to valid range)
          fc.integer({ min: 2, max: 5 }),
          // Pick identity mode
          fc.constantFrom(
            IdentityMode.Real,
            IdentityMode.Alias,
            IdentityMode.Anonymous,
          ),
          async (memberCount, rawThreshold, mode) => {
            const threshold = Math.max(2, Math.min(rawThreshold, memberCount));

            // Use a member from the pool as the content creator
            const creator = memberPool[0].member;
            const creatorId = creator.id;

            const epoch = createEpoch(memberCount, threshold);
            const db = createMockDatabase(
              memberPool.slice(0, memberCount),
              idProvider,
            );

            const pipeline = new IdentitySealingPipeline<GuidV4Uint8Array>(
              db,
              sealingService,
              eciesService,
              async () => epoch,
              async () => null,
            );

            const content = createContent(creatorId);
            const aliasName =
              mode === IdentityMode.Alias ? 'TestAlias' : undefined;

            // Seal the identity
            const result = await pipeline.sealIdentity(
              content,
              mode,
              aliasName,
            );

            // Verify the recovery record was stored
            expect(result.recoveryRecordId).toBeDefined();
            expect(result.modifiedContent.identityRecoveryRecordId).toBe(
              result.recoveryRecordId,
            );

            // Verify identity replacement based on mode
            const modifiedCreatorBytes = idProvider.toBytes(
              result.modifiedContent.creatorId,
            );
            switch (mode) {
              case IdentityMode.Real:
                // creatorId should be unchanged
                expect(
                  idProvider.equals(
                    result.modifiedContent.creatorId,
                    creatorId,
                  ),
                ).toBe(true);
                break;
              case IdentityMode.Anonymous:
                // creatorId should be all zeroes
                expect(modifiedCreatorBytes.every((b) => b === 0)).toBe(true);
                break;
              case IdentityMode.Alias:
                // creatorId should NOT be the original
                expect(
                  idProvider.equals(
                    result.modifiedContent.creatorId,
                    creatorId,
                  ),
                ).toBe(false);
                break;
            }

            // Recover the identity using threshold shares
            const record = await db.getIdentityRecord(
              result.recoveryRecordId as unknown as GuidV4Uint8Array,
            );
            expect(record).not.toBeNull();

            const allShares = await decryptShards(record!, memberCount);
            // Take exactly threshold shares
            const thresholdShares = new Map<HexString, string>();
            let count = 0;
            for (const [k, v] of allShares) {
              if (count >= threshold) break;
              thresholdShares.set(k, v);
              count++;
            }

            const recoveredId = await pipeline.recoverIdentity(
              result.recoveryRecordId,
              thresholdShares,
            );

            // The recovered identity should match the original
            expect(idProvider.equals(recoveredId, creatorId)).toBe(true);
          },
        ),
        { numRuns: 15 },
      );
    });
  });
});
