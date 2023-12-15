import { sha3_512 } from 'js-sha3';
import { ChecksumBuffer, ChecksumString } from './types';

/**
 * @description
 * Static helper functions for BrightChain and BrightChain Quorum. Encryption and other utilities.
 * - Uses secrets.js-34r7h fork of secrets.js for Shamir's Secret Sharing
 * - Uses elliptic for ECDSA
 * - Uses bip39 for BIP39 Mnemonic generation
 * - Uses crypto for AES encryption
 * - Uses crypto for RSA key generation, encryption/decryption
 */
export abstract class StaticHelpersChecksum {
  public static readonly Sha3DefaultHashBits: number = 512;

  /**
   * unused/future/unsupported on my platform/version.
   */
  public static readonly EnableOaepHash: boolean = true;

  public static calculateChecksum(data: Buffer): ChecksumBuffer {
    return Buffer.from(sha3_512.update(data).hex(), 'hex') as ChecksumBuffer;
  }

  public static validateChecksum(
    data: Buffer,
    checksum: ChecksumBuffer
  ): boolean {
    const calculatedChecksum = StaticHelpersChecksum.calculateChecksum(data);
    return (
      calculatedChecksum.length == checksum.length &&
      calculatedChecksum.equals(checksum)
    );
  }

  public static checksumBufferToChecksumString(
    checksumBuffer: ChecksumBuffer
  ): ChecksumString {
    return checksumBuffer.toString('hex') as ChecksumString;
  }

  public static checksumStringToChecksumBuffer(
    checksumString: ChecksumString
  ): ChecksumBuffer {
    return Buffer.from(checksumString, 'hex') as ChecksumBuffer;
  }
}
