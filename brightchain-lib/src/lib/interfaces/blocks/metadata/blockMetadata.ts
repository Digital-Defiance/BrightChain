import { BlockDataType } from '../../../enumerations/blockDataType';
import { BlockSize } from '../../../enumerations/blockSize';
import { BlockType } from '../../../enumerations/blockType';

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
export interface IBaseBlockMetadata {
  /**
   * The block's size category.
   * Used for:
   * 1. Storage allocation
   * 2. Operation validation
   * 3. Performance optimization
   */
  get size(): BlockSize;

  /**
   * The block's type classification.
   * Used for:
   * 1. Block handling
   * 2. Operation routing
   * 3. Feature support
   */
  get type(): BlockType;

  /**
   * The type of data stored in the block.
   * Used for:
   * 1. Data processing
   * 2. Format validation
   * 3. Operation selection
   */
  get dataType(): BlockDataType;

  /**
   * Original data length before encryption and padding.
   * Used for:
   * 1. Encryption overhead tracking
   * 2. Decryption validation
   * 3. Storage optimization
   */
  get lengthWithoutPadding(): number;

  /**
   * Block creation timestamp.
   * Used for:
   * 1. Versioning
   * 2. Auditing
   * 3. Lifecycle management
   *
   * Stored as ISO string for JSON compatibility
   */
  get dateCreated(): Date;

  // /**
  //  * Extension point for additional metadata.
  //  * Allows:
  //  * 1. Layer-specific metadata
  //  * 2. Custom attributes
  //  * 3. Future extensions
  //  */
  // [key: string]: unknown;
}
