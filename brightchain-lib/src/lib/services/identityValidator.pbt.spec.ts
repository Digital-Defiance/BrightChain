/**
 * Property-Based Tests for IdentityValidator
 *
 * P15: Identity Validation Rejects Invalid Signatures
 * For any content signed with a key K1, validating that content against
 * a member whose public key is K2 (where K1 ≠ K2) SHALL reject the content
 * with an InvalidSignature error.
 *
 * **Validates: Requirements 16.1, 16.2**
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
import { sha3_512 } from '@noble/hashes/sha3';
import * as fc from 'fast-check';
import { IdentityValidationErrorType } from '../enumerations/identityValidationErrorType';
import { IdentityValidationError } from '../errors/identityValidationError';
import { initializeBrightChain } from '../init';
import { ContentWithIdentity } from '../interfaces/contentWithIdentity';
import { IQuorumDatabase } from '../interfaces/services/quorumDatabase';
import { IQuorumMember } from '../interfaces/services/quorumService';
import { IdentityValidator } from './identityValidator';
import { MembershipProofService } from './membershipProofService';
import { ServiceProvider } from './service.provider';

jest.setTimeout(120000);

/**
 * Create a mock database with the given member pool.
 */
function createMockDatabase(
  memberLookup: Map<HexString, IQuorumMember<GuidV4Uint8Array>>,
): IQuorumDatabase<GuidV4Uint8Array> {
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
    saveOperationalState: jest.fn(async () => {}),
    getOperationalState: jest.fn(async () => null),
    withTransaction: jest.fn(async <R>(fn: () => Promise<R>) => fn()),
    isAvailable: jest.fn(async () => true),
  };
}

/**
 * Compute the content digest used by IdentityValidator for signature verification.
 * Must match the implementation in identityValidator.ts.
 */
function computeContentDigest(
  content: ContentWithIdentity<GuidV4Uint8Array>,
): Uint8Array {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${content.contentId}:${content.contentType}`);
  const fullHash = sha3_512(data);
  return fullHash.slice(0, 32);
}

describe('IdentityValidator Property-Based Tests', () => {
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

    // Pre-generate a pool of members
    const names = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve'];
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

  /**
   * P15: Identity Validation Rejects Invalid Signatures
   *
   * For any content signed with key K1, validating against member with
   * public key K2 (K1 ≠ K2) SHALL reject with InvalidSignature.
   */
  describe('P15: Identity Validation Rejects Invalid Signatures', () => {
    it('content signed by one member is rejected when validated against a different member', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Pick two distinct member indices
          fc.integer({ min: 0, max: 4 }),
          fc.integer({ min: 0, max: 4 }),
          // Random content ID suffix
          fc.stringMatching(/^[a-f0-9]{8}$/),
          async (signerIdx, claimedIdx, contentSuffix) => {
            // Ensure signer and claimed member are different
            if (signerIdx === claimedIdx) return;

            const signer = memberPool[signerIdx];
            const claimed = memberPool[claimedIdx];

            const claimedId = idProvider.toBytes(claimed.member.id);
            const claimedHex = uint8ArrayToHex(claimedId) as HexString;

            // Build content with claimed member's ID
            const content: ContentWithIdentity<GuidV4Uint8Array> = {
              creatorId: claimed.member.id,
              contentId: `test-${contentSuffix}` as HexString,
              contentType: 'block',
              signature: new Uint8Array(64), // placeholder, will be replaced
            };

            // Sign with the SIGNER's private key (not the claimed member)
            const digest = computeContentDigest(content);
            if (!signer.member.privateKey) {
              return; // skip if no private key
            }
            content.signature = eciesService.signMessage(
              signer.member.privateKey.value,
              digest,
            );

            // Set up database with the claimed member
            const memberLookup = new Map<
              HexString,
              IQuorumMember<GuidV4Uint8Array>
            >();
            memberLookup.set(claimedHex, {
              id: claimed.member.id,
              publicKey: claimed.member.publicKey,
              metadata: { name: claimed.member.name },
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            const db = createMockDatabase(memberLookup);
            const validator = new IdentityValidator<GuidV4Uint8Array>(
              db,
              eciesService,
              membershipProofService,
            );

            // Validation should reject with InvalidSignature
            try {
              await validator.validateContent(content);
              // If we get here, the test failed
              expect(true).toBe(false);
            } catch (error) {
              expect(error).toBeInstanceOf(IdentityValidationError);
              expect((error as IdentityValidationError).type).toBe(
                IdentityValidationErrorType.InvalidSignature,
              );
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    it('content signed by the correct member is accepted', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Pick a member index
          fc.integer({ min: 0, max: 4 }),
          fc.stringMatching(/^[a-f0-9]{8}$/),
          async (memberIdx, contentSuffix) => {
            const m = memberPool[memberIdx];
            const memberId = idProvider.toBytes(m.member.id);
            const memberHex = uint8ArrayToHex(memberId) as HexString;

            const content: ContentWithIdentity<GuidV4Uint8Array> = {
              creatorId: m.member.id,
              contentId: `valid-${contentSuffix}` as HexString,
              contentType: 'block',
              signature: new Uint8Array(64),
            };

            // Sign with the correct member's private key
            const digest = computeContentDigest(content);
            if (!m.member.privateKey) return;
            content.signature = eciesService.signMessage(
              m.member.privateKey.value,
              digest,
            );

            const memberLookup = new Map<
              HexString,
              IQuorumMember<GuidV4Uint8Array>
            >();
            memberLookup.set(memberHex, {
              id: m.member.id,
              publicKey: m.member.publicKey,
              metadata: { name: m.member.name },
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            const db = createMockDatabase(memberLookup);
            const validator = new IdentityValidator<GuidV4Uint8Array>(
              db,
              eciesService,
              membershipProofService,
            );

            const result = await validator.validateContent(content);
            expect(result.valid).toBe(true);
            expect(result.resolvedMemberId).toBe(memberHex);
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
