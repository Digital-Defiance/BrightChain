import { BlockSize } from '../../enumerations/blockSize'; // Added import
import { GuidV4 } from '../../guid';
import { ChecksumBuffer, SignatureBuffer } from '../../types';
import { IEphemeralBlock } from './ephemeral';

/**
 * Shared interface for CBL/ECBL
 */
export interface ICBLCore extends IEphemeralBlock {
  /**
   * Creator ID of the CBL
   */
  get creatorId(): GuidV4;

  /**
   * Date the CBL was created
   */
  get dateCreated(): Date;

  /**
   * Number of addresses in the CBL
   */
  get cblAddressCount(): number;

  /**
   * Size of the file represented by the CBL (spanning all blocks)
   */
  get originalDataLength(): number;

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
   * Cryptographic signature of the creator.
   * Used for:
   * 1. Authenticity verification
   * 2. Integrity validation
   * 3. Non-repudiation
   */
  get creatorSignature(): SignatureBuffer;

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
   * @param creator - The purported creator of the CBL (Note: This parameter is often implicitly the block's creator property)
   * @param blockSize - Optional: The block size to use for validation, defaults to the block's size. Important when the data buffer might not be padded.
   * @returns True if the signature is valid
   */
  validateSignature(blockSize?: BlockSize): boolean; // Updated signature

  /**
   * Check if the CBL is an extended CBL.
   */
  get isExtendedCbl(): boolean;
}
