import { BrightChainMember } from './brightChainMember';
import { MemberType } from './enumerations/memberType';
import { StaticHelpersSealing } from './staticHelpers.sealing';
import { EmailString } from './emailString';
import { QuorumDataRecord } from './quorumDataRecord';
import { ShortHexGuid } from './types';

describe('brightchainQuorum', () => {
  it('should seal and unlock a document', () => {
    const alice = BrightChainMember.newMember(
      MemberType.System,
      'alice',
      new EmailString('alice@example.com')
    );
    const bob = BrightChainMember.newMember(
      MemberType.System,
      'bob',
      new EmailString('bob@example.com')
    );
    const charlie = BrightChainMember.newMember(
      MemberType.System,
      'charlie',
      new EmailString('charlie@example.com')
    );
    const members: BrightChainMember[] = [alice, bob, charlie];
    const document = { hello: 'world' };
    const sealedDocument = StaticHelpersSealing.quorumSeal<{ hello: string }>(
      alice,
      document,
      members
    );
    const unlockedDocument = StaticHelpersSealing.quorumUnseal<{
      hello: string;
    }>(sealedDocument, members);
    expect(unlockedDocument).toEqual(document);
  });
  it('should be able to convert to and from json', () => {
    const alice = BrightChainMember.newMember(
      MemberType.System,
      'alice',
      new EmailString('alice@example.com')
    );
    const bob = BrightChainMember.newMember(
      MemberType.System,
      'bob',
      new EmailString('bob@example.com')
    );
    const charlie = BrightChainMember.newMember(
      MemberType.System,
      'charlie',
      new EmailString('charlie@example.com')
    );
    const members: BrightChainMember[] = [alice, bob, charlie];
    const document = { hello: 'world' };
    const sealedDocument = StaticHelpersSealing.quorumSeal<{ hello: string }>(
      alice,
      document,
      members
    );
    const sealedJson = sealedDocument.toJson();
    const rebuiltDocument = QuorumDataRecord.fromJson(sealedJson, (memberId: ShortHexGuid) => {
      return members.find((v) => v.id.asShortHexGuid == memberId) as BrightChainMember;
    });
    const unlockedDocument = StaticHelpersSealing.quorumUnseal<{
      hello: string;
    }>(rebuiltDocument, members);
    expect(unlockedDocument).toEqual(document);
  });
});
