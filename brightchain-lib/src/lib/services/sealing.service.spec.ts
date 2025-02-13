import { BrightChainMember } from '../brightChainMember';
import { SEALING } from '../constants';
import { EmailString } from '../emailString';
import { MemberType } from '../enumerations/memberType';
import { SealingErrorType } from '../enumerations/sealingErrorType';
import { SealingError } from '../errors/sealingError';
import { IMemberWithMnemonic } from '../interfaces/member/memberWithMnemonic';
import { QuorumDataRecord } from '../quorumDataRecord';
import { ServiceProvider } from '../services/service.provider'; // Import ServiceProvider
import { ShortHexGuid } from '../types';
import { SealingService } from './sealing.service';

// Set a longer timeout for all tests in this file
jest.setTimeout(30000);

describe('SealingService', () => {
  // Shared test data
  let alice: IMemberWithMnemonic;
  let bob: IMemberWithMnemonic;
  let charlie: IMemberWithMnemonic;
  let david: IMemberWithMnemonic;
  let members: BrightChainMember[];
  const testDocument = { hello: 'world' };

  beforeAll(() => {
    // Get services needed for newMember
    const serviceProvider = ServiceProvider.getInstance();
    const eciesService = serviceProvider.eciesService;
    const votingService = serviceProvider.votingService;
    // Create all members once, passing services
    alice = BrightChainMember.newMember(
      eciesService,
      votingService,
      MemberType.System,
      'Alice',
      new EmailString('alice@example.com'),
    );
    bob = BrightChainMember.newMember(
      eciesService,
      votingService,
      MemberType.System,
      'Bob',
      new EmailString('bob@example.com'),
    );
    charlie = BrightChainMember.newMember(
      eciesService,
      votingService,
      MemberType.System,
      'Charlie',
      new EmailString('charlie@example.com'),
    );
    david = BrightChainMember.newMember(
      eciesService,
      votingService,
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
    let sealedDocument: QuorumDataRecord;

    beforeAll(() => {
      // Create sealed document once for reuse
      sealedDocument = SealingService.quorumSeal(
        alice.member,
        testDocument,
        members,
      );
    });

    it('should seal and unlock a document', () => {
      const unlockedDocument = SealingService.quorumUnseal<{
        hello: string;
      }>(sealedDocument, members);
      expect(unlockedDocument).toEqual(testDocument);
    });

    it('should be able to convert to and from json', () => {
      const sealedJson = sealedDocument.toJson();
      const rebuiltDocument = QuorumDataRecord.fromJson(
        sealedJson,
        (memberId: ShortHexGuid) =>
          members.find(
            (v) => v.id.asShortHexGuid == memberId,
          ) as BrightChainMember,
      );
      const unlockedDocument = SealingService.quorumUnseal<{
        hello: string;
      }>(rebuiltDocument, members);
      expect(unlockedDocument).toEqual(testDocument);
    });

    it('should throw error for insufficient members', () => {
      expect(() =>
        SealingService.quorumUnseal(sealedDocument, [alice.member]),
      ).toThrowType(SealingError, (error: SealingError) => {
        expect(error.type).toEqual(SealingErrorType.NotEnoughMembersToUnlock);
      });
    });
  });

  describe('input validation', () => {
    it('should throw error for invalid members', () => {
      expect(() =>
        SealingService.quorumSeal(alice.member, { data: 123 }, [], 1),
      ).toThrowType(SealingError, (error: SealingError) => {
        expect(error.type).toEqual(SealingErrorType.NotEnoughMembersToUnlock);
      });
    });

    describe('reinitSecrets', () => {
      it('should throw error for invalid maxShares', () => {
        expect(() => SealingService.reinitSecrets(0)).toThrowType(
          SealingError,
          (error: SealingError) => {
            expect(error.type).toEqual(SealingErrorType.InvalidBitRange);
          },
        );
        expect(() =>
          SealingService.reinitSecrets(SEALING.MAX_SHARES + 1),
        ).toThrowType(SealingError, (error: SealingError) => {
          expect(error.type).toEqual(SealingErrorType.InvalidBitRange);
        });
      });

      it('should correctly initialize secrets for valid maxShares', () => {
        expect(() => SealingService.reinitSecrets(10)).not.toThrow();
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
