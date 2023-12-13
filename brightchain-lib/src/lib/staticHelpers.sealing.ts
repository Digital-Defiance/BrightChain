import * as secrets from 'secrets.js-34r7h';
import { Shares } from 'secrets.js-34r7h';
import { QuorumDataRecord } from './quorumDataRecord';
import { ShortHexGuid } from './guid';
import { IMemberShareCount } from './interfaces/memberShareCount';
import { ISortedMemberShareCountArrays } from './interfaces/sortedMemberShareCountArrays';
import { BrightChainMember } from './brightChainMember';
import { IQoroumSealResults } from './interfaces/quoromSealResults';
import { StaticHelpersSymmetric } from './staticHelpers.symmetric';
import { EncryptedShares } from './types';
import { StaticHelpersKeyPair } from './staticHelpers.keypair';
import { EthereumECIES } from './ethereumECIES';

/**
 * @description Static helper functions for Brightchain Quorum. Encryption and other utilities.
 * - Uses secrets.js-34r7h fork of secrets.js for Shamir's Secret Sharing
 * - Uses elliptic for ECDSA
 * - Uses bip39 for BIP39 Mnemonic generation
 * - Uses crypto for AES encryption
 * - Uses crypto for RSA key generation, encryption/decryption
 */
export default abstract class StaticHelpersSealing {
  /**
   * Reconfigure secrets.js to have the right number of bits for the number of shares needed
   * @param maxShares
   */
  public static reinitSecrets(maxShares: number) {
    // must have at least 3 bits, making the minimum max shares 2^3 = 8
    const bits = Math.max(3, Math.ceil(Math.log2(maxShares)));

    // secrets.init requires a CSPRNG type, get the current one
    const config = secrets.getConfig();
    secrets.init(bits, config.typeCSPRNG);
  }

  /**
   * Given a list of member ids and a share count array, ensure that all entries in the array correspond with a member id and that the share counts are valid
   * @param amongstMemberIds
   * @param shareCountByMemberId
   * @throws Error if any member id is not found in the list of member ids or if any share count is less than 1
   * @returns the total number of shares
   */
  public static validateShareCountArrayReturnTotalShares(
    amongstMemberIds: ShortHexGuid[],
    shareCountByMemberId?: Array<IMemberShareCount>
  ): number {
    let totalShares = 0;
    if (shareCountByMemberId) {
      // ensure every entry in shareCountByMemberId has a corresponding member id and that the share count is valid
      for (let i = 0; i < shareCountByMemberId.length; i++) {
        const shares = shareCountByMemberId[i];
        if (!amongstMemberIds.includes(shares.memberId)) {
          throw new Error(
            `Member id ${shares.memberId} not found in list of member ids`
          );
        }
        if (shares.shares < 1) {
          throw new Error(`Share count ${shares.shares} is less than 1`);
        }
        totalShares += shares.shares;
      }
    } else {
      // if no share count array is provided, assume each member gets 1 share
      totalShares = amongstMemberIds.length;
    }
    return totalShares;
  }

  /**
   * Given a list of members and an optional list of share counts, determine how many shares each member should get
   * Each member is otherwise given 1 share unless a higher number is found in the array
   * @param amongstMemberIds
   * @param shareCountByMemberId
   * @returns
   */
  public static determineShareCountsByMemberId(
    amongstMemberIds: ShortHexGuid[],
    shareCountByMemberId?: Array<IMemberShareCount>
  ): Map<ShortHexGuid, number> {
    StaticHelpersSealing.validateShareCountArrayReturnTotalShares(
      amongstMemberIds,
      shareCountByMemberId
    );
    const sharesByMemberId: Map<ShortHexGuid, number> = new Map();
    for (let i = 0; i < amongstMemberIds.length; i++) {
      const memberId = amongstMemberIds[i];
      let sharesForMember = 1;
      if (shareCountByMemberId !== undefined) {
        for (let j = 0; j < shareCountByMemberId.length; j++) {
          const shareCount: IMemberShareCount = shareCountByMemberId[j];
          if (shareCount.memberId == memberId) {
            sharesForMember = shareCount.shares;
            break;
          }
        }
      }
      sharesByMemberId.set(memberId, sharesForMember);
    }
    return sharesByMemberId;
  }

