import { ServiceProvider } from '../services/service.provider';
import { ChecksumBuffer } from '../types';

/**
 * Checksum service access for blocks to avoid circular dependencies
 */
export class BlockChecksum {
  private static getService() {
    return ServiceProvider.getChecksumService();
  }

  public static get checksumBufferLength(): number {
    return this.getService().checksumBufferLength;
  }

  public static calculateChecksum(data: Buffer): ChecksumBuffer {
    return this.getService().calculateChecksum(data);
  }

  public static compareChecksums(
    checksum1: ChecksumBuffer,
    checksum2: ChecksumBuffer,
  ): boolean {
    return this.getService().compareChecksums(checksum1, checksum2);
  }

  public static validateChecksum(checksum: ChecksumBuffer): boolean {
    return this.getService().validateChecksum(checksum);
  }

  public static validateDataChecksum(
    data: Buffer,
    checksum: ChecksumBuffer,
  ): boolean {
    const calculatedChecksum = this.calculateChecksum(data);
    return this.compareChecksums(calculatedChecksum, checksum);
  }
}
