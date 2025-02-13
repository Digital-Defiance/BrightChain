import { BrightChainMember } from '../brightChainMember';
import { GuidV4 } from '../guid';
import { ChecksumBuffer, SignatureBuffer } from '../types';
import { IDataBlock } from './dataBlock';

/**
 * IConstituentBlockListBlock defines the contract for Constituent Block List (CBL) blocks
 * in the Owner Free Filesystem (OFF). CBLs are fundamental to OFF's organization:
 *
 * Purpose:
 * 1. Store references to related blocks
 * 2. Maintain block relationships
 * 3. Enable data reconstruction
 * 4. Support ownership verification
 *
 * Structure:
 * [Header][Block References][Signature]
 * - Header: Contains metadata and counts
 * - References: List of block checksums
 * - Signature: Creator's cryptographic signature
 */
export interface IConstituentBlockListBlock extends IDataBlock {
  /**
   * Raw data containing block references.
   * Used for:
   * 1. Direct access to references
   * 2. Signature verification
   * 3. Data reconstruction
   */
  get addressData(): Buffer;

  /**
   * List of block checksums.
   * Used for:
   * 1. Block identification
   * 2. Data retrieval
   * 3. Integrity verification
   */
  get addresses(): Array<ChecksumBuffer>;

  /**
   * Number of block references.
   * Used for:
   * 1. Capacity validation
   * 2. Iteration control
   * 3. Storage calculation
   */
  get cblAddressCount(): number;

  /**
   * ID of the CBL creator.
   * Used for:
   * 1. Ownership tracking
   * 2. Access control
   * 3. Audit trails
   */
  get creatorId(): GuidV4;

  /**
   * Cryptographic signature of the creator.
   * Used for:
   * 1. Authenticity verification
   * 2. Integrity validation
   * 3. Non-repudiation
   */
  get creatorSignature(): SignatureBuffer;

  /**
   * Original data length before processing.
   * Used for:
   * 1. Size validation
   * 2. Storage planning
   * 3. Reconstruction verification
   */
  get originalDataLength(): number;

  /**
   * Size of block tuples.
   * Used for:
   * 1. Block grouping
   * 2. XOR operations
   * 3. Data recovery
   */
  get tupleSize(): number;

  /**
   * Verify the creator's signature.
   * Validates:
   * 1. Block authenticity
   * 2. Data integrity
   * 3. Creator identity
   *
   * @param creator - The purported creator of the CBL
   * @returns True if the signature is valid
   */
  validateSignature(creator: BrightChainMember): boolean;

  /**
   * Get the address capacity of the block
   */
  get addressCapacity(): number;

  /**
   * Get the encrypted address capacity of the block
   */
  get encryptedAddressCapacity(): number;
}
