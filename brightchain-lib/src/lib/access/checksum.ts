import { ChecksumUint8Array } from '@digitaldefiance/ecies-lib';
import { ServiceProvider } from '../services/service.provider';

/**
 * Checksum service access for blocks to avoid circular dependencies
 */
export class BlockChecksum {
  public static get checksumBufferLength(): number {
    return ServiceProvider.getInstance().checksumService.checksumBufferLength;
  }

  public static calculateChecksum(data: Buffer): ChecksumUint8Array {
    return ServiceProvider.getInstance().checksumService.calculateChecksum(
      new Uint8Array(data),
    );
  }

  public static compareChecksums(
    checksum1: ChecksumUint8Array,
    checksum2: ChecksumUint8Array,
  ): boolean {
    return ServiceProvider.getInstance().checksumService.compareChecksums(
      checksum1,
      checksum2,
    );
  }

  public static validateChecksum(checksum: ChecksumUint8Array): boolean {
    return ServiceProvider.getInstance().checksumService.validateChecksum(
      checksum,
    );
  }

  public static validateDataChecksum(
    data: Buffer,
    checksum: ChecksumUint8Array,
  ): boolean {
    const calculatedChecksum = this.calculateChecksum(data);
    return this.compareChecksums(calculatedChecksum, checksum);
  }
}