  /**
   * Given a map of member ids to share counts, convert the map to an array of member ids and a corresponding array of share counts
   * @param countMap
   * @returns
   */
  public static shareCountsMapToSortedArrays(
    countMap: Map<ShortHexGuid, number>
  ): ISortedMemberShareCountArrays {
    const sortedMemberIds = Array.from(countMap.keys()).sort();
    const memberCount = sortedMemberIds.length;
    const memberIds: ShortHexGuid[] = [];
    const shares: number[] = [];
    let totalShares = 0;
    for (let i = 0; i < sortedMemberIds.length; i++) {
      const memberId = sortedMemberIds[i];
      const shareCount = countMap.get(memberId);
      if (shareCount === undefined) {
        throw new Error('Share count is undefined');
      }
      memberIds.push(memberId);
      shares.push(shareCount);
      totalShares += shareCount;
    }
    return { memberIds, shares, memberCount, totalShares };
  }

  /**
   * Given an array of member share count entries, return sorted array of member ids and a corresponding array of share counts
   * @param shareCountByMemberId
   * @returns
   */
  public static shareCountsArrayToSortedArrays(
    shareCountByMemberId: Array<IMemberShareCount>
  ): ISortedMemberShareCountArrays {
    const sortedMemberIds = shareCountByMemberId.map((x) => x.memberId).sort();
    const memberCount = sortedMemberIds.length;
    const memberIds: ShortHexGuid[] = [];
    const shares: number[] = [];
    let totalShares = 0;
    for (let i = 0; i < sortedMemberIds.length; i++) {
      const memberId = sortedMemberIds[i];
      const shareCount = shareCountByMemberId.find(
        (s) => s.memberId == memberId
      )?.shares;
      if (shareCount === undefined) {
        throw new Error('Share count is undefined');
      }
      memberIds.push(memberId);
      shares.push(shareCount);
      totalShares += shareCount;
    }
    return { memberIds, shares, memberCount, totalShares };
  }

  /**
   * Convert a map of member ids to share counts to an array of member share count entries
   * @param countMap
   * @returns
   */
  public static shareCountsMapToCountEntries(
    countMap: Map<ShortHexGuid, number>
  ): Array<IMemberShareCount> {
    const entries: Array<IMemberShareCount> = [];
    countMap.forEach((shares, memberId) => {
      entries.push({ memberId, shares: shares });
    });
    return entries;
  }

  /**
   * Given an array of memberIds and a corresponding array of share counts, return a map of member ids to share counts
   * @param memberIds
   * @param shares
   * @returns
   */
  public static shareCountsArrayToMap(
    memberIds: ShortHexGuid[],
    shares: number[]
  ): Map<ShortHexGuid, number> {
    const countMap: Map<ShortHexGuid, number> = new Map();
    for (let i = 0; i < memberIds.length; i++) {
      const memberId = memberIds[i];
      const shareCount = shares[i];
      countMap.set(memberId, shareCount);
    }
    return countMap;
  }

  /**
   * Using shamir's secret sharing, split the given data into the given number of shares
   * @param data
   * @param amongstMemberIds
   * @param sharesRequired
   * @returns
   */
  public static quorumSeal<T>(
    agent: BrightChainMember,
    data: T,
    amongstMemberIds: ShortHexGuid[],
    shareCountByMemberId?: Array<IMemberShareCount>,
    sharesRequired?: number
  ): IQoroumSealResults {
    if (amongstMemberIds.length < 2) {
      throw new Error('At least two members are required');
    }
    sharesRequired = sharesRequired ?? amongstMemberIds.length;
    if (sharesRequired < 0) {
      throw new Error('Shares required must be greater than zero');
    }
    if (sharesRequired > amongstMemberIds.length) {
      throw new Error(
        'Shares required threshold cannot be greater than the number of members'
      );
    }
    if (sharesRequired < 2) {
      throw new Error('At least two shares/members are required');
    }
    const sharesByMemberIdMap: Map<ShortHexGuid, number> =
      StaticHelpersSealing.determineShareCountsByMemberId(
        amongstMemberIds,
        shareCountByMemberId
      );

    const sortedShareCounts =
      StaticHelpersSealing.shareCountsMapToSortedArrays(sharesByMemberIdMap);
    const encryptedData = StaticHelpersSymmetric.symmetricEncrypt<T>(data);

    // TODO: consider computing the number of shares a user needs if you want to consider them "required"
    // eg if you normally would have say 3 shares and require 2 but require that one of the members is a specific one
    // alice: 1 share, bob (required): 3 shares, carol: 1 share = total 5 shares
    // split the key using shamir's secret sharing
    StaticHelpersSealing.reinitSecrets(amongstMemberIds.length);
    const keyShares = secrets.share(
      encryptedData.key.toString('hex'),
      sortedShareCounts.totalShares,
      sharesRequired
    );

    const dataRecord = new QuorumDataRecord(
      agent,
      amongstMemberIds,
      sharesRequired,
      encryptedData.encryptedData,
      StaticHelpersSealing.shareCountsMapToCountEntries(sharesByMemberIdMap)
    );
    return {
      keyShares: keyShares,
      record: dataRecord,
    };
  }

