import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { ChecksumBuffer, ChecksumString } from '../types';

/**
 * IBlock defines the contract for all blocks in the Owner Free Filesystem (OFF).
 * In OFF, blocks are organized in a layered hierarchy where:
 * 1. Each layer can add its own header data
 * 2. Headers are concatenated in inheritance order
 * 3. The payload follows all headers
 * 4. Optional padding follows the payload
 *
 * Block Layout:
 * [Layer 0 Header][Layer 1 Header][...][Layer N Header][Payload][Padding]
 *
 * Common block types include:
 * 1. Raw blocks - Basic data storage
 * 2. Whitened blocks - XORed with random data
 * 3. Encrypted blocks - Protected with encryption
 * 4. CBL blocks - Store block lists and metadata
 */
export interface IBlock {
  /**
   * All layers in the block's inheritance chain, from base to most derived.
   * Used to:
   * 1. Calculate total overhead
   * 2. Access layer-specific headers
   * 3. Support polymorphic operations
   */
  get layers(): IBlock[];

  /**
   * The immediate parent block in the inheritance chain.
   * Used to:
   * 1. Access parent layer functionality
   * 2. Support inheritance-based operations
   */
  get parent(): IBlock | null;

  /**
   * The fixed size of the block.
   * In OFF, blocks have fixed sizes to:
   * 1. Enable efficient storage
   * 2. Support XOR operations
   * 3. Maintain privacy through size uniformity
   */
  get blockSize(): BlockSize;

  /**
   * The block's unique identifier (its checksum).
   * Used to:
   * 1. Identify blocks uniquely
   * 2. Verify data integrity
   * 3. Reference blocks in CBLs
   */
  get idChecksum(): ChecksumBuffer;

  /**
   * The type of the block.
   * Used to:
   * 1. Determine block capabilities
   * 2. Guide block operations
   * 3. Support type-specific handling
   */
  get blockType(): BlockType;

  /**
   * The type of data stored in the block.
   * Used to:
   * 1. Guide data handling
   * 2. Support format-specific operations
   * 3. Enable data validation
   */
  get blockDataType(): BlockDataType;

  /**
   * The raw data in the block, including all headers and payload.
   * Format: [Layer 0 Header][Layer 1 Header][...][Layer N Header][Payload][Padding]
   */
  get data(): Buffer;

  /**
   * The block's checksum as a string.
   * Used for:
   * 1. Human-readable identifiers
   * 2. Logging and debugging
   * 3. External references
   */
  get checksumString(): ChecksumString;

  /**
   * Whether the block can be persisted to disk.
   * Some blocks (like encrypted blocks) should never be persisted.
   */
  get canPersist(): boolean;

  /**
   * Whether the block's data can be read.
   * Some blocks may be temporarily or permanently unreadable.
   */
  get canRead(): boolean;

  /**
   * The total overhead from all layers.
   * Overhead includes:
   * 1. Layer-specific headers
   * 2. Encryption metadata
   * 3. CBL metadata
   */
  get totalOverhead(): number;

  /**
   * The usable capacity after accounting for overhead.
   * Capacity = BlockSize - TotalOverhead
   */
  get capacity(): number;

  /**
   * The actual data payload, excluding headers and padding.
   * This is the data that was originally stored in the block.
   */
  get payload(): Buffer;

  /**
   * The complete header data from all layers.
   * Headers are concatenated in inheritance order:
   * [Layer 0 Header][Layer 1 Header][...][Layer N Header]
   */
  get fullHeaderData(): Buffer;

  /**
   * This layer's header data.
   * Each layer can add its own header data for:
   * 1. Layer-specific metadata
   * 2. Encryption information
   * 3. Block relationships
   */
  get layerHeaderData(): Buffer;

  /**
   * The length of the payload before padding.
   * Used to:
   * 1. Calculate padding size
   * 2. Access payload data
   * 3. Verify block structure
   */
  get payloadLength(): number;

  /**
   * The padding after the payload.
   * Padding ensures:
   * 1. Fixed block sizes
   * 2. Data privacy
   * 3. XOR compatibility
   */
  get padding(): Buffer;

  /**
   * Whether the block's data has been validated.
   * Validation includes:
   * 1. Checksum verification
   * 2. Size constraints
   * 3. Format requirements
   */
  get validated(): boolean;
}
