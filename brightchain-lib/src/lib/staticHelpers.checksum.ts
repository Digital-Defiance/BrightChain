import { sha3_512 } from 'js-sha3';
import { Readable } from 'stream';
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
  /**
   * Default hash bits for SHA3
   */
  public static readonly Sha3DefaultHashBits: number = 512;
  /**
   * Length of a SHA3 checksum buffer
   */
  public static readonly Sha3ChecksumBufferLength = 64;

  /**
   * Calculates the checksum of a buffer
   * @param data - The buffer to calculate the checksum of
   * @returns The checksum as a buffer
   */
  public static calculateChecksum(data: Buffer): ChecksumBuffer {
    const hash = sha3_512.create();
    hash.update(data);
    return Buffer.from(hash.hex(), 'hex') as ChecksumBuffer;
  }

  /**
   * Caclulates the checksum of a buffer or readable stream
   * @param input - The buffer or readable stream to calculate the checksum of
   * @returns The checksum as a buffer
   */
  public static async calculateChecksumAsync(
    input: Buffer | Readable,
  ): Promise<ChecksumBuffer> {
    const hash = sha3_512.create();

    if (Buffer.isBuffer(input)) {
      // Process buffer in chunks to avoid memory issues with large files
      const chunkSize = 64 * 1024; // 64KB chunks
      for (let i = 0; i < input.length; i += chunkSize) {
        const chunk = input.subarray(i, i + chunkSize);
        hash.update(chunk);
      }
      return Promise.resolve(Buffer.from(hash.hex(), 'hex') as ChecksumBuffer);
    }

    // Handle readable stream
    return new Promise((resolve, reject) => {
      input.on('data', (chunk: Buffer) => {
        hash.update(chunk);
      });

      input.on('end', () => {
        resolve(Buffer.from(hash.hex(), 'hex') as ChecksumBuffer);
      });

      input.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Validates a checksum against a buffer
   * @param data The data to validate
   * @param checksum The checksum to validate against
   * @returns True if the checksum is valid, false otherwise
   */
  public static validateChecksum(
    data: Buffer,
    checksum: ChecksumBuffer,
  ): boolean {
    const calculatedChecksum = StaticHelpersChecksum.calculateChecksum(data);
    return (
      calculatedChecksum.length === checksum.length &&
      calculatedChecksum.equals(checksum)
    );
  }

  /**
   * Validates a checksum against a buffer or readable stream
   * @param data The data to validate
   * @param checksum The checksum to validate against
   * @returns True if the checksum is valid, false otherwise
   */
  public static async validateChecksumAsync(
    data: Buffer | Readable,
    checksum: ChecksumBuffer,
  ): Promise<boolean> {
    const calculatedChecksum =
      await StaticHelpersChecksum.calculateChecksumAsync(data);
    return (
      calculatedChecksum.length === checksum.length &&
      calculatedChecksum.equals(checksum)
    );
  }

  /**
   * Converts a checksum buffer to a checksum string
   * @param checksumBuffer The checksum buffer to convert
   * @returns The checksum as a string
   */
  public static checksumBufferToChecksumString(
    checksumBuffer: ChecksumBuffer,
  ): ChecksumString {
    return checksumBuffer.toString('hex') as ChecksumString;
  }

  /**
   * Converts a checksum string to a checksum buffer
   * @param checksumString The checksum string to convert
   * @returns The checksum as a buffer
   */
  public static checksumStringToChecksumBuffer(
    checksumString: ChecksumString,
  ): ChecksumBuffer {
    return Buffer.from(checksumString, 'hex') as ChecksumBuffer;
  }
}