  /**
   * Using shamir's secret sharing, recombine the given shares into the original data
   * @param recoveredShares
   * @param encryptedData
   * @returns
   */
  public static quorumUnlock<T>(
    recoveredShares: Shares,
    encryptedData: Buffer
  ): T {
    // reconstitute the document key from the shares
    StaticHelpersSealing.reinitSecrets(recoveredShares.length);
    const combined = secrets.combine(recoveredShares);
    const key = Buffer.from(combined, 'hex'); // hex?
    return StaticHelpersSymmetric.symmetricDecrypt<T>(encryptedData, key);
  }

  /**
   * Encrypt each key share with each member's public key
   * @param shares
   * @param members
   * @returns
   */
  public static encryptSharesForMembers(
    shares: Shares,
    members: BrightChainMember[],
    shareCountByMemberId?: Array<IMemberShareCount>
  ): Map<ShortHexGuid, EncryptedShares> {
    const shareCountsByMemberId: Map<ShortHexGuid, number> =
      StaticHelpersSealing.determineShareCountsByMemberId(
        members.map((v) => v.id),
        shareCountByMemberId
      );
    const sortedMembers = StaticHelpersSealing.shareCountsMapToSortedArrays(
      shareCountsByMemberId
    );
    const sharesByMemberId = new Map<ShortHexGuid, Shares>();
    const encryptedSharesByMemberId = new Map<ShortHexGuid, EncryptedShares>();
    let shareIndex = 0;
    for (let i = 0; i < sortedMembers.memberIds.length; i++) {
      const memberId = sortedMembers.memberIds[i];
      const member = members.find((v) => v.id == memberId);
      if (!member) {
        throw new Error('Member not found');
      }
      const shareCount = sortedMembers.shares[i];
      const sharesForMember = shares.slice(shareIndex, shareIndex + shareCount);
      sharesByMemberId.set(member.id, sharesForMember);
      shareIndex += shareCount;

      if (!sharesForMember) {
        throw new Error('No shares found for member');
      }
      const encryptedSharesForMember: EncryptedShares = new Array<string>(
        shareCount
      );
      for (let j = 0; j < sharesForMember.length; j++) {
        const share = sharesForMember[j];
        const encryptedKeyShare = EthereumECIES.encrypt(member.publicKey, Buffer.from(share));
        encryptedSharesForMember[i] = encryptedKeyShare.toString('hex');
      }
      encryptedSharesByMemberId.set(member.id, encryptedSharesForMember);
    }

    return encryptedSharesByMemberId;
  }

  public static combineEncryptedShares(
    encryptedShares: Map<ShortHexGuid, EncryptedShares>
  ): EncryptedShares {
    const combinedShares: EncryptedShares = new Array<string>();
    encryptedShares.forEach((shares) => {
      shares.forEach((share) => combinedShares.push(share));
    });
    return combinedShares;
  }

  /**
   * Decrypt each key share with each member's private key
   */
  public static decryptSharesForMembers(
    encryptedShares: EncryptedShares,
    members: BrightChainMember[],
    shareCountByMemberId?: Array<IMemberShareCount>
  ): Shares {
    const shareCountsByMemberId: Map<ShortHexGuid, number> =
      StaticHelpersSealing.determineShareCountsByMemberId(
        members.map((v) => v.id),
        shareCountByMemberId
      );
    const sortedMembers = StaticHelpersSealing.shareCountsMapToSortedArrays(
      shareCountsByMemberId
    );

    if (encryptedShares.length !== sortedMembers.totalShares) {
      throw new Error('The number of encrypted shares does not match');
    }
    const decryptedShares: Array<string> = new Array<string>(
      encryptedShares.length
    );
    let shareIndex = 0;
    for (let i = 0; i < sortedMembers.memberCount; i++) {
      const memberId = sortedMembers.memberIds[i];
      const member = members.find((v) => v.id == memberId);
      if (!member) {
        throw new Error('Member not found');
      }
      const shareCount = sortedMembers.shares[i];
      for (let j = 0; j < shareCount; j++) {
        const encryptedKeyShareHex = encryptedShares[shareIndex++];
        const decryptedKeyShare = EthereumECIES.decrypt(member.privateKey, Buffer.from(encryptedKeyShareHex, 'hex'));
        decryptedShares[i] = decryptedKeyShare.toString('hex');
      }
    }
    return decryptedShares as Shares;
  }
}
