import { ServiceProvider } from '../services/service.provider';
import { ChecksumBuffer } from '../types';

/**
 * Checksum service access for blocks to avoid circular dependencies
 */
export class BlockChecksum {
  public static get checksumBufferLength(): number {
    return ServiceProvider.getInstance().checksumService.checksumBufferLength;
  }

  public static calculateChecksum(data: Buffer): ChecksumBuffer {
    return ServiceProvider.getInstance().checksumService.calculateChecksum(
      data,
    );
  }

  public static compareChecksums(
    checksum1: ChecksumBuffer,
    checksum2: ChecksumBuffer,
  ): boolean {
    return ServiceProvider.getInstance().checksumService.compareChecksums(
      checksum1,
      checksum2,
    );
  }

  public static validateChecksum(checksum: ChecksumBuffer): boolean {
    return ServiceProvider.getInstance().checksumService.validateChecksum(
      checksum,
    );
  }

  public static validateDataChecksum(
    data: Buffer,
    checksum: ChecksumBuffer,
  ): boolean {
    const calculatedChecksum = this.calculateChecksum(data);
    return this.compareChecksums(calculatedChecksum, checksum);
  }
}
