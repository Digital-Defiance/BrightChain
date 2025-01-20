import * as secrets from 'secrets.js-34r7h';
import { BrightChainMember } from './brightChainMember';
import { QuorumDataRecord } from './quorumDataRecord';
import { StaticHelpersECIES } from './staticHelpers.ECIES';
import { StaticHelpersSymmetric } from './staticHelpers.symmetric';
import { ShortHexGuid } from './types';

/**
 * @description Static helper functions for Brightchain Quorum. Encryption and other utilities.
 * - Uses secrets.js-34r7h fork of secrets.js for Shamir's Secret Sharing
 * - Uses elliptic for ECDSA
 * - Uses bip39 for BIP39 Mnemonic generation
 * - Uses crypto for AES encryption
 * - Uses crypto for RSA key generation, encryption/decryption
 */
export abstract class StaticHelpersSealing {
  public static readonly MinimumShares = 2;
  public static readonly MaximumShares = 1048575;

  /**
   * Reconfigure secrets.js to have the right number of bits for the number of shares needed
   * @param maxShares
   */
  public static reinitSecrets(maxShares: number) {
    if (
      maxShares < StaticHelpersSealing.MinimumShares ||
      maxShares > StaticHelpersSealing.MaximumShares
    ) {
      throw new Error(
        `Invalid number of shares, must be between ${StaticHelpersSealing.MinimumShares} and ${StaticHelpersSealing.MaximumShares}`,
      );
    }
    // must have at least 3 bits, making the minimum max shares 2^3 = 8
    // and the max shares is 2^20 - 1 = 1048575
    const bits = Math.max(3, Math.ceil(Math.log2(maxShares)));
    if (bits < 3 || bits > 20) {
      throw new Error('Bits must be between 3 and 20');
    }

    // secrets.init requires a CSPRNG type, get the current one
    const config = secrets.getConfig();
    secrets.init(bits, config.typeCSPRNG);
  }

  public static validateQuorumSealInputs(
    amongstMembers: BrightChainMember[],
    sharesRequired?: number,
  ) {
    if (amongstMembers.length < StaticHelpersSealing.MinimumShares) {
      throw new Error(
        `At least ${StaticHelpersSealing.MinimumShares} members are required`,
      );
    }
    if (amongstMembers.length > StaticHelpersSealing.MaximumShares) {
      throw new Error(
        `Too many members, maximum is ${StaticHelpersSealing.MaximumShares}`,
      );
    }
    sharesRequired = sharesRequired ?? amongstMembers.length;
    if (
      sharesRequired < StaticHelpersSealing.MinimumShares ||
      sharesRequired > amongstMembers.length
    ) {
      throw new Error(
        `Invalid number of shares required, must be between ${StaticHelpersSealing.MinimumShares} and ${amongstMembers.length}`,
      );
    }
  }

  /**
   * Using shamir's secret sharing, split the given data into the given number of shares
   * @param agent
   * @param data
   * @param amongstMembers
   * @param sharesRequired
   * @returns
   */
  public static quorumSeal<T>(
    agent: BrightChainMember,
    data: T,
    amongstMembers: BrightChainMember[],
    sharesRequired?: number,
  ): QuorumDataRecord {
    sharesRequired = sharesRequired ?? amongstMembers.length;
    this.validateQuorumSealInputs(amongstMembers, sharesRequired);
    const encryptedData = StaticHelpersSymmetric.symmetricEncryptJson<T>(data);

    // TODO: consider computing the number of shares a user needs if you want to consider them "required"
    // eg if you normally would have say 3 shares and require 2 but require that one of the members is a specific one
    // alice: 1 share, bob (required): 3 shares, carol: 1 share = total 5 shares
    // split the key using shamir's secret sharing
    StaticHelpersSealing.reinitSecrets(amongstMembers.length);
    const keyShares = secrets.share(
      encryptedData.key.toString('hex'),
      amongstMembers.length,
      sharesRequired,
    );
    // distribute the key shares to the members
    const encryptedSharesByMemberId =
      StaticHelpersSealing.encryptSharesForMembers(keyShares, amongstMembers);

    return new QuorumDataRecord(
      agent,
      amongstMembers.map((m) => m.id.asShortHexGuid),
      sharesRequired,
      encryptedData.encryptedData,
      encryptedSharesByMemberId,
    );
  }

