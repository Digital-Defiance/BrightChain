import { ServiceProvider } from '../services/service.provider';
import { ChecksumBuffer } from '../types';

/**
 * Checksum service access for blocks to avoid circular dependencies
 */
export abstract class BlockChecksum {
  private static readonly ChecksumService =
    ServiceProvider.getInstance().checksumService;

  public static calculateChecksum(data: Buffer): ChecksumBuffer {
    return BlockChecksum.ChecksumService.calculateChecksum(data);
  }

  public static compareChecksums(
    checksum1: ChecksumBuffer,
    checksum2: ChecksumBuffer,
  ): boolean {
    return BlockChecksum.ChecksumService.compareChecksums(checksum1, checksum2);
  }

  public static validateChecksum(checksum: ChecksumBuffer): boolean {
    return BlockChecksum.ChecksumService.validateChecksum(checksum);
  }

  public static validateDataChecksum(
    data: Buffer,
    checksum: ChecksumBuffer,
  ): boolean {
    const calculatedChecksum = this.calculateChecksum(data);
    return this.compareChecksums(calculatedChecksum, checksum);
  }
}
