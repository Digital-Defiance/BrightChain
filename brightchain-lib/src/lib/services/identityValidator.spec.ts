/**
 * Unit tests for IdentityValidator.
 *
 * Tests each validation path (real/alias/anonymous),
 * banned user rejection, suspended user rejection,
 * and missing membership proof on anonymous content.
 *
 * @see Requirements 16
 */
import {
  ECIESService,
  EmailString,
  GuidV4Uint8Array,
  IMemberWithMnemonic,
  Member,
  MemberType,
  ShortHexGuid,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { sha3_512 } from '@noble/hashes/sha3';
import { IdentityValidationErrorType } from '../enumerations/identityValidationErrorType';
import { MemberStatusType } from '../enumerations/memberStatusType';
import { IdentityValidationError } from '../errors/identityValidationError';
import { initializeBrightChain } from '../init';
import { AliasRecord } from '../interfaces/aliasRecord';
import {
  ContentWithIdentity,
  IdentityMode,
} from '../interfaces/contentWithIdentity';
import { IdentityRecoveryRecord } from '../interfaces/identityRecoveryRecord';
import { IQuorumDatabase } from '../interfaces/services/quorumDatabase';
import { IQuorumMember } from '../interfaces/services/quorumService';
import { ANONYMOUS_ID } from './identitySealingPipeline';
import { IdentityValidator } from './identityValidator';
import { MembershipProofService } from './membershipProofService';
import { ServiceProvider } from './service.provider';

jest.setTimeout(60000);

/**
 * Compute the content digest matching IdentityValidator's internal implementation.
 */
function computeContentDigest(
  content: ContentWithIdentity<GuidV4Uint8Array>,
): Uint8Array {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${content.contentId}:${content.contentType}`);
  const fullHash = sha3_512(data);
  return fullHash.slice(0, 32);
}

/**
 * Create a mock database with configurable member lookup, aliases, and identity records.
 */
function createMockDatabase(opts: {
  members?: Map<ShortHexGuid, IQuorumMember<GuidV4Uint8Array>>;
  aliases?: Map<string, AliasRecord<GuidV4Uint8Array>>;
  identityRecords?: Map<ShortHexGuid, IdentityRecoveryRecord<GuidV4Uint8Array>>;
}): IQuorumDatabase<GuidV4Uint8Array> {
  const members = opts.members ?? new Map();
  const aliases = opts.aliases ?? new Map();
  const identityRecords = opts.identityRecords ?? new Map();

  return {
    saveEpoch: jest.fn(async () => {}),
    getEpoch: jest.fn(async () => null),
    getCurrentEpoch: jest.fn(async () => {
      throw new Error('Not implemented');
    }),
    saveMember: jest.fn(async () => {}),
    getMember: jest.fn(
      async (memberId: ShortHexGuid) => members.get(memberId) ?? null,
    ),
    listActiveMembers: jest.fn(async () => Array.from(members.values())),
    saveDocument: jest.fn(async () => {}),
    getDocument: jest.fn(async () => null),
    listDocumentsByEpoch: jest.fn(async () => []),
    saveProposal: jest.fn(async () => {}),
    getProposal: jest.fn(async () => null),
    saveVote: jest.fn(async () => {}),
    getVotesForProposal: jest.fn(async () => []),
    saveIdentityRecord: jest.fn(async () => {}),
    getIdentityRecord: jest.fn(
      async (recordId: ShortHexGuid) => identityRecords.get(recordId) ?? null,
    ),
    deleteIdentityRecord: jest.fn(async () => {}),
    listExpiredIdentityRecords: jest.fn(async () => []),
    saveAlias: jest.fn(async () => {}),
    getAlias: jest.fn(
      async (aliasName: string) => aliases.get(aliasName) ?? null,
    ),
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

describe('IdentityValidator Unit Tests', () => {
  let eciesService: ECIESService<GuidV4Uint8Array>;
  let idProvider: ReturnType<
    typeof ServiceProvider.getInstance<GuidV4Uint8Array>
  >['idProvider'];
  const memberPool: IMemberWithMnemonic<GuidV4Uint8Array>[] = [];
  const membershipProofService = new MembershipProofService<GuidV4Uint8Array>();

  beforeAll(() => {
    initializeBrightChain();
    const sp = ServiceProvider.getInstance<GuidV4Uint8Array>();
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

  /** Helper: create a member lookup map from pool indices */
  function buildMemberLookup(
    indices: number[],
    overrides?: Partial<IQuorumMember<GuidV4Uint8Array>>,
  ): Map<ShortHexGuid, IQuorumMember<GuidV4Uint8Array>> {
    const map = new Map<ShortHexGuid, IQuorumMember<GuidV4Uint8Array>>();
    for (const idx of indices) {
      const m = memberPool[idx].member;
      const hex = uint8ArrayToHex(idProvider.toBytes(m.id)) as ShortHexGuid;
      map.set(hex, {
        id: hex,
        publicKey: m.publicKey,
        metadata: { name: m.name },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      });
    }
    return map;
  }

  /** Helper: sign content with a member's private key */
  function signContent(
    content: ContentWithIdentity<GuidV4Uint8Array>,
    memberIdx: number,
  ): ContentWithIdentity<GuidV4Uint8Array> {
    const m = memberPool[memberIdx];
    const digest = computeContentDigest(content);
    return {
      ...content,
      signature: eciesService.signMessage(m.member.privateKey!.value, digest),
    };
  }

  // ─── Real Identity Validation ─────────────────────────────────────────

  describe('Real identity validation', () => {
    it('should accept content with valid signature from known member', async () => {
      const m = memberPool[0].member;
      const memberId = uint8ArrayToHex(
        idProvider.toBytes(m.id),
      ) as ShortHexGuid;

      let content: ContentWithIdentity<GuidV4Uint8Array> = {
        creatorId: m.id,
        contentId: 'test-real-valid' as ShortHexGuid,
        contentType: 'block',
        signature: new Uint8Array(64),
      };
      content = signContent(content, 0);

      const db = createMockDatabase({ members: buildMemberLookup([0]) });
      const validator = new IdentityValidator<GuidV4Uint8Array>(
        db,
        eciesService,
        membershipProofService,
      );

      const result = await validator.validateContent(content);
      expect(result.valid).toBe(true);
      expect(result.identityMode).toBe(IdentityMode.Real);
      expect(result.resolvedMemberId).toBe(memberId);
    });

    it('should reject content with invalid signature', async () => {
      const m = memberPool[0].member;

      const content: ContentWithIdentity<GuidV4Uint8Array> = {
        creatorId: m.id,
        contentId: 'test-real-invalid' as ShortHexGuid,
        contentType: 'block',
        signature: new Uint8Array(64), // zeroed = invalid
      };

      const db = createMockDatabase({ members: buildMemberLookup([0]) });
      const validator = new IdentityValidator<GuidV4Uint8Array>(
        db,
        eciesService,
        membershipProofService,
      );

      await expect(validator.validateContent(content)).rejects.toThrow(
        IdentityValidationError,
      );

      try {
        await validator.validateContent(content);
      } catch (error) {
        expect((error as IdentityValidationError).type).toBe(
          IdentityValidationErrorType.InvalidSignature,
        );
      }
    });

    it('should reject content from unknown member', async () => {
      const m = memberPool[0].member;

      let content: ContentWithIdentity<GuidV4Uint8Array> = {
        creatorId: m.id,
        contentId: 'test-unknown' as ShortHexGuid,
        contentType: 'block',
        signature: new Uint8Array(64),
      };
      content = signContent(content, 0);

      // Empty member database
      const db = createMockDatabase({ members: new Map() });
      const validator = new IdentityValidator<GuidV4Uint8Array>(
        db,
        eciesService,
        membershipProofService,
      );

      await expect(validator.validateContent(content)).rejects.toThrow(
        IdentityValidationError,
      );
    });
  });

  // ─── Banned / Suspended User Rejection ─────────────────────────────

  describe('Banned user rejection', () => {
    it('should reject content from a banned member', async () => {
      const m = memberPool[0].member;

      let content: ContentWithIdentity<GuidV4Uint8Array> = {
        creatorId: m.id,
        contentId: 'test-banned' as ShortHexGuid,
        contentType: 'block',
        signature: new Uint8Array(64),
      };
      content = signContent(content, 0);

      const members = buildMemberLookup([0], {
        status: MemberStatusType.Banned,
      });
      const db = createMockDatabase({ members });
      const validator = new IdentityValidator<GuidV4Uint8Array>(
        db,
        eciesService,
        membershipProofService,
      );

      try {
        await validator.validateContent(content);
        expect(true).toBe(false); // should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(IdentityValidationError);
        expect((error as IdentityValidationError).type).toBe(
          IdentityValidationErrorType.BannedUser,
        );
      }
    });
  });

  describe('Suspended user rejection', () => {
    it('should reject content from a suspended member', async () => {
      const m = memberPool[0].member;

      let content: ContentWithIdentity<GuidV4Uint8Array> = {
        creatorId: m.id,
        contentId: 'test-suspended' as ShortHexGuid,
        contentType: 'block',
        signature: new Uint8Array(64),
      };
      content = signContent(content, 0);

      const members = buildMemberLookup([0], {
        status: MemberStatusType.Suspended,
      });
      const db = createMockDatabase({ members });
      const validator = new IdentityValidator<GuidV4Uint8Array>(
        db,
        eciesService,
        membershipProofService,
      );

      try {
        await validator.validateContent(content);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(IdentityValidationError);
        expect((error as IdentityValidationError).type).toBe(
          IdentityValidationErrorType.SuspendedUser,
        );
      }
    });
  });

  // ─── Alias Identity Validation ─────────────────────────────────────

  describe('Alias identity validation', () => {
    it('should accept content with valid alias signature', async () => {
      // Generate an alias keypair
      const mnemonic = eciesService.generateNewMnemonic();
      const aliasKeyPair = eciesService.mnemonicToSimpleKeyPair(mnemonic);

      const owner = memberPool[0].member;
      const ownerId = uint8ArrayToHex(
        idProvider.toBytes(owner.id),
      ) as ShortHexGuid;

      // Create alias record
      const aliases = new Map<string, AliasRecord<GuidV4Uint8Array>>();
      aliases.set('TestAlias', {
        aliasName: 'TestAlias',
        ownerMemberId: ownerId,
        aliasPublicKey: aliasKeyPair.publicKey,
        identityRecoveryRecordId: 'recovery-1' as ShortHexGuid,
        isActive: true,
        registeredAt: new Date(),
        epochNumber: 1,
      });

      // Create identity recovery record linking to alias
      const identityRecords = new Map<
        ShortHexGuid,
        IdentityRecoveryRecord<GuidV4Uint8Array>
      >();
      identityRecords.set('recovery-1' as ShortHexGuid, {
        id: 'recovery-1' as ShortHexGuid,
        contentId: 'alias-content-1' as ShortHexGuid,
        contentType: 'block',
        encryptedShardsByMemberId: new Map(),
        memberIds: [ownerId],
        threshold: 1,
        epochNumber: 1,
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        identityMode: IdentityMode.Alias,
        aliasName: 'TestAlias',
      });

      // Build content with a generated creatorId (not a known member)
      const fakeCreatorId = idProvider.generateTyped();
      let content: ContentWithIdentity<GuidV4Uint8Array> = {
        creatorId: fakeCreatorId,
        contentId: 'alias-content-1' as ShortHexGuid,
        contentType: 'block',
        signature: new Uint8Array(64),
        identityRecoveryRecordId: 'recovery-1' as ShortHexGuid,
      };

      // Sign with alias private key
      const digest = computeContentDigest(content);
      content.signature = eciesService.signMessage(
        aliasKeyPair.privateKey,
        digest,
      );

      const members = buildMemberLookup([0]);
      const db = createMockDatabase({ members, aliases, identityRecords });
      const validator = new IdentityValidator<GuidV4Uint8Array>(
        db,
        eciesService,
        membershipProofService,
      );

      const result = await validator.validateContent(content);
      expect(result.valid).toBe(true);
      expect(result.identityMode).toBe(IdentityMode.Alias);
      expect(result.resolvedMemberId).toBe(ownerId);
    });

    it('should reject content with unregistered alias', async () => {
      const fakeCreatorId = idProvider.generateTyped();

      // Identity record points to a non-existent alias
      const identityRecords = new Map<
        ShortHexGuid,
        IdentityRecoveryRecord<GuidV4Uint8Array>
      >();
      identityRecords.set('recovery-missing' as ShortHexGuid, {
        id: 'recovery-missing' as ShortHexGuid,
        contentId: 'alias-missing' as ShortHexGuid,
        contentType: 'block',
        encryptedShardsByMemberId: new Map(),
        memberIds: [],
        threshold: 1,
        epochNumber: 1,
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        identityMode: IdentityMode.Alias,
        aliasName: 'NonExistentAlias',
      });

      const content: ContentWithIdentity<GuidV4Uint8Array> = {
        creatorId: fakeCreatorId,
        contentId: 'alias-missing' as ShortHexGuid,
        contentType: 'block',
        signature: new Uint8Array(64),
        identityRecoveryRecordId: 'recovery-missing' as ShortHexGuid,
      };

      const db = createMockDatabase({ identityRecords });
      const validator = new IdentityValidator<GuidV4Uint8Array>(
        db,
        eciesService,
        membershipProofService,
      );

      try {
        await validator.validateContent(content);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(IdentityValidationError);
        expect((error as IdentityValidationError).type).toBe(
          IdentityValidationErrorType.UnregisteredAlias,
        );
      }
    });

    it('should reject content with inactive alias', async () => {
      const mnemonic = eciesService.generateNewMnemonic();
      const aliasKeyPair = eciesService.mnemonicToSimpleKeyPair(mnemonic);
      const ownerId = 'owner-1' as ShortHexGuid;

      const aliases = new Map<string, AliasRecord<GuidV4Uint8Array>>();
      aliases.set('InactiveAlias', {
        aliasName: 'InactiveAlias',
        ownerMemberId: ownerId,
        aliasPublicKey: aliasKeyPair.publicKey,
        identityRecoveryRecordId: 'recovery-inactive' as ShortHexGuid,
        isActive: false,
        registeredAt: new Date(),
        deactivatedAt: new Date(),
        epochNumber: 1,
      });

      const identityRecords = new Map<
        ShortHexGuid,
        IdentityRecoveryRecord<GuidV4Uint8Array>
      >();
      identityRecords.set('recovery-inactive' as ShortHexGuid, {
        id: 'recovery-inactive' as ShortHexGuid,
        contentId: 'alias-inactive' as ShortHexGuid,
        contentType: 'block',
        encryptedShardsByMemberId: new Map(),
        memberIds: [],
        threshold: 1,
        epochNumber: 1,
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        identityMode: IdentityMode.Alias,
        aliasName: 'InactiveAlias',
      });

      const fakeCreatorId = idProvider.generateTyped();
      const content: ContentWithIdentity<GuidV4Uint8Array> = {
        creatorId: fakeCreatorId,
        contentId: 'alias-inactive' as ShortHexGuid,
        contentType: 'block',
        signature: new Uint8Array(64),
        identityRecoveryRecordId: 'recovery-inactive' as ShortHexGuid,
      };

      const db = createMockDatabase({ aliases, identityRecords });
      const validator = new IdentityValidator<GuidV4Uint8Array>(
        db,
        eciesService,
        membershipProofService,
      );

      try {
        await validator.validateContent(content);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(IdentityValidationError);
        expect((error as IdentityValidationError).type).toBe(
          IdentityValidationErrorType.InactiveAlias,
        );
      }
    });

    it('should reject alias content when owner is banned', async () => {
      const mnemonic = eciesService.generateNewMnemonic();
      const aliasKeyPair = eciesService.mnemonicToSimpleKeyPair(mnemonic);

      const owner = memberPool[0].member;
      const ownerId = uint8ArrayToHex(
        idProvider.toBytes(owner.id),
      ) as ShortHexGuid;

      const aliases = new Map<string, AliasRecord<GuidV4Uint8Array>>();
      aliases.set('BannedOwnerAlias', {
        aliasName: 'BannedOwnerAlias',
        ownerMemberId: ownerId,
        aliasPublicKey: aliasKeyPair.publicKey,
        identityRecoveryRecordId: 'recovery-banned' as ShortHexGuid,
        isActive: true,
        registeredAt: new Date(),
        epochNumber: 1,
      });

      const identityRecords = new Map<
        ShortHexGuid,
        IdentityRecoveryRecord<GuidV4Uint8Array>
      >();
      identityRecords.set('recovery-banned' as ShortHexGuid, {
        id: 'recovery-banned' as ShortHexGuid,
        contentId: 'alias-banned-owner' as ShortHexGuid,
        contentType: 'block',
        encryptedShardsByMemberId: new Map(),
        memberIds: [ownerId],
        threshold: 1,
        epochNumber: 1,
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        identityMode: IdentityMode.Alias,
        aliasName: 'BannedOwnerAlias',
      });

      const fakeCreatorId = idProvider.generateTyped();
      let content: ContentWithIdentity<GuidV4Uint8Array> = {
        creatorId: fakeCreatorId,
        contentId: 'alias-banned-owner' as ShortHexGuid,
        contentType: 'block',
        signature: new Uint8Array(64),
        identityRecoveryRecordId: 'recovery-banned' as ShortHexGuid,
      };

      // Sign with alias key (valid signature)
      const digest = computeContentDigest(content);
      content.signature = eciesService.signMessage(
        aliasKeyPair.privateKey,
        digest,
      );

      // Owner is banned
      const members = buildMemberLookup([0], {
        status: MemberStatusType.Banned,
      });
      const db = createMockDatabase({ members, aliases, identityRecords });
      const validator = new IdentityValidator<GuidV4Uint8Array>(
        db,
        eciesService,
        membershipProofService,
      );

      try {
        await validator.validateContent(content);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(IdentityValidationError);
        expect((error as IdentityValidationError).type).toBe(
          IdentityValidationErrorType.BannedUser,
        );
      }
    });
  });

  // ─── Anonymous Identity Validation ─────────────────────────────────

  describe('Anonymous identity validation', () => {
    it('should reject anonymous content without membership proof', async () => {
      // Create content with ANONYMOUS_ID as creatorId
      const anonymousId = idProvider.fromBytes(new Uint8Array(ANONYMOUS_ID));

      const content: ContentWithIdentity<GuidV4Uint8Array> = {
        creatorId: anonymousId,
        contentId: 'test-anon-no-proof' as ShortHexGuid,
        contentType: 'block',
        signature: new Uint8Array(64),
        // No membershipProof
      };

      const members = buildMemberLookup([0, 1, 2]);
      const db = createMockDatabase({ members });
      const validator = new IdentityValidator<GuidV4Uint8Array>(
        db,
        eciesService,
        membershipProofService,
      );

      try {
        await validator.validateContent(content);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(IdentityValidationError);
        expect((error as IdentityValidationError).type).toBe(
          IdentityValidationErrorType.MissingMembershipProof,
        );
      }
    });

    it('should reject anonymous content with invalid membership proof', async () => {
      const anonymousId = idProvider.fromBytes(new Uint8Array(ANONYMOUS_ID));

      const content: ContentWithIdentity<GuidV4Uint8Array> = {
        creatorId: anonymousId,
        contentId: 'test-anon-bad-proof' as ShortHexGuid,
        contentType: 'block',
        signature: new Uint8Array(64),
        membershipProof: new Uint8Array(128), // garbage proof
      };

      const members = buildMemberLookup([0, 1, 2]);
      const db = createMockDatabase({ members });
      const validator = new IdentityValidator<GuidV4Uint8Array>(
        db,
        eciesService,
        membershipProofService,
      );

      try {
        await validator.validateContent(content);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(IdentityValidationError);
        expect((error as IdentityValidationError).type).toBe(
          IdentityValidationErrorType.InvalidMembershipProof,
        );
      }
    });

    it('should accept anonymous content with valid membership proof', async () => {
      const anonymousId = idProvider.fromBytes(new Uint8Array(ANONYMOUS_ID));

      const content: ContentWithIdentity<GuidV4Uint8Array> = {
        creatorId: anonymousId,
        contentId: 'test-anon-valid' as ShortHexGuid,
        contentType: 'block',
        signature: new Uint8Array(64),
      };

      // Generate a valid ring signature proof
      const memberKeys = memberPool.map((m) => m.member.publicKey);
      const contentHash = computeContentDigest(content);
      const signerPrivateKey = memberPool[0].member.privateKey!.value;

      const proof = await membershipProofService.generateProof(
        signerPrivateKey,
        memberKeys,
        contentHash,
      );
      content.membershipProof = proof;

      const members = buildMemberLookup([0, 1, 2]);
      const db = createMockDatabase({ members });
      const validator = new IdentityValidator<GuidV4Uint8Array>(
        db,
        eciesService,
        membershipProofService,
      );

      const result = await validator.validateContent(content);
      expect(result.valid).toBe(true);
      expect(result.identityMode).toBe(IdentityMode.Anonymous);
      expect(result.resolvedMemberId).toBeUndefined();
    });

    it('should reject anonymous content with proof bound to different content', async () => {
      const anonymousId = idProvider.fromBytes(new Uint8Array(ANONYMOUS_ID));

      // Generate proof for different content
      const otherContent: ContentWithIdentity<GuidV4Uint8Array> = {
        creatorId: anonymousId,
        contentId: 'other-content' as ShortHexGuid,
        contentType: 'block',
        signature: new Uint8Array(64),
      };

      const memberKeys = memberPool.map((m) => m.member.publicKey);
      const otherHash = computeContentDigest(otherContent);
      const signerPrivateKey = memberPool[0].member.privateKey!.value;

      const proof = await membershipProofService.generateProof(
        signerPrivateKey,
        memberKeys,
        otherHash,
      );

      // Use the proof on different content
      const content: ContentWithIdentity<GuidV4Uint8Array> = {
        creatorId: anonymousId,
        contentId: 'actual-content' as ShortHexGuid,
        contentType: 'block',
        signature: new Uint8Array(64),
        membershipProof: proof,
      };

      const members = buildMemberLookup([0, 1, 2]);
      const db = createMockDatabase({ members });
      const validator = new IdentityValidator<GuidV4Uint8Array>(
        db,
        eciesService,
        membershipProofService,
      );

      try {
        await validator.validateContent(content);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(IdentityValidationError);
        expect((error as IdentityValidationError).type).toBe(
          IdentityValidationErrorType.InvalidMembershipProof,
        );
      }
    });
  });
});
