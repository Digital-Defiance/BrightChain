import { IBlock } from './blockBase';

/**
 * IDataBlock extends the base block interface with features specific to blocks
 * that contain actual data in the Owner Free Filesystem (OFF).
 *
 * Key Features:
 * 1. Data validation and integrity checks
 * 2. Encryption capabilities
 * 3. Signing support
 * 4. Creation tracking
 *
 * Data Flow:
 * 1. Raw data enters the system
 * 2. Data may be encrypted/signed
 * 3. Data is validated
 * 4. Data is stored/processed
 */
export interface IDataBlock extends IBlock {
  /**
   * Block creation timestamp.
   * Used for:
   * 1. Version tracking
   * 2. Audit trails
   * 3. Lifecycle management
   */
  get dateCreated(): Date;

  /**
   * Original data length before processing.
   * Used for:
   * 1. Storage planning
   * 2. Overhead calculation
   * 3. Efficiency analysis
   */
  get actualDataLength(): number;

  /**
   * Whether the block's data is encrypted.
   * Used for:
   * 1. Processing decisions
   * 2. Access control
   * 3. Operation validation
   */
  get encrypted(): boolean;

  /**
   * Whether the block can be encrypted.
   * Determined by:
   * 1. Block type
   * 2. Available space
   * 3. Current state
   */
  get canEncrypt(): boolean;

  /**
   * Whether the block can be decrypted.
   * Determined by:
   * 1. Current encryption state
   * 2. Key availability
   * 3. Block permissions
   */
  get canDecrypt(): boolean;

  /**
   * Whether the block can be cryptographically signed.
   * Determined by:
   * 1. Block type
   * 2. Current state
   * 3. Available features
   */
  get canSign(): boolean;
}
