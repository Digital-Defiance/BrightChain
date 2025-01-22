/**
 * BlockType defines the different types of blocks in the Owner Free Filesystem (OFF).
 * In OFF, blocks are organized in a hierarchy where each type serves a specific purpose:
 *
 * Data Storage:
 * - RawData: Basic data storage without additional features
 * - OwnedDataBlock: Data blocks with ownership information
 * - EncryptedOwnedDataBlock: Encrypted data blocks with ownership
 *
 * Privacy & Security:
 * - OwnerFreeWhitenedBlock: Data XORed with random blocks for privacy
 * - Random: Random data blocks used for whitening
 * - FECData: Forward Error Correction data for recovery
 *
 * Organization & Management:
 * - ConstituentBlockList (CBL): Lists of block references and metadata
 * - EncryptedConstituentBlockListBlock: Encrypted CBLs
 * - Handle: References to blocks stored elsewhere
 */
export enum BlockType {
  /**
   * Used for uninitialized or invalid blocks
   */
  Unknown = -1,

  /**
   * A block that has been XORed with random data for privacy.
   * Key features:
   * 1. Data is obscured through XOR operations
   * 2. Original data can be recovered with the random blocks
   * 3. Provides privacy without encryption overhead
   */
  OwnerFreeWhitenedBlock = 0,

  /**
   * A block containing random data.
   * Used for:
   * 1. Whitening other blocks through XOR
   * 2. Adding entropy to the system
   * 3. Supporting privacy features
   */
  Random = 1,

  /**
   * A basic block containing raw data.
   * Features:
   * 1. Simple data storage
   * 2. No additional metadata
   * 3. Maximum storage efficiency
   */
  RawData = 2,

  /**
   * A block containing Forward Error Correction data.
   * Used for:
   * 1. Data recovery
   * 2. Error detection
   * 3. System reliability
   */
  FECData = 3,

  /**
   * A block containing data with ownership information.
   * Features:
   * 1. Owner identification
   * 2. Access control
   * 3. Metadata support
   */
  OwnedDataBlock = 4,

  /**
   * A block containing references to other blocks.
   * Used for:
   * 1. Organizing related blocks
   * 2. Storing metadata
   * 3. Building hierarchies
   */
  ConstituentBlockList = 5,

  /**
   * An encrypted block with ownership information.
   * Features:
   * 1. Data encryption
   * 2. Owner identification
   * 3. Access control
   */
  EncryptedOwnedDataBlock = 6,

  /**
   * An encrypted block containing block references.
   * Used for:
   * 1. Private block lists
   * 2. Secure metadata
   * 3. Protected hierarchies
   */
  EncryptedConstituentBlockListBlock = 7,

  /**
   * A reference to a block stored elsewhere.
   * Features:
   * 1. Lazy loading
   * 2. Memory efficiency
   * 3. Remote storage support
   */
  Handle = 8,

  /**
   * An extended CBL with file metadata.
   * Features:
   * 1. File name preservation
   * 2. MIME type tracking
   * 3. File system integration
   */
  ExtendedConstituentBlockListBlock = 9,
}

export default BlockType;
