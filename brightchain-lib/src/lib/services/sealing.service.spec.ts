/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  EmailString,
  GuidV4,
  IMemberWithMnemonic,
  Member,
} from '@digitaldefiance/ecies-lib';
import { SEALING } from '../constants';
import { MemberType } from '../enumerations/memberType';
import { SealingErrorType } from '../enumerations/sealingErrorType';
import { SealingError } from '../errors/sealingError';
import { initializeBrightChain } from '../init';
import { QuorumDataRecord } from '../quorumDataRecord';
import { SealingService } from './sealing.service';
import { ServiceProvider } from './service.provider';

// Set a longer timeout for all tests in this file
jest.setTimeout(30000);

describe('SealingService', () => {
  // Shared test data
  let alice: IMemberWithMnemonic<GuidV4>;
  let bob: IMemberWithMnemonic<GuidV4>;
  let charlie: IMemberWithMnemonic<GuidV4>;
  let david: IMemberWithMnemonic<GuidV4>;
  let members: Member<GuidV4>[];
  const testDocument = { hello: 'world' };
  let sealingService: SealingService<GuidV4>;
  let _idProvider = ServiceProvider.getInstance<GuidV4>().idProvider;

  beforeAll(() => {
    // Initialize BrightChain with browser-compatible configuration
    initializeBrightChain();

    const eciesService = ServiceProvider.getInstance<GuidV4>().eciesService;
    sealingService = ServiceProvider.getInstance<GuidV4>().sealingService;

    // Create all members once
    alice = Member.newMember<GuidV4>(
      eciesService,
      MemberType.System,
      'Alice',
      new EmailString('alice@example.com'),
    );
    bob = Member.newMember(
      eciesService,
      MemberType.System,
      'Bob',
      new EmailString('bob@example.com'),
    );
    charlie = Member.newMember(
      eciesService,
      MemberType.System,
      'Charlie',
      new EmailString('charlie@example.com'),
    );
    david = Member.newMember(
      eciesService,
      MemberType.System,
      'David',
      new EmailString('david@example.com'),
    );
    david.member.unloadWalletAndPrivateKey(); // Pre-configure david without private key
    members = [alice.member, bob.member, charlie.member];
  });

  describe('allMembersHavePrivateKey', () => {
    it('should validate that all members have a private key loaded', () => {
      expect(SealingService.allMembersHavePrivateKey(members)).toEqual(true);
    });

    it('should return false when one member does not have a private key loaded', () => {
      const membersWithDavid = [...members, david.member];
      expect(SealingService.allMembersHavePrivateKey(membersWithDavid)).toEqual(
        false,
      );
    });
  });

  describe('document sealing and unsealing', () => {
    let sealedDocument: QuorumDataRecord<GuidV4>;

    beforeAll(async () => {
      // Create sealed document once for reuse
      sealedDocument = await sealingService.quorumSeal(
        alice.member,
        testDocument,
        members,
      );
    });

    it('should seal and unlock a document', async () => {
      const unlockedDocument = await sealingService.quorumUnseal<{
        hello: string;
      }>(sealedDocument, members);
      expect(unlockedDocument).toEqual(testDocument);
    });

    it('should be able to convert to and from json', async () => {
      const sealedJson = sealedDocument.toJson();
      const rebuiltDocument = QuorumDataRecord.fromJson<GuidV4>(
        sealedJson,
        (_memberId: any) => {
          return members[0]; // Simplified for test
        },
      );
      const unlockedDocument = await sealingService.quorumUnseal<{
        hello: string;
      }>(rebuiltDocument, members);
      expect(unlockedDocument).toEqual(testDocument);
    });

    it('should throw error for insufficient members', async () => {
      // The test expects a SealingError to be thrown, but the current implementation
      // may not be throwing the expected error. Let's check what actually happens.
      try {
        await sealingService.quorumUnseal(sealedDocument, [alice.member]);
        // If we get here, no error was thrown - this is the actual issue
        throw new Error('Expected SealingError but no error was thrown');
      } catch (error) {
        // Check if it's the expected SealingError
        if (error instanceof SealingError) {
          expect(error.type).toEqual(SealingErrorType.NotEnoughMembersToUnlock);
        } else {
          // Re-throw if it's not the expected error type
          throw error;
        }
      }
    });
  });

  describe('input validation', () => {
    it('should throw error for invalid members', () => {
      expect(
        async () =>
          await sealingService.quorumSeal(alice.member, { data: 123 }, [], 1),
      ).toThrowType(SealingError, (error: SealingError) => {
        expect(error.type).toEqual(SealingErrorType.NotEnoughMembersToUnlock);
      });
    });

    describe('reinitSecrets', () => {
      it('should throw error for invalid maxShares', () => {
        expect(async () => sealingService.reinitSecrets(0)).toThrowType(
          SealingError,
          (error: SealingError) => {
            expect(error.type).toEqual(SealingErrorType.InvalidBitRange);
          },
        );
        expect(async () =>
          sealingService.reinitSecrets(SEALING.MAX_SHARES + 1),
        ).toThrowType(SealingError, (error: SealingError) => {
          expect(error.type).toEqual(SealingErrorType.InvalidBitRange);
        });
      });

      it('should correctly initialize secrets for valid maxShares', () => {
        expect(() => sealingService.reinitSecrets(10)).not.toThrow();
      });
    });

    describe('validateQuorumSealInputs', () => {
      it('should throw error for invalid member count', () => {
        expect(() =>
          SealingService.validateQuorumSealInputs([], 2),
        ).toThrowType(SealingError, (error: SealingError) => {
          expect(error.type).toEqual(SealingErrorType.NotEnoughMembersToUnlock);
        });

        const tooManyMembers = Array(SEALING.MAX_SHARES + 1).fill(alice);
        expect(() =>
          SealingService.validateQuorumSealInputs(tooManyMembers, 2),
        ).toThrowType(SealingError, (error: SealingError) => {
          expect(error.type).toEqual(SealingErrorType.TooManyMembersToUnlock);
        });
      });

      it('should throw error for invalid sharesRequired', () => {
        expect(() =>
          SealingService.validateQuorumSealInputs(
            [alice.member, bob.member],
            0,
          ),
        ).toThrowType(SealingError, (error: SealingError) => {
          expect(error.type).toEqual(SealingErrorType.NotEnoughMembersToUnlock);
        });
        expect(() =>
          SealingService.validateQuorumSealInputs(
            [alice.member, bob.member],
            3,
          ),
        ).toThrowType(SealingError, (error: SealingError) => {
          expect(error.type).toEqual(SealingErrorType.NotEnoughMembersToUnlock);
        });
      });
    });
  });
});