  public static allMembersHavePrivateKey(
    members: BrightChainMember[],
  ): boolean {
    let allHavePrivateKey = true;
    for (const member of members) {
      if (!member.privateKeyLoaded) {
        allHavePrivateKey = false;
        break;
      }
    }
    return allHavePrivateKey;
  }

  /**
   * Given a quorum sealed document, decrypt the shares using the given members' private keys
   * @param document
   * @param membersWithPrivateKey
   * @returns
   */
  public static decryptShares(
    document: QuorumDataRecord,
    membersWithPrivateKey: BrightChainMember[],
  ): secrets.Shares {
    if (membersWithPrivateKey.length < document.sharesRequired) {
      throw new Error('Not enough members to unlock the document');
    }
    if (!StaticHelpersSealing.allMembersHavePrivateKey(membersWithPrivateKey)) {
      throw new Error('Not all members have private keys loaded');
    }
    const decryptedShares: secrets.Shares = new Array<string>(
      membersWithPrivateKey.length,
    );
    for (let i = 0; i < membersWithPrivateKey.length; i++) {
      const member = membersWithPrivateKey[i];
      const encryptedKeyShareHex = document.encryptedSharesByMemberId.get(
        member.id.asShortHexGuid,
      );
      if (!encryptedKeyShareHex) {
        throw new Error('Encrypted share not found');
      }
      const decryptedKeyShare = StaticHelpersECIES.decryptWithHeader(
        member.privateKey,
        encryptedKeyShareHex,
      );
      decryptedShares[i] = decryptedKeyShare.toString('hex');
    }
    return decryptedShares;
  }

  /**
   * Using shamir's secret sharing, recombine the given shares into the original data
   * @param document The document to unlock
   * @param membersWithPrivateKey The members who will be able to unlock the document
   * @returns
   */
  public static quorumUnseal<T>(
    document: QuorumDataRecord,
    membersWithPrivateKey: BrightChainMember[],
  ): T {
    if (membersWithPrivateKey.length < document.sharesRequired) {
      throw new Error('Not enough members to unlock the document');
    }
    return StaticHelpersSealing.quoromUnsealWithShares<T>(
      document,
      StaticHelpersSealing.decryptShares(document, membersWithPrivateKey),
    );
  }

  /**
   * Using shamir's secret sharing, recombine the given shares into the original data
   * @param document The document to unlock
   * @param recoveredShares The shares to use to unlock the document
   * @returns The unlocked document
   */
  public static quoromUnsealWithShares<T>(
    document: QuorumDataRecord,
    recoveredShares: secrets.Shares,
  ): T {
    // reconstitute the document key from the shares
    StaticHelpersSealing.reinitSecrets(document.encryptedSharesByMemberId.size);
    const combined = secrets.combine(recoveredShares);
    const key = Buffer.from(combined, 'hex');
    return StaticHelpersSymmetric.symmetricDecryptJson<T>(
      document.encryptedData,
      key,
    );
  }

  /**
   * Encrypt each key share with each member's public key
   * @param shares
   * @param members
   * @returns
   */
  public static encryptSharesForMembers(
    shares: secrets.Shares,
    members: BrightChainMember[],
  ): Map<ShortHexGuid, Buffer> {
    if (shares.length != members.length) {
      throw new Error(
        'The number of shares does not match the number of members',
      );
    }
    const memberIds = members.map((v) => v.id);
    const encryptedSharesByMemberId = new Map<ShortHexGuid, Buffer>();
    for (let i = 0; i < memberIds.length; i++) {
      const memberId = memberIds[i];
      const member = members.find((v) => v.id == memberId);
      if (!member) {
        throw new Error('Member not found');
      }
      const shareForMember = shares[i];

      const encryptedKeyShare = StaticHelpersECIES.encrypt(
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
        throw new Error('Member not found');
      }
      const encryptedKeyShareHex = encryptedSharesByMemberId.get(memberId);
      if (!encryptedKeyShareHex) {
        throw new Error('Encrypted share not found');
      }
      const decryptedKeyShare = StaticHelpersECIES.decryptWithHeader(
        member.privateKey,
        encryptedKeyShareHex,
      );
      decryptedShares[i] = decryptedKeyShare.toString('hex');
    }
    return decryptedShares;
  }
}
