import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';

/**
 * Parameters for calculating block capacity
 *
 * @remarks
 * This interface defines all the parameters needed to calculate how much data
 * can be stored in a block after accounting for headers, encryption overhead,
 * and type-specific metadata.
 *
 * @example
 * ```typescript
 * const params: IBlockCapacityParams = {
 *   blockSize: BlockSize.Small,
 *   blockType: BlockType.RawData,
 *   encryptionType: BlockEncryptionType.None,
 * };
 * ```
 */
export interface IBlockCapacityParams {
  /** The size of the block (e.g., Small, Medium, Large) */
  blockSize: BlockSize;

  /** The type of block (e.g., RawData, CBL, EncryptedOwnedDataBlock) */
  blockType: BlockType;

  /**
   * Extended CBL data (required for extended CBL block types)
   * @remarks Only needed for ExtendedConstituentBlockListBlock and EncryptedExtendedConstituentBlockListBlock
   */
  cbl?: {
    /** File name for the extended CBL metadata */
    fileName: string;
    /** MIME type for the extended CBL metadata */
    mimeType: string;
  };

  /** The encryption type to be applied to the block */
  encryptionType: BlockEncryptionType;

  /**
   * Number of recipients for multi-recipient encryption
   * @remarks Required when encryptionType is MultiRecipient
   */
  recipientCount?: number;
}

/**
 * Detailed breakdown of overhead components
 *
 * @remarks
 * This interface provides a granular view of how block capacity is consumed
 * by different types of overhead. The sum of all overhead components equals
 * the total overhead reported in IBlockCapacityResult.
 *
 * @example
 * ```typescript
 * const breakdown: IOverheadBreakdown = {
 *   baseHeader: 64,
 *   typeSpecificOverhead: 128,
 *   encryptionOverhead: 256,
 *   variableOverhead: 32
 * };
 * // Total overhead = 480 bytes
 * ```
 */
export interface IOverheadBreakdown {
  /** Base header overhead present in all blocks (typically 64 bytes) */
  baseHeader: number;

  /** Type-specific overhead that varies by block type (e.g., CBL metadata) */
  typeSpecificOverhead: number;

  /** Overhead added by encryption (varies by encryption type and recipient count) */
  encryptionOverhead: number;

  /** Variable overhead for dynamic content (e.g., extended CBL file names) */
  variableOverhead: number;
}

/**
 * Result of block capacity calculation
 *
 * @remarks
 * This interface represents the complete result of a block capacity calculation,
 * including both the high-level capacity numbers and a detailed breakdown of
 * overhead components.
 *
 * @example
 * ```typescript
 * const result: IBlockCapacityResult = {
 *   totalCapacity: 4096,
 *   availableCapacity: 3616,
 *   overhead: 480,
 *   details: {
 *     baseHeader: 64,
 *     typeSpecificOverhead: 128,
 *     encryptionOverhead: 256,
 *     variableOverhead: 32
 *   }
 * };
 * ```
 */
export interface IBlockCapacityResult {
  /** Total capacity of the block in bytes (based on BlockSize) */
  totalCapacity: number;

  /** Available capacity for user data after subtracting all overhead */
  availableCapacity: number;

  /** Total overhead in bytes (sum of all overhead components) */
  overhead: number;

  /** Detailed breakdown of overhead by component type */
  details: IOverheadBreakdown;
}

/**
 * Interface for block capacity calculator
 * Used for dependency injection to avoid circular dependencies
 */
export interface IBlockCapacityCalculator {
  /** Calculate the capacity for a block with the given parameters */
  calculateCapacity(params: IBlockCapacityParams): IBlockCapacityResult;
}
