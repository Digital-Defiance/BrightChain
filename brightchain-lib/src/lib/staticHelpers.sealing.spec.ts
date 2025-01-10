import { BrightChainMember } from './brightChainMember';
import { EmailString } from './emailString';
import { MemberType } from './enumerations/memberType';
import { QuorumDataRecord } from './quorumDataRecord';
import { StaticHelpersSealing } from './staticHelpers.sealing';
import { ShortHexGuid } from './types';

describe('brightchainQuorum', () => {
  let alice: BrightChainMember,
    bob: BrightChainMember,
    charlie: BrightChainMember;
  beforeAll(() => {
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
  });
  describe('allMembersHavePrivateKey', () => {
    it('should validate that all members have a private key loaded', () => {
      const members: BrightChainMember[] = [alice, bob, charlie];
      expect(StaticHelpersSealing.allMembersHavePrivateKey(members)).toEqual(
        true,
      );
    });
    it('should return false when one member does not have a private key loaded', () => {
      const david = BrightChainMember.newMember(
        MemberType.System,
        'David',
        new EmailString('david@example.com'),
      );
      david.unloadWalletAndPrivateKey();
      const members = [alice, bob, charlie, david];
      expect(StaticHelpersSealing.allMembersHavePrivateKey(members)).toEqual(
        false,
      );
    });
  });
  it('should seal and unlock a document', () => {
    const members: BrightChainMember[] = [alice, bob, charlie];
    const document = { hello: 'world' };
    const sealedDocument = StaticHelpersSealing.quorumSeal<{ hello: string }>(
      alice,
      document,
      members,
    );
    const unlockedDocument = StaticHelpersSealing.quorumUnseal<{
      hello: string;
    }>(sealedDocument, members);
    expect(unlockedDocument).toEqual(document);
  });
  it('should be able to convert to and from json', () => {
    const members: BrightChainMember[] = [alice, bob, charlie];
    const document = { hello: 'world' };
    const sealedDocument = StaticHelpersSealing.quorumSeal<{ hello: string }>(
      alice,
      document,
      members,
    );
    const sealedJson = sealedDocument.toJson();
    const rebuiltDocument = QuorumDataRecord.fromJson(
      sealedJson,
      (memberId: ShortHexGuid) => {
        return members.find(
          (v) => v.id.asShortHexGuid == memberId,
        ) as BrightChainMember;
      },
    );
    const unlockedDocument = StaticHelpersSealing.quorumUnseal<{
      hello: string;
    }>(rebuiltDocument, members);
    expect(unlockedDocument).toEqual(document);
  });
  it('should throw error for invalid members', () => {
    expect(() =>
      StaticHelpersSealing.quorumSeal(alice, { data: 123 }, [], 1),
    ).toThrow();
  });
  it('should throw error for insufficient members', () => {
    const sealedDocument = StaticHelpersSealing.quorumSeal(
      alice,
      { hello: 'world' },
      [alice, bob],
      2,
    );
    expect(() =>
      StaticHelpersSealing.quorumUnseal(sealedDocument, [alice]),
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
      const tooManyMembers = new Array(
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
