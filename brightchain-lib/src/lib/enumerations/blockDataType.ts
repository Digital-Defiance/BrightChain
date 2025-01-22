/**
 * BlockDataType defines the different types of data that can be stored in blocks
 * in the Owner Free Filesystem (OFF). Each type has specific characteristics
 * that affect how the data is handled, stored, and processed.
 *
 * Data Flow:
 * 1. Raw data enters the system
 * 2. Data may be encrypted for security
 * 3. Data may be structured for organization
 * 4. Data may be ephemeral for temporary operations
 */
export enum BlockDataType {
  /**
   * Raw, unprocessed data.
   * Characteristics:
   * 1. No encryption or processing
   * 2. Maximum storage efficiency
   * 3. Direct access to data
   *
   * Used in:
   * - Basic data storage
   * - Random blocks
   * - Whitened blocks
   */
  RawData = 0,

  /**
   * Data that has been encrypted.
   * Features:
   * 1. ECIES encryption
   * 2. Encryption overhead
   * 3. Access control
   *
   * Used in:
   * - Encrypted owned data blocks
   * - Encrypted CBL blocks
   * - Secure storage
   */
  EncryptedData = 1,

  /**
   * Structured data that exists only in memory.
   * Characteristics:
   * 1. Never persisted to disk
   * 2. Temporary storage
   * 3. Organized format
   *
   * Used in:
   * - Block processing
   * - Data transformation
   * - Temporary operations
   */
  EphemeralStructuredData = 2,
}

export default BlockDataType;
