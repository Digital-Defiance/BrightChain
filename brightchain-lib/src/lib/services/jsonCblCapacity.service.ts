import type { CBLData, CBLType } from '../interfaces/storage/superCbl';

/**
 * Service for calculating JSON CBL capacity and overhead.
 * Used for the showcase demo which stores CBLs as JSON.
 *
 * @see Requirements 1.1, 1.2, 1.3, 1.4
 */
export class JsonCBLCapacityCalculator {
  /**
   * Calculate the serialized size of a CBL in bytes when stored as JSON.
   * Accounts for JSON serialization overhead and 4-byte length prefix.
   *
   * @param cbl - The CBL data to calculate size for
   * @returns The total size in bytes including length prefix
   *
   * @see Requirements 1.1, 1.4
   */
  public calculateCBLSize(cbl: CBLData): number {
    const json = JSON.stringify(cbl);
    const jsonBytes = new TextEncoder().encode(json).length;
    // Add 4-byte length prefix
    return 4 + jsonBytes;
  }

  /**
   * Calculate the overhead for a given CBL type (metadata without block references).
   *
   * @param cblType - The type of CBL
   * @param fileName - File name for metadata
   * @param originalSize - Original file size
   * @param blockSize - Block size
   * @param additionalFields - Additional fields for specific CBL types
   * @returns The overhead in bytes
   *
   * @see Requirements 1.1
   */
  public calculateCBLOverhead(
    cblType: CBLType | 'v1',
    fileName: string,
    originalSize: number,
    blockSize: number,
    additionalFields?: {
      subCblIndex?: number;
      totalSubCbls?: number;
      totalBlockCount?: number;
      depth?: number;
      subCblCount?: number;
    },
  ): number {
    let cbl: CBLData;

    if (cblType === 'v1') {
      cbl = {
        version: 1,
        fileName,
        originalSize,
        blockSize,
        blockCount: 0,
        blocks: [],
      };
    } else if (cblType === 'regular') {
      cbl = {
        version: 2,
        type: 'regular',
        fileName,
        originalSize,
        blockSize,
        blockCount: 0,
        blocks: [],
      };
    } else if (cblType === 'sub-cbl') {
      cbl = {
        version: 2,
        type: 'sub-cbl',
        fileName,
        originalSize,
        blockSize,
        blockCount: 0,
        blocks: [],
        subCblIndex: additionalFields?.subCblIndex ?? 0,
        totalSubCbls: additionalFields?.totalSubCbls ?? 1,
      };
    } else {
      cbl = {
        version: 2,
        type: 'super-cbl',
        fileName,
        originalSize,
        blockSize,
        totalBlockCount: additionalFields?.totalBlockCount ?? 0,
        depth: additionalFields?.depth ?? 2,
        subCblCount: additionalFields?.subCblCount ?? 0,
        subCblMagnetUrls: [],
      };
    }

    return this.calculateCBLSize(cbl);
  }

  /**
   * Calculate the maximum number of block references that fit in a CBL.
   *
   * @param blockSize - Target block size in bytes
   * @param fileName - File name for metadata
   * @param originalSize - Original file size
   * @param cblType - Type of CBL ('regular' or 'sub-cbl')
   * @param additionalFields - Additional fields for sub-CBL
   * @returns Maximum number of block references
   *
   * @see Requirements 1.3
   */
  public calculateMaxBlockReferences(
    blockSize: number,
    fileName: string,
    originalSize: number,
    cblType: 'regular' | 'sub-cbl' = 'regular',
    additionalFields?: {
      subCblIndex?: number;
      totalSubCbls?: number;
    },
  ): number {
    const overhead = this.calculateCBLOverhead(
      cblType,
      fileName,
      originalSize,
      blockSize,
      additionalFields,
    );

    // Estimate bytes per block reference (hex string in JSON array)
    // Format: "abc123..." with quotes and comma: ~130 chars for 128-char hex + overhead
    const bytesPerReference = 132;

    const availableSpace = blockSize - overhead;
    return Math.floor(availableSpace / bytesPerReference);
  }

  /**
   * Calculate the maximum number of sub-CBL magnet URL references in a Super CBL.
   *
   * @param blockSize - Target block size in bytes
   * @param fileName - File name for metadata
   * @param originalSize - Original file size
   * @param totalBlockCount - Total blocks across all sub-CBLs
   * @param depth - Hierarchy depth
   * @returns Maximum number of sub-CBL references
   *
   * @see Requirements 1.3
   */
  public calculateMaxSubCBLReferences(
    blockSize: number,
    fileName: string,
    originalSize: number,
    totalBlockCount: number,
    depth: number,
  ): number {
    const overhead = this.calculateCBLOverhead(
      'super-cbl',
      fileName,
      originalSize,
      blockSize,
      { totalBlockCount, depth, subCblCount: 0 },
    );

    // Estimate bytes per magnet URL in JSON array
    // Format: "magnet:?xt=urn:brightchain:cbl&bs=4096&b1=...&b2=..." with quotes and comma
    // Typical length: ~310 chars to be safe
    const bytesPerMagnetUrl = 310;

    const availableSpace = blockSize - overhead;
    return Math.floor(availableSpace / bytesPerMagnetUrl);
  }

  /**
   * Determine if a Super CBL is required based on block count.
   *
   * @param blockCount - Number of blocks to store
   * @param blockSize - Target block size in bytes
   * @param fileName - File name for metadata
   * @param originalSize - Original file size
   * @returns True if Super CBL is required
   *
   * @see Requirements 1.2, 1.4
   */
  public requiresSuperCBL(
    blockCount: number,
    blockSize: number,
    fileName: string,
    originalSize: number,
  ): boolean {
    const maxReferences = this.calculateMaxBlockReferences(
      blockSize,
      fileName,
      originalSize,
      'regular',
    );
    return blockCount > maxReferences;
  }
}
