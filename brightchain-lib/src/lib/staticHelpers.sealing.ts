import * as secrets from 'secrets.js-34r7h';
import { QuorumDataRecord } from './quorumDataRecord';
import { BrightChainMember } from './brightChainMember';
import { StaticHelpersSymmetric } from './staticHelpers.symmetric';
import { ShortHexGuid } from './types';
import { EthereumECIES } from './ethereumECIES';

/**
 * @description Static helper functions for Brightchain Quorum. Encryption and other utilities.
 * - Uses secrets.js-34r7h fork of secrets.js for Shamir's Secret Sharing
 * - Uses elliptic for ECDSA
 * - Uses bip39 for BIP39 Mnemonic generation
 * - Uses crypto for AES encryption
 * - Uses crypto for RSA key generation, encryption/decryption
 */
export abstract class StaticHelpersSealing {
  /**
   * Reconfigure secrets.js to have the right number of bits for the number of shares needed
   * @param maxShares
   */
  public static reinitSecrets(maxShares: number) {
    // must have at least 3 bits, making the minimum max shares 2^3 = 8
    const bits = Math.max(3, Math.ceil(Math.log2(maxShares)));
    if (bits < 3 || bits > 20) {
      throw new Error('Bits must be between 3 and 20');
    }

    // secrets.init requires a CSPRNG type, get the current one
    const config = secrets.getConfig();
    secrets.init(bits, config.typeCSPRNG);
  }

  private static validateQuorumSealInputs(
    amongstMembers: BrightChainMember[], sharesRequired?: number
  ) {
    if (amongstMembers.length < 3) {
      throw new Error('At least three members are required');
    }
    if (amongstMembers.length > (2 ** 20) - 1) {
      throw new Error('Too many members');
    }
    sharesRequired = sharesRequired ?? amongstMembers.length;
    if (sharesRequired < 3 || sharesRequired > amongstMembers.length) {
      throw new Error('Invalid number of shares required');
    }
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
    amongstMembers: BrightChainMember[],
    sharesRequired?: number
  ): QuorumDataRecord {
    if (amongstMembers.length < 2) {
      throw new Error('At least two members are required');
    }
    sharesRequired = sharesRequired ?? amongstMembers.length;
    this.validateQuorumSealInputs(amongstMembers, sharesRequired);
    const encryptedData = StaticHelpersSymmetric.symmetricEncrypt<T>(data);

    // TODO: consider computing the number of shares a user needs if you want to consider them "required"
    // eg if you normally would have say 3 shares and require 2 but require that one of the members is a specific one
    // alice: 1 share, bob (required): 3 shares, carol: 1 share = total 5 shares
    // split the key using shamir's secret sharing
    StaticHelpersSealing.reinitSecrets(amongstMembers.length);
    const keyShares = secrets.share(
      encryptedData.key.toString('hex'),
      amongstMembers.length,
      sharesRequired
    );
    // distribute the key shares to the members
    const encryptedSharesByMemberId = StaticHelpersSealing.encryptSharesForMembers(
      keyShares,
      amongstMembers
    );

    const dataRecord = new QuorumDataRecord(
      agent,
      amongstMembers.map((m) => m.id),
      sharesRequired,
      encryptedData.encryptedData,
      encryptedSharesByMemberId,
    );
    return dataRecord;
  }

  /**
   * Using shamir's secret sharing, recombine the given shares into the original data
   * @param recoveredShares
   * @param encryptedData
   * @returns
   */
  public static quorumUnseal<T>(
    document: QuorumDataRecord,
    membersWithPrivateKey: BrightChainMember[]
  ): T {
    if (membersWithPrivateKey.length < document.sharesRequired) {
      throw new Error('Not enough members to unlock the document');
    }
    const decryptedShares: secrets.Shares = new Array<string>(
      membersWithPrivateKey.length
    );
    for (let i = 0; i < membersWithPrivateKey.length; i++) {
      const member = membersWithPrivateKey[i];
      const encryptedKeyShareHex = document.encryptedSharesByMemberId.get(member.id);
      if (!encryptedKeyShareHex) {
        throw new Error('Encrypted share not found');
      }
      const decryptedKeyShare = EthereumECIES.decrypt(
        member.privateKey,
        encryptedKeyShareHex
      );
      decryptedShares[i] = decryptedKeyShare.toString('hex');
    }
    // reconstitute the document key from the shares
    StaticHelpersSealing.reinitSecrets(decryptedShares.length);
    const combined = secrets.combine(decryptedShares);
    const key = Buffer.from(combined, 'hex'); // hex?
    return StaticHelpersSymmetric.symmetricDecrypt<T>(document.encryptedData, key);
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
      throw new Error('The number of shares does not match the number of members');
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

      const encryptedKeyShare = EthereumECIES.encrypt(
        member.publicKey,
        Buffer.from(shareForMember, 'hex')
      );
      encryptedSharesByMemberId.set(member.id, encryptedKeyShare);
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
    const decryptedShares: secrets.Shares = new Array<string>(
      memberIds.length
    );
    for (let i = 0; i < memberIds.length; i++) {
      const memberId = memberIds[i];
      const member = members.find((v) => v.id == memberId);
      if (!member) {
        throw new Error('Member not found');
      }
      const encryptedKeyShareHex = encryptedSharesByMemberId.get(memberId);
      if (!encryptedKeyShareHex) {
        throw new Error('Encrypted share not found');
      }
      const decryptedKeyShare = EthereumECIES.decrypt(
        member.privateKey,
        encryptedKeyShareHex
      );
      decryptedShares[i] = decryptedKeyShare.toString('hex');
    }
    return decryptedShares;
  }
}
