import * as secrets from 'secrets.js-34r7h';
import { BrightChainMember } from '../brightChainMember';
import { SEALING } from '../constants';
import { SealingErrorType } from '../enumerations/sealingErrorType';
import { SealingError } from '../errors/sealingError';
import { QuorumDataRecord } from '../quorumDataRecord';
import { ShortHexGuid } from '../types';
import { ECIESService } from './ecies.service';
import { SymmetricService } from './symmetric.service';

/**
 * Service for handling sealing operations using Shamir's Secret Sharing.
 * This service provides functionality for:
 * - Splitting secrets into shares using Shamir's Secret Sharing
 * - Encrypting shares for members using ECIES
 * - Recombining shares to recover secrets
 * - Managing quorum-based data access
 */
export class SealingService {
  private static readonly eciesService = new ECIESService();

  /**
   * Reconfigure secrets.js to have the right number of bits for the number of shares needed
   * @param maxShares Maximum number of shares to support
   */
  public static reinitSecrets(maxShares: number) {
    if (maxShares > SEALING.MAX_SHARES || maxShares < SEALING.MIN_SHARES) {
      throw new SealingError(SealingErrorType.InvalidBitRange);
    }
    // must have at least 3 bits, making the minimum max shares 2^3 = 8
    // and the max shares is 2^20 - 1 = 1048575
    const bits = Math.max(3, Math.ceil(Math.log2(maxShares)));
    if (bits < 3 || bits > 20) {
      throw new SealingError(SealingErrorType.InvalidBitRange);
    }

    // secrets.init requires a CSPRNG type, get the current one
    const config = secrets.getConfig();
    secrets.init(bits, config.typeCSPRNG);
  }

  /**
   * Validate inputs for quorum sealing operations
   */
  public static validateQuorumSealInputs(
    amongstMembers: BrightChainMember[],
    sharesRequired?: number,
  ) {
    if (amongstMembers.length < SEALING.MIN_SHARES) {
      throw new SealingError(SealingErrorType.NotEnoughMembersToUnlock);
    }
    if (amongstMembers.length > SEALING.MAX_SHARES) {
      throw new SealingError(SealingErrorType.TooManyMembersToUnlock);
    }
    sharesRequired = sharesRequired ?? amongstMembers.length;
    if (
      sharesRequired < SEALING.MIN_SHARES ||
      sharesRequired > amongstMembers.length
    ) {
      throw new SealingError(SealingErrorType.NotEnoughMembersToUnlock);
    }
  }

  /**
   * Using Shamir's Secret Sharing, split the given data into the given number of shares
   * @param agent The member performing the sealing operation
   * @param data The data to seal
   * @param amongstMembers The members to distribute shares to
   * @param sharesRequired Optional number of shares required to unseal (defaults to all members)
   * @returns QuorumDataRecord containing the sealed data and encrypted shares
   */
  public static quorumSeal<T>(
    agent: BrightChainMember,
    data: T,
    amongstMembers: BrightChainMember[],
    sharesRequired?: number,
  ): QuorumDataRecord {
    if (!amongstMembers || !Array.isArray(amongstMembers)) {
      throw new SealingError(SealingErrorType.InvalidMemberArray);
    }
    this.validateQuorumSealInputs(amongstMembers, sharesRequired);
    sharesRequired = sharesRequired ?? amongstMembers.length;
    const encryptedData = SymmetricService.encryptJson<T>(data);

    // TODO: consider computing the number of shares a user needs if you want to consider them "required"
    // eg if you normally would have say 3 shares and require 2 but require that one of the members is a specific one
    // alice: 1 share, bob (required): 3 shares, carol: 1 share = total 5 shares
    // split the key using shamir's secret sharing
    SealingService.reinitSecrets(amongstMembers.length);
    const keyShares = secrets.share(
      encryptedData.key.toString('hex'),
      amongstMembers.length,
      sharesRequired,
    );
    // distribute the key shares to the members
    const encryptedSharesByMemberId = SealingService.encryptSharesForMembers(
      keyShares,
      amongstMembers,
    );

    return new QuorumDataRecord(
      agent,
      amongstMembers.map((m) => m.id.asShortHexGuid),
      sharesRequired,
      encryptedData.encryptedData,
      encryptedSharesByMemberId,
    );
  }

  /**
   * Check if all members have their private keys loaded
   */
  public static allMembersHavePrivateKey(
    members: BrightChainMember[],
  ): boolean {
    let allHavePrivateKey = true;
    for (const member of members) {
      if (!member.hasPrivateKey) {
        allHavePrivateKey = false;
        break;
      }
    }
    return allHavePrivateKey;
  }

