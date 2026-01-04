import { sha3_512 } from 'js-sha3';
import { CHECKSUM } from '../constants';
import { ChecksumString, ChecksumUint8Array } from '../types';
import { hexToUint8Array, uint8ArrayToHex } from '@digitaldefiance/ecies-lib';

export class ChecksumService {
  constructor() {}

  /**
   * Get the length of a checksum buffer in bytes
   */
  public get checksumBufferLength(): number {
    return CHECKSUM.SHA3_BUFFER_LENGTH; // SHA3-512 produces a 64-byte (512-bit) hash
  }

  /**
   * Calculate a checksum for a buffer
   * @param data - The data to calculate the checksum for
   * @returns The checksum as a Buffer with equals method
   */
  public calculateChecksum(data: Uint8Array): ChecksumUint8Array {
    const hash = sha3_512.create();
    hash.update(data);
    const result = hexToUint8Array(hash.hex()) as ChecksumUint8Array;
    // Add equals method to the checksum
    (result as any).equals = function (other: ChecksumUint8Array): boolean {
      if (this.length !== other.length) return false;
      return this.every(
        (value: number, index: number) => value === other[index],
      );
    };
    return result;
  }

  /**
   * Calculate a checksum for multiple buffers
   * @param buffers - The buffers to calculate the checksum for
   * @returns The checksum as a Buffer
   */
  public calculateChecksumForBuffers(
    buffers: Uint8Array[],
  ): ChecksumUint8Array {
    const hash = sha3_512.create();
    for (const buffer of buffers) {
      hash.update(buffer);
    }
    return hexToUint8Array(hash.hex()) as ChecksumUint8Array;
  }

  /**
   * Calculate a checksum for a string
   * @param str - The string to calculate the checksum for
   * @returns The checksum as a Buffer
   */
  public calculateChecksumForString(str: string): ChecksumUint8Array {
    const hash = sha3_512.create();
    hash.update(str);
    return hexToUint8Array(hash.hex()) as ChecksumUint8Array;
  }

  /**
   * Calculate a checksum for a file
   * @param file - The file object to calculate the checksum for
   * @returns The checksum as a Uint8Array
   */
  public async calculateChecksumForFile(
    file: File,
  ): Promise<ChecksumUint8Array> {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    return this.calculateChecksum(data);
  }

  /**
   * Calculate a checksum for a stream
   * @param stream - The readable stream
   * @returns The checksum as a Uint8Array
   */
  public async calculateChecksumForStream(
    stream: ReadableStream<Uint8Array>,
  ): Promise<ChecksumUint8Array> {
    const hash = sha3_512.create();
    const reader = stream.getReader();
    let result: ReadableStreamReadResult<Uint8Array>;
    do {
      result = await reader.read();
      if (result.value) {
        hash.update(result.value);
      }
    } while (!result.done);
    return hexToUint8Array(hash.hex()) as ChecksumUint8Array;
  }

  /**
   * Compare two checksums for equality
   * @param checksum1 - The first checksum
   * @param checksum2 - The second checksum
   * @returns True if the checksums are equal, false otherwise
   */
  public compareChecksums(
    checksum1: ChecksumUint8Array,
    checksum2: ChecksumUint8Array,
  ): boolean {
    if (
      checksum1.length !== this.checksumBufferLength ||
      checksum2.length !== this.checksumBufferLength
    ) {
      return false;
    }
    return checksum1.every((value, index) => value === checksum2[index]);
  }

  /**
   * Convert a checksum to a hex string
   * @param checksum - The checksum to convert
   * @returns The checksum as a hex string
   */
  public checksumToHexString(checksum: ChecksumUint8Array): ChecksumString {
    return uint8ArrayToHex(checksum) as ChecksumString;
  }

  /**
   * Convert a hex string to a checksum
   * @param hexString - The hex string to convert
   * @returns The checksum as a Buffer
   */
  public hexStringToChecksum(hexString: string): ChecksumUint8Array {
    if (hexString.length !== this.checksumBufferLength * 2) {
      throw new Error('Invalid checksum hex string length');
    }
    return hexToUint8Array(hexString) as ChecksumUint8Array;
  }

  /**
   * Validate a checksum buffer
   * @param checksum - The checksum to validate
   * @returns True if the checksum is valid, false otherwise
   */
  public validateChecksum(checksum: ChecksumUint8Array): boolean {
    return checksum.length === this.checksumBufferLength;
  }
}
