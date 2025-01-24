import { BrightChainMember } from './brightChainMember';
import { EmailString } from './emailString';
import { MemberType } from './enumerations/memberType';
import { QuorumDataRecord } from './quorumDataRecord';
import { StaticHelpersSealing } from './staticHelpers.sealing';
import { ShortHexGuid } from './types';

// Set a longer timeout for all tests in this file
jest.setTimeout(30000);

describe('brightchainQuorum', () => {
  // Shared test data
  let alice: BrightChainMember;
  let bob: BrightChainMember;
  let charlie: BrightChainMember;
  let david: BrightChainMember;
  let members: BrightChainMember[];
  const testDocument = { hello: 'world' };

  beforeAll(() => {
    // Create all members once
    alice = BrightChainMember.newMember(
      MemberType.System,
      'Alice',
      new EmailString('alice@example.com'),
    );
    bob = BrightChainMember.newMember(
      MemberType.System,
      'Bob',
      new EmailString('bob@example.com'),
    );
    charlie = BrightChainMember.newMember(
      MemberType.System,
      'Charlie',
      new EmailString('charlie@example.com'),
    );
    david = BrightChainMember.newMember(
      MemberType.System,
      'David',
      new EmailString('david@example.com'),
    );
    david.unloadWalletAndPrivateKey(); // Pre-configure david without private key
    members = [alice, bob, charlie];
  });

  describe('allMembersHavePrivateKey', () => {
    it('should validate that all members have a private key loaded', () => {
      expect(StaticHelpersSealing.allMembersHavePrivateKey(members)).toEqual(
        true,
      );
    });

    it('should return false when one member does not have a private key loaded', () => {
      const membersWithDavid = [...members, david];
      expect(
        StaticHelpersSealing.allMembersHavePrivateKey(membersWithDavid),
      ).toEqual(false);
    });
  });

  describe('document sealing and unsealing', () => {
    let sealedDocument: QuorumDataRecord;

    beforeAll(() => {
      // Create sealed document once for reuse
      sealedDocument = StaticHelpersSealing.quorumSeal(
        alice,
        testDocument,
        members,
      );
    });

    it('should seal and unlock a document', () => {
      const unlockedDocument = StaticHelpersSealing.quorumUnseal<{
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
      const unlockedDocument = StaticHelpersSealing.quorumUnseal<{
        hello: string;
      }>(rebuiltDocument, members);
      expect(unlockedDocument).toEqual(testDocument);
    });

    it('should throw error for insufficient members', () => {
      expect(() =>
        StaticHelpersSealing.quorumUnseal(sealedDocument, [alice]),
      ).toThrow();
    });
  });

  describe('input validation', () => {
    it('should throw error for invalid members', () => {
      expect(() =>
        StaticHelpersSealing.quorumSeal(alice, { data: 123 }, [], 1),
      ).toThrow();
    });

    describe('reinitSecrets', () => {
      it('should throw error for invalid maxShares', () => {
        expect(() => StaticHelpersSealing.reinitSecrets(0)).toThrow();
        expect(() =>
          StaticHelpersSealing.reinitSecrets(
            StaticHelpersSealing.MaximumShares + 1,
          ),
        ).toThrow();
      });

      it('should correctly initialize secrets for valid maxShares', () => {
        expect(() => StaticHelpersSealing.reinitSecrets(10)).not.toThrow();
      });
    });

    describe('validateQuorumSealInputs', () => {
      it('should throw error for invalid member count', () => {
        expect(() =>
          StaticHelpersSealing.validateQuorumSealInputs([], 2),
        ).toThrow();

        const tooManyMembers = Array(
          StaticHelpersSealing.MaximumShares + 1,
        ).fill(alice);
        expect(() =>
          StaticHelpersSealing.validateQuorumSealInputs(tooManyMembers, 2),
        ).toThrow();
      });

      it('should throw error for invalid sharesRequired', () => {
        expect(() =>
          StaticHelpersSealing.validateQuorumSealInputs([alice, bob], 0),
        ).toThrow();
        expect(() =>
          StaticHelpersSealing.validateQuorumSealInputs([alice, bob], 3),
        ).toThrow();
      });
    });
  });
});
