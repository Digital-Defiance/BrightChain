import { BrightChainMember } from '../../brightChainMember';
import { ChecksumBuffer, SignatureBuffer } from '../../types';
import { IEphemeralBlock } from './ephemeral';
import { IConstituentBlockListBlockHeader } from './headers/cblHeader';

/**
 * Shared interface for CBL/ECBL
 */
export interface ICBLCore
  extends IEphemeralBlock,
    IConstituentBlockListBlockHeader {
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
   * Date the CBL was created.
   */
  get dateCreated(): Date;

  /**
   * Cryptographic signature of the creator.
   * Used for:
   * 1. Authenticity verification
   * 2. Integrity validation
   * 3. Non-repudiation
   */
  get creatorSignature(): SignatureBuffer;

  /**
   * Original data length of the file represented by the CBL.
   * 1. Reconstruction verification
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
   * Check if the CBL is an extended CBL.
   */
  get isExtendedCbl(): boolean;
}
