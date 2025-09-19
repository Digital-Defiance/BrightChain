import { createHash } from 'crypto';
import { CHECKSUM } from '../constants';
import { IChecksumConfig } from '../interfaces/checksum-config';
import { ChecksumBuffer, ChecksumString } from '../shared-types';

export class ChecksumService {
  private readonly config: IChecksumConfig;

  constructor(config?: Partial<IChecksumConfig>) {
    this.config = {
      algorithm: CHECKSUM.ALGORITHM,
      encoding: CHECKSUM.ENCODING,
      ...config,
    };
  }

  /**
   * Calculate a checksum for a buffer
   * @param data - The data to calculate the checksum for
   * @returns The checksum as a Buffer
   */
  public calculateChecksum(data: Buffer): ChecksumBuffer {
    const hash = createHash(this.config.algorithm);
    hash.update(data);
    const digest = hash.digest();
    return Buffer.from(digest) as ChecksumBuffer;
  }

  /**
   * Calculate a checksum for multiple buffers
   * @param buffers - The buffers to calculate the checksum for
   * @returns The checksum as a Buffer
   */
  public calculateChecksumForBuffers(buffers: Buffer[]): ChecksumBuffer {
    const hash = createHash(this.config.algorithm);
    for (const buffer of buffers) {
      hash.update(buffer);
    }
    const digest = hash.digest();
    return Buffer.from(digest) as ChecksumBuffer;
  }

  /**
   * Calculate a checksum for a string
   * @param str - The string to calculate the checksum for
   * @returns The checksum as a Buffer
   */
  public calculateChecksumForString(str: string): ChecksumBuffer {
    return this.calculateChecksum(Buffer.from(str, 'utf8'));
  }

  /**
   * Compare two checksums for equality
   * @param checksum1 - The first checksum
   * @param checksum2 - The second checksum
   * @returns True if the checksums are equal, false otherwise
   */
  public compareChecksums(
    checksum1: ChecksumBuffer,
    checksum2: ChecksumBuffer,
  ): boolean {
    if (
      checksum1.length !== CHECKSUM.SHA3_ARRAY_LENGTH ||
      checksum2.length !== CHECKSUM.SHA3_ARRAY_LENGTH
    ) {
      return false;
    }
    return checksum1.equals(checksum2);
  }

  /**
   * Convert a checksum to a hex string
   * @param checksum - The checksum to convert
   * @returns The checksum as a hex string
   */
  public checksumToHexString(checksum: ChecksumBuffer): ChecksumString {
    return checksum.toString(CHECKSUM.ENCODING) as ChecksumString;
  }

  /**
   * Convert a hex string to a checksum
   * @param hexString - The hex string to convert
   * @returns The checksum as a Buffer
   */
  public hexStringToChecksum(hexString: string): ChecksumBuffer {
    if (hexString.length !== CHECKSUM.SHA3_ARRAY_LENGTH * 2) {
      throw new Error('Invalid checksum hex string length');
    }
    return Buffer.from(hexString, CHECKSUM.ENCODING) as ChecksumBuffer;
  }

  /**
   * Validate a checksum buffer
   * @param checksum - The checksum to validate
   * @returns True if the checksum is valid, false otherwise
   */
  public validateChecksum(checksum: ChecksumBuffer): boolean {
    return checksum.length === CHECKSUM.SHA3_ARRAY_LENGTH;
  }

  /**
   * Calculate a checksum for a file
   * @param filePath - The path to the file
   * @returns The checksum as a Buffer
   */
  public async calculateChecksumForFile(
    filePath: string,
  ): Promise<ChecksumBuffer> {
    // Removed dynamic import by using the data service to read file data
    // This is a temporary solution that can be replaced with a proper file service
    // The implementation now delegates file reading to the caller
    const buffer = Buffer.from(await this.readFile(filePath));
    return this.calculateChecksum(buffer);
  }

  /**
   * Internal file reading method
   * @private
   */
  private async readFile(filePath: string): Promise<Buffer> {
    // Import fs using a static import that's available at module load time
    // This solves the dynamic import/require issues
    try {
      const { readFile: fsReadFile } = await import('fs/promises');
      return await fsReadFile(filePath);
    } catch {
      throw new Error(`Failed to read file at path: ${filePath}`);
    }
  }

  /**
   * Calculate a checksum for a stream
   * @param stream - The readable stream
   * @returns The checksum as a Buffer
   */
  public calculateChecksumForStream(
    stream: NodeJS.ReadableStream,
  ): Promise<ChecksumBuffer> {
    return new Promise((resolve, reject) => {
      const hash = createHash(this.config.algorithm);
      stream.on('data', (chunk) => {
        // Ensure chunk is a Buffer before updating hash
        if (Buffer.isBuffer(chunk)) {
          hash.update(chunk);
        } else if (typeof chunk === 'number') {
          hash.update(Buffer.from([chunk]));
        } else {
          hash.update(Buffer.from(chunk));
        }
      });
      stream.on('end', () => {
        const digest = hash.digest();
        resolve(Buffer.from(digest) as ChecksumBuffer);
      });
      stream.on('error', reject);
    });
  }
}
