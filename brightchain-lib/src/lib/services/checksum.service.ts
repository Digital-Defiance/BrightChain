import { CHECKSUM, ChecksumString } from '@digitaldefiance/ecies-lib';
import { sha3_512 } from '@noble/hashes/sha3';
import { Checksum } from '../types/checksum';

/**
 * Service for calculating and managing checksums.
 *
 * This service provides methods for calculating SHA3-512 checksums for various
 * data types including buffers, strings, files, and streams.
 *
 * All methods now return the Checksum class for type safety and consistency.
 *
 * @see Requirements 1.1, 1.2
 */
export class ChecksumService {
  constructor() {}

  /**
   * Get the length of a checksum buffer in bytes
   *
   * @returns The length of SHA3-512 checksums in bytes (64 bytes / 512 bits)
   *
   * @remarks
   * This value is constant for SHA3-512 and is used for validation
   * throughout the system.
   */
  public get checksumBufferLength(): number {
    return CHECKSUM.SHA3_BUFFER_LENGTH; // SHA3-512 produces a 64-byte (512-bit) hash
  }

  /**
   * Calculate a checksum for a buffer and return as Checksum class.
   *
   * @param data - The data to calculate the checksum for
   * @returns The checksum as a Checksum instance
   *
   * @example
   * ```typescript
   * const checksum = checksumService.calculateChecksum(data);
   * console.log(checksum.toHex());
   * ```
   *
   * @see Requirements 1.1, 1.2
   */
  public calculateChecksum(data: Uint8Array): Checksum {
    const hashBytes = sha3_512(data);
    return Checksum.fromUint8Array(hashBytes);
  }

  /**
   * Calculate a checksum for multiple buffers and return as Checksum class.
   *
   * @param buffers - Array of buffers to calculate the checksum for
   * @returns The checksum as a Checksum instance
   *
   * @remarks
   * This method concatenates all buffers before calculating the checksum,
   * which is more efficient than calculating individual checksums.
   *
   * @example
   * ```typescript
   * const buffers = [buffer1, buffer2, buffer3];
   * const checksum = checksumService.calculateChecksumForBuffers(buffers);
   * console.log(checksum.toHex());
   * ```
   *
   * @see Requirements 1.1, 1.2
   */
  public calculateChecksumForBuffers(buffers: Uint8Array[]): Checksum {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
      combined.set(buffer, offset);
      offset += buffer.length;
    }
    return Checksum.fromUint8Array(sha3_512(combined));
  }

  /**
   * Calculate a checksum for a string and return as Checksum class.
   *
   * @param str - The string to calculate the checksum for
   * @returns The checksum as a Checksum instance
   *
   * @remarks
   * The string is encoded as UTF-8 before calculating the checksum.
   *
   * @example
   * ```typescript
   * const checksum = checksumService.calculateChecksumForString('Hello, World!');
   * console.log(checksum.toHex());
   * ```
   *
   * @see Requirements 1.1, 1.2
   */
  public calculateChecksumForString(str: string): Checksum {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    return Checksum.fromUint8Array(sha3_512(data));
  }

  /**
   * Calculate a checksum for a file and return as Checksum class.
   *
   * @param file - The File object to calculate the checksum for
   * @returns Promise resolving to the checksum as a Checksum instance
   *
   * @remarks
   * The entire file is loaded into memory before calculating the checksum.
   * For large files, consider using streaming methods.
   *
   * @example
   * ```typescript
   * const file = new File(['content'], 'test.txt');
   * const checksum = await checksumService.calculateChecksumForFile(file);
   * console.log(checksum.toHex());
   * ```
   *
   * @see Requirements 1.1, 1.2
   */
  public async calculateChecksumForFile(file: File): Promise<Checksum> {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    return this.calculateChecksum(data);
  }

  /**
   * Calculate a checksum for a stream and return as Checksum class.
   *
   * @param stream - The readable stream
   * @returns The checksum as a Checksum instance
   *
   * @see Requirements 1.1, 1.2
   */
  public async calculateChecksumForStream(
    stream: ReadableStream<Uint8Array>,
  ): Promise<Checksum> {
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();
    let result: ReadableStreamReadResult<Uint8Array>;
    do {
      result = await reader.read();
      if (result.value) {
        chunks.push(result.value);
      }
    } while (!result.done);

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    return Checksum.fromUint8Array(sha3_512(combined));
  }

  /**
   * Compare two checksums for equality
   * @param checksum1 - The first checksum
   * @param checksum2 - The second checksum
   * @returns True if the checksums are equal, false otherwise
   */
  public compareChecksums(checksum1: Checksum, checksum2: Checksum): boolean {
    return checksum1.equals(checksum2);
  }

  /**
   * Convert a checksum to a hex string
   * @param checksum - The checksum to convert
   * @returns The checksum as a hex string
   */
  public checksumToHexString(checksum: Checksum): ChecksumString {
    return checksum.toHex() as ChecksumString;
  }

  /**
   * Convert a hex string to a checksum
   * @param hexString - The hex string to convert
   * @returns The checksum as a Checksum instance
   */
  public hexStringToChecksum(hexString: string): Checksum {
    return Checksum.fromHex(hexString);
  }

  /**
   * Validate a checksum buffer
   * @param checksum - The checksum to validate
   * @returns True if the checksum is valid, false otherwise
   */
  public validateChecksum(checksum: Checksum): boolean {
    return checksum.length === this.checksumBufferLength;
  }
}