  /**
   * Given a quorum sealed document, decrypt the shares using the given members' private keys
   * @param document The sealed document
   * @param membersWithPrivateKey Members with loaded private keys
   * @returns Decrypted shares
   */
  public static decryptShares(
    document: QuorumDataRecord,
    membersWithPrivateKey: BrightChainMember[],
  ): secrets.Shares {
    if (membersWithPrivateKey.length < document.sharesRequired) {
      throw new SealingError(SealingErrorType.NotEnoughMembersToUnlock);
    }
    if (!SealingService.allMembersHavePrivateKey(membersWithPrivateKey)) {
      throw new SealingError(SealingErrorType.MissingPrivateKeys);
    }
    const decryptedShares: secrets.Shares = new Array<string>(
      membersWithPrivateKey.length,
    );
    for (let i = 0; i < membersWithPrivateKey.length; i++) {
      const member = membersWithPrivateKey[i];
      if (member.privateKey === undefined) {
        throw new SealingError(SealingErrorType.MissingPrivateKeys);
      }
      const encryptedKeyShareHex = document.encryptedSharesByMemberId.get(
        member.id.asShortHexGuid,
      );
      if (!encryptedKeyShareHex) {
        throw new SealingError(SealingErrorType.EncryptedShareNotFound);
      }
      const decryptedKeyShare =
        SealingService.eciesService.decryptSingleWithHeader(
          member.privateKey,
          encryptedKeyShareHex,
        );
      decryptedShares[i] = decryptedKeyShare.toString('hex');
    }
    return decryptedShares;
  }

  /**
   * Using Shamir's Secret Sharing, recombine the given shares into the original data
   * @param document The document to unseal
   * @param membersWithPrivateKey Members with loaded private keys
   * @returns The unsealed data
   */
  public static quorumUnseal<T>(
    document: QuorumDataRecord,
    membersWithPrivateKey: BrightChainMember[],
  ): T {
    if (membersWithPrivateKey.length < document.sharesRequired) {
      throw new SealingError(SealingErrorType.NotEnoughMembersToUnlock);
    }
    return SealingService.quorumUnsealWithShares<T>(
      document,
      SealingService.decryptShares(document, membersWithPrivateKey),
    );
  }

  /**
   * Using Shamir's Secret Sharing, recombine the given shares into the original data
   * @param document The document to unseal
   * @param recoveredShares The shares to use for unsealing
   * @returns The unsealed data
   */
  public static quorumUnsealWithShares<T>(
    document: QuorumDataRecord,
    recoveredShares: secrets.Shares,
  ): T {
    try {
      // reconstitute the document key from the shares
      SealingService.reinitSecrets(document.encryptedSharesByMemberId.size);
      const combined = secrets.combine(recoveredShares);
      const key = Buffer.from(combined, 'hex');
      return SymmetricService.decryptJson<T>(document.encryptedData, key);
    } catch (error) {
      throw new SealingError(SealingErrorType.FailedToSeal, undefined, {
        ERROR: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Encrypt each key share with each member's public key
   * @param shares The shares to encrypt
   * @param members The members to encrypt shares for
   * @returns Map of encrypted shares by member ID
   */
  public static encryptSharesForMembers(
    shares: secrets.Shares,
    members: BrightChainMember[],
  ): Map<ShortHexGuid, Buffer> {
    if (shares.length != members.length) {
      throw new SealingError(SealingErrorType.NotEnoughMembersToUnlock);
    }
    const memberIds = members.map((v) => v.id);
    const encryptedSharesByMemberId = new Map<ShortHexGuid, Buffer>();
    for (let i = 0; i < memberIds.length; i++) {
      const memberId = memberIds[i];
      const member = members.find((v) => v.id == memberId);
      if (!member) {
        throw new SealingError(SealingErrorType.MemberNotFound);
      }
      const shareForMember = shares[i];

      const encryptedKeyShare = SealingService.eciesService.encrypt(
        member.publicKey,
        Buffer.from(shareForMember, 'hex'),
      );
      encryptedSharesByMemberId.set(
        member.id.asShortHexGuid,
        encryptedKeyShare,
      );
    }

    return encryptedSharesByMemberId;
  }

  /**
   * Decrypt each key share with each member's private key
   * @param encryptedSharesByMemberId Map of encrypted shares by member ID
   * @param members Members with loaded private keys
   * @returns Decrypted shares
   */
  public static decryptSharesForMembers(
    encryptedSharesByMemberId: Map<ShortHexGuid, Buffer>,
    members: BrightChainMember[],
  ): secrets.Shares {
    // for each encrypted share, find the member from the members array and decrypt it
    const memberIds = Array.from(encryptedSharesByMemberId.keys());
    const decryptedShares: secrets.Shares = new Array<string>(memberIds.length);
    for (let i = 0; i < memberIds.length; i++) {
      const memberId = memberIds[i];
      const member = members.find((v) => v.id.asShortHexGuid == memberId);
      if (!member) {
        throw new SealingError(SealingErrorType.MemberNotFound);
      }
      if (member.privateKey === undefined) {
        throw new SealingError(SealingErrorType.MissingPrivateKeys);
      }
      const encryptedKeyShareHex = encryptedSharesByMemberId.get(memberId);
      if (!encryptedKeyShareHex) {
        throw new SealingError(SealingErrorType.EncryptedShareNotFound);
      }
      const decryptedKeyShare =
        SealingService.eciesService.decryptSingleWithHeader(
          member.privateKey,
          encryptedKeyShareHex,
        );
      decryptedShares[i] = decryptedKeyShare.toString('hex');
    }
    return decryptedShares;
  }
}
