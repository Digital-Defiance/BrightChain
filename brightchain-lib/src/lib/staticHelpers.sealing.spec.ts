import { IMemberShareCount } from './interfaces/memberShareCount';
import { BrightChainMember } from './brightChainMember';
import { MemberType } from './enumerations/memberType';
import { GuidV4, ShortHexGuid } from './guid';
import StaticHelpersSealing from './staticHelpers.sealing';
import { EmailString } from './emailString';

describe('brightchainQuorum', () => {
  it('should determine the correct number of shares when no additional information is given', () => {
    const memberIds: ShortHexGuid[] = [
      GuidV4.new().asShortHexGuid,
      GuidV4.new().asShortHexGuid,
      GuidV4.new().asShortHexGuid,
      GuidV4.new().asShortHexGuid,
    ];
    const shareCountByMemberId = undefined;
    const sharesByMemberId =
      StaticHelpersSealing.determineShareCountsByMemberId(
        memberIds,
        shareCountByMemberId
      );
    expect(sharesByMemberId.size).toEqual(4);
    expect(sharesByMemberId.get(memberIds[0])).toEqual(1);
    expect(sharesByMemberId.get(memberIds[1])).toEqual(1);
    expect(sharesByMemberId.get(memberIds[2])).toEqual(1);
    expect(sharesByMemberId.get(memberIds[3])).toEqual(1);
  });
  it('should determine the correct number of shares when additional information is given', () => {
    const memberIds: ShortHexGuid[] = [
      GuidV4.new().asShortHexGuid,
      GuidV4.new().asShortHexGuid,
      GuidV4.new().asShortHexGuid,
      GuidV4.new().asShortHexGuid,
    ];
    const member1Shares = Math.ceil(Math.random() * 10);
    const member2Shares = Math.ceil(Math.random() * 10);
    const member3Shares = Math.ceil(Math.random() * 10);
    const member4Shares = Math.ceil(Math.random() * 10);
    const additionalInformation: Array<IMemberShareCount> = [
      { memberId: memberIds[0], shares: member1Shares },
      { memberId: memberIds[1], shares: member2Shares },
      { memberId: memberIds[2], shares: member3Shares },
      { memberId: memberIds[3], shares: member4Shares },
    ];
    const sharesByMemberId =
      StaticHelpersSealing.determineShareCountsByMemberId(
        memberIds,
        additionalInformation
      );
    expect(sharesByMemberId.size).toEqual(4);
    expect(sharesByMemberId.get(memberIds[0])).toEqual(member1Shares);
    expect(sharesByMemberId.get(memberIds[1])).toEqual(member2Shares);
    expect(sharesByMemberId.get(memberIds[2])).toEqual(member3Shares);
    expect(sharesByMemberId.get(memberIds[3])).toEqual(member4Shares);
  });
  it('should determine the correct number of shares when partial additional information is given', () => {
    const memberIds: ShortHexGuid[] = [
      GuidV4.new().asShortHexGuid,
      GuidV4.new().asShortHexGuid,
      GuidV4.new().asShortHexGuid,
      GuidV4.new().asShortHexGuid,
    ];
    const member2Shares = Math.ceil(Math.random() * 10);
    const member3Shares = Math.ceil(Math.random() * 10);
    const additionalInformation: Array<IMemberShareCount> = [
      { memberId: memberIds[1], shares: member2Shares },
      { memberId: memberIds[2], shares: member3Shares },
    ];
    const sharesByMemberId =
      StaticHelpersSealing.determineShareCountsByMemberId(
        memberIds,
        additionalInformation
      );
    expect(sharesByMemberId.size).toEqual(4);
    expect(sharesByMemberId.get(memberIds[0])).toEqual(1);
    expect(sharesByMemberId.get(memberIds[1])).toEqual(member2Shares);
    expect(sharesByMemberId.get(memberIds[2])).toEqual(member3Shares);
    expect(sharesByMemberId.get(memberIds[3])).toEqual(1);
  });
  it('should throw when a bad member id is given in the additional information', () => {
    const memberIds: ShortHexGuid[] = [
      GuidV4.new().asShortHexGuid,
      GuidV4.new().asShortHexGuid,
      GuidV4.new().asShortHexGuid,
      GuidV4.new().asShortHexGuid,
    ];
    const additionalInformation: Array<IMemberShareCount> = [
      {
        memberId: GuidV4.new().asShortHexGuid,
        shares: 9,
      },
    ];
    expect(() => {
      StaticHelpersSealing.determineShareCountsByMemberId(
        memberIds,
        additionalInformation
      );
    }).toThrow();
  });
  it('should not lose information converting between map and arrays', () => {
    const memberIds: ShortHexGuid[] = [
      GuidV4.new().asShortHexGuid,
      GuidV4.new().asShortHexGuid,
      GuidV4.new().asShortHexGuid,
      GuidV4.new().asShortHexGuid,
    ];
    const additionalInformation: Array<IMemberShareCount> = [
      { memberId: memberIds[1], shares: 2 },
      { memberId: memberIds[2], shares: 3 },
    ];
    const sharesByMemberId =
      StaticHelpersSealing.determineShareCountsByMemberId(
        memberIds,
        additionalInformation
      );
    const sharesByMemberIdSortedArray =
      StaticHelpersSealing.shareCountsMapToSortedArrays(sharesByMemberId);
    const sharesByMemberIdMap = StaticHelpersSealing.shareCountsArrayToMap(
      sharesByMemberIdSortedArray.memberIds,
      sharesByMemberIdSortedArray.shares
    );
    expect(sharesByMemberIdMap.size).toEqual(4);
    expect(sharesByMemberIdMap.get(memberIds[0])).toEqual(1);
    expect(sharesByMemberIdMap.get(memberIds[1])).toEqual(2);
    expect(sharesByMemberIdMap.get(memberIds[2])).toEqual(3);
    expect(sharesByMemberIdMap.get(memberIds[3])).toEqual(1);
    const entryFormatArray: Array<IMemberShareCount> =
      StaticHelpersSealing.shareCountsMapToCountEntries(sharesByMemberIdMap);
    expect(entryFormatArray.length).toEqual(4);
    expect(entryFormatArray[0].memberId).toEqual(memberIds[0]);
    expect(entryFormatArray[0].shares).toEqual(1);
    expect(entryFormatArray[1].memberId).toEqual(memberIds[1]);
    expect(entryFormatArray[1].shares).toEqual(2);
    expect(entryFormatArray[2].memberId).toEqual(memberIds[2]);
    expect(entryFormatArray[2].shares).toEqual(3);
    expect(entryFormatArray[3].memberId).toEqual(memberIds[3]);
    expect(entryFormatArray[3].shares).toEqual(1);
    const sharesByMemberIdSortedArray2 =
      StaticHelpersSealing.shareCountsArrayToSortedArrays(entryFormatArray);
    expect(sharesByMemberIdSortedArray2.memberIds.length).toEqual(4);
    expect(sharesByMemberIdSortedArray2.memberIds[0]).toEqual(memberIds[0]);
    expect(sharesByMemberIdSortedArray2.memberIds[1]).toEqual(memberIds[1]);
    expect(sharesByMemberIdSortedArray2.memberIds[2]).toEqual(memberIds[2]);
    expect(sharesByMemberIdSortedArray2.memberIds[3]).toEqual(memberIds[3]);
    expect(sharesByMemberIdSortedArray2.shares.length).toEqual(4);
    expect(sharesByMemberIdSortedArray2.shares[0]).toEqual(1);
    expect(sharesByMemberIdSortedArray2.shares[1]).toEqual(2);
    expect(sharesByMemberIdSortedArray2.shares[2]).toEqual(3);
    expect(sharesByMemberIdSortedArray2.shares[3]).toEqual(1);
  });
  it('should seal and unlock a document', () => {
    const alice = BrightChainMember.newMember(
      MemberType.User,
      'alice',
      new EmailString('alice@example.com')
    );
    const bob = BrightChainMember.newMember(
      MemberType.User,
      'bob',
      new EmailString('bob@example.com')
    );
    const members: BrightChainMember[] = [alice, bob];
    const document = { hello: 'world' };
    const sealedDocument = StaticHelpersSealing.quorumSeal<{ hello: string }>(
      alice,
      document,
      members.map((m) => m.id)
    );
    const unlockedDocument = StaticHelpersSealing.quorumUnlock<{
      hello: string;
    }>(sealedDocument.keyShares, sealedDocument.record.encryptedData);
    expect(unlockedDocument).toEqual(document);
  });
  it('should encrypt and decrypt the shares for the member list successfully', () => {
    const alice = BrightChainMember.newMember(
      MemberType.User,
      'alice',
      new EmailString('alice@example.com')
    );
    const bob = BrightChainMember.newMember(
      MemberType.User,
      'bob',
      new EmailString('bob@example.com')
    );
    const members: BrightChainMember[] = [alice, bob];
    const document = { hello: 'world' };
    const sealedDocument = StaticHelpersSealing.quorumSeal<{ hello: string }>(
      alice,
      document,
      members.map((m) => m.id)
    );
    const encryptedShares = StaticHelpersSealing.encryptSharesForMembers(
      sealedDocument.keyShares,
      members
    );
    const decryptedShares = StaticHelpersSealing.decryptSharesForMembers(
      StaticHelpersSealing.combineEncryptedShares(encryptedShares),
      members
    );
    expect(decryptedShares).toEqual(sealedDocument.keyShares);
  });
});
