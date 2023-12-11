import { ServiceProvider } from '../services/service.provider';
import { Checksum } from '../types';

/**
 * Checksum service access for blocks to avoid circular dependencies
 */
export class BlockChecksum {
  public static get checksumBufferLength(): number {
    return ServiceProvider.getInstance().checksumService.checksumBufferLength;
  }

  public static calculateChecksum(data: Buffer): Checksum {
    return ServiceProvider.getInstance().checksumService.calculateChecksum(
      new Uint8Array(data),
    );
  }

  public static compareChecksums(
    checksum1: Checksum,
    checksum2: Checksum,
  ): boolean {
    return ServiceProvider.getInstance().checksumService.compareChecksums(
      checksum1,
      checksum2,
    );
  }

  public static validateChecksum(checksum: Checksum): boolean {
    return ServiceProvider.getInstance().checksumService.validateChecksum(
      checksum,
    );
  }

  public static validateDataChecksum(
    data: Buffer,
    checksum: Checksum,
  ): boolean {
    const calculatedChecksum = this.calculateChecksum(data);
    return this.compareChecksums(calculatedChecksum, checksum);
  }
}
