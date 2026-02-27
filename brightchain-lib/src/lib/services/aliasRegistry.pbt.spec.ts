/**
 * Property-Based Tests for AliasRegistry
 *
 * P8: Alias Uniqueness
 * For any two distinct members A and B, if A successfully registers alias "X",
 * then B's attempt to register alias "X" is rejected. No two active alias
 * records share the same aliasName.
 *
 * **Validates: Requirements 15.1, 15.9**
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

jest.setTimeout(120000);

/**
 * Creates a mock IQuorumDatabase that tracks aliases and identity records
 * in memory, with proper uniqueness checking for alias names.
 */
function createMockDatabase(
  memberPool: IMemberWithMnemonic<GuidV4Uint8Array>[],
  enhancedProvider: ReturnType<
    typeof ServiceProvider.getInstance<GuidV4Uint8Array>
  >['idProvider'],
): IQuorumDatabase<GuidV4Uint8Array> {
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

describe('AliasRegistry Property-Based Tests', () => {
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

  /**
   * **Validates: Requirements 15.1, 15.9**
   *
   * P8: Alias Uniqueness
   * For any two distinct members A and B, if A successfully registers alias "X",
   * then B's attempt to register alias "X" is rejected. No two active alias
   * records share the same aliasName.
   */
  describe('P8: Alias Uniqueness', () => {
    it('should reject duplicate alias registration by different members', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random alias names (alphanumeric, 3-20 chars)
          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{2,19}$/),
          // Pick two distinct member indices from the pool
          fc.integer({ min: 0, max: 4 }),
          fc.integer({ min: 0, max: 4 }),
          async (aliasName, memberIdxA, memberIdxB) => {
            // Ensure distinct members
            const idxA = memberIdxA % 5;
            const idxB = (memberIdxA + 1 + (memberIdxB % 4)) % 5;

            const memberA = memberPool[idxA];
            const memberB = memberPool[idxB];

            const memberAId = uint8ArrayToHex(
              idProvider.toBytes(memberA.member.id),
            ) as HexString;
            const memberBId = uint8ArrayToHex(
              idProvider.toBytes(memberB.member.id),
            ) as HexString;

            const epoch = createEpoch(5, 3);
            const db = createMockDatabase(memberPool.slice(0, 5), idProvider);
            const registry = createRegistry(db, epoch);

            // Member A registers the alias — should succeed
            const record = await registry.registerAlias(
              aliasName,
              memberAId,
              memberA.member.publicKey,
            );
            expect(record.aliasName).toBe(aliasName);
            expect(record.isActive).toBe(true);

            // Member B attempts to register the same alias — should fail
            try {
              await registry.registerAlias(
                aliasName,
                memberBId,
                memberB.member.publicKey,
              );
              // If we reach here, the test should fail
              expect(true).toBe(false);
            } catch (error) {
              expect(error).toBeInstanceOf(QuorumError);
              expect((error as QuorumError).type).toBe(
                QuorumErrorType.AliasAlreadyTaken,
              );
            }
          },
        ),
        { numRuns: 15 },
      );
    });
  });
});
