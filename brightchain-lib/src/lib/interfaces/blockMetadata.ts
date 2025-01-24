import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';

/**
 * IBlockMetadata defines the metadata structure for blocks in the Owner Free Filesystem (OFF).
 * Metadata serves several critical purposes:
 * 1. Block identification and validation
 * 2. Storage and retrieval optimization
 * 3. Operation tracking and auditing
 * 4. Layer-specific information storage
 *
 * Metadata Organization:
 * - Core fields: Required for all blocks (size, type, etc.)
 * - Optional fields: Used by specific block types
 * - Custom fields: Added through the Record<string, unknown> extension
 */
export interface IBlockMetadata extends Record<string, unknown> {
  /**
   * The block's size category.
   * Used for:
   * 1. Storage allocation
   * 2. Operation validation
   * 3. Performance optimization
   */
  size: BlockSize;

  /**
   * The block's type classification.
   * Used for:
   * 1. Block handling
   * 2. Operation routing
   * 3. Feature support
   */
  type: BlockType;

  /**
   * The type of data stored in the block.
   * Used for:
   * 1. Data processing
   * 2. Format validation
   * 3. Operation selection
   */
  dataType: BlockDataType;

  /**
   * Original data length before encryption.
   * Used for:
   * 1. Encryption overhead tracking
   * 2. Decryption validation
   * 3. Storage optimization
   */
  originalDataLength?: number;

  /**
   * Block creation timestamp.
   * Used for:
   * 1. Versioning
   * 2. Auditing
   * 3. Lifecycle management
   *
   * Stored as ISO string for JSON compatibility
   */
  dateCreated: string;

  /**
   * Extension point for additional metadata.
   * Allows:
   * 1. Layer-specific metadata
   * 2. Custom attributes
   * 3. Future extensions
   */
  [key: string]: unknown;
}

/**
 * BlockMetadata provides utility functions for working with block metadata.
 * These functions ensure consistent metadata handling across the system.
 */
export const BlockMetadata = {
  /**
   * Create metadata from block properties.
   * @param size - Block size category
   * @param type - Block type classification
   * @param dataType - Type of stored data
   * @param originalDataLength - Original data length for encrypted blocks
   * @param dateCreated - Block creation timestamp
   * @returns Complete metadata object
   */
  create(
    size: BlockSize,
    type: BlockType,
    dataType: BlockDataType,
    originalDataLength?: number,
    dateCreated = new Date(),
  ): IBlockMetadata {
    return {
      size,
      type,
      dataType,
      originalDataLength,
      dateCreated: dateCreated.toISOString(),
    };
  },

  /**
   * Parse metadata from JSON representation.
   * Handles:
   * 1. Type conversion
   * 2. Optional fields
   * 3. Custom attributes
   *
   * @param json - JSON string containing metadata
   * @returns Parsed metadata object
   * @throws If JSON is invalid or required fields are missing
   */
  fromJSON(json: string): IBlockMetadata {
    try {
      const data = JSON.parse(json);

      // Validate required fields
      if (!data.size || !data.type || !data.dataType || !data.dateCreated) {
        throw new Error('Missing required metadata fields');
      }

      // Convert types and maintain extensibility
      return {
        ...data,
        dateCreated: data.dateCreated, // Already a string
        size: data.size as BlockSize,
        type: data.type as BlockType,
        dataType: data.dataType as BlockDataType,
        originalDataLength: data.originalDataLength,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse metadata: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  },
};
